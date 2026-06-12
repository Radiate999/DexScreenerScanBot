import dotenv from 'dotenv';
import { scanDexscreener } from './dexscreener.js';
import { sendTelegramReport } from './telegram.js';

dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 Dexscreener Telegram Bot - Dry Run Execution');
console.log(`📅 Executed at: ${new Date().toISOString()}`);
console.log(`🔑 Bot Token Configured: ${botToken ? '✅ YES' : '❌ NO'}`);
console.log(`💬 Chat ID Configured: ${chatId ? '✅ YES' : '❌ NO'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

function formatAge(pair) {
  if (!pair || !pair.pairCreatedAt) return 'N/A';
  const ageMs = Date.now() - pair.pairCreatedAt;
  if (ageMs < 0) return 'Just now';
  const minutes = Math.floor(ageMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function getLabel(pair) {
  return `${pair.baseToken?.name || 'UNKNOWN'} (${pair.baseToken?.symbol || 'UNKNOWN'}) / ${pair.quoteToken?.symbol || 'USD'}`;
}

async function executeDryRun() {
  try {
    const results = await scanDexscreener();
    
    console.log('\n=============================================');
    console.log('🔍 RESULTS SUMMARY');
    console.log('=============================================');
    
    console.log(`\n🔥 1. NEW PAIRS (<= 61m, Vol > $50k) [Total: ${results.newPairs.length}]`);
    results.newPairs.forEach((p, idx) => {
      console.log(`   [${idx + 1}] ${getLabel(p)} (${p.chainId})`);
      console.log(`       Age: ${formatAge(p)} | Vol 24h: $${p.volume?.h24?.toLocaleString() || '0'} | Liq: $${p.liquidity?.usd?.toLocaleString() || '0'}`);
      console.log(`       URL: ${p.url}`);
    });
    if (results.newPairs.length === 0) console.log('   No new pairs found.');

    console.log(`\n🚀 2. TOP VOLUME TOKENS (< $1B MCAP) [Total: ${results.highestVolume.length}]`);
    results.highestVolume.forEach((p, idx) => {
      const mcap = p.marketCap || p.fdv || 0;
      console.log(`   [${idx + 1}] ${getLabel(p)} (${p.chainId})`);
      console.log(`       Age: ${formatAge(p)} | Vol 24h: $${p.volume?.h24?.toLocaleString() || '0'} | MCAP: $${mcap.toLocaleString()}`);
      console.log(`       24h Change: ${p.priceChange?.h24 || 0}% | URL: ${p.url}`);
    });
    if (results.highestVolume.length === 0) console.log('   No high volume tokens found.');

    if (results.chainLeaders && results.chainLeaders.length > 0) {
      console.log(`\n📍 OTHER CHAIN LEADERS (Outside Top 10) [Total: ${results.chainLeaders.length}]`);
      results.chainLeaders.forEach((p, idx) => {
        const mcap = p.marketCap || p.fdv || 0;
        console.log(`   [🔹] ${getLabel(p)} (${p.chainId})`);
        console.log(`       Age: ${formatAge(p)} | Vol 24h: $${p.volume?.h24?.toLocaleString() || '0'} | MCAP: $${mcap.toLocaleString()}`);
        console.log(`       24h Change: ${p.priceChange?.h24 || 0}% | URL: ${p.url}`);
      });
    }

    console.log(`\n🔴 3. TOP LOSS PAIRS (50-75% Down, Vol > $50k) [Total: ${results.downPairs.length}]`);
    results.downPairs.forEach((p, idx) => {
      console.log(`   [${idx + 1}] ${getLabel(p)} (${p.chainId})`);
      console.log(`       Age: ${formatAge(p)} | Change: ${p.priceChange?.h24}% | Vol 24h: $${p.volume?.h24?.toLocaleString() || '0'}`);
      console.log(`       URL: ${p.url}`);
    });
    if (results.downPairs.length === 0) console.log('   No matching down tokens found.');

    console.log('\n=============================================');
    
    if (botToken && chatId && botToken !== 'your_bot_token_here' && chatId !== 'your_chat_id_here') {
      console.log('[DRYRUN] Configuration is complete. Sending message to Telegram...');
      const sent = await sendTelegramReport(results);
      if (sent) {
        console.log('[DRYRUN] Telegram notification sent successfully! Check your chat.');
      } else {
        console.log('[DRYRUN] Failed to send Telegram notification.');
      }
    } else {
      console.log('[DRYRUN] Telegram credentials not set or contain placeholders. Skipping Telegram notification.');
      console.log('[DRYRUN] Open your .env file and set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to test Telegram alerts.');
    }
    
    console.log('\n🏁 Dry run complete.');
  } catch (error) {
    console.error('❌ Dry run failed with error:', error);
  }
}

executeDryRun();
