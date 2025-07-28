# 📱 WhatsApp Commands Reference

## 🎯 ICT Bot Commands

> **Note**: Semua command menggunakan prefix `ict` untuk menghindari konflik dengan bot lain.

---

## 📊 Analysis & Trading Commands

### Core PO3 Strategy
| Command | Description | Example |
|---------|-------------|---------|
| `/stage1` | 🌅 Analisis bias harian (Stage 1) | `/stage1` |
| `/stage2` | ⚡ Deteksi manipulasi London (Stage 2) | `/stage2` |
| `/stage3` | 🚀 Konfirmasi entry (Stage 3) | `/stage3` |
| `/fullcycle` | 🔄 Jalankan semua stage PO3 | `/fullcycle` |

### Individual Analysis
| Command | Description | Example |
|---------|-------------|---------|
| `/analyze [PAIR]` | 📈 Analisis lengkap spesifik pair | `/analyze USDJPY` |
| `/holdeod` | 🌅 Analisis hold/close EOD | `/holdeod` |

---

## 🔍 Monitoring & Position Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/ictstatus` | 📊 Status bot & posisi aktif | `/ictstatus` |
| `/positions` | 💼 Lihat semua posisi terbuka | `/positions` |
| `/pending` | ⏳ Lihat pending orders | `/pending` |
| `/ictprofit` | 💰 Laporan profit hari ini | `/ictprofit` |
| `/ictclose [PAIR]` | ❌ Tutup posisi manual | `/ictclose USDJPY` |

---

## ⚙️ Control & Settings Commands

### Bot Control
| Command | Description | Example |
|---------|-------------|---------|
| `/ictpause` | ⏸️ Pause trading otomatis | `/ictpause` |
| `/ictresume` | ▶️ Resume trading otomatis | `/ictresume` |
| `/restart` | 🔄 Restart sistem bot | `/restart` |

### Recipient Management
| Command | Description | Example |
|---------|-------------|---------|
| `/ictadd [NOMOR]` | ➕ Tambah penerima notif | `/ictadd 628123456789` |
| `/ictdel [NOMOR]` | ➖ Hapus penerima notif | `/ictdel 628123456789` |
| `/ictlist` | 📋 Lihat daftar penerima | `/ictlist` |

---

## 📰 Information & Utilities Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/ictmenu` / `/icthelp` | 📱 Menampilkan menu bantuan | `/icthelp` |
| `/ictnews` | 📰 Berita ekonomi forex terkini | `/ictnews` |
| `/health` | 🏥 Status kesehatan sistem | `/health` |
| `/context [PAIR]` | 📝 Status konteks pair harian | `/context USDJPY` |

---

## 🔧 Advanced & Maintenance Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/clearcache` | 🗑️ Bersihkan cache analisis | `/clearcache` |
| `/forceeod` | 🚨 Paksa tutup semua posisi | `/forceeod` |
| `/resetcontext [PAIR]` | 🔄 Reset konteks pair | `/resetcontext USDJPY` |

---

## 📋 Command Examples

### Daily Trading Workflow
```
1. Morning Check:
   /ictstatus          # Check bot status
   /ictnews            # Check economic news

2. Manual Analysis (if needed):
   /stage1             # Force Stage 1 analysis
   /stage2             # Force Stage 2 analysis
   /stage3             # Force Stage 3 analysis

3. Position Management:
   /positions          # Check open positions
   /pending           # Check pending orders
   /ictprofit         # Check daily profit

4. Evening Review:
   /holdeod           # Hold/close analysis
   /context USDJPY    # Check pair context
```

### Emergency Commands
```
Emergency Stop:
/ictpause           # Pause all trading
/forceeod          # Close all positions

System Issues:
/health            # Check system health
/restart           # Restart bot (if needed)
/clearcache        # Clear analysis cache
```

---

## 🎯 Supported Trading Pairs

- **USDJPY** - US Dollar / Japanese Yen
- **USDCHF** - US Dollar / Swiss Franc
- **GBPUSD** - British Pound / US Dollar

---

## 💡 Tips & Best Practices

### Command Usage
- **Case Insensitive**: Commands tidak case-sensitive
- **Spacing**: Gunakan spasi antara command dan parameter
- **Timing**: Hindari spam command dalam waktu singkat
- **Pair Format**: Gunakan format XXXYYY (contoh: USDJPY)

### Notification Management
- Tambahkan nomor dengan format internasional (628xxx)
- Gunakan `/ictlist` untuk verifikasi penerima
- Hapus nomor yang tidak aktif untuk efisiensi

### Trading Safety
- Selalu check `/ictstatus` sebelum trading manual
- Gunakan `/ictpause` jika ada kondisi market tidak normal
- Monitor posisi dengan `/positions` secara berkala

---

## 🚨 Error Messages

### Common Error Responses
- **"Pair tidak didukung"**: Gunakan pair yang valid (USDJPY, USDCHF, GBPUSD)
- **"Bot sedang dijeda"**: Bot dalam status pause, gunakan `/ictresume`
- **"Koneksi MT5 terputus"**: Check MT5 terminal dan restart jika perlu
- **"API limit tercapai"**: Tunggu reset harian atau upgrade plan

---

**[⬅️ Configuration](./CONFIGURATION.md)** | **[➡️ Strategy](./STRATEGY.md)**
