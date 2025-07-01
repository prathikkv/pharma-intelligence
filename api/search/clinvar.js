// api/search/clinvar.js
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

    // Step 1: Search ClinVar using E-utilities
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${encodeURIComponent(query)}&retmode=json&retmax=20&usehistory=y`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`ClinVar search error: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    const ids = searchData.esearchresult?.idlist || [];
    
    if (ids.length === 0) {
      return res.status(200).json({
        results: [],
        total: 0,
        query: query
      });
    }

    // Step 2: Get detailed information using esummary
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=${ids.join(',')}&retmode=json`;
    
    const summaryResponse = await fetch(summaryUrl);
    if (!summaryResponse.ok) {
      throw new Error(`ClinVar summary error: ${summaryResponse.status}`);
    }
    
    const summaryData = await summaryResponse.json();
    
    // Transform data to standardized format
    const transformedResults = ids.map(id => {
      const result = summaryData.result[id];
      
      return {
        variant_name: result?.title || 'Unknown Variant',
        clinical_significance: result?.clinical_significance || '',
        gene: result?.gene_sort || '',
        condition: result?.condition_identifiers || query,
        review_status: result?.review_status || '',
        allele_id: result?.accession || '',
        variation_id: id,
        chromosome: result?.chr || '',
        position: result?.chrstart || '',
        reference_allele: result?.ref || '',
        alternate_allele: result?.alt || '',
        molecular_consequence: result?.molecular_consequence || '',
        url: `https://www.ncbi.nlm.nih.gov/clinvar/variation/${id}`,
        source: 'ClinVar',
        query_match: query,
        last_evaluated: result?.last_evaluated || ''
      };
    });

    res.status(200).json({
      results: transformedResults,
      total: transformedResults.length,
      query: query
    });

  } catch (error) {
    console.error('ClinVar API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch ClinVar data',
      details: error.message 
    });
  }
}
