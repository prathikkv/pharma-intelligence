// api/search/opentargets.js - DEBUG VERSION to identify the 500 error
export default async function handler(req, res) {
    console.log('🎯 OpenTargets API started');
    console.log('📝 Request method:', req.method);
    console.log('📝 Request query:', req.query);
    
    try {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            console.log('✅ Handling OPTIONS request');
            res.status(200).end();
            return;
        }

        if (req.method !== 'GET') {
            console.log('❌ Invalid method:', req.method);
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { query, limit = 200 } = req.query;
        console.log('📊 Extracted parameters:', { query, limit });

        if (!query) {
            console.log('❌ No query parameter provided');
            return res.status(400).json({ 
                error: 'Query parameter is required',
                example: 'Try: /api/search/opentargets?query=imatinib'
            });
        }

        console.log('🚀 Starting OpenTargets search for:', query);

        // Step 1: Test basic connectivity
        console.log('🔍 Step 1: Testing OpenTargets API connectivity...');
        
        const testQuery = `
            query {
                meta {
                    name
                    version
                }
            }
        `;

        const testResponse = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ query: testQuery }),
            signal: AbortSignal.timeout(10000)
        });

        console.log('📡 Test response status:', testResponse.status);

        if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.error('❌ Test request failed:', errorText);
            throw new Error(`OpenTargets API test failed: ${testResponse.status} ${testResponse.statusText}`);
        }

        const testData = await testResponse.json();
        console.log('✅ OpenTargets API connectivity test passed:', testData);

        // Step 2: Search for Imatinib specifically
        console.log('🔍 Step 2: Searching for Imatinib...');
        
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
            body: JSON.stringify({ query: searchQuery }),
            signal: AbortSignal.timeout(15000)
        });

        console.log('📡 Search response status:', searchResponse.status);

        if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error('❌ Search request failed:', errorText);
            throw new Error(`Search failed: ${searchResponse.status} ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        console.log('🔍 Search results:', searchData);

        if (searchData.errors) {
            console.error('❌ GraphQL search errors:', searchData.errors);
            throw new Error(`GraphQL Error: ${searchData.errors[0]?.message || 'Unknown error'}`);
        }

        const entities = searchData.data?.search?.hits || [];
        console.log('📊 Found entities:', entities.length);

        if (entities.length === 0) {
            console.log('⚠️ No entities found');
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                message: 'No entities found in OpenTargets',
                debug_info: {
                    step: 'entity_search',
                    search_response: searchData
                },
                search_timestamp: new Date().toISOString()
            });
        }

        const drugId = entities[0].id;
        console.log('💊 Processing drug:', drugId, entities[0].name);

        // Step 3: Get drug diseases
        console.log('🔍 Step 3: Getting drug diseases...');
        
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
            body: JSON.stringify({ query: drugQuery }),
            signal: AbortSignal.timeout(15000)
        });

        console.log('📡 Drug response status:', drugResponse.status);

        if (!drugResponse.ok) {
            const errorText = await drugResponse.text();
            console.error('❌ Drug request failed:', errorText);
            throw new Error(`Drug query failed: ${drugResponse.status} ${drugResponse.statusText}`);
        }

        const drugData = await drugResponse.json();
        console.log('💊 Drug data received');

        if (drugData.errors) {
            console.error('❌ GraphQL drug errors:', drugData.errors);
            throw new Error(`GraphQL Error: ${drugData.errors[0]?.message || 'Unknown error'}`);
        }

        // Step 4: Process results
        console.log('🔍 Step 4: Processing results...');
        
        const drug = drugData.data?.drug;
        const diseases = drug?.linkedDiseases?.rows || [];
        console.log('📊 Total diseases found:', diseases.length);

        // Filter for Phase 2
        const phase2Diseases = diseases.filter(d => d.maxPhaseForIndication === 2);
        console.log('📊 Phase 2 diseases found:', phase2Diseases.length);

        const results = phase2Diseases.map((diseaseAssoc, index) => ({
            id: `OT-${drugId}-${diseaseAssoc.disease.id}-${index}`,
            database: 'Open Targets',
            title: `${drug.name} for ${diseaseAssoc.disease.name} (Phase 2)`,
            type: 'Drug-Disease Association - Phase 2',
            status_significance: 'Phase 2 Clinical',
            details: `${drug.name} is in Phase 2 clinical trials for ${diseaseAssoc.disease.name}`,
            phase: 'Phase 2',
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
            clinical_phase: 2,
            entity_type: 'drug-disease',
            raw_data: diseaseAssoc
        }));

        console.log('✅ Final results prepared:', results.length);

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
                phase_2_diseases: phase2Diseases.length,
                final_results: results.length
            }
        });

    } catch (error) {
        console.error('🚨 API Error occurred:', error);
        console.error('🚨 Error stack:', error.stack);
        
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            results: [],
            total: 0,
            query: req.query?.query || 'unknown',
            search_timestamp: new Date().toISOString(),
            debug_info: {
                step: 'error_occurred',
                error_type: error.name,
                error_message: error.message
            }
        });
    }
}
