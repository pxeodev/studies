#!/usr/bin/env node

/**
 * Shumi Health Check
 *
 * Verifies Shumi configuration and connectivity to help debug issues.
 * Checks all critical components of the Shumi pipeline.
 *
 * Usage:
 *   node scripts/shumi-health-check.js
 */

const path = require('path');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'https://coinrotator-ai.onrender.com';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

console.log('🔍 Shumi Health Check\n');
console.log('='.repeat(60));
console.log('');

// Helper to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 5000
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Check function wrapper
async function check(name, fn) {
  process.stdout.write(`Checking ${name}... `);
  try {
    const result = await fn();
    if (result === true || (result && result.passed)) {
      console.log('✅ PASS');
      return { name, status: 'pass', message: result.message || 'OK' };
    } else {
      console.log('❌ FAIL');
      console.log(`   ${result.message || 'Check failed'}`);
      return { name, status: 'fail', message: result.message || 'Check failed' };
    }
  } catch (error) {
    console.log('❌ FAIL');
    console.log(`   ${error.message}`);
    return { name, status: 'fail', message: error.message };
  }
}

// Main function
async function main() {
  let checks = [];
  let passed = 0;
  let failed = 0;

  // Check 1: Environment Variables
  const check1 = await check('Environment Variables', async () => {
  const required = ['AI_SERVER_URL'];
  const optional = ['VERCEL_TOKEN'];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    return { passed: false, message: `Missing required: ${missing.join(', ')}` };
  }

  const warnings = optional.filter(key => !process.env[key]);
  if (warnings.length > 0) {
    return { passed: true, message: `Optional missing: ${warnings.join(', ')} (not critical)` };
  }

    return true;
  });
  checks.push(check1);
  if (check1.status === 'pass') passed++; else failed++;

  // Check 2: AI Server Connectivity
  const check2 = await check('AI Server Connectivity', async () => {
  try {
    const response = await makeRequest(`${AI_SERVER_URL}/health`, { timeout: 10000 });
    if (response.status === 200) {
      return { passed: true, message: `Server responding (${response.status})` };
    } else {
      return { passed: false, message: `Server returned ${response.status}` };
    }
  } catch (error) {
    if (error.message.includes('timeout')) {
      return { passed: false, message: 'Server timeout - may be down or slow' };
    } else if (error.code === 'ECONNREFUSED') {
      return { passed: false, message: 'Connection refused - server may be down' };
    } else if (error.code === 'ENOTFOUND') {
      return { passed: false, message: 'DNS resolution failed - check AI_SERVER_URL' };
    }
      return { passed: false, message: error.message };
    }
  });
  checks.push(check2);
  if (check2.status === 'pass') passed++; else failed++;

  // Check 3: Socket Server Endpoint
  const check3 = await check('Socket Server Endpoint', async () => {
  try {
    // Try a common socket endpoint (adjust based on your actual endpoints)
    const response = await makeRequest(`${AI_SERVER_URL}/api/health`, { timeout: 10000 });
    if (response.status === 200 || response.status === 404) {
      // 404 is OK - endpoint might not exist, but server is reachable
      return { passed: true, message: `Server reachable (${response.status})` };
    } else {
      return { passed: true, message: `Server responding (${response.status})` };
    }
  } catch (error) {
    if (error.message.includes('timeout')) {
      return { passed: false, message: 'Socket server timeout' };
    }
      return { passed: false, message: error.message };
    }
  });
  checks.push(check3);
  if (check3.status === 'pass') passed++; else failed++;

  // Check 4: Vercel Token (if available)
  if (VERCEL_TOKEN) {
    const check4 = await check('Vercel Token', async () => {
    if (VERCEL_TOKEN && VERCEL_TOKEN.length > 10) {
      return { passed: true, message: 'Token present and looks valid' };
    } else {
        return { passed: false, message: 'Token too short or invalid' };
      }
    });
    checks.push(check4);
    if (check4.status === 'pass') passed++; else failed++;
  } else {
    console.log('Skipping Vercel Token check (not set)');
  }

  // Check 5: Network Connectivity
  const check5 = await check('Network Connectivity', async () => {
  try {
    // Test general internet connectivity
    const response = await makeRequest('https://www.google.com', { timeout: 5000 });
    return { passed: true, message: 'Internet connectivity OK' };
  } catch (error) {
      return { passed: false, message: 'No internet connectivity' };
    }
  });
  checks.push(check5);
  if (check5.status === 'pass') passed++; else failed++;

  // Summary
  console.log('');
console.log('='.repeat(60));
console.log('📊 Summary');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📋 Total:  ${checks.length}`);
console.log('');

if (failed === 0) {
  console.log('🎉 All checks passed! Shumi should be working.');
} else {
  console.log('⚠️  Some checks failed. Review the errors above.');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. Fix failed checks');
  console.log('   2. Check logs: npm run logs:ai');
  console.log('   3. Review SHUMI_DEBUGGING.md for troubleshooting');
}

console.log('');
console.log('Environment Info:');
  console.log(`   AI_SERVER_URL: ${AI_SERVER_URL}`);
  console.log(`   VERCEL_TOKEN: ${VERCEL_TOKEN ? 'Set' : 'Not set'}`);
  console.log('');
}

// Run main function
main().catch(error => {
  console.error('Health check failed:', error);
  process.exit(1);
});
