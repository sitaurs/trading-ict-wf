const path = require('path');
const broker = require('../brokerHandler');
const journalingHandler = require('../journalingHandler');
const circuitBreaker = require('../circuitBreaker');
const { getLogger } = require('../logger');
const { writeJsonFile, readJsonFile, PENDING_DIR, POSITIONS_DIR, JOURNAL_DIR } = require('./helpers');
const log = getLogger('DecisionHandlers');

async function saveOrderData(orderData, initialAnalysisText, meta = {}) {
    const { ticket, symbol } = orderData;
    log.info(`💾 Menyimpan data untuk order #${ticket} (${symbol})`, { 
        orderData, 
        meta, 
        timestamp: new Date().toISOString() 
    });
    
    const isPending = orderData.type.includes('LIMIT') || orderData.type.includes('STOP');
    const targetDir = isPending ? PENDING_DIR : POSITIONS_DIR;
    const fileName = `trade_${symbol}.json`;
    const orderFilePath = path.join(targetDir, fileName);
    const journalFilePath = path.join(JOURNAL_DIR, `journal_data_${symbol}.json`);
    
    log.debug(`📁 Target directory: ${targetDir}`, { 
        isPending, 
        orderFilePath, 
        journalFilePath 
    });
    
    try {
        await writeJsonFile(orderFilePath, { ...orderData, meta });
        let journalData = await readJsonFile(journalFilePath) || {};
        journalData[ticket] = initialAnalysisText;
        await writeJsonFile(journalFilePath, journalData);
        
        log.info(`✅ Pencatatan untuk order #${ticket} selesai`, { 
            orderFile: orderFilePath, 
            journalFile: journalFilePath,
            journalTextLength: initialAnalysisText ? initialAnalysisText.length : 0
        });
    } catch (err) {
        log.error(`❌ Gagal menyimpan data untuk order #${ticket}`, { 
            error: err.message, 
            stack: err.stack, 
            orderData, 
            orderFilePath, 
            journalFilePath 
        });
        throw err;
    }
}

async function handleOpenDecision(extractedData, narrativeAnalysisResult, whatsappSocket, recipientIds, analysisMeta = {}) {
    const { pair, arah, harga, sl, tp } = extractedData;
    
    // 🚨 CIRCUIT BREAKER CHECK - CRITICAL PROTECTION
    const isCircuitTripped = await circuitBreaker.isTripped();
    if (isCircuitTripped) {
        const blockMessage = `🚨 CIRCUIT BREAKER AKTIF - TRADE DIBLOKIR untuk ${pair}`;
        log.warn(blockMessage, { 
            extractedData, 
            reason: 'Consecutive losses exceeded limit' 
        });
        
        if (global.broadcastMessage) {
            global.broadcastMessage(`🚨 *CIRCUIT BREAKER AKTIF*\n❌ Trade ${pair} diblokir\n🛡️ Proteksi dari kerugian beruntun\n⏰ Reset otomatis besok pagi`);
        }
        return; // STOP EXECUTION - NO TRADE
    }
    
    log.info(`🚀 AI memutuskan OPEN untuk ${pair}`, { 
        extractedData, 
        analysisMeta, 
        recipientCount: recipientIds ? recipientIds.length : 0 
    });
    
    const orderPayload = { 
        symbol: pair, 
        type: arah, 
        price: harga || 0, 
        sl, 
        tp, 
        volume: parseFloat(process.env.TRADE_VOLUME) || 0.01, 
        comment: `BotV7 | ${pair}` 
    };
    
    log.debug('📤 Payload order yang dikirim ke broker:', { 
        orderPayload, 
        timestamp: new Date().toISOString(),
        narrativeLength: narrativeAnalysisResult ? narrativeAnalysisResult.length : 0
    });
    
    // Kirim notifikasi sebelum eksekusi
    if (global.broadcastMessage) {
        global.broadcastMessage(`⚡ *EKSEKUSI ORDER: ${pair}*\n📊 Arah: ${arah}\n💰 Harga: ${harga}\n🛡️ SL: ${sl}\n🎯 TP: ${tp}\n⏳ Mengirim ke broker...`);
    }
    
    const brokerResult = await broker.openOrder(orderPayload);
    
    log.debug('📥 Response dari broker:', { 
        brokerResult, 
        timestamp: new Date().toISOString() 
    });
    
    const ticketId = brokerResult.order || brokerResult.deal || brokerResult.ticket;
    
    if (!ticketId) {
        const errorMsg = 'Eksekusi order berhasil, tetapi gagal mendapatkan ticket ID dari broker';
        log.error(`❌ ${errorMsg}`, { brokerResult, orderPayload });
        throw new Error(errorMsg);
    }
    
    log.info(`✅ Broker berhasil mengeksekusi order`, { 
        ticket: ticketId, 
        pair, 
        arah, 
        brokerResult 
    });
    
    const finalOrderData = { ...orderPayload, ticket: ticketId };
    await saveOrderData(finalOrderData, narrativeAnalysisResult, analysisMeta);
    
    // Use global broadcast function for consistency
    if (global.broadcastMessage) {
        global.broadcastMessage(`🎉 *ORDER BERHASIL DIBUKA!*\n💰 Pair: ${pair}\n📊 Arah: ${arah}\n🎫 Tiket: #${ticketId}\n💰 Entry: ${harga}\n🛡️ SL: ${sl}\n🎯 TP: ${tp}`);
    }
}

async function handleCloseDecision(extractedData, activeTrade, whatsappSocket, recipientIds) {
    const pair = activeTrade ? activeTrade.symbol : extractedData.pair;
    log.info(`🔴 AI memutuskan CLOSE_MANUAL untuk ${pair}`, { 
        extractedData, 
        activeTrade, 
        recipientCount: recipientIds ? recipientIds.length : 0 
    });
    
    if (!activeTrade || !activeTrade.ticket) {
        const warnMsg = `AI menyarankan tutup, tapi tidak ada data trade aktif tercatat untuk ${pair}`;
        log.warn(`⚠️ ${warnMsg}`, { 
            extractedData, 
            activeTrade,
            availableTradeData: activeTrade ? Object.keys(activeTrade) : null
        });
        
        if (global.broadcastMessage) {
            global.broadcastMessage(`ℹ️ *PERINGATAN: ${pair}*\n⚠️ AI menyarankan tutup posisi\n❌ Tidak ada posisi aktif tercatat\n💡 Kemungkinan sudah ditutup manual`);
        }
        return;
    }
    const { ticket } = activeTrade;
    let actionText = '';
    try {
        const isPending = activeTrade.type.includes('LIMIT') || activeTrade.type.includes('STOP');
        if (isPending) {
            log.info(`Mencoba membatalkan PENDING order #${ticket}...`);
            await broker.cancelPendingOrder(ticket);
            actionText = 'dibatalkan';
        } else {
            log.info(`Mencoba menutup LIVE posisi #${ticket}...`);
            await broker.closePosition(ticket);
            actionText = 'ditutup';
        }
        log.info(`Order/Posisi #${ticket} berhasil ${actionText} di broker.`);
    } catch (err) {
        if (err.message && err.message.includes('Invalid request')) {
            log.warn(`Gagal batalkan pending #${ticket}. Mencoba menutup sebagai posisi LIVE...`);
            await broker.closePosition(ticket);
            actionText = 'ditutup (fallback)';
            log.info(`Fallback berhasil! Posisi #${ticket} ditutup sebagai live.`);
        } else {
            throw err;
        }
    }
    const closeReason = `Manual Close by AI (${extractedData.alasan || 'No reason specified'})`;
    const closingDeal = await broker.getClosingDealInfo(ticket);
    await journalingHandler.recordTrade(activeTrade, closeReason, closingDeal || {});
    
    if (global.broadcastMessage) {
        global.broadcastMessage(`✅ Posisi ${pair} (#${ticket}) ${actionText}.`);
    }
}

function handleNoTradeDecision(extractedData, whatsappSocket, recipientIds) {
    const { alasan, pair } = extractedData;
    log.info(`Keputusan untuk ${pair || 'pair tidak diketahui'} adalah TIDAK ADA TRADE.`, `Alasan: ${alasan}`);
    
    if (global.broadcastMessage) {
        global.broadcastMessage(`🔵 *Tidak Ada Trade Disarankan*\n*Alasan:* ${alasan}`);
    }
}

/**
 * Main decision router function - this was missing and causing runtime errors!
 */
async function handleDecision(extractedData, pair, whatsappSocket, recipientIds, analysisMeta = {}) {
    if (!extractedData || !extractedData.keputusan) {
        log.error('Data ekstraksi tidak valid atau keputusan tidak ada:', extractedData);
        if (whatsappSocket && recipientIds) {
            await broadcastMessage(whatsappSocket, recipientIds, { text: `❌ Error: Data analisis untuk ${pair} tidak valid.` });
        }
        return;
    }

    const { keputusan } = extractedData;
    log.info(`[DECISION ROUTER] Memproses keputusan '${keputusan}' untuk ${pair}`, extractedData);

    try {
        switch (keputusan.toUpperCase()) {
            case 'OPEN':
            case 'BUY':
            case 'SELL':
                await handleOpenDecision(extractedData, `Analisis lengkap untuk ${pair}`, whatsappSocket, recipientIds, analysisMeta);
                break;

            case 'CLOSE':
            case 'CLOSE_MANUAL':
                // Need to get active trade data for close
                const activeTrade = null; // This should be fetched from positions
                await handleCloseDecision(extractedData, activeTrade, whatsappSocket, recipientIds);
                break;

            case 'HOLD':
            case 'WAIT':
            case 'NO_TRADE':
            case 'NONE':
                handleNoTradeDecision(extractedData, whatsappSocket, recipientIds);
                break;

            default:
                log.warn(`Keputusan tidak dikenali: ${keputusan} untuk ${pair}`);
                if (global.broadcastMessage) {
                    global.broadcastMessage(`⚠️ Keputusan tidak dikenali: ${keputusan} untuk ${pair}`);
                }
                break;
        }
    } catch (error) {
        log.error(`Error saat memproses keputusan ${keputusan} untuk ${pair}:`, { 
            error: error.message, 
            stack: error.stack,
            extractedData,
            analysisMeta 
        });
        if (global.broadcastMessage) {
            global.broadcastMessage(`❌ Error memproses keputusan untuk ${pair}: ${error.message}`);
        }
    }
}

module.exports = { handleOpenDecision, handleCloseDecision, handleNoTradeDecision, handleDecision, saveOrderData };
