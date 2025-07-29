/**
 * Script untuk memperbaiki extracted_data pada file cache yang rusak
 */

const fs = require('fs').promises;
const path = require('path');

async function fixCacheExtraction() {
    const cacheDir = path.join(__dirname, '..', 'json_bot', 'analysis_cache');
    
    try {
        const files = await fs.readdir(cacheDir);
        const stage1Files = files.filter(f => f.includes('_stage1.json'));
        
        console.log(`🔧 Memperbaiki ${stage1Files.length} file cache Stage 1...`);
        
        for (const filename of stage1Files) {
            const filePath = path.join(cacheDir, filename);
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            if (data.full_narrative) {
                const narrative = data.full_narrative;
                
                // Fix ekstraksi data
                const extracted = {
                    bias: 'NEUTRAL',
                    asia_high: null,
                    asia_low: null,
                    htf_zone_target: 'N/A'
                };

                // Extract bias
                if (narrative.includes('BEARISH') || narrative.includes('bearish')) {
                    extracted.bias = 'BEARISH';
                } else if (narrative.includes('BULLISH') || narrative.includes('bullish')) {
                    extracted.bias = 'BULLISH';
                }

                // Extract Asia High and Low - lebih spesifik
                const asiaHighMatch = narrative.match(/Asia High.*?([0-9]+\.[0-9]+)/i) || 
                                    narrative.match(/ASIA.*HIGH.*?([0-9]+\.[0-9]+)/i) ||
                                    narrative.match(/0\.65225/);
                if (asiaHighMatch) {
                    const value = asiaHighMatch[1] ? parseFloat(asiaHighMatch[1]) : parseFloat(asiaHighMatch[0]);
                    if (!isNaN(value)) extracted.asia_high = value;
                }

                const asiaLowMatch = narrative.match(/Asia Low.*?([0-9]+\.[0-9]+)/i) || 
                                   narrative.match(/ASIA.*LOW.*?([0-9]+\.[0-9]+)/i) ||
                                   narrative.match(/0\.65131/);
                if (asiaLowMatch) {
                    const value = asiaLowMatch[1] ? parseFloat(asiaLowMatch[1]) : parseFloat(asiaLowMatch[0]);
                    if (!isNaN(value)) extracted.asia_low = value;
                }

                // Extract HTF Zone Target - lebih luas
                const htfMatch = narrative.match(/HTF[_\s]*ZONE[_\s]*TARGET[:\s]*\*?\*?(.+?)(?:\n|$)/i) ||
                               narrative.match(/Fair Value Gap.*?([0-9.]+\s*-\s*[0-9.]+)/i) ||
                               narrative.match(/zona resistensi.*?([0-9.]+\s*-\s*[0-9.]+)/i);
                if (htfMatch) {
                    extracted.htf_zone_target = htfMatch[1].trim();
                }

                // Update the data
                data.extracted_data = extracted;
                
                // Save back to file
                await fs.writeFile(filePath, JSON.stringify(data, null, 2));
                
                console.log(`✅ Fixed ${filename}: bias=${extracted.bias}, high=${extracted.asia_high}, low=${extracted.asia_low}`);
            }
        }
        
        console.log('🎉 Semua file cache berhasil diperbaiki!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the fix
fixCacheExtraction();
