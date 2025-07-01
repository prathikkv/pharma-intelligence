// api/search/opentargets.js
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

    // GraphQL query for Open Targets
    const graphqlQuery = `
      query search($queryString: String!) {
        search(queryString: $queryString, entityNames: ["target", "disease"]) {
          hits {
            id
            name
            description
            category
            ... on Target {
              approvedSymbol
              biotype
              tractability {
                label
                modality
                value
              }
            }
            ... on Disease {
              therapeuticAreas {
                id
                name
              }
            }
          }
        }
      }
    `;

    const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { queryString: query }
      })
    });

    if (!response.ok) {
      throw new Error(`Open Targets API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform data to standardized format
    const transformedResults = data.data?.search?.hits?.map(hit => ({
      target_name: hit.name,
      target_id: hit.id,
      description: hit.description || '',
      category: hit.category,
      biotype: hit.biotype || '',
      approved_symbol: hit.approvedSymbol || '',
      therapeutic_areas: hit.therapeuticAreas?.map(area => area.name).join(', ') || '',
      tractability: hit.tractability?.map(t => `${t.label}: ${t.value}`).join('; ') || '',
      url: `https://platform.opentargets.org/${hit.category}/${hit.id}`,
      source: 'Open Targets',
      query_match: query
    })) || [];

    res.status(200).json({
      results: transformedResults,
      total: transformedResults.length,
      query: query
    });

  } catch (error) {
    console.error('Open Targets API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Open Targets data',
      details: error.message 
    });
  }
}