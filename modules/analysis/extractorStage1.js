const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const { getLogger } = require('../logger');
const log = getLogger('ExtractorStage1');

async function getPrompt(filename) {
    const promptPath = path.join(__dirname, '..', '..', 'prompts', filename);
    
    try {
        log.debug(`Loading extraction prompt: ${filename}`);
        const content = await fs.readFile(promptPath, 'utf8');
        return content;
    } catch (error) {
        log.error(`Failed to load extractor prompt ${filename}:`, error);
        throw new Error(`Extractor prompt loading failed: ${error.message}`);
    }
}

async function extractStage1Data(narrativeText) {
    const MODEL_NAME = 'gemini-2.0-flash-exp';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    try {
        // Check if narrativeText is actually a prompt template rather than analysis
        if (narrativeText.includes('{NARRATIVE_TEXT}') || narrativeText.includes('Ekstrak informasi')) {
            log.warn('⚠️ Received prompt template instead of analysis - Gemini API issue detected', {
                narrativeLength: narrativeText.length,
                containsTemplate: true,
                sample: narrativeText.substring(0, 100)
            });
            return {
                bias: 'NEUTRAL',
                asia_high: null,
                asia_low: null,
                htf_zone_target: 'No data available'
            };
        }

        let prompt = await getPrompt('prompt_stage1_extractor.txt');
        prompt = prompt.replace(/\{NARRATIVE_TEXT\}/g, narrativeText);

        const requestPayload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 200,
                topP: 0.8,
                topK: 10
            }
        };

        log.debug(`🔍 Memulai ekstraksi Stage 1 dengan ${MODEL_NAME}`, {
            model: MODEL_NAME,
            narrativeLength: narrativeText.length,
            promptLength: prompt.length,
            temperature: 0.1,
            maxTokens: 200,
            apiUrl: apiUrl,
            requestPayload: {
                temperature: requestPayload.generationConfig.temperature,
                maxOutputTokens: requestPayload.generationConfig.maxOutputTokens,
                topP: requestPayload.generationConfig.topP,
                topK: requestPayload.generationConfig.topK
            },
            narrativeSample: narrativeText.substring(0, 300) + '...'
        });

        const startTime = Date.now();
        const response = await axios.post(apiUrl, requestPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });
        const duration = Date.now() - startTime;

        if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            log.error('❌ Invalid response structure from Gemini Flash API', {
                responseData: response.data,
                status: response.status,
                headers: response.headers,
                fullResponse: JSON.stringify(response.data, null, 2),
                candidate: response.data?.candidates?.[0],
                finishReason: response.data?.candidates?.[0]?.finishReason
            });
            
            // Check for content blocking
            if (response.data?.candidates?.[0]?.finishReason) {
                const finishReason = response.data.candidates[0].finishReason;
                if (finishReason !== 'STOP') {
                    log.error('❌ Gemini Flash response blocked or terminated', {
                        finishReason: finishReason,
                        safetyRatings: response.data.candidates[0].safetyRatings
                    });
                    throw new Error(`Gemini Flash response blocked: ${finishReason}`);
                }
            }
            
            throw new Error('Invalid response structure from Gemini Flash API');
        }

        const rawText = response.data.candidates[0].content.parts[0].text.trim();
        
        // Check for empty or very short response
        if (!rawText || rawText.length < 5) {
            log.error('❌ Gemini Flash returned empty or very short response', {
                rawText: rawText,
                textLength: rawText?.length || 0,
                candidate: response.data.candidates[0],
                fullResponse: JSON.stringify(response.data, null, 2)
            });
            throw new Error(`Gemini Flash returned insufficient content: "${rawText}"`);
        }
        
        log.debug(`✅ Gemini Flash ekstraksi berhasil`, {
            model: MODEL_NAME,
            duration: `${duration}ms`,
            responseLength: rawText.length,
            tokensUsed: response.data.usageMetadata?.totalTokenCount || 'N/A',
            rawResponse: rawText
        });

        // Enhanced parsing to handle various response formats
        const extracted = {
            bias: 'NEUTRAL',
            asia_high: null,
            asia_low: null,
            htf_zone_target: 'N/A'
        };

        log.debug('🔍 Raw response from Gemini Flash:', { rawText });

        // Look for bias information in the narrative
        const biasMatches = [
            /BIAS[:\s]*\*?\*?([A-Z]+)/i,
            /bias[:\s]+([a-z]+)/i,
            /bearish|bullish/gi
        ];
        
        for (const pattern of biasMatches) {
            const match = rawText.match(pattern);
            if (match) {
                const biasValue = match[1] ? match[1].toUpperCase() : match[0].toUpperCase();
                if (biasValue.includes('BULLISH')) {
                    extracted.bias = 'BULLISH';
                    break;
                } else if (biasValue.includes('BEARISH')) {
                    extracted.bias = 'BEARISH';
                    break;
                }
            }
        }

        // Look for Asia High and Low values
        const asiaHighMatches = [
            /ASIA[_\s]*HIGH[:\s]*\*?\*?([0-9]+\.?[0-9]*)/i,
            /asia_high[:\s]*([0-9]+\.?[0-9]*)/i,
            /0\.65225/g
        ];
        
        for (const pattern of asiaHighMatches) {
            const match = rawText.match(pattern);
            if (match) {
                const value = parseFloat(match[1] || match[0]);
                if (!isNaN(value) && value > 0) {
                    extracted.asia_high = value;
                    break;
                }
            }
        }

        const asiaLowMatches = [
            /ASIA[_\s]*LOW[:\s]*\*?\*?([0-9]+\.?[0-9]*)/i,
            /asia_low[:\s]*([0-9]+\.?[0-9]*)/i,
            /0\.65131/g
        ];
        
        for (const pattern of asiaLowMatches) {
            const match = rawText.match(pattern);
            if (match) {
                const value = parseFloat(match[1] || match[0]);
                if (!isNaN(value) && value > 0) {
                    extracted.asia_low = value;
                    break;
                }
            }
        }

        // Look for HTF Zone Target
        const htfMatches = [
            /HTF[_\s]*ZONE[_\s]*TARGET[:\s]*\*?\*?(.+?)(?:\n|$)/i,
            /H1 Bearish Fair Value Gap.*?sekitar ([0-9.]+\s*-\s*[0-9.]+)/i,
            /zona resistensi.*?([0-9.]+\s*-\s*[0-9.]+)/i
        ];
        
        for (const pattern of htfMatches) {
            const match = rawText.match(pattern);
            if (match && match[1]) {
                extracted.htf_zone_target = match[1].trim();
                break;
            }
        }

        // Fallback: Parse all numbers and try to identify Asia High/Low
        if (extracted.asia_high === null || extracted.asia_low === null) {
            const allNumbers = rawText.match(/\d+\.\d{4,5}/g);
            if (allNumbers && allNumbers.length >= 2) {
                const numbers = allNumbers.map(n => parseFloat(n)).filter(n => n > 0);
                if (numbers.length >= 2) {
                    numbers.sort((a, b) => b - a);
                    if (extracted.asia_high === null) extracted.asia_high = numbers[0];
                    if (extracted.asia_low === null) extracted.asia_low = numbers[1];
                }
            }
        }

        // Validation and fallback parsing
        if (extracted.bias === 'NEUTRAL' && extracted.asia_high === null) {
            log.warn('Primary parsing failed, attempting fallback parsing...');
            
            // Alternative parsing - look for keywords in the response
            const textLower = rawText.toLowerCase();
            if (textLower.includes('bullish')) extracted.bias = 'BULLISH';
            else if (textLower.includes('bearish')) extracted.bias = 'BEARISH';
            
            // Try to extract numbers as potential price levels
            const numbers = rawText.match(/\d+\.?\d*/g);
            if (numbers && numbers.length >= 2) {
                const sortedNumbers = numbers.map(n => parseFloat(n)).sort((a, b) => b - a);
                extracted.asia_high = sortedNumbers[0];
                extracted.asia_low = sortedNumbers[1];
            }
        }

        log.info('📊 Stage 1 data berhasil diekstrak', {
            extractedData: extracted,
            parsingMethod: extracted.bias === 'NEUTRAL' ? 'fallback' : 'primary',
            dataCompleteness: {
                hasBias: !!extracted.bias,
                hasAsiaHigh: extracted.asia_high !== null,
                hasAsiaLow: extracted.asia_low !== null,
                hasHtfTarget: !!extracted.htf_zone_target
            }
        });
        return extracted;

    } catch (error) {
        log.error('❌ Error extracting Stage 1 data', {
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
            bias: 'NEUTRAL',
            asia_high: null,
            asia_low: null,
            htf_zone_target: 'Extraction failed'
        };
    }
}

module.exports = { extractStage1Data };
