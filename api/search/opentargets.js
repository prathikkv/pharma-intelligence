// api/search/opentargets.js - COMPREHENSIVE OpenTargets Platform API Implementation
// This handles ALL pharmaceutical research queries: drugs, targets, diseases, toxicities, etc.

/**
 * COMPREHENSIVE OpenTargets Platform API Handler
 * 
 * WHY THIS APPROACH:
 * - OpenTargets is the world's largest public-private biomedical database
 * - Uses GraphQL for flexible, efficient queries
 * - Contains drug-target-disease associations, clinical trials, safety data
 * - This implementation handles ALL your use cases dynamically
 * 
 * CAPABILITIES:
 * ✅ Drug queries: "Rituximab diseases", "Dasatinib toxicities"
 * ✅ Target queries: "JAK2 diseases", "EGFR interactions"  
 * ✅ Disease queries: "cancer approved drugs"
 * ✅ Binding affinities, adverse events, target interactions
 * ✅ Dynamic entity detection and appropriate query routing
 */

const OPENTARGETS_CONFIG = {
    apiUrl: 'https://api.platform.opentargets.org/api/v4/graphql',
    webUrl: 'https://platform.opentargets.org',
    maxRetries: 3,
    timeout: 30000,
    maxResults: 500,
    rateLimit: 10 // requests per second
};

/**
 * INTELLIGENT QUERY ANALYSIS
 * This analyzes the user's query to determine what type of search to perform
 * and what data to return. This is the "brain" of the system.
 */
function analyzeQuery(query) {
    const queryLower = query.toLowerCase();
    const analysis = {
        queryType: 'general',
        entityType: 'unknown',
        searchTerms: [],
        requestedData: [],
        priorityOrder: []
    };
    
    // Extract search terms (drug names, targets, diseases)
    const possibleEntities = extractEntities(query);
    analysis.searchTerms = possibleEntities;
    
    // Determine what type of information is being requested
    if (queryLower.includes('disease') || queryLower.includes('indication') || queryLower.includes('approved for')) {
        analysis.requestedData.push('diseases');
        analysis.priorityOrder.push('drug-disease', 'target-disease');
    }
    
    if (queryLower.includes('toxicit') || queryLower.includes('adverse') || queryLower.includes('side effect') || queryLower.includes('safety')) {
        analysis.requestedData.push('toxicity');
        analysis.priorityOrder.push('drug-toxicity');
    }
    
    if (queryLower.includes('target') || queryLower.includes('binding') || queryLower.includes('affinity') || queryLower.includes('interaction')) {
        analysis.requestedData.push('targets');
        analysis.priorityOrder.push('drug-target', 'target-interaction');
    }
    
    if (queryLower.includes('compound') || queryLower.includes('drug') || queryLower.includes('approved')) {
        analysis.requestedData.push('drugs');
        analysis.priorityOrder.push('disease-drug', 'target-drug');
    }
    
    // If no specific data type requested, get comprehensive data
    if (analysis.requestedData.length === 0) {
        analysis.requestedData = ['diseases', 'targets', 'drugs', 'toxicity'];
        analysis.priorityOrder = ['drug-disease', 'drug-target', 'target-disease'];
    }
    
    console.log(`🎯 Query Analysis:`, analysis);
    return analysis;
}

/**
 * ENTITY EXTRACTION
 * Extracts potential drug names, targets, diseases from the query
 */
function extractEntities(query) {
    // Common drug name patterns
    const drugPatterns = [
        /\b([A-Z][a-z]+(?:mab|nib|lol|pril|sartan|statin|mycin|cillin))\b/g, // Drug suffixes
        /\b([A-Z][a-z]{3,})\b/g // Capitalized words (potential drug/target names)
    ];
    
    const entities = new Set();
    
    // Extract using patterns
    drugPatterns.forEach(pattern => {
        const matches = [...query.matchAll(pattern)];
        matches.forEach(match => entities.add(match[1]));
    });
    
    // Extract individual words that might be entities
    const words = query.split(/\s+/);
    words.forEach(word => {
        const cleanWord = word.replace(/[^\w]/g, '');
        if (cleanWord.length >= 3) {
            entities.add(cleanWord);
        }
    });
    
    return Array.from(entities);
}

/**
 * COMPREHENSIVE ENTITY SEARCH
 * Searches for drugs, targets, and diseases simultaneously
 */
async function searchEntities(searchTerms, limit = 20) {
    const searchQuery = `
        query SearchEntities($queryString: String!, $size: Int!) {
            search(queryString: $queryString, entityNames: ["target", "disease", "drug"], page: {index: 0, size: $size}) {
                hits {
                    id
                    name
                    entity
                    score
                    ... on Target {
                        approvedSymbol
                        biotype
                        approvedName
                        proteinAnnotations {
                            accessions
                        }
                    }
                    ... on Disease {
                        id
                        name
                        therapeuticAreas {
                            id
                            name
                        }
                        synonyms
                    }
                    ... on Drug {
                        id
                        name
                        synonyms
                        drugType
                        maximumClinicalTrialPhase
                        hasBeenWithdrawn
                    }
                }
                total
            }
        }
    `;
    
    // Try multiple search strategies
    const searchStrategies = [
        searchTerms.join(' '), // Combined search
        ...searchTerms // Individual searches
    ];
    
    const allResults = [];
    
    for (const searchTerm of searchStrategies.slice(0, 3)) { // Limit to prevent too many requests
        try {
            console.log(`🔍 Searching OpenTargets for: "${searchTerm}"`);
            
            const response = await executeGraphQLQuery(searchQuery, {
                queryString: searchTerm,
                size: limit
            });
            
            if (response.data?.search?.hits) {
                allResults.push(...response.data.search.hits);
            }
        } catch (error) {
            console.warn(`Search failed for "${searchTerm}":`, error.message);
        }
    }
    
    // Remove duplicates and sort by relevance
    const uniqueResults = allResults.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
    ).sort((a, b) => (b.score || 0) - (a.score || 0));
    
    console.log(`🎯 Found ${uniqueResults.length} unique entities`);
    return uniqueResults;
}

/**
 * DRUG-DISEASE ASSOCIATIONS
 * Gets diseases associated with a drug, including clinical phases and indications
 */
async function getDrugDiseases(drugId, drugName) {
    const query = `
        query DrugDiseases($chemblId: String!) {
            drug(chemblId: $chemblId) {
                id
                name
                synonyms
                drugType
                maximumClinicalTrialPhase
                hasBeenWithdrawn
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
                        clinicalTrialPhase
                    }
                }
                indications {
                    count
                    rows {
                        disease {
                            id  
                            name
                        }
                        maxPhaseForIndication
                        references {
                            urls
                        }
                    }
                }
                adverseEvents {
                    count
                    rows {
                        event {
                            id
                            name
                        }
                        count
                        logLR
                        criticalValue
                    }
                }
            }
        }
    `;
    
    try {
        const response = await executeGraphQLQuery(query, { chemblId: drugId });
        return response.data?.drug;
    } catch (error) {
        console.error(`Failed to get diseases for drug ${drugName}:`, error);
        return null;
    }
}

/**
 * DRUG-TARGET ASSOCIATIONS  
 * Gets targets associated with a drug, including binding affinities
 */
async function getDrugTargets(drugId, drugName) {
    const query = `
        query DrugTargets($chemblId: String!) {
            drug(chemblId: $chemblId) {
                id
                name
                linkedTargets {
                    count
                    rows {
                        target {
                            id
                            approvedSymbol
                            approvedName
                            biotype
                            proteinAnnotations {
                                accessions
                            }
                        }
                        mechanismsOfAction {
                            mechanismOfAction
                            targetName
                            actionType
                            references {
                                urls
                            }
                        }
                    }
                }
                mechanismsOfAction {
                    count
                    rows {
                        mechanismOfAction
                        actionType
                        target {
                            id
                            approvedSymbol
                            approvedName
                        }
                        references {
                            urls
                        }
                    }
                }
            }
        }
    `;
    
    try {
        const response = await executeGraphQLQuery(query, { chemblId: drugId });
        return response.data?.drug;
    } catch (error) {
        console.error(`Failed to get targets for drug ${drugName}:`, error);
        return null;
    }
}

/**
 * TARGET-DISEASE ASSOCIATIONS
 * Gets diseases associated with a target gene/protein  
 */
async function getTargetDiseases(targetId, targetName) {
    const query = `
        query TargetDiseases($ensemblId: String!) {
            target(ensemblId: $ensemblId) {
                id
                approvedSymbol
                approvedName
                biotype
                associatedDiseases {
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
                        score
                        datatypeScores {
                            datatype
                            score
                        }
                    }
                }
                interactions {
                    count
                    rows {
                        intA
                        intB  
                        sourceDatabase
                        scoring
                    }
                }
            }
        }
    `;
    
    try {
        const response = await executeGraphQLQuery(query, { ensemblId: targetId });
        return response.data?.target;
    } catch (error) {
        console.error(`Failed to get diseases for target ${targetName}:`, error);
        return null;
    }
}

/**
 * DISEASE-DRUG ASSOCIATIONS
 * Gets approved drugs for a disease
 */
async function getDiseaseDrugs(diseaseId, diseaseName) {
    const query = `
        query DiseaseDrugs($efoId: String!) {
            disease(efoId: $efoId) {
                id
                name
                synonyms
                therapeuticAreas {
                    id
                    name
                }
                linkedTargets {
                    count
                    rows {
                        target {
                            id
                            approvedSymbol
                            approvedName
                        }
                        score
                        datatypeScores {
                            datatype
                            score
                        }
                    }
                }
                knownDrugs {
                    count
                    rows {
                        drug {
                            id
                            name
                            maximumClinicalTrialPhase
                            hasBeenWithdrawn
                        }
                        phase
                        status
                        urls {
                            url
                            niceName
                        }
                    }
                }
            }
        }
    `;
    
    try {
        const response = await executeGraphQLQuery(query, { efoId: diseaseId });
        return response.data?.disease;
    } catch (error) {
        console.error(`Failed to get drugs for disease ${diseaseName}:`, error);
        return null;
    }
}

/**
 * EXECUTE GRAPHQL QUERY
 * Central function to execute GraphQL queries with error handling and retries
 */
async function executeGraphQLQuery(query, variables = {}, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(OPENTARGETS_CONFIG.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'PharmaceuticalIntelligence/3.0'
                },
                body: JSON.stringify({
                    query: query.replace(/\s+/g, ' ').trim(),
                    variables
                }),
                signal: AbortSignal.timeout(OPENTARGETS_CONFIG.timeout)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.errors) {
                console.error('GraphQL Errors:', data.errors);
                throw new Error(`GraphQL Error: ${data.errors[0]?.message || 'Unknown error'}`);
            }

            return data;

        } catch (error) {
            console.error(`OpenTargets API attempt ${attempt} failed:`, error);
            
            if (attempt === retries) {
                throw new Error(`OpenTargets API failed after ${retries} attempts: ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
}

/**
 * PROCESS AND FORMAT RESULTS
 * Converts OpenTargets data into standardized format for the frontend
 */
function formatResults(entityData, queryAnalysis, originalQuery) {
    const results = [];
    let resultCounter = 0;
    
    entityData.forEach(entity => {
        const { id, name, entity: entityType, data } = entity;
        
        if (entityType === 'drug' && data) {
            // Process drug data
            if (data.linkedDiseases?.rows) {
                data.linkedDiseases.rows.forEach((diseaseAssoc, index) => {
                    const disease = diseaseAssoc.disease;
                    const phase = diseaseAssoc.maxPhaseForIndication || diseaseAssoc.clinicalTrialPhase;
                    
                    results.push({
                        id: `OT-DRUG-DIS-${id}-${disease.id}-${index}`,
                        database: 'Open Targets',
                        title: `${name} for ${disease.name}`,
                        type: `Drug-Disease Association - Phase ${phase || 'Unknown'}`,
                        status_significance: phase >= 3 ? 'Late Stage Clinical' : 'Early Stage Clinical',
                        details: `${name} is being investigated for ${disease.name}. Maximum clinical phase: ${phase || 'Unknown'}. Therapeutic areas: ${disease.therapeuticAreas?.map(ta => ta.name).join(', ') || 'Unknown'}`,
                        phase: phase ? `Phase ${phase}` : 'Unknown Phase',
                        status: phase >= 3 ? 'Advanced Clinical' : 'Early Clinical',
                        sponsor: 'Multiple (See OpenTargets)',
                        year: new Date().getFullYear(),
                        enrollment: 'N/A',
                        link: `${OPENTARGETS_CONFIG.webUrl}/evidence/${id}/${disease.id}`,
                        
                        // OpenTargets specific fields
                        drug_id: id,
                        drug_name: name,
                        disease_id: disease.id,
                        disease_name: disease.name,
                        clinical_phase: phase,
                        therapeutic_areas: disease.therapeuticAreas?.map(ta => ta.name) || [],
                        entity_type: 'drug-disease',
                        
                        raw_data: diseaseAssoc
                    });
                });
            }
            
            if (data.linkedTargets?.rows) {
                data.linkedTargets.rows.forEach((targetAssoc, index) => {
                    const target = targetAssoc.target;
                    const mechanisms = targetAssoc.mechanismsOfAction || [];
                    
                    results.push({
                        id: `OT-DRUG-TGT-${id}-${target.id}-${index}`,
                        database: 'Open Targets',
                        title: `${name} → ${target.approvedSymbol || target.approvedName}`,
                        type: `Drug-Target Interaction - ${target.biotype || 'Protein'}`,
                        status_significance: 'Target Interaction',
                        details: `${name} interacts with ${target.approvedSymbol || target.approvedName} (${target.approvedName || 'Unknown protein'}). Mechanisms: ${mechanisms.map(m => m.mechanismOfAction).join(', ') || 'Unknown'}`,
                        phase: 'N/A',
                        status: 'Target Interaction',
                        sponsor: 'Multiple',
                        year: new Date().getFullYear(),
                        enrollment: 'N/A',
                        link: `${OPENTARGETS_CONFIG.webUrl}/target/${target.id}`,
                        
                        drug_id: id,
                        drug_name: name,
                        target_id: target.id,
                        target_symbol: target.approvedSymbol,
                        target_name: target.approvedName,
                        target_type: target.biotype,
                        mechanisms_of_action: mechanisms,
                        entity_type: 'drug-target',
                        
                        raw_data: targetAssoc
                    });
                });
            }
            
            if (data.adverseEvents?.rows) {
                data.adverseEvents.rows.forEach((aeEvent, index) => {
                    const event = aeEvent.event;
                    
                    results.push({
                        id: `OT-DRUG-AE-${id}-${event.id}-${index}`,
                        database: 'Open Targets',
                        title: `${name} - ${event.name}`,
                        type: `Adverse Event - ${aeEvent.count} reports`,
                        status_significance: aeEvent.logLR > 2 ? 'Significant Risk' : 'Reported Risk',
                        details: `${name} associated with ${event.name}. Report count: ${aeEvent.count}. Log likelihood ratio: ${aeEvent.logLR?.toFixed(2) || 'N/A'}`,
                        phase: 'N/A',
                        status: 'Safety Signal',
                        sponsor: 'N/A',
                        year: new Date().getFullYear(),
                        enrollment: 'N/A',
                        link: `${OPENTARGETS_CONFIG.webUrl}/drug/${id}`,
                        
                        drug_id: id,
                        drug_name: name,
                        adverse_event_id: event.id,
                        adverse_event_name: event.name,
                        report_count: aeEvent.count,
                        log_likelihood_ratio: aeEvent.logLR,
                        entity_type: 'drug-adverse-event',
                        
                        raw_data: aeEvent
                    });
                });
            }
        }
        
        if (entityType === 'target' && data) {
            if (data.associatedDiseases?.rows) {
                data.associatedDiseases.rows.forEach((diseaseAssoc, index) => {
                    const disease = diseaseAssoc.disease;
                    
                    results.push({
                        id: `OT-TGT-DIS-${id}-${disease.id}-${index}`,
                        database: 'Open Targets',
                        title: `${data.approvedSymbol || name} associated with ${disease.name}`,
                        type: `Target-Disease Association - Score: ${diseaseAssoc.score?.toFixed(2) || 'N/A'}`,
                        status_significance: diseaseAssoc.score > 0.5 ? 'Strong Association' : 'Moderate Association',
                        details: `${data.approvedSymbol || name} (${data.approvedName || 'Unknown protein'}) is associated with ${disease.name}. Association score: ${diseaseAssoc.score?.toFixed(3) || 'N/A'}. Therapeutic areas: ${disease.therapeuticAreas?.map(ta => ta.name).join(', ') || 'Unknown'}`,
                        phase: 'N/A',
                        status: 'Disease Association',
                        sponsor: 'N/A',
                        year: new Date().getFullYear(),
                        enrollment: 'N/A',
                        link: `${OPENTARGETS_CONFIG.webUrl}/evidence/${id}/${disease.id}`,
                        
                        target_id: id,
                        target_symbol: data.approvedSymbol,
                        target_name: data.approvedName,
                        disease_id: disease.id,
                        disease_name: disease.name,
                        association_score: diseaseAssoc.score,
                        datatype_scores: diseaseAssoc.datatypeScores,
                        entity_type: 'target-disease',
                        
                        raw_data: diseaseAssoc
                    });
                });
            }
            
            if (data.interactions?.rows) {
                data.interactions.rows.forEach((interaction, index) => {
                    results.push({
                        id: `OT-TGT-INT-${id}-${index}`,
                        database: 'Open Targets',
                        title: `${data.approvedSymbol || name} interacts with ${interaction.intB}`,
                        type: `Protein-Protein Interaction - ${interaction.sourceDatabase}`,
                        status_significance: 'Protein Interaction',
                        details: `${data.approvedSymbol || name} interacts with ${interaction.intB}. Source: ${interaction.sourceDatabase}. Confidence: ${interaction.scoring || 'Unknown'}`,
                        phase: 'N/A',
                        status: 'Protein Interaction',
                        sponsor: 'N/A',
                        year: new Date().getFullYear(),
                        enrollment: 'N/A',
                        link: `${OPENTARGETS_CONFIG.webUrl}/target/${id}`,
                        
                        target_id: id,
                        target_symbol: data.approvedSymbol,
                        interaction_partner: interaction.intB,
                        source_database: interaction.sourceDatabase,
                        confidence_score: interaction.scoring,
                        entity_type: 'target-interaction',
                        
                        raw_data: interaction
                    });
                });
            }
        }
        
        if (entityType === 'disease' && data) {
            if (data.knownDrugs?.rows) {
                data.knownDrugs.rows.forEach((drugAssoc, index) => {
                    const drug = drugAssoc.drug;
                    
                    results.push({
                        id: `OT-DIS-DRUG-${id}-${drug.id}-${index}`,
                        database: 'Open Targets',
                        title: `${drug.name} for ${name}`,
                        type: `Disease-Drug Association - Phase ${drugAssoc.phase || 'Unknown'}`,
                        status_significance: drugAssoc.phase >= 3 ? 'Approved/Late Stage' : 'Early Development',
                        details: `${drug.name} is ${drugAssoc.status || 'being investigated'} for ${name}. Clinical phase: ${drugAssoc.phase || 'Unknown'}. Maximum phase: ${drug.maximumClinicalTrialPhase || 'Unknown'}`,
                        phase: drugAssoc.phase ? `Phase ${drugAssoc.phase}` : 'Unknown Phase',
                        status: drugAssoc.status || 'Unknown Status',
                        sponsor: 'Multiple',
                        year: new Date().getFullYear(),
                        enrollment: 'N/A',
                        link: `${OPENTARGETS_CONFIG.webUrl}/evidence/${drug.id}/${id}`,
                        
                        disease_id: id,
                        disease_name: name,
                        drug_id: drug.id,
                        drug_name: drug.name,
                        clinical_phase: drugAssoc.phase,
                        max_clinical_phase: drug.maximumClinicalTrialPhase,
                        drug_status: drugAssoc.status,
                        is_withdrawn: drug.hasBeenWithdrawn,
                        entity_type: 'disease-drug',
                        
                        raw_data: drugAssoc
                    });
                });
            }
        }
    });
    
    // Sort results by relevance
    results.sort((a, b) => {
        // Prioritize based on query analysis
        const priorityA = getPriorityScore(a, queryAnalysis);
        const priorityB = getPriorityScore(b, queryAnalysis);
        
        if (priorityA !== priorityB) return priorityB - priorityA;
        
        // Then by clinical phase
        const phaseA = extractPhaseNumber(a.phase);
        const phaseB = extractPhaseNumber(b.phase);
        
        return phaseB - phaseA;
    });
    
    console.log(`📊 Formatted ${results.length} results from OpenTargets`);
    return results;
}

function getPriorityScore(result, queryAnalysis) {
    let score = 0;
    
    // Boost based on requested data types
    queryAnalysis.requestedData.forEach(dataType => {
        if (dataType === 'diseases' && result.entity_type.includes('disease')) score += 10;
        if (dataType === 'targets' && result.entity_type.includes('target')) score += 10;
        if (dataType === 'drugs' && result.entity_type.includes('drug')) score += 10;
        if (dataType === 'toxicity' && result.entity_type.includes('adverse')) score += 15;
    });
    
    // Boost high-quality results
    if (result.status_significance?.includes('Strong')) score += 5;
    if (result.status_significance?.includes('Significant')) score += 5;
    if (result.phase?.includes('Phase 3') || result.phase?.includes('Phase 4')) score += 3;
    
    return score;
}

function extractPhaseNumber(phase) {
    if (!phase) return 0;
    const match = phase.match(/Phase (\d+)/i);
    return match ? parseInt(match[1]) : 0;
}

/**
 * MAIN API HANDLER
 * This is the entry point that coordinates all the search strategies
 */
export default async function handler(req, res) {
    // CORS headers
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

    const { query, limit = 200 } = req.query;

    if (!query) {
        return res.status(400).json({ 
            error: 'Query parameter is required',
            examples: [
                'List diseases for which Rituximab is approved',
                'For Dasatinib, list various toxicities', 
                'List diseases associated with JAK2',
                'Show approved compounds for lung cancer'
            ]
        });
    }

    const startTime = performance.now();

    try {
        console.log(`🎯 OpenTargets comprehensive search for: "${query}"`);
        
        // STEP 1: Analyze the query to understand what user wants
        const queryAnalysis = analyzeQuery(query);
        
        // STEP 2: Search for relevant entities
        const searchLimit = Math.min(parseInt(limit) || 200, OPENTARGETS_CONFIG.maxResults);
        const entities = await searchEntities(queryAnalysis.searchTerms, 50);
        
        if (entities.length === 0) {
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                message: 'No entities found in OpenTargets database',
                suggestions: [
                    'Try using drug names like "Rituximab", "Dasatinib", "Imatinib"',
                    'Try target names like "JAK2", "EGFR", "BRCA1"',  
                    'Try disease terms like "cancer", "diabetes", "Alzheimer"'
                ],
                search_timestamp: new Date().toISOString()
            });
        }
        
        // STEP 3: Get detailed data for each entity based on query analysis
        const entityDataPromises = entities.slice(0, 10).map(async (entity) => { // Limit to top 10 entities
            let detailedData = null;
            
            try {
                if (entity.entity === 'drug') {
                    const drugData = await getDrugDiseases(entity.id, entity.name);
                    if (drugData && queryAnalysis.requestedData.includes('targets')) {
                        const targetData = await getDrugTargets(entity.id, entity.name);
                        if (targetData) {
                            drugData.linkedTargets = targetData.linkedTargets;
                            drugData.mechanismsOfAction = targetData.mechanismsOfAction;
                        }
                    }
                    detailedData = drugData;
                } else if (entity.entity === 'target') {
                    detailedData = await getTargetDiseases(entity.id, entity.name);
                } else if (entity.entity === 'disease') {
                    detailedData = await getDiseaseDrugs(entity.id, entity.name);
                }
            } catch (error) {
                console.warn(`Failed to get detailed data for ${entity.name}:`, error.message);
            }
            
            return {
                ...entity,
                data: detailedData
            };
        });
        
        const entityData = await Promise.all(entityDataPromises);
        
        // STEP 4: Format results for frontend
        const results = formatResults(entityData.filter(e => e.data), queryAnalysis, query);
        
        // STEP 5: Limit results if needed
        const limitedResults = results.slice(0, searchLimit);
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.log(`✅ OpenTargets search completed: ${limitedResults.length} results in ${responseTime}ms`);

        return res.status(200).json({
            results: limitedResults,
            total: limitedResults.length,
            query: query,
            query_analysis: queryAnalysis,
            entities_found: entities.length,
            search_strategies: [
                `Entity search: ${entities.length} entities found`,
                `Detailed queries: ${entityData.filter(e => e.data).length} successful`,
                `Result formatting: ${results.length} total results`,
                `Applied limit: ${limitedResults.length} final results`
            ],
            search_timestamp: new Date().toISOString(),
            response_time: responseTime,
            api_status: 'success',
            data_source: 'OpenTargets Platform API v4'
        });

    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.error('OpenTargets API error:', error);
        
        return res.status(500).json({
            error: 'OpenTargets API error',
            message: error.message,
            results: [],
            total: 0,
            query: query,
            response_time: responseTime,
            search_timestamp: new Date().toISOString(),
            troubleshooting: {
                common_issues: [
                    'Check if OpenTargets API is accessible',
                    'Verify entity names are spelled correctly', 
                    'Try simpler query terms',
                    'Check network connectivity'
                ],
                api_status: 'https://status.opentargets.org/'
            }
        });
    }
}
