const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const { getLogger } = require('../logger');

const log = getLogger('PromptBuilders');

async function getPrompt(filename) {
    const promptPath = path.join(__dirname, '..', '..', 'prompts', filename);
    const content = await fs.readFile(promptPath, 'utf8');
    return content;
}

async function prepareStage1Prompt(pair, ohlcvData) {
    let prompt = await getPrompt('prompt_stage1_bias.txt');
    return prompt
        .replace(/\{PAIR\}/g, pair)
        .replace(/\{ASIA_SESSION_START\}/g, process.env.ASIA_SESSION_START || '00:00')
        .replace(/\{ASIA_SESSION_END\}/g, process.env.ASIA_SESSION_END || '04:00')
        .replace(/\{OHLCV\}/g, JSON.stringify(ohlcvData, null, 2));
}

async function prepareStage2Prompt(pair, context, ohlcvData) {
    let prompt = await getPrompt('prompt_stage2_manipulation.txt');
    return prompt
        .replace(/\{PAIR\}/g, pair)
        .replace(/\{BIAS\}/g, context.daily_bias || 'NETRAL')
        .replace(/\{ASIA_HIGH\}/g, context.asia_high || 'N/A')
        .replace(/\{ASIA_LOW\}/g, context.asia_low || 'N/A')
        .replace(/\{HTF_ZONE_TARGET\}/g, context.htf_zone_target || 'N/A')
        .replace(/\{LONDON_KILLZONE_START\}/g, process.env.LONDON_KILLZONE_START || '06:00')
        .replace(/\{LONDON_KILLZONE_END\}/g, process.env.LONDON_KILLZONE_END || '09:00')
        .replace(/\{OHLCV\}/g, JSON.stringify(ohlcvData, null, 2));
}

async function prepareStage3Prompt(pair, context, ohlcvData) {
    let prompt = await getPrompt('prompt_stage3_entry.txt');
    return prompt
        .replace(/\{PAIR\}/g, pair)
        .replace(/\{BIAS\}/g, context.daily_bias || 'NETRAL')
        .replace(/\{MANIPULATION\}/g, context.manipulation_detected ? 'TRUE' : 'FALSE')
        .replace(/\{SIDE\}/g, context.manipulation_side || 'N/A')
        .replace(/\{HTF_REACTION\}/g, context.htf_reaction ? 'TRUE' : 'FALSE')
        .replace(/\{MIN_RRR\}/g, process.env.MIN_RRR || '2')
        .replace(/\{OHLCV\}/g, JSON.stringify(ohlcvData, null, 2));
}

async function prepareHoldClosePrompt(pair, ohlcvData, tradeDetails = null, currentPrice = null) {
    let prompt = await getPrompt('prompt_hold_close.txt');
    return prompt
        .replace(/\{PAIR\}/g, pair)
        .replace(/\{TRADE_DETAILS\}/g, tradeDetails ? JSON.stringify(tradeDetails, null, 2) : 'N/A')
        .replace(/\{CURRENT_PRICE\}/g, currentPrice || 'N/A')
        .replace(/\{OHLCV\}/g, JSON.stringify(ohlcvData, null, 2));
}

// Helper functions untuk data pasar
async function getChartImages(pair, timeframes = ['H4', 'H1', 'M15']) {
    const images = [];
    const apiKeys = [
        process.env.CHART_IMG_KEY_1,
        process.env.CHART_IMG_KEY_2,
        process.env.CHART_IMG_KEY_3
    ].filter(key => key);

    let keyIndex = 0;

    for (const tf of timeframes) {
        try {
            const apiKey = apiKeys[keyIndex % apiKeys.length];
            const url = `https://api.chart-img.com/v2/tradingview/advanced-chart`;
            
            const response = await axios.get(url, {
                params: {
                    symbol: `FX:${pair}`,
                    interval: tf,
                    studies: 'ATR@tv-basicstudies',
                    format: 'webp',
                    width: 1280,
                    height: 720,
                    key: apiKey
                },
                responseType: 'arraybuffer',
                timeout: 30000
            });

            const base64 = Buffer.from(response.data).toString('base64');
            images.push(base64);
            keyIndex++;
            
            log.debug(`Chart image acquired for ${pair} ${tf}`);
            
        } catch (error) {
            log.error(`Failed to get chart image for ${pair} ${tf}:`, error.message);
        }
    }

    return images;
}

async function fetchOhlcv(pair) {
    // Placeholder implementation - ganti dengan API data yang sesuai
    try {
        // Simulasi data OHLCV
        const mockData = {
            pair,
            timeframe: 'M15',
            data: [
                { time: '2024-01-24T10:00:00Z', open: 1.2345, high: 1.2367, low: 1.2340, close: 1.2355, volume: 1000 },
                { time: '2024-01-24T10:15:00Z', open: 1.2355, high: 1.2370, low: 1.2348, close: 1.2365, volume: 1200 }
            ]
        };
        
        log.debug(`OHLCV data fetched for ${pair}`);
        return mockData;
        
    } catch (error) {
        log.error(`Failed to fetch OHLCV for ${pair}:`, error.message);
        return { pair, timeframe: 'M15', data: [] };
    }
}

module.exports = { 
    prepareStage1Prompt, 
    prepareStage2Prompt, 
    prepareStage3Prompt, 
    prepareHoldClosePrompt,
    getChartImages,
    fetchOhlcv
};
