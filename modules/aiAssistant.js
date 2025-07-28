/**
 * 🤖 ICT AI Assistant dengan Gemini 2.5 Pro + Full Context Awareness
 * Fitur /ask untuk chat dengan AI yang memahami seluruh context bot
 */

const { getLogger } = require('./logger');
const { getContext } = require('./contextManager');
const { loadAnalysisCache } = require('./analysisHandler');
const path = require('path');
const fs = require('fs').promises;

const log = getLogger('AIAssistant');

class ICTAIAssistant {
    constructor() {
        this.log = log;
    }

    async handleAskCommand(question, whatsappSocket, chatId) {
        try {
            this.log.info('🤖 Processing AI assistant request', { 
                question: question.substring(0, 100),
                chatId: chatId.split('@')[0] 
            });
            
            // Kirim typing indicator
            await whatsappSocket.sendMessage(chatId, { 
                text: "🤖 *Gemini 2.5 Pro* sedang menganalisis pertanyaan Anda...\n⏳ Mengumpulkan context bot..." 
            });

            // Gather full context
            const fullContext = await this.gatherFullContext();
            
            // Build enhanced prompt
            const prompt = await this.buildContextAwarePrompt(question, fullContext);
            
            // Call Gemini 2.5 Pro
            const response = await this.callGeminiWithContext(prompt);
            
            // Format response
            const formattedResponse = this.formatAIResponse(response, question, fullContext);
            
            await whatsappSocket.sendMessage(chatId, { text: formattedResponse });
            
            this.log.info('✅ AI Assistant response sent', { 
                responseLength: response.length,
                contextPairs: Object.keys(fullContext.dailyContext || {}).length
            });
            
        } catch (error) {
            this.log.error('❌ AI Assistant error:', error);
            await whatsappSocket.sendMessage(chatId, { 
                text: "❌ Maaf, terjadi error pada AI Assistant.\n\n💡 *Coba lagi:*\n• `/ask apa status EURUSD?`\n• `/ask jelaskan PO3 strategy`\n• `/ask berapa profit hari ini?`" 
            });
        }
    }

    async gatherFullContext() {
        const context = {};
        
        try {
            // 1. Daily Context semua pairs
            const pairs = process.env.SUPPORTED_PAIRS ? 
                process.env.SUPPORTED_PAIRS.split(',').map(p => p.trim()) : 
                ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD'];
                
            context.dailyContext = {};
            context.analysisCache = {};
            
            for (const pair of pairs) {
                try {
                    context.dailyContext[pair] = await getContext(pair);
                    
                    // Get analysis cache for this pair
                    context.analysisCache[pair] = {};
                    for (let stage = 1; stage <= 3; stage++) {
                        try {
                            const narrative = await loadAnalysisCache(pair, stage);
                            if (narrative) {
                                context.analysisCache[pair][`stage${stage}`] = {
                                    narrative: narrative.substring(0, 500) + '...', // Truncate untuk prompt
                                    length: narrative.length
                                };
                            }
                        } catch (error) {
                            // Silent fail untuk cache
                        }
                    }
                } catch (error) {
                    this.log.warn(`Failed to get context for ${pair}:`, error.message);
                }
            }
            
            // 2. Active Positions (mock untuk development)
            try {
                const brokerHandler = require('./brokerHandler');
                context.activePositions = await brokerHandler.getActivePositions();
                context.todayProfit = await brokerHandler.getTodaysProfit();
            } catch (error) {
                this.log.warn('Failed to get broker data:', error.message);
                context.activePositions = [];
                context.todayProfit = 0;
            }
            
            // 3. Current Time & Session
            const now = new Date();
            context.currentTime = {
                wib: now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                utc: now.toLocaleString('en-US', { timeZone: 'UTC' }),
                session: this.getCurrentSession(now),
                nextSchedule: this.getNextSchedule(now)
            };
            
            // 4. Bot Status
            context.botStatus = {
                uptime: this.formatUptime(process.uptime()),
                memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                supportedPairs: pairs,
                version: 'ICT Bot v3.2.0 Enhanced'
            };
            
            return context;
            
        } catch (error) {
            this.log.error('Error gathering context:', error);
            return { error: 'Failed to gather context', timestamp: new Date().toISOString() };
        }
    }

    getCurrentSession(now) {
        const utcHour = now.getUTCHours();
        if (utcHour >= 22 || utcHour < 5) return 'Sydney/Tokyo Session';
        if (utcHour >= 5 && utcHour < 8) return 'Asia Session (Range Formation)';
        if (utcHour >= 8 && utcHour < 13) return 'London Session (Manipulation)';
        if (utcHour >= 13 && utcHour < 17) return 'London/NY Overlap (Distribution)';
        if (utcHour >= 17 && utcHour < 22) return 'New York Session';
        return 'Low Volatility Period';
    }

    getNextSchedule(now) {
        const utcHour = now.getUTCHours();
        const utcMinute = now.getMinutes();
        
        // Stage 1: 05:00 UTC (12:00 WIB)
        if (utcHour < 5) return `Stage 1 Bias Analysis dalam ${5 - utcHour} jam`;
        
        // Stage 2A: 06:30 UTC (13:30 WIB)  
        if (utcHour < 6 || (utcHour === 6 && utcMinute < 30)) {
            const minutesLeft = utcHour < 6 ? (6 - utcHour) * 60 + (30 - utcMinute) : 30 - utcMinute;
            return `Stage 2A Manipulation dalam ${Math.ceil(minutesLeft / 60)} jam`;
        }
        
        // Stage 3: 07:00-12:00 UTC (14:00-19:00 WIB)
        if (utcHour >= 7 && utcHour < 12) {
            const nextHour = utcHour + 1;
            return `Stage 3 Entry Check berikutnya: ${nextHour}:00 UTC`;
        }
        
        // Stage 2B: 09:00 UTC (16:00 WIB)
        if (utcHour < 9) return `Stage 2B Late Manipulation dalam ${9 - utcHour} jam`;
        
        // EOD: 15:00 UTC (22:00 WIB)
        if (utcHour < 15) return `EOD Force Close dalam ${15 - utcHour} jam`;
        
        return 'Menunggu sesi trading berikutnya (besok 05:00 UTC)';
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    async buildContextAwarePrompt(question, fullContext) {
        const activePairs = Object.keys(fullContext.dailyContext || {});
        const analysisSummary = activePairs.map(pair => {
            const ctx = fullContext.dailyContext[pair];
            const cache = fullContext.analysisCache[pair];
            
            return `${pair}:
- Status: ${ctx.status || 'N/A'}
- Bias: ${ctx.daily_bias || 'N/A'}
- Asia Range: ${ctx.asia_low || 'N/A'} - ${ctx.asia_high || 'N/A'}
- Manipulasi: ${ctx.manipulation_detected ? 'TERDETEKSI' : 'BELUM'}
- Analysis Cache: ${Object.keys(cache || {}).join(', ') || 'None'}`;
        }).join('\n\n');

        return `Anda adalah AI Assistant untuk ICT Trading Bot yang menggunakan strategi Power of Three (PO3).

KONTEKS BOT SAAT INI:
====================

WAKTU & SESI:
- WIB: ${fullContext.currentTime.wib}
- UTC: ${fullContext.currentTime.utc}  
- Sesi Trading: ${fullContext.currentTime.session}
- Schedule Berikutnya: ${fullContext.currentTime.nextSchedule}

ANALISIS PAIRS HARI INI:
${analysisSummary}

POSISI AKTIF:
${fullContext.activePositions.length > 0 ? 
  fullContext.activePositions.map(pos => `- ${pos.symbol}: ${pos.type} ${pos.volume} lots @ ${pos.price} (P&L: ${pos.pnl})`).join('\n') : 
  '- Tidak ada posisi aktif'}

PERFORMANCE:
- Profit Hari Ini: $${fullContext.todayProfit}
- Bot Uptime: ${fullContext.botStatus.uptime}
- Memory Usage: ${fullContext.botStatus.memoryUsage}MB

KEMAMPUAN ANDA:
===============
1. Menjawab pertanyaan tentang status trading bot & analisis
2. Menjelaskan konsep ICT/PO3 dengan detail dan contoh praktis  
3. Memberikan insight market berdasarkan data context bot
4. Membantu troubleshooting dan optimasi performa
5. Menjelaskan decision making process setiap stage
6. Analisis performa dan risk management suggestions
7. Prediksi market berdasarkan current analysis

PERTANYAAN USER:
================
${question}

INSTRUKSI RESPONSE:
==================
- Berikan jawaban yang informatif, actionable, dan professional
- Gunakan data konteks bot untuk analisis yang spesifik
- Format dengan emoji dan structure yang rapi untuk WhatsApp
- Jika butuh data yang tidak tersedia, jelaskan dengan suggestion
- Berikan rekomendasi praktis dan next actions jika relevan
- Maksimal 4096 karakter untuk WhatsApp compatibility
- Gunakan format markdown untuk emphasis (*bold*, _italic_)
- Sertakan confidence level jika memberikan prediksi`;
    }

    async callGeminiWithContext(prompt) {
        try {
            // Import callGeminiPro dari analysisHandler
            const { callGeminiPro } = require('./analysisHandler');
            return await callGeminiPro(prompt, []);
        } catch (error) {
            this.log.error('Failed to call Gemini Pro:', error);
            throw new Error('AI service temporarily unavailable');
        }
    }

    formatAIResponse(response, question, context) {
        const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const sessionEmoji = this.getSessionEmoji(context.currentTime.session);
        
        // Truncate question jika terlalu panjang
        const shortQuestion = question.length > 80 ? question.substring(0, 77) + '...' : question;
        
        return `🤖 *AI ASSISTANT RESPONSE*

❓ *Q:* ${shortQuestion}

${response}

─────────────────────────────
${sessionEmoji} *Market:* ${context.currentTime.session}
⏰ *Time:* ${timestamp}
🚀 *Powered by:* Gemini 2.5 Pro + ICT Context

💡 *More questions?* \`/ask [your question]\`
📊 *Dashboard:* \`/ictdash\``;
    }

    getSessionEmoji(session) {
        if (session.includes('Asia')) return '🌅';
        if (session.includes('London')) return '⚡';
        if (session.includes('NY') || session.includes('New York')) return '🗽';
        if (session.includes('Sydney') || session.includes('Tokyo')) return '🌏';
        return '📊';
    }
}

module.exports = ICTAIAssistant;
