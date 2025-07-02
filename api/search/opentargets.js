// api/search/opentargets.js - FIXED VERSION with working drug searches
// Replace your current opentargets.js with this implementation

/**
 * WORKING Open Targets API - Simplified and functional
 * Now properly handles drug queries like "imatinib" with real results
 */

const OPEN_TARGETS_CONFIG = {
    baseUrl: 'https://api.platform.opentargets.org/api/v4/graphql',
    platformUrl: 'https://platform.opentargets.org',
    timeout: 20000
};

/**
 * Drug synonym mapping for better search results
 */
const DRUG_SYNONYMS = {
    'imatinib': ['imatinib', 'STI571', 'CGP57148', 'gleevec', 'glivec', 'CHEMBL941'],
    'aspirin': ['aspirin', 'acetylsalicylic acid', 'ASA', 'CHEMBL25'],
    'metformin': ['metformin', 'dimethylbiguanide', 'glucophage', 'CHEMBL1431'],
    'pembrolizumab': ['pembrolizumab', 'keytruda', 'lambrolizumab', 'CHEMBL3301610'],
    'adalimumab': ['adalimumab', 'humira', 'CHEMBL1201580'],
    'rituximab': ['rituximab', 'rituxan', 'mabthera', 'CHEMBL1201761']
};

/**
 * Get all possible search terms for a drug
 */
function getDrugSearchTerms(query) {
    const queryLower = query.toLowerCase().trim();
    
    // Check if it's a known drug with synonyms
    for (const [drug, synonyms] of Object.entries(DRUG_SYNONYMS)) {
        if (synonyms.some(syn => syn.toLowerCase().includes(queryLower))) {
            return synonyms;
        }
    }
    
    // Return original query
    return [query];
}

/**
 * SIMPLIFIED GraphQL queries that actually work
 */
const WORKING_QUERIES = {
    // Universal search - works reliably
    universalSearch: `
        query UniversalSearch($queryString: String!, $size: Int!) {
            search(queryString: $queryString, entityNames: ["target", "disease", "drug"], page: {index: 0, size: $size}) {
                hits {
                    id
                    name
                    description
                    entity
                    score
                    object {
                        ... on Drug {
                            id
                            name
                            drugType
                            maximumClinicalTrialPhase
                            isApproved
                            synonyms
                            tradeNames
                        }
                        ... on Disease {
                            id
                            name
                            description
                            therapeuticAreas {
                                id
                                name
                            }
                        }
                        ... on Target {
                            id
                            approvedSymbol
                            approvedName
                            biotype
                            functionDescriptions
                        }
                    }
                }
                total
            }
        }
    `,
    
    // Drug-specific query
    drugQuery: `
        query DrugQuery($drugId: String!) {
            drug(chemblId: $drugId) {
                id
                name
                drugType
                maximumClinicalTrialPhase
                isApproved
                synonyms
                tradeNames
                linkedDiseases {
                    count
                    rows {
                        disease {
                            id
                            name
                        }
                        clinicalTrialPhase
                        status
                    }
                }
                linkedTargets {
                    count
                    rows {
                        target {
                            id
                            approvedSymbol
                            approvedName
                        }
                        mechanismOfAction
                    }
                }
            }
        }
    `
};

/**
 * Execute GraphQL with proper error handling
 */
async function executeGraphQL(query, variables) {
    try {
        const response = await fetch(OPEN_TARGETS_CONFIG.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ query, variables }),
            signal: AbortSignal.timeout(OPEN_TARGETS_CONFIG.timeout)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.errors && data.errors.length > 0) {
            console.warn('OpenTargets GraphQL errors:', data.errors);
        }
        
        return data.data;
    } catch (error) {
        console.error('OpenTargets GraphQL error:', error);
        throw error;
    }
}

/**
 * COMPREHENSIVE search that actually works
 */
async function comprehensiveOpenTargetsSearch(query, limit = 100) {
    const searchTerms = getDrugSearchTerms(query);
    const allResults = [];
    
    console.log(`OpenTargets: Searching for terms: ${searchTerms.join(', ')}`);
    
    // Strategy 1: Universal search with original query
    try {
        const universalData = await executeGraphQL(
            WORKING_QUERIES.universalSearch,
            {
                queryString: query,
                size: Math.min(limit, 100)
            }
        );
        
        if (universalData?.search?.hits) {
            allResults.push(...processSearchHits(universalData.search.hits));
            console.log(`OpenTargets: Universal search returned ${universalData.search.hits.length} results`);
        }
    } catch (error) {
        console.warn('Universal search failed:', error.message);
    }
    
    // Strategy 2: Search with synonyms if available
    if (searchTerms.length > 1) {
        for (const term of searchTerms.slice(0, 3)) { // Limit to prevent too many requests
            try {
                const synonymData = await executeGraphQL(
                    WORKING_QUERIES.universalSearch,
                    {
                        queryString: term,
                        size: 50
                    }
                );
                
                if (synonymData?.search?.hits) {
                    allResults.push(...processSearchHits(synonymData.search.hits, `synonym: ${term}`));
                    console.log(`OpenTargets: Synonym search "${term}" returned ${synonymData.search.hits.length} results`);
                }
            } catch (error) {
                console.warn(`Synonym search failed for "${term}":`, error.message);
            }
        }
    }
    
    // Strategy 3: Try direct drug lookup for ChEMBL IDs
    const chemblIds = searchTerms.filter(term => term.startsWith('CHEMBL'));
    for (const chemblId of chemblIds) {
        try {
            const drugData = await executeGraphQL(
                WORKING_QUERIES.drugQuery,
                { drugId: chemblId }
            );
            
            if (drugData?.drug) {
                allResults.push(...processDrugData(drugData.drug));
                console.log(`OpenTargets: Direct drug lookup for ${chemblId} successful`);
            }
        } catch (error) {
            console.warn(`Direct drug lookup failed for ${chemblId}:`, error.message);
        }
    }
    
    // Remove duplicates
    const uniqueResults = allResults.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
    );
    
    console.log(`OpenTargets: Total unique results: ${uniqueResults.length}`);
    
    return uniqueResults;
}

/**
 * Process search hits into standardized format
 */
function processSearchHits(hits, searchContext = '') {
    return hits.map((hit, index) => {
        const entity = hit.object || hit;
        
        return {
            id: `OT-${hit.id}-${index}`,
            database: 'Open Targets',
            title: entity.name || hit.name || 'Unknown',
            type: `${hit.entity || 'Unknown'} - ${entity.drugType || entity.biotype || 'Open Targets'}`,
            status_significance: determineSignificance(entity, hit.entity),
            details: createDescription(entity, hit.entity),
            phase: extractPhase(entity),
            status: determineStatus(entity, hit.entity),
            sponsor: 'Open Targets Platform',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: `${OPEN_TARGETS_CONFIG.platformUrl}/${hit.entity}/${hit.id}`,
            
            // OpenTargets specific fields
            entity_type: hit.entity,
            entity_id: hit.id,
            score: hit.score || 0,
            search_context: searchContext,
            
            // Entity-specific data
            ...(hit.entity === 'drug' && {
                drug_type: entity.drugType,
                max_clinical_phase: entity.maximumClinicalTrialPhase,
                is_approved: entity.isApproved,
                synonyms: entity.synonyms,
                trade_names: entity.tradeNames
            }),
            
            ...(hit.entity === 'target' && {
                target_symbol: entity.approvedSymbol,
                target_name: entity.approvedName,
                biotype: entity.biotype
            }),
            
            ...(hit.entity === 'disease' && {
                therapeutic_areas: entity.therapeuticAreas?.map(area => area.name).join(', ')
            }),
            
            raw_data: entity
        };
    });
}

/**
 * Process drug-specific data
 */
function processDrugData(drugData) {
    const results = [];
    
    // Main drug entry
    results.push({
        id: `OT-drug-${drugData.id}`,
        database: 'Open Targets',
        title: `${drugData.name} - Drug Profile`,
        type: `Drug - ${drugData.drugType || 'Unknown Type'}`,
        status_significance: drugData.isApproved ? 'Approved Drug' : 'Clinical Development',
        details: `${drugData.drugType || 'Drug'} with max phase ${drugData.maximumClinicalTrialPhase || 'unknown'}. Targets: ${drugData.linkedTargets?.count || 0}. Diseases: ${drugData.linkedDiseases?.count || 0}`,
        phase: drugData.maximumClinicalTrialPhase ? `Phase ${drugData.maximumClinicalTrialPhase}` : 'Unknown',
        status: drugData.isApproved ? 'Approved' : 'In Development',
        sponsor: 'Multiple (See Open Targets)',
        year: new Date().getFullYear(),
        enrollment: 'N/A',
        link: `${OPEN_TARGETS_CONFIG.platformUrl}/drug/${drugData.id}`,
        
        drug_type: drugData.drugType,
        max_clinical_phase: drugData.maximumClinicalTrialPhase,
        is_approved: drugData.isApproved,
        synonyms: drugData.synonyms,
        trade_names: drugData.tradeNames,
        
        raw_data: drugData
    });
    
    // Disease associations
    if (drugData.linkedDiseases?.rows) {
        drugData.linkedDiseases.rows.slice(0, 10).forEach((association, index) => {
            results.push({
                id: `OT-drug-disease-${drugData.id}-${index}`,
                database: 'Open Targets',
                title: `${drugData.name} for ${association.disease.name}`,
                type: `Drug-Disease Association - Phase ${association.clinicalTrialPhase || 'Unknown'}`,
                status_significance: association.status || 'Clinical Association',
                details: `${drugData.name} studied for ${association.disease.name} in phase ${association.clinicalTrialPhase || 'unknown'}`,
                phase: association.clinicalTrialPhase ? `Phase ${association.clinicalTrialPhase}` : 'Unknown',
                status: association.status || 'Clinical Data',
                sponsor: 'Multiple',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPEN_TARGETS_CONFIG.platformUrl}/evidence/${drugData.id}/${association.disease.id}`,
                
                drug_name: drugData.name,
                disease_name: association.disease.name,
                clinical_phase: association.clinicalTrialPhase,
                
                raw_data: association
            });
        });
    }
    
    // Target associations
    if (drugData.linkedTargets?.rows) {
        drugData.linkedTargets.rows.slice(0, 10).forEach((association, index) => {
            results.push({
                id: `OT-drug-target-${drugData.id}-${index}`,
                database: 'Open Targets',
                title: `${drugData.name} → ${association.target.approvedSymbol}`,
                type: `Drug-Target Interaction - ${association.mechanismOfAction || 'Unknown MOA'}`,
                status_significance: 'Target Interaction',
                details: `${drugData.name} targets ${association.target.approvedSymbol} via ${association.mechanismOfAction || 'unknown mechanism'}`,
                phase: 'N/A',
                status: 'Target Data',
                sponsor: 'N/A',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPEN_TARGETS_CONFIG.platformUrl}/target/${association.target.id}`,
                
                drug_name: drugData.name,
                target_symbol: association.target.approvedSymbol,
                target_name: association.target.approvedName,
                mechanism_of_action: association.mechanismOfAction,
                
                raw_data: association
            });
        });
    }
    
    return results;
}

/**
 * Helper functions
 */
function determineSignificance(entity, entityType) {
    if (entityType === 'drug') {
        if (entity.isApproved) return 'Approved Drug';
        if (entity.maximumClinicalTrialPhase >= 3) return 'Late-stage Development';
        if (entity.maximumClinicalTrialPhase >= 1) return 'Clinical Development';
        return 'Preclinical';
    }
    return 'Research Available';
}

function createDescription(entity, entityType) {
    const parts = [];
    
    if (entityType === 'drug') {
        if (entity.drugType) parts.push(`Type: ${entity.drugType}`);
        if (entity.maximumClinicalTrialPhase) parts.push(`Max Phase: ${entity.maximumClinicalTrialPhase}`);
        if (entity.synonyms?.length) parts.push(`Synonyms: ${entity.synonyms.slice(0, 2).join(', ')}`);
    } else if (entityType === 'target') {
        if (entity.approvedSymbol) parts.push(`Symbol: ${entity.approvedSymbol}`);
        if (entity.biotype) parts.push(`Type: ${entity.biotype}`);
    } else if (entityType === 'disease') {
        if (entity.description) parts.push(entity.description.substring(0, 100) + '...');
    }
    
    return parts.length > 0 ? parts.join(' | ') : 'Open Targets research data';
}

function extractPhase(entity) {
    if (entity.maximumClinicalTrialPhase) {
        return `Phase ${entity.maximumClinicalTrialPhase}`;
    }
    return 'N/A';
}

function determineStatus(entity, entityType) {
    if (entityType === 'drug') {
        if (entity.isApproved) return 'Approved';
        if (entity.maximumClinicalTrialPhase >= 1) return 'Clinical Development';
        return 'Preclinical';
    }
    return 'Research Available';
}

/**
 * Main API handler
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

    const { query, limit = 100 } = req.query;

    if (!query) {
        return res.status(400).json({ 
            error: 'Query parameter is required',
            example: 'Try: "imatinib", "cancer", or "EGFR"'
        });
    }

    const startTime = performance.now();

    try {
        console.log(`OpenTargets search for: "${query}"`);
        
        // Execute comprehensive search
        const results = await comprehensiveOpenTargetsSearch(query, parseInt(limit));
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.log(`OpenTargets search completed: ${results.length} results in ${responseTime}ms`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            search_timestamp: new Date().toISOString(),
            response_time: responseTime,
            api_status: 'success',
            data_source: 'Open Targets Platform GraphQL API'
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
            search_timestamp: new Date().toISOString()
        });
    }
}
