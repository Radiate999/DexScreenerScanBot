import http from 'http';
import dotenv from 'dotenv';
import { scanDexscreener } from './dexscreener.js';
import { sendTelegramReport } from './telegram.js';

dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const port = process.env.PORT || 3000;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🤖 Dexscreener Telegram Bot - Server Mode');
console.log(`📅 Started at: ${new Date().toISOString()}`);
console.log(`🔑 Bot Token Configured: ${botToken ? '✅ YES' : '❌ NO'}`);
console.log(`💬 Chat ID Configured: ${chatId ? '✅ YES' : '❌ NO'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (!botToken || !chatId) {
  console.warn('⚠️ WARNING: Telegram configuration is incomplete! Please check your .env file.');
  process.exit(1);
}

// Perform scan function
async function runScan() {
  const timestamp = new Date().toISOString();
  console.log(`\n[SCAN] [${timestamp}] Starting Dexscreener scan...`);
  
  try {
    const results = await scanDexscreener();
    await sendTelegramReport(results);
    console.log(`[SCAN] [${new Date().toISOString()}] Scan completed successfully.`);
  } catch (error) {
    console.error(`[SCAN] [${new Date().toISOString()}] Error during scan:`, error.message);
  }
}

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  // Expose a /scan endpoint
  if (req.url === '/scan' && req.method === 'GET') {
    console.log(`[HTTP] Received scan request from ${req.socket.remoteAddress}`);
    
    // Respond immediately to avoid connection timeouts (the scan takes ~15-20 seconds)
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Scan triggered in background' }));
    
    // Run the scan in the background
    runScan();
  } else {
    // Default fallback page
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Dexscreener Scanner Bot is running!</h1><p>Send a GET request to <code>/scan</code> to trigger the scanner.</p>');
  }
});

// Start the server
server.listen(port, () => {
  console.log(`🚀 Web server is listening on port ${port}`);
  console.log(`➡️ Endpoint for cron-job.org: http://localhost:${port}/scan`);
  
  // If running locally (without process.env.PORT), start the scan immediately and run on interval
  if (!process.env.PORT) {
    console.log('ℹ️ Running in local mode. Executing initial scan now...');
    runScan();
    
    // Fallback interval for local execution: scan every 60 minutes
    const INTERVAL_MS = 60 * 60 * 1000;
    setInterval(runScan, INTERVAL_MS);
    console.log(`🚀 Local interval scheduler activated. Next scan in 60 minutes.`);
  } else {
    console.log('ℹ️ Running in cloud mode. Waiting for HTTP pings to /scan...');
  }
});
