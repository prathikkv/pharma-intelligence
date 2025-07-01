// api/search/index.js - Combined search endpoint
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { query, database } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const baseUrl = req.headers.host?.includes('localhost') 
      ? 'http://localhost:3000' 
      : `https://${req.headers.host}`;

    const searchPromises = [];
    const databases = database ? [database] : ['clinicaltrials', 'opentargets', 'clinvar', 'hpa'];

    // Call each database API
    for (const db of databases) {
      const apiUrl = `${baseUrl}/api/search/${db}?query=${encodeURIComponent(query)}`;
      searchPromises.push(
        fetch(apiUrl)
          .then(res => res.json())
          .then(data => ({ database: db, ...data }))
          .catch(error => ({ 
            database: db, 
            error: error.message, 
            results: [] 
          }))
      );
    }

    const results = await Promise.all(searchPromises);
    
    // Combine all results
    const combinedResults = [];
    const errors = [];
    let totalResults = 0;

    results.forEach(result => {
      if (result.error) {
        errors.push({ database: result.database, error: result.error });
      } else {
        combinedResults.push(...(result.results || []));
        totalResults += result.total || 0;
      }
    });

    res.status(200).json({
      results: combinedResults,
      total: totalResults,
      query: query,
      databases_searched: databases,
      errors: errors.length > 0 ? errors : undefined,
      search_timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Combined search error:', error);
    res.status(500).json({ 
      error: 'Failed to perform combined search',
      details: error.message 
    });
  }
}