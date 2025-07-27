/**
 * @fileoverview Module untuk menangani semua perintah manual dari pengguna via WhatsApp.
 * @version 2.3.0 (Perbaikan Final dengan Menu & Status Baru)
 */

const fs = require('fs').promises;
const path = require('path');
const { getLogger } = require('./logger');
const log = getLogger('CommandHandler');

// Impor modul dan definisikan path yang relevan
const broker = require('./brokerHandler');
const journalingHandler = require('./journalingHandler');
// PERBAIKAN: Menambahkan impor yang hilang
const analysisHandler = require('./analysisHandler');
const { getEconomicNews } = require('./analysis/helpers');

const PENDING_DIR = path.join(__dirname, '..', 'pending_orders');
const POSITIONS_DIR = path.join(__dirname, '..', 'live_positions');
const CACHE_DIR = path.join(__dirname, '..', 'analysis_cache');
const CONFIG_DIR = path.join(__dirname, '..', 'config');
const RECIPIENTS_FILE = path.join(CONFIG_DIR, 'recipients.json');
const BOT_STATUS_PATH = path.join(CONFIG_DIR, 'bot_status.json');


// --- Fungsi Helper ---

async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

async function writeJsonFile(filePath, data) {
    const dir = path.dirname(filePath);
    try {
        await fs.access(dir);
    } catch (error) {
        await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function updateBotStatus(patch) {
    const current = await readJsonFile(BOT_STATUS_PATH) || {};
    const updated = { ...current, ...patch };
    await writeJsonFile(BOT_STATUS_PATH, updated);
}


// --- FUNGSI-FUNGSI COMMAND HANDLER ---

async function handleMenuCommand(whatsappSocket, chatId, supportedPairs = []) {
    log.info('Menampilkan menu bantuan bot trading', { chatId });
    const menuText = `
🤖 *MENU BANTUAN BOT TRADING ICT PO3* 🤖

*ANALISIS MANUAL PO3*
▫️ \`/stage1\` : Force analisis bias harian (Stage 1)
▫️ \`/stage2\` : Force deteksi manipulasi (Stage 2)
▫️ \`/stage3\` : Force konfirmasi entri (Stage 3)
▫️ \`/holdeod\` : Force analisis hold/close untuk semua pair
▫️ \`/fullcycle\` : Jalankan semua stage PO3 secara berurutan

*KONTROL INDIVIDUAL*
▫️ \`/${supportedPairs.join(', /').toLowerCase()}\` : Info progress pair spesifik
▫️ \`/news\` : Cari berita ekonomi terbaru
▫️ \`/context PAIR\` : Lihat konteks harian pair
▫️ \`/analyze PAIR\` : Analisis spesifik satu pair

*MANAJEMEN & LAPORAN*
▫️ \`/status\` : Status PO3 lengkap bot
▫️ \`/cls PAIR\` : Menutup trade aktif
▫️ \`/profit_today\` : Laporan profit/loss hari ini
▫️ \`/positions\` : Lihat semua posisi aktif
▫️ \`/pending\` : Lihat semua pending orders

*KONTROL BOT*
▫️ \`/pause\` : Menghentikan sementara trading terjadwal
▫️ \`/resume\` : Melanjutkan trading terjadwal
▫️ \`/restart\` : Restart sistem bot

*NOTIFIKASI*
▫️ \`/list_recipients\`
▫️ \`/add_recipient <ID>\`
▫️ \`/del_recipient <ID>\`

*PENGATURAN*
▫️ \`/setting berita <on|off>\`
▫️ \`/sesi <on|off>\`
▫️ \`/filter <on|off>\`

*DEBUG & MAINTENANCE*
▫️ \`/resetcontext PAIR\` : Reset konteks harian pair
▫️ \`/forceeod\` : Force tutup semua posisi (EOD manual)
▫️ \`/clearcache\` : Clear analysis cache
▫️ \`/health\` : Health check sistem

Gunakan \`/help\` kapan saja untuk melihat menu ini lagi.
    `;
    
    try {
        await whatsappSocket.sendMessage(chatId, { text: menuText.trim() });
        log.info('Menu bantuan berhasil dikirim', { chatId, totalCommands: 25 });
    } catch (error) {
        log.error('Gagal mengirim menu bantuan:', { error: error.message, chatId, stack: error.stack });
        throw new Error(`Gagal mengirim menu: ${error.message}`);
    }
}


async function handleAddRecipient(command, chatId, whatsappSocket) {
    const parts = command.split(' ');
    if (parts.length < 2) {
        return whatsappSocket.sendMessage(chatId, { text: 'Format salah. Gunakan: `/add_recipient <ID_WA>`\nContoh: `/add_recipient 628123456789@s.whatsapp.net`' });
    }
    const newRecipientId = parts[1];
    let recipients = await readJsonFile(RECIPIENTS_FILE) || [];
    if (recipients.includes(newRecipientId)) {
        return whatsappSocket.sendMessage(chatId, { text: `⚠️ ID ${newRecipientId} sudah ada dalam daftar.` });
    }
    recipients.push(newRecipientId);
    await writeJsonFile(RECIPIENTS_FILE, recipients);
    if (global.botSettings) {
        global.botSettings.recipients = recipients;
    }
    await whatsappSocket.sendMessage(chatId, { text: `✅ Berhasil menambahkan ${newRecipientId} ke daftar penerima.` });
}

async function handleDelRecipient(command, chatId, whatsappSocket) {
    const parts = command.split(' ');
    if (parts.length < 2) {
        return whatsappSocket.sendMessage(chatId, { text: 'Format salah. Gunakan: `/del_recipient <ID_WA>`' });
    }
    const recipientToRemove = parts[1];
    let recipients = await readJsonFile(RECIPIENTS_FILE) || [];
    const initialLength = recipients.length;
    recipients = recipients.filter(id => id !== recipientToRemove);
    if (recipients.length === initialLength) {
        return whatsappSocket.sendMessage(chatId, { text: `⚠️ ID ${recipientToRemove} tidak ditemukan dalam daftar.` });
    }
    await writeJsonFile(RECIPIENTS_FILE, recipients);
    if (global.botSettings) {
        global.botSettings.recipients = recipients;
    }
    await whatsappSocket.sendMessage(chatId, { text: `🗑️ Berhasil menghapus ${recipientToRemove} dari daftar penerima.` });
}

async function handleListRecipients(chatId, whatsappSocket) {
    const recipients = await readJsonFile(RECIPIENTS_FILE) || [];
    if (recipients.length === 0) {
        return whatsappSocket.sendMessage(chatId, { text: 'Daftar penerima notifikasi kosong.' });
    }
    let message = '📋 *Daftar Penerima Notifikasi:*\n\n';
    recipients.forEach((id, index) => {
        message += `${index + 1}. ${id}\n`;
    });
    await whatsappSocket.sendMessage(chatId, { text: message.trim() });
}

async function handleSettingsCommand(command, botSettings, chatId, whatsappSocket) {
    const parts = command.split(' ');
    if (parts.length < 3) {
        return await whatsappSocket.sendMessage(chatId, { text: 'Format salah. Gunakan: `/setting <tipe> <on|off>`\nContoh: `/setting berita on`' });
    }
    const settingType = parts[1].toLowerCase();
    const value = parts[2].toLowerCase();
    if (!['on', 'off'].includes(value)) {
        return await whatsappSocket.sendMessage(chatId, { text: 'Nilai tidak valid. Gunakan "on" atau "off".' });
    }
    const isActive = value === 'on';
    let responseMessage = 'Tipe pengaturan tidak dikenali. Gunakan "berita".';
    if (settingType === 'berita') {
        botSettings.isNewsEnabled = isActive;
        responseMessage = `✅ Pengaturan Pencarian Berita sekarang: *${isActive ? 'AKTIF' : 'NONAKTIF'}*`;
    }
    log.info('Pengaturan diubah:', botSettings);
    await whatsappSocket.sendMessage(chatId, { text: responseMessage });
}

async function handleConsolidatedStatusCommand(supportedPairs, botSettings, whatsappSocket, chatId) {
    await whatsappSocket.sendMessage(chatId, { text: '🔍 Mengambil status PO3 bot terkini...' });
    let statusText = '⚙️ *RINGKASAN STATUS BOT ICT PO3*\n\n';
    
    statusText += '*Status PO3 Per Pair:*\n';
    for (const pair of supportedPairs) {
        // PERBAIKAN: Menggunakan format nama file yang konsisten
        const pendingPath = path.join(PENDING_DIR, `trade_${pair}.json`);
        const livePath = path.join(POSITIONS_DIR, `trade_${pair}.json`);
        const isPending = await readJsonFile(pendingPath);
        const isLive = await readJsonFile(livePath);
        if (isPending) {
            statusText += `  🟡 *${pair}: PENDING* (Tiket: ${isPending.ticket})\n`;
        } else if (isLive) {
            statusText += `  🟢 *${pair}: AKTIF* (Tiket: ${isLive.ticket})\n`;
        } else {
            statusText += `  🔴 *${pair}: TIDAK AKTIF*\n`;
        }
    }
    statusText += '\n*Pengaturan Bot:*\n';
    const newsStatus = botSettings.isNewsEnabled ? 'AKTIF' : 'NONAKTIF';
    statusText += `  ▶️ Pencarian Berita: *${newsStatus}*`;
    await whatsappSocket.sendMessage(chatId, { text: statusText });
}

async function handleCloseCommand(text, chatId, whatsappSocket) {
    const parts = text.split(' ');
    if (parts.length < 2) {
        return whatsappSocket.sendMessage(chatId, { text: 'Format perintah salah. Contoh: `/cls usdjpy`' });
    }
    const pair = parts[1].toUpperCase();
    await whatsappSocket.sendMessage(chatId, { text: `⏳ Mencoba menutup/membatalkan order untuk *${pair}*...` });

    try {
        // PERBAIKAN: Mencari file dengan format yang konsisten
// PERBAIKAN: Mencari file dengan format yang konsisten
    const pendingOrderPath = path.join(PENDING_DIR, `trade_${pair}.json`);
    const livePositionPath = path.join(POSITIONS_DIR, `trade_${pair}.json`); // <-- PERBAIKI PATH INI

    // Cari di kedua folder, tentukan tipe berdasarkan folder mana yang ada filenya
    const tradeToClose = await readJsonFile(livePositionPath) || await readJsonFile(pendingOrderPath);
    const tradeType = await readJsonFile(livePositionPath) ? 'live' : 'pending';

    if (!tradeToClose || !tradeToClose.ticket) {
        return whatsappSocket.sendMessage(chatId, { text: `❌ Tidak ditemukan order aktif atau pending untuk *${pair}*.` });
}

        let closeResult;
        let closeReason;

        if (tradeType === 'pending') {
            log.info(`[COMMAND HANDLER] Membatalkan pending order #${tradeToClose.ticket} secara manual.`);
            closeResult = await broker.cancelPendingOrder(tradeToClose.ticket);
            closeReason = 'Manual Cancel by User';
        } else { // tradeType === 'live'
            log.info(`[COMMAND HANDLER] Menutup posisi #${tradeToClose.ticket} secara manual.`);
            closeResult = await broker.closePosition(tradeToClose.ticket);
            closeReason = 'Manual Close by User';
        }

        await journalingHandler.recordTrade(tradeToClose, closeReason, closeResult);
        await whatsappSocket.sendMessage(chatId, { text: `✅ *SUKSES!* Order untuk *${pair}* (#${tradeToClose.ticket}) telah ditutup/dibatalkan.` });

    } catch (error) {
        log.error(`[COMMAND HANDLER] Gagal saat menjalankan /cls untuk ${pair}:`, error);
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal menutup order untuk *${pair}*.\n*Error:* ${error.message}` });
    }
}

async function handleEntryCommand(command, chatId, whatsappSocket) {
    await whatsappSocket.sendMessage(chatId, { 
        text: '⚠️ Perintah `/etr` sudah tidak digunakan di sistem V7.\n\nBot sekarang akan membuka posisi secara otomatis berdasarkan hasil analisis. Untuk menutup posisi, gunakan `/cls PAIR`.' 
    });
}

async function handlePauseCommand(whatsappSocket, chatId) {
    await updateBotStatus({ isPaused: true });
    await whatsappSocket.sendMessage(chatId, { text: '⏸️ *Bot Dijeda.* Analisis trading terjadwal telah dihentikan.' });
}

async function handleResumeCommand(whatsappSocket, chatId) {
    await updateBotStatus({ isPaused: false });
    await whatsappSocket.sendMessage(chatId, { text: '▶️ *Bot Dilanjutkan.* Analisis trading terjadwal telah diaktifkan kembali.' });
}

async function handleSesiCommand(command, botSettings, chatId, whatsappSocket) {
    const parts = command.split(' ');
    if (parts.length < 2 || !['on', 'off'].includes(parts[1].toLowerCase())) {
        return whatsappSocket.sendMessage(chatId, { text: 'Format salah. Gunakan: `/sesi <on|off>`' });
    }
    const isActive = parts[1].toLowerCase() === 'on';
    botSettings.sessionEnabled = isActive;
    await updateBotStatus({ sessionEnabled: isActive });
    await whatsappSocket.sendMessage(chatId, { text: `✅ Filter sesi sekarang: *${isActive ? 'AKTIF' : 'NONAKTIF'}*` });
}

async function handleFilterCommand(command, botSettings, chatId, whatsappSocket) {
    const parts = command.split(' ');
    if (parts.length < 2 || !['on', 'off'].includes(parts[1].toLowerCase())) {
        return whatsappSocket.sendMessage(chatId, { text: 'Format salah. Gunakan: `/filter <on|off>`' });
    }
    const isActive = parts[1].toLowerCase() === 'on';
    botSettings.filterEnabled = isActive;
    await updateBotStatus({ filterEnabled: isActive });
    await whatsappSocket.sendMessage(chatId, { text: `✅ Hard filter sekarang: *${isActive ? 'AKTIF' : 'NONAKTIF'}*` });
}

async function handleProfitTodayCommand(whatsappSocket, chatId) {
    log.info('Memproses permintaan profit hari ini');
    try {
        await whatsappSocket.sendMessage(chatId, { text: '💰 Menghitung profit hari ini, mohon tunggu...' });
        const totalProfit = await broker.getTodaysProfit();
        if (totalProfit === null) {
            log.warn('Gagal mengambil data profit hari ini');
            await whatsappSocket.sendMessage(chatId, { text: '❌ Gagal mengambil data profit. Silakan periksa log.' });
        } else {
            const profitMessage = totalProfit >= 0
                ? `✅ *Profit Hari Ini:* +${totalProfit.toFixed(2)}`
                : `🔻 *Loss Hari Ini:* ${totalProfit.toFixed(2)}`;
            await whatsappSocket.sendMessage(chatId, { text: profitMessage });
            log.info(`Profit hari ini berhasil dikirim: ${totalProfit.toFixed(2)}`);
        }
    } catch (error) {
        log.error('Gagal memproses permintaan profit hari ini:', error.message);
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal mendapatkan data profit.\n*Error:* ${error.message}` });
    }
}

async function handleNewsCommand(whatsappSocket, chatId) {
    log.info('Memproses permintaan berita ekonomi');
    try {
        await whatsappSocket.sendMessage(chatId, { text: '🔍 *Mencari berita ekonomi terbaru...*' });
        const newsData = await getEconomicNews();
        const newsText = newsData || 'Tidak ada berita ekonomi yang ditemukan saat ini.';
        await whatsappSocket.sendMessage(chatId, { text: `📰 *BERITA EKONOMI TERBARU*\n\n${newsText}` });
        log.info('Berita ekonomi berhasil dikirim');
    } catch (error) {
        log.error('Gagal mendapatkan berita ekonomi:', error.message);
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal mendapatkan berita ekonomi.\n*Error:* ${error.message}` });
    }
}

// === FUNGSI INTERAKTIF BARU ===

/**
 * Handle manual Stage 1 Analysis
 */
async function handleStage1Command(whatsappSocket, chatId) {
    log.info('Memproses perintah /stage1 - Force analisis bias harian', { chatId });
    try {
        await whatsappSocket.sendMessage(chatId, { text: '🔍 *STAGE 1: Memulai analisis bias harian...*' });
        
        const supportedPairs = process.env.SUPPORTED_PAIRS
            ? process.env.SUPPORTED_PAIRS.split(',').map(p => p.trim().toUpperCase())
            : ['USDJPY', 'USDCHF', 'GBPUSD'];
            
        log.info('Menjalankan analisis Stage 1 untuk pairs:', { pairs: supportedPairs, triggeredBy: 'manual_command' });
        await analysisHandler.runStage1Analysis(supportedPairs);
        await whatsappSocket.sendMessage(chatId, { text: '✅ *STAGE 1 SELESAI*\nAnalisis bias harian untuk semua pair telah diselesaikan.' });
        log.info('Stage 1 analysis berhasil dijalankan secara manual', { pairs: supportedPairs, chatId });
    } catch (error) {
        log.error('Gagal menjalankan Stage 1 analysis:', { error: error.message, chatId, stack: error.stack });
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal menjalankan analisis Stage 1.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle manual Stage 2 Analysis
 */
async function handleStage2Command(whatsappSocket, chatId) {
    log.info('Memproses perintah /stage2 - Force deteksi manipulasi', { chatId });
    try {
        await whatsappSocket.sendMessage(chatId, { text: '🔍 *STAGE 2: Memulai deteksi manipulasi London...*' });
        
        const supportedPairs = process.env.SUPPORTED_PAIRS
            ? process.env.SUPPORTED_PAIRS.split(',').map(p => p.trim().toUpperCase())
            : ['USDJPY', 'USDCHF', 'GBPUSD'];
            
        log.info('Menjalankan analisis Stage 2 untuk pairs:', { pairs: supportedPairs, triggeredBy: 'manual_command' });
        await analysisHandler.runStage2Analysis(supportedPairs);
        await whatsappSocket.sendMessage(chatId, { text: '✅ *STAGE 2 SELESAI*\nDeteksi manipulasi London untuk semua pair telah diselesaikan.' });
        log.info('Stage 2 analysis berhasil dijalankan secara manual', { pairs: supportedPairs, chatId });
    } catch (error) {
        log.error('Gagal menjalankan Stage 2 analysis:', { error: error.message, chatId, stack: error.stack });
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal menjalankan analisis Stage 2.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle manual Stage 3 Analysis
 */
async function handleStage3Command(whatsappSocket, chatId) {
    log.info('Memproses perintah /stage3 - Force konfirmasi entri', { chatId });
    try {
        await whatsappSocket.sendMessage(chatId, { text: '🔍 *STAGE 3: Memulai konfirmasi entri...*' });
        
        const supportedPairs = process.env.SUPPORTED_PAIRS
            ? process.env.SUPPORTED_PAIRS.split(',').map(p => p.trim().toUpperCase())
            : ['USDJPY', 'USDCHF', 'GBPUSD'];
            
        log.info('Menjalankan analisis Stage 3 untuk pairs:', { pairs: supportedPairs, triggeredBy: 'manual_command' });
        await analysisHandler.runStage3Analysis(supportedPairs);
        await whatsappSocket.sendMessage(chatId, { text: '✅ *STAGE 3 SELESAI*\nKonfirmasi entri untuk semua pair telah diselesaikan.' });
        log.info('Stage 3 analysis berhasil dijalankan secara manual', { pairs: supportedPairs, chatId });
    } catch (error) {
        log.error('Gagal menjalankan Stage 3 analysis:', { error: error.message, chatId, stack: error.stack });
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal menjalankan analisis Stage 3.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle manual Hold/EOD Analysis
 */
async function handleHoldEodCommand(whatsappSocket, chatId) {
    log.info('Memproses perintah /holdeod - Force analisis hold/close', { chatId });
    try {
        await whatsappSocket.sendMessage(chatId, { text: '🔍 *HOLD/EOD: Menganalisis posisi aktif...*' });
        
        const monitoringHandler = require('./monitoringHandler');
        log.info('Menjalankan evaluasi hold/close untuk semua trades', { triggeredBy: 'manual_command' });
        await monitoringHandler.evaluateActiveTrades();
        await whatsappSocket.sendMessage(chatId, { text: '✅ *HOLD/EOD SELESAI*\nAnalisis hold/close untuk semua posisi aktif telah diselesaikan.' });
        log.info('Hold/EOD analysis berhasil dijalankan secara manual', { chatId });
    } catch (error) {
        log.error('Gagal menjalankan Hold/EOD analysis:', { error: error.message, chatId, stack: error.stack });
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal menjalankan analisis Hold/EOD.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle full cycle PO3 analysis
 */
async function handleFullCycleCommand(whatsappSocket, chatId) {
    log.info('Memproses perintah /fullcycle - Jalankan semua stage PO3', { chatId });
    try {
        await whatsappSocket.sendMessage(chatId, { text: '🔄 *FULL CYCLE PO3: Memulai analisis lengkap...*' });
        
        const supportedPairs = process.env.SUPPORTED_PAIRS
            ? process.env.SUPPORTED_PAIRS.split(',').map(p => p.trim().toUpperCase())
            : ['USDJPY', 'USDCHF', 'GBPUSD'];

        // Stage 1: Bias Analysis
        log.info('Full Cycle - Memulai Stage 1 (Bias Analysis)', { pairs: supportedPairs });
        await whatsappSocket.sendMessage(chatId, { text: '📊 *Stage 1:* Analisis bias harian...' });
        await analysisHandler.runStage1Analysis(supportedPairs);
        
        // Stage 2: Manipulation Detection
        log.info('Full Cycle - Memulai Stage 2 (Manipulation Detection)', { pairs: supportedPairs });
        await whatsappSocket.sendMessage(chatId, { text: '🎯 *Stage 2:* Deteksi manipulasi...' });
        await analysisHandler.runStage2Analysis(supportedPairs);
        
        // Stage 3: Entry Confirmation
        log.info('Full Cycle - Memulai Stage 3 (Entry Confirmation)', { pairs: supportedPairs });
        await whatsappSocket.sendMessage(chatId, { text: '🚀 *Stage 3:* Konfirmasi entri...' });
        await analysisHandler.runStage3Analysis(supportedPairs);
        
        // Hold/EOD Analysis
        log.info('Full Cycle - Memulai Hold/EOD Analysis', { pairs: supportedPairs });
        await whatsappSocket.sendMessage(chatId, { text: '🔒 *Hold/EOD:* Analisis posisi aktif...' });
        const monitoringHandler = require('./monitoringHandler');
        await monitoringHandler.evaluateActiveTrades();
        
        await whatsappSocket.sendMessage(chatId, { text: '✅ *FULL CYCLE SELESAI*\nSemua tahap analisis PO3 telah diselesaikan secara berurutan.' });
        log.info('Full cycle PO3 berhasil dijalankan secara manual', { pairs: supportedPairs, chatId });
    } catch (error) {
        log.error('Gagal menjalankan Full Cycle PO3:', { error: error.message, chatId, stack: error.stack });
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal menjalankan Full Cycle PO3.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle specific pair analysis
 */
async function handleAnalyzePairCommand(text, whatsappSocket, chatId) {
    const parts = text.split(' ');
    if (parts.length < 2) {
        await whatsappSocket.sendMessage(chatId, { text: 'Format perintah salah. Contoh: `/analyze USDJPY`' });
        return;
    }
    
    const pair = parts[1].toUpperCase();
    log.info('Memproses perintah /analyze untuk pair spesifik', { pair, chatId });
    
    try {
        await whatsappSocket.sendMessage(chatId, { text: `🔍 *ANALISIS ${pair}:* Memulai analisis lengkap untuk pair ini...` });
        
        log.info('Menjalankan analisis lengkap untuk pair:', { pair, triggeredBy: 'manual_command' });
        
        // Run all stages for this specific pair
        await analysisHandler.runStage1Analysis([pair]);
        await whatsappSocket.sendMessage(chatId, { text: `📊 *${pair}:* Stage 1 selesai` });
        
        await analysisHandler.runStage2Analysis([pair]);
        await whatsappSocket.sendMessage(chatId, { text: `🎯 *${pair}:* Stage 2 selesai` });
        
        await analysisHandler.runStage3Analysis([pair]);
        await whatsappSocket.sendMessage(chatId, { text: `🚀 *${pair}:* Stage 3 selesai` });
        
        await whatsappSocket.sendMessage(chatId, { text: `✅ *ANALISIS ${pair} SELESAI*\nSemua tahap analisis untuk ${pair} telah diselesaikan.` });
        log.info('Analisis lengkap pair berhasil dijalankan', { pair, chatId });
    } catch (error) {
        log.error('Gagal menjalankan analisis pair:', { error: error.message, pair, chatId, stack: error.stack });
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal menganalisis ${pair}.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle positions view
 */
async function handlePositionsCommand(whatsappSocket, chatId) {
    log.info('Memproses perintah /positions - Lihat semua posisi aktif', { chatId });
    try {
        await whatsappSocket.sendMessage(chatId, { text: '📊 *Mengambil data posisi aktif...*' });
        
        const positionFiles = await fs.readdir(POSITIONS_DIR).catch(() => []);
        
        if (positionFiles.length === 0) {
            await whatsappSocket.sendMessage(chatId, { text: '📊 *POSISI AKTIF*\n\n❌ Tidak ada posisi aktif saat ini.' });
            log.info('Tidak ada posisi aktif ditemukan', { chatId });
            return;
        }
        
        let positionsText = '📊 *POSISI AKTIF*\n\n';
        let totalPositions = 0;
        
        for (const file of positionFiles) {
            if (file.endsWith('.json')) {
                const positionData = await readJsonFile(path.join(POSITIONS_DIR, file));
                if (positionData) {
                    totalPositions++;
                    positionsText += `🟢 *${positionData.pair || 'Unknown'}*\n`;
                    positionsText += `   📈 Ticket: ${positionData.ticket}\n`;
                    positionsText += `   💰 Lot: ${positionData.volume || 'N/A'}\n`;
                    positionsText += `   🎯 Entry: ${positionData.entry_price || 'N/A'}\n`;
                    positionsText += `   🛡️ SL: ${positionData.stop_loss || 'N/A'}\n`;
                    positionsText += `   💎 TP: ${positionData.take_profit || 'N/A'}\n\n`;
                }
            }
        }
        
        positionsText += `📋 *Total: ${totalPositions} posisi aktif*`;
        
        await whatsappSocket.sendMessage(chatId, { text: positionsText });
        log.info('Data posisi aktif berhasil dikirim', { totalPositions, chatId });
    } catch (error) {
        log.error('Gagal mengambil data posisi aktif:', { error: error.message, chatId, stack: error.stack });
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal mengambil data posisi aktif.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle pending orders view
 */
async function handlePendingCommand(whatsappSocket, chatId) {
    log.info('Memproses perintah /pending - Lihat semua pending orders', { chatId });
    try {
        await whatsappSocket.sendMessage(chatId, { text: '📋 *Mengambil data pending orders...*' });
        
        const pendingFiles = await fs.readdir(PENDING_DIR).catch(() => []);
        
        if (pendingFiles.length === 0) {
            await whatsappSocket.sendMessage(chatId, { text: '📋 *PENDING ORDERS*\n\n❌ Tidak ada pending orders saat ini.' });
            log.info('Tidak ada pending orders ditemukan', { chatId });
            return;
        }
        
        let pendingText = '📋 *PENDING ORDERS*\n\n';
        let totalPending = 0;
        
        for (const file of pendingFiles) {
            if (file.endsWith('.json')) {
                const pendingData = await readJsonFile(path.join(PENDING_DIR, file));
                if (pendingData) {
                    totalPending++;
                    pendingText += `🟡 *${pendingData.pair || 'Unknown'}*\n`;
                    pendingText += `   📝 Ticket: ${pendingData.ticket}\n`;
                    pendingText += `   💰 Lot: ${pendingData.volume || 'N/A'}\n`;
                    pendingText += `   🎯 Entry: ${pendingData.entry_price || 'N/A'}\n`;
                    pendingText += `   🛡️ SL: ${pendingData.stop_loss || 'N/A'}\n`;
                    pendingText += `   💎 TP: ${pendingData.take_profit || 'N/A'}\n\n`;
                }
            }
        }
        
        pendingText += `📋 *Total: ${totalPending} pending orders*`;
        
        await whatsappSocket.sendMessage(chatId, { text: pendingText });
        log.info('Data pending orders berhasil dikirim', { totalPending, chatId });
    } catch (error) {
        log.error('Gagal mengambil data pending orders:', { error: error.message, chatId, stack: error.stack });
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal mengambil data pending orders.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle system health check
 */
async function handleHealthCommand(whatsappSocket, chatId) {
    log.info('Memproses perintah /health - System health check', { chatId });
    try {
        await whatsappSocket.sendMessage(chatId, { text: '🔍 *HEALTH CHECK: Memeriksa sistem...*' });
        
        const healthData = {
            timestamp: new Date().toISOString(),
            system: 'ONLINE',
            directories: {},
            api_status: {},
            memory: process.memoryUsage()
        };
        
        // Check directories
        const directories = [PENDING_DIR, POSITIONS_DIR, CACHE_DIR, CONFIG_DIR];
        for (const dir of directories) {
            try {
                await fs.access(dir);
                healthData.directories[path.basename(dir)] = 'OK';
            } catch {
                healthData.directories[path.basename(dir)] = 'MISSING';
            }
        }
        
        // Check essential files
        const statusFile = await readJsonFile(BOT_STATUS_PATH);
        const recipientsFile = await readJsonFile(RECIPIENTS_FILE);
        
        let healthText = '🏥 *SYSTEM HEALTH CHECK*\n\n';
        healthText += `🤖 *Sistem:* ${healthData.system}\n`;
        healthText += `⏰ *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n`;
        
        healthText += '*📁 Direktori:*\n';
        Object.entries(healthData.directories).forEach(([dir, status]) => {
            const emoji = status === 'OK' ? '✅' : '❌';
            healthText += `${emoji} ${dir}: ${status}\n`;
        });
        
        healthText += '\n*📄 Konfigurasi:*\n';
        healthText += `${statusFile ? '✅' : '❌'} Bot Status: ${statusFile ? 'OK' : 'MISSING'}\n`;
        healthText += `${recipientsFile ? '✅' : '❌'} Recipients: ${recipientsFile ? 'OK' : 'MISSING'}\n`;
        
        healthText += `\n*💾 Memory:* ${Math.round(healthData.memory.heapUsed / 1024 / 1024)}MB`;
        
        await whatsappSocket.sendMessage(chatId, { text: healthText });
        log.info('Health check berhasil dijalankan', { healthData, chatId });
    } catch (error) {
        log.error('Gagal menjalankan health check:', { error: error.message, chatId, stack: error.stack });
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal menjalankan health check.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle clear cache
 */
async function handleClearCacheCommand(whatsappSocket, chatId) {
    log.info('Memproses perintah /clearcache - Clear analysis cache', { chatId });
    try {
        await whatsappSocket.sendMessage(chatId, { text: '🗑️ *CLEAR CACHE: Membersihkan cache...*' });
        
        const cacheFiles = await fs.readdir(CACHE_DIR).catch(() => []);
        let deletedCount = 0;
        
        for (const file of cacheFiles) {
            if (file.endsWith('.json')) {
                await fs.unlink(path.join(CACHE_DIR, file));
                deletedCount++;
            }
        }
        
        await whatsappSocket.sendMessage(chatId, { text: `✅ *CACHE CLEARED*\n${deletedCount} file cache berhasil dihapus.` });
        log.info('Cache berhasil dibersihkan', { deletedCount, chatId });
    } catch (error) {
        log.error('Gagal membersihkan cache:', { error: error.message, chatId, stack: error.stack });
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal membersihkan cache.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle bot restart
 */
async function handleRestartCommand(whatsappSocket, chatId) {
    log.info('Memproses perintah /restart - Restart sistem bot', { chatId });
    try {
        await whatsappSocket.sendMessage(chatId, { text: '🔄 *RESTART: Merestart sistem bot...*' });
        
        log.warn('Bot restart diminta oleh user', { chatId, timestamp: new Date().toISOString() });
        
        await whatsappSocket.sendMessage(chatId, { text: '✅ *RESTART INITIATED*\nSistem akan restart dalam beberapa detik...' });
        
        // Give time for message to be sent
        setTimeout(() => {
            log.info('Menjalankan bot restart...', { triggeredBy: 'manual_command' });
            process.exit(0); // PM2 or similar process manager will restart
        }, 2000);
        
    } catch (error) {
        log.error('Gagal merestart bot:', { error: error.message, chatId, stack: error.stack });
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal merestart bot.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle context viewing for specific pair
 */
async function handleContextCommand(text, whatsappSocket, chatId) {
    log.info('Memproses perintah /context - Lihat konteks pair');
    const parts = text.split(' ');
    if (parts.length < 2) {
        await whatsappSocket.sendMessage(chatId, { text: 'Format perintah salah. Contoh: `/context USDJPY`' });
        return;
    }
    
    const pair = parts[1].toUpperCase();
    try {
        const { getContext } = require('./contextManager');
        const context = await getContext(pair);
        
        const contextText = `📊 *KONTEKS HARIAN ${pair}*\n\n` +
            `📅 Tanggal: ${context.date}\n` +
            `🎯 Status: ${context.status}\n` +
            `📈 Bias: ${context.daily_bias || 'Belum dianalisis'}\n` +
            `🔺 Asia High: ${context.asia_high || 'N/A'}\n` +
            `🔻 Asia Low: ${context.asia_low || 'N/A'}\n` +
            `🎯 HTF Target: ${context.htf_zone_target || 'N/A'}\n` +
            `⚡ Manipulasi: ${context.manipulation_detected ? 'YA' : 'TIDAK'}\n` +
            `↔️ Sisi: ${context.manipulation_side || 'N/A'}\n` +
            `📊 HTF Reaction: ${context.htf_reaction ? 'YA' : 'TIDAK'}\n` +
            `💰 Trade Status: ${context.trade_status}`;
            
        await whatsappSocket.sendMessage(chatId, { text: contextText });
        log.info(`Konteks untuk ${pair} berhasil dikirim`);
    } catch (error) {
        log.error(`Gagal mendapatkan konteks untuk ${pair}:`, error.message);
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal mendapatkan konteks untuk ${pair}.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle reset context for specific pair
 */
async function handleResetContextCommand(text, whatsappSocket, chatId) {
    log.info('Memproses perintah /resetcontext - Reset konteks pair');
    const parts = text.split(' ');
    if (parts.length < 2) {
        await whatsappSocket.sendMessage(chatId, { text: 'Format perintah salah. Contoh: `/resetcontext USDJPY`' });
        return;
    }
    
    const pair = parts[1].toUpperCase();
    try {
        const { getContext, saveContext } = require('./contextManager');
        
        // Buat konteks baru untuk pair tersebut
        const newContext = {
            date: new Date().toISOString().split('T')[0],
            pair,
            status: 'PENDING_BIAS',
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
            trade_status: 'NONE',
            result: null,
            error_log: null
        };
        
        await saveContext(newContext);
        await whatsappSocket.sendMessage(chatId, { text: `✅ *KONTEKS RESET*\nKonteks harian untuk ${pair} telah direset ke status awal.` });
        log.info(`Konteks untuk ${pair} berhasil direset`);
    } catch (error) {
        log.error(`Gagal reset konteks untuk ${pair}:`, error.message);
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal reset konteks untuk ${pair}.\n*Error:* ${error.message}` });
    }
}

/**
 * Handle force EOD (End of Day)
 */
async function handleForceEodCommand(whatsappSocket, chatId) {
    log.info('Memproses perintah /forceeod - Force tutup semua posisi');
    try {
        await whatsappSocket.sendMessage(chatId, { text: '⚠️ *FORCE EOD: Menutup semua posisi...*' });
        
        const monitoringHandler = require('./monitoringHandler');
        await monitoringHandler.forceCloseAllTrades();
        await whatsappSocket.sendMessage(chatId, { text: '✅ *FORCE EOD SELESAI*\nSemua posisi telah ditutup secara paksa.' });
        log.info('Force EOD berhasil dijalankan secara manual');
    } catch (error) {
        log.error('Gagal menjalankan Force EOD:', error.message);
        await whatsappSocket.sendMessage(chatId, { text: `❌ Gagal menjalankan Force EOD.\n*Error:* ${error.message}` });
    }
}

module.exports = {
    handleMenuCommand,
    handleConsolidatedStatusCommand,
    handleEntryCommand,
    handleCloseCommand,
    handleSettingsCommand,
    handleAddRecipient,
    handleDelRecipient,
    handleListRecipients,
    handlePauseCommand,
    handleResumeCommand,
    handleSesiCommand,
    handleFilterCommand,
    handleProfitTodayCommand,
    handleNewsCommand,
    // Fungsi interaktif baru
    handleStage1Command,
    handleStage2Command,
    handleStage3Command,
    handleHoldEodCommand,
    handleFullCycleCommand,
    handleAnalyzePairCommand,
    handlePositionsCommand,
    handlePendingCommand,
    handleHealthCommand,
    handleClearCacheCommand,
    handleRestartCommand,
    // Context dan maintenance
    handleContextCommand,
    handleResetContextCommand,
    handleForceEodCommand
};
