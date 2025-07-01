// api/search/opentargets.js - Enhanced Open Targets implementation with clinical precedence data
// Replace your current api/search/opentargets.js file with this enhanced version

/**
 * Enhanced Open Targets API handler for clinical precedence data
 * Returns actionable drug-disease-target associations with proper links
 */

const OPEN_TARGETS_CONFIG = {
    baseUrl: 'https://api.platform.opentargets.org/api/v4/graphql',
    platformUrl: 'https://platform.opentargets.org',
    maxRetries: 3,
    timeout: 30000
};

/**
 * GraphQL queries for different entity types
 */
const GRAPHQL_QUERIES = {
    // Search by drug name or ChEMBL ID
    drugSearch: `
        query DrugSearch($query: String!, $size: Int) {
            search(queryString: $query, entityNames: ["drug"], page: {index: 0, size: $size}) {
                hits {
                    id
                    name
                    description
                    entity
                    object {
                        ... on Drug {
                            id
                            name
                            drugType
                            maximumClinicalTrialPhase
                            isApproved
                            knownDrugs(size: 20) {
                                count
                                rows {
                                    drugId
                                    diseaseId
                                    targetId
                                    phase
                                    status
                                    mechanismOfAction
                                    approvedSymbol
                                    approvedName
                                    prefName
                                    label
                                    ctIds
                                    references {
                                        source
                                        urls
                                        ids
                                    }
                                    urls {
                                        url
                                        name
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
                                        biotype
                                        genomicLocation {
                                            chromosome
                                            start
                                            end
                                        }
                                    }
                                    drug {
                                        id
                                        name
                                        drugType
                                        maximumClinicalTrialPhase
                                        isApproved
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `,
    
    // Search by disease name or EFO ID
    diseaseSearch: `
        query DiseaseSearch($query: String!, $size: Int) {
            search(queryString: $query, entityNames: ["disease"], page: {index: 0, size: $size}) {
                hits {
                    id
                    name
                    description
                    entity
                    object {
                        ... on Disease {
                            id
                            name
                            knownDrugs(size: 20) {
                                count
                                rows {
                                    drugId
                                    diseaseId
                                    targetId
                                    phase
                                    status
                                    mechanismOfAction
                                    approvedSymbol
                                    approvedName
                                    prefName
                                    label
                                    ctIds
                                    references {
                                        source
                                        urls
                                        ids
                                    }
                                    urls {
                                        url
                                        name
                                    }
                                    disease {
                                        id
                                        name
                                    }
                                    target {
                                        id
                                        approvedSymbol
                                        approvedName
                                        biotype
                                    }
                                    drug {
                                        id
                                        name
                                        drugType
                                        maximumClinicalTrialPhase
                                        isApproved
                                    }
                                }
                            }
                            associatedTargets(page: {index: 0, size: 10}) {
                                count
                                rows {
                                    target {
                                        id
                                        approvedSymbol
                                        approvedName
                                    }
                                    score
                                    datatypeScores {
                                        id
                                        score
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `,
    
    // Search by target name or Ensembl ID
    targetSearch: `
        query TargetSearch($query: String!, $size: Int) {
            search(queryString: $query, entityNames: ["target"], page: {index: 0, size: $size}) {
                hits {
                    id
                    name
                    description
                    entity
                    object {
                        ... on Target {
                            id
                            approvedSymbol
                            approvedName
                            biotype
                            knownDrugs(size: 20) {
                                count
                                rows {
                                    drugId
                                    diseaseId
                                    targetId
                                    phase
                                    status
                                    mechanismOfAction
                                    approvedSymbol
                                    approvedName
                                    prefName
                                    label
                                    ctIds
                                    references {
                                        source
                                        urls
                                        ids
                                    }
                                    urls {
                                        url
                                        name
                                    }
                                    disease {
                                        id
                                        name
                                    }
                                    target {
                                        id
                                        approvedSymbol
                                        approvedName
                                        biotype
                                    }
                                    drug {
                                        id
                                        name
                                        drugType
                                        maximumClinicalTrialPhase
                                        isApproved
                                    }
                                }
                            }
                            associatedDiseases(page: {index: 0, size: 10}) {
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
                        }
                    }
                }
            }
        }
    `
};

/**
 * Execute GraphQL query with error handling and retries
 */
async function executeGraphQLQuery(query, variables, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(OPEN_TARGETS_CONFIG.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    query,
                    variables
                }),
                signal: AbortSignal.timeout(OPEN_TARGETS_CONFIG.timeout)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.errors) {
                console.error('GraphQL errors:', data.errors);
                throw new Error(`GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);
            }

            return data.data;

        } catch (error) {
            console.error(`Open Targets API attempt ${attempt} failed:`, error);
            
            if (attempt === retries) {
                throw new Error(`Open Targets API failed after ${retries} attempts: ${error.message}`);
            }
            
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
}

/**
 * Format phase information for display
 */
function formatPhase(phase) {
    if (phase === null || phase === undefined) return 'Not specified';
    if (phase === 0) return 'Preclinical';
    if (phase === 4) return 'Phase IV (Post-marketing)';
    return `Phase ${phase}`;
}

/**
 * Format status for display
 */
function formatStatus(status) {
    if (!status) return 'Unknown';
    
    const statusMap = {
        'recruiting': 'Recruiting',
        'active': 'Active, not recruiting', 
        'completed': 'Completed',
        'terminated': 'Terminated',
        'suspended': 'Suspended',
        'withdrawn': 'Withdrawn',
        'approved': 'Approved'
    };
    
    return statusMap[status.toLowerCase()] || status;
}

/**
 * Generate proper links for studies and evidence
 */
function generateLinks(item) {
    const links = {
        primary: null,
        clinicalTrials: [],
        references: [],
        openTargets: null,
        evidence: null
    };

    // Generate Open Targets Platform evidence link
    if (item.targetId && item.diseaseId) {
        links.evidence = `${OPEN_TARGETS_CONFIG.platformUrl}/evidence/${item.targetId}/${item.diseaseId}`;
        links.openTargets = `${OPEN_TARGETS_CONFIG.platformUrl}/target/${item.targetId}`;
        if (!links.primary) links.primary = links.evidence;
    }

    // Generate ClinicalTrials.gov links
    if (item.ctIds && Array.isArray(item.ctIds)) {
        links.clinicalTrials = item.ctIds.map(ctId => ({
            url: `https://clinicaltrials.gov/study/${ctId}`,
            name: `ClinicalTrials.gov: ${ctId}`,
            id: ctId
        }));
        
        if (!links.primary && links.clinicalTrials.length > 0) {
            links.primary = links.clinicalTrials[0].url;
        }
    }

    // Process reference URLs
    if (item.references && Array.isArray(item.references)) {
        item.references.forEach(ref => {
            if (ref.urls && Array.isArray(ref.urls)) {
                ref.urls.forEach(url => {
                    links.references.push({
                        url: url,
                        name: `${ref.source} Reference`,
                        source: ref.source
                    });
                });
            }
        });
    }

    // Process direct URLs
    if (item.urls && Array.isArray(item.urls)) {
        item.urls.forEach(urlObj => {
            links.references.push({
                url: urlObj.url,
                name: urlObj.name || 'Reference',
                source: 'Open Targets'
            });
        });
    }

    // Fallback primary link
    if (!links.primary) {
        links.primary = `${OPEN_TARGETS_CONFIG.platformUrl}/`;
    }

    return links;
}

/**
 * Create detailed description from clinical data
 */
function createDescription(item) {
    const components = [];
    
    if (item.mechanismOfAction) {
        components.push(`Mechanism: ${item.mechanismOfAction}`);
    }
    
    if (item.drug?.drugType) {
        components.push(`Drug type: ${item.drug.drugType}`);
    }
    
    if (item.target?.biotype) {
        components.push(`Target type: ${item.target.biotype}`);
    }
    
    if (item.ctIds && item.ctIds.length > 0) {
        components.push(`Clinical trials: ${item.ctIds.length} registered`);
    }

    if (item.disease?.therapeuticAreas?.length > 0) {
        components.push(`Therapeutic area: ${item.disease.therapeuticAreas[0].name}`);
    }
    
    return components.length > 0 ? components.join(' | ') : 'Clinical precedence data available';
}

/**
 * Format known drugs data into standardized structure
 */
function formatKnownDrugsData(knownDrugsData) {
    if (!Array.isArray(knownDrugsData)) {
        return [];
    }

    return knownDrugsData.map((item, index) => {
        const drugName = item.drug?.name || item.prefName || 'Unknown Drug';
        const diseaseName = item.disease?.name || item.label || 'Unknown Disease';
        const targetSymbol = item.target?.approvedSymbol || item.approvedSymbol || 'Unknown Target';
        const targetName = item.target?.approvedName || item.approvedName || 'Unknown Target Name';
        
        const phase = formatPhase(item.phase);
        const status = formatStatus(item.status);
        const links = generateLinks(item);
        const description = createDescription(item);

        return {
            id: `OT-${item.drugId}-${item.diseaseId}-${item.targetId}-${index}`,
            database: 'Open Targets',
            title: `${drugName} - ${diseaseName}`,
            type: `${item.drug?.drugType || 'Unknown'} - ${phase}`,
            status_significance: status,
            details: description,
            phase: phase,
            status: status,
            sponsor: 'Multiple (See clinical trials)',
            year: new Date().getFullYear(), // Current year as data is current
            enrollment: 'See individual trials',
            link: links.primary,
            drug_name: drugName,
            disease_name: diseaseName,
            target_symbol: targetSymbol,
            target_name: targetName,
            mechanism_of_action: item.mechanismOfAction || 'Not specified',
            clinical_trials: links.clinicalTrials,
            references: links.references,
            raw_data: item
        };
    });
}

/**
 * Process search results from different entity types
 */
function processSearchResults(searchData, entityType) {
    if (!searchData?.search?.hits) {
        return [];
    }

    const results = [];
    
    searchData.search.hits.forEach(hit => {
        if (hit.object) {
            // Process known drugs data
            if (hit.object.knownDrugs?.rows) {
                const knownDrugsResults = formatKnownDrugsData(hit.object.knownDrugs.rows);
                results.push(...knownDrugsResults);
            }

            // Process target-disease associations if available
            if (hit.object.associatedTargets?.rows) {
                hit.object.associatedTargets.rows.forEach((assoc, index) => {
                    results.push({
                        id: `OT-ASSOC-${hit.id}-${assoc.target.id}-${index}`,
                        database: 'Open Targets',
                        title: `${assoc.target.approvedSymbol} - ${hit.name}`,
                        type: `Target-Disease Association - Score ${assoc.score.toFixed(2)}`,
                        status_significance: `Association Score: ${assoc.score.toFixed(2)}`,
                        details: `Target: ${assoc.target.approvedName} | Evidence types: ${assoc.datatypeScores.map(ds => ds.id).join(', ')}`,
                        phase: 'N/A',
                        status: 'Associated',
                        sponsor: 'N/A',
                        year: new Date().getFullYear(),
                        enrollment: 'N/A',
                        link: `${OPEN_TARGETS_CONFIG.platformUrl}/evidence/${assoc.target.id}/${hit.id}`,
                        target_symbol: assoc.target.approvedSymbol,
                        target_name: assoc.target.approvedName,
                        disease_name: hit.name,
                        association_score: assoc.score,
                        evidence_types: assoc.datatypeScores,
                        raw_data: assoc
                    });
                });
            }

            // Process disease-target associations if available
            if (hit.object.associatedDiseases?.rows) {
                hit.object.associatedDiseases.rows.forEach((assoc, index) => {
                    results.push({
                        id: `OT-ASSOC-${hit.id}-${assoc.disease.id}-${index}`,
                        database: 'Open Targets',
                        title: `${hit.name} - ${assoc.disease.name}`,
                        type: `Target-Disease Association - Score ${assoc.score.toFixed(2)}`,
                        status_significance: `Association Score: ${assoc.score.toFixed(2)}`,
                        details: `Target: ${hit.name} | Evidence types: ${assoc.datatypeScores.map(ds => ds.id).join(', ')}`,
                        phase: 'N/A',
                        status: 'Associated',
                        sponsor: 'N/A',
                        year: new Date().getFullYear(),
                        enrollment: 'N/A',
                        link: `${OPEN_TARGETS_CONFIG.platformUrl}/evidence/${hit.id}/${assoc.disease.id}`,
                        target_symbol: hit.object.approvedSymbol,
                        target_name: hit.name,
                        disease_name: assoc.disease.name,
                        association_score: assoc.score,
                        evidence_types: assoc.datatypeScores,
                        raw_data: assoc
                    });
                });
            }
        }
    });

    return results;
}

/**
 * Determine entity type from query
 */
function determineEntityType(query) {
    const lowerQuery = query.toLowerCase();
    
    // Drug-related keywords
    if (lowerQuery.includes('drug') || lowerQuery.includes('therapy') || 
        lowerQuery.includes('treatment') || lowerQuery.includes('inhibitor') ||
        lowerQuery.startsWith('chembl')) {
        return 'drug';
    }
    
    // Disease-related keywords
    if (lowerQuery.includes('disease') || lowerQuery.includes('syndrome') ||
        lowerQuery.includes('cancer') || lowerQuery.includes('disorder') ||
        lowerQuery.startsWith('efo_') || lowerQuery.startsWith('mondo_')) {
        return 'disease';
    }
    
    // Target-related keywords
    if (lowerQuery.includes('protein') || lowerQuery.includes('gene') ||
        lowerQuery.includes('receptor') || lowerQuery.includes('kinase') ||
        lowerQuery.startsWith('ensg')) {
        return 'target';
    }
    
    // Default to searching all entity types
    return 'all';
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
    // Set CORS headers
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

    const { query, limit = 50 } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        console.log(`Open Targets search for: "${query}"`);
        
        const entityType = determineEntityType(query);
        const searchLimit = Math.min(parseInt(limit) || 50, 100);
        
        let results = [];

        // Search based on determined entity type
        if (entityType === 'drug' || entityType === 'all') {
            try {
                const drugData = await executeGraphQLQuery(
                    GRAPHQL_QUERIES.drugSearch,
                    { query, size: Math.ceil(searchLimit / 3) }
                );
                const drugResults = processSearchResults(drugData, 'drug');
                results.push(...drugResults);
            } catch (error) {
                console.error('Drug search failed:', error);
            }
        }

        if (entityType === 'disease' || entityType === 'all') {
            try {
                const diseaseData = await executeGraphQLQuery(
                    GRAPHQL_QUERIES.diseaseSearch,
                    { query, size: Math.ceil(searchLimit / 3) }
                );
                const diseaseResults = processSearchResults(diseaseData, 'disease');
                results.push(...diseaseResults);
            } catch (error) {
                console.error('Disease search failed:', error);
            }
        }

        if (entityType === 'target' || entityType === 'all') {
            try {
                const targetData = await executeGraphQLQuery(
                    GRAPHQL_QUERIES.targetSearch,
                    { query, size: Math.ceil(searchLimit / 3) }
                );
                const targetResults = processSearchResults(targetData, 'target');
                results.push(...targetResults);
            } catch (error) {
                console.error('Target search failed:', error);
            }
        }

        // Remove duplicates and limit results
        const uniqueResults = results.filter((item, index, self) => 
            index === self.findIndex(t => t.id === item.id)
        ).slice(0, searchLimit);

        // Sort by relevance (clinical trials first, then associations)
        uniqueResults.sort((a, b) => {
            if (a.clinical_trials?.length && !b.clinical_trials?.length) return -1;
            if (!a.clinical_trials?.length && b.clinical_trials?.length) return 1;
            if (a.association_score && b.association_score) return b.association_score - a.association_score;
            return 0;
        });

        console.log(`Open Targets returned ${uniqueResults.length} results`);

        return res.status(200).json({
            results: uniqueResults,
            total: uniqueResults.length,
            query: query,
            entity_type: entityType,
            search_timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Open Targets API error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message,
            results: [],
            total: 0,
            query: query
        });
    }
}
