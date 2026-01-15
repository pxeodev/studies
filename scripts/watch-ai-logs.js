#!/usr/bin/env node

/**
 * Vercel AI Logs Stream Watcher
 *
 * Streams live runtime logs from Vercel for /api/ai endpoint.
 * This tool is designed for debugging - start it, then reproduce your issue.
 *
 * Usage:
 *   node scripts/watch-ai-logs.js
 *   npm run logs:ai:watch
 *
 * The script will:
 * 1. Stream logs in real-time from production (coinrotator.app)
 * 2. Filter and highlight /api/ai requests
 * 3. Show errors in red for easy identification
 * 4. Auto-reconnect if the stream ends
 */

const { Vercel } = require('@vercel/sdk');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Hardcoded Vercel token with team access (never expires)
// Team members can override by setting VERCEL_TOKEN in .env
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'Usymim4b5fEzzddcfFoG5KGu';
const PROJECT_ID = 'coinrotator';
const TEAM_ID = 'team_R8L6VvvVL6jbrjElVFXnSkim';

// Initialize Vercel SDK
const vercel = new Vercel({
  bearerToken: VERCEL_TOKEN,
});

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

// Format timestamp to local time
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 2,
    hour12: false,
  });
}

// Check if log line is related to /api/ai
function isAILog(logLine) {
  const text = logLine.message || logLine.text || JSON.stringify(logLine);
  return text.includes('/api/ai') || text.includes('api/ai');
}

// Check if log line contains an error
function isError(logLine) {
  const text = (logLine.message || logLine.text || JSON.stringify(logLine)).toLowerCase();
  return (
    logLine.level === 'error' ||
    text.includes('error') ||
    text.includes('failed') ||
    text.includes('exception') ||
    text.includes('warning')
  );
}

// Display a log line with formatting
function displayLog(logLine) {
  const timestamp = formatTimestamp(logLine.timestamp || Date.now());
  const message = logLine.message || logLine.text || JSON.stringify(logLine);

  // Determine color based on content
  let color = colors.reset;
  let prefix = 'ℹ️ ';

  if (isError(logLine)) {
    color = colors.red;
    prefix = '❌ ';
  } else if (isAILog(logLine)) {
    color = colors.blue;
    prefix = '🤖 ';
  }

  console.log(`${colors.gray}${timestamp}${colors.reset} ${color}${prefix}${message}${colors.reset}`);
}

// Stream logs from Vercel
async function streamLogs() {
  try {
    console.log(`${colors.green}🎬 Starting Vercel runtime logs stream...${colors.reset}\n`);
    console.log(`${colors.blue}📦 Project:${colors.reset} ${PROJECT_ID}`);
    console.log(`${colors.blue}👥 Team:${colors.reset} ${TEAM_ID}`);
    console.log(`${colors.blue}🔍 Watching for:${colors.reset} /api/ai requests\n`);
    console.log(`${colors.yellow}💡 Tip: Reproduce your issue now, and the error will appear here${colors.reset}`);
    console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    // Get runtime logs stream
    const result = await vercel.logs.getRuntimeLogs({
      projectId: PROJECT_ID,
      teamId: TEAM_ID,
    });

    // Handle the stream - Vercel SDK returns an async iterable
    if (result && typeof result[Symbol.asyncIterator] === 'function') {
      // It's an async iterable stream
      for await (const logEntry of result) {
        // Filter and display /api/ai logs
        if (isAILog(logEntry) || isError(logEntry)) {
          displayLog(logEntry);
        }
      }
    } else if (result && Array.isArray(result)) {
      // It might be an array directly
      for (const logEntry of result) {
        if (isAILog(logEntry) || isError(logEntry)) {
          displayLog(logEntry);
        }
      }
    } else if (result && result.logs) {
      // It's an object with logs array
      for (const logEntry of result.logs) {
        if (isAILog(logEntry) || isError(logEntry)) {
          displayLog(logEntry);
        }
      }
    } else {
      console.log(`${colors.yellow}⚠️  Stream format unknown, raw result:${colors.reset}`);
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error(`${colors.red}❌ Error streaming logs:${colors.reset}`, error.message);

    if (error.statusCode === 401 || error.statusCode === 403) {
      console.error(`\n${colors.yellow}🔐 Authentication Error:${colors.reset}`);
      console.error('   VERCEL_TOKEN may be invalid or expired.');
      console.error('   Generate a new token at: https://vercel.com/account/tokens');
    }

    throw error;
  }
}

// Auto-reconnect wrapper
async function watchLogsWithReconnect() {
  let attemptCount = 0;
  const maxAttempts = 3;

  while (attemptCount < maxAttempts) {
    try {
      await streamLogs();

      // Stream ended normally, reconnect after a delay
      console.log(`\n${colors.yellow}⚠️  Stream ended. Reconnecting in 3 seconds...${colors.reset}\n`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      attemptCount = 0; // Reset on successful run

    } catch (error) {
      attemptCount++;

      if (attemptCount >= maxAttempts) {
        console.error(`\n${colors.red}❌ Failed after ${maxAttempts} attempts. Exiting.${colors.reset}`);
        process.exit(1);
      }

      console.log(`\n${colors.yellow}⚠️  Attempt ${attemptCount}/${maxAttempts} failed. Retrying in 5 seconds...${colors.reset}\n`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n\n${colors.green}👋 Stopping log stream...${colors.reset}`);
  process.exit(0);
});

// Start watching
console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.magenta}🔴 Vercel AI Logs - Live Stream Watcher${colors.reset}`);
console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

watchLogsWithReconnect().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
