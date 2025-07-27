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

// Gemini API retry configuration
const GEMINI_RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
};

/**
 * Exponential backoff delay calculator
 */
function calculateDelay(attempt) {
    const delay = Math.min(
        GEMINI_RETRY_CONFIG.baseDelay * Math.pow(GEMINI_RETRY_CONFIG.backoffMultiplier, attempt),
        GEMINI_RETRY_CONFIG.maxDelay
    );
    return delay + Math.random() * 1000; // Add jitter
}

/**
 * Sleep utility function
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 3;

/**
 * Memanggil Gemini Pro 2.5 untuk analisis naratif lengkap dengan retry logic
 */
async function callGeminiProWithRetry(prompt, chartImages = []) {
    let lastError;
    
    for (let attempt = 0; attempt < GEMINI_RETRY_CONFIG.maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                const delay = calculateDelay(attempt - 1);
                log.warn(`🔄 Retry attempt ${attempt + 1}/${GEMINI_RETRY_CONFIG.maxRetries} after ${Math.round(delay)}ms delay`, {
                    attempt: attempt + 1,
                    delay: Math.round(delay),
                    lastError: lastError?.message
                });
                await sleep(delay);
            }
            
            return await callGeminiPro(prompt, chartImages);
        } catch (error) {
            lastError = error;
            log.error(`❌ Gemini Pro attempt ${attempt + 1} failed`, {
                attempt: attempt + 1,
                error: error.message,
                willRetry: attempt < GEMINI_RETRY_CONFIG.maxRetries - 1
            });
            
            // Don't retry on certain errors
            if (error.message.includes('blocked') || error.message.includes('safety')) {
                log.error('🚫 Non-retryable error detected, stopping retries', { error: error.message });
                break;
            }
        }
    }
    
    throw new Error(`Gemini Pro failed after ${GEMINI_RETRY_CONFIG.maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Memanggil Gemini Pro 2.5 untuk analisis naratif lengkap
 */
async function callGeminiPro(prompt, chartImages = []) {
    const MODEL_NAME = 'gemini-2.5-pro';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
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

    const requestPayload = {
        contents,
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 7000,
            topP: 0.95,
            topK: 40
        }
    };

    log.debug(`🤖 Memulai analisis dengan ${MODEL_NAME}`, {
        model: MODEL_NAME,
        promptLength: prompt.length,
        chartImagesCount: chartImages.length,
        temperature: 0.3,
        maxTokens: 7000
    });

    try {
        const startTime = Date.now();
        const response = await axios.post(apiUrl, requestPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        });

        const duration = Date.now() - startTime;

        if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
            log.error('❌ Invalid response structure from Gemini API', {
                responseData: response.data,
                status: response.status,
                headers: response.headers,
                fullResponse: JSON.stringify(response.data, null, 2)
            });
            throw new Error('Invalid response structure from Gemini API');
        }

        const candidate = response.data.candidates[0];
        
        // Check for content blocking or safety issues
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            log.error('❌ Gemini API response blocked or terminated', {
                finishReason: candidate.finishReason,
                safetyRatings: candidate.safetyRatings,
                candidateData: candidate
            });
            throw new Error(`Gemini API response blocked: ${candidate.finishReason}`);
        }

        if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0] || !candidate.content.parts[0].text) {
            log.error('❌ Empty or missing text content from Gemini API', {
                candidate: candidate,
                content: candidate.content,
                parts: candidate.content?.parts,
                fullResponse: JSON.stringify(response.data, null, 2)
            });
            throw new Error('Gemini API returned empty content');
        }

        const analysisText = candidate.content.parts[0].text.trim();
        
        // Additional validation for empty response
        if (!analysisText || analysisText.length < 10) {
            log.error('❌ Gemini API returned very short or empty analysis', {
                analysisText: analysisText,
                textLength: analysisText?.length || 0,
                candidate: candidate,
                fullResponse: JSON.stringify(response.data, null, 2)
            });
            throw new Error(`Gemini API returned insufficient content: "${analysisText}"`);
        }
        
        log.debug(`✅ Gemini Pro analisis berhasil`, {
            model: MODEL_NAME,
            duration: `${duration}ms`,
            responseLength: analysisText.length,
            tokensUsed: response.data.usageMetadata?.totalTokenCount || 'N/A',
            candidatesCount: response.data.candidates.length
        });

        return analysisText;
    } catch (error) {
        const errorMessage = error.response 
            ? `API Error ${error.response.status}: ${JSON.stringify(error.response.data)}` 
            : error.message;
        const statusCode = error.response?.status;
        const responseData = error.response?.data;
        
        log.error('❌ Gagal memanggil Gemini Pro API', { 
            error: errorMessage, 
            statusCode, 
            responseData, 
            stack: error.stack,
            requestData: { 
                model: MODEL_NAME, 
                promptLength: prompt.length,
                chartImagesCount: chartImages.length,
                temperature: 0.3,
                apiUrl: apiUrl
            },
            headers: error.response?.headers,
            config: {
                timeout: 60000,
                method: 'POST'
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

            log.info(`📊 Memproses ${pair} untuk analisis bias harian...`);
            
            // Kirim notifikasi awal
            if (global.broadcastMessage) {
                global.broadcastMessage(`🔄 *STAGE 1: ${pair}*\n🚀 Memulai analisis bias harian...\n⏳ Mengambil data chart dan OHLCV...`);
            }
            
            // Ambil data pasar
            const chartImages = await promptBuilders.getChartImages(pair, ['H4', 'H1', 'M15']);
            const ohlcvData = await promptBuilders.fetchOhlcv(pair);
            
            if (global.broadcastMessage) {
                const chartStatus = chartImages.length > 0 ? `✅ ${chartImages.length} chart` : '❌ Tidak ada chart';
                const dataStatus = ohlcvData.count > 0 ? `✅ ${ohlcvData.count} candles` : '❌ Tidak ada data';
                const dataSource = ohlcvData.source || 'Unknown';
                
                global.broadcastMessage(`📊 *STAGE 1: ${pair}*\n📈 Chart: ${chartStatus}\n📊 Data: ${dataStatus} (${dataSource})\n🤖 Memulai analisis AI dengan Gemini Pro...`);
            }
            
            // Bangun prompt Stage 1
            const prompt = await promptBuilders.prepareStage1Prompt(pair, ohlcvData);
            
            // Debug: Log the prompt being sent
            log.debug(`Stage 1 prompt for ${pair}:`, prompt.substring(0, 500) + '...');
            
            // Panggil AI untuk analisis
            const narrativeText = await callGeminiProWithRetry(prompt, chartImages);
            
            // Debug: Log what we get from Gemini Pro
            log.debug(`📝 Narrative text from Gemini Pro for ${pair}:`, {
                pair: pair,
                responseLength: narrativeText.length,
                sampleText: narrativeText.substring(0, 500) + '...',
                containsAnalysis: !narrativeText.includes('{NARRATIVE_TEXT}')
            });
            
            // Kirim notifikasi ekstraksi
            if (global.broadcastMessage) {
                global.broadcastMessage(`🔍 *STAGE 1: ${pair}*\n✅ Analisis AI selesai (${narrativeText.length} karakter)\n⚙️ Mengekstrak data dengan Gemini Flash...`);
            }
            
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
            
            // Kirim notifikasi hasil
            if (global.broadcastMessage) {
                const biasText = extractedData.bias || 'NEUTRAL';
                const asiaHighText = extractedData.asia_high ? extractedData.asia_high.toString() : 'N/A';
                const asiaLowText = extractedData.asia_low ? extractedData.asia_low.toString() : 'N/A';
                const htfTargetText = extractedData.htf_zone_target || 'N/A';
                
                const biasEmoji = biasText === 'BULLISH' ? '🟢' : biasText === 'BEARISH' ? '🔴' : '🟡';
                const resultMessage = `✅ *STAGE 1 SELESAI: ${pair}*\n\n${biasEmoji} *Bias Harian:* ${biasText}\n📏 *Asia Range:* ${asiaLowText} - ${asiaHighText}\n🎯 *Target HTF:* ${htfTargetText}\n\n⏭️ Menunggu Stage 2 (Deteksi Manipulasi)`;
                
                global.broadcastMessage(resultMessage);
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

            log.info(`📊 Memproses ${pair} untuk deteksi manipulasi London...`);
            
            // Kirim notifikasi awal Stage 2
            if (global.broadcastMessage) {
                global.broadcastMessage(`🔄 *STAGE 2: ${pair}*\n⚡ Memulai deteksi manipulasi London...\n⏳ Mengambil data chart dan OHLCV...`);
            }
            
            // Ambil data pasar
            const chartImages = await promptBuilders.getChartImages(pair, ['M15', 'M5']);
            const ohlcvData = await promptBuilders.fetchOhlcv(pair);
            
            // Kirim notifikasi progress data
            if (global.broadcastMessage) {
                const chartStatus = chartImages.length > 0 ? `✅ ${chartImages.length} chart` : '❌ Tidak ada chart';
                const dataStatus = ohlcvData.count > 0 ? `✅ ${ohlcvData.count} candles` : '❌ Tidak ada data';
                const dataSource = ohlcvData.source || 'Unknown';
                
                global.broadcastMessage(`📊 *STAGE 2: ${pair}*\n📈 Chart: ${chartStatus}\n📊 Data: ${dataStatus} (${dataSource})\n🤖 Mencari tanda manipulasi dengan Gemini Pro...`);
            }
            
            // Bangun prompt Stage 2
            const prompt = await promptBuilders.prepareStage2Prompt(pair, context, ohlcvData);
            
            // Panggil AI untuk analisis
            const narrativeText = await callGeminiProWithRetry(prompt, chartImages);
            
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
                    const sideEmoji = extractedData.manipulation_side === 'ABOVE_ASIA_HIGH' ? '⬆️' : extractedData.manipulation_side === 'BELOW_ASIA_LOW' ? '⬇️' : '⚡';
                    const htfReactionEmoji = extractedData.htf_reaction ? '✅' : '❌';
                    
                    const manipulationMessage = `🎯 *STAGE 2 SELESAI: ${pair}*\n\n⚡ *Manipulasi:* TERDETEKSI ${sideEmoji}\n📍 *Posisi:* ${extractedData.manipulation_side}\n🎯 *HTF Reaction:* ${htfReactionEmoji} ${extractedData.htf_reaction ? 'YA' : 'BELUM'}\n\n⏭️ Menunggu Stage 3 (Konfirmasi Entry)`;
                    
                    global.broadcastMessage(manipulationMessage);
                }
            } else {
                // Check time-out (misalnya jika sudah melewati jam London)
                const now = new Date();
                const utcHour = now.getUTCHours();
                if (utcHour >= 10) {
                    context.status = 'COMPLETE_NO_MANIPULATION';
                    log.info(`${pair} Stage 2 time-out, tidak ada manipulasi`);
                    if (global.broadcastMessage) {
                        global.broadcastMessage(`❌ *STAGE 2 SELESAI: ${pair}*\n\n⚡ *Manipulasi:* TIDAK TERDETEKSI\n📊 Market belum memberikan sinyal yang jelas\n\n⏸️ Menunggu sesi berikutnya...`);
                    }
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

            log.info(`📊 Memproses ${pair} untuk konfirmasi entri...`);
            
            // Kirim notifikasi awal Stage 3
            if (global.broadcastMessage) {
                global.broadcastMessage(`🔄 *STAGE 3: ${pair}*\n🎯 Memulai konfirmasi entri...\n⏳ Mengambil data chart terbaru...`);
            }
            
            // Ambil data pasar
            const chartImages = await promptBuilders.getChartImages(pair, ['M15', 'M5']);
            const ohlcvData = await promptBuilders.fetchOhlcv(pair);
            
            // Kirim notifikasi progress data
            if (global.broadcastMessage) {
                const chartStatus = chartImages.length > 0 ? `✅ ${chartImages.length} chart` : '❌ Tidak ada chart';
                const dataStatus = ohlcvData.count > 0 ? `✅ ${ohlcvData.count} candles` : '❌ Tidak ada data';
                const dataSource = ohlcvData.source || 'Unknown';
                
                global.broadcastMessage(`📊 *STAGE 3: ${pair}*\n📈 Chart: ${chartStatus}\n📊 Data: ${dataStatus} (${dataSource})\n🤖 Mencari sinyal entry dengan Gemini Pro...`);
            }
            
            // Bangun prompt Stage 3
            const prompt = await promptBuilders.prepareStage3Prompt(pair, context, ohlcvData);
            
            // Panggil AI untuk analisis
            const narrativeText = await callGeminiProWithRetry(prompt, chartImages);
            
            // Kirim notifikasi hasil analisis AI
            if (global.broadcastMessage) {
                const analysisLength = narrativeText ? narrativeText.length : 0;
                const hasSignal = narrativeText ? narrativeText.includes('SINYAL TRADING DITEMUKAN') : false;
                const signalEmoji = hasSignal ? '🎯' : '⏳';
                
                global.broadcastMessage(`🔍 *STAGE 3: ${pair}*\n✅ Analisis AI selesai (${analysisLength} karakter)\n${signalEmoji} Status: ${hasSignal ? 'SINYAL DITEMUKAN!' : 'Mencari konfirmasi...'}`);
            }
            
            // Periksa apakah ada sinyal
            if (narrativeText.includes('SINYAL TRADING DITEMUKAN')) {
                log.info(`🎯 ${pair} Sinyal trading ditemukan!`);
                
                // Kirim notifikasi sinyal ditemukan
                if (global.broadcastMessage) {
                    global.broadcastMessage(`🎯 *STAGE 3: ${pair}*\n✅ SINYAL TRADING DITEMUKAN!\n⚙️ Mengekstrak detail trade dengan Gemini Flash...`);
                }
                
                // Ekstrak menggunakan extractor.js yang sudah ada
                const extractedData = await extractor.extractAnalysisData(narrativeText);
                
                // Kirim notifikasi ekstraksi selesai
                if (global.broadcastMessage) {
                    const decision = extractedData.keputusan || 'N/A';
                    const price = extractedData.harga_entry || 'N/A';
                    const sl = extractedData.stop_loss || 'N/A';
                    const tp = extractedData.take_profit || 'N/A';
                    
                    global.broadcastMessage(`📋 *STAGE 3: ${pair}*\n✅ Ekstraksi selesai\n📊 Keputusan: ${decision}\n💰 Entry: ${price}\n🛡️ SL: ${sl}\n🎯 TP: ${tp}\n⚡ Memproses order...`);
                }
                
                if (extractedData.keputusan === 'OPEN') {
                    // Teruskan ke decision handler
                    await decisionHandlers.handleDecision(extractedData, pair, global.whatsappSocket || null, global.botSettings?.recipients || []);
                    
                    context.status = 'COMPLETE_TRADE_OPENED';
                    context.entry_price = extractedData.harga_entry;
                    context.stop_loss = extractedData.stop_loss;
                    context.take_profit = extractedData.take_profit;
                    context.trade_status = 'ACTIVE';
                    
                    // Kirim notifikasi trade berhasil dibuka
                    if (global.broadcastMessage) {
                        global.broadcastMessage(`🚀 *STAGE 3 SELESAI: ${pair}*\n✅ Trade berhasil dibuka!\n📊 Status: ACTIVE\n💰 Entry: ${extractedData.harga_entry}\n🛡️ SL: ${extractedData.stop_loss}\n🎯 TP: ${extractedData.take_profit}`);
                    }
                }
            } else {
                // Tidak ada sinyal
                log.info(`⏳ ${pair} Tidak ada sinyal entri yang valid`);
                
                // Kirim notifikasi tidak ada sinyal
                if (global.broadcastMessage) {
                    global.broadcastMessage(`⏳ *STAGE 3: ${pair}*\n❌ Belum ada sinyal entry yang valid\n📊 Market masih dalam observasi\n🔄 Akan dicoba lagi nanti...`);
                }
                
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
