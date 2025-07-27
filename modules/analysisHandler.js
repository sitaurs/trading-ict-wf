/**
 * @fileoverview Handler untuk analisis trading dengan strategi ICT Power of Three (PO3)
 * Mengelola 4 tahap: Bias, Manipulation, Entry, dan Hold/Close
 */

const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const { getLogger } = require('./logger');
const { getContext, saveContext } = require('./contextManager');
const { extractStage1Data } = require('./analysis/extractorStage1');
const { extractStage2Data } = require('./analysis/extractorStage2');
const extractor = require('./analysis/extractor');
const decisionHandlers = require('./analysis/decisionHandlers');
const promptBuilders = require('./analysis/promptBuilders');

const log = getLogger('AnalysisHandler');

const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 3;

/**
 * Memanggil Gemini Pro untuk analisis naratif
 */
async function callGeminiPro(prompt, chartImages = []) {
    const contents = [{
        parts: [
            { text: prompt },
            ...chartImages.map(base64 => ({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: base64
                }
            }))
        ]
    }];

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents,
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2000
                }
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000
            }
        );

        if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
            throw new Error('Invalid response structure from Gemini API');
        }

        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        const errorMessage = error.response 
            ? `API Error ${error.response.status}: ${JSON.stringify(error.response.data)}` 
            : error.message;
        const statusCode = error.response?.status;
        const responseData = error.response?.data;
        
        log.error('Gagal memanggil Gemini Pro API:', { 
            error: errorMessage, 
            statusCode, 
            responseData, 
            stack: error.stack,
            requestData: { 
                model: MODEL_NAME, 
                promptLength: prompt.length,
                temperature: TEMPERATURE 
            }
        });
        throw new Error(`Gemini API call failed: ${errorMessage}`);
    }
}

/**
 * Stage 1: Analisis Bias Harian dan Range Asia
 */
async function runStage1Analysis(pairs) {
    log.info('=== STAGE 1: Analisis Bias Harian ===');
    
    for (const pair of pairs) {
        let context = null;
        try {
            context = await getContext(pair);
            
            // Skip jika sudah lock atau bukan status yang tepat
            if (context.lock || context.status !== 'PENDING_BIAS') {
                log.info(`Melewati ${pair}: lock=${context.lock}, status=${context.status}`);
                continue;
            }

            // Set lock
            context.lock = true;
            await saveContext(context);

            log.info(`Memproses ${pair} untuk analisis bias...`);
            
            // Ambil data pasar
            const chartImages = await promptBuilders.getChartImages(pair, ['H4', 'H1', 'M15']);
            const ohlcvData = await promptBuilders.fetchOhlcv(pair);
            
            // Bangun prompt Stage 1
            const prompt = await promptBuilders.prepareStage1Prompt(pair, ohlcvData);
            
            // Panggil AI untuk analisis
            const narrativeText = await callGeminiPro(prompt, chartImages);
            
            // Ekstrak data dengan Gemini Flash
            const extractedData = await extractStage1Data(narrativeText);
            
            // Update konteks
            context.daily_bias = extractedData.bias;
            context.asia_high = extractedData.asia_high;
            context.asia_low = extractedData.asia_low;
            context.htf_zone_target = extractedData.htf_zone_target;
            context.status = 'PENDING_MANIPULATION';
            context.lock = false;
            
            await saveContext(context);
            
            // Kirim notifikasi
            if (global.broadcastMessage) {
                global.broadcastMessage(`🎯 ${pair} - Bias Harian: ${extractedData.bias}\nAsia Range: ${extractedData.asia_low} - ${extractedData.asia_high}\nTarget HTF: ${extractedData.htf_zone_target}`);
            }
            
            log.info(`${pair} Stage 1 selesai: Bias=${extractedData.bias}`);
            
        } catch (error) {
            const errorMessage = error.response 
                ? `API Error ${error.response.status}: ${JSON.stringify(error.response.data)}` 
                : error.message;
            log.error(`Error Stage 1 untuk ${pair}:`, { 
                error: errorMessage, 
                pair, 
                statusCode: error.response?.status,
                responseData: error.response?.data,
                stack: error.stack,
                contextData: context ? { status: context.status, date: context.date } : null
            });
            
            if (context) {
                context.status = 'FAILED_STAGE_1';
                context.error_log = errorMessage;
                context.lock = false;
                try {
                    await saveContext(context);
                } catch (saveError) {
                    log.error(`Gagal menyimpan context error untuk ${pair}:`, saveError.message);
                }
            }
            
            // Kirim notifikasi error
            if (global.broadcastMessage) {
                global.broadcastMessage(`❌ ${pair} - Stage 1 Gagal: ${errorMessage}`);
            }
        }
    }
}

/**
 * Stage 2: Deteksi Manipulasi London
 */
async function runStage2Analysis(pairs) {
    log.info('=== STAGE 2: Deteksi Manipulasi London ===');
    
    for (const pair of pairs) {
        let context = null;
        try {
            context = await getContext(pair);
            
            // Skip jika bukan status yang tepat
            if (context.lock || context.status !== 'PENDING_MANIPULATION') {
                continue;
            }

            // Set lock
            context.lock = true;
            await saveContext(context);

            log.info(`Memproses ${pair} untuk deteksi manipulasi...`);
            
            // Ambil data pasar
            const chartImages = await promptBuilders.getChartImages(pair, ['M15', 'M5']);
            const ohlcvData = await promptBuilders.fetchOhlcv(pair);
            
            // Bangun prompt Stage 2
            const prompt = await promptBuilders.prepareStage2Prompt(pair, context, ohlcvData);
            
            // Panggil AI untuk analisis
            const narrativeText = await callGeminiPro(prompt, chartImages);
            
            // Ekstrak data dengan Gemini Flash
            const extractedData = await extractStage2Data(narrativeText);
            
            // Update konteks
            context.manipulation_detected = extractedData.manipulation_detected;
            context.manipulation_side = extractedData.manipulation_side;
            context.htf_reaction = extractedData.htf_reaction;
            
            if (extractedData.manipulation_detected) {
                context.status = 'PENDING_ENTRY';
                log.info(`${pair} Manipulasi terdeteksi: ${extractedData.manipulation_side}`);
                if (global.broadcastMessage) {
                    global.broadcastMessage(`⚡ ${pair} - Manipulasi ${extractedData.manipulation_side} terdeteksi! Menunggu konfirmasi entri...`);
                }
            } else {
                // Check time-out (misalnya jika sudah melewati jam London)
                const now = new Date();
                const utcHour = now.getUTCHours();
                if (utcHour >= 10) {
                    context.status = 'COMPLETE_NO_MANIPULATION';
                    log.info(`${pair} Stage 2 time-out, tidak ada manipulasi`);
                }
            }
            
            context.lock = false;
            await saveContext(context);
            
        } catch (error) {
            const errorMessage = error.response 
                ? `API Error ${error.response.status}: ${JSON.stringify(error.response.data)}` 
                : error.message;
            log.error(`Error Stage 2 untuk ${pair}:`, { 
                error: errorMessage, 
                pair, 
                statusCode: error.response?.status,
                responseData: error.response?.data,
                stack: error.stack,
                contextData: context ? { status: context.status, date: context.date } : null
            });
            
            if (context) {
                context.status = 'FAILED_STAGE_2';
                context.error_log = errorMessage;
                context.lock = false;
                try {
                    await saveContext(context);
                } catch (saveError) {
                    log.error(`Gagal menyimpan context error untuk ${pair}:`, { 
                        error: saveError.message, 
                        pair, 
                        stack: saveError.stack 
                    });
                }
            }
            
            // Kirim notifikasi error
            if (global.broadcastMessage) {
                global.broadcastMessage(`❌ ${pair} - Stage 2 Gagal: ${errorMessage}`);
            }
        }
    }
}

/**
 * Stage 3: Konfirmasi Entri
 */
async function runStage3Analysis(pairs) {
    log.info('=== STAGE 3: Konfirmasi Entri ===');
    
    for (const pair of pairs) {
        let context = null;
        try {
            context = await getContext(pair);
            
            // Skip jika bukan status yang tepat
            if (context.lock || context.status !== 'PENDING_ENTRY') {
                continue;
            }

            // Set lock
            context.lock = true;
            await saveContext(context);

            log.info(`Memproses ${pair} untuk konfirmasi entri...`);
            
            // Ambil data pasar
            const chartImages = await promptBuilders.getChartImages(pair, ['M15', 'M5']);
            const ohlcvData = await promptBuilders.fetchOhlcv(pair);
            
            // Bangun prompt Stage 3
            const prompt = await promptBuilders.prepareStage3Prompt(pair, context, ohlcvData);
            
            // Panggil AI untuk analisis
            const narrativeText = await callGeminiPro(prompt, chartImages);
            
            // Periksa apakah ada sinyal
            if (narrativeText.includes('SINYAL TRADING DITEMUKAN')) {
                log.info(`${pair} Sinyal trading ditemukan!`);
                
                // Ekstrak menggunakan extractor.js yang sudah ada
                const extractedData = await extractor.extractAnalysisData(narrativeText);
                
                if (extractedData.keputusan === 'OPEN') {
                    // Teruskan ke decision handler
                    await decisionHandlers.handleDecision(extractedData, pair, global.whatsappSocket || null, global.botSettings?.recipients || []);
                    
                    context.status = 'COMPLETE_TRADE_OPENED';
                    context.entry_price = extractedData.harga_entry;
                    context.stop_loss = extractedData.stop_loss;
                    context.take_profit = extractedData.take_profit;
                    context.trade_status = 'ACTIVE';
                }
            } else {
                // Tidak ada sinyal
                log.info(`${pair} Tidak ada sinyal entri yang valid`);
                
                // Check time-out (misalnya jika sudah melewati jam distribusi)
                const now = new Date();
                const utcHour = now.getUTCHours();
                if (utcHour >= 13) {
                    context.status = 'COMPLETE_NO_ENTRY';
                }
            }
            
            context.lock = false;
            await saveContext(context);
            
        } catch (error) {
            const errorMessage = error.response 
                ? `API Error ${error.response.status}: ${JSON.stringify(error.response.data)}` 
                : error.message;
            log.error(`Error Stage 3 untuk ${pair}:`, { 
                error: errorMessage, 
                pair, 
                statusCode: error.response?.status,
                responseData: error.response?.data,
                stack: error.stack,
                contextData: context ? { status: context.status, date: context.date } : null
            });
            
            if (context) {
                context.status = 'FAILED_STAGE_3';
                context.error_log = errorMessage;
                context.lock = false;
                try {
                    await saveContext(context);
                } catch (saveError) {
                    log.error(`Gagal menyimpan context error untuk ${pair}:`, { 
                        error: saveError.message, 
                        pair, 
                        stack: saveError.stack 
                    });
                }
            }
            
            // Kirim notifikasi error
            if (global.broadcastMessage) {
                global.broadcastMessage(`❌ ${pair} - Stage 3 Gagal: ${errorMessage}`);
            }
        }
    }
}

/**
 * Hold/Close Analysis untuk posisi aktif
 */
async function runHoldCloseAnalysis(pair) {
    log.info(`=== HOLD/CLOSE ANALYSIS: ${pair} ===`);
    
    try {
        // Ambil data pasar terbaru
        const chartImages = await promptBuilders.getChartImages(pair, ['M15', 'M5']);
        const ohlcvData = await promptBuilders.fetchOhlcv(pair);
        
        // Bangun prompt hold/close
        const prompt = await promptBuilders.prepareHoldClosePrompt(pair, ohlcvData);
        
        // Panggil AI untuk analisis
        const narrativeText = await callGeminiPro(prompt, chartImages);
        
        // Ekstrak keputusan
        const extractedData = await extractor.extractAnalysisData(narrativeText);
        
        if (extractedData.keputusan === 'CLOSE_MANUAL') {
            log.info(`${pair} Sinyal close manual diterima`);
            await decisionHandlers.handleDecision(extractedData, pair, global.whatsappSocket || null, global.botSettings?.recipients || []);
        }
        
    } catch (error) {
        log.error(`Error Hold/Close analysis untuk ${pair}:`, { 
            error: error.message, 
            pair, 
            statusCode: error.response?.status,
            responseData: error.response?.data,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = {
    runStage1Analysis,
    runStage2Analysis,
    runStage3Analysis,
    runHoldCloseAnalysis
};
