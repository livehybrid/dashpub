#!/usr/bin/env node

/*
 * Test Script for Template App
 * 
 * This script helps test the template app locally using the stub Splunk service.
 */

import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testTemplate() {
    console.log('🧪 Testing Template App with Stub Splunk Service');
    console.log('');

    // Check if stub service is running
    try {
        const response = await fetch('http://localhost:8089/services/server/info');
        if (response.ok) {
            console.log('✅ Stub Splunk service is running');
        } else {
            console.log('❌ Stub Splunk service is not responding');
            console.log('   Start it with: npm run test:splunk');
            return;
        }
    } catch (error) {
        console.log('❌ Stub Splunk service is not running');
        console.log('   Start it with: npm run test:splunk');
        return;
    }

    // Create test directory
    const testDir = path.join(process.cwd(), 'test-template-app');
    
    if (await fs.pathExists(testDir)) {
        console.log('🗑️  Removing existing test directory...');
        await fs.remove(testDir);
    }

    console.log('📁 Creating test directory...');
    await fs.ensureDir(testDir);

    // Copy template
    console.log('📋 Copying template...');
    await fs.copy(path.join(process.cwd(), 'template'), testDir);

    // Copy test dashboard definition
    console.log('📊 Setting up test dashboard...');
    const testDashboardPath = path.join(process.cwd(), 'cli/test-dashboard.json');
    await fs.copy(testDashboardPath, path.join(testDir, 'package.json'));

    // Create frontend config
    console.log('⚙️  Creating frontend configuration...');
    const configPath = path.join(testDir, 'src/config.js');
    const configContent = `// Test configuration
export const config = {
    title: 'Test Dashboards',
    screenshots: true,
    screenshotDir: 'screenshots',
    screenshotExt: 'png',
    theme: 'light',
    footer: 'Test Splunk Dashboards',
    hostedBy: 'DashPub Test',
    hostedByUrl: '#',
    repo: 'https://github.com/livehybrid/dashpub',
    vercelUrl: ''
};

export default config;
`;
    await fs.writeFile(configPath, configContent, 'utf8');

    // Create .env file
    console.log('🔐 Creating environment file...');
    const envContent = `SPLUNKD_URL=http://localhost:8089
SPLUNKD_USER=admin
SPLUNKD_PASSWORD=changeme
DASHPUB_APP=search
DASHPUB_DASHBOARDS=test_dashboard,sample_dashboard
DASHPUB_SCREENSHOTS=true
DASHPUB_SCREENSHOT_DIR=screenshots
DASHPUB_SCREENSHOT_EXT=png
`;
    await fs.writeFile(path.join(testDir, '.env'), envContent, 'utf8');

    // Install dependencies
    console.log('📦 Installing dependencies...');
    try {
        await execAsync('npm install', { cwd: testDir });
        console.log('✅ Dependencies installed');
    } catch (error) {
        console.log('❌ Failed to install dependencies:', error.message);
        return;
    }

    // Build the app
    console.log('🔨 Building the app...');
    try {
        await execAsync('npm run build', { cwd: testDir });
        console.log('✅ App built successfully');
    } catch (error) {
        console.log('❌ Build failed:', error.message);
        return;
    }

    console.log('');
    console.log('🎉 Template app test setup complete!');
    console.log('');
    console.log('📁 Test app location:', testDir);
    console.log('🚀 To run the app:');
    console.log(`   cd ${testDir}`);
    console.log('   npm run start');
    console.log('');
    console.log('🌐 The app will be available at: http://localhost:3000');
    console.log('📊 Test dashboards: test_dashboard, sample_dashboard');
    console.log('');
    console.log('💡 Make sure the stub Splunk service is running:');
    console.log('   npm run test:splunk');
}

// Run the test
testTemplate().catch(console.error);
