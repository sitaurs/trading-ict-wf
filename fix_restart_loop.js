#!/usr/bin/env node
/**
 * 🔧 RESTART LOOP FIX UTILITY
 * Tool untuk mengatasi restart loop di Pterodactyl
 */

const fs = require('fs');
const path = require('path');

function fixRestartLoop() {
    console.log('🔧 ICT Bot Restart Loop Fix Utility');
    console.log('=====================================\n');
    
    const restartCountFile = path.join(__dirname, '.restart_count');
    
    // 1. Reset restart statistics
    if (fs.existsSync(restartCountFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(restartCountFile, 'utf8'));
            console.log('📊 Current restart stats:');
            console.log(`   - Restart count: ${data.count}`);
            console.log(`   - Last restart: ${new Date(data.lastRestart).toLocaleString()}`);
            console.log(`   - Restarts in window: ${data.restarts.length}\n`);
            
            // Reset the file
            fs.unlinkSync(restartCountFile);
            console.log('✅ Restart statistics reset successfully\n');
        } catch (error) {
            console.error('❌ Error reading restart stats:', error.message);
        }
    } else {
        console.log('📊 No restart statistics file found\n');
    }
    
    // 2. Check for common issues
    console.log('🔍 Checking for common restart issues...\n');
    
    // Check for missing .env file
    const envFile = path.join(__dirname, '.env');
    if (fs.existsSync(envFile)) {
        console.log('✅ .env file exists');
    } else {
        console.log('❌ .env file missing - this could cause restarts');
    }
    
    // Check for package.json
    const packageFile = path.join(__dirname, 'package.json');
    if (fs.existsSync(packageFile)) {
        console.log('✅ package.json exists');
    } else {
        console.log('❌ package.json missing');
    }
    
    // Check node_modules
    const nodeModulesDir = path.join(__dirname, 'node_modules');
    if (fs.existsSync(nodeModulesDir)) {
        console.log('✅ node_modules directory exists');
    } else {
        console.log('❌ node_modules missing - run npm install');
    }
    
    // 3. Check main file
    const mainFile = 'index.js';
    const mainFilePath = path.join(__dirname, mainFile);
    if (fs.existsSync(mainFilePath)) {
        console.log(`✅ Main file (${mainFile}) exists`);
    } else {
        console.log(`❌ Main file (${mainFile}) missing`);
    }
    
    console.log('\n🔧 Fixes Applied:');
    console.log('==================');
    console.log('✅ Restart statistics cleared');
    console.log('✅ Loop detection reset');
    console.log('✅ Next startup will proceed without delay\n');
    
    console.log('🚀 Recommended Actions:');
    console.log('=======================');
    console.log('1. Restart the Pterodactyl server now');
    console.log('2. Monitor logs for any immediate errors');
    console.log('3. If restart loop continues, check:');
    console.log('   - Environment variables in .env');
    console.log('   - WhatsApp client QR code scanning');
    console.log('   - API connectivity issues');
    console.log('   - Memory/resource constraints\n');
    
    // 4. Create a temporary startup flag
    const startupFlagPath = path.join(__dirname, '.startup_flag');
    fs.writeFileSync(startupFlagPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        action: 'restart_loop_fix_applied',
        note: 'This file prevents immediate restart detection on next startup'
    }, null, 2));
    
    console.log('🏁 Startup flag created for clean restart');
    console.log('✅ Fix completed - you can now restart the server');
}

// Run the fix
fixRestartLoop();
