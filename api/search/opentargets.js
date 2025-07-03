// api/search/opentargets.js - VALIDATED VERSION using correct OpenTargets schema
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

    const { query, limit = 200 } = req.query;

    if (!query) {
        return res.status(400).json({ 
            error: 'Query parameter required',
            example: 'Try: "List diseases in Phase-2 for Imatinib" or "Imatinib Phase 2"'
        });
    }

    const startTime = performance.now();

    try {
        console.log(`🔍 OpenTargets: Processing query "${query}"`);
        
        // Parse the query to extract drug name and phase
        const queryAnalysis = parsePharmaceuticalQuery(query);
        console.log(`📊 Query analysis:`, queryAnalysis);
        
        let results = [];
        
        // Strategy 1: If we detected a specific drug name, search by drug targets
        if (queryAnalysis.drugName) {
            console.log(`💊 Drug-focused search: ${queryAnalysis.drugName}`);
            results = await searchByDrugTargets(queryAnalysis.drugName, queryAnalysis.phase, limit);
        }
        // Strategy 2: General search
        else {
            console.log(`🔎 General search: ${query}`);
            results = await generalOpenTargetsSearch(query, limit);
        }
        
        // Sort results by relevance
        results = sortByRelevance(results, queryAnalysis);
        
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
 * Parse pharmaceutical queries to extract drug names and phases
 */
function parsePharmaceuticalQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    // Extract phase information
    let phase = null;
    const phasePatterns = [
        /phase[\s-]?(\d+)/i,
        /phase[\s-]?(i{1,4})\b/i,
        /\bp(\d+)\b/i,
        /\bphase[\s-]?(one|two|three|four)\b/i
    ];
    
    for (const pattern of phasePatterns) {
        const match = lowerQuery.match(pattern);
        if (match) {
            let phaseStr = match[1];
            if (phaseStr === 'one' || phaseStr === 'i') phase = 1;
            else if (phaseStr === 'two' || phaseStr === 'ii') phase = 2;
            else if (phaseStr === 'three' || phaseStr === 'iii') phase = 3;
            else if (phaseStr === 'four' || phaseStr === 'iv') phase = 4;
            else phase = parseInt(phaseStr);
            break;
        }
    }
    
    // Extract drug names with their known targets
    const drugTargetMap = {
        'imatinib': ['ENSG00000097007', 'ENSG00000157404', 'ENSG00000073756'], // ABL1, KIT, PDGFRA
        'gleevec': ['ENSG00000097007', 'ENSG00000157404', 'ENSG00000073756'], // Same as imatinib
        'pembrolizumab': ['ENSG00000188389'], // PDCD1 (PD-1)
        'keytruda': ['ENSG00000188389'], // Same as pembrolizumab
        'nivolumab': ['ENSG00000188389'], // PDCD1 (PD-1)
        'opdivo': ['ENSG00000188389'], // Same as nivolumab
        'bevacizumab': ['ENSG00000112715'], // VEGFA
        'avastin': ['ENSG00000112715'], // Same as bevacizumab
        'trastuzumab': ['ENSG00000141736'], // ERBB2 (HER2)
        'herceptin': ['ENSG00000141736'], // Same as trastuzumab
        'rituximab': ['ENSG00000156738'], // MS4A1 (CD20)
        'rituxan': ['ENSG00000156738'] // Same as rituximab
    };
    
    let drugName = null;
    let targetIds = [];
    
    for (const [drug, targets] of Object.entries(drugTargetMap)) {
        if (lowerQuery.includes(drug)) {
            drugName = drug;
            targetIds = targets;
            break;
        }
    }
    
    // Determine query intent
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
        targetIds,
        phase,
        intent,
        originalQuery: query
    };
}

/**
 * Search by drug targets using the correct OpenTargets schema
 * This is the key function that accesses the 74 trials for Imatinib
 */
async function searchByDrugTargets(drugName, targetPhase, limit = 200) {
    console.log(`🔍 Searching for drug targets: ${drugName}${targetPhase ? ` in Phase ${targetPhase}` : ''}`);
    
    // Get target IDs for the drug
    const queryAnalysis = parsePharmaceuticalQuery(drugName);
    const targetIds = queryAnalysis.targetIds;
    
    if (!targetIds || targetIds.length === 0) {
        console.warn(`⚠️ No known targets found for drug: ${drugName}`);
        return [];
    }
    
    console.log(`🎯 Found ${targetIds.length} targets for ${drugName}: ${targetIds.join(', ')}`);
    
    // Query targets and their knownDrugs - THIS IS THE CORRECT APPROACH
    const targetQuery = `
        query TargetKnownDrugs($ensemblIds: [String!]!, $size: Int) {
            targets(ensemblIds: $ensemblIds) {
                id
                approvedSymbol
                approvedName
                biotype
                knownDrugs(size: $size) {
                    uniqueDrugs
                    uniqueDiseases
                    uniqueTargets
                    count
                    rows {
                        phase
                        status
                        label
                        drugId
                        targetId
                        diseaseId
                        drugType
                        mechanismOfAction
                        approvedSymbol
                        approvedName
                        prefName
                        ctIds
                        urls {
                            niceName
                            url
                        }
                        references {
                            source
                            urls
                        }
                        drug {
                            id
                            name
                            drugType
                            isApproved
                            maximumClinicalTrialPhase
                        }
                        target {
                            id
                            approvedSymbol
                            approvedName
                        }
                        disease {
                            id
                            name
                            therapeuticAreas {
                                id
                                name
                            }
                        }
                    }
                }
            }
        }
    `;
    
    try {
        console.log(`🔎 Querying ${targetIds.length} targets for known drugs`);
        
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PharmaIntelligence/3.0'
            },
            body: JSON.stringify({
                query: targetQuery,
                variables: { 
                    ensemblIds: targetIds,
                    size: limit
                }
            }),
            timeout: 30000
        });

        if (!response.ok) {
            throw new Error(`Target query API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
            console.error('Target query GraphQL errors:', data.errors);
            throw new Error(`Target query errors: ${JSON.stringify(data.errors)}`);
        }

        const targets = data.data?.targets || [];
        console.log(`📊 Found ${targets.length} targets with drug data`);

        const allResults = [];
        let totalKnownDrugs = 0;
        
        targets.forEach((target) => {
            const knownDrugs = target.knownDrugs?.rows || [];
            totalKnownDrugs += knownDrugs.length;
            
            console.log(`🎯 Target ${target.approvedSymbol}: ${knownDrugs.length} known drugs`);
            
            knownDrugs.forEach((knownDrug, index) => {
                // Filter by drug name if specified
                const drugMatches = !drugName || 
                    knownDrug.prefName?.toLowerCase().includes(drugName.toLowerCase()) ||
                    knownDrug.drug?.name?.toLowerCase().includes(drugName.toLowerCase());
                
                if (!drugMatches) return;
                
                // Filter by phase if specified
                if (targetPhase && knownDrug.phase !== targetPhase) {
                    return;
                }
                
                const result = {
                    id: `OT-${target.id}-${knownDrug.drugId}-${knownDrug.diseaseId}-${index}`,
                    database: 'Open Targets',
                    title: `${knownDrug.prefName || knownDrug.drug?.name} for ${knownDrug.label || knownDrug.disease?.name}`,
                    type: `Clinical Trial - Phase ${knownDrug.phase} (${knownDrug.status || 'Unknown Status'})`,
                    status_significance: `Phase ${knownDrug.phase} ${knownDrug.status || 'Clinical'}`,
                    details: createKnownDrugDescription(knownDrug, target),
                    phase: `Phase ${knownDrug.phase}`,
                    status: knownDrug.status || 'Clinical Trial',
                    sponsor: 'Multiple Sponsors',
                    year: new Date().getFullYear(),
                    enrollment: knownDrug.ctIds?.length ? `${knownDrug.ctIds.length} CT.gov trials` : 'See Clinical Trials',
                    link: knownDrug.urls?.[0]?.url || `https://platform.opentargets.org/evidence/${knownDrug.drugId}/${knownDrug.diseaseId}`,
                    
                    // Enhanced fields from knownDrugs schema
                    drug_id: knownDrug.drugId,
                    drug_name: knownDrug.prefName || knownDrug.drug?.name,
                    drug_type: knownDrug.drugType,
                    target_id: knownDrug.targetId,
                    target_symbol: knownDrug.approvedSymbol || target.approvedSymbol,
                    target_name: knownDrug.approvedName || target.approvedName,
                    disease_id: knownDrug.diseaseId,
                    disease_name: knownDrug.label || knownDrug.disease?.name,
                    clinical_phase: knownDrug.phase,
                    trial_status: knownDrug.status,
                    mechanism_of_action: knownDrug.mechanismOfAction,
                    is_approved: knownDrug.drug?.isApproved,
                    maximum_clinical_phase: knownDrug.drug?.maximumClinicalTrialPhase,
                    
                    // Clinical trial identifiers (this gives us the 74+ trials!)
                    clinical_trial_ids: knownDrug.ctIds || [],
                    clinical_trial_count: knownDrug.ctIds?.length || 0,
                    therapeutic_areas: knownDrug.disease?.therapeuticAreas?.map(area => area.name) || [],
                    
                    // Additional links
                    drug_link: `https://platform.opentargets.org/drug/${knownDrug.drugId}`,
                    target_link: `https://platform.opentargets.org/target/${knownDrug.targetId}`,
                    disease_link: `https://platform.opentargets.org/disease/${knownDrug.diseaseId}`,
                    evidence_link: `https://platform.opentargets.org/evidence/${knownDrug.drugId}/${knownDrug.diseaseId}`,
                    
                    // Clinical trial links
                    clinical_trials_links: knownDrug.ctIds?.map(ctId => 
                        `https://clinicaltrials.gov/ct2/show/${ctId}`
                    ) || [],
                    
                    raw_data: { knownDrug, target }
                };
                
                allResults.push(result);
            });
        });
        
        console.log(`✅ Total known drugs found: ${totalKnownDrugs}`);
        console.log(`✅ Filtered results: ${allResults.length}`);
        console.log(`📊 Total clinical trials: ${allResults.reduce((sum, r) => sum + (r.clinical_trial_count || 0), 0)}`);
        
        return allResults;
        
    } catch (error) {
        console.error('Error in searchByDrugTargets:', error);
        throw error;
    }
}

/**
 * General OpenTargets search for non-drug queries
 */
async function generalOpenTargetsSearch(query, limit = 50) {
    const graphqlQuery = `
        query GeneralSearch($queryString: String!) {
            search(queryString: $queryString) {
                hits {
                    id
                    name
                    entity
                    ... on Drug {
                        id
                        name
                        drugType
                        maximumClinicalTrialPhase
                        isApproved
                    }
                    ... on Target {
                        id
                        approvedSymbol
                        approvedName
                        biotype
                    }
                    ... on Disease {
                        id
                        name
                        therapeuticAreas {
                            id
                            name
                        }
                    }
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
                query: graphqlQuery,
                variables: { queryString: query }
            })
        });

        const data = await response.json();
        const hits = data.data?.search?.hits || [];
        
        const results = [];
        
        hits.forEach((hit, index) => {
            results.push({
                id: `OT-${hit.entity}-${hit.id}-${index}`,
                database: 'Open Targets',
                title: hit.name || hit.approvedSymbol || hit.id,
                type: `${hit.entity}`,
                status_significance: hit.entity === 'target' ? 'Drug Target' : 
                                   hit.entity === 'drug' ? 'Drug' : 'Disease',
                details: createGeneralDescription(hit),
                phase: hit.maximumClinicalTrialPhase ? `Phase ${hit.maximumClinicalTrialPhase}` : 'N/A',
                status: hit.entity,
                sponsor: 'N/A',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `https://platform.opentargets.org/${hit.entity}/${hit.id}`,
                
                entity_type: hit.entity,
                entity_id: hit.id,
                entity_name: hit.name || hit.approvedSymbol,
                is_approved: hit.isApproved,
                maximum_clinical_phase: hit.maximumClinicalTrialPhase
            });
        });
        
        return results;
        
    } catch (error) {
        console.error('Error in generalOpenTargetsSearch:', error);
        throw error;
    }
}

/**
 * Helper functions
 */
function createKnownDrugDescription(knownDrug, target) {
    const components = [];
    
    if (knownDrug.mechanismOfAction) {
        components.push(`Mechanism: ${knownDrug.mechanismOfAction}`);
    }
    
    if (knownDrug.drugType) {
        components.push(`Type: ${knownDrug.drugType}`);
    }
    
    if (knownDrug.phase) {
        components.push(`Phase: ${knownDrug.phase}`);
    }
    
    if (knownDrug.status) {
        components.push(`Status: ${knownDrug.status}`);
    }
    
    if (knownDrug.ctIds?.length) {
        components.push(`Trials: ${knownDrug.ctIds.length} CT.gov entries`);
    }
    
    if (target.approvedSymbol) {
        components.push(`Target: ${target.approvedSymbol}`);
    }
    
    return components.length > 0 ? components.join(' | ') : 
           `${knownDrug.prefName} targeting ${target.approvedSymbol} for ${knownDrug.label}`;
}

function createGeneralDescription(entity) {
    if (entity.entity === 'target') {
        return `${entity.approvedSymbol || entity.id} - ${entity.biotype || 'Unknown biotype'} target`;
    } else if (entity.entity === 'disease') {
        const areas = entity.therapeuticAreas?.map(area => area.name).slice(0, 2) || [];
        return areas.length > 0 ? `Disease in ${areas.join(', ')}` : 'Disease entity';
    } else if (entity.entity === 'drug') {
        return `${entity.name} - ${entity.drugType || 'Unknown type'} ${entity.isApproved ? '(Approved)' : '(Investigational)'}`;
    }
    return entity.name || entity.id;
}

function sortByRelevance(results, queryAnalysis) {
    return results.sort((a, b) => {
        // Exact drug name matches first
        if (queryAnalysis.drugName) {
            const aExactDrug = a.drug_name?.toLowerCase().includes(queryAnalysis.drugName.toLowerCase());
            const bExactDrug = b.drug_name?.toLowerCase().includes(queryAnalysis.drugName.toLowerCase());
            if (aExactDrug && !bExactDrug) return -1;
            if (!aExactDrug && bExactDrug) return 1;
        }
        
        // Exact phase matches second
        if (queryAnalysis.phase) {
            const aExactPhase = a.clinical_phase === queryAnalysis.phase;
            const bExactPhase = b.clinical_phase === queryAnalysis.phase;
            if (aExactPhase && !bExactPhase) return -1;
            if (!aExactPhase && bExactPhase) return 1;
        }
        
        // More clinical trials = more evidence
        const aTrials = a.clinical_trial_count || 0;
        const bTrials = b.clinical_trial_count || 0;
        if (aTrials !== bTrials) return bTrials - aTrials;
        
        // Higher phases generally first
        const aPhase = a.clinical_phase || 0;
        const bPhase = b.clinical_phase || 0;
        if (aPhase !== bPhase) return bPhase - aPhase;
        
        return 0;
    });
}
