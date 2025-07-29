const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const { getLogger } = require('../logger');
const log = getLogger('ExtractorStage3');

async function getPrompt(filename) {
    const promptPath = path.join(__dirname, '..', '..', 'prompts', filename);
    
    try {
        log.debug(`Loading Stage 3 extraction prompt: ${filename}`);
        const content = await fs.readFile(promptPath, 'utf8');
        return content;
    } catch (error) {
        log.error(`Failed to load Stage 3 extractor prompt ${filename}:`, error);
        throw new Error(`Stage 3 extractor prompt loading failed: ${error.message}`);
    }
}

async function extractStage3Data(narrativeText) {
    const MODEL_NAME = 'gemini-2.0-flash-exp';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    try {
        // Check if narrativeText is actually a prompt template rather than analysis
        if (narrativeText.includes('{NARRATIVE_TEXT}') || narrativeText.includes('Ekstrak informasi')) {
            log.warn('⚠️ Received prompt template instead of trading analysis - Gemini API issue detected', {
                narrativeLength: narrativeText.length,
                containsTemplate: true,
                sampleText: narrativeText.substring(0, 200)
            });
            
            return {
                keputusan: 'NO_TRADE',
                pair: 'UNKNOWN',
                arah: 'NONE',
                harga: 0,
                sl: 0,
                tp: 0,
                alasan: 'Invalid response format from AI - prompt template detected'
            };
        }

        let prompt = await getPrompt('prompt_stage3_extractor.txt');
        prompt = prompt.replace(/\{NARRATIVE_TEXT\}/g, narrativeText);

        const requestPayload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.1,
                topK: 1,
                topP: 0.8,
                maxOutputTokens: 1000,
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        const startTime = Date.now();
        
        log.debug(`🤖 Ekstraksi Stage 3 dengan ${MODEL_NAME}`, {
            model: MODEL_NAME,
            narrativeLength: narrativeText.length,
            temperature: 0.1,
            maxTokens: 1000
        });

        const response = await axios.post(apiUrl, requestPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        const duration = Date.now() - startTime;

        if (!response.data || !response.data.candidates || response.data.candidates.length === 0) {
            log.error('❌ Gemini Flash returned no candidates for Stage 3 extraction', {
                responseData: response.data,
                model: MODEL_NAME,
                narrativeLength: narrativeText.length
            });
            
            throw new Error('Invalid response structure from Gemini Flash API');
        }

        const rawText = response.data.candidates[0].content.parts[0].text.trim();
        
        // Check for empty or very short response
        if (!rawText || rawText.length < 10) {
            log.error('❌ Gemini Flash returned empty or very short response for Stage 3', {
                rawText: rawText,
                textLength: rawText?.length || 0,
                candidate: response.data.candidates[0],
                fullResponse: JSON.stringify(response.data, null, 2)
            });
            throw new Error(`Gemini Flash returned insufficient content: "${rawText}"`);
        }
        
        log.debug(`✅ Gemini Flash Stage 3 ekstraksi berhasil`, {
            model: MODEL_NAME,
            duration: `${duration}ms`,
            responseLength: rawText.length,
            tokensUsed: response.data.usageMetadata?.totalTokenCount || 'N/A',
            rawResponse: rawText
        });

        // Enhanced parsing untuk Stage 3 trading decisions
        const extracted = {
            keputusan: 'NO_TRADE',
            pair: 'UNKNOWN',
            arah: 'NONE',
            harga: 0,
            sl: 0,
            tp: 0,
            alasan: 'No trading decision found'
        };

        // Parse the response looking for trading decision format
        const lines = rawText.split('\n');
        
        for (const line of lines) {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                const cleanKey = key.trim().toLowerCase().replace(/[_\s]/g, '');
                const value = valueParts.join(':').trim();
                
                if (cleanKey === 'keputusan') {
                    const upperValue = value.toUpperCase();
                    if (upperValue.includes('OPEN')) extracted.keputusan = 'OPEN';
                    else if (upperValue.includes('NO_TRADE')) extracted.keputusan = 'NO_TRADE';
                    else if (upperValue.includes('CLOSE_MANUAL')) extracted.keputusan = 'CLOSE_MANUAL';
                    else if (upperValue.includes('HOLD')) extracted.keputusan = 'HOLD';
                }
                if (cleanKey === 'pair') {
                    extracted.pair = value.toUpperCase();
                }
                if (cleanKey === 'arah') {
                    const upperValue = value.toUpperCase();
                    if (upperValue.includes('ORDER_TYPE_BUY_LIMIT') || upperValue.includes('BUY')) {
                        extracted.arah = 'ORDER_TYPE_BUY_LIMIT';
                    } else if (upperValue.includes('ORDER_TYPE_SELL_LIMIT') || upperValue.includes('SELL')) {
                        extracted.arah = 'ORDER_TYPE_SELL_LIMIT';
                    } else {
                        extracted.arah = 'NONE';
                    }
                }
                if (cleanKey === 'harga') {
                    const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
                    extracted.harga = isNaN(numValue) ? 0 : numValue;
                }
                if (cleanKey === 'sl') {
                    const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
                    extracted.sl = isNaN(numValue) ? 0 : numValue;
                }
                if (cleanKey === 'tp') {
                    const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
                    extracted.tp = isNaN(numValue) ? 0 : numValue;
                }
                if (cleanKey === 'alasan') {
                    extracted.alasan = value || 'No reason provided';
                }
            }
        }

        // Fallback parsing if structured format not found
        if (extracted.keputusan === 'NO_TRADE' && extracted.alasan === 'No trading decision found') {
            log.warn('Primary parsing failed for Stage 3, attempting fallback parsing...');
            
            // Look for trading decisions in natural language
            const textLower = rawText.toLowerCase();
            if (textLower.includes('open') && (textLower.includes('buy') || textLower.includes('sell'))) {
                extracted.keputusan = 'OPEN';
                
                if (textLower.includes('buy') || textLower.includes('bullish')) {
                    extracted.arah = 'ORDER_TYPE_BUY_LIMIT';
                } else if (textLower.includes('sell') || textLower.includes('bearish')) {
                    extracted.arah = 'ORDER_TYPE_SELL_LIMIT';
                }
                
                // Try to extract numbers as potential prices
                const numbers = rawText.match(/\d+\.?\d*/g);
                if (numbers && numbers.length >= 3) {
                    const prices = numbers.map(n => parseFloat(n)).filter(n => n > 0 && n < 10000);
                    if (prices.length >= 3) {
                        extracted.harga = prices[0];
                        extracted.sl = prices[1];
                        extracted.tp = prices[2];
                    }
                }
                
                extracted.alasan = 'Trading signal detected via fallback parsing';
            } else {
                extracted.alasan = rawText.substring(0, 200) + '...';
            }
        }

        log.info('📊 Stage 3 trading decision berhasil diekstrak', {
            extractedData: extracted,
            parsingMethod: extracted.keputusan === 'OPEN' ? 'structured' : 'fallback',
            dataCompleteness: {
                hasDecision: !!extracted.keputusan,
                hasDirection: extracted.arah !== 'NONE',
                hasPrices: extracted.harga > 0 && extracted.sl > 0 && extracted.tp > 0,
                hasReason: !!extracted.alasan
            }
        });
        
        return extracted;

    } catch (error) {
        log.error('❌ Error extracting Stage 3 trading data', {
            error: error.message,
            statusCode: error.response?.status,
            responseData: error.response?.data,
            stack: error.stack,
            requestPayload: {
                model: MODEL_NAME,
                narrativeLength: narrativeText?.length || 0,
                apiUrl: apiUrl
            },
            headers: error.response?.headers,
            timeout: 30000
        });
        
        // Return safe defaults instead of throwing
        return {
            keputusan: 'NO_TRADE',
            pair: 'UNKNOWN',
            arah: 'NONE',
            harga: 0,
            sl: 0,
            tp: 0,
            alasan: `Extraction failed: ${error.message}`
        };
    }
}

module.exports = { extractStage3Data };
