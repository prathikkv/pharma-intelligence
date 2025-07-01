// api/search/chembl.js
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

    // Call ChEMBL API
    const chemblUrl = `https://www.ebi.ac.uk/chembl/api/data/activity.json?target_chembl_id__icontains=${encodeURIComponent(query)}&limit=50`;
    
    const response = await fetch(chemblUrl);
    
    if (!response.ok) {
      throw new Error(`ChEMBL API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform data to standardized format
    const transformedResults = data.activities?.map(activity => ({
      compound_name: activity.molecule_chembl_id || 'Unknown Compound',
      target_name: activity.target_chembl_id || 'Unknown Target',
      activity_type: activity.standard_type || '',
      activity_value: activity.standard_value || '',
      activity_units: activity.standard_units || '',
      assay_description: activity.assay_description || '',
      activity_comment: activity.activity_comment || '',
      chembl_id: activity.molecule_chembl_id || '',
      url: `https://www.ebi.ac.uk/chembl/compound_report_card/${activity.molecule_chembl_id}/`,
      source: 'ChEMBL',
      query_match: query,
      assay_id: activity.assay_chembl_id || '',
      published_value: activity.published_value || '',
      published_units: activity.published_units || ''
    })) || [];

    res.status(200).json({
      results: transformedResults,
      total: transformedResults.length,
      query: query
    });

  } catch (error) {
    console.error('ChEMBL API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch ChEMBL data',
      details: error.message 
    });
  }
}