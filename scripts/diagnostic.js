#!/usr/bin/env node
/**
 * 🩺 ICT BOT DIAGNOSTIC & RESTART FIX
 * Comprehensive diagnostic tool untuk mengatasi masalah restart
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

class BotDiagnostic {
    constructor() {
        this.issues = [];
        this.fixes = [];
    }

    log(message, type = 'info') {
        const prefix = {
            'info': '📋',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌',
            'fix': '🔧'
        };
        console.log(`${prefix[type]} ${message}`);
    }

    addIssue(issue) {
        this.issues.push(issue);
        this.log(issue, 'error');
    }

    addFix(fix) {
        this.fixes.push(fix);
        this.log(fix, 'fix');
    }

    /**
     * 1. Check Environment Variables
     */
    checkEnvironmentVariables() {
        this.log('\n🔍 Checking Environment Variables...', 'info');
        
        const requiredVars = [
            'BROKER_API_BASE_URL',
            'BROKER_API_KEY',
            'GEMINI_API_KEY',
            'MY_WHATSAPP_ID',
            'SUPPORTED_PAIRS'
        ];

        let allVarsOk = true;
        requiredVars.forEach(varName => {
            if (!process.env[varName]) {
                this.addIssue(`Missing environment variable: ${varName}`);
                allVarsOk = false;
            } else {
                this.log(`${varName}: ✓`, 'success');
            }
        });

        if (allVarsOk) {
            this.log('All required environment variables present', 'success');
        } else {
            this.addFix('Add missing environment variables to .env file');
        }
    }

    /**
     * 2. Check File Dependencies
     */
    checkFileDependencies() {
        this.log('\n🔍 Checking File Dependencies...', 'info');
        
        const requiredFiles = [
            'package.json',
            'index.js',
            '.env',
            'modules/whatsappClient.js',
            'modules/brokerHandler.js',
            'modules/logger.js'
        ];

        const requiredDirs = [
            'modules',
            'config',
            'pending_orders',
            'live_positions'
        ];

        let allFilesOk = true;
        
        // Check files
        requiredFiles.forEach(file => {
            const filePath = path.join(__dirname, file);
            if (!fs.existsSync(filePath)) {
                this.addIssue(`Missing required file: ${file}`);
                allFilesOk = false;
            } else {
                this.log(`${file}: ✓`, 'success');
            }
        });

        // Check directories
        requiredDirs.forEach(dir => {
            const dirPath = path.join(__dirname, dir);
            if (!fs.existsSync(dirPath)) {
                this.addIssue(`Missing required directory: ${dir}`);
                allFilesOk = false;
                // Auto-create directories
                try {
                    fs.mkdirSync(dirPath, { recursive: true });
                    this.addFix(`Created missing directory: ${dir}`);
                } catch (error) {
                    this.addIssue(`Failed to create directory ${dir}: ${error.message}`);
                }
            } else {
                this.log(`${dir}/: ✓`, 'success');
            }
        });

        if (allFilesOk) {
            this.log('All required files and directories present', 'success');
        }
    }

    /**
     * 3. Check API Connectivity
     */
    async checkApiConnectivity() {
        this.log('\n🔍 Checking API Connectivity...', 'info');
        
        try {
            const axios = require('axios');
            
            // Test broker API
            const brokerUrl = process.env.BROKER_API_BASE_URL;
            const brokerKey = process.env.BROKER_API_KEY;
            
            if (brokerUrl && brokerKey) {
                try {
                    const response = await axios.get(`${brokerUrl}/get_positions`, {
                        headers: { 'X-API-Key': brokerKey },
                        timeout: 5000
                    });
                    this.log('Broker API connection: ✓', 'success');
                } catch (error) {
                    this.addIssue(`Broker API connection failed: ${error.message}`);
                    this.addFix('Check BROKER_API_BASE_URL and BROKER_API_KEY in .env');
                }
            }
            
        } catch (error) {
            this.addIssue(`API connectivity check failed: ${error.message}`);
        }
    }

    /**
     * 4. Check Memory and Resources
     */
    checkResources() {
        this.log('\n🔍 Checking System Resources...', 'info');
        
        const memUsage = process.memoryUsage();
        const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        
        this.log(`Memory usage: ${memUsedMB} MB`, 'info');
        
        if (memUsedMB > 500) {
            this.addIssue('High memory usage detected');
            this.addFix('Consider restarting the bot or checking for memory leaks');
        } else {
            this.log('Memory usage normal', 'success');
        }
    }

    /**
     * 5. Fix Restart Loop
     */
    fixRestartLoop() {
        this.log('\n🔧 Fixing Restart Loop...', 'info');
        
        // Clear restart statistics
        const restartCountFile = path.join(__dirname, '.restart_count');
        if (fs.existsSync(restartCountFile)) {
            fs.unlinkSync(restartCountFile);
            this.addFix('Cleared restart statistics');
        }
        
        // Create startup flag
        const startupFlagPath = path.join(__dirname, '.startup_flag');
        fs.writeFileSync(startupFlagPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            action: 'diagnostic_fix_applied',
            note: 'Clean restart after diagnostic'
        }, null, 2));
        this.addFix('Created startup flag for clean restart');
    }

    /**
     * 6. Generate Diagnostic Report
     */
    generateReport() {
        this.log('\n📋 DIAGNOSTIC REPORT', 'info');
        this.log('===================', 'info');
        
        if (this.issues.length === 0) {
            this.log('✅ No issues detected - bot should run normally', 'success');
        } else {
            this.log(`❌ Found ${this.issues.length} issue(s):`, 'error');
            this.issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        }
        
        if (this.fixes.length > 0) {
            this.log(`\n🔧 Applied ${this.fixes.length} fix(es):`, 'fix');
            this.fixes.forEach((fix, index) => {
                console.log(`   ${index + 1}. ${fix}`);
            });
        }
        
        this.log('\n🚀 NEXT STEPS:', 'info');
        this.log('=============', 'info');
        this.log('1. Restart the Pterodactyl server', 'info');
        this.log('2. Monitor the logs for the first few minutes', 'info');
        this.log('3. Check if WhatsApp QR code appears', 'info');
        this.log('4. Verify no immediate errors in console', 'info');
        
        if (this.issues.length > 0) {
            this.log('\n⚠️ If restart loop continues, manually fix the issues above', 'warning');
        }
    }

    /**
     * Run full diagnostic
     */
    async runDiagnostic() {
        this.log('🩺 ICT Bot Comprehensive Diagnostic', 'info');
        this.log('===================================\n', 'info');
        
        this.checkEnvironmentVariables();
        this.checkFileDependencies();
        await this.checkApiConnectivity();
        this.checkResources();
        this.fixRestartLoop();
        this.generateReport();
    }
}

// Run diagnostic
if (require.main === module) {
    const diagnostic = new BotDiagnostic();
    diagnostic.runDiagnostic().catch(console.error);
}

module.exports = BotDiagnostic;
