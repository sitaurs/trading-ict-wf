const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const { getLogger } = require('./logger');
const log = getLogger('WhatsApp');

// Path untuk menyimpan file sesi. Penting agar tidak perlu login berulang kali.
const SESSION_DIR = path.join(__dirname, '..', 'whatsapp-session');

// Memastikan direktori sesi ada
if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR);
}

/**
 * Fungsi utama untuk memulai dan mengelola koneksi WhatsApp.
 * @returns {Promise<object>} Instance socket Baileys yang aktif.
 */
async function startWhatsAppClient(onSocketUpdate) {
    log.info('🚀 Memulai WhatsApp client', { 
        sessionDir: SESSION_DIR,
        timestamp: new Date().toISOString()
    });
    
    // Menggunakan MultiFileAuthState untuk menyimpan kredensial login
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    log.info(`📱 Menggunakan Baileys v${version.join('.')}, Versi Terbaru: ${isLatest}`, { 
        version: version.join('.'), 
        isLatest,
        timestamp: new Date().toISOString()
    });

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true, // Otomatis mencetak QR code di terminal
        browser: ['Trading', 'Chrome', '1.0.0'], // Nama yang akan muncul di "Perangkat Tertaut"
    });

    log.debug('🔌 Socket WhatsApp dibuat', { 
        socketId: sock.user?.id,
        browser: ['Trading', 'Chrome', '1.0.0'],
        timestamp: new Date().toISOString()
    });

    // Informasikan socket baru ke pemanggil
    if (typeof onSocketUpdate === 'function') {
        log.debug('📢 Menginformasikan socket update ke callback', { 
            hasCallback: true,
            timestamp: new Date().toISOString()
        });
        onSocketUpdate(sock);
    } else {
        log.warn('⚠️ Tidak ada callback untuk socket update', { 
            onSocketUpdate: typeof onSocketUpdate
        });
    }

    // Listener untuk menangani update koneksi (QR code, terhubung, terputus, dll.)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        log.debug('🔄 Connection update received', { 
            connection, 
            hasQr: !!qr, 
            hasDisconnect: !!lastDisconnect,
            timestamp: new Date().toISOString()
        });

        if (connection === 'close') {
            const error = new Boom(lastDisconnect?.error)?.output?.statusCode;

            log.error('❌ Koneksi terputus', { 
                error: lastDisconnect?.error?.message || lastDisconnect?.error, 
                statusCode: error,
                stack: lastDisconnect?.error?.stack,
                disconnectReason: lastDisconnect?.error?.output?.payload?.error,
                timestamp: new Date().toISOString()
            });

            // Jika error bukan karena logout manual, maka coba sambungkan kembali.
            if (error !== DisconnectReason.loggedOut) {
                log.info('Mencoba menyambungkan kembali...');
                setTimeout(async () => {
                    const newSock = await startWhatsAppClient(onSocketUpdate);
                    if (typeof onSocketUpdate === 'function') {
                        onSocketUpdate(newSock);
                    }
                }, 1000);
            } else {
                log.info('Koneksi ditutup permanen (Logged Out). Hapus folder "whatsapp-session" untuk memulai sesi baru.');
            }
        } else if (connection === 'open') {
            log.info('✅ Koneksi WhatsApp berhasil! Bot siap menerima perintah.');
            if (typeof onSocketUpdate === 'function') {
                onSocketUpdate(sock);
            }
        }

        // Jika ada QR code baru, tampilkan di terminal (sudah di-handle oleh printQRInTerminal=true)
        // Log ini sebagai cadangan jika ada masalah.
    if (qr) {
        log.info('Pindai QR Code ini dengan aplikasi WhatsApp di ponsel Anda.');
        const qrcode = require('qrcode-terminal'); // Panggil librarynya di sini
        qrcode.generate(qr, { small: true });   // <--- TAMBAHKAN BARIS INI untuk mencetak QR
    }
});
    // Listener untuk menyimpan kredensial setiap kali ada pembaruan
    sock.ev.on('creds.update', saveCreds);

    return sock;
}

module.exports = { startWhatsAppClient };
