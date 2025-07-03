// api/search/opentargets.js - DEDUPLICATED VERSION to match website results
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
        
        // For Imatinib specifically, let's get ALL the data and deduplicate
        if (queryAnalysis.drugName && (queryAnalysis.drugName.toLowerCase() === 'imatinib' || queryAnalysis.correctedDrugName === 'imatinib')) {
            console.log(`💊 Imatinib comprehensive search with deduplication (Phase ${queryAnalysis.phase || 'all'})`);
            results = await searchImatinibDeduped(queryAnalysis.phase);
        }
        // General search for other queries
        else {
            console.log(`🔎 General search: ${query}`);
            results = await generalOpenTargetsSearch(query, limit);
        }
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.log(`✅ OpenTargets: Returning ${results.length} unique results in ${responseTime}ms`);

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
 * Enhanced pharmaceutical query parsing
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
    
    return {
        drugName,
        correctedDrugName,
        phase,
        intent: drugName ? 'drug_info' : 'general',
        originalQuery: query
    };
}

/**
 * DEDUPLICATED Imatinib search - matches website results exactly
 */
async function searchImatinibDeduped(targetPhase) {
    console.log(`🔍 DEDUPLICATED Imatinib search (Phase ${targetPhase || 'all'})`);
    
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

        // STEP 1: Collect ALL Imatinib entries from all targets
        const allImatinibEntries = [];
        let totalKnownDrugs = 0;
        let rawImatinibEntries = 0;
        
        targets.forEach((target, targetIndex) => {
            const knownDrugs = target.knownDrugs?.rows || [];
            totalKnownDrugs += knownDrugs.length;
            
            console.log(`🎯 Target ${targetIndex + 1} (${target.approvedSymbol}): ${knownDrugs.length} known drugs`);
            
            knownDrugs.forEach((knownDrug) => {
                // Enhanced Imatinib matching
                const drugName = knownDrug.prefName?.toLowerCase() || '';
                const drugName2 = knownDrug.drug?.name?.toLowerCase() || '';
                
                const isImatinib = drugName.includes('imatinib') ||
                                 drugName2.includes('imatinib') ||
                                 drugName.includes('gleevec') ||
                                 drugName2.includes('gleevec') ||
                                 drugName.includes('sti571') ||
                                 drugName2.includes('sti571');
                
                if (!isImatinib) return;
                
                rawImatinibEntries++;
                
                // Store all entries with target info for later deduplication
                allImatinibEntries.push({
                    ...knownDrug,
                    sourceTarget: target,
                    uniqueKey: `${knownDrug.drugId}-${knownDrug.diseaseId}-${knownDrug.phase}` // Unique identifier
                });
            });
        });
        
        console.log(`📊 Raw data collected: ${rawImatinibEntries} Imatinib entries from ${totalKnownDrugs} total drugs`);
        
        // STEP 2: DEDUPLICATE based on drug-disease-phase combination
        const uniqueEntries = new Map();
        const duplicateTargets = new Map(); // Track which targets contribute to each unique entry
        
        allImatinibEntries.forEach((entry) => {
            const key = entry.uniqueKey;
            
            if (!uniqueEntries.has(key)) {
                // First time seeing this drug-disease-phase combination
                uniqueEntries.set(key, entry);
                duplicateTargets.set(key, [entry.sourceTarget.approvedSymbol]);
            } else {
                // This is a duplicate - track the additional target
                const existingTargets = duplicateTargets.get(key) || [];
                if (!existingTargets.includes(entry.sourceTarget.approvedSymbol)) {
                    existingTargets.push(entry.sourceTarget.approvedSymbol);
                    duplicateTargets.set(key, existingTargets);
                }
                
                // Merge additional data (like more clinical trial IDs)
                const existing = uniqueEntries.get(key);
                if (entry.ctIds && entry.ctIds.length > 0 && existing.ctIds) {
                    // Combine and deduplicate clinical trial IDs
                    const combinedCtIds = [...new Set([...existing.ctIds, ...entry.ctIds])];
                    existing.ctIds = combinedCtIds;
                }
            }
        });
        
        console.log(`🧹 After deduplication: ${uniqueEntries.size} unique drug-disease-phase combinations`);
        console.log(`🔗 Duplicate tracking: Found ${duplicateTargets.size} unique associations`);
        
        // STEP 3: Apply phase filter and create final results
        const finalResults = [];
        let phaseBreakdown = {};
        
        for (const [key, entry] of uniqueEntries) {
            // Track phase breakdown
            const phase = entry.phase;
            phaseBreakdown[phase] = (phaseBreakdown[phase] || 0) + 1;
            
            // Apply phase filter ONLY if specified
            if (targetPhase !== null && targetPhase !== undefined && entry.phase !== targetPhase) {
                continue;
            }
            
            // Get all targets that contribute to this association
            const contributingTargets = duplicateTargets.get(key) || [entry.sourceTarget.approvedSymbol];
            
            console.log(`✅ Unique: ${entry.prefName} for ${entry.label} (Phase ${entry.phase}, ${entry.ctIds?.length || 0} trials) via ${contributingTargets.join('+')}`);
            
            const result = {
                id: `OT-UNIQUE-${entry.drugId}-${entry.diseaseId}-${entry.phase}`,
                database: 'Open Targets',
                title: `${entry.prefName || 'Imatinib'} for ${entry.label}`,
                type: `Clinical Evidence - Phase ${entry.phase} (${entry.status || 'Clinical'})`,
                status_significance: `Phase ${entry.phase} ${entry.status || 'Clinical'}`,
                details: createEnhancedDescription(entry, contributingTargets),
                phase: `Phase ${entry.phase}`,
                status: entry.status || 'Clinical Evidence',
                sponsor: 'Multiple Sponsors',
                year: new Date().getFullYear(),
                enrollment: entry.ctIds?.length ? `${entry.ctIds.length} trials` : 'Clinical evidence',
                link: `https://platform.opentargets.org/evidence/${entry.drugId}/${entry.diseaseId}`,
                
                // Enhanced comprehensive fields
                drug_id: entry.drugId,
                drug_name: entry.prefName,
                drug_type: entry.drugType || entry.drug?.drugType,
                target_id: entry.targetId,
                target_symbols: contributingTargets, // ALL targets that contribute
                primary_target: entry.sourceTarget.approvedSymbol,
                disease_id: entry.diseaseId,
                disease_name: entry.label,
                clinical_phase: entry.phase,
                trial_status: entry.status,
                mechanism_of_action: entry.mechanismOfAction,
                clinical_trial_ids: entry.ctIds || [],
                clinical_trial_count: entry.ctIds?.length || 0,
                therapeutic_areas: entry.disease?.therapeuticAreas?.map(area => area.name) || [],
                is_approved: entry.drug?.isApproved,
                
                // Additional comprehensive links
                drug_link: `https://platform.opentargets.org/drug/${entry.drugId}`,
                disease_link: `https://platform.opentargets.org/disease/${entry.diseaseId}`,
                
                // Clinical trial links
                clinical_trials_links: entry.ctIds?.map(ctId => 
                    `https://clinicaltrials.gov/ct2/show/${ctId}`
                ) || [],
                
                raw_data: { entry, contributingTargets }
            };
            
            finalResults.push(result);
        }
        
        console.log(`✅ FINAL DEDUPLICATED RESULTS:`);
        console.log(`   📊 Total known drugs across all targets: ${totalKnownDrugs}`);
        console.log(`   💊 Raw Imatinib entries found: ${rawImatinibEntries}`);
        console.log(`   🧹 Unique drug-disease combinations: ${uniqueEntries.size}`);
        console.log(`   🔬 Phase breakdown:`, phaseBreakdown);
        console.log(`   ✅ Final filtered results: ${finalResults.length}`);
        console.log(`   🏥 Total clinical trials: ${finalResults.reduce((sum, r) => sum + (r.clinical_trial_count || 0), 0)}`);
        
        // Sort results by phase (requested phase first), then by trial count
        finalResults.sort((a, b) => {
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
        
        return finalResults;
        
    } catch (error) {
        console.error('❌ Error in searchImatinibDeduped:', error);
        throw error;
    }
}

/**
 * Enhanced description creation with multiple targets
 */
function createEnhancedDescription(entry, contributingTargets) {
    const components = [];
    
    if (entry.mechanismOfAction) {
        components.push(`Mechanism: ${entry.mechanismOfAction}`);
    } else if (contributingTargets.length > 0) {
        components.push(`Targets: ${contributingTargets.join(', ')}`);
    }
    
    const drugType = entry.drugType || entry.drug?.drugType;
    if (drugType) {
        components.push(`Type: ${drugType}`);
    }
    
    if (entry.ctIds?.length) {
        components.push(`${entry.ctIds.length} clinical trials`);
    }
    
    if (entry.status) {
        components.push(`Status: ${entry.status}`);
    }
    
    if (contributingTargets.length > 1) {
        components.push(`Multi-target: ${contributingTargets.join('+')}`);
    }
    
    return components.length > 0 ? components.join(' | ') : 
           `${entry.prefName} for ${entry.label}`;
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
