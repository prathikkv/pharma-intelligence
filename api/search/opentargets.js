// api/search/opentargets.js - WORKING VERSION starting with proven queries
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query, limit = 100 } = req.query;

    if (!query) {
        return res.status(400).json({ 
            error: 'Query parameter required',
            example: 'Try: "List diseases in Phase-2 for Imatinib"'
        });
    }

    const startTime = performance.now();

    try {
        console.log(`🔍 OpenTargets: Processing query "${query}"`);
        
        // Parse the query to extract drug name and phase
        const queryAnalysis = parsePharmaceuticalQuery(query);
        console.log(`📊 Query analysis:`, queryAnalysis);
        
        let results = [];
        
        // For Imatinib specifically, let's test with the working approach
        if (queryAnalysis.drugName && queryAnalysis.drugName.toLowerCase() === 'imatinib') {
            console.log(`💊 Imatinib-specific search`);
            results = await searchImatinibTargets(queryAnalysis.phase);
        }
        // General search for other queries
        else {
            console.log(`🔎 General search: ${query}`);
            results = await generalOpenTargetsSearch(query, limit);
        }
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.log(`✅ OpenTargets: Returning ${results.length} results in ${responseTime}ms`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            parsed_query: queryAnalysis,
            search_timestamp: new Date().toISOString(),
            response_time: responseTime,
            api_status: 'success',
            data_source: 'OpenTargets Platform v4'
        });

    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.error('🚨 OpenTargets API Error:', error);
        
        return res.status(500).json({
            error: 'OpenTargets API error',
            message: error.message,
            results: [],
            total: 0,
            query: query,
            response_time: responseTime,
            search_timestamp: new Date().toISOString()
        });
    }
}

/**
 * Parse pharmaceutical queries - simplified version
 */
function parsePharmaceuticalQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    // Extract phase information
    let phase = null;
    const phaseMatch = lowerQuery.match(/phase[\s-]?(\d+)/i);
    if (phaseMatch) {
        phase = parseInt(phaseMatch[1]);
    }
    
    // Extract drug name
    let drugName = null;
    if (lowerQuery.includes('imatinib')) drugName = 'imatinib';
    else if (lowerQuery.includes('gleevec')) drugName = 'imatinib';
    
    return {
        drugName,
        phase,
        intent: drugName ? 'drug_info' : 'general',
        originalQuery: query
    };
}

/**
 * Test with the proven working query structure for Imatinib targets
 */
async function searchImatinibTargets(targetPhase) {
    console.log(`🔍 Searching Imatinib targets (Phase ${targetPhase || 'all'})`);
    
    // Known Imatinib targets: ABL1, KIT, PDGFRA
    const imatinibTargets = ["ENSG00000097007", "ENSG00000157404", "ENSG00000073756"];
    
    // Start with the proven working query structure from OpenTargets docs
    const workingQuery = `
        {
            targets(ensemblIds: ["ENSG00000097007", "ENSG00000157404", "ENSG00000073756"]) {
                id
                approvedSymbol
                approvedName
                knownDrugs {
                    uniqueDrugs
                    count
                    rows {
                        phase
                        status
                        label
                        drugId
                        targetId
                        diseaseId
                        prefName
                        ctIds
                        mechanismOfAction
                        approvedSymbol
                        drug {
                            id
                            name
                        }
                        disease {
                            id
                            name
                        }
                    }
                }
            }
        }
    `;
    
    try {
        console.log(`🔎 Testing proven working query for Imatinib targets`);
        
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PharmaIntelligence/3.0'
            },
            body: JSON.stringify({
                query: workingQuery
            }),
            timeout: 30000
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error ${response.status}:`, errorText);
            throw new Error(`API error: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();

        if (data.errors) {
            console.error('❌ GraphQL errors:', data.errors);
            throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }

        const targets = data.data?.targets || [];
        console.log(`📊 Successfully found ${targets.length} targets`);

        const allResults = [];
        let totalKnownDrugs = 0;
        
        targets.forEach((target) => {
            const knownDrugs = target.knownDrugs?.rows || [];
            totalKnownDrugs += knownDrugs.length;
            
            console.log(`🎯 Target ${target.approvedSymbol}: ${knownDrugs.length} known drugs`);
            
            knownDrugs.forEach((knownDrug, index) => {
                // Filter for Imatinib-related drugs
                const isImatinib = knownDrug.prefName?.toLowerCase().includes('imatinib') ||
                                 knownDrug.drug?.name?.toLowerCase().includes('imatinib');
                
                if (!isImatinib) return;
                
                // Filter by phase if specified
                if (targetPhase && knownDrug.phase !== targetPhase) {
                    return;
                }
                
                console.log(`✅ Found Imatinib entry: ${knownDrug.prefName} for ${knownDrug.label} (Phase ${knownDrug.phase})`);
                
                const result = {
                    id: `OT-${target.id}-${knownDrug.drugId}-${knownDrug.diseaseId}-${index}`,
                    database: 'Open Targets',
                    title: `${knownDrug.prefName || 'Imatinib'} for ${knownDrug.label}`,
                    type: `Clinical Trial - Phase ${knownDrug.phase}`,
                    status_significance: `Phase ${knownDrug.phase} ${knownDrug.status || 'Clinical'}`,
                    details: `${knownDrug.prefName} targeting ${target.approvedSymbol} for ${knownDrug.label}. Mechanism: ${knownDrug.mechanismOfAction || 'Kinase inhibitor'}`,
                    phase: `Phase ${knownDrug.phase}`,
                    status: knownDrug.status || 'Clinical Trial',
                    sponsor: 'Multiple Sponsors',
                    year: new Date().getFullYear(),
                    enrollment: knownDrug.ctIds?.length ? `${knownDrug.ctIds.length} trials` : 'Multiple trials',
                    link: `https://platform.opentargets.org/evidence/${knownDrug.drugId}/${knownDrug.diseaseId}`,
                    
                    // Enhanced fields
                    drug_id: knownDrug.drugId,
                    drug_name: knownDrug.prefName,
                    target_id: knownDrug.targetId,
                    target_symbol: target.approvedSymbol,
                    target_name: target.approvedName,
                    disease_id: knownDrug.diseaseId,
                    disease_name: knownDrug.label,
                    clinical_phase: knownDrug.phase,
                    trial_status: knownDrug.status,
                    mechanism_of_action: knownDrug.mechanismOfAction,
                    clinical_trial_ids: knownDrug.ctIds || [],
                    clinical_trial_count: knownDrug.ctIds?.length || 0,
                    
                    raw_data: { knownDrug, target }
                };
                
                allResults.push(result);
            });
        });
        
        console.log(`✅ Total known drugs found: ${totalKnownDrugs}`);
        console.log(`✅ Imatinib-filtered results: ${allResults.length}`);
        console.log(`📊 Total clinical trials: ${allResults.reduce((sum, r) => sum + (r.clinical_trial_count || 0), 0)}`);
        
        return allResults;
        
    } catch (error) {
        console.error('❌ Error in searchImatinibTargets:', error);
        throw error;
    }
}

/**
 * General search - simplified version
 */
async function generalOpenTargetsSearch(query, limit = 50) {
    const simpleQuery = `
        {
            search(queryString: "${query}") {
                hits {
                    id
                    name
                    entity
                }
            }
        }
    `;
    
    try {
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: simpleQuery
            })
        });

        const data = await response.json();
        const hits = data.data?.search?.hits || [];
        
        const results = hits.slice(0, limit).map((hit, index) => ({
            id: `OT-${hit.entity}-${hit.id}-${index}`,
            database: 'Open Targets',
            title: hit.name || hit.id,
            type: hit.entity,
            status_significance: hit.entity,
            details: `${hit.entity}: ${hit.name}`,
            phase: 'N/A',
            status: hit.entity,
            sponsor: 'N/A',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: `https://platform.opentargets.org/${hit.entity}/${hit.id}`,
            
            entity_type: hit.entity,
            entity_id: hit.id,
            entity_name: hit.name
        }));
        
        return results;
        
    } catch (error) {
        console.error('Error in generalOpenTargetsSearch:', error);
        throw error;
    }
}
