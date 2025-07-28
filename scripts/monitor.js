#!/usr/bin/env node

/**
 * 🔍 **PTERODACTYL MONITORING SCRIPT**
 * 
 * Script untuk monitoring performance dan health bot di Pterodactyl environment
 * Usage: node monitor.js
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

class PterodactylMonitor {
    constructor() {
        this.startTime = Date.now();
        this.logFile = path.join(__dirname, 'monitoring.log');
        this.metricsFile = path.join(__dirname, 'metrics.json');
    }

    /**
     * 📊 System Metrics Collection
     */
    getSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                external: Math.round(memUsage.external / 1024 / 1024), // MB
                percentage: Math.round((memUsage.rss / os.totalmem()) * 100)
            },
            cpu: {
                user: Math.round(cpuUsage.user / 1000), // ms
                system: Math.round(cpuUsage.system / 1000), // ms
                loadAvg: os.loadavg()
            },
            system: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
                freeMemory: Math.round(os.freemem() / 1024 / 1024) // MB
            }
        };
    }

    /**
     * 📁 Directory Size Checker
     */
    async getDirectorySizes() {
        const directories = [
            'whatsapp-session',
            'daily_context',
            'live_positions', 
            'pending_orders',
            'analysis_cache',
            'journal_data',
            'config'
        ];

        const sizes = {};
        
        for (const dir of directories) {
            const dirPath = path.join(__dirname, dir);
            try {
                if (fs.existsSync(dirPath)) {
                    sizes[dir] = await this.getDirectorySize(dirPath);
                } else {
                    sizes[dir] = 0;
                }
            } catch (error) {
                sizes[dir] = 'ERROR';
            }
        }

        return sizes;
    }

    /**
     * 📏 Calculate directory size recursively
     */
    async getDirectorySize(dirPath) {
        let totalSize = 0;
        
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
                totalSize += await this.getDirectorySize(filePath);
            } else {
                totalSize += stats.size;
            }
        }
        
        return Math.round(totalSize / 1024); // KB
    }

    /**
     * 🔧 Bot Health Check
     */
    checkBotHealth() {
        const health = {
            timestamp: new Date().toISOString(),
            status: 'UNKNOWN',
            checks: {
                configFiles: this.checkConfigFiles(),
                directories: this.checkDirectories(),
                envVariables: this.checkEnvVariables(),
                processes: this.checkProcesses()
            }
        };

        // Determine overall health
        const allChecks = Object.values(health.checks);
        if (allChecks.every(check => check.status === 'OK')) {
            health.status = 'HEALTHY';
        } else if (allChecks.some(check => check.status === 'ERROR')) {
            health.status = 'CRITICAL';
        } else {
            health.status = 'WARNING';
        }

        return health;
    }

    /**
     * 📄 Check config files
     */
    checkConfigFiles() {
        const requiredFiles = [
            'package.json',
            '.env',
            'index.js'
        ];

        const missing = [];
        const present = [];

        for (const file of requiredFiles) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                present.push(file);
            } else {
                missing.push(file);
            }
        }

        return {
            status: missing.length === 0 ? 'OK' : 'ERROR',
            present: present,
            missing: missing
        };
    }

    /**
     * 📁 Check required directories
     */
    checkDirectories() {
        const requiredDirs = [
            'modules',
            'daily_context',
            'config',
            'prompts'
        ];

        const missing = [];
        const present = [];

        for (const dir of requiredDirs) {
            const dirPath = path.join(__dirname, dir);
            if (fs.existsSync(dirPath)) {
                present.push(dir);
            } else {
                missing.push(dir);
            }
        }

        return {
            status: missing.length === 0 ? 'OK' : 'WARNING',
            present: present,
            missing: missing
        };
    }

    /**
     * 🔑 Check environment variables
     */
    checkEnvVariables() {
        const criticalEnvVars = [
            'GEMINI_API_KEY',
            'BROKER_API_KEY',
            'CHART_IMG_KEY_1'
        ];

        const missing = [];
        const present = [];

        for (const envVar of criticalEnvVars) {
            if (process.env[envVar]) {
                present.push(envVar);
            } else {
                missing.push(envVar);
            }
        }

        return {
            status: missing.length === 0 ? 'OK' : 'ERROR',
            present: present,
            missing: missing
        };
    }

    /**
     * ⚙️ Check running processes
     */
    checkProcesses() {
        return {
            status: 'OK',
            pid: process.pid,
            ppid: process.ppid,
            uptime: Math.round(process.uptime()),
            startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
        };
    }

    /**
     * 📊 Generate monitoring report
     */
    async generateReport() {
        const metrics = this.getSystemMetrics();
        const health = this.checkBotHealth();
        const dirSizes = await this.getDirectorySizes();

        const report = {
            generated: new Date().toISOString(),
            metrics: metrics,
            health: health,
            directories: dirSizes,
            summary: {
                overallHealth: health.status,
                memoryUsage: `${metrics.memory.rss}MB (${metrics.memory.percentage}%)`,
                uptime: `${Math.round(metrics.uptime / 60)} minutes`,
                criticalIssues: this.getCriticalIssues(health)
            }
        };

        return report;
    }

    /**
     * 🚨 Get critical issues
     */
    getCriticalIssues(health) {
        const issues = [];

        Object.entries(health.checks).forEach(([checkName, result]) => {
            if (result.status === 'ERROR') {
                if (result.missing && result.missing.length > 0) {
                    issues.push(`${checkName}: Missing ${result.missing.join(', ')}`);
                } else {
                    issues.push(`${checkName}: Error detected`);
                }
            }
        });

        return issues;
    }

    /**
     * 💾 Save metrics to file
     */
    async saveMetrics(report) {
        try {
            fs.writeFileSync(this.metricsFile, JSON.stringify(report, null, 2));
            
            // Append to log file
            const logEntry = `${report.generated} | Health: ${report.summary.overallHealth} | Memory: ${report.summary.memoryUsage} | Uptime: ${report.summary.uptime}\n`;
            fs.appendFileSync(this.logFile, logEntry);
            
        } catch (error) {
            console.error('❌ Failed to save metrics:', error.message);
        }
    }

    /**
     * 🖨️ Print report to console
     */
    printReport(report) {
        console.log('\n🔍 **PTERODACTYL BOT MONITORING REPORT**');
        console.log('=' .repeat(50));
        
        // Health Status
        const healthIcon = {
            'HEALTHY': '✅',
            'WARNING': '⚠️', 
            'CRITICAL': '🚨',
            'UNKNOWN': '❓'
        }[report.summary.overallHealth] || '❓';
        
        console.log(`${healthIcon} **Overall Health**: ${report.summary.overallHealth}`);
        console.log(`⏱️ **Uptime**: ${report.summary.uptime}`);
        console.log(`💾 **Memory Usage**: ${report.summary.memoryUsage}`);
        console.log(`🖥️ **Node.js Version**: ${report.metrics.system.nodeVersion}`);
        
        // Critical Issues
        if (report.summary.criticalIssues.length > 0) {
            console.log('\n🚨 **Critical Issues**:');
            report.summary.criticalIssues.forEach(issue => {
                console.log(`   - ${issue}`);
            });
        }
        
        // Directory Sizes
        console.log('\n📁 **Directory Sizes**:');
        Object.entries(report.directories).forEach(([dir, size]) => {
            if (typeof size === 'number') {
                const sizeStr = size > 1024 ? `${Math.round(size/1024)}MB` : `${size}KB`;
                console.log(`   - ${dir}: ${sizeStr}`);
            } else {
                console.log(`   - ${dir}: ${size}`);
            }
        });
        
        // System Info
        console.log('\n💻 **System Resources**:');
        console.log(`   - Total RAM: ${report.metrics.system.totalMemory}MB`);
        console.log(`   - Free RAM: ${report.metrics.system.freeMemory}MB`);
        console.log(`   - Platform: ${report.metrics.system.platform} ${report.metrics.system.arch}`);
        
        console.log('\n' + '=' .repeat(50));
        console.log(`📊 Report generated: ${report.generated}`);
        console.log(`💾 Saved to: ${this.metricsFile}`);
        console.log(`📝 Log: ${this.logFile}`);
    }

    /**
     * 🏃 Run monitoring
     */
    async run() {
        try {
            console.log('🔍 Generating monitoring report...');
            
            const report = await this.generateReport();
            await this.saveMetrics(report);
            this.printReport(report);
            
            // Recommendations
            this.printRecommendations(report);
            
        } catch (error) {
            console.error('❌ Monitoring failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * 💡 Print recommendations
     */
    printRecommendations(report) {
        console.log('\n💡 **RECOMMENDATIONS**:');
        
        // Memory recommendations
        if (report.metrics.memory.percentage > 80) {
            console.log('⚠️ High memory usage detected. Consider:');
            console.log('   - Increasing Pterodactyl memory allocation');
            console.log('   - Adding --max-old-space-size=512 to NODE_ARGS');
        }
        
        // Uptime recommendations
        if (report.metrics.uptime < 300) { // 5 minutes
            console.log('⚠️ Frequent restarts detected. Check:');
            console.log('   - Pterodactyl logs for crash reasons');
            console.log('   - Memory limits and CPU allocation');
            console.log('   - Environment variable configuration');
        }
        
        // Directory size recommendations
        const totalDirSize = Object.values(report.directories)
            .filter(size => typeof size === 'number')
            .reduce((a, b) => a + b, 0);
            
        if (totalDirSize > 100 * 1024) { // 100MB
            console.log('⚠️ Large directory sizes detected. Consider:');
            console.log('   - Cleaning old analysis cache');
            console.log('   - Archiving old journal data');
            console.log('   - Log rotation setup');
        }
        
        // Health recommendations
        if (report.summary.overallHealth !== 'HEALTHY') {
            console.log('🚨 Health issues detected. Priority actions:');
            report.summary.criticalIssues.forEach(issue => {
                console.log(`   - Fix: ${issue}`);
            });
        }
    }
}

// 🚀 Run monitoring if called directly
if (require.main === module) {
    const monitor = new PterodactylMonitor();
    monitor.run().catch(console.error);
}

module.exports = PterodactylMonitor;
