#!/usr/bin/env node

/**
 * 🔄 **PTERODACTYL AUTO-RESTART HANDLER**
 * 
 * Script untuk menangani graceful restart dan recovery di Pterodactyl
 * Mengatasi restart loop dan memastikan bot tetap stabil
 */

const fs = require('fs');
const path = require('path');

class RestartHandler {
    constructor() {
        this.restartCountFile = path.join(__dirname, '.restart_count');
        this.maxRestarts = 5;
        this.restartWindow = 5 * 60 * 1000; // 5 minutes
        this.gracefulShutdownTimeout = 30000; // 30 seconds
    }

    /**
     * 📊 Get restart statistics
     */
    getRestartStats() {
        try {
            if (fs.existsSync(this.restartCountFile)) {
                const data = JSON.parse(fs.readFileSync(this.restartCountFile, 'utf8'));
                return data;
            }
        } catch (error) {
            console.log('📊 No restart history found, starting fresh');
        }
        
        return {
            count: 0,
            lastRestart: null,
            restarts: []
        };
    }

    /**
     * 💾 Save restart statistics
     */
    saveRestartStats(stats) {
        try {
            fs.writeFileSync(this.restartCountFile, JSON.stringify(stats, null, 2));
        } catch (error) {
            console.error('❌ Failed to save restart stats:', error.message);
        }
    }

    /**
     * 📈 Record restart attempt
     */
    recordRestart() {
        const stats = this.getRestartStats();
        const now = Date.now();
        
        // Clean old restarts outside the window
        const windowStart = now - this.restartWindow;
        stats.restarts = stats.restarts.filter(timestamp => timestamp > windowStart);
        
        // Add current restart
        stats.restarts.push(now);
        stats.count = stats.restarts.length;
        stats.lastRestart = now;
        
        this.saveRestartStats(stats);
        return stats;
    }

    /**
     * 🚨 Check if restart loop detected
     */
    isRestartLoop() {
        const stats = this.getRestartStats();
        
        if (stats.restarts.length >= this.maxRestarts) {
            const timeSpan = Math.max(...stats.restarts) - Math.min(...stats.restarts);
            if (timeSpan < this.restartWindow) {
                return {
                    detected: true,
                    count: stats.restarts.length,
                    timeSpan: Math.round(timeSpan / 1000),
                    recommendation: 'Restart loop detected - implementing delay'
                };
            }
        }
        
        return { detected: false };
    }

    /**
     * ⏱️ Calculate restart delay
     */
    calculateRestartDelay() {
        const stats = this.getRestartStats();
        const loopCheck = this.isRestartLoop();
        
        if (loopCheck.detected) {
            // Exponential backoff: 30s, 60s, 120s, 300s, 600s
            const delays = [30, 60, 120, 300, 600]; // seconds
            const delayIndex = Math.min(stats.count - 1, delays.length - 1);
            return delays[delayIndex] * 1000; // milliseconds
        }
        
        return 0; // No delay needed
    }

    /**
     * 🛡️ Implement graceful shutdown
     */
    setupGracefulShutdown() {
        const gracefulShutdown = (signal) => {
            console.log(`\n🛡️ Received ${signal}, initiating graceful shutdown...`);
            
            const shutdownTimeout = setTimeout(() => {
                console.log('⚠️ Graceful shutdown timeout, forcing exit');
                process.exit(1);
            }, this.gracefulShutdownTimeout);
            
            // Cleanup operations
            this.performCleanup().then(() => {
                clearTimeout(shutdownTimeout);
                console.log('✅ Graceful shutdown completed');
                process.exit(0);
            }).catch((error) => {
                console.error('❌ Cleanup error:', error.message);
                clearTimeout(shutdownTimeout);
                process.exit(1);
            });
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('🚨 Uncaught Exception:', error);
            this.recordRestart();
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
            this.recordRestart();
            gracefulShutdown('UNHANDLED_REJECTION');
        });
    }

    /**
     * 🧹 Perform cleanup operations
     */
    async performCleanup() {
        console.log('🧹 Performing cleanup operations...');
        
        try {
            // Save any pending data
            const pendingOrdersDir = path.join(__dirname, 'pending_orders');
            const livePositionsDir = path.join(__dirname, 'live_positions');
            
            // Ensure directories exist and are writable
            [pendingOrdersDir, livePositionsDir].forEach(dir => {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            });
            
            // Close any open file handles
            // WhatsApp client will handle its own cleanup
            
            console.log('✅ Cleanup completed successfully');
            
        } catch (error) {
            console.error('❌ Cleanup error:', error.message);
            throw error;
        }
    }

    /**
     * 🔧 Initialize restart protection
     */
    async initialize() {
        console.log('🔧 Initializing restart protection...');
        
        // Record this startup
        const stats = this.recordRestart();
        const loopCheck = this.isRestartLoop();
        
        console.log(`📊 Restart Stats: ${stats.count} restarts in last 5 minutes`);
        
        if (loopCheck.detected) {
            const delay = this.calculateRestartDelay();
            console.log(`🚨 ${loopCheck.recommendation}`);
            console.log(`⏱️ Implementing ${delay/1000}s startup delay...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            console.log('✅ Startup delay completed, proceeding...');
        }
        
        // Setup graceful shutdown handlers
        this.setupGracefulShutdown();
        
        console.log('🛡️ Restart protection initialized');
    }

    /**
     * 💊 Health check for restart handler
     */
    healthCheck() {
        const stats = this.getRestartStats();
        const loopCheck = this.isRestartLoop();
        
        return {
            timestamp: new Date().toISOString(),
            restartCount: stats.count,
            lastRestart: stats.lastRestart ? new Date(stats.lastRestart).toISOString() : null,
            loopDetected: loopCheck.detected,
            status: loopCheck.detected ? 'WARNING' : 'OK',
            uptime: process.uptime(),
            pid: process.pid
        };
    }

    /**
     * 🧪 Test restart protection
     */
    static testRestartProtection() {
        const handler = new RestartHandler();
        
        console.log('🧪 Testing restart protection...');
        
        // Simulate multiple restarts
        for (let i = 0; i < 6; i++) {
            const stats = handler.recordRestart();
            const loopCheck = handler.isRestartLoop();
            const delay = handler.calculateRestartDelay();
            
            console.log(`Restart ${i + 1}: Count=${stats.count}, Loop=${loopCheck.detected}, Delay=${delay/1000}s`);
        }
        
        console.log('✅ Test completed');
    }
}

// 🚀 Auto-initialize if this is the main module
if (require.main === module) {
    const handler = new RestartHandler();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--test')) {
        RestartHandler.testRestartProtection();
    } else if (args.includes('--health')) {
        console.log(JSON.stringify(handler.healthCheck(), null, 2));
    } else if (args.includes('--reset')) {
        const restartCountFile = path.join(__dirname, '.restart_count');
        if (fs.existsSync(restartCountFile)) {
            fs.unlinkSync(restartCountFile);
            console.log('✅ Restart statistics reset');
        }
    } else {
        handler.initialize().catch(console.error);
    }
}

module.exports = RestartHandler;
