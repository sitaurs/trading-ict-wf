/**
 * @fileoverview Titik masuk utama untuk aplikasi Bot Trading.
 * Menginisialisasi koneksi WhatsApp, menjadwalkan analisis, dan menjalankan loop monitoring.
 * @version 2.1.0 (Upgrade dengan fitur kontrol dan notifikasi lengkap)
 */

require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const cron = require('node-cron');
const { getLogger } = require('./modules/logger');
const log = getLogger('Main');

// Impor modul yang sudah ada
const { startWhatsAppClient } = require('./modules/whatsappClient');
const analysisHandler = require('./modules/analysisHandler');
const commandHandler = require('./modules/commandHandler');
const monitoringHandler = require('./modules/monitoringHandler');

// --- Konfigurasi Terpusat ---
const SUPPORTED_PAIRS = process.env.SUPPORTED_PAIRS
    ? process.env.SUPPORTED_PAIRS.split(',').map(p => p.trim().toUpperCase())
    : ['USDJPY', 'USDCHF', 'GBPUSD'];

const CONFIG_DIR = path.join(__dirname, 'config');
const RECIPIENTS_FILE = path.join(CONFIG_DIR, 'recipients.json');

// --- Variabel Global ---
global.botSettings = {};
let whatsappSocket;

// --- Fungsi Helper ---

/**
 * Memuat daftar penerima dari file JSON.
 */
async function loadRecipients() {
    try {
        await fs.access(RECIPIENTS_FILE);
        const data = await fs.readFile(RECIPIENTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        log.warn("Warning: File config/recipients.json tidak ditemukan. Membuat file baru...");
        await writeJsonFile(RECIPIENTS_FILE, []);
        return [];
    }
}

async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

/**
 * Helper untuk menulis file JSON.
 */
async function writeJsonFile(filePath, data) {
    const dir = path.dirname(filePath);
    try {
        await fs.access(dir);
    } catch (error) {
        await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * (BARU) Fungsi global untuk mengirim pesan ke semua penerima.
 * Digunakan oleh modul lain seperti monitoringHandler.
 */
global.broadcastMessage = (messageText) => {
    // Pastikan socket dan daftar penerima sudah siap
    if (whatsappSocket && global.botSettings && global.botSettings.recipients) {
        log.info(`[BROADCAST] Mengirim pesan: "${messageText}"`);
        for (const id of global.botSettings.recipients) {
            whatsappSocket.sendMessage(id, { text: messageText }).catch(err => {
                log.error(`Gagal kirim pesan broadcast ke ${id}:`, err);
            });
        }
    }
};

/**
 * Fungsi utama aplikasi
 */
async function main() { // PERBAIKAN: Kurung kurawal pembuka dipindahkan ke sini
    log.info('Memulai bot...');
    const status = await readJsonFile(path.join(CONFIG_DIR, 'bot_status.json')) || {};
    global.botSettings = {
        isNewsEnabled: process.env.ENABLE_NEWS_SEARCH === 'true',
        recipients: await loadRecipients()
    };
    log.info('Pengaturan awal dimuat:', {
        isNewsEnabled: global.botSettings.isNewsEnabled
    });
    log.info('Penerima notifikasi dimuat:', global.botSettings.recipients);

    whatsappSocket = await startWhatsAppClient((sock) => {
        whatsappSocket = sock;
    });

    // --- Mengaktifkan Siklus Monitoring untuk Posisi Aktif ---
    const intervalMinutes = process.env.MONITORING_INTERVAL_MINUTES || 30;
    const intervalMs = intervalMinutes * 60 * 1000;

    log.info(`🤖 Bot siap. Monitoring posisi aktif setiap ${intervalMinutes} menit.`);
    
    setTimeout(() => {
        monitoringHandler.evaluateActiveTrades();
    }, 5000); 

    setInterval(() => {
        monitoringHandler.evaluateActiveTrades();
    }, intervalMs);


    // --- Listener Pesan WhatsApp ---
    whatsappSocket.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const chatId = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
        if (!text) return;

        const command = text.split(' ')[0].toLowerCase();
        
        try {
            log.info(`Menerima perintah: "${text}" dari ${chatId}`);
            
            // PERBAIKAN: Blok switch yang sudah di-upgrade dengan command baru
            switch (command) {
                case '/menu':
                case '/help':
                    await commandHandler.handleMenuCommand(whatsappSocket, chatId, SUPPORTED_PAIRS);
                    break;
                case '/status':
                    await commandHandler.handleConsolidatedStatusCommand(SUPPORTED_PAIRS, global.botSettings, whatsappSocket, chatId);
                    break;
                case '/etr':
                    await commandHandler.handleEntryCommand(text, chatId, whatsappSocket);
                    break;
                case '/cls':
                    await commandHandler.handleCloseCommand(text, chatId, whatsappSocket);
                    break;
                case '/settings':
                case '/setting':
                    await commandHandler.handleSettingsCommand(text, global.botSettings, chatId, whatsappSocket);
                    break;
                case '/add_recipient':
                    await commandHandler.handleAddRecipient(text, chatId, whatsappSocket);
                    break;
                case '/del_recipient':
                    await commandHandler.handleDelRecipient(text, chatId, whatsappSocket);
                    break;
                case '/list_recipients':
                    await commandHandler.handleListRecipients(chatId, whatsappSocket);
                    break;
                case '/pause':
                    await commandHandler.handlePauseCommand(whatsappSocket, chatId);
                    break;
                case '/resume':
                    await commandHandler.handleResumeCommand(whatsappSocket, chatId);
                    break;
                case '/profit_today':
                    await commandHandler.handleProfitTodayCommand(whatsappSocket, chatId);
                    break;
                case '/news':
                    await commandHandler.handleNewsCommand(whatsappSocket, chatId);
                    break;
                // === COMMAND INTERAKTIF BARU ===
                case '/stage1':
                    await commandHandler.handleStage1Command(whatsappSocket, chatId);
                    break;
                case '/stage2':
                    await commandHandler.handleStage2Command(whatsappSocket, chatId);
                    break;
                case '/stage3':
                    await commandHandler.handleStage3Command(whatsappSocket, chatId);
                    break;
                case '/holdeod':
                    await commandHandler.handleHoldEodCommand(whatsappSocket, chatId);
                    break;
                case '/fullcycle':
                    await commandHandler.handleFullCycleCommand(whatsappSocket, chatId);
                    break;
                case '/analyze':
                    await commandHandler.handleAnalyzePairCommand(text, whatsappSocket, chatId);
                    break;
                case '/positions':
                    await commandHandler.handlePositionsCommand(whatsappSocket, chatId);
                    break;
                case '/pending':
                    await commandHandler.handlePendingCommand(whatsappSocket, chatId);
                    break;
                case '/health':
                    await commandHandler.handleHealthCommand(whatsappSocket, chatId);
                    break;
                case '/clearcache':
                    await commandHandler.handleClearCacheCommand(whatsappSocket, chatId);
                    break;
                case '/restart':
                    await commandHandler.handleRestartCommand(whatsappSocket, chatId);
                    break;
                case '/context':
                    await commandHandler.handleContextCommand(text, whatsappSocket, chatId);
                    break;
                case '/resetcontext':
                    await commandHandler.handleResetContextCommand(text, whatsappSocket, chatId);
                    break;
                case '/forceeod':
                    await commandHandler.handleForceEodCommand(whatsappSocket, chatId);
                    break;
                default:
                    // Manual analysis untuk pair tertentu (opsional untuk testing)
                    const parts = text.split(' ');
                    const requestedPair = parts[0].substring(1).toUpperCase();
                    if (SUPPORTED_PAIRS.includes(requestedPair)) {
                        await whatsappSocket.sendMessage(chatId, { 
                            text: `⚠️ ${requestedPair} akan dianalisis otomatis sesuai jadwal PO3. Gunakan /status untuk melihat progress.` 
                        });
                    }
                    break;
            }
        } catch (error) {
            log.error(`Error saat memproses perintah "${text}":`, error);
            await whatsappSocket.sendMessage(chatId, { text: `Terjadi kesalahan internal: ${error.message}` });
        }
    });

    // --- Jadwal PO3 Multi-Tahap ---
    // Stage 1: Daily Bias Analysis (05:00 UTC)
    cron.schedule('0 5 * * 1-5', async () => {
        try {
            const statusData = await fs.readFile(path.join(__dirname, 'config', 'bot_status.json'), 'utf8');
            const status = JSON.parse(statusData);

            if (status.isPaused) {
                log.info("[STAGE1] Analisis bias harian dilewati karena bot dalam mode jeda.");
                return;
            }

            log.info("[STAGE1] --- Menjalankan Analisis Bias Harian ---");
            await analysisHandler.runStage1Analysis(SUPPORTED_PAIRS);
        } catch (error) {
            if (error.code === 'ENOENT') {
                log.info("[STAGE1] --- Menjalankan Analisis Bias Harian (file status tidak ditemukan) ---");
                await analysisHandler.runStage1Analysis(SUPPORTED_PAIRS);
            } else {
                log.error("[STAGE1] Error saat menjalankan analisis bias:", error);
            }
        }
    });

    // Stage 2: London Manipulation Detection (every 15 mins during London killzone)
    cron.schedule('*/15 6-9 * * 1-5', async () => {
        try {
            const statusData = await fs.readFile(path.join(__dirname, 'config', 'bot_status.json'), 'utf8');
            const status = JSON.parse(statusData);

            if (status.isPaused) {
                log.info("[STAGE2] Deteksi manipulasi dilewati karena bot dalam mode jeda.");
                return;
            }

            log.info("[STAGE2] --- Menjalankan Deteksi Manipulasi London ---");
            await analysisHandler.runStage2Analysis(SUPPORTED_PAIRS);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await analysisHandler.runStage2Analysis(SUPPORTED_PAIRS);
            } else {
                log.error("[STAGE2] Error saat deteksi manipulasi:", error);
            }
        }
    });

    // Stage 3: Entry Confirmation (every 5 mins during distribution)
    cron.schedule('*/5 7-12 * * 1-5', async () => {
        try {
            const statusData = await fs.readFile(path.join(__dirname, 'config', 'bot_status.json'), 'utf8');
            const status = JSON.parse(statusData);

            if (status.isPaused) {
                log.info("[STAGE3] Konfirmasi entri dilewati karena bot dalam mode jeda.");
                return;
            }

            log.info("[STAGE3] --- Menjalankan Konfirmasi Entri ---");
            await analysisHandler.runStage3Analysis(SUPPORTED_PAIRS);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await analysisHandler.runStage3Analysis(SUPPORTED_PAIRS);
            } else {
                log.error("[STAGE3] Error saat konfirmasi entri:", error);
            }
        }
    });

    // EOD: Force close all trades (15:00 UTC / 22:00 WIB)
    cron.schedule('0 15 * * 1-5', async () => {
        try {
            log.info("[EOD] --- Menutup Semua Posisi Akhir Hari ---");
            await monitoringHandler.forceCloseAllTrades();
        } catch (error) {
            log.error("[EOD] Error saat penutupan akhir hari:", error);
        }
    });

} // PERBAIKAN: Kurung kurawal penutup untuk fungsi main()

// Panggil fungsi main untuk memulai bot
main().catch(error => {
    log.error('Gagal total saat memulai bot:', error);
    process.exit(1);
});
