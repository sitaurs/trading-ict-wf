const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const { getLogger } = require('../logger');
const log = getLogger('ExtractorStage2');

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

async function extractStage2Data(narrativeText) {
    const MODEL_NAME = 'gemini-2.0-flash-exp';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    try {
        let prompt = await getPrompt('prompt_extractor.txt');
        prompt = prompt.replace(/\{NARRATIVE_TEXT\}/g, narrativeText);
        prompt = prompt.replace(/\{PAIRS_LIST\}/g, 'EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, NZDUSD, EURGBP, EURJPY, GBPJPY');

        const requestPayload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 150,
                topP: 0.8,
                topK: 10
            }
        };

        log.debug(`🔍 Memulai ekstraksi Stage 2 dengan ${MODEL_NAME}`, {
            model: MODEL_NAME,
            narrativeLength: narrativeText.length,
            promptLength: prompt.length,
            temperature: 0.1,
            maxTokens: 150,
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

        const rawText = response.data.candidates[0].content.parts[0].text.trim();
        
        log.debug(`✅ Gemini Flash ekstraksi Stage 2 berhasil`, {
            model: MODEL_NAME,
            duration: `${duration}ms`,
            responseLength: rawText.length,
            tokensUsed: response.data.usageMetadata?.totalTokenCount || 'N/A',
            rawResponse: rawText
        });

        // Parse the KEY: VALUE format
        const lines = rawText.split('\n');
        const extracted = {};
        
        for (const line of lines) {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                const cleanKey = key.trim().toLowerCase();
                const value = valueParts.join(':').trim();
                
                if (cleanKey === 'manipulation') {
                    extracted.manipulation_detected = value.toLowerCase().includes('true') || value.toLowerCase().includes('yes');
                }
                if (cleanKey === 'side') extracted.manipulation_side = value;
                if (cleanKey === 'htf_reaction') {
                    extracted.htf_reaction = value.toLowerCase().includes('true') || value.toLowerCase().includes('yes');
                }
            }
        }

        log.info('📊 Stage 2 data berhasil diekstrak', {
            extractedData: extracted,
            dataCompleteness: {
                hasManipulation: extracted.manipulation_detected !== undefined,
                hasSide: !!extracted.manipulation_side,
                hasHtfReaction: extracted.htf_reaction !== undefined
            }
        });
        return extracted;

    } catch (error) {
        log.error('❌ Error extracting Stage 2 data', {
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
        throw new Error(`Stage 2 extraction failed: ${error.message}`);
    }
}

module.exports = { extractStage2Data };
