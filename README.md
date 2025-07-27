# 🤖 Trading AI Bot - ICT Power of Three (PO3) Strategy

**Trading AI Bot v2.1.0** adalah sistem otomatis berbasis Node.js yang mengimplementasikan strategi ICT Power of Three (PO3) dengan analisis menggunakan Google Gemini AI, pengiriman notifikasi melalui WhatsApp, serta eksekusi trading melalui API broker kustom.

## 📋 Daftar Isi

1. [Fitur Utama](#-fitur-utama)
2. [Struktur Direktori](#-struktur-direktori)
3. [Alur Kerja ICT Power of Three](#-alur-kerja-ict-power-of-three-po3)
4. [Dokumentasi File-File Utama](#-dokumentasi-file-file-utama)
5. [Prompt Templates](#-prompt-templates)
6. [Konfigurasi & Setup](#-konfigurasi--setup)
7. [Panduan Instalasi](#-panduan-instalasi)
8. [Perintah WhatsApp](#-perintah-whatsapp)
9. [Bug Fixes & Improvements](#-bug-fixes--improvements)
10. [Testing](#-testing)
11. [Troubleshooting](#-troubleshooting)

## 🚀 Fitur Utama

- **Strategi ICT Power of Three (PO3)** dengan 4 tahap analisis stateful
- **AI Workflow Dual-Model**: Gemini Pro untuk analisis naratif + Gemini Flash untuk ekstraksi data
- **State Management**: Sistem context harian per pair dengan locking mechanism
- **Pengambilan gambar chart** dari Chart-Img API dengan multiple timeframes
- **Integrasi WhatsApp** untuk notifikasi dan kontrol manual
- **Monitoring otomatis** posisi aktif dengan evaluasi berkala
- **Pencatatan hasil trading** ke Google Sheets otomatis
- **Circuit Breaker** untuk melindungi dari kerugian beruntun
- **Penutupan paksa posisi** di akhir hari (EOD - End of Day)
- **Multi-timeframe analysis** H4, H1, M15 dengan indikator teknis

## 📁 Struktur Direktori

```
BOT-V9/
├── index.js                          # Titik masuk utama dengan cron scheduler
├── package.json                      # Dependencies dan scripts
├── README.md                         # Dokumentasi lengkap (file ini)
├── .env.example                      # Template environment variables
├── config/                           # File konfigurasi
│   ├── api_key_status.json          # Status Chart API key rotation
│   ├── bot_status.json              # Status pause/resume bot
│   ├── google-credentials.json      # Kredensial Google Sheets
│   └── recipients.json              # Daftar penerima WhatsApp
├── daily_context/                    # File JSON status harian per pair
│   └── PAIR.json                    # Konteks harian (dibuat otomatis)
├── modules/                          # Modul-modul utama
│   ├── analysisHandler.js           # Handler analisis PO3 4 tahap
│   ├── brokerHandler.js             # Integrasi API broker MT5
│   ├── circuitBreaker.js            # Proteksi kerugian beruntun
│   ├── commandHandler.js            # Handler perintah WhatsApp
│   ├── contextManager.js            # Manajemen state harian
│   ├── journalingHandler.js         # Pencatatan ke Google Sheets
│   ├── logger.js                    # Sistem logging dengan chalk
│   ├── monitoringHandler.js         # Monitoring posisi aktif
│   ├── whatsappClient.js            # Client WhatsApp dengan Baileys
│   └── analysis/                    # Sub-modul analisis
│       ├── decisionHandlers.js      # Handler keputusan trading
│       ├── extractor.js             # Ekstraksi data dari AI
│       ├── extractorStage1.js       # Ekstraksi data Stage 1
│       ├── extractorStage2.js       # Ekstraksi data Stage 2
│       ├── helpers.js               # Utilitas analisis
│       └── promptBuilders.js        # Builder prompt dari template
├── prompts/                          # Template prompt untuk AI
│   ├── prompt_stage1_bias.txt       # Template analisis bias harian
│   ├── prompt_stage1_extractor.txt  # Template ekstraksi Stage 1
│   ├── prompt_stage2_manipulation.txt # Template deteksi manipulasi
│   ├── prompt_stage2_extractor.txt  # Template ekstraksi Stage 2
│   ├── prompt_stage3_entry.txt      # Template konfirmasi entri
│   ├── prompt_hold_close.txt        # Template hold/close analysis
│   └── prompt_extractor.txt         # Template ekstraksi umum
├── src/utils/                        # Utilitas tambahan
│   └── aggregate.js                 # Aggregasi data M1 ke M5
├── tests/                            # Test suite
│   ├── contextManager.test.js       # Test context manager
│   ├── cronSchedule.test.js         # Test jadwal cron
│   └── aggregate.test.js            # Test aggregasi data
├── pending_orders/                   # Direktori pending orders (dibuat otomatis)
├── live_positions/                   # Direktori posisi aktif (dibuat otomatis)
├── journal_data/                     # Direktori data jurnal (dibuat otomatis)
├── analysis_cache/                   # Cache analisis (dibuat otomatis)
└── whatsapp-session/                 # Session WhatsApp (dibuat otomatis)
```

## 🔄 Alur Kerja ICT Power of Three (PO3)

Bot beroperasi dengan jadwal yang dioptimalkan untuk mengikuti sesi pasar forex dan pola ICT:

### **🌅 Stage 1: Accumulation/Bias (05:00 UTC)**
**Tujuan**: Menentukan bias harian berdasarkan range sesi Asia
- **Waktu**: `05:00 UTC` (12:00 WIB) setiap hari kerja - **1x per hari**
- **Analisis**: Chart H4, H1, M15 dengan EMA(50) + RSI(14) + Bollinger Bands
- **Output**: 
  - Daily Bias (BULLISH/BEARISH)
  - Asia High/Low range (00:00-04:00 UTC)
  - HTF Zone Target untuk entry
- **Status Context**: `PENDING_BIAS` → `PENDING_MANIPULATION`

### **⚡ Stage 2: Manipulation Detection (2x Execution)**
**Tujuan**: Deteksi liquidity sweep (Judas Swing) pada London killzone

**Early London (06:30 UTC / 13:30 WIB)**
- Mendeteksi manipulasi awal setelah London open
- Focus pada liquidity sweep di awal killzone

**Late London (09:00 UTC / 16:00 WIB)**  
- Mendeteksi manipulasi akhir sebelum NY overlap
- Backup detection dan konfirmasi Judas Swing pattern

**Output**:
- Manipulasi terdeteksi (TRUE/FALSE)
- Sisi manipulasi (ABOVE_ASIA_HIGH/BELOW_ASIA_LOW)  
- Reaksi di zona HTF (TRUE/FALSE)
- **Status Context**: `PENDING_MANIPULATION` → `PENDING_ENTRY`

### **🚀 Stage 3: Distribution/Entry (Configurable via .env)**
**Tujuan**: Konfirmasi entri berdasarkan Market Structure Shift (MSS) dan Fair Value Gap (FVG)
- **Waktu**: `07:00-12:00 UTC` (14:00-19:00 WIB) 
- **Interval**: **Configurable** via `.env` (default: 30 menit)
- **Frequency**: 11x per hari (dengan interval 30 menit default)
- **Analisis**: Mencari MSS confirmation dan clean FVG untuk entry
- **Output**: 
  - Sinyal trading dengan entry, SL, TP berdasarkan RRR minimum
  - Atau NO_TRADE jika tidak ada setup valid
- **Status Context**: `PENDING_ENTRY` → `COMPLETE_*`

**Konfigurasi Stage 3 (.env)**:
```env
STAGE3_START_HOUR=7         # Start hour UTC (14:00 WIB)
STAGE3_END_HOUR=12          # End hour UTC (19:00 WIB)  
STAGE3_INTERVAL_MINUTES=30  # Interval: 15, 30, atau 60 menit
```

### **👁️ Stage 4: Hold/Close Analysis (Real-time monitoring)**
**Tujuan**: Evaluasi posisi aktif untuk hold atau close manual
- **Waktu**: Setiap 30 menit (configurable) untuk posisi aktif
- **Analisis**: Evaluasi profit protection dan risk management
- **Output**: HOLD (continue) atau CLOSE_MANUAL (exit early)

### **🔚 EOD: End of Day Force Close (15:00 UTC)**
**Tujuan**: Paksa tutup semua posisi di akhir hari (risk management)
- **Waktu**: `15:00 UTC` (22:00 WIB) setiap hari kerja
- **Aksi**: 
  - Tutup semua pending orders
  - Tutup semua live positions
  - Generate daily report

## ⏰ **Timeline Harian (WIB)**

```
12:00 WIB │ Stage 1: Bias Analysis (1x)
          │ ├─ Analisis range Asia & bias harian
          │ └─ Set context: PENDING_MANIPULATION
          │
13:30 WIB │ Stage 2-1: Early London Manipulation (1x)
          │ ├─ Deteksi manipulasi awal London
          │ └─ Set context: PENDING_ENTRY (jika terdeteksi)
          │
14:00-19:00 │ Stage 3: Entry Confirmation
WIB       │ ├─ Default: Setiap 30 menit (configurable)
          │ ├─ Konfirmasi MSS & FVG
          │ └─ Execute trade jika setup valid
          │
16:00 WIB │ Stage 2-2: Late London Manipulation (1x)
          │ ├─ Deteksi manipulasi akhir London
          │ └─ Backup detection untuk coverage optimal
          │
00:00-23:59 │ Stage 4: Monitoring (setiap 30 menit)
WIB       │ ├─ Untuk posisi aktif saja
          │ └─ Hold/Close analysis
          │
22:00 WIB │ EOD: Force Close All Positions (1x)
          │ └─ Tutup paksa semua trade + daily report
```

## 📄 Dokumentasi File-File Utama

### **1. index.js** - Entry Point Utama
**Fungsi**: Titik masuk aplikasi dengan cron scheduler dan WhatsApp listener

**Variabel Utama**:
- `SUPPORTED_PAIRS`: Array pair yang didukung dari env
- `whatsappSocket`: Instance socket WhatsApp
- `global.botSettings`: Pengaturan bot dan recipients
- `global.broadcastMessage`: Fungsi broadcast ke semua recipients

**Fungsi Utama**:
- `loadRecipients()`: Memuat daftar penerima WhatsApp
- `readJsonFile(filePath)`: Membaca file JSON dengan error handling
- `writeJsonFile(filePath, data)`: Menulis file JSON dengan directory creation
- `main()`: Fungsi utama yang menginisialisasi semua komponen

**Cron Schedules (Updated)**:
- `0 5 * * 1-5`: Stage 1 Bias Analysis (05:00 UTC / 12:00 WIB)
- `30 6 * * 1-5`: Stage 2-1 Early London Manipulation (06:30 UTC / 13:30 WIB)
- `0 9 * * 1-5`: Stage 2-2 Late London Manipulation (09:00 UTC / 16:00 WIB)  
- `*/${STAGE3_INTERVAL} ${STAGE3_START_HOUR}-${STAGE3_END_HOUR} * * 1-5`: Stage 3 Entry Confirmation (Configurable)
- `*/30 * * * 1-5`: Position Monitoring (setiap 30 menit)
- `0 15 * * 1-5`: EOD Force Close (15:00 UTC / 22:00 WIB)

### **2. modules/analysisHandler.js** - Handler Analisis PO3
**Fungsi**: Mengelola 4 tahap analisis PO3 dengan AI workflow

**Fungsi Utama**:
- `callGeminiPro(prompt, chartImages)`: Memanggil Gemini Pro untuk analisis naratif
  - **Input**: Prompt text dan array chart images base64
  - **Output**: Narrative analysis text
  - **Config**: Temperature 0.3, maxOutputTokens 2000

- `runStage1Analysis(pairs)`: Stage 1 - Analisis Bias Harian
  - **Flow**: Ambil chart → Build prompt → Call AI → Extract data → Update context
  - **Context Update**: `daily_bias`, `asia_high`, `asia_low`, `htf_zone_target`
  - **Status**: `PENDING_BIAS` → `PENDING_MANIPULATION`

- `runStage2Analysis(pairs)`: Stage 2 - Deteksi Manipulasi London
  - **Flow**: Check context → Build prompt → Call AI → Extract data → Update context
  - **Context Update**: `manipulation_detected`, `manipulation_side`, `htf_reaction`
  - **Status**: `PENDING_MANIPULATION` → `PENDING_ENTRY`

- `runStage3Analysis(pairs)`: Stage 3 - Konfirmasi Entri
  - **Flow**: Check context → Build prompt → Call AI → Extract decision → Execute trade
  - **Decision Types**: OPEN, NO_TRADE
  - **Status**: `PENDING_ENTRY` → `COMPLETE_*`

- `runHoldCloseAnalysis(pair)`: Hold/Close Analysis
  - **Flow**: Get live positions → Build prompt → Call AI → Extract decision → Execute close
  - **Decision Types**: HOLD, CLOSE_MANUAL

### **3. modules/contextManager.js** - Manajemen State Harian
**Fungsi**: Mengelola state harian per pair dengan auto-reset

**Fungsi Utama**:
- `getContext(pair)`: Mengambil atau membuat context baru
  - **Auto-reset**: Context direset jika tanggal berbeda
  - **File**: `daily_context/{PAIR}.json`

- `saveContext(context)`: Menyimpan context dengan atomic write
- `getNewContext(pair)`: Template context baru dengan default values

**Structure Context**:
```json
{
  "date": "2025-07-24",
  "pair": "USDJPY", 
  "status": "PENDING_BIAS",
  "lock": false,
  "daily_bias": null,
  "asia_high": null,
  "asia_low": null,
  "htf_zone_target": null,
  "manipulation_detected": false,
  "manipulation_side": null,
  "htf_reaction": false,
  "entry_price": null,
  "stop_loss": null,
  "take_profit": null,
  "trade_status": "NONE",
  "result": null,
  "error_log": null
}
```

**Status Flow**: `PENDING_BIAS` → `PENDING_MANIPULATION` → `PENDING_ENTRY` → `COMPLETE_*`

### **4. modules/analysis/promptBuilders.js** - Builder Prompt Templates
**Fungsi**: Membaca template prompt dan mengisi placeholder

**Fungsi Utama**:
- `getPrompt(filename)`: Membaca file prompt dari folder `prompts/`
- `prepareStage1Prompt(pair, ohlcvData)`: Build prompt Stage 1
  - **Placeholders**: `{PAIR}`, `{ASIA_SESSION_START}`, `{ASIA_SESSION_END}`, `{OHLCV}`
- `prepareStage2Prompt(pair, context, ohlcvData)`: Build prompt Stage 2  
  - **Placeholders**: `{PAIR}`, `{BIAS}`, `{ASIA_HIGH}`, `{ASIA_LOW}`, `{HTF_ZONE_TARGET}`, `{LONDON_KILLZONE_START}`, `{LONDON_KILLZONE_END}`, `{OHLCV}`
- `prepareStage3Prompt(pair, context, ohlcvData)`: Build prompt Stage 3
  - **Placeholders**: `{PAIR}`, `{BIAS}`, `{MANIPULATION}`, `{SIDE}`, `{HTF_REACTION}`, `{MIN_RRR}`, `{OHLCV}`
- `prepareHoldClosePrompt(pair, ohlcvData, tradeDetails, currentPrice)`: Build prompt Hold/Close
  - **Placeholders**: `{PAIR}`, `{TRADE_DETAILS}`, `{CURRENT_PRICE}`, `{OHLCV}`

**Helper Functions**:
- `getChartImages(pair, timeframes)`: Ambil chart images dari Chart-Img API
- `fetchOhlcv(pair)`: Ambil data OHLCV dari API

### **5. modules/analysis/extractorStage1.js & extractorStage2.js** - Data Extractors
**Fungsi**: Ekstraksi data terstruktur dari narrative AI menggunakan Gemini Flash

**extractorStage1.js**:
- **Input**: Narrative text dari Stage 1 analysis
- **Output**: `{ bias, asia_high, asia_low, htf_zone_target }`
- **Format**: KEY: VALUE parsing

**extractorStage2.js**:
- **Input**: Narrative text dari Stage 2 analysis  
- **Output**: `{ manipulation_detected, manipulation_side, htf_reaction }`
- **Format**: KEY: VALUE parsing

**Configuration**:
- **Model**: `gemini-2.0-flash-exp`
- **Temperature**: 0.1 (consistency)
- **MaxOutputTokens**: 150-200 (ekstraksi singkat)

### **6. modules/analysis/decisionHandlers.js** - Handler Keputusan Trading
**Fungsi**: Mengeksekusi keputusan trading berdasarkan hasil analisis

**Fungsi Utama**:
- `handleOpenDecision(extractedData, narrativeAnalysisResult, whatsappSocket, recipientIds)`: 
  - **Flow**: Build order payload → Execute via broker → Save order data → Send notification
  - **Data**: `{ pair, arah, harga, sl, tp }` dari extracted data

- `handleCloseDecision(extractedData, activeTrade, whatsappSocket, recipientIds)`:
  - **Flow**: Get active trade → Close position via broker → Record to journal → Send notification
  - **Fallback**: Try cancel pending order first, then close live position

- `handleNoTradeDecision(extractedData, whatsappSocket, recipientIds)`:
  - **Flow**: Log reason → Send notification
  
- `saveOrderData(orderData, initialAnalysisText, meta)`:
  - **Flow**: Save to pending_orders/ or live_positions/ → Save analysis to journal_data/

### **7. modules/brokerHandler.js** - Integrasi API Broker MT5
**Fungsi**: Interface dengan custom MT5 API broker

**Konfigurasi**:
- **Base URL**: `process.env.BROKER_API_BASE_URL`
- **API Key**: `process.env.BROKER_API_KEY`
- **Axios Instance**: Dengan headers dan timeout default

**Fungsi Utama**:
- `openOrder(orderData)`: Membuka posisi atau pending order
  - **Input**: `{ symbol, type, price, sl, tp, volume, comment }`
  - **Output**: `{ order/deal/ticket, ... }`

- `getActivePositions()`: Mengambil semua posisi aktif
- `closePosition(ticket)`: Menutup posisi berdasarkan ticket
- `cancelPendingOrder(ticket)`: Membatalkan pending order
- `getClosingDealInfo(positionId)`: Mengambil detail deal penutupan
- `getTodaysProfit()`: Mengambil profit hari ini
- `modifyPosition(ticket, newSL, newTP)`: Modifikasi SL/TP

**Error Handling**: Comprehensive validation dan logging

### **8. modules/monitoringHandler.js** - Monitoring Posisi Aktif
**Fungsi**: Memantau posisi aktif dan transisi pending→live

**Variabel Global**:
- `isEvaluating`: Flag untuk mencegah concurrent evaluation
- `isClosing`: Flag untuk mencegah concurrent EOD closing

**Fungsi Utama**:
- `evaluateActiveTrades()`: Evaluasi semua posisi aktif untuk hold/close
  - **Flow**: Get live positions → Run hold/close analysis → Execute decision
  - **Interval**: Setiap 30 menit (configurable)

- `checkAllTrades()`: Monitor pending orders yang berubah jadi live
  - **Flow**: Check all pending orders → Verify with broker → Move to live_positions/

- `forceCloseAllTrades()`: Paksa tutup semua posisi di EOD
  - **Flow**: Get all positions → Close one by one → Record to journal → Clean up files

### **9. modules/commandHandler.js** - Handler Perintah WhatsApp
**Fungsi**: Menangani semua perintah manual dari user via WhatsApp

**Fungsi Command Utama**:
- `handleMenuCommand()`: Menampilkan menu bantuan lengkap dengan 25+ perintah
- `handleConsolidatedStatusCommand()`: Status lengkap bot dan posisi
- `handleCloseCommand(text)`: Menutup trade manual (`/cls PAIR`)
- `handlePauseCommand()`: Pause bot (`/pause`)
- `handleResumeCommand()`: Resume bot (`/resume`)
- `handleProfitTodayCommand()`: Laporan profit hari ini

**Fungsi Interactive Baru**:
- `handleStage1Command()`: Force analisis bias harian (Stage 1)
- `handleStage2Command()`: Force deteksi manipulasi (Stage 2)  
- `handleStage3Command()`: Force konfirmasi entri (Stage 3)
- `handleHoldEodCommand()`: Force analisis hold/close semua posisi
- `handleFullCycleCommand()`: Jalankan semua stage PO3 berurutan
- `handleAnalyzePairCommand(text)`: Analisis lengkap pair spesifik
- `handlePositionsCommand()`: Tampilkan semua posisi aktif
- `handlePendingCommand()`: Tampilkan semua pending orders
- `handleHealthCommand()`: System health check komprehensif
- `handleClearCacheCommand()`: Bersihkan cache analisis
- `handleRestartCommand()`: Restart sistem bot

**Fungsi Notifikasi**:
- `handleAddRecipient(command)`: Tambah recipient (`/add_recipient ID`)
- `handleDelRecipient(command)`: Hapus recipient (`/del_recipient ID`)
- `handleListRecipients()`: List semua recipients

**Fungsi Context & Maintenance**:
- `handleContextCommand(text)`: Lihat konteks harian pair (`/context PAIR`)
- `handleResetContextCommand(text)`: Reset konteks pair (`/resetcontext PAIR`)
- `handleForceEodCommand()`: Force EOD close semua posisi

**Helper Functions**:
- `readJsonFile(filePath)`: Baca JSON dengan ENOENT handling
- `writeJsonFile(filePath, data)`: Tulis JSON dengan directory creation
- `updateBotStatus(patch)`: Update status bot (pause/resume)

**Enhanced Logging**: Semua command menggunakan structured logging dengan context data, error details, API responses, dan stack traces untuk debugging yang komprehensif.

### **10. modules/journalingHandler.js** - Pencatatan ke Google Sheets
**Fungsi**: Mencatat hasil trading ke Google Sheets dan cleanup files

**Konfigurasi**:
- **Sheet ID**: `process.env.GOOGLE_SHEET_ID`
- **Credentials**: `config/google-credentials.json`
- **Libraries**: google-spreadsheet, google-auth-library

**Fungsi Utama**:
- `recordTrade(closedTradeData, closeReason, finalBrokerData)`:
  - **Flow**: Parse trade data → Get profit info → Write to Google Sheets → Update circuit breaker → Cleanup files
  - **Data**: Ticket, symbol, type, open/close time, profit/loss, reason
  - **Circuit Breaker**: Auto-record win/loss untuk proteksi

**Data Flow**: Closed trade → Extract profit → Record to Sheets → Clean up local files

### **11. modules/circuitBreaker.js** - Proteksi Kerugian Beruntun
**Fungsi**: Melindungi akun dari kerugian beruntun dengan auto-pause

**Konfigurasi**:
- **File**: `config/circuit_breaker_stats.json`
- **Max Losses**: 3 consecutive losses (configurable)
- **Reset**: Harian otomatis

**Fungsi Utama**:
- `recordLoss()`: Catat kerugian dan increment counter
- `recordWin()`: Catat keuntungan dan reset counter
- `isTripped()`: Check apakah circuit breaker aktif
- **Logic**: Jika ≥ 3 kerugian beruntun, bot auto-pause sampai reset harian

### **12. modules/analysis/helpers.js** - Utilitas Analisis
**Fungsi**: Berbagai helper functions untuk analisis

**Constants**:
- `PENDING_DIR`, `POSITIONS_DIR`, `JOURNAL_DIR`, `CACHE_DIR`: Path direktori
- `API_KEY_STATUS_PATH`: Path untuk status API key rotation

**Fungsi Utama**:
- `getPrompt(name)`: Baca file prompt dari folder prompts/
- `fetchOhlcv(symbol, timeframe, count)`: Ambil data OHLCV dari API
- `getChartImages(symbol)`: Ambil multiple chart images dengan konfigurasi standar
  - **Timeframes**: H4, H1, M15
  - **Indicators**: EMA(50), RSI(14), Bollinger Bands
  - **API**: Chart-Img API dengan key rotation

- `fetchCurrentPrice(pair)`: Ambil harga current dari tick API
- `broadcastMessage(sock, ids, message)`: Kirim pesan ke multiple recipients
- `getEconomicNews()`: Ambil berita ekonomi (placeholder)
- `getCurrentMarketSession()`: Deteksi session market saat ini
- `readJsonFile()`, `writeJsonFile()`: File I/O dengan error handling

**API Key Management**:
- `getAllChartImgKeys()`: Load semua chart API keys dari env
- `getNextChartImgKey()`: Rotate ke API key berikutnya
- `loadLastKeyIndex()`: Load index terakhir dari file status

### **13. modules/whatsappClient.js** - WhatsApp Client
**Fungsi**: Mengelola koneksi WhatsApp menggunakan Baileys

**Dependencies**: @whiskeysockets/baileys, @hapi/boom

**Fungsi Utama**:
- `startWhatsAppClient(onSocketUpdate)`: 
  - **Flow**: Load auth state → Create socket → Handle connection events → Save credentials
  - **Auth**: Multi-file auth state untuk persistence
  - **QR**: Auto-print QR code di terminal
  - **Reconnect**: Auto-reconnect jika tidak logout manual

**Event Handlers**:
- `connection.update`: Handle QR, connected, disconnected states
- `creds.update`: Auto-save credentials untuk session persistence

**Session Management**: File-based session di folder `whatsapp-session/`

### **14. modules/logger.js** - Sistem Logging
**Fungsi**: Logging dengan color coding dan level filtering

**Configuration**:
- **Levels**: ERROR(0), WARN(1), INFO(2), DEBUG(3)
- **Env Control**: `LOG_LEVEL` environment variable
- **Colors**: chalk library untuk color terminal

**Functions**:
- `getLogger(context)`: Buat logger instance dengan context
- **Methods**: `info()`, `warn()`, `error()`, `debug()`
- **Features**: Timestamp Indonesia, colored output, object pretty-print

### **15. src/utils/aggregate.js** - Aggregasi Data
**Fungsi**: Mengkonversi data M1 ke M5 untuk analisis

**Function**:
- `aggregateM1toM5(candles)`:
  - **Input**: Array candle M1 dengan format `{ time, open, high, low, close, tick_volume }`
  - **Output**: Array candle M5 dengan OHLC aggregation
  - **Logic**: Group by 5-minute blocks, aggregate OHLC, sum volume

## 📝 Prompt Templates

### **1. prompt_stage1_bias.txt** - Daily Bias Analysis
**Tujuan**: Template untuk menganalisis bias harian dan menentukan range Asia

**Placeholders**:
- `{PAIR}`: Nama pair trading (contoh: USDJPY)
- `{ASIA_SESSION_START}`: Jam mulai sesi Asia (contoh: 00:00)
- `{ASIA_SESSION_END}`: Jam akhir sesi Asia (contoh: 04:00)  
- `{OHLCV}`: Data OHLCV dalam format JSON

**Expected Output**:
```
BIAS: BULLISH/BEARISH
ASIA_HIGH: [angka harga]
ASIA_LOW: [angka harga]
HTF_ZONE_TARGET: [deskripsi zona target]
```

### **2. prompt_stage1_extractor.txt** - Stage 1 Data Extractor
**Tujuan**: Ekstraksi data terstruktur dari narasi Stage 1

**Placeholders**:
- `{NARRATIVE_TEXT}`: Teks hasil analisis dari Stage 1

**Expected Output**:
```
BIAS: BULLISH
ASIA_HIGH: 150.25
ASIA_LOW: 149.80
HTF_ZONE_TARGET: Weekly resistance at 150.50
```

### **3. prompt_stage2_manipulation.txt** - London Manipulation Detection
**Tujuan**: Template untuk deteksi liquidity sweep sesi London

**Placeholders**:
- `{PAIR}`: Nama pair trading
- `{BIAS}`: Bias harian dari Stage 1 (BULLISH/BEARISH)
- `{ASIA_HIGH}`: Harga tertinggi sesi Asia
- `{ASIA_LOW}`: Harga terendah sesi Asia
- `{HTF_ZONE_TARGET}`: Target zona HTF
- `{LONDON_KILLZONE_START}`: Jam mulai London killzone
- `{LONDON_KILLZONE_END}`: Jam akhir London killzone
- `{OHLCV}`: Data OHLCV dalam format JSON

**Expected Output**:
```
MANIPULATION: TRUE/FALSE
SIDE: ABOVE_ASIA_HIGH/BELOW_ASIA_LOW
HTF_REACTION: TRUE/FALSE
```

### **4. prompt_stage2_extractor.txt** - Stage 2 Data Extractor
**Tujuan**: Ekstraksi data manipulasi dari narasi Stage 2

**Placeholders**:
- `{NARRATIVE_TEXT}`: Teks hasil analisis dari Stage 2

**Expected Output**:
```
MANIPULATION: TRUE
SIDE: ABOVE_ASIA_HIGH
HTF_REACTION: TRUE
```

### **5. prompt_stage3_entry.txt** - Entry Confirmation
**Tujuan**: Template konfirmasi entri berdasarkan MSS dan FVG

**Placeholders**:
- `{PAIR}`: Nama pair trading
- `{BIAS}`: Bias harian (BULLISH/BEARISH)
- `{MANIPULATION}`: Status manipulasi (TRUE/FALSE)
- `{SIDE}`: Sisi manipulasi
- `{HTF_REACTION}`: Reaksi HTF (TRUE/FALSE)
- `{MIN_RRR}`: Minimum Risk Reward Ratio
- `{OHLCV}`: Data OHLCV dalam format JSON

**Expected Output Format**:
```
JIKA ADA SETUP VALID:
SINYAL TRADING DITEMUKAN
Pair: USDJPY
Arah: BUY
Harga Masuk: 150.10
Stop Loss: 149.90
Take Profit: 150.50
RRR: 2.0

JIKA TIDAK ADA SETUP:
TIDAK ADA SINYAL
Pair: USDJPY
Status: NO_TRADE
Alasan: Market structure belum berubah
```

### **6. prompt_hold_close.txt** - Hold/Close Analysis
**Tujuan**: Template evaluasi posisi aktif

**Placeholders**:
- `{PAIR}`: Nama pair trading
- `{TRADE_DETAILS}`: Detail trade aktif dalam format JSON
- `{CURRENT_PRICE}`: Harga saat ini
- `{OHLCV}`: Data OHLCV terbaru dalam format JSON

**Expected Output**:
- `HOLD`: Tahan posisi
- `CLOSE_MANUAL`: Tutup manual sebelum TP/SL

### **7. prompt_extractor.txt** - General Extractor
**Tujuan**: Template ekstraksi umum untuk semua jenis analisis

**Placeholders**:
- `{PAIRS_LIST}`: Daftar pair yang didukung (misal: USDJPY|USDCHF|GBPUSD)
- `{NARRATIVE_TEXT}`: Teks analisis untuk diproses

**Expected Output Format**:
```
keputusan: OPEN/NO_TRADE/CLOSE_MANUAL/HOLD
pair: [Pair dari list]
arah: [ORDER_TYPE_BUY/ORDER_TYPE_SELL/ORDER_TYPE_BUY_LIMIT/dll]
harga: [Entry price jika OPEN]
sl: [Stop loss jika OPEN]
tp: [Take profit jika OPEN]
alasan: [Alasan untuk semua keputusan]
```

## ⚙️ Konfigurasi & Setup

### **Environment Variables (.env)**
```env
# === GEMINI AI CONFIGURATION ===
GEMINI_API_KEY=your_gemini_api_key_here

# === CHART API CONFIGURATION ===
CHART_IMG_KEY_1=your_chart_img_key_1
CHART_IMG_KEY_2=your_chart_img_key_2
CHART_IMG_KEY_3=your_chart_img_key_3

# === BROKER API CONFIGURATION ===
BROKER_API_BASE_URL=https://your-broker-api.com
BROKER_API_KEY=your_broker_api_key

# === GOOGLE SHEETS CONFIGURATION ===
GOOGLE_SHEET_ID=your_google_sheet_id

# === TRADING CONFIGURATION ===
SUPPORTED_PAIRS=USDJPY,USDCHF,GBPUSD,EURUSD
TRADE_VOLUME=0.01
MIN_RRR=1.5

# === PO3 TIMING CONFIGURATION ===
ASIA_SESSION_START=00:00
ASIA_SESSION_END=04:00
LONDON_KILLZONE_START=06:00
LONDON_KILLZONE_END=09:00

# === PO3 STAGE SCHEDULING (NEW - CONFIGURABLE) ===
# Stage 1: Fixed at 05:00 UTC (12:00 WIB)
# Stage 2: Fixed at 06:30 UTC & 09:00 UTC (13:30 WIB & 16:00 WIB)

# Stage 3: Entry Confirmation (Configurable)
STAGE3_START_HOUR=7         # Start hour in UTC (14:00 WIB)
STAGE3_END_HOUR=12          # End hour in UTC (19:00 WIB)
STAGE3_INTERVAL_MINUTES=30  # Interval in minutes (15, 30, 60)

# === MONITORING CONFIGURATION ===
MONITORING_INTERVAL_MINUTES=30
ENABLE_NEWS_SEARCH=true
MAX_RETRIES=3

# === LOGGING CONFIGURATION ===
LOG_LEVEL=INFO
```

### **Stage 3 Configuration Examples**
```env
# Untuk trading agresif (lebih sering cek entry, lebih banyak API calls)
STAGE3_INTERVAL_MINUTES=15  # Cek setiap 15 menit = 25x per hari

# Untuk trading moderate (default - balanced)
STAGE3_INTERVAL_MINUTES=30  # Cek setiap 30 menit = 11x per hari

# Untuk trading konservatif (hemat API calls)
STAGE3_INTERVAL_MINUTES=60  # Cek setiap 60 menit = 6x per hari

# Custom time range (contoh: trading sesi tertentu saja)
STAGE3_START_HOUR=8         # Mulai jam 8 UTC (15:00 WIB)
STAGE3_END_HOUR=11          # Sampai jam 11 UTC (18:00 WIB)
STAGE3_INTERVAL_MINUTES=45  # Setiap 45 menit
```

### **Google Credentials (config/google-credentials.json)**
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
}
```

## � Logging & Error Handling

### **Log Level Configuration**
Bot menggunakan sistem logging berbasis level yang dapat dikonfigurasi via environment variable:
```env
LOG_LEVEL=INFO    # DEBUG, INFO, WARN, ERROR
```

### **Enhanced Error Logging**
Setiap error log sekarang mencakup informasi detail:
- **Error Message**: Pesan error yang jelas
- **API Response**: Status code dan response data dari API calls
- **Stack Trace**: Call stack untuk debugging
- **Context Data**: Data relevan seperti pair, ticket, file path, dll
- **Timestamp**: Waktu kejadian error dalam format ISO

### **Contoh Log Format**
```
2025-07-24T21:13:12.000Z [ERROR] [BrokerHandler] Gagal membuka order:
{
  "error": "API Error 400: Invalid symbol",
  "statusCode": 400,
  "responseData": { "message": "Symbol not found" },
  "stack": "Error: API Error...",
  "requestData": { "symbol": "USDJPY", "type": "BUY", "volume": 0.1 }
}
```

### **Log Categories**
- **[Main]**: Aplikasi utama dan cron scheduling
- **[CommandHandler]**: Pemrosesan perintah WhatsApp
- **[AnalysisHandler]**: Analisis PO3 dan AI calls
- **[BrokerHandler]**: Interaksi dengan broker API
- **[MonitoringHandler]**: Monitoring posisi aktif
- **[WhatsAppClient]**: Koneksi WhatsApp
- **[ContextManager]**: Manajemen konteks harian
- **[PromptBuilders]**: Pembangunan prompt AI
- **[Helpers]**: Fungsi utility dan data fetching

### **Interactive Commands dengan Logging**
Semua command interaktif baru (`/stage1`, `/fullcycle`, `/health`, dll) menggunakan enhanced logging untuk memberikan feedback detail ke user dan logging komprehensif untuk debugging.

## 🛠️ Panduan Instalasi

### **1. Prerequisites**
- Node.js v16+ dan npm
- API key Google Gemini
- API key Chart-Img.com (multiple keys untuk rotation)  
- Akses ke broker API MT5 custom
- Google Service Account untuk Sheets access
- Nomor WhatsApp untuk bot

### **2. Installation Steps**
```bash
# Clone repository
git clone <repository_url>
cd BOT-V9

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Setup Google credentials
# Letakkan file kredensial di config/google-credentials.json

# Run tests
npm test

# Start bot
npm start
```

### **3. WhatsApp Setup**
1. Jalankan bot dengan `npm start`
2. Scan QR code yang muncul di terminal dengan WhatsApp
3. Bot akan otomatis tersambung dan siap menerima perintah
4. Kirim `/menu` untuk melihat daftar perintah

### **4. Google Sheets Setup**
1. Buat Google Sheet baru
2. Salin Sheet ID dari URL
3. Share sheet dengan service account email
4. Masukkan Sheet ID ke environment variable `GOOGLE_SHEET_ID`

## 📱 Perintah WhatsApp

### **Analisis & Strategi**
- `/menu` atau `/help`: Menampilkan menu bantuan lengkap
- `/stage1`: Force analisis bias harian (Stage 1) secara manual
- `/stage2`: Force deteksi manipulasi (Stage 2) secara manual
- `/stage3`: Force konfirmasi entri (Stage 3) secara manual
- `/holdeod`: Force analisis hold/close untuk semua posisi aktif
- `/fullcycle`: Jalankan semua stage PO3 secara berurutan (Stage 1-3 + Hold/EOD)
- `/analyze PAIR`: Analisis lengkap untuk pair spesifik (contoh: `/analyze USDJPY`)
- `/usdjpy`, `/gbpusd`, etc.: ⚠️ Info progress pair (otomatis via PO3 schedule)
- `/status`: Status lengkap bot dan semua pair

### **Manajemen Trade**
- `/cls PAIR`: Menutup trade aktif untuk pair tertentu
- `/positions`: Menampilkan semua posisi aktif
- `/pending`: Menampilkan semua pending orders
- `/profit_today`: Laporan profit/loss hari ini

### **Kontrol Bot**
- `/pause`: Menghentikan sementara trading terjadwal
- `/resume`: Melanjutkan trading terjadwal
- `/restart`: Restart sistem bot (memerlukan PM2 atau process manager)

### **Debug & Maintenance**
- `/context PAIR`: Lihat konteks harian pair spesifik
- `/resetcontext PAIR`: Reset konteks harian pair ke status awal
- `/forceeod`: Force tutup semua posisi (EOD manual)
- `/clearcache`: Hapus semua file cache analisis
- `/health`: System health check (direktori, konfigurasi, memory)

### **Informasi & Berita**
- `/news`: Cari berita ekonomi terbaru via Google Search

### **Manajemen Notifikasi**
- `/list_recipients`: Menampilkan daftar penerima notifikasi
- `/add_recipient 6281234567890@s.whatsapp.net`: Menambah recipient
- `/del_recipient 6281234567890@s.whatsapp.net`: Menghapus recipient

### **Pengaturan**
- `/setting berita <on|off>`: Enable/disable pencarian berita otomatis
- `/sesi <on|off>`: Enable/disable filter sesi trading (deprecated)
- `/filter <on|off>`: Enable/disable hard filter (deprecated)

### **Contoh Penggunaan**
```
User: /status
Bot: 🤖 STATUS BOT TRADING PO3 🤖

📊 STATUS PAIR:
• USDJPY: PENDING_MANIPULATION (Bias: BULLISH)
• USDCHF: PENDING_ENTRY (Manipulasi terdeteksi)
• GBPUSD: COMPLETE_NO_ENTRY

⚡ POSISI AKTIF: 1
📋 PENDING ORDERS: 0
💰 PROFIT HARI INI: +25.50 USD

🔄 BOT STATUS: AKTIF
```

## 🐛 Bug Fixes & Improvements

### **Fixed Issues**
1. **DXY Legacy Code Removal**: Dihapus semua referensi DXY yang tidak digunakan lagi
2. **Chart API Configuration**: Standardisasi konfigurasi chart untuk semua pair
3. **Error Handling**: Improved error handling di semua modules
4. **Memory Leaks**: Fixed potential memory leaks di monitoring loops
5. **File Path Issues**: Konsistensi penggunaan absolute paths
6. **Concurrent Operations**: Proper locking mechanism untuk prevent race conditions

### **Code Quality Improvements**
1. **Type Safety**: Better parameter validation dan type checking
2. **Error Messages**: More descriptive error messages untuk debugging  
3. **Logging**: Consistent logging format across all modules
4. **Documentation**: Comprehensive inline documentation
5. **Test Coverage**: Complete test suite untuk critical components

### **Performance Optimizations**
1. **API Rate Limiting**: Proper rate limiting untuk external APIs
2. **Chart API Rotation**: Smart rotation untuk avoid rate limits
3. **Caching**: Intelligent caching untuk reduce API calls
4. **Async Optimization**: Better async/await patterns untuk performance

## 🧪 Testing

### **Test Suite**
```bash
# Run all tests
npm test

# Individual tests
node tests/contextManager.test.js
node tests/cronSchedule.test.js  
node tests/aggregate.test.js
```

### **Test Coverage**
1. **contextManager.test.js**: Test context creation, saving, loading, dan auto-reset
2. **cronSchedule.test.js**: Validasi semua cron expressions
3. **aggregate.test.js**: Test aggregasi data M1 ke M5

### **Manual Testing Checklist**
- [ ] WhatsApp connection dan QR scan
- [ ] Chart API image retrieval
- [ ] Broker API integration
- [ ] Google Sheets recording
- [ ] Context state management
- [ ] Cron job scheduling
- [ ] Error handling dan recovery

## 🔧 Troubleshooting

### **Common Issues**

**1. WhatsApp Connection Failed**
```
Solution: 
- Pastikan nomor WhatsApp aktif
- Hapus folder whatsapp-session/ dan scan ulang QR
- Check internet connection
```

**2. Gemini API Error**
```
Solution:
- Verify GEMINI_API_KEY di .env
- Check API quota dan billing
- Pastikan model name benar (gemini-2.0-flash-exp)
```

**3. Chart API Rate Limit**
```
Solution:
- Tambah lebih banyak CHART_IMG_KEY_X di .env
- Check API quota untuk setiap key
- Adjust monitoring interval
```

**4. Broker API Connection**
```
Solution:
- Verify BROKER_API_BASE_URL dan BROKER_API_KEY
- Check broker server status
- Test API endpoints manually
```

**5. Google Sheets Access Denied**
```
Solution:
- Verify google-credentials.json file
- Share sheet dengan service account email
- Check GOOGLE_SHEET_ID di .env
```

**6. Context Lock Issues**
```
Solution:
- Restart bot untuk clear locks
- Check daily_context/ folder permissions
- Manual unlock: set lock: false di context file
```

### **Debug Commands**
```bash
# Check logs dengan level DEBUG
LOG_LEVEL=DEBUG npm start

# Test individual components
node -e "console.log(require('./modules/contextManager').getContext('TESTPAIR'))"

# Verify environment
node -e "console.log(process.env.GEMINI_API_KEY ? 'Gemini OK' : 'Gemini Missing')"
```

### **Log Analysis**
Monitor logs untuk pattern:
- `[STAGE1]`, `[STAGE2]`, `[STAGE3]`: PO3 workflow progress
- `[MONITORING]`: Position monitoring activities
- `[EOD]`: End of day operations
- `[ERROR]`: Error conditions yang perlu investigation

---

## 📞 Support & Contact

Untuk support teknis dan update:
- **Developer**: NandaC
- **Version**: 2.1.0
- **Last Updated**: Juli 2025

⚠️ **Disclaimer**: Bot ini adalah alat bantu trading. Selalu lakukan due diligence dan risk management yang proper. Developer tidak bertanggung jawab atas kerugian trading.
- Status: `PENDING_BIAS` → `PENDING_MANIPULATION`

### **Stage 2: Manipulation (06:00-09:00 UTC, setiap 15 menit)**  
- Deteksi liquidity sweep (Judas Swing)
- Konfirmasi reaksi di zona HTF
- Status: `PENDING_MANIPULATION` → `PENDING_ENTRY` atau `COMPLETE_NO_MANIPULATION`

### **Stage 3: Distribution (07:00-12:00 UTC, setiap 5 menit)**
- Konfirmasi Market Structure Shift (MSS)
- Identifikasi Fair Value Gap (FVG) untuk entri
- Eksekusi order jika setup valid
- Status: `PENDING_ENTRY` → `COMPLETE_TRADE_OPENED` atau `COMPLETE_NO_ENTRY`

### **Stage 4: End of Day (15:00 UTC / 22:00 WIB)**
- Monitoring posisi aktif secara berkala
- Evaluasi hold/close dengan analisis AI
- Penutupan paksa semua posisi di akhir hari

## Persyaratan

- Node.js 18+.
- Akses internet untuk menghubungi API eksternal.
- Akun Google dengan API key Gemini dan kredensial Service Account untuk Google Sheets.
- API key untuk layanan chart-img.com.
- Endpoint dan API key broker trading yang kompatibel.

## Instalasi

1. **Klon repositori dan masuk ke direktori proyek**
   ```bash
   git clone https://github.com/sitaurs/trading-ai
   cd trading-ai
   ```
2. **Pasang dependensi Node.js**
   ```bash
   npm install
   ```
3. **Salin berkas `.env.example` menjadi `.env`** dan sesuaikan nilainya.
   ```bash
   cp .env.example .env
   ```
4. **Siapkan kredensial Google** di `config/google-credentials.json` (format Service Account).

## Konfigurasi `.env`

Berikut penjelasan singkat setiap variabel pada file `.env`:

| Variabel | Deskripsi |
| --- | --- |
| `GEMINI_API_KEY` | API key Google Gemini untuk analisis AI. |
| `CHART_IMG_KEY_1..N` | Satu atau beberapa API key untuk chart-img.com. |
| `SUPPORTED_PAIRS` | Daftar pair yang diizinkan, dipisah koma. Contoh: `USDJPY,USDCHF,GBPUSD`. |
| `NOTIFICATION_RECIPIENTS` | Daftar ID WA penerima notifikasi otomatis. |
| `BROKER_API_BASE_URL` | URL dasar endpoint API broker. |
| `BROKER_API_KEY` | API key broker untuk otentikasi. |
| `MONITORING_INTERVAL_MINUTES` | Interval monitoring posisi aktif (default: 30 menit). |
| `TRADE_VOLUME` | Besaran lot ketika membuka posisi. |
| `GOOGLE_SHEET_ID` | ID spreadsheet tujuan untuk jurnal trading. |
| **ICT PO3 Configuration** |  |
| `TZ` | Timezone server (UTC). |
| `ASIA_SESSION_START` | Jam mulai sesi Asia (default: 00:00). |
| `ASIA_SESSION_END` | Jam akhir sesi Asia (default: 04:00). |
| `LONDON_KILLZONE_START` | Jam mulai killzone London (default: 06:00). |
| `LONDON_KILLZONE_END` | Jam akhir killzone London (default: 09:00). |
| `MIN_RRR` | Minimum Risk Reward Ratio (default: 2). |
| `MAX_RETRIES` | Maksimum retry untuk panggilan API (default: 3). |

Sesuaikan variabel di atas sesuai dengan lingkungan dan broker Anda. Apabila endpoint API broker berubah, cukup ubah `BROKER_API_BASE_URL` pada `.env` kemudian jalankan ulang bot.

## Menjalankan Bot

Setelah konfigurasi selesai, jalankan perintah berikut:

```bash
npm start
```

Saat pertama kali dijalankan, terminal akan menampilkan QR code yang perlu dipindai menggunakan aplikasi WhatsApp Anda. Setelah tersambung, bot siap menerima perintah.

Pengujian unit sederhana dapat dijalankan dengan:

```bash
npm test
```

### Menjalankan dengan PM2

Untuk menjalankan bot secara permanen di latar belakang Anda dapat memakai [PM2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start index.js --name trading-bot
pm2 logs trading-bot     # melihat log
pm2 startup              # jika ingin autostart saat boot
pm2 save
```

## Alur Kerja Trading AI Bot (Dimulai dari Jadwal)

Alur berikut terjadi otomatis setiap jam berkat `node-cron` di `index.js`.

**Tahap 1: Pemicu Jadwal & Pemeriksaan Awal**

1. `runScheduledAnalysis` dipanggil pada waktunya dan mengecek `config/bot_status.json`. Jika `isPaused` bernilai `true`, siklus dilewati.
2. Bot mengirim pesan pembuka ke seluruh penerima terdaftar.

**Tahap 2: Analisis Stage 1 - Bias Harian (05:00 UTC)**

3. Fungsi `runStage1Analysis` menganalisis range Asia dan menentukan bias harian untuk setiap pair.
4. Hasil disimpan dalam konteks harian untuk digunakan pada tahap selanjutnya.

**Tahap 3: Analisis Stage 2 - Deteksi Manipulasi London**

5. Bot mendeteksi manipulasi pada London killzone dengan memanfaatkan bias dan range Asia.
6. Data OHLCV terbaru digunakan untuk mengidentifikasi pola ICT Power of Three.

**Tahap 4: Analisis Stage 3 - Konfirmasi Entry**

7. Berdasarkan manipulasi yang terdeteksi, bot mencari entry point optimal.
8. Konfirmasi dilakukan dengan analisis HTF zone dan reaksi pasar.

**Tahap 5: Eksekusi dan Monitoring**

8. `extractor.js` mengubah teks naratif menjadi JSON dan `decisionHandlers.js` mengeksekusi hasilnya:
   - Membuka posisi via broker jika keputusan `OPEN`.
   - Menutup posisi bila `CLOSE_MANUAL`.
   - Atau hanya mengirim notifikasi bila `HOLD`/`NO_TRADE`.

**Tahap 5: Monitoring & Jurnal**

9. `monitoringHandler.js` memeriksa perubahan status pending order maupun posisi live.
10. Ketika posisi selesai, `journalingHandler.js` mencatat hasil ke Google Sheets dan memperbarui statistik `circuitBreaker`.

Siklus ini berulang setiap jadwal sehingga bot dapat beroperasi secara otomatis sepanjang hari.

## Perintah WhatsApp

Bot menerima perintah teks untuk kontrol dan monitoring:

- `/menu` atau `/help` – Menampilkan menu bantuan.
- `/status` – Status bot dan konteks harian semua pair.
- `/<pair>` (misal `/usdjpy`) – Info progress analisis pair (tidak memicu analisis manual).
- `/cls <PAIR>` – Menutup posisi yang sedang tercatat.
- `/pause` dan `/resume` – Menjeda atau melanjutkan analisis otomatis terjadwal.
- `/profit_today` – Menampilkan total profit/loss hari ini.
- `/add_recipient <ID_WA>` dan `/del_recipient <ID_WA>` – Kelola daftar penerima notifikasi.
- `/list_recipients` – Menampilkan daftar penerima.

**Catatan**: Analisis PO3 berjalan otomatis sesuai jadwal. Tidak ada analisis manual atau "force" seperti versi sebelumnya.

Perintah hanya dikenali jika dikirim oleh ID yang terdaftar pada `NOTIFICATION_RECIPIENTS` atau grup yang terdaftar pada `ALLOWED_GROUP_IDS` (jika diisi).

## Catatan Deployment

- Bot menyimpan sesi login WhatsApp pada folder `whatsapp-session/`. Jika ingin mengganti akun, hapus folder tersebut sebelum menjalankan ulang.
- Direktori `pending_orders/`, `live_positions/`, dan `journal_data/` akan dibuat otomatis bila belum ada.
- Jaga keamanan file `.env` dan `config/google-credentials.json` karena berisi data sensitif.
- Apabila koneksi WhatsApp terputus (misalnya muncul kode 515), bot akan mencoba menyambung kembali secara otomatis. Pastikan folder `whatsapp-session/` tidak terhapus agar proses ini berhasil.

## 📊 **Ringkasan Jadwal & API Usage Baru**

### **⏰ Jadwal Final (WIB)**
```
12:00 WIB │ Stage 1: Bias Analysis (1x) - 6 API calls
13:30 WIB │ Stage 2-1: Early London Manipulation (1x) - 6 API calls  
14:00-19:00 │ Stage 3: Entry Confirmation (11x default) - 17 API calls
16:00 WIB │ Stage 2-2: Late London Manipulation (1x) - 6 API calls
22:00 WIB │ EOD: Force Close All Positions (1x)
```

### **📈 Optimasi Achieved**
- **API Reduction**: -61% Gemini calls, -58% Chart-Img calls
- **Cost Savings**: $7.58/hari → $3.15/hari (-58% biaya)
- **Configuration**: Stage 3 interval dapat disesuaikan (15/30/60 menit)
- **Coverage**: Tetap optimal dengan 2x Stage 2 detection

### **🎯 Konfigurasi Recommended**
```env
# Default (Balanced)
STAGE3_INTERVAL_MINUTES=30  # 11x per hari, cost moderate

# Testing (Cost Saving)  
STAGE3_INTERVAL_MINUTES=60  # 6x per hari, cost minimal

# Production (Maximum Coverage)
STAGE3_INTERVAL_MINUTES=15  # 25x per hari, cost higher
```

## Lisensi

Proyek ini menggunakan lisensi ISC sebagaimana tercantum di `package.json`.

