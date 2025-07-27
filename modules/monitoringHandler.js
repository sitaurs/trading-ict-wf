/**
 * @fileoverview Module untuk memonitor posisi aktif dan manajemen EOD dengan strategi PO3
 * @version 3.0.0 (Redesign untuk ICT Power of Three)
 */

const fs = require('fs').promises;
const path = require('path');
const broker = require('./brokerHandler');
const journaling = require('./journalingHandler');
const analysisHandler = require('./analysisHandler');
const { getLogger } = require('./logger');
const log = getLogger('MonitoringHandler');

// --- LOKASI DIREKTORI ---
const PENDING_DIR = path.join(__dirname, '..', 'pending_orders');
const POSITIONS_DIR = path.join(__dirname, '..', 'live_positions');

let isEvaluating = false;
let isClosing = false;

// Pastikan direktori penting ada sebelum digunakan
async function ensureDir(dir) {
    try {
        await fs.access(dir);
    } catch (_) {
        await fs.mkdir(dir, { recursive: true });
        log.info(`[MONITORING] Direktori dibuat: ${dir}`);
    }
}

/**
 * Fungsi pembungkus untuk broadcast
 */
const broadcast = (message) => {
    if (global.broadcastMessage) {
        global.broadcastMessage(message);
    } else {
        log.warn('[MONITORING] Peringatan: fungsi broadcastMessage global tidak ditemukan.');
    }
};

/**
 * Evaluasi posisi aktif untuk analisis Hold/Close
 */
async function evaluateActiveTrades() {
    if (isEvaluating) {
        log.warn('[MONITORING] Evaluasi masih berjalan, siklus dilewati.');
        return;
    }

    isEvaluating = true;

    try {
        await ensureDir(POSITIONS_DIR);
        
        const files = await fs.readdir(POSITIONS_DIR);
        const tradeFiles = files.filter(f => f.endsWith('.json'));

        if (tradeFiles.length === 0) {
            log.debug('[MONITORING] Tidak ada posisi aktif untuk dievaluasi.');
            isEvaluating = false;
            return;
        }

        log.info(`[MONITORING] Mengevaluasi ${tradeFiles.length} posisi aktif...`);

        // Dapatkan semua posisi aktif dari broker
        const activePositions = await broker.getActivePositions();
        const activeTickets = activePositions.map(pos => pos.ticket.toString());

        for (const file of tradeFiles) {
            try {
                const filePath = path.join(POSITIONS_DIR, file);
                const tradeData = JSON.parse(await fs.readFile(filePath, 'utf8'));

                // Cek apakah posisi masih aktif di broker
                const isStillActive = activeTickets.includes(tradeData.broker_order_id.toString());

                if (!isStillActive) {
                    // Posisi sudah ditutup di broker, ambil info penutupan
                    log.info(`[MONITORING] Posisi ${tradeData.pair} telah ditutup di broker.`);
                    
                    const closingDeal = await broker.getClosingDealInfo(tradeData.broker_order_id);
                    
                    const result = {
                        ...tradeData,
                        close_price: closingDeal ? closingDeal.price : 0,
                        close_time: closingDeal ? closingDeal.time : new Date().toISOString(),
                        profit_loss: closingDeal ? closingDeal.profit : 0,
                        status: 'CLOSED'
                    };

                    await journaling.recordTrade(result);
                    await fs.unlink(filePath);
                    
                    broadcast(`✅ ${tradeData.pair} ditutup. P/L: ${result.profit_loss}`);
                    
                } else if (brokerStatus && brokerStatus.status === 'ACTIVE') {
                    // Posisi masih aktif, jalankan analisis Hold/Close
                    await analysisHandler.runHoldCloseAnalysis(tradeData.pair);
                    
                } else {
                    log.warn(`[MONITORING] Status tidak jelas untuk ${tradeData.pair}: ${JSON.stringify(brokerStatus)}`);
                }

            } catch (error) {
                log.error(`[MONITORING] Error evaluasi file ${file}:`, { 
                    error: error.message, 
                    file,
                    stack: error.stack,
                    tradeData: tradeData ? { pair: tradeData.pair, ticket: tradeData.ticket } : null
                });
                continue;
            }
        }

    } catch (error) {
        log.error('[MONITORING] Error pada evaluateActiveTrades:', { 
            error: error.message, 
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    } finally {
        isEvaluating = false;
    }
}

/**
 * Memantau pending orders yang berubah menjadi live positions
 */
async function checkAllTrades() {
    try {
        await ensureDir(PENDING_DIR);
        await ensureDir(POSITIONS_DIR);
        
        const pendingFiles = await fs.readdir(PENDING_DIR);
        const orderFiles = pendingFiles.filter(f => f.endsWith('.json'));

        if (orderFiles.length === 0) {
            log.debug('[MONITORING] Tidak ada pending order untuk dicek.');
            return;
        }

        log.info(`[MONITORING] Memeriksa ${orderFiles.length} pending order...`);

        for (const file of orderFiles) {
            try {
                const pendingPath = path.join(PENDING_DIR, file);
                const orderData = JSON.parse(await fs.readFile(pendingPath, 'utf8'));

                // Cek status di broker
                const brokerStatus = await broker.getOrderStatus(orderData.broker_order_id);

                if (brokerStatus && brokerStatus.status === 'FILLED') {
                    // Order sudah terisi, pindahkan ke live positions
                    log.info(`[MONITORING] Order ${orderData.pair} telah terisi di broker.`);
                    
                    const livePosition = {
                        ...orderData,
                        fill_price: brokerStatus.fill_price,
                        fill_time: brokerStatus.fill_time,
                        status: 'ACTIVE'
                    };

                    const livePath = path.join(POSITIONS_DIR, file);
                    await fs.writeFile(livePath, JSON.stringify(livePosition, null, 2), 'utf8');
                    await fs.unlink(pendingPath);
                    
                    broadcast(`🚀 ${orderData.pair} order terisi di ${brokerStatus.fill_price}`);
                    
                } else if (brokerStatus && brokerStatus.status === 'CANCELLED') {
                    // Order dibatalkan, hapus dari pending
                    log.info(`[MONITORING] Order ${orderData.pair} dibatalkan di broker.`);
                    await fs.unlink(pendingPath);
                    
                    broadcast(`❌ ${orderData.pair} order dibatalkan`);
                }

            } catch (error) {
                log.error(`[MONITORING] Error memeriksa pending order ${file}:`, { 
                    error: error.message, 
                    file,
                    stack: error.stack,
                    orderData: orderData ? { pair: orderData.pair, ticket: orderData.ticket } : null
                });
                continue;
            }
        }

    } catch (error) {
        log.error('[MONITORING] Error pada checkAllTrades:', { 
            error: error.message, 
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Paksa tutup semua posisi di akhir hari (EOD)
 */
async function forceCloseAllTrades() {
    if (isClosing) {
        log.warn('[MONITORING] EOD close masih berjalan, request dilewati.');
        return;
    }

    isClosing = true;

    try {
        await ensureDir(POSITIONS_DIR);
        
        const files = await fs.readdir(POSITIONS_DIR);
        const tradeFiles = files.filter(f => f.endsWith('.json'));

        if (tradeFiles.length === 0) {
            log.info('[EOD] Tidak ada posisi aktif untuk ditutup.');
            broadcast('🌅 EOD: Tidak ada posisi aktif untuk ditutup.');
            isClosing = false;
            return;
        }

        log.info(`[EOD] Menutup paksa ${tradeFiles.length} posisi aktif...`);
        broadcast(`🌅 EOD: Menutup paksa ${tradeFiles.length} posisi...`);

        let successCount = 0;
        let errorCount = 0;

        for (const file of tradeFiles) {
            try {
                const filePath = path.join(POSITIONS_DIR, file);
                const tradeData = JSON.parse(await fs.readFile(filePath, 'utf8'));

                // Tutup posisi melalui broker
                const closeResult = await broker.closePosition(tradeData.broker_order_id);

                if (closeResult.success) {
                    const result = {
                        ...tradeData,
                        close_price: closeResult.close_price,
                        close_time: closeResult.close_time,
                        profit_loss: closeResult.profit_loss,
                        status: 'CLOSED_EOD'
                    };

                    await journaling.recordTrade(result);
                    await fs.unlink(filePath);
                    
                    successCount++;
                    log.info(`[EOD] ${tradeData.pair} ditutup: P/L ${closeResult.profit_loss}`);
                    
                } else {
                    errorCount++;
                    log.error(`[EOD] Gagal tutup ${tradeData.pair}:`, { 
                        error: closeResult.error, 
                        pair: tradeData.pair,
                        ticket: tradeData.broker_order_id,
                        closeResult
                    });
                }

            } catch (error) {
                errorCount++;
                log.error(`[EOD] Error memproses ${file}:`, { 
                    error: error.message, 
                    file,
                    stack: error.stack
                });
            }
        }

        const summary = `✅ EOD selesai: ${successCount} sukses, ${errorCount} error`;
        broadcast(summary);
        log.info(`[EOD] ${summary}`);

    } catch (error) {
        log.error('[EOD] Error pada forceCloseAllTrades:', { 
            error: error.message, 
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        broadcast('❌ EOD Error: Gagal menutup posisi');
    } finally {
        isClosing = false;
    }
}

module.exports = {
    evaluateActiveTrades,
    checkAllTrades,
    forceCloseAllTrades
};
