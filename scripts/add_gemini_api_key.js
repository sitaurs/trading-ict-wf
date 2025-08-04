/**
 * 🔧 Script untuk menambahkan Gemini API Key baru ke .env
 * Usage: node scripts/add_gemini_api_key.js "YOUR_NEW_API_KEY"
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

function addGeminiApiKey(newApiKey) {
    try {
        // Baca file .env
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        
        // Cari indeks terakhir GEMINI_API_KEY_X
        let maxIndex = 0;
        const geminiKeyPattern = /^GEMINI_API_KEY_(\d+)=/;
        
        lines.forEach(line => {
            const match = line.match(geminiKeyPattern);
            if (match) {
                const index = parseInt(match[1]);
                if (index > maxIndex) {
                    maxIndex = index;
                }
            }
        });
        
        const nextIndex = maxIndex + 1;
        const newKeyLine = `GEMINI_API_KEY_${nextIndex}="${newApiKey}"`;
        
        // Cari posisi untuk menambahkan key baru
        let insertIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('# Tambahkan sampai GEMINI_API_KEY_N')) {
                insertIndex = i;
                break;
            }
        }
        
        if (insertIndex === -1) {
            // Jika tidak menemukan comment, cari setelah GEMINI_API_KEY terakhir
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].match(geminiKeyPattern)) {
                    insertIndex = i + 1;
                    break;
                }
            }
        }
        
        if (insertIndex !== -1) {
            lines.splice(insertIndex, 0, newKeyLine);
            
            // Tulis kembali file .env
            fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
            
            console.log('✅ Berhasil menambahkan Gemini API Key baru!');
            console.log(`📝 GEMINI_API_KEY_${nextIndex} telah ditambahkan ke .env`);
            console.log(`🔄 Total API Keys sekarang: ${nextIndex}`);
            console.log('');
            console.log('🚀 NEXT STEPS:');
            console.log('1. Restart bot untuk menerapkan perubahan');
            console.log('2. Bot akan otomatis menggunakan rotasi API keys');
            console.log('3. Monitor log untuk memastikan rotasi berjalan');
            
        } else {
            throw new Error('Tidak dapat menemukan lokasi untuk menambahkan API key');
        }
        
    } catch (error) {
        console.error('❌ Error menambahkan API key:', error.message);
        process.exit(1);
    }
}

function showUsage() {
    console.log('🔧 Gemini API Key Manager');
    console.log('');
    console.log('USAGE:');
    console.log('  node scripts/add_gemini_api_key.js "YOUR_NEW_API_KEY"');
    console.log('');
    console.log('EXAMPLES:');
    console.log('  node scripts/add_gemini_api_key.js "AIzaSyBnxBIPvM5MNZuMiuqhQ5ZfhIVKkLUm_3Y"');
    console.log('');
    console.log('FEATURES:');
    console.log('• ✅ Otomatis mendeteksi index berikutnya');
    console.log('• 🔄 Mendukung unlimited API keys');
    console.log('• 📝 Update .env file secara aman');
    console.log('• 🚀 Langsung siap digunakan oleh bot');
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        showUsage();
        process.exit(0);
    }
    
    const newApiKey = args[0];
    
    if (!newApiKey || newApiKey.length < 10) {
        console.error('❌ API key tidak valid. Harus minimal 10 karakter.');
        showUsage();
        process.exit(1);
    }
    
    console.log('🔧 Menambahkan Gemini API Key baru...');
    console.log(`📝 API Key: ${newApiKey.substring(0, 10)}...${newApiKey.substring(newApiKey.length - 4)}`);
    console.log('');
    
    addGeminiApiKey(newApiKey);
}

module.exports = { addGeminiApiKey };
