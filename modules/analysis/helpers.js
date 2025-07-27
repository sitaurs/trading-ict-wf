const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const { getLogger } = require('../logger');
const log = getLogger('AnalysisHelpers');

const PENDING_DIR = path.join(__dirname, '..', '..', 'pending_orders');
const POSITIONS_DIR = path.join(__dirname, '..', '..', 'live_positions');
const JOURNAL_DIR = path.join(__dirname, '..', '..', 'journal_data');
const CACHE_DIR = path.join(__dirname, '..', '..', 'analysis_cache');
// BUG FIX: DXY_SYMBOL sudah tidak digunakan lagi dalam strategi PO3, dihapus dari export
// const DXY_SYMBOL = 'TVC:DXY'; // DEPRECATED - tidak digunakan lagi
const API_KEY_STATUS_PATH = path.join(__dirname, '..', '..', 'config', 'api_key_status.json');
const NEWS_CACHE_PATH = path.join(CACHE_DIR, 'daily_news.json');

let chartImgKeyIndex = loadLastKeyIndex();

function loadLastKeyIndex() {
    try {
        if (fsSync.existsSync(API_KEY_STATUS_PATH)) {
            const data = fsSync.readFileSync(API_KEY_STATUS_PATH, 'utf8');
            const status = JSON.parse(data);
            if (typeof status.chartImgKeyIndex === 'number') {
                log.info(`Melanjutkan dari Chart API Key index: ${status.chartImgKeyIndex}`);
                return status.chartImgKeyIndex;
            }
        }
    } catch (error) {
        log.error('Gagal memuat status API key, memulai dari 0.', error);
    }
    return 0;
}

function getAllChartImgKeys(){
    const keys=[];
    let idx=1;
    while(process.env[`CHART_IMG_KEY_${idx}`]){
        keys.push(process.env[`CHART_IMG_KEY_${idx}`]);
        idx++;
    }
    if(keys.length===0) throw new Error('Tidak ada CHART_IMG_KEY_X di file .env!');
    return keys;
}

function getNextChartImgKey(){
    const keys = getAllChartImgKeys();
    log.debug(`Menggunakan Chart API Key index: ${chartImgKeyIndex}`);
    const key = keys[chartImgKeyIndex];
    chartImgKeyIndex = (chartImgKeyIndex + 1) % keys.length;
    try{
        fsSync.writeFileSync(API_KEY_STATUS_PATH, JSON.stringify({chartImgKeyIndex}, null, 2), 'utf8');
    }catch(err){
        log.error('Gagal menyimpan status API key index.', err);
    }
    return key;
}

async function getPrompt(name){
    const promptPath = path.join(__dirname, '..', '..', 'prompts', name);
    log.debug(`Membaca prompt dari: ${promptPath}`);
    return fs.readFile(promptPath, 'utf8');
}

async function fetchOhlcv(symbol, timeframe='m30', count=50){
    const brokerUrl = `https://api.mt5.flx.web.id/ohlcv`;
    
    const requestParams = {
        symbol: symbol,
        timeframe: timeframe,
        count: count
    };

    log.debug(`📊 Fetching OHLCV data for ${symbol}`, {
        url: brokerUrl,
        params: requestParams,
        timeout: 15000,
        timestamp: new Date().toISOString()
    });

    try{
        const startTime = Date.now();
        const res = await axios.get(brokerUrl, {
            params: requestParams,
            timeout: 15000
        });
        const duration = Date.now() - startTime;

        log.debug(`📥 Raw OHLCV response for ${symbol}`, {
            status: res.status,
            statusText: res.statusText,
            dataType: typeof res.data,
            isArray: Array.isArray(res.data),
            dataLength: Array.isArray(res.data) ? res.data.length : 'N/A',
            sampleData: Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null,
            timestamp: new Date().toISOString()
        });

        // Enhanced validation for OHLCV data
        let ohlcvData = null;
        
        if (Array.isArray(res.data)) {
            ohlcvData = res.data;
        } else if (res.data && typeof res.data === 'object' && res.data.message && res.data.result) {
            // Handle standard broker response format
            if (Array.isArray(res.data.result)) {
                ohlcvData = res.data.result;
                log.debug(`OHLCV data extracted from standard broker response format for ${symbol}`);
            }
        }
        
        if (!ohlcvData || ohlcvData.length === 0) {
            log.warn(`❌ No valid OHLCV data received for ${symbol}`, {
                symbol,
                timeframe,
                count,
                responseData: res.data,
                timestamp: new Date().toISOString()
            });
            return [];
        }

        // Validate OHLCV data structure
        const validatedData = ohlcvData.filter(candle => {
            return candle && 
                   typeof candle.open === 'number' &&
                   typeof candle.high === 'number' &&
                   typeof candle.low === 'number' &&
                   typeof candle.close === 'number' &&
                   (candle.time || candle.timestamp);
        });

        log.debug(`✅ OHLCV data fetched successfully for ${symbol}`, {
            symbol: symbol,
            timeframe: timeframe,
            count: count,
            duration: `${duration}ms`,
            rawDataLength: ohlcvData.length,
            validatedDataLength: validatedData.length,
            status: res.status,
            sampleData: validatedData.length > 0 ? validatedData[0] : null,
            timestamp: new Date().toISOString()
        });

        log.info(`📈 Berhasil mengambil ${validatedData.length} data candle untuk ${symbol}`, {
            symbol: symbol,
            timeframe: timeframe,
            requestedCount: count,
            actualCount: validatedData.length,
            latestTime: validatedData.length > 0 ? validatedData[validatedData.length - 1].time || validatedData[validatedData.length - 1].timestamp : null,
            dataQuality: validatedData.length === ohlcvData.length ? 'PERFECT' : 'FILTERED',
            timestamp: new Date().toISOString()
        });
        
        return validatedData;
    }catch(e){
        log.error(`❌ Gagal mengambil data OHLCV untuk ${symbol}`, { 
            error: e.message, 
            symbol, 
            timeframe, 
            count,
            statusCode: e.response?.status,
            statusText: e.response?.statusText,
            responseData: e.response?.data,
            stack: e.stack,
            requestConfig: {
                url: brokerUrl,
                params: requestParams,
                timeout: 15000
            },
            timestamp: new Date().toISOString()
        });
        return [];
    }
}

async function readJsonFile(filePath){
    try{
        const data = await fs.readFile(filePath,'utf8');
        return JSON.parse(data);
    }catch(err){
        if(err.code==='ENOENT'){
            log.debug(`File tidak ditemukan (normal): ${filePath}`);
            return null;
        }
        log.error(`Gagal membaca file JSON: ${filePath}`, { 
            error: err.message, 
            filePath, 
            code: err.code,
            stack: err.stack 
        });
        throw err;
    }
}

async function writeJsonFile(filePath,data){
    const dir = path.dirname(filePath);
    try{
        if(!fsSync.existsSync(dir)){
            await fs.mkdir(dir,{recursive:true});
            log.info(`Direktori dibuat: ${dir}`);
        }
        await fs.writeFile(filePath, JSON.stringify(data,null,2),'utf8');
        log.info(`Data berhasil ditulis ke: ${filePath}`);
    }catch(err){
        log.error(`Gagal menulis file JSON: ${filePath}`, { 
            error: err.message, 
            filePath, 
            dataSize: JSON.stringify(data).length,
            stack: err.stack 
        });
    }
}

async function getChartImages(symbol){
    log.info(`📈 Mengambil gambar chart untuk ${symbol}...`);
    const apiSymbol = `OANDA:${symbol}`;
    
    const chartConfigs=[
        {interval:'4h',name:'H4 with EMA(50) & RSI(14)',studies:[{name:'Moving Average Exponential',input:{length:50}},{name:'Relative Strength Index',forceOverlay:false,input:{length:14}}]},
        {interval:'1h',name:'H1 with EMA(50) & RSI(14)',studies:[{name:'Moving Average Exponential',input:{length:50}},{name:'Relative Strength Index',forceOverlay:false,input:{length:14}}]},
        {interval:'15m',name:'M15 with Bollinger Bands & RSI(14)',studies:[{name:'Bollinger Bands',input:{in_0:20,in_1:2}},{name:'Relative Strength Index',forceOverlay:false,input:{length:14}}]}
    ];

    log.debug(`📊 Konfigurasi chart untuk ${symbol}`, {
        symbol: apiSymbol,
        chartsCount: chartConfigs.length,
        timeframes: chartConfigs.map(c => c.interval),
        studies: chartConfigs.map(c => c.studies.map(s => s.name))
    });

    try {
        const imagePromises = chartConfigs.map((cfg, index) => {
            const apiKey = getNextChartImgKey();
            const requestPayload = {
                symbol: apiSymbol,
                interval: cfg.interval,
                studies: cfg.studies
            };

            log.debug(`🔑 Chart API request ${index + 1}/${chartConfigs.length}`, {
                apiKey: `${apiKey.substring(0, 8)}...`,
                payload: requestPayload,
                timeout: 30000
            });

            return axios.post('https://api.chart-img.com/v2/tradingview/advanced-chart', requestPayload, {
                headers:{'x-api-key': apiKey,'Content-Type':'application/json'},
                responseType:'arraybuffer',
                timeout: 30000
            }).catch(error => {
                log.error(`❌ Chart API request ${index + 1} failed for ${cfg.name}`, {
                    error: error.message,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data ? error.response.data.toString().substring(0, 200) : 'No data',
                    config: {
                        url: 'https://api.chart-img.com/v2/tradingview/advanced-chart',
                        apiKey: `${apiKey.substring(0, 8)}...`,
                        symbol: apiSymbol,
                        interval: cfg.interval
                    }
                });
                return null; // Return null for failed requests
            });
        });

        const responses = await Promise.all(imagePromises);
        const successfulResponses = responses.filter(r => r !== null);
        
        if (successfulResponses.length === 0) {
            log.error(`❌ Tidak ada chart images yang berhasil diambil untuk ${symbol}`, {
                symbol: symbol,
                totalRequests: chartConfigs.length,
                successfulRequests: 0,
                failedRequests: chartConfigs.length
            });
            return {
                intervals: [],
                images: [],
                geminiData: []
            };
        }

        log.info(`✅ Berhasil mengambil ${successfulResponses.length}/${chartConfigs.length} gambar chart untuk ${symbol}`, {
            symbol: symbol,
            successCount: successfulResponses.length,
            totalCount: chartConfigs.length,
            imageSizes: successfulResponses.map(r => r.data.length),
            successRate: `${Math.round((successfulResponses.length / chartConfigs.length) * 100)}%`
        });

        return {
            intervals: chartConfigs.slice(0, successfulResponses.length).map(c=>c.name),
            images: successfulResponses.map(r=>Buffer.from(r.data)),
            geminiData: successfulResponses.map(r=>({inlineData:{mimeType:'image/png',data:Buffer.from(r.data).toString('base64')}}))
        };
    } catch (error) {
        log.error(`❌ Error in getChartImages for ${symbol}`, {
            error: error.message,
            stack: error.stack,
            symbol: symbol,
            chartConfigsCount: chartConfigs.length
        });
        return {
            intervals: [],
            images: [],
            geminiData: []
        };
    }
}

async function broadcastMessage(sock, ids, message){
    if(!ids||ids.length===0) return;
    log.info(`Mengirim pesan ke ${ids.length} penerima...`);
    for(const id of ids){
        try{ await sock.sendMessage(id, message); }catch(err){ log.error(`Gagal mengirim pesan ke ${id}:`, { error: err.message, id, stack: err.stack }); }
    }
}

async function getEconomicNews(){
    log.info('Mencari berita ekonomi penting via Google Search Tool...');
    try{
        const promptBerita = await getPrompt('prompt_news.txt');
        const body={contents:[{parts:[{text:promptBerita}]}],tools:[{'google_search':{}}]};
        const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, body);
        if(res.data.candidates && res.data.candidates[0].content.parts[0].text){
            const newsText = res.data.candidates[0].content.parts[0].text;
            log.info('Berhasil mendapatkan berita ekonomi.');
            return newsText;
        }
        log.warn('Tidak ada berita ekonomi yang ditemukan.');
        return 'Tidak ada berita ditemukan.';
    }catch(err){
        log.error('Gagal mendapatkan data berita ekonomi:', { 
            error: err.message, 
            statusCode: err.response?.status,
            responseData: err.response?.data,
            stack: err.stack 
        });
        return 'Gagal mendapatkan data berita.';
    }
}

async function getDailyNews(){
    const today = new Date().toISOString().slice(0,10);
    const cached = await readJsonFile(NEWS_CACHE_PATH);
    if(cached && cached.date === today && cached.news){
        log.info('Menggunakan berita ekonomi dari cache.');
        return cached.news;
    }
    const news = await getEconomicNews();
    await writeJsonFile(NEWS_CACHE_PATH, {date: today, news});
    return news;
}

async function getMarketContext(botSettings){
    let news='Pengecekan berita dinonaktifkan.';
    if(botSettings.isNewsEnabled){
        log.info('Fitur berita aktif, mengambil data berita...');
        news=await getDailyNews();
    }
    const context={session:getCurrentMarketSession(), news};
    log.info('Konteks pasar berhasil dibuat.', context);
    return context;
}

function getCurrentMarketSession(){
    const h=new Date().getUTCHours();
    if(h>=1&&h<8) return 'Asia';
    if(h>=8&&h<16) return 'London';
    if(h>=13&&h<17) return 'London/New York Overlap';
    if(h>=17&&h<22) return 'New York';
    return 'Closed/Sydney';
}

function getCurrentWIBDatetime(){
    return new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta',hour12:false}).replace(/\//g,'-').replace(',', '')+' WIB';
}

async function fetchCurrentPrice(pair){
    try{
        const url=`https://api.mt5.flx.web.id/data/tick/${pair}`;
        const res=await axios.get(url);
        let tick=res.data;
        if(Array.isArray(tick)) tick=tick[0];
        log.debug(`API response for ${pair}:`, res.data);
        if(tick && typeof tick === 'object'){
            if(typeof tick.ask!=='undefined') return tick.ask;
            if(typeof tick.bid!=='undefined') return tick.bid;
        }
        throw new Error('No price data');
    }catch(e){
        log.error(`Gagal fetch current price untuk ${pair}:`, { 
            error: e.message, 
            pair,
            url: `https://api.mt5.flx.web.id/data/tick/${pair}`,
            statusCode: e.response?.status,
            responseData: e.response?.data,
            stack: e.stack 
        });
        return null;
    }
}

module.exports={
    getPrompt,
    fetchOhlcv,
    readJsonFile,
    writeJsonFile,
    getChartImages,
    broadcastMessage,
    getEconomicNews,
    getDailyNews,
    getMarketContext,
    getCurrentMarketSession,
    getCurrentWIBDatetime,
    fetchCurrentPrice,
    getNextChartImgKey,
    getAllChartImgKeys,
    PENDING_DIR,
    POSITIONS_DIR,
    JOURNAL_DIR,
    CACHE_DIR
};
