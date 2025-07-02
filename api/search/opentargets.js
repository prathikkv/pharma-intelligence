export default async function handler(req, res) {
    console.log('🎯 OpenTargets API called with query:', req.query.query);
    
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter required' });
        }

        console.log('🚀 Starting search for:', query);

        // Step 1: Search for Imatinib
        console.log('🔍 Step 1: Searching for Imatinib...');
        
        const searchResponse = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query SearchDrug($queryString: String!) {
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
                variables: {
                    queryString: "imatinib"
                }
            })
        });

        console.log('📡 Search response status:', searchResponse.status);

        if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error('❌ Search failed:', errorText);
            throw new Error(`Search failed: ${searchResponse.status} ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        console.log('🔍 Search data:', searchData);

        if (searchData.errors) {
            console.error('❌ GraphQL search errors:', searchData.errors);
            throw new Error(`GraphQL Error: ${searchData.errors[0]?.message}`);
        }

        const entities = searchData.data?.search?.hits || [];
        console.log('📊 Found entities:', entities.length);

        if (entities.length === 0) {
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                message: 'No drugs found in OpenTargets',
                search_timestamp: new Date().toISOString()
            });
        }

        const drugEntity = entities[0];
        const drugId = drugEntity.id;
        console.log(`💊 Using drug: ${drugEntity.name} (ID: ${drugId})`);

        // Step 2: Get disease associations - CORRECTED QUERY
        console.log('🔍 Step 2: Getting disease associations...');
        
        const drugResponse = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query GetDrugDiseases($chemblId: String!) {
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
                variables: {
                    chemblId: drugId
                }
            })
        });

        console.log('📡 Drug response status:', drugResponse.status);

        if (!drugResponse.ok) {
            const errorText = await drugResponse.text();
            console.error('❌ Drug query failed:', errorText);
            console.error('❌ Drug ID used:', drugId);
            
            // If the drug query fails, return what we can
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                message: `Found drug ${drugEntity.name} but could not get disease data`,
                search_timestamp: new Date().toISOString(),
                debug_info: {
                    drug_found: drugEntity.name,
                    drug_id: drugId,
                    error: `Drug query failed: ${drugResponse.status}`,
                    error_details: errorText
                }
            });
        }

        const drugData = await drugResponse.json();
        console.log('💊 Drug data received');

        if (drugData.errors) {
            console.error('❌ Drug query GraphQL errors:', drugData.errors);
            
            // Return what we can with error info
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                message: `Found drug ${drugEntity.name} but GraphQL query failed`,
                search_timestamp: new Date().toISOString(),
                debug_info: {
                    drug_found: drugEntity.name,
                    drug_id: drugId,
                    graphql_errors: drugData.errors
                }
            });
        }

        const drug = drugData.data?.drug;
        console.log('💊 Drug object:', drug);

        if (!drug) {
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                message: `Drug ${drugEntity.name} found in search but no detailed data available`,
                search_timestamp: new Date().toISOString(),
                debug_info: {
                    drug_found: drugEntity.name,
                    drug_id: drugId,
                    drug_data_response: drugData
                }
            });
        }

        const linkedDiseases = drug.linkedDiseases?.rows || [];
        console.log('🦠 Total linked diseases:', linkedDiseases.length);

        // Create results for ALL diseases first (to test the pipeline)
        const allResults = linkedDiseases.map((diseaseAssoc, index) => {
            const phase = diseaseAssoc.maxPhaseForIndication;
            return {
                id: `OT-${drugId}-${diseaseAssoc.disease.id}-${index}`,
                database: 'Open Targets',
                title: `${drug.name} for ${diseaseAssoc.disease.name}`,
                type: `Drug-Disease Association - Phase ${phase || 'Unknown'}`,
                status_significance: phase === 2 ? 'Phase 2 Clinical' : `Phase ${phase || 'Unknown'} Clinical`,
                details: `${drug.name} is in Phase ${phase || 'Unknown'} clinical trials for ${diseaseAssoc.disease.name}`,
                phase: `Phase ${phase || 'Unknown'}`,
                status: 'Clinical Development',
                sponsor: 'Multiple',
                year: 2025,
                enrollment: 'N/A',
                link: `https://platform.opentargets.org/evidence/${drugId}/${diseaseAssoc.disease.id}`,
                
                drug_id: drugId,
                drug_name: drug.name,
                disease_id: diseaseAssoc.disease.id,
                disease_name: diseaseAssoc.disease.name,
                clinical_phase: phase,
                entity_type: 'drug-disease',
                raw_data: diseaseAssoc
            };
        });

        // Filter for Phase 2 diseases
        const phase2Results = allResults.filter(result => result.clinical_phase === 2);
        
        console.log('📊 Total diseases:', linkedDiseases.length);
        console.log('📊 Phase 2 diseases:', phase2Results.length);
        console.log('📋 All phases found:', [...new Set(linkedDiseases.map(d => d.maxPhaseForIndication))]);

        return res.status(200).json({
            results: phase2Results.length > 0 ? phase2Results : allResults.slice(0, 20), // Show Phase 2 if found, otherwise first 20
            total: phase2Results.length > 0 ? phase2Results.length : allResults.length,
            query: query,
            search_timestamp: new Date().toISOString(),
            api_status: 'success',
            debug_info: {
                drug_found: drug.name,
                drug_id: drugId,
                total_diseases: linkedDiseases.length,
                phase_2_diseases: phase2Results.length,
                all_phases: [...new Set(linkedDiseases.map(d => d.maxPhaseForIndication))],
                showing_results: phase2Results.length > 0 ? 'phase_2_only' : 'all_phases_sample'
            }
        });

    } catch (error) {
        console.error('🚨 OpenTargets API Error:', error);
        
        return res.status(500).json({
            error: 'OpenTargets API error',
            message: error.message,
            results: [],
            total: 0,
            query: req.query?.query || 'unknown',
            search_timestamp: new Date().toISOString()
        });
    }
}
