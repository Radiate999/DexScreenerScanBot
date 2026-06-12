# DexScreener Telegram Scan Bot

A Node.js Telegram Bot that scans the DexScreener API hourly for specific token conditions across **Solana, Ethereum, Base, and BSC** networks.

## Features

The bot performs a scan every hour (configurable) and filters for:
1. **New pairs (<= 1h old)** with volume > $50,000.
2. **Tokens with the highest volume** and a market cap < $1,000,000,000 (1B).
3. **Tokens down 50% to 75%** in the last 24 hours with volume > $50,000.

## Setup Instructions

### 1. Configure the Environment
Open the `.env` file (or duplicate `.env.example` as `.env`) and update the variables:

```ini
# Get your bot token from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your_real_bot_token

# Your target Chat ID (can be your user ID, a channel username @my_channel, or a group chat ID)
TELEGRAM_CHAT_ID=-100xxxxxxxxxx

# Cron expression for how often to scan (default: hourly at minute 0)
SCAN_INTERVAL_CRON=0 * * * *
```

*Note: To find your user ID or group chat ID, you can message `@userinfobot` on Telegram or forward a message to a Telegram ID bot.*

### 2. Install Dependencies
If not already installed, run:
```bash
npm install
```

### 3. Run a Dry Run (Instant Test)
Before scheduling the bot, you can run a dry run to verify that the scanner retrieves data from DexScreener and can send reports to your Telegram chat:
```bash
npm run dryrun
```
*Note: If Telegram credentials are not yet configured in `.env`, the script will output the scan results directly to your terminal.*

### 4. Start the Bot (Scheduler Mode)
To start the bot in production mode, where it runs on the configured cron schedule:
```bash
npm start
```

## How It Works

Because the official DexScreener REST API does not provide a single "new pairs" stream, this bot uses a multi-layered discovery strategy:
1. It polls DexScreener's public discovery streams:
   - `/token-profiles/latest/v1` (latest profile creations)
   - `/token-boosts/latest/v1` (latest boosted listings)
   - `/token-boosts/top/v1` (top boosted listings)
   - `/community-takeovers/latest/v1` (latest community-driven takeovers)
2. It queries the `/latest/dex/search` endpoint for major chains and asset symbols (`solana`, `ethereum`, `base`, `bsc`, `USDC`, `USDT`, `SOL`, `WETH`, `WBNB`) to scan the most active liquidity pools.
3. It merges all discovered pairs, deduplicates by pool address, and requests complete market statistics in batches for all collected tokens.
4. It filters the aggregated set based on the chain, age, volume, and price change requirements before formatting and sending the report.
