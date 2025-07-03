// api/search/opentargets.js - ENHANCED VERSION with intelligent query parsing and phase filtering
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
        
        // Strategy 1: If we detected a specific drug and phase, search accordingly
        if (queryAnalysis.drugName && queryAnalysis.phase) {
            console.log(`🎯 Targeted search: ${queryAnalysis.drugName} in Phase ${queryAnalysis.phase}`);
            results = await searchDrugByPhase(queryAnalysis.drugName, queryAnalysis.phase, limit);
        }
        // Strategy 2: If we detected a drug but no specific phase, get all phases
        else if (queryAnalysis.drugName) {
            console.log(`💊 Drug-focused search: ${queryAnalysis.drugName}`);
            results = await searchDrugAllPhases(queryAnalysis.drugName, limit);
        }
        // Strategy 3: General search
        else {
            console.log(`🔎 General search: ${query}`);
            results = await generalOpenTargetsSearch(query, limit);
        }
        
        // Filter by phase if specified
        if (queryAnalysis.phase && results.length > 0) {
            const originalCount = results.length;
            results = results.filter(result => {
                const resultPhase = extractPhaseNumber(result.phase);
                return resultPhase === queryAnalysis.phase;
            });
            console.log(`🔬 Phase ${queryAnalysis.phase} filter: ${originalCount} → ${results.length} results`);
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
            data_source: 'OpenTargets Platform'
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
    
    // Extract drug names - common pharmaceutical compounds
    const drugPatterns = [
        /\b(imatinib|gleevec)\b/i,
        /\b(pembrolizumab|keytruda)\b/i,
        /\b(nivolumab|opdivo)\b/i,
        /\b(bevacizumab|avastin)\b/i,
        /\b(trastuzumab|herceptin)\b/i,
        /\b(rituximab|rituxan)\b/i,
        /\b(adalimumab|humira)\b/i,
        /\b(infliximab|remicade)\b/i,
        /\b(etanercept|enbrel)\b/i,
        /\b(paclitaxel|taxol)\b/i,
        /\b(docetaxel|taxotere)\b/i,
        /\b(carboplatin|paraplatin)\b/i,
        /\b(cisplatin|platinol)\b/i,
        /\b(5-fluorouracil|5-fu)\b/i,
        /\b(doxorubicin|adriamycin)\b/i,
        /\b(cyclophosphamide|cytoxan)\b/i,
        /\b(methotrexate|rheumatrex)\b/i,
        /\b(aspirin|acetylsalicylic acid)\b/i,
        /\b(metformin|glucophage)\b/i,
        /\b(atorvastatin|lipitor)\b/i
    ];
    
    let drugName = null;
    for (const pattern of drugPatterns) {
        const match = query.match(pattern);
        if (match) {
            drugName = match[1];
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
        phase,
        intent,
        originalQuery: query
    };
}

/**
 * Search for a specific drug in a specific phase
 */
async function searchDrugByPhase(drugName, phase, limit = 50) {
    console.log(`🔍 Searching ${drugName} in Phase ${phase}`);
    
    const graphqlQuery = `
        query SearchDrugByPhase($drugName: String!) {
            search(queryString: $drugName, entityNames: ["drug"]) {
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
                                    therapeuticAreas {
                                        id
                                        name
                                    }
                                }
                                maxPhaseForIndication
                                clinicalTrialCount
                            }
                        }
                        drugWarnings {
                            toxicityClass
                            references {
                                pmcid
                                pmid
                            }
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
                'Content-Type': 'application/json',
                'User-Agent': 'PharmaIntelligence/3.0'
            },
            body: JSON.stringify({
                query: graphqlQuery,
                variables: { drugName }
            }),
            timeout: 30000
        });

        if (!response.ok) {
            throw new Error(`GraphQL API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }

        const hits = data.data?.search?.hits || [];
        console.log(`📊 Found ${hits.length} drug matches for "${drugName}"`);

        const results = [];
        
        hits.forEach(hit => {
            if (hit.linkedDiseases?.rows) {
                hit.linkedDiseases.rows.forEach((diseaseAssoc, index) => {
                    const phaseForIndication = diseaseAssoc.maxPhaseForIndication;
                    
                    // Only include if it matches the requested phase or phase is not specified
                    if (!phase || phaseForIndication === phase) {
                        results.push({
                            id: `OT-${hit.id}-${diseaseAssoc.disease.id}-${index}`,
                            database: 'Open Targets',
                            title: `${hit.name} for ${diseaseAssoc.disease.name}`,
                            type: `Drug-Disease Association - Phase ${phaseForIndication}`,
                            status_significance: `Phase ${phaseForIndication} Clinical`,
                            details: createDetailedDescription(hit, diseaseAssoc),
                            phase: `Phase ${phaseForIndication}`,
                            status: getStatusFromPhase(phaseForIndication),
                            sponsor: 'Multiple Sponsors',
                            year: new Date().getFullYear(),
                            enrollment: diseaseAssoc.clinicalTrialCount ? `${diseaseAssoc.clinicalTrialCount} trials` : 'N/A',
                            link: `https://platform.opentargets.org/evidence/${hit.id}/${diseaseAssoc.disease.id}`,
                            
                            // Enhanced fields
                            drug_id: hit.id,
                            drug_name: hit.name,
                            drug_type: hit.drugType,
                            disease_id: diseaseAssoc.disease.id,
                            disease_name: diseaseAssoc.disease.name,
                            max_phase_for_indication: phaseForIndication,
                            clinical_trial_count: diseaseAssoc.clinicalTrialCount,
                            therapeutic_areas: diseaseAssoc.disease.therapeuticAreas?.map(area => area.name) || [],
                            maximum_clinical_phase: hit.maximumClinicalTrialPhase,
                            
                            // Additional links
                            drug_link: `https://platform.opentargets.org/drug/${hit.id}`,
                            disease_link: `https://platform.opentargets.org/disease/${diseaseAssoc.disease.id}`,
                            evidence_link: `https://platform.opentargets.org/evidence/${hit.id}/${diseaseAssoc.disease.id}`,
                            
                            raw_data: { drug: hit, association: diseaseAssoc }
                        });
                    }
                });
            }
        });
        
        console.log(`✅ Processed ${results.length} drug-disease associations`);
        return results;
        
    } catch (error) {
        console.error('Error in searchDrugByPhase:', error);
        throw error;
    }
}

/**
 * Search for a drug across all phases
 */
async function searchDrugAllPhases(drugName, limit = 50) {
    return await searchDrugByPhase(drugName, null, limit);
}

/**
 * General OpenTargets search
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
            if (hit.entity === 'drug' && hit.linkedDiseases?.rows) {
                hit.linkedDiseases.rows.forEach((diseaseAssoc, assocIndex) => {
                    results.push({
                        id: `OT-GEN-${hit.id}-${diseaseAssoc.disease.id}-${assocIndex}`,
                        database: 'Open Targets',
                        title: `${hit.name} for ${diseaseAssoc.disease.name}`,
                        type: `${hit.entity} - Phase ${diseaseAssoc.maxPhaseForIndication}`,
                        status_significance: `Phase ${diseaseAssoc.maxPhaseForIndication}`,
                        details: `${hit.name} (${hit.drugType || 'Unknown type'}) for ${diseaseAssoc.disease.name}`,
                        phase: `Phase ${diseaseAssoc.maxPhaseForIndication}`,
                        status: getStatusFromPhase(diseaseAssoc.maxPhaseForIndication),
                        sponsor: 'Multiple',
                        year: new Date().getFullYear(),
                        enrollment: 'N/A',
                        link: `https://platform.opentargets.org/evidence/${hit.id}/${diseaseAssoc.disease.id}`,
                        
                        drug_id: hit.id,
                        drug_name: hit.name,
                        disease_id: diseaseAssoc.disease.id,
                        disease_name: diseaseAssoc.disease.name,
                        max_phase_for_indication: diseaseAssoc.maxPhaseForIndication
                    });
                });
            } else {
                // Handle non-drug entities
                results.push({
                    id: `OT-${hit.entity}-${hit.id}-${index}`,
                    database: 'Open Targets',
                    title: hit.name || hit.approvedSymbol || hit.id,
                    type: `${hit.entity}`,
                    status_significance: hit.entity === 'target' ? 'Drug Target' : 'Disease',
                    details: createGeneralDescription(hit),
                    phase: 'N/A',
                    status: hit.entity,
                    sponsor: 'N/A',
                    year: new Date().getFullYear(),
                    enrollment: 'N/A',
                    link: `https://platform.opentargets.org/${hit.entity}/${hit.id}`,
                    
                    entity_type: hit.entity,
                    entity_id: hit.id,
                    entity_name: hit.name || hit.approvedSymbol
                });
            }
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
function extractPhaseNumber(phaseString) {
    if (!phaseString) return null;
    const match = phaseString.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
}

function getStatusFromPhase(phase) {
    if (phase >= 4) return 'Approved/Market';
    if (phase >= 3) return 'Phase III';
    if (phase >= 2) return 'Phase II';
    if (phase >= 1) return 'Phase I';
    return 'Preclinical';
}

function createDetailedDescription(drug, diseaseAssoc) {
    const components = [];
    
    if (drug.drugType) {
        components.push(`Type: ${drug.drugType}`);
    }
    
    if (diseaseAssoc.maxPhaseForIndication) {
        components.push(`Max Phase: ${diseaseAssoc.maxPhaseForIndication}`);
    }
    
    if (diseaseAssoc.clinicalTrialCount) {
        components.push(`Trials: ${diseaseAssoc.clinicalTrialCount}`);
    }
    
    if (diseaseAssoc.disease.therapeuticAreas?.length > 0) {
        const areas = diseaseAssoc.disease.therapeuticAreas.slice(0, 2).map(area => area.name);
        components.push(`Areas: ${areas.join(', ')}`);
    }
    
    return components.length > 0 ? components.join(' | ') : `${drug.name} for ${diseaseAssoc.disease.name}`;
}

function createGeneralDescription(entity) {
    if (entity.entity === 'target') {
        return `${entity.approvedSymbol || entity.id} - ${entity.biotype || 'Unknown biotype'} target`;
    } else if (entity.entity === 'disease') {
        const areas = entity.therapeuticAreas?.map(area => area.name).slice(0, 2) || [];
        return areas.length > 0 ? `Disease in ${areas.join(', ')}` : 'Disease entity';
    }
    return entity.name || entity.id;
}

function sortByRelevance(results, queryAnalysis) {
    return results.sort((a, b) => {
        // Exact drug name matches first
        if (queryAnalysis.drugName) {
            const aExactDrug = a.drug_name?.toLowerCase() === queryAnalysis.drugName.toLowerCase();
            const bExactDrug = b.drug_name?.toLowerCase() === queryAnalysis.drugName.toLowerCase();
            if (aExactDrug && !bExactDrug) return -1;
            if (!aExactDrug && bExactDrug) return 1;
        }
        
        // Exact phase matches second
        if (queryAnalysis.phase) {
            const aExactPhase = a.max_phase_for_indication === queryAnalysis.phase;
            const bExactPhase = b.max_phase_for_indication === queryAnalysis.phase;
            if (aExactPhase && !bExactPhase) return -1;
            if (!aExactPhase && bExactPhase) return 1;
        }
        
        // Higher phases generally first
        const aPhase = a.max_phase_for_indication || 0;
        const bPhase = b.max_phase_for_indication || 0;
        if (aPhase !== bPhase) return bPhase - aPhase;
        
        // More trials indicates more interest
        const aTrials = parseInt(a.clinical_trial_count) || 0;
        const bTrials = parseInt(b.clinical_trial_count) || 0;
        return bTrials - aTrials;
    });
}
