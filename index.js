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

// Impor restart handler untuk Pterodactyl
const RestartHandler = require('./scripts/restart-handler');

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
                case '/ictmenu':
                case '/icthelp':
                    await commandHandler.handleMenuCommand(whatsappSocket, chatId, SUPPORTED_PAIRS);
                    break;
                case '/ictstatus':
                    await commandHandler.handleContextStatusCommand(whatsappSocket, chatId);
                    break;
                case '/ictentry':
                    await commandHandler.handleEntryCommand(text, chatId, whatsappSocket);
                    break;
                case '/ictclose':
                    await commandHandler.handleCloseCommand(text, chatId, whatsappSocket);
                    break;
                case '/ictsettings':
                case '/ictsetting':
                    await commandHandler.handleSettingsCommand(text, global.botSettings, chatId, whatsappSocket);
                    break;
                case '/ictadd':
                    await commandHandler.handleAddRecipient(text, chatId, whatsappSocket);
                    break;
                case '/ictdel':
                    await commandHandler.handleDelRecipient(text, chatId, whatsappSocket);
                    break;
                case '/ictlist':
                    await commandHandler.handleListRecipients(chatId, whatsappSocket);
                    break;
                case '/ictpause':
                    await commandHandler.handlePauseCommand(whatsappSocket, chatId);
                    break;
                case '/ictresume':
                    await commandHandler.handleResumeCommand(whatsappSocket, chatId);
                    break;
                case '/ictprofit':
                    await commandHandler.handleProfitTodayCommand(whatsappSocket, chatId);
                    break;
                case '/ictnews':
                    await commandHandler.handleNewsCommand(whatsappSocket, chatId);
                    break;
                // === COMMAND INTERAKTIF BARU ===
                case '/stage1':
                case '/ictstage1':
                    await commandHandler.handleStage1Command(whatsappSocket, chatId, text);
                    break;
                case '/stage2':
                case '/ictstage2':
                    await commandHandler.handleStage2Command(whatsappSocket, chatId, text);
                    break;
                case '/stage3':
                case '/ictstage3':
                    await commandHandler.handleStage3Command(whatsappSocket, chatId, text);
                    break;
                case '/holdeod':
                    await commandHandler.handleHoldEodCommand(whatsappSocket, chatId);
                    break;
                case '/fullcycle':
                    await commandHandler.handleFullCycleCommand(whatsappSocket, chatId);
                    break;
                case '/ictanalyze':
                    await commandHandler.handleAnalyzePairCommand(text, whatsappSocket, chatId);
                    break;
                case '/ictpositions':
                    await commandHandler.handlePositionsCommand(whatsappSocket, chatId);
                    break;
                case '/ictpending':
                    await commandHandler.handlePendingCommand(whatsappSocket, chatId);
                    break;
                case '/icthealth':
                    await commandHandler.handleHealthCommand(whatsappSocket, chatId);
                    break;
                case '/ictcache':
                    await commandHandler.handleClearCacheCommand(whatsappSocket, chatId);
                    break;
                case '/ictrestart':
                    await commandHandler.handleRestartCommand(whatsappSocket, chatId);
                    break;
                case '/ictcontext':
                    await commandHandler.handleContextCommand(text, whatsappSocket, chatId);
                    break;
                case '/ictreset':
                    await commandHandler.handleResetContextCommand(text, whatsappSocket, chatId);
                    break;
                case '/icteod':
                    await commandHandler.handleForceEodCommand(whatsappSocket, chatId);
                    break;
                // === NEW FEATURES v3.2.0 ===
                case '/ask':
                    await commandHandler.handleAskCommand(text, whatsappSocket, chatId);
                    break;
                case '/ictdash':
                    await commandHandler.handleDashboardCommand(whatsappSocket, chatId);
                    break;
                case '/ictschedule':
                    await commandHandler.handleScheduleCommand(whatsappSocket, chatId);
                    break;
                case '/ictanalytics':
                    await commandHandler.handleAnalyticsCommand(whatsappSocket, chatId);
                    break;
                case '/ictcachemanage':
                    await commandHandler.handleCacheManagementCommand(whatsappSocket, chatId);
                    break;
                case '/clearcache':
                    await commandHandler.handleClearCacheCommand(whatsappSocket, chatId);
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

    // --- Jadwal PO3 Multi-Tahap (Updated Schedule) ---
    // Konfigurasi fleksibel dari environment variables
    const STAGE3_INTERVAL = process.env.STAGE3_INTERVAL_MINUTES || 30;
    const STAGE3_START_HOUR = process.env.STAGE3_START_HOUR || 7;
    const STAGE3_END_HOUR = process.env.STAGE3_END_HOUR || 12;
    
    log.info(`[INIT] 📅 Konfigurasi jadwal PO3: Stage3 interval=${STAGE3_INTERVAL}min, waktu=${STAGE3_START_HOUR}:00-${STAGE3_END_HOUR}:00 UTC`);

    // Stage 1: Daily Bias Analysis (05:00 UTC = 12:00 WIB)
    cron.schedule('0 5 * * 1-5', async () => {
        try {
            const statusData = await fs.readFile(path.join(__dirname, 'config', 'bot_status.json'), 'utf8');
            const status = JSON.parse(statusData);

            if (status.isPaused) {
                log.info("[STAGE1] Analisis bias harian dilewati - bot dalam mode jeda");
                return;
            }

            log.info("[STAGE1] 🌅 Memulai Analisis Akumulasi (05:00 UTC / 12:00 WIB)");
            await analysisHandler.runStage1Analysis(SUPPORTED_PAIRS);
            log.info("[STAGE1] ✅ Analisis bias harian selesai");
        } catch (error) {
            if (error.code === 'ENOENT') {
                log.info("[STAGE1] Status file tidak ditemukan, menjalankan analisis...");
                await analysisHandler.runStage1Analysis(SUPPORTED_PAIRS);
            } else {
                log.error("[STAGE1] ❌ Error analisis akumulasi:", {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
    });

    // Stage 2: Manipulation Detection - Early London (06:30 UTC = 13:30 WIB)
    cron.schedule('30 6 * * 1-5', async () => {
        try {
            const statusData = await fs.readFile(path.join(__dirname, 'config', 'bot_status.json'), 'utf8');
            const status = JSON.parse(statusData);

            if (status.isPaused) {
                log.info("[STAGE2-1] Deteksi manipulasi awal dilewati - bot dalam mode jeda");
                return;
            }

            log.info("[STAGE2-1] ⚡ Memulai Deteksi Manipulasi Awal (06:30 UTC / 13:30 WIB)");
            await analysisHandler.runStage2Analysis(SUPPORTED_PAIRS);
            log.info("[STAGE2-1] ✅ Deteksi manipulasi awal selesai");
        } catch (error) {
            if (error.code === 'ENOENT') {
                await analysisHandler.runStage2Analysis(SUPPORTED_PAIRS);
            } else {
                log.error("[STAGE2-1] ❌ Error deteksi manipulasi awal:", {
                    error: error.message,
                    stage: "Early London",
                    timestamp: new Date().toISOString()
                });
            }
        }
    });

    // Stage 2: Manipulation Detection - Late London (09:00 UTC = 16:00 WIB)
    cron.schedule('0 9 * * 1-5', async () => {
        try {
            const statusData = await fs.readFile(path.join(__dirname, 'config', 'bot_status.json'), 'utf8');
            const status = JSON.parse(statusData);

            if (status.isPaused) {
                log.info("[STAGE2-2] Deteksi manipulasi akhir dilewati - bot dalam mode jeda");
                return;
            }

            log.info("[STAGE2-2] ⚡ Memulai Deteksi Manipulasi Akhir (09:00 UTC / 16:00 WIB)");
            await analysisHandler.runStage2Analysis(SUPPORTED_PAIRS);
            log.info("[STAGE2-2] ✅ Deteksi manipulasi akhir selesai");
        } catch (error) {
            if (error.code === 'ENOENT') {
                await analysisHandler.runStage2Analysis(SUPPORTED_PAIRS);
            } else {
                log.error("[STAGE2-2] ❌ Error deteksi manipulasi akhir:", {
                    error: error.message,
                    stage: "Late London",
                    timestamp: new Date().toISOString()
                });
            }
        }
    });

    // Stage 3: Entry Confirmation (Configurable via ENV - Default: 07:00-12:00 UTC setiap 30 menit)
    cron.schedule(`*/${STAGE3_INTERVAL} ${STAGE3_START_HOUR}-${STAGE3_END_HOUR} * * 1-5`, async () => {
        try {
            const statusData = await fs.readFile(path.join(__dirname, 'config', 'bot_status.json'), 'utf8');
            const status = JSON.parse(statusData);

            if (status.isPaused) {
                log.info(`[STAGE3] Konfirmasi entri dilewati - bot dalam mode jeda`);
                return;
            }

            const now = new Date();
            const utcTime = `${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}`;
            const wibHour = (now.getUTCHours() + 7) % 24;
            const wibTime = `${wibHour.toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}`;
            
            log.info(`[STAGE3] 🚀 Memulai Konfirmasi Entri (${utcTime} UTC / ${wibTime} WIB - Interval: ${STAGE3_INTERVAL} menit)`);
            await analysisHandler.runStage3Analysis(SUPPORTED_PAIRS);
            log.info(`[STAGE3] ✅ Konfirmasi entri selesai`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await analysisHandler.runStage3Analysis(SUPPORTED_PAIRS);
            } else {
                log.error("[STAGE3] ❌ Error konfirmasi entri:", {
                    error: error.message,
                    interval: `${STAGE3_INTERVAL} minutes`,
                    timeRange: `${STAGE3_START_HOUR}:00-${STAGE3_END_HOUR}:00 UTC`,
                    timestamp: new Date().toISOString()
                });
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

// Fungsi untuk menjalankan bot dengan restart protection
async function startBot() {
    try {
        log.info('🔧 Initializing Pterodactyl restart protection...');
        
        // Initialize restart handler
        const restartHandler = new RestartHandler();
        await restartHandler.initialize();
        
        log.info('🚀 Starting main bot application...');
        await main();
        
    } catch (error) {
        log.error('❌ Critical startup error:', error);
        process.exit(1);
    }
}

// Panggil fungsi startBot untuk memulai bot dengan protection
startBot();
