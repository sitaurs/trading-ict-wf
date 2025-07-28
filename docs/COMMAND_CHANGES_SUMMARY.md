# 📋 ICT BOT COMMAND CHANGES SUMMARY

## 🎯 **Tujuan Perubahan**
Mengubah command ICT Bot agar tidak bentrok dengan BOT-V9 ketika keduanya dijalankan di nomor WhatsApp yang sama.

## 🔄 **Perubahan Command**

### **Command yang Diubah (BOT-V9 → ICT)**

| **Fungsi** | **BOT-V9 Command** | **ICT New Command** | **Keterangan** |
|------------|-------------------|-------------------|-----------------|
| Menu/Help | `/menu`, `/help` | `/ictmenu`, `/icthelp` | Menampilkan menu bantuan |
| Status Bot | `/status` | `/ictstatus` | Status bot & posisi aktif |
| Entry Manual | `/etr` | `/ictentry` | Entry trade manual |
| Close Manual | `/cls` | `/ictclose` | Close posisi manual |
| Settings | `/settings`, `/setting` | `/ictsettings`, `/ictsetting` | Pengaturan bot |
| Add Recipient | `/add_recipient` | `/ictadd` | Tambah penerima notif |
| Delete Recipient | `/del_recipient` | `/ictdel` | Hapus penerima notif |
| List Recipients | `/list_recipients` | `/ictlist` | Lihat daftar penerima |
| Pause Bot | `/pause` | `/ictpause` | Pause trading otomatis |
| Resume Bot | `/resume` | `/ictresume` | Resume trading otomatis |
| Profit Today | `/profit_today` | `/ictprofit` | Laporan profit hari ini |
| News | `/news` | `/ictnews` | Berita ekonomi forex |

### **Command yang Tetap (Unik ICT)**
Command berikut tetap sama karena hanya ada di ICT Bot:

- `/stage1` - Analisis bias harian (Stage 1)
- `/stage2` - Deteksi manipulasi London (Stage 2)  
- `/stage3` - Konfirmasi entry (Stage 3)
- `/analyze [PAIR]` - Analisis lengkap spesifik pair
- `/fullcycle` - Jalankan semua stage PO3
- `/positions` - Lihat semua posisi terbuka
- `/pending` - Lihat pending orders
- `/health` - Status kesehatan sistem
- `/context [PAIR]` - Status konteks pair harian
- `/clearcache` - Bersihkan cache analisis
- `/holdeod` - Analisis hold/close EOD
- `/forceeod` - Paksa tutup semua posisi
- `/resetcontext [PAIR]` - Reset konteks pair
- `/restart` - Restart sistem bot

## 📝 **File yang Dimodifikasi**

### 1. **index.js**
- ✅ Updated switch case statements untuk command baru
- ✅ Mengubah 12 command utama dengan prefix `ict`

### 2. **modules/commandHandler.js**
- ✅ Updated menu text dengan command baru
- ✅ Mengubah help text dari `/help` ke `/icthelp`

### 3. **README.md**
- ✅ Updated dokumentasi command
- ✅ Updated quick start guide

### 4. **PTERODACTYL_SUMMARY.md**
- ✅ Updated command reference

## 🚀 **Cara Penggunaan Setelah Update**

### **Untuk ICT Bot:**
```
/ictmenu       # Lihat semua command ICT
/ictstatus     # Cek status ICT bot
/ictpause      # Pause ICT bot
```

### **Untuk BOT-V9:**
```
/menu          # Lihat semua command BOT-V9
/status        # Cek status BOT-V9  
/pause         # Pause BOT-V9
```

## ✅ **Konfirmasi Compatibility**

Sekarang kedua bot dapat berjalan di nomor WhatsApp yang sama tanpa command conflict:

- **BOT-V9**: Menggunakan command standar (`/menu`, `/status`, dll)
- **ICT Bot**: Menggunakan command dengan prefix `ict` (`/ictmenu`, `/ictstatus`, dll)

## 📞 **Support**

Jika ada masalah dengan command baru:
1. Ketik `/icthelp` untuk melihat menu lengkap ICT
2. Ketik `/help` untuk melihat menu lengkap BOT-V9
3. Pastikan tidak ada typo dalam command

---
**Update Date:** ${new Date().toLocaleDateString('id-ID')}
**Version:** ICT Bot v2.4.0
