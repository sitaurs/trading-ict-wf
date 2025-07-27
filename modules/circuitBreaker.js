const fs = require('fs').promises;
const path = require('path');
const { getLogger } = require('./logger');
const log = getLogger('CircuitBreaker');

const STATS_PATH = path.join(__dirname, '..', 'config', 'circuit_breaker_stats.json');
const MAX_CONSECUTIVE_LOSSES = 3; // Anda bisa mengubah angka ini nanti

async function getStats() {
    try {
        const data = await fs.readFile(STATS_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { consecutiveLosses: 0, lastResetDate: new Date().toISOString().split('T')[0] };
    }
}

async function saveStats(stats) {
    await fs.writeFile(STATS_PATH, JSON.stringify(stats, null, 2));
}

async function recordLoss() {
    const stats = await getStats();
    stats.consecutiveLosses += 1;
    log.info(`Kerugian dicatat. Total kerugian beruntun: ${stats.consecutiveLosses}`);
    await saveStats(stats);
    
    // 🚨 ENHANCED NOTIFICATION - Near threshold warning
    if (stats.consecutiveLosses === MAX_CONSECUTIVE_LOSSES - 1) {
        const warningMessage = `⚠️ *PERINGATAN CIRCUIT BREAKER*\n🔴 Kerugian beruntun: ${stats.consecutiveLosses}/${MAX_CONSECUTIVE_LOSSES}\n💥 SATU KERUGIAN LAGI = AUTO PAUSE\n🛡️ Harap trading dengan lebih hati-hati`;
        
        if (global.broadcastMessage) {
            global.broadcastMessage(warningMessage);
        }
        log.warn(`🚨 [CIRCUIT BREAKER] THRESHOLD WARNING: ${stats.consecutiveLosses}/${MAX_CONSECUTIVE_LOSSES} losses`);
    }
    
    // 🚨 CIRCUIT BREAKER ACTIVATION notification
    if (stats.consecutiveLosses >= MAX_CONSECUTIVE_LOSSES) {
        const tripMessage = `🚨 *CIRCUIT BREAKER AKTIF*\n💥 ${stats.consecutiveLosses} kerugian beruntun tercapai\n🛑 BOT DIHENTIKAN OTOMATIS\n⏰ Reset otomatis besok pagi\n📊 Evaluasi strategi diperlukan`;
        
        if (global.broadcastMessage) {
            global.broadcastMessage(tripMessage);
        }
        log.error(`🚨 [CIRCUIT BREAKER] ACTIVATED: ${stats.consecutiveLosses} consecutive losses reached`);
    }
}

async function recordWin() {
    const stats = await getStats();
    if (stats.consecutiveLosses > 0) {
        const previousLosses = stats.consecutiveLosses;
        log.info('Keuntungan dicatat. Kerugian beruntun direset ke 0.');
        stats.consecutiveLosses = 0;
        await saveStats(stats);
        
        // ✅ WIN STREAK RECOVERY notification
        if (previousLosses >= 2) {
            const recoveryMessage = `✅ *RECOVERY SUCCESS*\n💰 Trading profit achieved!\n🔄 Consecutive losses reset (was: ${previousLosses})\n🚀 Bot dapat melanjutkan trading normal`;
            
            if (global.broadcastMessage) {
                global.broadcastMessage(recoveryMessage);
            }
            log.info(`✅ [CIRCUIT BREAKER] Recovery from ${previousLosses} consecutive losses`);
        }
    }
}

async function isTripped() {
    const stats = await getStats();
    const today = new Date().toISOString().split('T')[0];

    if (stats.lastResetDate !== today) {
        log.info('Hari baru, penghitung kerugian direset.');
        stats.consecutiveLosses = 0;
        stats.lastResetDate = today;
        await saveStats(stats);
        return false;
    }

    if (stats.consecutiveLosses >= MAX_CONSECUTIVE_LOSSES) {
        log.warn(`!!! CIRCUIT BREAKER AKTIF: Mencapai ${stats.consecutiveLosses} kerugian beruntun.`);
        return true;
    }

    return false;
}

module.exports = { isTripped, recordLoss, recordWin };