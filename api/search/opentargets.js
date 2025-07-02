// api/search/opentargets-debug.js - Debug version to find the issue
export default async function handler(req, res) {
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

    const { query } = req.query;

    console.log(`🐛 DEBUG: OpenTargets API called with query: "${query}"`);

    try {
        // Step 1: Test basic GraphQL connection
        console.log(`🐛 Step 1: Testing basic GraphQL connection...`);
        
        const basicQuery = `
            query {
                meta {
                    name
                    version
                    major_version
                }
            }
        `;

        const testResponse = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                query: basicQuery
            }),
            signal: AbortSignal.timeout(10000)
        });

        console.log(`🐛 Basic connection status: ${testResponse.status}`);
        
        if (!testResponse.ok) {
            throw new Error(`Basic GraphQL connection failed: ${testResponse.status} ${testResponse.statusText}`);
        }

        const basicData = await testResponse.json();
        console.log(`🐛 Basic GraphQL response:`, basicData);

        if (basicData.errors) {
            console.error(`🐛 Basic GraphQL errors:`, basicData.errors);
        }

        // Step 2: Test entity search
        console.log(`🐛 Step 2: Testing entity search for "imatinib"...`);
        
        const searchQuery = `
            query {
                search(queryString: "imatinib", entityNames: ["drug"], page: {index: 0, size: 5}) {
                    hits {
                        id
                        name
                        entity
                        score
                    }
                    total
                }
            }
        `;

        const searchResponse = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                query: searchQuery
            }),
            signal: AbortSignal.timeout(10000)
        });

        console.log(`🐛 Search status: ${searchResponse.status}`);
        
        if (!searchResponse.ok) {
            throw new Error(`Search failed: ${searchResponse.status} ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        console.log(`🐛 Search response:`, JSON.stringify(searchData, null, 2));

        if (searchData.errors) {
            console.error(`🐛 Search errors:`, searchData.errors);
            return res.status(500).json({
                error: 'GraphQL Search Error',
                details: searchData.errors,
                step: 'entity_search',
                results: [],
                total: 0,
                query: query
            });
        }

        const hits = searchData.data?.search?.hits || [];
        if (hits.length === 0) {
            return res.status(200).json({
                error: 'No entities found',
                message: 'Could not find "imatinib" in OpenTargets database',
                debug_info: {
                    search_query: searchQuery,
                    search_response: searchData
                },
                results: [],
                total: 0,
                query: query
            });
        }

        const drugId = hits[0].id;
        console.log(`🐛 Found drug ID: ${drugId}`);

        // Step 3: Test drug diseases query
        console.log(`🐛 Step 3: Testing drug diseases query for ${drugId}...`);
        
        const drugQuery = `
            query {
                drug(chemblId: "${drugId}") {
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
                            clinicalTrialPhase
                        }
                    }
                }
            }
        `;

        const drugResponse = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                query: drugQuery
            }),
            signal: AbortSignal.timeout(15000)
        });

        console.log(`🐛 Drug query status: ${drugResponse.status}`);
        
        if (!drugResponse.ok) {
            throw new Error(`Drug query failed: ${drugResponse.status} ${drugResponse.statusText}`);
        }

        const drugData = await drugResponse.json();
        console.log(`🐛 Drug response preview:`, {
            errors: drugData.errors,
            hasData: !!drugData.data,
            drugName: drugData.data?.drug?.name,
            diseaseCount: drugData.data?.drug?.linkedDiseases?.count
        });

        if (drugData.errors) {
            console.error(`🐛 Drug query errors:`, drugData.errors);
            return res.status(500).json({
                error: 'GraphQL Drug Query Error',
                details: drugData.errors,
                step: 'drug_diseases',
                drugId: drugId,
                results: [],
                total: 0,
                query: query
            });
        }

        // Step 4: Process and return results
        const diseases = drugData.data?.drug?.linkedDiseases?.rows || [];
        const phase2Diseases = diseases.filter(d => {
            const phase = d.maxPhaseForIndication || d.clinicalTrialPhase;
            return phase === 2;
        });

        console.log(`🐛 Total diseases: ${diseases.length}, Phase 2 diseases: ${phase2Diseases.length}`);

        const results = phase2Diseases.map((disease, index) => ({
            id: `DEBUG-${drugId}-${disease.disease.id}-${index}`,
            database: 'Open Targets',
            title: `${drugData.data.drug.name} for ${disease.disease.name} (Phase 2)`,
            type: 'Phase 2 Disease Association',
            status_significance: 'Phase Clinical Data',
            details: `${drugData.data.drug.name} in Phase 2 for ${disease.disease.name}`,
            phase: 'Phase 2',
            status: 'Clinical Development',
            sponsor: 'Multiple',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: `https://platform.opentargets.org/evidence/${drugId}/${disease.disease.id}`,
            
            drug_name: drugData.data.drug.name,
            disease_name: disease.disease.name,
            phase_number: 2,
            entity_type: 'drug-phase-disease',
            raw_data: disease
        }));

        const biologist_data = phase2Diseases.map(d => ({
            disease: d.disease.name,
            maxPhaseForIndication: d.maxPhaseForIndication || d.clinicalTrialPhase
        }));

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            biologist_data: biologist_data,
            debug_info: {
                step_completed: 'all_steps_successful',
                drug_id: drugId,
                total_diseases: diseases.length,
                phase_2_diseases: phase2Diseases.length
            },
            search_timestamp: new Date().toISOString(),
            api_status: 'debug_success',
            system: 'OpenTargets Debug API'
        });

    } catch (error) {
        console.error('🐛 DEBUG API Error:', error);
        return res.status(500).json({
            error: 'DEBUG API Error',
            message: error.message,
            stack: error.stack,
            results: [],
            total: 0,
            query: query,
            search_timestamp: new Date().toISOString()
        });
    }
}
