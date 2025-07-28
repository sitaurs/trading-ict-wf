/**
 * 📦 Analysis Cache Manager
 * Mengelola file cache harian untuk full narrative analysis
 */

const fs = require('fs').promises;
const path = require('path');

class AnalysisCacheManager {
    constructor() {
        this.cacheDir = path.join(__dirname, '..', 'analysis_cache');
    }

    async init() {
        try {
            await fs.access(this.cacheDir);
            console.log('📁 Analysis cache directory found');
        } catch {
            await fs.mkdir(this.cacheDir, { recursive: true });
            console.log('📁 Created analysis_cache directory');
        }
    }

    /**
     * List semua cache files yang ada
     */
    async listCacheFiles() {
        try {
            const files = await fs.readdir(this.cacheDir);
            return files.filter(file => file.endsWith('.json'));
        } catch (error) {
            console.error('Error listing cache files:', error.message);
            return [];
        }
    }

    /**
     * Get analysis summary untuk hari ini
     */
    async getTodaySummary() {
        const files = await this.listCacheFiles();
        const today = new Date().toISOString().split('T')[0];
        
        const summary = {};
        
        for (const file of files) {
            try {
                const filePath = path.join(this.cacheDir, file);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                
                // Hanya tampilkan file dari hari ini
                if (data.date === today) {
                    if (!summary[data.pair]) {
                        summary[data.pair] = {};
                    }
                    
                    summary[data.pair][`stage${data.stage}`] = {
                        timestamp: data.timestamp,
                        charCount: data.charCount,
                        wordCount: data.wordCount,
                        fileName: file,
                        freshness: 'TODAY'
                    };
                }
            } catch (error) {
                console.error(`Error reading ${file}:`, error.message);
            }
        }
        
        return summary;
    }

    /**
     * Cleanup cache files dari hari sebelumnya
     */
    async cleanupYesterdayCache() {
        const files = await this.listCacheFiles();
        const today = new Date().toISOString().split('T')[0];
        
        let deletedCount = 0;
        let outdatedFiles = [];
        
        for (const file of files) {
            try {
                const filePath = path.join(this.cacheDir, file);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                
                // Hapus file yang bukan dari hari ini
                if (data.date !== today) {
                    await fs.unlink(filePath);
                    deletedCount++;
                    outdatedFiles.push({
                        file,
                        date: data.date,
                        pair: data.pair,
                        stage: data.stage
                    });
                    console.log(`🗑️ Deleted outdated cache: ${file} (${data.date})`);
                }
            } catch (error) {
                console.error(`Error processing ${file}:`, error.message);
            }
        }
        
        console.log(`✅ Cleanup completed: ${deletedCount} outdated files removed`);
        
        if (outdatedFiles.length > 0) {
            console.log('\n📋 Removed files:');
            outdatedFiles.forEach(f => {
                console.log(`  • ${f.pair} Stage ${f.stage} (${f.date})`);
            });
        }
        
        return {
            deletedCount,
            outdatedFiles
        };
    }

    /**
     * Get full narrative untuk pair dan stage tertentu
     */
    async getFullNarrative(pair, stage) {
        const fileName = `${pair}_stage${stage}.json`;
        const filePath = path.join(this.cacheDir, fileName);
        
        try {
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            // Cek apakah masih hari ini
            const today = new Date().toISOString().split('T')[0];
            if (data.date !== today) {
                console.warn(`⚠️ Cache file is from ${data.date}, not today (${today})`);
                return null;
            }
            
            return {
                narrative: data.narrativeText,
                timestamp: data.timestamp,
                charCount: data.charCount,
                wordCount: data.wordCount
            };
        } catch (error) {
            console.warn(`📭 Cache not found: ${fileName}`);
            return null;
        }
    }

    /**
     * Get cache statistics
     */
    async getStatistics() {
        const files = await this.listCacheFiles();
        const today = new Date().toISOString().split('T')[0];
        
        let todayFiles = 0;
        let outdatedFiles = 0;
        let totalSize = 0;
        const pairCounts = {};
        const stageCounts = {};
        
        for (const file of files) {
            try {
                const filePath = path.join(this.cacheDir, file);
                const stats = await fs.stat(filePath);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                
                totalSize += stats.size;
                
                if (data.date === today) {
                    todayFiles++;
                    
                    // Count by pair
                    pairCounts[data.pair] = (pairCounts[data.pair] || 0) + 1;
                    
                    // Count by stage
                    stageCounts[`stage${data.stage}`] = (stageCounts[`stage${data.stage}`] || 0) + 1;
                } else {
                    outdatedFiles++;
                }
            } catch (error) {
                console.error(`Error reading ${file}:`, error.message);
            }
        }
        
        return {
            totalFiles: files.length,
            todayFiles,
            outdatedFiles,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            pairCounts,
            stageCounts,
            date: today
        };
    }

    /**
     * Validate cache integrity
     */
    async validateCache() {
        const files = await this.listCacheFiles();
        const issues = [];
        
        for (const file of files) {
            try {
                const filePath = path.join(this.cacheDir, file);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                
                // Check required fields
                const requiredFields = ['pair', 'stage', 'date', 'timestamp', 'narrativeText'];
                for (const field of requiredFields) {
                    if (!data[field]) {
                        issues.push(`${file}: Missing field '${field}'`);
                    }
                }
                
                // Check narrative length
                if (data.narrativeText && data.narrativeText.length < 100) {
                    issues.push(`${file}: Narrative too short (${data.narrativeText.length} chars)`);
                }
                
                // Check file naming consistency
                const expectedName = `${data.pair}_stage${data.stage}.json`;
                if (file !== expectedName) {
                    issues.push(`${file}: Filename doesn't match content (expected: ${expectedName})`);
                }
                
            } catch (error) {
                issues.push(`${file}: JSON parsing error - ${error.message}`);
            }
        }
        
        return issues;
    }
}

// CLI Interface
if (require.main === module) {
    const cacheManager = new AnalysisCacheManager();
    const command = process.argv[2];
    
    switch (command) {
        case 'summary':
            (async () => {
                await cacheManager.init();
                const summary = await cacheManager.getTodaySummary();
                console.log('\n📊 TODAY\'S ANALYSIS CACHE SUMMARY:');
                console.log('='.repeat(50));
                
                if (Object.keys(summary).length === 0) {
                    console.log('📭 No cache files found for today');
                } else {
                    Object.entries(summary).forEach(([pair, stages]) => {
                        console.log(`\n💱 ${pair}:`);
                        Object.entries(stages).forEach(([stage, info]) => {
                            console.log(`  ✅ ${stage}: ${info.charCount} chars, ${info.wordCount} words`);
                            console.log(`     📅 ${new Date(info.timestamp).toLocaleString()}`);
                        });
                    });
                }
            })();
            break;
            
        case 'cleanup':
            (async () => {
                await cacheManager.init();
                const result = await cacheManager.cleanupYesterdayCache();
                console.log(`\n🧹 Cleanup Summary:`);
                console.log(`✅ ${result.deletedCount} outdated files removed`);
            })();
            break;
            
        case 'stats':
            (async () => {
                await cacheManager.init();
                const stats = await cacheManager.getStatistics();
                console.log('\n📈 CACHE STATISTICS:');
                console.log('='.repeat(40));
                console.log(`📅 Date: ${stats.date}`);
                console.log(`📄 Total Files: ${stats.totalFiles}`);
                console.log(`🆕 Today's Files: ${stats.todayFiles}`);
                console.log(`📜 Outdated Files: ${stats.outdatedFiles}`);
                console.log(`💾 Total Size: ${stats.totalSizeMB} MB`);
                
                if (Object.keys(stats.pairCounts).length > 0) {
                    console.log('\n💱 By Pair:');
                    Object.entries(stats.pairCounts).forEach(([pair, count]) => {
                        console.log(`  • ${pair}: ${count} files`);
                    });
                }
                
                if (Object.keys(stats.stageCounts).length > 0) {
                    console.log('\n🔢 By Stage:');
                    Object.entries(stats.stageCounts).forEach(([stage, count]) => {
                        console.log(`  • ${stage}: ${count} files`);
                    });
                }
            })();
            break;
            
        case 'validate':
            (async () => {
                await cacheManager.init();
                const issues = await cacheManager.validateCache();
                console.log('\n🔍 CACHE VALIDATION:');
                console.log('='.repeat(40));
                
                if (issues.length === 0) {
                    console.log('✅ All cache files are valid');
                } else {
                    console.log(`❌ Found ${issues.length} issues:`);
                    issues.forEach(issue => console.log(`  • ${issue}`));
                }
            })();
            break;
            
        case 'get':
            const pair = process.argv[3];
            const stage = process.argv[4];
            if (!pair || !stage) {
                console.log('❌ Usage: node cache_manager.js get [PAIR] [STAGE]');
                console.log('   Example: node cache_manager.js get EURUSD 1');
                return;
            }
            
            (async () => {
                await cacheManager.init();
                const result = await cacheManager.getFullNarrative(pair, stage);
                if (result) {
                    console.log(`\n📝 ${pair} Stage ${stage} Analysis:`);
                    console.log('='.repeat(60));
                    console.log(`📅 Timestamp: ${new Date(result.timestamp).toLocaleString()}`);
                    console.log(`📊 Length: ${result.charCount} chars, ${result.wordCount} words`);
                    console.log('\n📄 Full Narrative:');
                    console.log('-'.repeat(60));
                    console.log(result.narrative);
                } else {
                    console.log(`❌ Cache not found for ${pair} Stage ${stage}`);
                }
            })();
            break;
            
        default:
            console.log(`
📦 Analysis Cache Manager

Commands:
  summary     Show today's cache summary
  cleanup     Remove yesterday's cache files  
  stats       Show cache statistics
  validate    Check cache file integrity
  get [pair] [stage]  Get full narrative

Examples:
  node scripts/cache_manager.js summary
  node scripts/cache_manager.js cleanup
  node scripts/cache_manager.js stats
  node scripts/cache_manager.js get EURUSD 1
            `);
    }
}

module.exports = AnalysisCacheManager;
