const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://proveedores.face.gob.es/api/v1/relations';
const LIMIT = 1000;
const ADMIN_LEVELS = [0, 1, 2, 3, 4];
const DELAY_MS = 1500; // 1.5 seconds between requests
const OUTPUT_DIR = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch data for a specific adminLevel and page
async function fetchPage(adminLevel, page) {
  const url = `${BASE_URL}?adminLevel=${adminLevel}&limit=${LIMIT}&page=${page}`;
  
  try {
    console.log(`📥 Fetching adminLevel=${adminLevel}, page=${page}...`);
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching adminLevel=${adminLevel}, page=${page}:`, error.message);
    return null;
  }
}

// Save data to file
function saveToFile(adminLevel, page, data) {
  const filename = `adminLevel-${adminLevel}-page-${page}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`💾 Saved: ${filename} (${data.items?.length || 0} items)`);
    return true;
  } catch (error) {
    console.error(`❌ Error saving ${filename}:`, error.message);
    return false;
  }
}

// Fetch all pages for a specific adminLevel
async function fetchAdminLevel(adminLevel) {
  console.log(`\n🔍 Starting adminLevel=${adminLevel}...`);
  
  let page = 1;
  let totalItems = 0;
  let filesCreated = 0;
  let hasMorePages = true;
  
  while (hasMorePages) {
    const data = await fetchPage(adminLevel, page);
    
    if (data) {
      const saved = saveToFile(adminLevel, page, data);
      if (saved) filesCreated++;
      
      totalItems += data.items?.length || 0;
      
      // Check if there are more pages
      const itemsReceived = data.items?.length || 0;
      const total = data.total || 0;
      
      if (itemsReceived < LIMIT || totalItems >= total) {
        hasMorePages = false;
      } else {
        page++;
        // Add delay between requests to avoid rate limiting
        await sleep(DELAY_MS);
      }
    } else {
      // If fetch failed, stop this adminLevel
      console.error(`⚠️  Stopping adminLevel=${adminLevel} due to error at page=${page}`);
      hasMorePages = false;
    }
  }
  
  console.log(`✅ Completed adminLevel=${adminLevel}: ${totalItems} items in ${filesCreated} files`);
  return { adminLevel, totalItems, filesCreated };
}

// Main function
async function main() {
  console.log('🚀 FACe API Data Fetcher');
  console.log('========================\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Admin Levels: ${ADMIN_LEVELS.join(', ')}`);
  console.log(`Limit per page: ${LIMIT}`);
  console.log(`Delay between requests: ${DELAY_MS}ms`);
  console.log(`Output directory: ${OUTPUT_DIR}\n`);
  
  const startTime = Date.now();
  const results = [];
  
  for (const adminLevel of ADMIN_LEVELS) {
    const result = await fetchAdminLevel(adminLevel);
    results.push(result);
    
    // Add delay between admin levels
    if (adminLevel < ADMIN_LEVELS[ADMIN_LEVELS.length - 1]) {
      await sleep(DELAY_MS);
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Summary
  console.log('\n📊 Summary');
  console.log('==========');
  results.forEach(r => {
    console.log(`  AdminLevel ${r.adminLevel}: ${r.totalItems} items, ${r.filesCreated} files`);
  });
  
  const totalItems = results.reduce((sum, r) => sum + r.totalItems, 0);
  const totalFiles = results.reduce((sum, r) => sum + r.filesCreated, 0);
  
  console.log(`\n  Total: ${totalItems} items in ${totalFiles} files`);
  console.log(`  Duration: ${duration}s`);
  console.log('\n✨ Done!');
}

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
