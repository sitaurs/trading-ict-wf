const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const { getLogger } = require('../logger');
const log = getLogger('ExtractorStage2');

async function getPrompt(filename) {
    const promptPath = path.join(__dirname, '..', '..', 'prompts', filename);
    const content = await fs.readFile(promptPath, 'utf8');
    return content;
}

async function extractStage2Data(narrativeText) {
    try {
        let prompt = await getPrompt('prompt_stage2_extractor.txt');
        prompt = prompt.replace(/\{NARRATIVE_TEXT\}/g, narrativeText);

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 150
                }
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        const rawText = response.data.candidates[0].content.parts[0].text.trim();
        log.debug('Raw extraction response:', rawText);

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

        log.info('Stage 2 data extracted successfully:', extracted);
        return extracted;

    } catch (error) {
        log.error('Error extracting Stage 2 data:', error);
        throw new Error(`Stage 2 extraction failed: ${error.message}`);
    }
}

module.exports = { extractStage2Data };
