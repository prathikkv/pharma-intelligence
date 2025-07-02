// api/search/opentargets.js - DETAILED DEBUG VERSION
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
        console.log('🔍 Step 1: Searching for Imatinib in OpenTargets...');
        
        const searchResponse = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query {
                        search(queryString: "imatinib", entityNames: ["drug"], page: {index: 0, size: 10}) {
                            hits {
                                id
                                name
                                entity
                                score
                            }
                            total
                        }
                    }
                `
            })
        });

        console.log('📡 Search response status:', searchResponse.status);

        if (!searchResponse.ok) {
            throw new Error(`Search failed: ${searchResponse.status} ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        console.log('🔍 Search response data:', JSON.stringify(searchData, null, 2));

        if (searchData.errors) {
            console.error('❌ GraphQL errors:', searchData.errors);
            throw new Error(`GraphQL Error: ${searchData.errors[0]?.message}`);
        }

        const entities = searchData.data?.search?.hits || [];
        console.log('📊 Found entities:', entities.length);
        console.log('📋 Entity details:', entities.map(e => ({ id: e.id, name: e.name, score: e.score })));

        if (entities.length === 0) {
            console.log('❌ No entities found - returning empty results');
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                message: 'No drugs found in OpenTargets for this query',
                search_timestamp: new Date().toISOString(),
                debug_info: {
                    step: 'entity_search_failed',
                    search_response: searchData
                }
            });
        }

        // Use the first entity (should be Imatinib)
        const drugEntity = entities[0];
        const drugId = drugEntity.id;
        console.log(`💊 Using drug: ${drugEntity.name} (ID: ${drugId})`);

        // Step 2: Get disease associations for this drug
        console.log('🔍 Step 2: Getting disease associations...');
        
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

        console.log('📝 Drug query:', drugQuery);

        const drugResponse = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ query: drugQuery })
        });

        console.log('📡 Drug response status:', drugResponse.status);

        if (!drugResponse.ok) {
            throw new Error(`Drug query failed: ${drugResponse.status} ${drugResponse.statusText}`);
        }

        const drugData = await drugResponse.json();
        console.log('💊 Drug response data:', JSON.stringify(drugData, null, 2));

        if (drugData.errors) {
            console.error('❌ Drug query GraphQL errors:', drugData.errors);
            throw new Error(`GraphQL Error: ${drugData.errors[0]?.message}`);
        }

        const drug = drugData.data?.drug;
        console.log('💊 Drug object:', drug);

        if (!drug) {
            console.log('❌ No drug data found');
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                message: 'No drug data found in OpenTargets',
                search_timestamp: new Date().toISOString(),
                debug_info: {
                    step: 'drug_data_not_found',
                    drug_id: drugId,
                    drug_response: drugData
                }
            });
        }

        const linkedDiseases = drug.linkedDiseases?.rows || [];
        console.log('🦠 Total linked diseases:', linkedDiseases.length);
        console.log('🦠 Disease sample:', linkedDiseases.slice(0, 5).map(d => ({ 
            name: d.disease.name, 
            phase: d.maxPhaseForIndication 
        })));

        // Step 3: Filter for Phase 2 diseases
        const phase2Diseases = linkedDiseases.filter(diseaseAssoc => {
            const phase = diseaseAssoc.maxPhaseForIndication;
            console.log(`🔍 Checking disease: ${diseaseAssoc.disease.name}, Phase: ${phase}`);
            return phase === 2;
        });

        console.log('📊 Phase 2 diseases found:', phase2Diseases.length);
        console.log('📋 Phase 2 disease names:', phase2Diseases.map(d => d.disease.name));

        // Step 4: Create results
        const results = phase2Diseases.map((diseaseAssoc, index) => ({
            id: `OT-${drugId}-${diseaseAssoc.disease.id}-${index}`,
            database: 'Open Targets',
            title: `${drug.name} for ${diseaseAssoc.disease.name}`,
            type: 'Drug-Disease Association - Phase 2',
            status_significance: 'Phase 2 Clinical',
            details: `${drug.name} is in Phase 2 clinical trials for ${diseaseAssoc.disease.name}`,
            phase: 'Phase 2',
            status: 'Clinical Development',
            sponsor: 'Multiple',
            year: 2025,
            enrollment: 'N/A',
            link: `https://platform.opentargets.org/evidence/${drugId}/${diseaseAssoc.disease.id}`,
            
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
                drug_found: drug.name,
                drug_id: drugId,
                total_diseases: linkedDiseases.length,
                phase_2_diseases: phase2Diseases.length,
                final_results: results.length
            }
        });

    } catch (error) {
        console.error('🚨 OpenTargets API Error:', error);
        console.error('🚨 Error stack:', error.stack);
        
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
