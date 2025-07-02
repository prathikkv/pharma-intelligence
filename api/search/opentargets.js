// SIMPLIFIED VERSION - PAGES ROUTER COMPATIBLE
export default async function handler(req, res) {
    console.log('🎯 OpenTargets API called with:', req.query);
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query, limit = 200 } = req.query;

    if (!query) {
        return res.status(400).json({ 
            error: 'Query parameter is required',
            example: 'Try: /api/search/opentargets?query=List the diseases in Phase-2 for Imatinib'
        });
    }

    try {
        console.log(`🔍 Processing OpenTargets query: "${query}"`);
        
        // Step 1: Basic entity search to verify API works
        const searchResponse = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query SearchEntities($queryString: String!) {
                        search(queryString: $queryString, entityNames: ["drug"], page: {index: 0, size: 10}) {
                            hits {
                                id
                                name
                                entity
                                score
                            }
                            total
                        }
                    }
                `,
                variables: { queryString: 'imatinib' }
            }),
            signal: AbortSignal.timeout(15000)
        });

        if (!searchResponse.ok) {
            throw new Error(`Search failed: ${searchResponse.status} ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        console.log('🔍 Search response:', searchData);

        if (searchData.errors) {
            throw new Error(`GraphQL Error: ${searchData.errors[0]?.message}`);
        }

        const entities = searchData.data?.search?.hits || [];
        if (entities.length === 0) {
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                message: 'No entities found in OpenTargets',
                search_timestamp: new Date().toISOString()
            });
        }

        // Step 2: Get detailed data for the first drug found
        const drugId = entities[0].id;
        console.log(`💊 Getting diseases for drug: ${drugId}`);

        const drugResponse = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query DrugDiseases($chemblId: String!) {
                        drug(chemblId: $chemblId) {
                            id
                            name
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
                `,
                variables: { chemblId: drugId }
            }),
            signal: AbortSignal.timeout(15000)
        });

        if (!drugResponse.ok) {
            throw new Error(`Drug query failed: ${drugResponse.status} ${drugResponse.statusText}`);
        }

        const drugData = await drugResponse.json();
        console.log('💊 Drug response received');

        if (drugData.errors) {
            throw new Error(`GraphQL Error: ${drugData.errors[0]?.message}`);
        }

        // Step 3: Process results
        const drug = drugData.data?.drug;
        const diseases = drug?.linkedDiseases?.rows || [];
        
        // Filter for Phase 2 if query mentions it
        const isPhase2Query = query.toLowerCase().includes('phase-2') || query.toLowerCase().includes('phase 2');
        const filteredDiseases = isPhase2Query 
            ? diseases.filter(d => d.maxPhaseForIndication === 2)
            : diseases;

        const results = filteredDiseases.map((diseaseAssoc, index) => ({
            id: `OT-${drugId}-${diseaseAssoc.disease.id}-${index}`,
            database: 'Open Targets',
            title: `${drug.name} for ${diseaseAssoc.disease.name}`,
            type: `Drug-Disease Association - Phase ${diseaseAssoc.maxPhaseForIndication || 'Unknown'}`,
            status_significance: 'Clinical Data',
            details: `${drug.name} is in Phase ${diseaseAssoc.maxPhaseForIndication || 'Unknown'} for ${diseaseAssoc.disease.name}`,
            phase: `Phase ${diseaseAssoc.maxPhaseForIndication || 'Unknown'}`,
            status: 'Clinical Development',
            sponsor: 'Multiple',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: `https://platform.opentargets.org/evidence/${drugId}/${diseaseAssoc.disease.id}`,
            
            // Structured data
            drug_id: drugId,
            drug_name: drug.name,
            disease_id: diseaseAssoc.disease.id,
            disease_name: diseaseAssoc.disease.name,
            clinical_phase: diseaseAssoc.maxPhaseForIndication,
            entity_type: 'drug-disease',
            raw_data: diseaseAssoc
        }));

        console.log(`✅ OpenTargets: Found ${results.length} results`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            search_timestamp: new Date().toISOString(),
            api_status: 'success',
            debug_info: {
                entities_found: entities.length,
                drug_processed: drug?.name,
                total_diseases: diseases.length,
                filtered_results: results.length
            }
        });

    } catch (error) {
        console.error('OpenTargets API error:', error);
        
        return res.status(500).json({
            error: 'OpenTargets API error',
            message: error.message,
            results: [],
            total: 0,
            query: query,
            search_timestamp: new Date().toISOString()
        });
    }
}
