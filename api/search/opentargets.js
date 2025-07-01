// api/search/opentargets.js - Improved Open Targets implementation with robust error handling
// Replace your current api/search/opentargets.js file with this enhanced version

/**
 * Enhanced Open Targets API handler with comprehensive error handling and fallback mechanisms
 * Returns actionable drug-disease-target associations with proper error recovery
 */

const OPEN_TARGETS_CONFIG = {
    baseUrl: 'https://api.platform.opentargets.org/api/v4/graphql',
    platformUrl: 'https://platform.opentargets.org',
    maxRetries: 3,
    timeout: 25000,
    fallbackTimeout: 10000,
    rateLimit: 5 // requests per second
};

/**
 * Rate limiter for API compliance
 */
class OpenTargetsRateLimiter {
    constructor(requestsPerSecond) {
        this.requests = [];
        this.limit = requestsPerSecond;
    }
    
    async checkLimit() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < 1000);
        
        if (this.requests.length >= this.limit) {
            const waitTime = 1000 - (now - this.requests[0]);
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return this.checkLimit();
            }
        }
        
        this.requests.push(now);
        return true;
    }
}

const rateLimiter = new OpenTargetsRateLimiter(OPEN_TARGETS_CONFIG.rateLimit);

/**
 * Enhanced GraphQL queries with better error handling
 */
const GRAPHQL_QUERIES = {
    // Simplified drug search with essential fields only
    drugSearchSimple: `
        query DrugSearchSimple($query: String!, $size: Int) {
            search(queryString: $query, entityNames: ["drug"], page: {index: 0, size: $size}) {
                hits {
                    id
                    name
                    entity
                    object {
                        ... on Drug {
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
    `,
    
    // Simplified disease search
    diseaseSearchSimple: `
        query DiseaseSearchSimple($query: String!, $size: Int) {
            search(queryString: $query, entityNames: ["disease"], page: {index: 0, size: $size}) {
                hits {
                    id
                    name
                    entity
                    object {
                        ... on Disease {
                            id
                            name
                        }
                    }
                }
            }
        }
    `,
    
    // Simplified target search
    targetSearchSimple: `
        query TargetSearchSimple($query: String!, $size: Int) {
            search(queryString: $query, entityNames: ["target"], page: {index: 0, size: $size}) {
                hits {
                    id
                    name
                    entity
                    object {
                        ... on Target {
                            id
                            approvedSymbol
                            approvedName
                            biotype
                        }
                    }
                }
            }
        }
    `,
    
    // Fallback query for when complex queries fail
    fallbackSearch: `
        query FallbackSearch($query: String!) {
            search(queryString: $query, page: {index: 0, size: 10}) {
                hits {
                    id
                    name
                    entity
                }
            }
        }
    `
};

/**
 * Enhanced fallback data when API is unavailable
 */
const FALLBACK_DATA = {
    'alzheimer': [
        {
            id: 'fallback-alzheimer-1',
            title: 'Alzheimer Disease - Open Targets Data',
            type: 'Disease Association',
            description: 'Open Targets contains comprehensive data on Alzheimer disease targets and therapeutic approaches',
            status: 'Research Available',
            links: {
                platform: 'https://platform.opentargets.org/disease/EFO_0000249'
            }
        }
    ],
    'cancer': [
        {
            id: 'fallback-cancer-1',
            title: 'Cancer Targets - Open Targets Platform',
            type: 'Target-Disease Association',
            description: 'Comprehensive cancer target validation data available on Open Targets platform',
            status: 'Research Available',
            links: {
                platform: 'https://platform.opentargets.org/disease/EFO_0000311'
            }
        }
    ],
    'diabetes': [
        {
            id: 'fallback-diabetes-1',
            title: 'Diabetes Mellitus - Target Evidence',
            type: 'Disease Association',
            description: 'Open Targets provides extensive evidence for diabetes-related drug targets',
            status: 'Research Available',
            links: {
                platform: 'https://platform.opentargets.org/disease/EFO_0000400'
            }
        }
    ]
};

/**
 * Execute GraphQL query with enhanced error handling and retries
 */
async function executeGraphQLQuery(query, variables, timeout = OPEN_TARGETS_CONFIG.timeout, retries = 3) {
    // Apply rate limiting
    await rateLimiter.checkLimit();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Open Targets API attempt ${attempt}/${retries}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.log(`Open Targets API timeout after ${timeout}ms`);
            }, timeout);
            
            const response = await fetch(OPEN_TARGETS_CONFIG.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'IntelliGRID/2.0'
                },
                body: JSON.stringify({
                    query,
                    variables
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.errors && data.errors.length > 0) {
                console.error('GraphQL errors:', data.errors);
                
                // If it's a query complexity error, try simpler query
                if (data.errors.some(e => e.message.includes('complexity') || e.message.includes('timeout'))) {
                    throw new Error('Query too complex, trying simpler approach');
                }
                
                throw new Error(`GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);
            }

            console.log(`Open Targets API success on attempt ${attempt}`);
            return data.data;

        } catch (error) {
            console.error(`Open Targets API attempt ${attempt} failed:`, error.message);
            
            if (attempt === retries) {
                throw error;
            }
            
            // Progressive timeout reduction and query simplification
            if (attempt < retries) {
                timeout = Math.max(timeout * 0.8, OPEN_TARGETS_CONFIG.fallbackTimeout);
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }
}

/**
 * Smart query selection based on input
 */
function selectAppropriateQuery(query) {
    const queryLower = query.toLowerCase();
    
    // Entity type detection
    if (queryLower.includes('drug') || queryLower.includes('compound') || 
        queryLower.includes('therapy') || queryLower.includes('inhibitor') ||
        queryLower.startsWith('chembl')) {
        return { type: 'drug', query: GRAPHQL_QUERIES.drugSearchSimple };
    }
    
    if (queryLower.includes('disease') || queryLower.includes('syndrome') ||
        queryLower.includes('cancer') || queryLower.includes('disorder') ||
        queryLower.startsWith('efo_') || queryLower.startsWith('mondo_')) {
        return { type: 'disease', query: GRAPHQL_QUERIES.diseaseSearchSimple };
    }
    
    if (queryLower.includes('protein') || queryLower.includes('gene') ||
        queryLower.includes('receptor') || queryLower.includes('target') ||
        queryLower.startsWith('ensg')) {
        return { type: 'target', query: GRAPHQL_QUERIES.targetSearchSimple };
    }
    
    // Default to simple disease search for general terms
    return { type: 'disease', query: GRAPHQL_QUERIES.diseaseSearchSimple };
}

/**
 * Generate fallback data based on query
 */
function generateFallbackData(query, limit = 10) {
    const queryLower = query.toLowerCase();
    
    // Check for matches in fallback data
    for (const [key, data] of Object.entries(FALLBACK_DATA)) {
        if (queryLower.includes(key)) {
            return data.slice(0, limit);
        }
    }
    
    // Generate generic fallback
    return [{
        id: `fallback-${Date.now()}`,
        title: `Open Targets Data for "${query}"`,
        type: 'Research Data',
        description: `Open Targets Platform contains research data related to "${query}". Visit the platform for detailed information.`,
        status: 'Research Available',
        links: {
            platform: `https://platform.opentargets.org/search?q=${encodeURIComponent(query)}`
        }
    }];
}

/**
 * Process search results from API or fallback
 */
function processSearchResults(searchData, entityType, originalQuery) {
    const results = [];
    
    if (!searchData?.search?.hits) {
        console.log('No search hits found, using fallback data');
        return generateFallbackData(originalQuery);
    }

    searchData.search.hits.forEach((hit, index) => {
        try {
            if (hit.object) {
                const result = {
                    id: `OT-${hit.id}-${index}`,
                    database: 'Open Targets',
                    title: hit.name || hit.object.name || `Open Targets ${entityType}`,
                    type: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} - Open Targets`,
                    status_significance: 'Research Data Available',
                    details: generateDescription(hit.object, entityType),
                    phase: 'N/A',
                    status: 'Research Available',
                    sponsor: 'Open Targets Platform',
                    year: new Date().getFullYear(),
                    enrollment: 'N/A',
                    link: generateOpenTargetsLink(hit.id, entityType),
                    
                    // Open Targets specific fields
                    entity_type: entityType,
                    entity_id: hit.id,
                    entity_name: hit.name,
                    
                    raw_data: hit.object
                };
                
                results.push(result);
            }
        } catch (processingError) {
            console.error('Error processing individual hit:', processingError);
            // Continue with other results
        }
    });

    return results;
}

/**
 * Generate description based on entity type and data
 */
function generateDescription(entityData, entityType) {
    try {
        const components = [];
        
        if (entityType === 'drug') {
            if (entityData.drugType) components.push(`Type: ${entityData.drugType}`);
            if (entityData.maximumClinicalTrialPhase !== null) {
                components.push(`Max Phase: ${formatPhase(entityData.maximumClinicalTrialPhase)}`);
            }
            if (entityData.isApproved) components.push('Status: Approved');
        } else if (entityType === 'target') {
            if (entityData.approvedSymbol) components.push(`Symbol: ${entityData.approvedSymbol}`);
            if (entityData.biotype) components.push(`Type: ${entityData.biotype}`);
        } else if (entityType === 'disease') {
            components.push('Disease information available on Open Targets Platform');
        }
        
        return components.length > 0 ? components.join(' | ') : 'Open Targets research data available';
    } catch (error) {
        console.error('Error generating description:', error);
        return 'Open Targets research data available';
    }
}

/**
 * Format phase information
 */
function formatPhase(phase) {
    if (phase === null || phase === undefined) return 'Not specified';
    if (phase === 0) return 'Preclinical';
    if (phase === 4) return 'Phase IV (Approved)';
    return `Phase ${phase}`;
}

/**
 * Generate Open Targets platform links
 */
function generateOpenTargetsLink(entityId, entityType) {
    const baseUrl = OPEN_TARGETS_CONFIG.platformUrl;
    
    switch (entityType) {
        case 'drug':
            return `${baseUrl}/drug/${entityId}`;
        case 'target':
            return `${baseUrl}/target/${entityId}`;
        case 'disease':
            return `${baseUrl}/disease/${entityId}`;
        default:
            return `${baseUrl}/search?q=${encodeURIComponent(entityId)}`;
    }
}

/**
 * Main API handler with comprehensive error recovery
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

    const startTime = performance.now();
    const { query, limit = 50 } = req.query;

    if (!query) {
        return res.status(400).json({ 
            error: 'Query parameter is required',
            example: '/api/search/opentargets?query=alzheimer'
        });
    }

    try {
        console.log(`Open Targets search for: "${query}"`);
        
        const searchLimit = Math.min(parseInt(limit) || 50, 100);
        let results = [];
        let searchSuccessful = false;
        let lastError = null;

        // Strategy 1: Try intelligent query selection
        try {
            const { type: entityType, query: selectedQuery } = selectAppropriateQuery(query);
            console.log(`Trying ${entityType} search for Open Targets`);
            
            const searchData = await executeGraphQLQuery(
                selectedQuery,
                { query, size: searchLimit }
            );
            
            const entityResults = processSearchResults(searchData, entityType, query);
            results.push(...entityResults);
            searchSuccessful = true;
            
        } catch (strategyError) {
            console.log('Strategy 1 failed, trying fallback approach:', strategyError.message);
            lastError = strategyError;
        }

        // Strategy 2: Try simple fallback query if strategy 1 failed
        if (!searchSuccessful) {
            try {
                console.log('Trying fallback search for Open Targets');
                
                const fallbackData = await executeGraphQLQuery(
                    GRAPHQL_QUERIES.fallbackSearch,
                    { query },
                    OPEN_TARGETS_CONFIG.fallbackTimeout,
                    1 // Only 1 retry for fallback
                );
                
                if (fallbackData?.search?.hits) {
                    results = fallbackData.search.hits.map((hit, index) => ({
                        id: `OT-FB-${hit.id}-${index}`,
                        database: 'Open Targets',
                        title: hit.name || `Open Targets result for "${query}"`,
                        type: `${hit.entity || 'Research'} - Open Targets`,
                        status_significance: 'Research Data Available',
                        details: `Open Targets Platform data for ${hit.name || query}`,
                        phase: 'N/A',
                        status: 'Research Available',
                        sponsor: 'Open Targets Platform',
                        year: new Date().getFullYear(),
                        enrollment: 'N/A',
                        link: `${OPEN_TARGETS_CONFIG.platformUrl}/search?q=${encodeURIComponent(query)}`,
                        entity_type: hit.entity,
                        entity_id: hit.id,
                        raw_data: hit
                    }));
                    searchSuccessful = true;
                }
                
            } catch (fallbackError) {
                console.log('Fallback search also failed:', fallbackError.message);
                lastError = fallbackError;
            }
        }

        // Strategy 3: Use hardcoded fallback data
        if (!searchSuccessful || results.length === 0) {
            console.log('Using hardcoded fallback data for Open Targets');
            
            const fallbackResults = generateFallbackData(query, searchLimit);
            results = fallbackResults.map((fallback, index) => ({
                id: `OT-HARD-FB-${index}`,
                database: 'Open Targets',
                title: fallback.title,
                type: fallback.type,
                status_significance: fallback.status,
                details: fallback.description,
                phase: 'N/A',
                status: fallback.status,
                sponsor: 'Open Targets Platform',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: fallback.links.platform,
                entity_type: 'fallback',
                fallback_data: true,
                raw_data: fallback
            }));
        }

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        console.log(`Open Targets search completed: ${results.length} results in ${Math.round(responseTime)}ms`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            search_timestamp: new Date().toISOString(),
            response_time: Math.round(responseTime),
            api_status: searchSuccessful ? 'success' : 'fallback',
            last_error: !searchSuccessful ? lastError?.message : null,
            data_source: searchSuccessful ? 'Open Targets API' : 'Fallback Data'
        });

    } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        console.error('Open Targets complete failure:', error);
        
        // Even in complete failure, try to provide some helpful response
        const emergencyFallback = [{
            id: 'OT-EMERGENCY-FB',
            database: 'Open Targets',
            title: `Open Targets Platform - Search for "${query}"`,
            type: 'Research Platform',
            status_significance: 'Platform Available',
            details: 'Open Targets Platform contains comprehensive target-disease association data. API temporarily unavailable, but platform accessible.',
            phase: 'N/A',
            status: 'Platform Available',
            sponsor: 'Open Targets',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: `${OPEN_TARGETS_CONFIG.platformUrl}/search?q=${encodeURIComponent(query)}`,
            entity_type: 'emergency_fallback',
            raw_data: { error: error.message }
        }];

        return res.status(200).json({
            results: emergencyFallback,
            total: 1,
            query: query,
            search_timestamp: new Date().toISOString(),
            response_time: Math.round(responseTime),
            api_status: 'emergency_fallback',
            error: error.message,
            message: 'Open Targets API unavailable, providing platform access link',
            data_source: 'Emergency Fallback'
        });
    }
}
