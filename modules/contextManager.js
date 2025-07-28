const fs = require('fs/promises');
const path = require('path');
const { getLogger } = require('./logger');
const log = getLogger('ContextManager');

const CONTEXT_DIR = path.join(__dirname, '..', 'daily_context');

async function ensureDir() {
    try {
        await fs.access(CONTEXT_DIR);
        log.debug('📁 Direktori daily_context ditemukan', { path: CONTEXT_DIR });
    } catch {
        await fs.mkdir(CONTEXT_DIR, { recursive: true });
        log.info('📁 Direktori daily_context berhasil dibuat', { 
            path: CONTEXT_DIR,
            action: 'CREATE_DIRECTORY',
            timestamp: new Date().toISOString()
        });
    }
}

function getNewContext(pair) {
    const newContext = {
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
    
    log.debug('🆕 Created new context', { 
        pair, 
        context: newContext,
        timestamp: new Date().toISOString()
    });
    
    return newContext;
}

async function getContext(pair) {
    await ensureDir();
    const contextPath = path.join(CONTEXT_DIR, `${pair}.json`);
    const today = new Date().toISOString().split('T')[0];

    log.debug('📖 Getting context for pair', { 
        pair, 
        contextPath, 
        today,
        timestamp: new Date().toISOString()
    });

    try {
        const data = await fs.readFile(contextPath, 'utf8');
        const context = JSON.parse(data);
        
        log.debug('📄 Context file loaded', { 
            pair, 
            contextDate: context.date, 
            today, 
            status: context.status,
            fileSize: data.length
        });
        
        if (context.date !== today) {
            log.info(`🔄 Konteks untuk ${pair} sudah usang (${context.date} != ${today}). Membuat konteks baru`, { 
                pair, 
                oldDate: context.date, 
                newDate: today,
                oldStatus: context.status
            });
            const newCtx = getNewContext(pair);
            await fs.writeFile(contextPath, JSON.stringify(newCtx, null, 2), 'utf8');
            return newCtx;
        }
        
        log.debug('✅ Context loaded successfully', { 
            pair, 
            status: context.status, 
            lock: context.lock,
            tradeStatus: context.trade_status
        });
        
        return context;
    } catch (error) {
        if (error.code === 'ENOENT') {
            log.info(`📝 File konteks untuk ${pair} tidak ditemukan. Membuat baru`, { 
                pair, 
                contextPath,
                timestamp: new Date().toISOString()
            });
            const newCtx = getNewContext(pair);
            await fs.writeFile(contextPath, JSON.stringify(newCtx, null, 2), 'utf8');
            return newCtx;
        }
        
        log.error('❌ Error loading context', { 
            pair, 
            error: error.message, 
            contextPath,
            stack: error.stack
        });
        throw error;
    }
}

async function saveContext(context) {
    await ensureDir();
    const contextPath = path.join(CONTEXT_DIR, `${context.pair}.json`);
    
    log.debug('💾 Saving context', { 
        pair: context.pair, 
        status: context.status, 
        lock: context.lock,
        contextPath,
        timestamp: new Date().toISOString()
    });
    
    try {
        // Clean up any legacy full narrative data before saving
        const cleanContext = { ...context };
        
        // Remove legacy stage objects that may contain full narratives
        delete cleanContext.stage1;
        delete cleanContext.stage2;
        delete cleanContext.stage3;
        
        // Remove any other potential full narrative fields
        delete cleanContext.full_narrative_stage1;
        delete cleanContext.full_narrative_stage2;
        delete cleanContext.full_narrative_stage3;
        
        const contextData = JSON.stringify(cleanContext, null, 2);
        await fs.writeFile(contextPath, contextData, 'utf8');
        
        log.info(`✅ Konteks untuk ${context.pair} berhasil disimpan`, { 
            pair: context.pair, 
            status: context.status,
            lock: context.lock,
            fileSize: contextData.length,
            contextPath,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        log.error('❌ Error saving context', { 
            pair: context.pair, 
            error: error.message, 
            contextPath,
            context,
            stack: error.stack
        });
        throw error;
    }
}

module.exports = { getContext, saveContext };
