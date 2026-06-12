import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

// Initialize bot. Do NOT run polling if we only send messages (helps avoid script hanging)
let bot;
if (token && chatId) {
  bot = new TelegramBot(token, { polling: false });
}

/**
 * Escapes HTML special characters for Telegram compatibility
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Format age from creation timestamp
 */
function formatAge(pair) {
  if (!pair || !pair.pairCreatedAt) return 'N/A';
  const ageMs = Date.now() - pair.pairCreatedAt;
  if (ageMs < 0) return 'Just now';
  
  const minutes = Math.floor(ageMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

/**
 * Format numbers in a human-readable currency format (compact)
 */
function formatUsd(num) {
  if (num === null || num === undefined || isNaN(num)) return '$0';
  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  }
  if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`;
  }
  if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(1)}k`;
  }
  if (num < 0.01 && num > 0) {
    return `$${num.toFixed(6)}`;
  }
  return `$${num.toFixed(2)}`;
}

/**
 * Format price change percentage with positive/negative sign
 */
function formatPercent(num) {
  if (num === null || num === undefined || isNaN(num)) return '0%';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}

/**
 * Formats chain identifier for visual appeal
 */
function formatChainName(chain) {
  if (!chain) return '';
  const mapping = {
    solana: 'SOL',
    ethereum: 'ETH',
    base: 'BASE',
    bsc: 'BSC'
  };
  return mapping[chain.toLowerCase()] || chain.toUpperCase();
}

/**
 * Format the token label to include Name + Ticker
 */
function formatTokenLabel(pair) {
  const baseName = escapeHtml(pair.baseToken?.name || 'UNKNOWN');
  const baseSym = escapeHtml(pair.baseToken?.symbol || 'UNKNOWN');
  const quoteSym = escapeHtml(pair.quoteToken?.symbol || 'USD');
  return `<b>${baseName} (${baseSym})</b> / ${quoteSym}`;
}

/**
 * Generate metadata links (DS, W, TWT) on the same line
 */
function formatLinksHtml(pair) {
  let links = `<a href="${pair.url}">DS</a>`;
  
  // Website
  const website = pair.info?.websites?.find(w => w.url) || pair.info?.websites?.[0];
  if (website?.url) {
    links += ` | <a href="${website.url}">W</a>`;
  }
  
  // Twitter
  const twitter = pair.info?.socials?.find(s => s.type === 'twitter' || s.url?.includes('twitter.com') || s.url?.includes('x.com'));
  if (twitter?.url) {
    links += ` | <a href="${twitter.url}">TWT</a>`;
  }
  
  return links;
}

/**
 * Generates the HTML message for the Telegram report
 */
function generateHtmlReport(results) {
  const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  let html = `📊 <b>DEXSCREENER SCAN REPORT</b> 📊\n`;
  html += `📅 <code>${dateStr}</code>\n`;
  html += `-\n\n`;

  // 1. New Pairs Section (Max 5)
  html += `🔥 <b>1. New Pairs (≤ 61m, Vol &gt; $50k)</b>\n`;
  html += `-\n`;
  if (results.newPairs.length === 0) {
    html += `<i>No new pairs matching criteria.</i>\n\n`;
  } else {
    results.newPairs.slice(0, 5).forEach((pair) => {
      const label = formatTokenLabel(pair);
      const chain = formatChainName(pair.chainId);
      const vol = formatUsd(pair.volume?.h24 || 0);
      const liq = formatUsd(pair.liquidity?.usd || 0);
      const mcap = formatUsd(pair.marketCap || pair.fdv || 0);
      const age = formatAge(pair);
      const links = formatLinksHtml(pair);
      
      html += `⚡ ${label} (${chain})\n`;
      html += `⏱️ Age: <code>${age}</code> | 💎 MC: <code>${mcap}</code>\n`;
      html += `💧 Liq: <code>${liq}</code> | 📊 Vol: <code>${vol}</code>\n`;
      html += `🔗 ${links}\n\n`;
    });
  }

  // 2. Highest Volume Section (Max 10)
  html += `🚀 <b>2. Top Volume Tokens (&lt; $1B MCAP)</b>\n`;
  html += `-\n`;
  if (results.highestVolume.length === 0) {
    html += `<i>No candidates found.</i>\n\n`;
  } else {
    results.highestVolume.slice(0, 10).forEach((pair, index) => {
      const label = formatTokenLabel(pair);
      const chain = formatChainName(pair.chainId);
      const vol = formatUsd(pair.volume?.h24 || 0);
      const mcap = formatUsd(pair.marketCap || pair.fdv || 0);
      const change = formatPercent(pair.priceChange?.h24 || 0);
      const age = formatAge(pair);
      const links = formatLinksHtml(pair);
      
      html += `${index + 1}. ${label} (${chain})\n`;
      html += `⏱️ Age: <code>${age}</code> | 💎 MC: <code>${mcap}</code>\n`;
      html += `📊 Vol: <code>${vol}</code> | 📈 24h: <code>${change}</code>\n`;
      html += `🔗 ${links}\n\n`;
    });

    // Append chain leaders if any chain is not represented in the top 10
    if (results.chainLeaders && results.chainLeaders.length > 0) {
      html += `📍 <b>Other Chain Leaders:</b>\n`;
      html += `-\n`;
      results.chainLeaders.forEach((pair) => {
        const label = formatTokenLabel(pair);
        const chain = formatChainName(pair.chainId);
        const vol = formatUsd(pair.volume?.h24 || 0);
        const mcap = formatUsd(pair.marketCap || pair.fdv || 0);
        const change = formatPercent(pair.priceChange?.h24 || 0);
        const age = formatAge(pair);
        const links = formatLinksHtml(pair);
        
        html += `🔹 ${label} (${chain})\n`;
        html += `⏱️ Age: <code>${age}</code> | 💎 MC: <code>${mcap}</code>\n`;
        html += `📊 Vol: <code>${vol}</code> | 📈 24h: <code>${change}</code>\n`;
        html += `🔗 ${links}\n\n`;
      });
    }
  }

  // 3. Down Pairs Section (Max 5)
  html += `🔴 <b>3. Top 24h Loss (50-75% Down, Vol &gt; $50k)</b>\n`;
  html += `-\n`;
  if (results.downPairs.length === 0) {
    html += `<i>No tokens matching criteria.</i>\n\n`;
  } else {
    results.downPairs.slice(0, 5).forEach((pair) => {
      const label = formatTokenLabel(pair);
      const chain = formatChainName(pair.chainId);
      const vol = formatUsd(pair.volume?.h24 || 0);
      const mcap = formatUsd(pair.marketCap || pair.fdv || 0);
      const change = formatPercent(pair.priceChange?.h24 || 0);
      const age = formatAge(pair);
      const links = formatLinksHtml(pair);
      
      html += `📉 ${label} (${chain})\n`;
      html += `⏱️ Age: <code>${age}</code> | 🔴 Change: <b>${change}</b>\n`;
      html += `💎 MC: <code>${mcap}</code> | 📊 Vol: <code>${vol}</code>\n`;
      html += `🔗 ${links}\n\n`;
    });
  }

  html += `-\n`;
  return html;
}

/**
 * Sends report to Telegram
 */
export async function sendTelegramReport(results) {
  if (!bot) {
    console.error('[TELEGRAM] Bot is not configured. Please check your TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.');
    return false;
  }

  const htmlContent = generateHtmlReport(results);

  try {
    console.log('[TELEGRAM] Sending report to Telegram...');
    
    if (htmlContent.length > 4090) {
      console.warn('[TELEGRAM] Report too long, splitting message...');
      
      const sections = [];
      const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      
      // Header + Section 1
      let s1 = `📊 <b>DEXSCREENER SCAN REPORT</b> 📊\n`;
      s1 += `📅 <code>${dateStr}</code>\n`;
      s1 += `-\n\n`;
      s1 += `🔥 <b>1. New Pairs (≤ 61m, Vol &gt; $50k)</b>\n`;
      s1 += `-\n`;
      if (results.newPairs.length === 0) {
        s1 += `<i>No new pairs matching criteria.</i>\n\n`;
      } else {
        results.newPairs.slice(0, 5).forEach((pair) => {
          const label = formatTokenLabel(pair);
          const chain = formatChainName(pair.chainId);
          const vol = formatUsd(pair.volume?.h24 || 0);
          const liq = formatUsd(pair.liquidity?.usd || 0);
          const mcap = formatUsd(pair.marketCap || pair.fdv || 0);
          const age = formatAge(pair);
          const links = formatLinksHtml(pair);
          s1 += `⚡ ${label} (${chain})\n⏱️ Age: <code>${age}</code> | 💎 MC: <code>${mcap}</code>\n💧 Liq: <code>${liq}</code> | 📊 Vol: <code>${vol}</code>\n🔗 ${links}\n\n`;
        });
      }
      sections.push(s1);

      // Section 2 (including chain leaders)
      let s2 = `🚀 <b>2. Top Volume Tokens (&lt; $1B MCAP)</b>\n`;
      s2 += `-\n`;
      if (results.highestVolume.length === 0) {
        s2 += `<i>No candidates found.</i>\n\n`;
      } else {
        results.highestVolume.slice(0, 10).forEach((pair, index) => {
          const label = formatTokenLabel(pair);
          const chain = formatChainName(pair.chainId);
          const vol = formatUsd(pair.volume?.h24 || 0);
          const mcap = formatUsd(pair.marketCap || pair.fdv || 0);
          const change = formatPercent(pair.priceChange?.h24 || 0);
          const age = formatAge(pair);
          const links = formatLinksHtml(pair);
          s2 += `${index + 1}. ${label} (${chain})\n⏱️ Age: <code>${age}</code> | 💎 MC: <code>${mcap}</code>\n📊 Vol: <code>${vol}</code> | 📈 24h: <code>${change}</code>\n🔗 ${links}\n\n`;
        });

        if (results.chainLeaders && results.chainLeaders.length > 0) {
          s2 += `📍 <b>Other Chain Leaders:</b>\n`;
          s2 += `-\n`;
          results.chainLeaders.forEach((pair) => {
            const label = formatTokenLabel(pair);
            const chain = formatChainName(pair.chainId);
            const vol = formatUsd(pair.volume?.h24 || 0);
            const mcap = formatUsd(pair.marketCap || pair.fdv || 0);
            const change = formatPercent(pair.priceChange?.h24 || 0);
            const age = formatAge(pair);
            const links = formatLinksHtml(pair);
            s2 += `🔹 ${label} (${chain})\n⏱️ Age: <code>${age}</code> | 💎 MC: <code>${mcap}</code>\n📊 Vol: <code>${vol}</code> | 📈 24h: <code>${change}</code>\n🔗 ${links}\n\n`;
          });
        }
      }
      sections.push(s2);

      // Section 3 + Footer
      let s3 = `🔴 <b>3. Top 24h Loss (50-75% Down, Vol &gt; $50k)</b>\n`;
      s3 += `-\n`;
      if (results.downPairs.length === 0) {
        s3 += `<i>No tokens matching criteria.</i>\n\n`;
      } else {
        results.downPairs.slice(0, 5).forEach((pair) => {
          const label = formatTokenLabel(pair);
          const chain = formatChainName(pair.chainId);
          const vol = formatUsd(pair.volume?.h24 || 0);
          const mcap = formatUsd(pair.marketCap || pair.fdv || 0);
          const change = formatPercent(pair.priceChange?.h24 || 0);
          const age = formatAge(pair);
          const links = formatLinksHtml(pair);
          s3 += `📉 ${label} (${chain})\n⏱️ Age: <code>${age}</code> | 🔴 Change: <b>${change}</b>\n💎 MC: <code>${mcap}</code> | 📊 Vol: <code>${vol}</code>\n🔗 ${links}\n\n`;
        });
      }
      s3 += `-\n`;
      sections.push(s3);

      for (const section of sections) {
        await bot.sendMessage(chatId, section, { parse_mode: 'HTML', disable_web_page_preview: true });
        await new Promise(r => setTimeout(r, 200));
      }
    } else {
      await bot.sendMessage(chatId, htmlContent, { parse_mode: 'HTML', disable_web_page_preview: true });
    }
    
    console.log('[TELEGRAM] Report sent successfully!');
    return true;
  } catch (error) {
    console.error('[TELEGRAM] Failed to send message to Telegram:', error.message);
    return false;
  }
}
