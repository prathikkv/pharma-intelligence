// api/search/opentargets.js - FIXED VERSION to get hundreds of results
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

    const { query, limit = 500 } = req.query;

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
        
        // For Imatinib specifically, let's get ALL the data
        if (queryAnalysis.drugName && (queryAnalysis.drugName.toLowerCase() === 'imatinib' || queryAnalysis.correctedDrugName === 'imatinib')) {
            console.log(`💊 Imatinib comprehensive search (Phase ${queryAnalysis.phase || 'all'})`);
            results = await searchImatinibComprehensive(queryAnalysis.phase);
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
 * Enhanced pharmaceutical query parsing with typo correction
 */
function parsePharmaceuticalQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    // Extract phase information
    let phase = null;
    const phaseMatch = lowerQuery.match(/phase[\s-]?(\d+)/i);
    if (phaseMatch) {
        phase = parseInt(phaseMatch[1]);
    }
    
    // Enhanced drug name matching with typo tolerance
    let drugName = null;
    let correctedDrugName = null;
    
    // Exact matches first
    if (lowerQuery.includes('imatinib')) drugName = 'imatinib';
    else if (lowerQuery.includes('gleevec')) drugName = 'imatinib';
    else if (lowerQuery.includes('pembrolizumab')) drugName = 'pembrolizumab';
    else if (lowerQuery.includes('keytruda')) drugName = 'pembrolizumab';
    
    // Fuzzy matching for common typos
    else if (lowerQuery.includes('imitanib') || lowerQuery.includes('imatanib') || lowerQuery.includes('imatinab')) {
        correctedDrugName = 'imatinib';
        drugName = 'imatinib';
    }
    
    // Intent detection
    let intent = 'general';
    if (lowerQuery.includes('disease') && drugName) {
        intent = 'drug_diseases';
    } else if (lowerQuery.includes('phase') && drugName) {
        intent = 'drug_phase';
    } else if (drugName) {
        intent = 'drug_info';
    }
    
    return {
        drugName,
        correctedDrugName,
        phase,
        intent,
        originalQuery: query
    };
}

/**
 * COMPREHENSIVE Imatinib search - gets ALL the data
 */
async function searchImatinibComprehensive(targetPhase) {
    console.log(`🔍 COMPREHENSIVE Imatinib search (Phase ${targetPhase || 'all'})`);
    
    // Query with LARGE size to get all results
    const comprehensiveQuery = `
        {
            targets(ensemblIds: ["ENSG00000097007", "ENSG00000157404", "ENSG00000073756"]) {
                id
                approvedSymbol
                approvedName
                knownDrugs(size: 1000) {
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
                        drugType
                        drug {
                            id
                            name
                            drugType
                            isApproved
                        }
                        disease {
                            id
                            name
                            therapeuticAreas {
                                id
                                name
                            }
                        }
                        target {
                            id
                            approvedSymbol
                            approvedName
                        }
                    }
                }
            }
        }
    `;
    
    try {
        console.log(`🔎 Querying ALL Imatinib data from targets (size: 1000)`);
        
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PharmaIntelligence/3.0'
            },
            body: JSON.stringify({
                query: comprehensiveQuery
            }),
            timeout: 30000
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error ${response.status}:`, errorText);
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.errors) {
            console.error('❌ GraphQL errors:', data.errors);
            throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }

        const targets = data.data?.targets || [];
        console.log(`📊 Found ${targets.length} targets`);

        const allResults = [];
        let totalKnownDrugs = 0;
        let imatinibEntries = 0;
        let phaseBreakdown = {};
        
        targets.forEach((target, targetIndex) => {
            const knownDrugs = target.knownDrugs?.rows || [];
            totalKnownDrugs += knownDrugs.length;
            
            console.log(`🎯 Target ${targetIndex + 1} (${target.approvedSymbol}): ${knownDrugs.length} known drugs, Total count: ${target.knownDrugs?.count || 0}`);
            
            knownDrugs.forEach((knownDrug, index) => {
                // Enhanced Imatinib matching - look for ANY imatinib variant
                const drugName = knownDrug.prefName?.toLowerCase() || '';
                const drugName2 = knownDrug.drug?.name?.toLowerCase() || '';
                
                const isImatinib = drugName.includes('imatinib') ||
                                 drugName2.includes('imatinib') ||
                                 drugName.includes('gleevec') ||
                                 drugName2.includes('gleevec') ||
                                 drugName.includes('sti571') ||
                                 drugName2.includes('sti571');
                
                if (!isImatinib) return;
                
                imatinibEntries++;
                
                // Track phase breakdown
                const phase = knownDrug.phase;
                phaseBreakdown[phase] = (phaseBreakdown[phase] || 0) + 1;
                
                // Apply phase filter ONLY if specified
                if (targetPhase !== null && targetPhase !== undefined && knownDrug.phase !== targetPhase) {
                    console.log(`⏭️ Skipping ${knownDrug.prefName} for ${knownDrug.label} - Phase ${knownDrug.phase} (looking for Phase ${targetPhase})`);
                    return;
                }
                
                console.log(`✅ Found: ${knownDrug.prefName} for ${knownDrug.label} (Phase ${knownDrug.phase}, ${knownDrug.ctIds?.length || 0} trials) via ${target.approvedSymbol}`);
                
                const result = {
                    id: `OT-${target.id}-${knownDrug.drugId}-${knownDrug.diseaseId}-${index}`,
                    database: 'Open Targets',
                    title: `${knownDrug.prefName || 'Imatinib'} for ${knownDrug.label}`,
                    type: `Clinical Evidence - Phase ${knownDrug.phase} (${knownDrug.status || 'Clinical'})`,
                    status_significance: `Phase ${knownDrug.phase} ${knownDrug.status || 'Clinical'}`,
                    details: createEnhancedDescription(knownDrug, target),
                    phase: `Phase ${knownDrug.phase}`,
                    status: knownDrug.status || 'Clinical Evidence',
                    sponsor: 'Multiple Sponsors',
                    year: new Date().getFullYear(),
                    enrollment: knownDrug.ctIds?.length ? `${knownDrug.ctIds.length} trials` : 'Clinical evidence',
                    link: `https://platform.opentargets.org/evidence/${knownDrug.drugId}/${knownDrug.diseaseId}`,
                    
                    // Enhanced comprehensive fields
                    drug_id: knownDrug.drugId,
                    drug_name: knownDrug.prefName,
                    drug_type: knownDrug.drugType || knownDrug.drug?.drugType,
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
                    therapeutic_areas: knownDrug.disease?.therapeuticAreas?.map(area => area.name) || [],
                    is_approved: knownDrug.drug?.isApproved,
                    
                    // Additional comprehensive links
                    drug_link: `https://platform.opentargets.org/drug/${knownDrug.drugId}`,
                    target_link: `https://platform.opentargets.org/target/${knownDrug.targetId}`,
                    disease_link: `https://platform.opentargets.org/disease/${knownDrug.diseaseId}`,
                    
                    // Clinical trial links
                    clinical_trials_links: knownDrug.ctIds?.map(ctId => 
                        `https://clinicaltrials.gov/ct2/show/${ctId}`
                    ) || [],
                    
                    raw_data: { knownDrug, target }
                };
                
                allResults.push(result);
            });
        });
        
        console.log(`✅ COMPREHENSIVE RESULTS:`);
        console.log(`   📊 Total known drugs across all targets: ${totalKnownDrugs}`);
        console.log(`   💊 Total Imatinib entries found: ${imatinibEntries}`);
        console.log(`   🔬 Phase breakdown:`, phaseBreakdown);
        console.log(`   ✅ Final filtered results: ${allResults.length}`);
        console.log(`   🏥 Total clinical trials: ${allResults.reduce((sum, r) => sum + (r.clinical_trial_count || 0), 0)}`);
        
        // Sort results by phase (requested phase first), then by trial count
        allResults.sort((a, b) => {
            // If a specific phase was requested, put those first
            if (targetPhase !== null && targetPhase !== undefined) {
                if (a.clinical_phase === targetPhase && b.clinical_phase !== targetPhase) return -1;
                if (a.clinical_phase !== targetPhase && b.clinical_phase === targetPhase) return 1;
            }
            
            // Then by phase (higher phases first)
            if (a.clinical_phase !== b.clinical_phase) {
                return b.clinical_phase - a.clinical_phase;
            }
            
            // Then by trial count (more trials first)
            return (b.clinical_trial_count || 0) - (a.clinical_trial_count || 0);
        });
        
        return allResults;
        
    } catch (error) {
        console.error('❌ Error in searchImatinibComprehensive:', error);
        throw error;
    }
}

/**
 * Enhanced description creation
 */
function createEnhancedDescription(knownDrug, target) {
    const components = [];
    
    if (knownDrug.mechanismOfAction) {
        components.push(`Mechanism: ${knownDrug.mechanismOfAction}`);
    } else {
        components.push(`Target: ${target.approvedSymbol}`);
    }
    
    const drugType = knownDrug.drugType || knownDrug.drug?.drugType;
    if (drugType) {
        components.push(`Type: ${drugType}`);
    }
    
    if (knownDrug.ctIds?.length) {
        components.push(`${knownDrug.ctIds.length} clinical trials`);
    }
    
    if (knownDrug.status) {
        components.push(`Status: ${knownDrug.status}`);
    }
    
    return components.length > 0 ? components.join(' | ') : 
           `${knownDrug.prefName} targeting ${target.approvedSymbol} for ${knownDrug.label}`;
}

/**
 * Enhanced general search
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
        console.log(`🔍 General search for: "${query}"`);
        
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: simpleQuery
            })
        });

        if (!response.ok) {
            throw new Error(`General search API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.errors) {
            console.error('General search GraphQL errors:', data.errors);
            return [];
        }
        
        const hits = data.data?.search?.hits || [];
        console.log(`📊 General search found ${hits.length} hits`);
        
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
        return [];
    }
}
