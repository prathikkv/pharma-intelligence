// api/search/hpa.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    // Since HPA doesn't have a direct search API, we'll use their data format
    // For a production system, you'd need to implement gene search first
    // then fetch individual gene data
    
    // This is a simplified approach - in production you'd need more sophisticated gene matching
    const geneSearchTerms = query.split(' ').filter(term => 
      term.length > 2 && /^[A-Z0-9]+$/i.test(term)
    );

    const results = [];
    
    // Try to fetch data for potential gene symbols
    for (const geneTerm of geneSearchTerms.slice(0, 3)) { // Limit to 3 to avoid rate limiting
      try {
        const geneUrl = `https://www.proteinatlas.org/${geneTerm.toUpperCase()}.json`;
        const geneResponse = await fetch(geneUrl);
        
        if (geneResponse.ok) {
          const geneData = await geneResponse.json();
          
          // Transform HPA data to standardized format
          const transformedResult = {
            gene_name: geneData.gene || geneTerm,
            protein_name: geneData.name || '',
            ensembl_id: geneData.ensembl || '',
            description: geneData.summary || '',
            subcellular_location: geneData.subcellular_location?.join(', ') || '',
            tissue_specificity: geneData.tissue_specificity || '',
            pathology_summary: geneData.pathology || '',
            url: `https://www.proteinatlas.org/${geneData.ensembl || geneTerm}`,
            source: 'Human Protein Atlas',
            query_match: query,
            antibody_available: geneData.antibody ? 'Yes' : 'No'
          };
          
          results.push(transformedResult);
        }
      } catch (geneError) {
        console.warn(`Failed to fetch HPA data for ${geneTerm}:`, geneError.message);
      }
    }

    res.status(200).json({
      results: results,
      total: results.length,
      query: query,
      note: 'HPA results are based on gene symbol matching. For comprehensive protein expression data, visit individual gene pages.'
    });

  } catch (error) {
    console.error('HPA API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Human Protein Atlas data',
      details: error.message 
    });
  }
}
