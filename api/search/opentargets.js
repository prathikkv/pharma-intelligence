// api/search/opentargets.js - Enhanced OpenTargets Integration

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        console.log('OpenTargets search for:', query);
        
        // Classify query type (disease, target, or drug)
        const queryType = classifyQuery(query);
        console.log('Query classified as:', queryType);
        
        let results = [];
        
        switch (queryType.type) {
            case 'disease':
                results = await searchByDisease(query);
                break;
            case 'target':
                results = await searchByTarget(query);
                break;
            case 'drug':
                results = await searchByDrug(query);
                break;
            default:
                // Try disease search first, then target search
                results = await searchByDisease(query);
                if (results.length === 0) {
                    results = await searchByTarget(query);
                }
        }

        console.log(`OpenTargets found ${results.length} results`);
        
        res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            queryType: queryType.type,
            search_timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('OpenTargets API error:', error);
        res.status(500).json({ 
            error: 'OpenTargets search failed', 
            details: error.message,
            results: [],
            total: 0,
            query: query,
            search_timestamp: new Date().toISOString()
        });
    }
}

/**
 * Classify query to determine search strategy
 */
function classifyQuery(query) {
    const queryLower = query.toLowerCase();
    
    // Disease patterns
    const diseasePatterns = [
        /disease|disorder|syndrome|cancer|tumor|carcinoma|leukemia|lymphoma/i,
        /diabetes|alzheimer|parkinson|arthritis|asthma|hypertension/i,
        /infection|inflammatory|autoimmune|genetic|hereditary/i
    ];
    
    // Target/Gene patterns  
    const targetPatterns = [
        /gene|protein|target|receptor|kinase|enzyme/i,
        /^[A-Z]{2,10}\d*$/,  // Gene symbols like TP53, BRCA1
        /^ENSG\d+$/         // Ensembl IDs
    ];
    
    // Drug patterns
    const drugPatterns = [
        /drug|compound|molecule|inhibitor|agonist|antagonist/i,
        /^CHEMBL\d+$/       // ChEMBL IDs
    ];

    if (diseasePatterns.some(pattern => pattern.test(queryLower))) {
        return { type: 'disease', confidence: 0.8 };
    } else if (targetPatterns.some(pattern => pattern.test(query))) {
        return { type: 'target', confidence: 0.9 };
    } else if (drugPatterns.some(pattern => pattern.test(queryLower))) {
        return { type: 'drug', confidence: 0.8 };
    }

    return { type: 'disease', confidence: 0.5 }; // Default to disease search
}

/**
 * Search by disease - primary search method
 */
async function searchByDisease(query) {
    try {
        // Step 1: Find disease by name
        const disease = await findDisease(query);
        if (!disease) {
            console.log('Disease not found for query:', query);
            return [];
        }

        console.log('Found disease:', disease.name, 'ID:', disease.id);

        // Step 2: Get target-disease associations
        const associations = await getDiseaseTargetAssociations(disease.id);
        
        return associations;

    } catch (error) {
        console.error('Disease search error:', error);
        return [];
    }
}

/**
 * Search by target/gene
 */
async function searchByTarget(query) {
    try {
        // Find target by symbol or name
        const target = await findTarget(query);
        if (!target) {
            console.log('Target not found for query:', query);
            return [];
        }

        console.log('Found target:', target.approvedSymbol, 'ID:', target.id);

        // Get target's associated diseases and drugs
        const targetData = await getTargetData(target.id);
        
        return targetData;

    } catch (error) {
        console.error('Target search error:', error);
        return [];
    }
}

/**
 * Search by drug
 */
async function searchByDrug(query) {
    try {
        // Find drug by name
        const drug = await findDrug(query);
        if (!drug) {
            console.log('Drug not found for query:', query);
            return [];
        }

        console.log('Found drug:', drug.name, 'ID:', drug.id);

        // Get drug's targets and indications
        const drugData = await getDrugData(drug.id);
        
        return drugData;

    } catch (error) {
        console.error('Drug search error:', error);
        return [];
    }
}

/**
 * Find disease by name using GraphQL search
 */
async function findDisease(diseaseName) {
    const query = `
        query searchDisease($queryString: String!) {
            search(queryString: $queryString, entityNames: ["disease"]) {
                hits {
                    id
                    name
                    description
                    category
                }
            }
        }
    `;

    const response = await executeGraphQLQuery(query, { queryString: diseaseName });
    const hits = response?.data?.search?.hits || [];
    
    return hits.length > 0 ? hits[0] : null;
}

/**
 * Find target by symbol or name
 */
async function findTarget(targetName) {
    const query = `
        query searchTarget($queryString: String!) {
            search(queryString: $queryString, entityNames: ["target"]) {
                hits {
                    id
                    name
                    description
                    category
                }
            }
        }
    `;

    const response = await executeGraphQLQuery(query, { queryString: targetName });
    const hits = response?.data?.search?.hits || [];
    
    return hits.length > 0 ? hits[0] : null;
}

/**
 * Find drug by name
 */
async function findDrug(drugName) {
    const query = `
        query searchDrug($queryString: String!) {
            search(queryString: $queryString, entityNames: ["drug"]) {
                hits {
                    id
                    name
                    description
                    category
                }
            }
        }
    `;

    const response = await executeGraphQLQuery(query, { queryString: drugName });
    const hits = response?.data?.search?.hits || [];
    
    return hits.length > 0 ? hits[0] : null;
}

/**
 * Get comprehensive disease-target associations with clinical data
 */
async function getDiseaseTargetAssociations(efoId) {
    const query = `
        query diseaseAssociations($efoId: String!) {
            disease(efoId: $efoId) {
                id
                name
                description
                associatedTargets(page: { size: 100 }) {
                    count
                    rows {
                        target {
                            id
                            approvedSymbol
                            approvedName
                            biotype
                            functionDescriptions
                            targetClass {
                                id
                                label
                                level
                            }
                        }
                        score
                        datatypeScores {
                            id
                            score
                        }
                    }
                }
                knownDrugs(size: 100) {
                    count
                    rows {
                        drug {
                            id
                            name
                            drugType
                            maximumClinicalTrialPhase
                            isApproved
                            synonyms
                            tradeNames
                        }
                        phase
                        status
                        mechanismOfAction
                        indication
                        indicationId
                        references {
                            source
                            ids
                            urls
                        }
                    }
                }
            }
        }
    `;

    try {
        const response = await executeGraphQLQuery(query, { efoId });
        const disease = response?.data?.disease;
        
        if (!disease) {
            return [];
        }

        return processAssociationsData(disease);
        
    } catch (error) {
        console.error('Error getting disease associations:', error);
        return [];
    }
}

/**
 * Get target data with associated diseases and drugs
 */
async function getTargetData(ensemblId) {
    const query = `
        query targetData($ensemblId: String!) {
            target(ensemblId: $ensemblId) {
                id
                approvedSymbol
                approvedName
                biotype
                functionDescriptions
                targetClass {
                    id
                    label
                    level
                }
                associatedDiseases(page: { size: 50 }) {
                    count
                    rows {
                        disease {
                            id
                            name
                        }
                        score
                        datatypeScores {
                            id
                            score
                        }
                    }
                }
                knownDrugs(size: 50) {
                    count
                    rows {
                        drug {
                            id
                            name
                            drugType
                            maximumClinicalTrialPhase
                            isApproved
                        }
                        phase
                        mechanismOfAction
                        indication
                        references {
                            source
                            ids
                            urls
                        }
                    }
                }
            }
        }
    `;

    try {
        const response = await executeGraphQLQuery(query, { ensemblId });
        const target = response?.data?.target;
        
        if (!target) {
            return [];
        }

        return processTargetData(target);
        
    } catch (error) {
        console.error('Error getting target data:', error);
        return [];
    }
}

/**
 * Get drug data with targets and indications
 */
async function getDrugData(chemblId) {
    const query = `
        query drugData($chemblId: String!) {
            drug(chemblId: $chemblId) {
                id
                name
                drugType
                maximumClinicalTrialPhase
                isApproved
                synonyms
                tradeNames
                linkedTargets {
                    count
                    rows {
                        target {
                            id
                            approvedSymbol
                            approvedName
                        }
                        phase
                        mechanismOfAction
                        indication
                        references {
                            source
                            ids
                            urls
                        }
                    }
                }
                linkedDiseases {
                    count
                    rows {
                        disease {
                            id
                            name
                        }
                        phase
                        indication
                    }
                }
            }
        }
    `;

    try {
        const response = await executeGraphQLQuery(query, { chemblId });
        const drug = response?.data?.drug;
        
        if (!drug) {
            return [];
        }

        return processDrugData(drug);
        
    } catch (error) {
        console.error('Error getting drug data:', error);
        return [];
    }
}

/**
 * Process disease associations data for grid display
 */
function processAssociationsData(disease) {
    const results = [];
    const { associatedTargets, knownDrugs } = disease;

    // Create a map of drugs for quick lookup
    const drugsMap = new Map();
    if (knownDrugs?.rows) {
        knownDrugs.rows.forEach(drugRow => {
            const key = drugRow.drug.id;
            drugsMap.set(key, drugRow);
        });
    }

    // Process target associations
    if (associatedTargets?.rows) {
        associatedTargets.rows.forEach(association => {
            const target = association.target;
            const score = association.score;
            const evidenceScores = association.datatypeScores;

            // Find drugs for this target (simplified - in real implementation, need target-drug mapping)
            const relatedDrugs = Array.from(drugsMap.values()).filter(drugRow => 
                drugRow.references?.urls?.some(url => url.includes(target.id)) ||
                drugRow.mechanismOfAction?.toLowerCase().includes(target.approvedSymbol.toLowerCase())
            );

            if (relatedDrugs.length > 0) {
                // Create entries for each drug
                relatedDrugs.forEach(drugRow => {
                    results.push(createResultEntry(disease, target, drugRow, score, evidenceScores));
                });
            } else {
                // Create entry without drug information
                results.push(createResultEntry(disease, target, null, score, evidenceScores));
            }
        });
    }

    return results.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
}

/**
 * Process target data for grid display
 */
function processTargetData(target) {
    const results = [];

    if (target.associatedDiseases?.rows) {
        target.associatedDiseases.rows.forEach(diseaseAssoc => {
            const disease = diseaseAssoc.disease;
            
            // Find drugs for this target
            const relatedDrugs = target.knownDrugs?.rows || [];
            
            if (relatedDrugs.length > 0) {
                relatedDrugs.forEach(drugRow => {
                    results.push(createResultEntry(disease, target, drugRow, diseaseAssoc.score, diseaseAssoc.datatypeScores));
                });
            } else {
                results.push(createResultEntry(disease, target, null, diseaseAssoc.score, diseaseAssoc.datatypeScores));
            }
        });
    }

    return results;
}

/**
 * Process drug data for grid display
 */
function processDrugData(drug) {
    const results = [];

    if (drug.linkedTargets?.rows) {
        drug.linkedTargets.rows.forEach(targetLink => {
            const target = targetLink.target;
            
            // Find associated diseases
            const relatedDiseases = drug.linkedDiseases?.rows || [];
            
            if (relatedDiseases.length > 0) {
                relatedDiseases.forEach(diseaseLink => {
                    const disease = diseaseLink.disease;
                    results.push(createResultEntry(disease, target, { drug, ...targetLink }, 1.0, []));
                });
            } else {
                // Create entry without specific disease
                const genericDisease = { id: 'unknown', name: 'Multiple indications' };
                results.push(createResultEntry(genericDisease, target, { drug, ...targetLink }, 1.0, []));
            }
        });
    }

    return results;
}

/**
 * Create standardized result entry for grid display
 */
function createResultEntry(disease, target, drugData, score, evidenceScores) {
    const drug = drugData?.drug || drugData;
    const clinicalTrialUrl = generateClinicalTrialUrl(drugData?.references);

    return {
        // Disease information
        disease: disease.name,
        disease_id: disease.id,
        
        // Target information
        symbol: target.approvedSymbol || target.id,
        name: target.approvedName || target.name || 'Unknown target',
        target_id: target.id,
        target_class: target.targetClass?.map(tc => tc.label).join(', ') || '',
        function_description: target.functionDescriptions?.join('; ') || '',
        
        // Clinical trial information
        phase: drugData?.phase || drug?.maximumClinicalTrialPhase || '',
        status: determineStatus(drugData, drug),
        mechanism: drugData?.mechanismOfAction || '',
        indication: drugData?.indication || '',
        
        // Drug information
        drug_name: drug?.name || '',
        drug_id: drug?.id || '',
        drug_type: drug?.drugType || '',
        trade_names: drug?.tradeNames?.join(', ') || '',
        
        // Source and links
        source: clinicalTrialUrl ? 'ClinicalTrials.gov' : 'OpenTargets',
        clinical_trial_url: clinicalTrialUrl,
        opentargets_url: `https://platform.opentargets.org/evidence/${target.id}/${disease.id}`,
        
        // Scoring and evidence
        score: score ? score.toFixed(4) : '0.0000',
        evidence_types: formatEvidenceTypes(evidenceScores),
        evidence_count: evidenceScores?.length || 0,
        
        // Additional metadata
        search_timestamp: new Date().toISOString(),
        data_source: 'OpenTargets Platform'
    };
}

/**
 * Generate proper clinical trial URL from references
 */
function generateClinicalTrialUrl(references) {
    if (!references) return null;

    // Check for NCT ID in references
    if (references.ids) {
        for (const id of references.ids) {
            if (id.startsWith('NCT')) {
                return `https://clinicaltrials.gov/ct2/show/${id}`;
            }
        }
    }

    // Check for URLs
    if (references.urls) {
        for (const url of references.urls) {
            if (url.includes('clinicaltrials.gov')) {
                return url;
            }
        }
    }

    return null;
}

/**
 * Determine status from drug and clinical data
 */
function determineStatus(drugData, drug) {
    if (drug?.isApproved) return 'Approved';
    if (drugData?.status) return drugData.status;
    if (drugData?.phase === '4' || drug?.maximumClinicalTrialPhase === 4) return 'Approved';
    if (drugData?.phase === '3' || drug?.maximumClinicalTrialPhase === 3) return 'Phase III';
    if (drugData?.phase === '2' || drug?.maximumClinicalTrialPhase === 2) return 'Phase II';
    if (drugData?.phase === '1' || drug?.maximumClinicalTrialPhase === 1) return 'Phase I';
    return 'Preclinical';
}

/**
 * Format evidence types for display
 */
function formatEvidenceTypes(evidenceScores) {
    if (!evidenceScores || evidenceScores.length === 0) return '';
    
    return evidenceScores
        .map(ev => `${ev.id}: ${ev.score?.toFixed(3) || '0.000'}`)
        .join(', ');
}

/**
 * Execute GraphQL query with retry logic
 */
async function executeGraphQLQuery(query, variables = {}, maxRetries = 3) {
    const url = 'https://api.platform.opentargets.org/api/v4/graphql';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    variables
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.errors) {
                throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
            }

            return result;

        } catch (error) {
            console.warn(`OpenTargets query attempt ${attempt} failed:`, error.message);
            
            if (attempt === maxRetries) {
                throw new Error(`Failed to query OpenTargets after ${maxRetries} attempts: ${error.message}`);
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}
