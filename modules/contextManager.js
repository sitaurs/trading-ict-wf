const fs = require('fs/promises');
const path = require('path');
const { getLogger } = require('./logger');
const log = getLogger('ContextManager');

const CONTEXT_DIR = path.join(__dirname, '..', 'daily_context');

async function ensureDir() {
    try {
        await fs.access(CONTEXT_DIR);
    } catch {
        await fs.mkdir(CONTEXT_DIR, { recursive: true });
        log.info('Direktori daily_context telah dibuat.');
    }
}

function getNewContext(pair) {
    return {
        date: new Date().toISOString().split('T')[0],
        pair,
        status: 'PENDING_BIAS', // PENDING_BIAS -> PENDING_MANIPULATION -> PENDING_ENTRY -> COMPLETE_*
        lock: false,
        daily_bias: null,
        asia_high: null,
        asia_low: null,
        htf_zone_target: null,
        manipulation_detected: false,
        manipulation_side: null,
        htf_reaction: false,
        entry_price: null,
        stop_loss: null,
        take_profit: null,
        trade_status: 'NONE', // NONE -> ACTIVE -> CLOSED
        result: null,
        error_log: null
    };
}

async function getContext(pair) {
    await ensureDir();
    const contextPath = path.join(CONTEXT_DIR, `${pair}.json`);
    const today = new Date().toISOString().split('T')[0];

    try {
        const data = await fs.readFile(contextPath, 'utf8');
        const context = JSON.parse(data);
        if (context.date !== today) {
            log.info(`Konteks untuk ${pair} sudah usang. Membuat konteks baru untuk hari ini.`);
            const newCtx = getNewContext(pair);
            await fs.writeFile(contextPath, JSON.stringify(newCtx, null, 2), 'utf8');
            return newCtx;
        }
        return context;
    } catch (error) {
        if (error.code === 'ENOENT') {
            log.info(`File konteks untuk ${pair} tidak ditemukan. Membuat baru.`);
            const newCtx = getNewContext(pair);
            await fs.writeFile(contextPath, JSON.stringify(newCtx, null, 2), 'utf8');
            return newCtx;
        }
        throw error;
    }
}

async function saveContext(context) {
    await ensureDir();
    const contextPath = path.join(CONTEXT_DIR, `${context.pair}.json`);
    await fs.writeFile(contextPath, JSON.stringify(context, null, 2), 'utf8');
    log.info(`Konteks untuk ${context.pair} berhasil disimpan. Status: ${context.status}`);
}

module.exports = { getContext, saveContext };
