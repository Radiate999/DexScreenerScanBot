import fetch from 'node-fetch';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const ALLOWED_CHAINS = ['solana', 'ethereum', 'base', 'bsc'];

// Expanded search queries to cover key DEXes and assets on all targeted chains
const SEARCH_QUERIES = [
  'solana', 'ethereum', 'base', 'bsc', 
  'USDC', 'USDT', 'SOL', 'WETH', 'WBNB', 
  'aerodrome', 'pancake', 'uniswap', 'sushiswap', 'orca'
];

// Official contract addresses for major cryptocurrencies and stablecoins per chain (lowercased)
const OFFICIAL_MAJORS_STABLES = {
  solana: [
    'so11111111111111111111111111111111111111112', // SOL / WSOL (Native Wrap)
    'epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v', // USDC (Official: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
    'es9vmfrzasvkqcxse5671dfl1n39aewt3tjyg', // USDT
    '3nz9j8yjspcgoaj6zjfms1teq37hjgdha21jcquut4r', // WBTC (Wormhole)
    '2f5u228j7tvj4e8zg9gzf37hjgdha21jcquut4r', // WBTC (Portal)
    '7vfcxtuxx5wjv5jadk17duj4ksgau7utnkj4b963voxs', // WETH (Wormhole)
    '7vfc1gr21c4ukg5x16j3gqic7by5cgqvgqqncbb4y5u',  // WETH alt
    'cbbtcf3aa214zxhbiazqwf4122fbybrandfqgw4imij'  // cbBTC (Solana)
  ],
  ethereum: [
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
    '0x6b175474e89094c44da98b954eedeac495271d0f'  // DAI
  ],
  base: [
    '0x4200000000000000000000000000000000000006', // WETH
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
    '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca', // USDbC
    '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2', // USDT (Official Aerodrome/Native)
    '0xf55fc29583b3e4f7629a40ae53e390c5c3080ead', // USDT alt
    '0x50c5725949a6f01746004c8e0b6134acc2d90d48', // USDT alt 2
    '0x803366888c3e9816a79b657a1a952521702715d92fea465b84ae2ed6e94a7f22', // USDT alt 3
    '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf', // cbBTC (Coinbase Wrapped BTC on Base)
    '0xcbb7c7a870394c724176ab67907cd96850d73cc8', // cbBTC alt
    '0x2ae3e2fb3c5e31114a8e9459ee6dce62a643ac5d', // cbETH / Wrapped cbETH
    '0x311935cd80b76769bf2ecc9d8ab7635b2139cf82'  // SOL bridged on Base
  ],
  bsc: [
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // WBNB
    '0x55d398326f99059ff775485246999027b3197955', // USDT
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // USDC
    '0xe9e7cea3dedca5984780bafc599bd69add087d56', // BUSD
    '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c', // BTCB
    '0x2170ed0880ac9a755fd29b2688956bd959f933f8', // ETH (Binance Pegged)
    '0x1af3f329e8be154074d8769d1ffa4ee05857ee7d'  // DAI (Binance Pegged)
  ]
};

async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[API WARNING] Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`[API ERROR] Error fetching ${url}:`, error.message);
    return null;
  }
}

export async function scanDexscreener() {
  console.log('[SCANNER] Starting scan of Dexscreener API...');
  
  const tokenAddressesByChain = {};
  ALLOWED_CHAINS.forEach(chain => {
    tokenAddressesByChain[chain] = new Set();
  });

  const discoveredPairs = [];

  const addTokenAddress = (chainId, tokenAddress) => {
    if (!chainId || !tokenAddress) return;
    const chainLower = chainId.toLowerCase();
    if (ALLOWED_CHAINS.includes(chainLower)) {
      tokenAddressesByChain[chainLower].add(tokenAddress);
    }
  };

  // 1. Fetch from Token Profiles
  console.log('[SCANNER] Fetching latest token profiles...');
  const profiles = await fetchJson('https://api.dexscreener.com/token-profiles/latest/v1');
  if (Array.isArray(profiles)) {
    profiles.forEach(p => addTokenAddress(p.chainId, p.tokenAddress));
  }
  await sleep(1000);

  // 2. Fetch from Token Boosts (latest)
  console.log('[SCANNER] Fetching latest token boosts...');
  const latestBoosts = await fetchJson('https://api.dexscreener.com/token-boosts/latest/v1');
  if (Array.isArray(latestBoosts)) {
    latestBoosts.forEach(b => addTokenAddress(b.chainId, b.tokenAddress));
  }
  await sleep(1000);

  // 3. Fetch from Token Boosts (top)
  console.log('[SCANNER] Fetching top token boosts...');
  const topBoosts = await fetchJson('https://api.dexscreener.com/token-boosts/top/v1');
  if (Array.isArray(topBoosts)) {
    topBoosts.forEach(b => addTokenAddress(b.chainId, b.tokenAddress));
  }
  await sleep(1000);

  // 4. Fetch from Community Takeovers
  console.log('[SCANNER] Fetching latest community takeovers...');
  const communityTakeovers = await fetchJson('https://api.dexscreener.com/community-takeovers/latest/v1');
  if (Array.isArray(communityTakeovers)) {
    communityTakeovers.forEach(c => addTokenAddress(c.chainId, c.tokenAddress));
  }
  await sleep(1000);

  // 5. Query Search Endpoint for common highly active pools
  for (const query of SEARCH_QUERIES) {
    console.log(`[SCANNER] Searching for pairs matching: "${query}"...`);
    const searchResult = await fetchJson(`https://api.dexscreener.com/latest/dex/search?q=${query}`);
    if (searchResult && Array.isArray(searchResult.pairs)) {
      searchResult.pairs.forEach(pair => {
        discoveredPairs.push(pair);
      });
    }
    await sleep(1000);
  }

  // 6. Fetch full pair details for all the token addresses collected from profiles/boosts/takeovers
  for (const chain of ALLOWED_CHAINS) {
    const addresses = Array.from(tokenAddressesByChain[chain]);
    if (addresses.length === 0) continue;

    console.log(`[SCANNER] Found ${addresses.length} unique token profiles/boosts on ${chain}. Fetching details...`);
    
    for (let i = 0; i < addresses.length; i += 30) {
      const batch = addresses.slice(i, i + 30);
      const batchStr = batch.join(',');
      const tokenDetailsParsed = await fetchJson(`https://api.dexscreener.com/tokens/v1/${chain}/${batchStr}`);
      if (Array.isArray(tokenDetailsParsed)) {
        tokenDetailsParsed.forEach(pair => {
          discoveredPairs.push(pair);
        });
      }
      await sleep(1000);
    }
  }

  console.log(`[SCANNER] Raw discovered pairs: ${discoveredPairs.length}`);

  // Deduplicate and filter by chain
  const uniquePairsMap = new Map();
  discoveredPairs.forEach(pair => {
    if (!pair || !pair.pairAddress || !pair.chainId) return;
    const chainLower = pair.chainId.toLowerCase();
    if (ALLOWED_CHAINS.includes(chainLower)) {
      uniquePairsMap.set(pair.pairAddress, pair);
    }
  });

  const allPairs = Array.from(uniquePairsMap.values());
  console.log(`[SCANNER] Unique pairs on Solana, Ethereum, Base, BSC: ${allPairs.length}`);

  const now = Date.now();
  const results = {
    newPairs: [],
    highestVolume: [],
    chainLeaders: [],
    downPairs: []
  };

  let totalNewPairsLessThan1Hour = 0;

  // Process and filter pairs
  allPairs.forEach(pair => {
    const volume24h = pair.volume?.h24 || 0;
    const marketCap = pair.marketCap || pair.fdv || 0;
    const priceChange24h = pair.priceChange?.h24 || 0;

    // Attach age information to every pair if pairCreatedAt exists
    if (pair.pairCreatedAt) {
      const ageMs = now - pair.pairCreatedAt;
      pair.ageMinutes = Math.round(ageMs / (1000 * 60));
      pair.ageHours = ageMs / (1000 * 60 * 60);

      // Track total new pairs <= 61 minutes regardless of volume (for diagnostics)
      if (pair.ageMinutes <= 61) {
        totalNewPairsLessThan1Hour++;
      }
    }

    // 1. New Pairs (<= 61 mins old) with volume > 50k
    if (pair.pairCreatedAt && pair.ageMinutes <= 61 && volume24h > 50000) {
      results.newPairs.push(pair);
    }

    // 3. Tokens down 50% to 75% in the last 24h with volume > 50k
    if (priceChange24h <= -50 && priceChange24h >= -75 && volume24h > 50000) {
      results.downPairs.push(pair);
    }
  });

  // Filter candidates for Top Volume (excluding official majors/stables)
  const allVolumeCandidates = allPairs.filter(pair => {
    const marketCap = pair.marketCap || pair.fdv || 0;
    if (!(marketCap > 0 && marketCap < 1000000000)) return false;

    const baseAddress = pair.baseToken?.address?.toLowerCase();
    const quoteAddress = pair.quoteToken?.address?.toLowerCase();
    const chainLower = pair.chainId?.toLowerCase();
    
    const chainOfficials = OFFICIAL_MAJORS_STABLES[chainLower] || [];
    const isBaseOfficial = chainOfficials.includes(baseAddress);
    const isQuoteOfficial = chainOfficials.includes(quoteAddress);

    return !(isBaseOfficial && isQuoteOfficial);
  });

  // Sort volume candidates descending
  allVolumeCandidates.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));

  // Top 10 Global
  results.highestVolume = allVolumeCandidates.slice(0, 10);

  // Dynamic Chain Representation:
  // If a chain is not represented in the Global Top 10, find its highest-volume token and add to chainLeaders
  const representedChains = new Set(results.highestVolume.map(p => p.chainId.toLowerCase()));
  
  ALLOWED_CHAINS.forEach(chain => {
    if (!representedChains.has(chain)) {
      const leader = allVolumeCandidates.find(p => p.chainId.toLowerCase() === chain);
      if (leader) {
        results.chainLeaders.push(leader);
      }
    }
  });

  // Sort final results lists
  results.newPairs.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));
  results.downPairs.sort((a, b) => (a.priceChange?.h24 || 0) - (b.priceChange?.h24 || 0));

  console.log(`[SCANNER] Scan complete.`);
  console.log(` - Total new pairs discovered (<=61m, any volume): ${totalNewPairsLessThan1Hour}`);
  console.log(` - New Pairs matching criteria (<=61m, vol >50k): ${results.newPairs.length}`);
  console.log(` - Global High Volume candidates: ${results.highestVolume.length}`);
  console.log(` - Other Chain Leaders appended: ${results.chainLeaders.length}`);
  console.log(` - Down 50-75% pairs found (vol >50k): ${results.downPairs.length}`);

  return results;
}
