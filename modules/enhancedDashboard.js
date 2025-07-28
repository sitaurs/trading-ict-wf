/**
 * 📊 ICT Enhanced Dashboard
 * Real-time monitoring dan analytics dengan jadwal trading
 */

const { getLogger } = require('./logger');
const { getContext } = require('./contextManager');
const { loadAnalysisCache } = require('./analysisHandler');
const AnalysisCacheManager = require('../scripts/cache_manager');

const log = getLogger('Dashboard');

class ICTDashboard {
    constructor() {
        this.log = log;
        this.cacheManager = new AnalysisCacheManager();
    }

    async generateEnhancedMenu() {
        try {
            const now = new Date();
            const wibTime = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            const utcTime = now.toLocaleString('en-US', { timeZone: 'UTC' });
            const currentSession = this.getCurrentTradingSession(now);
            const nextSchedule = this.getNextScheduledEvent(now);
            const stageStatuses = await this.getStageStatuses();
            const pairs = this.getSupportedPairs();

            return `🤖 *ICT TRADING BOT MENU v3.2.0*

📅 *JADWAL TRADING HARI INI*
🌅 Stage 1 (12:00 WIB): ${stageStatuses.stage1}
⚡ Stage 2A (13:30 WIB): ${stageStatuses.stage2a}  
🚀 Stage 3 (14:00-19:00 WIB): ${stageStatuses.stage3}
⚡ Stage 2B (16:00 WIB): ${stageStatuses.stage2b}
🌙 EOD Close (22:00 WIB): ${stageStatuses.eod}

⏰ *WAKTU SEKARANG*
🇮🇩 WIB: ${wibTime}
🌍 UTC: ${utcTime}  
${this.getSessionEmoji(currentSession)} Sesi: ${currentSession}
⏭️ Berikutnya: ${nextSchedule}

🤖 *AI ASSISTANT* ⭐ *NEW!*
• \`/ask [pertanyaan]\` - 🤖 Chat dengan Gemini 2.5 Pro
  📝 *Contoh:*
  • \`/ask apa bias EURUSD hari ini?\`
  • \`/ask jelaskan setup PO3 terbaik\`
  • \`/ask berapa profit minggu ini?\`
  • \`/ask market outlook sekarang?\`

⚡ *ANALISIS MANUAL*
• \`/ictstage1\` - 🌅 Force analisis bias harian
• \`/ictstage2\` - ⚡ Force deteksi manipulasi  
• \`/ictstage3\` - 🚀 Force konfirmasi entry

📊 *DASHBOARD & MONITORING*
• \`/ictdash\` - 📊 Dashboard real-time lengkap
• \`/ictstatus\` - 📈 Status bot & posisi aktif
• \`/ictanalytics\` - 📈 Analisis performa detail
• \`/ictpositions\` - 💰 Manajemen posisi aktif
• \`/ictschedule\` - 📅 Jadwal trading detail

🎛️ *KONTROL BOT*
• \`/ictpause\` - ⏸️ Pause trading otomatis
• \`/ictresume\` - ▶️ Resume trading otomatis  
• \`/ictrestart\` - 🔄 Restart sistem bot

📰 *INFORMASI & UTILITAS*
• \`/ictnews\` - 📰 Berita ekonomi forex
• \`/icthealth\` - 🏥 Status kesehatan sistem
• \`/ictcontext [PAIR]\` - 📝 Status konteks pair
• \`/ictcache\` - 🗄️ Manajemen cache analisis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💱 *Supported Pairs:* ${pairs.join(', ')}
🔥 *Latest:* AI Assistant dengan full context awareness!

💡 *Pro Tips:*
• Tanya AI tentang market conditions: \`/ask market sentiment?\`
• Monitor real-time: \`/ictdash\` untuk update terkini
• Analisis mendalam: \`/ictanalytics\` untuk performance review`;

        } catch (error) {
            this.log.error('Error generating menu:', error);
            return `❌ Error generating menu. Please try \`/ictrestart\``;
        }
    }

    async generateRealTimeDashboard() {
        try {
            const now = new Date();
            const wibTime = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            
            // Gather dashboard data
            const positions = await this.getActivePositions();
            const performance = await this.getTodayPerformance();
            const analysisProgress = await this.getAnalysisProgress();
            const marketSentiment = await this.getMarketSentiment();
            const botStatus = this.getBotStatus();
            const cacheStats = await this.getCacheStatistics();

            return `📊 *ICT TRADING DASHBOARD*

⏰ *${wibTime} WIB* | ${this.getSessionEmoji(this.getCurrentTradingSession(new Date()))} ${this.getCurrentTradingSession(new Date())}

💰 *POSISI AKTIF*
${positions.length > 0 ? 
  positions.map(pos => 
    `${this.getPositionEmoji(pos.pnl)} ${pos.symbol}: ${pos.type} ${pos.volume} lots\n   📍 Entry: ${pos.price} | P&L: ${pos.pnl > 0 ? '🟢' : '🔴'} $${Math.abs(pos.pnl).toFixed(2)}`
  ).join('\n') : '📭 Tidak ada posisi aktif'}

📈 *PERFORMANCE HARI INI*
💵 Total P&L: ${performance.totalProfit >= 0 ? '🟢' : '🔴'} $${Math.abs(performance.totalProfit).toFixed(2)}
🎯 Win Rate: ${performance.winRate}% (${performance.wins}W/${performance.losses}L)
📊 Total Trades: ${performance.totalTrades}
⚡ Best Trade: $${performance.bestTrade.toFixed(2)}

🔍 *ANALISIS PROGRESS*
${analysisProgress.map(([pair, progress]) => 
  `${pair}: ${this.getStageEmoji(progress.stage)} ${progress.stage} ${progress.status}`
).join('\n')}

📊 *MARKET SENTIMENT*
📈 Bullish: ${marketSentiment.bullish.length > 0 ? marketSentiment.bullish.join(', ') : 'None'}
📉 Bearish: ${marketSentiment.bearish.length > 0 ? marketSentiment.bearish.join(', ') : 'None'}
⚖️ Neutral: ${marketSentiment.neutral.length > 0 ? marketSentiment.neutral.join(', ') : 'None'}

🤖 *BOT STATUS*
${botStatus.status} | Uptime: ${botStatus.uptime}
💾 Memory: ${botStatus.memory}MB | Cache: ${cacheStats.todayFiles} files

⏭️ *NEXT ACTION*
${this.getNextScheduledEvent(now)}

💡 *Quick Actions:*
• \`/ask market outlook sekarang?\` - AI market analysis
• \`/ictanalytics\` - Detailed performance metrics
• \`/ictpositions\` - Position management tools
• \`/ask setup terbaik ${marketSentiment.bullish[0] || 'EURUSD'}?\` - AI pair analysis`;

        } catch (error) {
            this.log.error('Error generating dashboard:', error);
            return `❌ Error generating dashboard. Try \`/ictrestart\` or \`/icthealth\``;
        }
    }

    async generateDetailedSchedule() {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const wibTime = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        
        const scheduleItems = [
            { time: '12:00 WIB (05:00 UTC)', stage: 'Stage 1', desc: 'Bias Analysis & Asia Range', status: utcHour >= 5 ? '✅ Selesai' : '⏳ Menunggu' },
            { time: '13:30 WIB (06:30 UTC)', stage: 'Stage 2A', desc: 'Early London Manipulation', status: utcHour >= 6.5 ? '✅ Selesai' : '⏳ Menunggu' },
            { time: '14:00 WIB (07:00 UTC)', stage: 'Stage 3', desc: 'Entry Window Start', status: utcHour >= 7 ? '🚀 Aktif' : '⏳ Menunggu' },
            { time: '16:00 WIB (09:00 UTC)', stage: 'Stage 2B', desc: 'Late London Manipulation', status: utcHour >= 9 ? '✅ Selesai' : '⏳ Menunggu' },
            { time: '19:00 WIB (12:00 UTC)', stage: 'Stage 3', desc: 'Entry Window End', status: utcHour >= 12 ? '⏹️ Selesai' : '🚀 Aktif' },
            { time: '22:00 WIB (15:00 UTC)', stage: 'EOD', desc: 'Force Close All Positions', status: utcHour >= 15 ? '✅ Selesai' : '⏳ Menunggu' }
        ];

        return `📅 *ICT TRADING SCHEDULE DETAIL*

⏰ *Waktu Sekarang:* ${wibTime}

🕐 *JADWAL HARIAN*
${scheduleItems.map(item => 
  `${item.time}\n${item.status} ${item.stage}: ${item.desc}`
).join('\n\n')}

⚙️ *KONFIGURASI*
• Stage 3 Interval: ${process.env.STAGE3_INTERVAL_MINUTES || 30} menit
• Min RRR: ${process.env.MIN_RRR || 1.5}
• Trade Volume: ${process.env.TRADE_VOLUME || 0.01} lots

🎯 *SESSION LOGIC*
🌅 *Asia (00:00-05:00 UTC):* Range formation & liquidity pools
⚡ *London (06:00-12:00 UTC):* Manipulation & distribution  
🗽 *NY (13:00-17:00 UTC):* Continuation & trend following
🌙 *Sydney (22:00-05:00 UTC):* Low volatility consolidation

💡 *Next Update:* Gunakan \`/ictdash\` untuk real-time monitoring`;
    }

    // Helper methods
    getCurrentTradingSession(now) {
        const utcHour = now.getUTCHours();
        if (utcHour >= 22 || utcHour < 5) return 'Sydney/Tokyo Session';
        if (utcHour >= 5 && utcHour < 8) return 'Asia Session';
        if (utcHour >= 8 && utcHour < 13) return 'London Session';
        if (utcHour >= 13 && utcHour < 17) return 'London/NY Overlap';
        if (utcHour >= 17 && utcHour < 22) return 'New York Session';
        return 'Low Volatility';
    }

    getNextScheduledEvent(now) {
        const utcHour = now.getUTCHours();
        const utcMinute = now.getMinutes();
        
        if (utcHour < 5) return `Stage 1 Bias dalam ${5 - utcHour}h ${60 - utcMinute}m`;
        if (utcHour < 6 || (utcHour === 6 && utcMinute < 30)) return `Stage 2A dalam ${Math.ceil((6.5 * 60 - utcHour * 60 - utcMinute) / 60)}h`;
        if (utcHour >= 7 && utcHour < 12) return `Stage 3 check berikutnya dalam ${30 - (utcMinute % 30)}m`;
        if (utcHour < 9) return `Stage 2B dalam ${9 - utcHour}h`;
        if (utcHour < 15) return `EOD Close dalam ${15 - utcHour}h`;
        return 'Sesi berikutnya besok 05:00 UTC';
    }

    async getStageStatuses() {
        const utcHour = new Date().getUTCHours();
        return {
            stage1: utcHour >= 5 ? '✅ Selesai' : '⏳ Menunggu',
            stage2a: utcHour >= 6.5 ? '✅ Selesai' : '⏳ Menunggu', 
            stage3: utcHour >= 7 && utcHour < 12 ? '🚀 Aktif' : utcHour >= 12 ? '✅ Selesai' : '⏳ Menunggu',
            stage2b: utcHour >= 9 ? '✅ Selesai' : '⏳ Menunggu',
            eod: utcHour >= 15 ? '✅ Selesai' : '⏳ Menunggu'
        };
    }

    getSupportedPairs() {
        return process.env.SUPPORTED_PAIRS ? 
            process.env.SUPPORTED_PAIRS.split(',').map(p => p.trim()) : 
            ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD'];
    }

    async getActivePositions() {
        try {
            const brokerHandler = require('./brokerHandler');
            return await brokerHandler.getActivePositions();
        } catch (error) {
            // Mock data untuk development
            return [
                { symbol: 'EURUSD', type: 'BUY', volume: 0.01, price: 1.0850, pnl: 15.50 },
                { symbol: 'GBPUSD', type: 'SELL', volume: 0.01, price: 1.2720, pnl: -8.20 }
            ];
        }
    }

    async getTodayPerformance() {
        try {
            const brokerHandler = require('./brokerHandler');
            return await brokerHandler.getTodayPerformance();
        } catch (error) {
            // Mock data
            return {
                totalProfit: 12.30,
                winRate: 75,
                wins: 3,
                losses: 1,
                totalTrades: 4,
                bestTrade: 25.80
            };
        }
    }

    async getAnalysisProgress() {
        const pairs = this.getSupportedPairs();
        const progress = [];
        
        for (const pair of pairs) {
            try {
                const context = await getContext(pair);
                progress.push([pair, {
                    stage: this.mapStatusToStage(context.status),
                    status: this.formatStatus(context.status)
                }]);
            } catch (error) {
                progress.push([pair, { stage: 'Stage 1', status: '❓ Unknown' }]);
            }
        }
        
        return progress;
    }

    async getMarketSentiment() {
        const pairs = this.getSupportedPairs();
        const sentiment = { bullish: [], bearish: [], neutral: [] };
        
        for (const pair of pairs) {
            try {
                const context = await getContext(pair);
                const bias = context.daily_bias;
                
                if (bias === 'BULLISH') sentiment.bullish.push(pair);
                else if (bias === 'BEARISH') sentiment.bearish.push(pair);
                else sentiment.neutral.push(pair);
            } catch (error) {
                sentiment.neutral.push(pair);
            }
        }
        
        return sentiment;
    }

    getBotStatus() {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        return {
            status: '🟢 Online',
            uptime: `${hours}h ${minutes}m`,
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        };
    }

    async getCacheStatistics() {
        try {
            await this.cacheManager.init();
            return await this.cacheManager.getStatistics();
        } catch (error) {
            return { todayFiles: 0, totalFiles: 0 };
        }
    }

    // Utility methods
    getSessionEmoji(session) {
        if (session.includes('Asia')) return '🌅';
        if (session.includes('London')) return '⚡';
        if (session.includes('NY') || session.includes('New York')) return '🗽';
        if (session.includes('Sydney') || session.includes('Tokyo')) return '🌏';
        return '📊';
    }

    getPositionEmoji(pnl) {
        return pnl > 0 ? '💚' : pnl < 0 ? '💔' : '💛';
    }

    getStageEmoji(stage) {
        if (stage.includes('1')) return '🌅';
        if (stage.includes('2')) return '⚡';
        if (stage.includes('3')) return '🚀';
        return '📊';
    }

    mapStatusToStage(status) {
        if (status === 'PENDING_BIAS') return 'Stage 1';
        if (status === 'PENDING_MANIPULATION') return 'Stage 2';
        if (status === 'PENDING_ENTRY') return 'Stage 3';
        if (status === 'COMPLETE_TRADE_OPENED') return 'Active Trade';
        return 'Stage 1';
    }

    formatStatus(status) {
        const statusMap = {
            'PENDING_BIAS': '⏳ Menunggu Bias',
            'PENDING_MANIPULATION': '⏳ Menunggu Manipulasi',
            'PENDING_ENTRY': '⏳ Mencari Entry',
            'COMPLETE_TRADE_OPENED': '✅ Trade Aktif',
            'COMPLETE_NO_MANIPULATION': '❌ Tidak Ada Manipulasi',
            'COMPLETE_NO_ENTRY': '❌ Tidak Ada Entry'
        };
        return statusMap[status] || '❓ Unknown';
    }
}

module.exports = ICTDashboard;
