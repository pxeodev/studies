import fs from 'fs';
import sql from '../lib/database.mjs';

// Force SSL for sandbox environment
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

// Use the same database connection but with SSL enabled
const dbConfig = {
  ssl: { rejectUnauthorized: false }
};
const sandboxSql = postgres(process.env.DATABASE_URL, dbConfig);

/**
 * Add Variational exchange to the database and associate tickers
 */
async function addVariationalExchange() {
  console.log('🚀 Starting Variational exchange integration...\n');
  
  // Read the scraped ticker data
  console.log('📄 Reading scraped ticker data...');
  const tickerFile = fs.readFileSync('variational_tickers_1761546640165.json', 'utf8');
  const tickerData = JSON.parse(tickerFile);
  
  console.log(`✅ Loaded ${tickerData.tickers.length} tickers\n`);
  
  // Check if Variational exchange already exists
  const existingExchange = await sandboxSql`SELECT * FROM "Exchange" WHERE name = 'Variational'`;
  
  let exchangeId;
  
  if (existingExchange.length > 0) {
    exchangeId = existingExchange[0].id;
    console.log(`✅ Variational exchange already exists with ID: ${exchangeId}\n`);
  } else {
    // Add Variational exchange with proper ID format
    console.log('➕ Adding Variational exchange to database...');
    exchangeId = 'variational';
    const result = await sandboxSql`
      INSERT INTO "Exchange" (id, name, image, url, centralized)
      VALUES (${exchangeId}, 'Variational', 'https://omni.variational.io/logo.png', 'https://omni.variational.io', false)
      RETURNING id, name
    `;
    console.log(`✅ Added Variational exchange with ID: ${exchangeId}\n`);
  }
  
  // Process tickers and associate with existing coins in database
  console.log('🔄 Processing tickers...');
  let successCount = 0;
  let notFoundCount = 0;
  
  for (const ticker of tickerData.tickers) {
    const symbol = ticker.symbol.toUpperCase();
    
    // Check if coin exists in database (case-insensitive match)
    const coin = await sandboxSql`SELECT id, name, symbol FROM "Coin" WHERE LOWER(symbol) = LOWER(${symbol}) LIMIT 1`;
    
    if (coin.length > 0) {
      const coinId = coin[0].id;
      
      // Check if exchange-coin relationship already exists
      const existingRelation = await sandboxSql`
        SELECT id FROM "CoinExchange" 
        WHERE "coinId" = ${coinId} AND "exchangeId" = ${exchangeId}
        LIMIT 1
      `;
      
      if (existingRelation.length === 0) {
        // Add the exchange-coin relationship
        await sandboxSql`
          INSERT INTO "CoinExchange" ("coinId", "exchangeId")
          VALUES (${coinId}, ${exchangeId})
        `;
        successCount++;
        console.log(`✅ Added Variational for ${symbol} (${coin[0].name})`);
      } else {
        console.log(`⏭️  Skipped ${symbol} (already exists)`);
      }
    } else {
      notFoundCount++;
      console.log(`⚠️  Coin not found in database: ${symbol}`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`✅ Successfully associated: ${successCount} tickers`);
  console.log(`⚠️  Not found in database: ${notFoundCount} tickers`);
  console.log(`📋 Total tickers processed: ${tickerData.tickers.length}`);
  
  // Close database connection
  await sandboxSql.end();
  
  console.log('\n✅ Variational exchange integration complete!');
  process.exit(0);
}

// Run the script
addVariationalExchange().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
