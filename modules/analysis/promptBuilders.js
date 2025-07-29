const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const { getLogger } = require('../logger');

const log = getLogger('PromptBuilders');

async function getPrompt(filename) {
    const promptPath = path.join(__dirname, '..', '..', 'prompts', filename);
    
    try {
        log.info(`Loading prompt: ${filename}`);
        const content = await fs.readFile(promptPath, 'utf8');
        return content;
    } catch (error) {
        log.error(`Failed to load prompt ${filename}:`, error);
        throw new Error(`Prompt loading failed: ${error.message}`);
    }
}

async function prepareStage1Prompt(pair, ohlcvData) {
    let prompt = await getPrompt('prompt_stage1_bias.txt');
    return prompt
        .replace(/\{PAIR\}/g, pair)
        .replace(/\{ASIA_SESSION_START\}/g, process.env.ASIA_SESSION_START || '00:00')
        .replace(/\{ASIA_SESSION_END\}/g, process.env.ASIA_SESSION_END || '04:00')
        .replace(/\{OHLCV\}/g, JSON.stringify(ohlcvData, null, 2));
}

async function prepareStage2Prompt(pair, context, ohlcvData, fullNarratives = {}) {
    let prompt = await getPrompt('prompt_stage2_manipulation.txt');
    
    // Siapkan Stage 1 full narrative jika tersedia
    const stage1Narrative = fullNarratives.stage1_full_narrative || 'Tidak tersedia - analisis dilakukan pada sesi sebelumnya';
    
    // Tambahkan daily context data
    const dailyContextData = {
        pair: context.pair || pair,
        date: context.date,
        daily_bias: context.daily_bias,
        asia_high: context.asia_high,
        asia_low: context.asia_low,
        htf_zone_target: context.htf_zone_target,
        status: context.status
    };
    
    return prompt
        .replace(/\{PAIR\}/g, pair)
        .replace(/\{BIAS\}/g, context.daily_bias || 'NETRAL')
        .replace(/\{ASIA_HIGH\}/g, context.asia_high || 'N/A')
        .replace(/\{ASIA_LOW\}/g, context.asia_low || 'N/A')
        .replace(/\{HTF_ZONE_TARGET\}/g, context.htf_zone_target || 'N/A')
        .replace(/\{FULL_NARRATIVE_STAGE1\}/g, stage1Narrative)
        .replace(/\{DAILY_CONTEXT\}/g, JSON.stringify(dailyContextData, null, 2))
        .replace(/\{LONDON_KILLZONE_START\}/g, process.env.LONDON_KILLZONE_START || '06:00')
        .replace(/\{LONDON_KILLZONE_END\}/g, process.env.LONDON_KILLZONE_END || '09:00')
        .replace(/\{OHLCV\}/g, JSON.stringify(ohlcvData, null, 2));
}

async function prepareStage3Prompt(pair, context, ohlcvData, fullNarratives = {}) {
    let prompt = await getPrompt('prompt_stage3_entry.txt');
    
    // PERBAIKAN: Handle missing foundational data dengan fallback logic
    const foundationalStatus = fullNarratives.foundational_status || 'COMPLETE';
    
    let stage1Narrative = 'Tidak tersedia - analisis dilakukan pada sesi sebelumnya';
    let stage2Narrative = 'Tidak tersedia - analisis dilakukan pada sesi sebelumnya';
    let contextualNote = '';
    
    if (foundationalStatus === 'MISSING_ALL') {
        stage1Narrative = 'DATA TIDAK TERSEDIA - Lakukan analisis bias secara mandiri berdasarkan struktur market H4/H1';
        stage2Narrative = 'DATA TIDAK TERSEDIA - Lakukan analisis manipulation secara mandiri berdasarkan reaksi price action';
        contextualNote = '\n\n**IMPORTANT**: Stage 1 & 2 data tidak tersedia. Lakukan analisis komprehensif dari chart yang tersedia untuk menentukan bias dan manipulation patterns.';
    } else if (foundationalStatus === 'MISSING_STAGE1') {
        stage1Narrative = 'DATA TIDAK TERSEDIA - Lakukan analisis bias secara mandiri berdasarkan struktur market H4/H1';
        stage2Narrative = fullNarratives.stage2_full_narrative || stage2Narrative;
        contextualNote = '\n\n**IMPORTANT**: Stage 1 data tidak tersedia. Inferensikan bias dari Stage 2 dan chart analysis.';
    } else if (foundationalStatus === 'MISSING_STAGE2') {
        stage1Narrative = fullNarratives.stage1_full_narrative || stage1Narrative;
        stage2Narrative = 'DATA TIDAK TERSEDIA - Lakukan analisis manipulation secara mandiri berdasarkan reaksi price action';
        contextualNote = '\n\n**IMPORTANT**: Stage 2 data tidak tersedia. Gunakan Stage 1 bias dan chart analysis untuk konfirmasi.';
    } else {
        // COMPLETE - semua data tersedia
        stage1Narrative = fullNarratives.stage1_full_narrative || stage1Narrative;
        stage2Narrative = fullNarratives.stage2_full_narrative || stage2Narrative;
    }
    
    // Tambahkan daily context data
    const dailyContextData = {
        pair: context.pair || pair,
        date: context.date,
        daily_bias: context.daily_bias,
        asia_high: context.asia_high,
        asia_low: context.asia_low,
        htf_zone_target: context.htf_zone_target,
        manipulation_detected: context.manipulation_detected,
        manipulation_side: context.manipulation_side,
        htf_reaction: context.htf_reaction,
        status: context.status,
        foundational_data_status: foundationalStatus
    };
    
    return prompt
        .replace(/\{PAIR\}/g, pair)
        .replace(/\{BIAS\}/g, context.daily_bias || 'ANALISIS_DARI_CHART')
        .replace(/\{MANIPULATION\}/g, context.manipulation_detected ? 'TRUE' : 'ANALISIS_DARI_CHART')
        .replace(/\{SIDE\}/g, context.manipulation_side || 'ANALISIS_DARI_CHART')
        .replace(/\{HTF_REACTION\}/g, context.htf_reaction ? 'TRUE' : 'ANALISIS_DARI_CHART')
        .replace(/\{FULL_NARRATIVE_STAGE1\}/g, stage1Narrative)
        .replace(/\{FULL_NARRATIVE_STAGE2\}/g, stage2Narrative)
        .replace(/\{DAILY_CONTEXT\}/g, JSON.stringify(dailyContextData, null, 2))
        .replace(/\{MIN_RRR\}/g, process.env.MIN_RRR || '2')
        .replace(/\{OHLCV\}/g, JSON.stringify(ohlcvData, null, 2))
        + contextualNote;
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
    try {
        // Use the helper function from helpers.js which has proven working implementation
        const { getChartImages: helpersGetChartImages } = require('./helpers');
        const chartData = await helpersGetChartImages(pair);
        
        if (chartData && chartData.images && chartData.images.length > 0) {
            // Convert buffer images to base64
            const base64Images = chartData.images.map(buffer => buffer.toString('base64'));
            log.debug(`Successfully got ${base64Images.length} chart images for ${pair}`);
            return base64Images;
        } else {
            log.warn(`No chart images received for ${pair}, continuing without images`);
            return [];
        }
    } catch (error) {
        log.error(`Failed to get chart images for ${pair}:`, error.message);
        // Continue without images rather than failing completely
        return [];
    }
}

async function fetchOhlcv(pair) {
    try {
        // Use the MT5 API from helpers.js
        const { fetchOhlcv: helpersFetchOhlcv } = require('./helpers');
        
        // Fetch real OHLCV data using MT5 API
        const ohlcvData = await helpersFetchOhlcv(pair, 'm15', 50);
        
        if (ohlcvData && ohlcvData.length > 0) {
            log.debug(`Real OHLCV data fetched for ${pair}: ${ohlcvData.length} candles`);
            return {
                pair,
                timeframe: 'M15',
                data: ohlcvData,
                count: ohlcvData.length,
                source: 'MT5_API'
            };
        } else {
            // Fallback to mock data if API fails
            log.warn(`No OHLCV data received for ${pair}, using mock data`);
            return getMockOhlcvData(pair);
        }
        
    } catch (error) {
        log.error(`Failed to fetch OHLCV for ${pair}:`, {
            error: error.message,
            statusCode: error.response?.status,
            responseData: error.response?.data,
            stack: error.stack
        });
        
        // Always fallback to mock data to prevent complete failure
        log.info(`Using mock data for ${pair} due to API failure`);
        return getMockOhlcvData(pair);
    }
}

function getMockOhlcvData(pair) {
    // Generate more realistic mock data with proper price ranges
    const basePrice = pair.includes('JPY') ? 150.00 : 1.0800;
    const data = [];
    
    for (let i = 0; i < 50; i++) {
        const variance = (Math.random() - 0.5) * 0.01;
        const open = basePrice + variance;
        const close = open + (Math.random() - 0.5) * 0.005;
        const high = Math.max(open, close) + Math.random() * 0.002;
        const low = Math.min(open, close) - Math.random() * 0.002;
        
        data.push({
            time: new Date(Date.now() - (50 - i) * 15 * 60 * 1000).toISOString(),
            open: parseFloat(open.toFixed(5)),
            high: parseFloat(high.toFixed(5)),
            low: parseFloat(low.toFixed(5)),
            close: parseFloat(close.toFixed(5)),
            volume: Math.floor(Math.random() * 2000) + 500
        });
    }
    
    return {
        pair,
        timeframe: 'M15',
        data,
        count: data.length,
        source: 'MOCK_DATA',
        isMockData: true
    };
}

module.exports = { 
    prepareStage1Prompt, 
    prepareStage2Prompt, 
    prepareStage3Prompt, 
    prepareHoldClosePrompt,
    getChartImages,
    fetchOhlcv
};
