const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory data storage
let allData = [];
let nifIndex = {}; // { "NIF": [items] }
let codeIndex = {}; // { "code": item }
let nameIndex = {}; // For partial name search

// API Token Authentication Middleware
const authenticate = (req, res, next) => {
  const token = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'API key required. Provide it via X-API-Key header or apiKey query parameter.' 
    });
  }
  
  const validTokens = process.env.API_TOKENS ? 
    process.env.API_TOKENS.split(',').map(t => t.trim()) : [];
  
  if (!validTokens.includes(token)) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Invalid API key.' 
    });
  }
  
  next();
};

// Load all JSON files from output directory
function loadData() {
  console.log('📂 Loading data from output directory...');
  const outputDir = path.join(__dirname, 'output');
  
  if (!fs.existsSync(outputDir)) {
    console.error('❌ Output directory not found!');
    return;
  }
  
  const files = fs.readdirSync(outputDir)
    .filter(file => file.endsWith('.json'))
    .sort();
  
  console.log(`📄 Found ${files.length} JSON files`);
  
  files.forEach(file => {
    const filePath = path.join(outputDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (data.items && Array.isArray(data.items)) {
      allData.push(...data.items);
    }
  });
  
  console.log(`✅ Loaded ${allData.length} total items`);
  
  // Build indexes for fast lookups
  buildIndexes();
}

// Build indexes for fast searching
function buildIndexes() {
  console.log('🔍 Building search indexes...');
  
  allData.forEach(item => {
    // Index by NIF (identifier in og, oc, ut)
    if (item.og?.identifier) {
      const nif = item.og.identifier;
      if (!nifIndex[nif]) nifIndex[nif] = [];
      nifIndex[nif].push(item);
    }
    
    // Index by codes
    if (item.og?.code) {
      codeIndex[item.og.code] = item;
    }
    if (item.oc?.code) {
      codeIndex[item.oc.code] = item;
    }
    if (item.ut?.code) {
      codeIndex[item.ut.code] = item;
    }
    
    // Index by administration code
    if (item.administration?.code) {
      codeIndex[item.administration.code] = item;
    }
    
    // Build name index for searching
    const names = [
      item.og?.name,
      item.og?.alias,
      item.oc?.name,
      item.oc?.alias,
      item.ut?.name,
      item.ut?.alias,
      item.administration?.name
    ].filter(Boolean);
    
    names.forEach(name => {
      const key = name.toLowerCase();
      if (!nameIndex[key]) nameIndex[key] = [];
      if (!nameIndex[key].includes(item)) {
        nameIndex[key].push(item);
      }
    });
  });
  
  console.log(`✅ Indexed ${Object.keys(nifIndex).length} NIFs`);
  console.log(`✅ Indexed ${Object.keys(codeIndex).length} codes`);
  console.log('🚀 Ready to serve requests!\n');
}

// Public endpoint - no authentication required
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DIR3 API',
    version: '1.0.0',
    dataLoaded: allData.length > 0,
    totalItems: allData.length,
    indexedNIFs: Object.keys(nifIndex).length,
    indexedCodes: Object.keys(codeIndex).length,
    timestamp: new Date().toISOString()
  });
});

// Search by NIF - requires authentication
app.get('/api/search/nif/:nif', authenticate, (req, res) => {
  const nif = req.params.nif.toUpperCase();
  const results = nifIndex[nif] || [];
  
  res.json({
    success: true,
    query: { nif },
    count: results.length,
    results: results
  });
});

// Search by code (og, oc, ut, or administration) - requires authentication
app.get('/api/search/code/:code', authenticate, (req, res) => {
  const code = req.params.code.toUpperCase();
  const result = codeIndex[code];
  
  if (result) {
    res.json({
      success: true,
      query: { code },
      result: result
    });
  } else {
    res.status(404).json({
      success: false,
      query: { code },
      message: 'Code not found'
    });
  }
});

// Search by name (partial match) - requires authentication
app.get('/api/search/name/:name', authenticate, (req, res) => {
  const searchTerm = req.params.name.toLowerCase();
  const results = [];
  const seen = new Set();
  
  // Find all items with names containing the search term
  Object.keys(nameIndex).forEach(key => {
    if (key.includes(searchTerm)) {
      nameIndex[key].forEach(item => {
        const hash = item.hash;
        if (!seen.has(hash)) {
          seen.add(hash);
          results.push(item);
        }
      });
    }
  });
  
  // Limit results to prevent huge responses
  const limit = parseInt(req.query.limit) || 100;
  const limitedResults = results.slice(0, limit);
  
  res.json({
    success: true,
    query: { name: req.params.name },
    count: results.length,
    returned: limitedResults.length,
    results: limitedResults
  });
});

// Advanced search - requires authentication
app.post('/api/search', authenticate, (req, res) => {
  const { nif, code, name, adminCode, active } = req.body;
  let results = [...allData];
  
  // Filter by NIF
  if (nif) {
    const nifUpper = nif.toUpperCase();
    results = results.filter(item => item.og?.identifier === nifUpper);
  }
  
  // Filter by code
  if (code) {
    const codeUpper = code.toUpperCase();
    results = results.filter(item => 
      item.og?.code === codeUpper ||
      item.oc?.code === codeUpper ||
      item.ut?.code === codeUpper
    );
  }
  
  // Filter by name
  if (name) {
    const nameLower = name.toLowerCase();
    results = results.filter(item => {
      const names = [
        item.og?.name,
        item.og?.alias,
        item.oc?.name,
        item.oc?.alias,
        item.ut?.name,
        item.ut?.alias
      ].filter(Boolean).map(n => n.toLowerCase());
      
      return names.some(n => n.includes(nameLower));
    });
  }
  
  // Filter by administration code
  if (adminCode) {
    const adminCodeUpper = adminCode.toUpperCase();
    results = results.filter(item => 
      item.administration?.code === adminCodeUpper
    );
  }
  
  // Filter by active status
  if (active !== undefined) {
    results = results.filter(item => item.active === active);
  }
  
  // Limit results
  const limit = parseInt(req.body.limit) || 100;
  const limitedResults = results.slice(0, limit);
  
  res.json({
    success: true,
    query: req.body,
    count: results.length,
    returned: limitedResults.length,
    results: limitedResults
  });
});

// Get statistics - requires authentication
app.get('/api/stats', authenticate, (req, res) => {
  const stats = {
    totalItems: allData.length,
    uniqueNIFs: Object.keys(nifIndex).length,
    uniqueCodes: Object.keys(codeIndex).length,
    activeItems: allData.filter(item => item.active).length,
    inactiveItems: allData.filter(item => !item.active).length,
    byAdministration: {}
  };
  
  // Count by administration
  allData.forEach(item => {
    const adminCode = item.administration?.code;
    if (adminCode) {
      if (!stats.byAdministration[adminCode]) {
        stats.byAdministration[adminCode] = {
          code: adminCode,
          name: item.administration.name,
          count: 0
        };
      }
      stats.byAdministration[adminCode].count++;
    }
  });
  
  res.json({
    success: true,
    stats: stats
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      'GET /api/search/nif/:nif',
      'GET /api/search/code/:code',
      'GET /api/search/name/:name',
      'POST /api/search',
      'GET /api/stats'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
function start() {
  loadData();
  
  if (allData.length === 0) {
    console.error('❌ No data loaded. Cannot start server.');
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`🌐 DIR3 API Server running on http://localhost:${PORT}`);
    console.log(`📊 Serving ${allData.length} administrative relations`);
    console.log(`🔑 Authentication: ${process.env.API_TOKENS ? 'Enabled' : 'WARNING - No tokens configured!'}`);
    console.log(`\nTest it: curl -H "X-API-Key: YOUR_TOKEN" http://localhost:${PORT}/api/health`);
  });
}

start();
