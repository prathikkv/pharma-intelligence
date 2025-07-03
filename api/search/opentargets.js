// api/search/opentargets.js - WORKING VERSION
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter required' });
    }

    try {
        console.log(`🔍 Searching OpenTargets for: "${query}"`);

        // Simple and working GraphQL query
        const graphqlQuery = `
            query SearchDrugs($queryString: String!) {
                search(queryString: $queryString, entityNames: ["drug"]) {
                    hits {
                        id
                        name
                        entity
                        ... on Drug {
                            id
                            name
                            drugType
                            maximumClinicalTrialPhase
                            linkedDiseases {
                                count
                                rows {
                                    disease {
                                        id
                                        name
                                    }
                                    maxPhaseForIndication
                                }
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
            throw new Error(`GraphQL API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }

        const hits = data.data?.search?.hits || [];
        console.log(`✅ Found ${hits.length} results`);

        // Format results
        const results = [];
        
        hits.forEach(hit => {
            if (hit.linkedDiseases?.rows) {
                hit.linkedDiseases.rows.forEach((diseaseAssoc, index) => {
                    results.push({
                        id: `${hit.id}-${diseaseAssoc.disease.id}-${index}`,
                        database: 'Open Targets',
                        title: `${hit.name} for ${diseaseAssoc.disease.name}`,
                        type: `Drug-Disease Association`,
                        status_significance: `Phase ${diseaseAssoc.maxPhaseForIndication || 'Unknown'}`,
                        details: `${hit.name} (${hit.drugType || 'Unknown type'}) for ${diseaseAssoc.disease.name}`,
                        phase: `Phase ${diseaseAssoc.maxPhaseForIndication || 'Unknown'}`,
                        status: 'Clinical Development',
                        sponsor: 'Multiple',
                        year: new Date().getFullYear(),
                        enrollment: 'N/A',
                        link: `https://platform.opentargets.org/evidence/${hit.id}/${diseaseAssoc.disease.id}`,
                        
                        // Specific fields
                        drug_id: hit.id,
                        drug_name: hit.name,
                        disease_id: diseaseAssoc.disease.id,
                        disease_name: diseaseAssoc.disease.name,
                        max_phase_for_indication: diseaseAssoc.maxPhaseForIndication
                    });
                });
            }
        });

        console.log(`🎯 Returning ${results.length} formatted results`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            search_timestamp: new Date().toISOString(),
            api_status: 'success'
        });

    } catch (error) {
        console.error('🚨 OpenTargets API Error:', error);
        
        return res.status(500).json({
            error: 'OpenTargets API error',
            message: error.message,
            results: [],
            total: 0,
            query: query
        });
    }
}
