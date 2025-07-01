// api/search/index.js - Enhanced combined search endpoint with comprehensive error handling
// Replace your current api/search/index.js file with this enhanced version

export default async function handler(req, res) {
    // Set comprehensive CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            allowed_methods: ['GET', 'OPTIONS']
        });
    }

    try {
        const { query, database, limit = 50 } = req.query;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Query parameter is required',
                example: '/api/search?query=alzheimer disease'
            });
        }

        // Determine base URL for internal API calls
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const baseUrl = host?.includes('localhost') 
            ? 'http://localhost:3000' 
            : `${protocol}://${host}`;

        console.log(`Combined search for: "${query}" (base URL: ${baseUrl})`);

        // Define all available databases with enhanced configuration
        const availableDatabases = [
            'clinicaltrials',
            'opentargets', 
            'chembl',
            'drugbank',
            'evaluatepharma',  // Enhanced with market intelligence
            'clinvar',
            'hpa',
            'uniprot',
            'pubmed',
            'mgi',
            'iuphar'
        ];

        // Determine which databases to search
        const databasesToSearch = database && database !== 'all' 
            ? [database].filter(db => availableDatabases.includes(db))
            : availableDatabases;

        if (databasesToSearch.length === 0) {
            return res.status(400).json({
                error: 'Invalid database specified',
                available_databases: availableDatabases
            });
        }

        console.log(`Searching databases: ${databasesToSearch.join(', ')}`);

        // Execute searches in parallel with enhanced error handling
        const searchPromises = databasesToSearch.map(async (db) => {
            const startTime = Date.now();
            
            try {
                const apiUrl = `${baseUrl}/api/search/${db}?query=${encodeURIComponent(query)}&limit=${limit}`;
                console.log(`Calling: ${apiUrl}`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                
                const response = await fetch(apiUrl, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'PharmaIntelligence-CombinedSearch/1.0'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                // Validate and enhance the response data
                const validatedResults = (data.results || []).map(result => ({
                    ...result,
                    // Ensure critical fields are never empty/null
                    id: result.id || `${db}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    database: result.database || db,
                    title: result.title || `${db} research entry`,
                    details: result.details || `Research data from ${db}`,
                    status: result.status || 'Available',
                    link: result.link || '#',
                    year: result.year || new Date().getFullYear(),
                    // Add search metadata
                    search_response_time: responseTime,
                    search_timestamp: new Date().toISOString(),
                    data_quality: assessDataQuality(result)
                }));
                
                console.log(`${db}: ${validatedResults.length} results in ${responseTime}ms`);
                
                return {
                    database: db,
                    success: true,
                    results: validatedResults,
                    total: data.total || validatedResults.length,
                    response_time: responseTime,
                    search_timestamp: data.search_timestamp || new Date().toISOString(),
                    // Include database-specific metadata
                    metadata: {
                        query_processed: data.query || query,
                        filters_applied: data.filters || {},
                        intelligence_summary: data.intelligence_summary || null,
                        data_source: data.data_source || db
                    }
                };
                
            } catch (error) {
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                console.error(`${db} search failed after ${responseTime}ms:`, error.message);
                
                return {
                    database: db,
                    success: false,
                    error: error.message,
                    error_type: error.name || 'UnknownError',
                    response_time: responseTime,
                    results: [],
                    total: 0
                };
            }
        });

        // Wait for all searches to complete
        const searchResults = await Promise.allSettled(searchPromises);
        
        // Process results and collect metrics
        const combinedResults = [];
        const successfulDatabases = [];
        const failedDatabases = [];
        const databaseMetrics = {};
        let totalResults = 0;
        
        searchResults.forEach((promiseResult, index) => {
            const database = databasesToSearch[index];
            
            if (promiseResult.status === 'fulfilled') {
                const result = promiseResult.value;
                
                if (result.success) {
                    combinedResults.push(...result.results);
                    successfulDatabases.push(database);
                    totalResults += result.total;
                    
                    databaseMetrics[database] = {
                        status: 'success',
                        results_count: result.results.length,
                        total_available: result.total,
                        response_time: result.response_time,
                        metadata: result.metadata
                    };
                } else {
                    failedDatabases.push({
                        database: database,
                        error: result.error,
                        error_type: result.error_type
                    });
                    
                    databaseMetrics[database] = {
                        status: 'error',
                        error: result.error,
                        response_time: result.response_time
                    };
                }
            } else {
                failedDatabases.push({
                    database: database,
                    error: promiseResult.reason?.message || 'Promise rejected',
                    error_type: 'PromiseRejection'
                });
                
                databaseMetrics[database] = {
                    status: 'error',
                    error: promiseResult.reason?.message || 'Promise rejected'
                };
            }
        });

        // Remove duplicates and enhance combined results
        const uniqueResults = removeDuplicateResults(combinedResults);
        const enhancedResults = enhanceResultsWithCombinedData(uniqueResults, query);
        
        // Sort results by relevance and quality
        const sortedResults = enhancedResults.sort((a, b) => {
            // Primary sort: data quality
            if (a.data_quality !== b.data_quality) {
                const qualityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                return (qualityOrder[b.data_quality] || 0) - (qualityOrder[a.data_quality] || 0);
            }
            
            // Secondary sort: year (newer first)
            return (b.year || 0) - (a.year || 0);
        });

        // Prepare comprehensive response
        const response = {
            results: sortedResults,
            total: totalResults,
            unique_results: uniqueResults.length,
            query: query,
            databases_searched: databasesToSearch,
            successful_databases: successfulDatabases,
            failed_databases: failedDatabases,
            database_metrics: databaseMetrics,
            search_timestamp: new Date().toISOString(),
            
            // Summary statistics
            summary: {
                total_databases_searched: databasesToSearch.length,
                successful_databases_count: successfulDatabases.length,
                failed_databases_count: failedDatabases.length,
                success_rate: `${Math.round((successfulDatabases.length / databasesToSearch.length) * 100)}%`,
                high_quality_results: sortedResults.filter(r => r.data_quality === 'high').length,
                medium_quality_results: sortedResults.filter(r => r.data_quality === 'medium').length,
                low_quality_results: sortedResults.filter(r => r.data_quality === 'low').length
            },
            
            // Performance metrics
            performance: {
                fastest_database: Object.entries(databaseMetrics)
                    .filter(([_, metrics]) => metrics.status === 'success')
                    .sort(([_, a], [__, b]) => a.response_time - b.response_time)[0]?.[0],
                slowest_database: Object.entries(databaseMetrics)
                    .filter(([_, metrics]) => metrics.status === 'success')
                    .sort(([_, a], [__, b]) => b.response_time - a.response_time)[0]?.[0],
                average_response_time: Math.round(
                    Object.values(databaseMetrics)
                        .filter(m => m.status === 'success')
                        .reduce((sum, m) => sum + m.response_time, 0) / successfulDatabases.length
                )
            }
        };

        // Log comprehensive search summary
        console.log(`Search completed: ${uniqueResults.length} unique results from ${totalResults} total across ${successfulDatabases.length}/${databasesToSearch.length} databases`);
        
        if (failedDatabases.length > 0) {
            console.warn(`Failed databases: ${failedDatabases.map(f => f.database).join(', ')}`);
        }

        return res.status(200).json(response);

    } catch (error) {
        console.error('Combined search error:', error);
        
        return res.status(500).json({ 
            error: 'Internal server error during combined search',
            message: error.message,
            timestamp: new Date().toISOString(),
            results: [],
            total: 0,
            query: req.query.query || null
        });
    }
}

/**
 * Assess the quality of result data to prevent N/A values
 */
function assessDataQuality(result) {
    let score = 0;
    
    // Check for meaningful data presence
    if (result.title && result.title !== 'N/A' && result.title.length > 5) score += 2;
    if (result.details && result.details !== 'N/A' && result.details.length > 10) score += 2;
    if (result.link && result.link !== '#' && result.link.includes('http')) score += 1;
    if (result.status && result.status !== 'N/A' && result.status !== 'Unknown') score += 1;
    if (result.phase && result.phase !== 'N/A') score += 1;
    if (result.year && result.year > 1990) score += 1;
    if (result.sponsor && result.sponsor !== 'N/A' && result.sponsor !== 'Unknown') score += 1;
    
    // Database-specific quality indicators
    if (result.clinical_trials_count > 0) score += 1;
    if (result.market_value) score += 1;
    if (result.pubmed_id || result.pmid) score += 1;
    if (result.raw_data && Object.keys(result.raw_data).length > 3) score += 1;
    
    return score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';
}

/**
 * Remove duplicate results based on similarity analysis
 */
function removeDuplicateResults(results) {
    const seen = new Map();
    const unique = [];
    
    results.forEach(result => {
        // Create similarity key based on title and content
        const titleWords = (result.title || '').toLowerCase().split(/\s+/).slice(0, 5).join(' ');
        const key = `${titleWords}-${result.database}`;
        
        if (!seen.has(key)) {
            seen.set(key, true);
            unique.push(result);
        }
    });
    
    return unique;
}

/**
 * Enhance results with cross-database insights
 */
function enhanceResultsWithCombinedData(results, query) {
    return results.map(result => ({
        ...result,
        // Add cross-database relevance scoring
        cross_db_relevance: calculateCrossDbRelevance(result, query, results),
        // Add completeness scoring
        data_completeness: calculateDataCompleteness(result),
        // Add enhanced display fields
        enhanced_title: enhanceTitle(result),
        enhanced_details: enhanceDetails(result)
    }));
}

/**
 * Calculate relevance across databases
 */
function calculateCrossDbRelevance(result, query, allResults) {
    const queryTerms = query.toLowerCase().split(/\s+/);
    let relevanceScore = 0;
    
    // Check query term matches
    queryTerms.forEach(term => {
        if (result.title?.toLowerCase().includes(term)) relevanceScore += 3;
        if (result.details?.toLowerCase().includes(term)) relevanceScore += 2;
        if (result.sponsor?.toLowerCase().includes(term)) relevanceScore += 1;
        if (result.type?.toLowerCase().includes(term)) relevanceScore += 1;
    });
    
    // Bonus for high-value databases
    if (['EvaluatePharma', 'ClinicalTrials.gov', 'ChEMBL'].includes(result.database)) {
        relevanceScore += 2;
    }
    
    return relevanceScore;
}

/**
 * Calculate data completeness percentage
 */
function calculateDataCompleteness(result) {
    const requiredFields = ['title', 'details', 'status', 'database', 'link'];
    const optionalFields = ['phase', 'sponsor', 'year', 'enrollment', 'type'];
    
    let completenessScore = 0;
    const totalFields = requiredFields.length + optionalFields.length;
    
    requiredFields.forEach(field => {
        if (result[field] && result[field] !== 'N/A' && result[field] !== 'Unknown') {
            completenessScore += 2; // Required fields are worth more
        }
    });
    
    optionalFields.forEach(field => {
        if (result[field] && result[field] !== 'N/A' && result[field] !== 'Unknown') {
            completenessScore += 1;
        }
    });
    
    return Math.round((completenessScore / (requiredFields.length * 2 + optionalFields.length)) * 100);
}

/**
 * Enhance title display
 */
function enhanceTitle(result) {
    let title = result.title || 'Research Entry';
    
    // Clean common issues
    title = title.replace(/^(N\/A|Unknown|null|undefined)$/i, `${result.database} Entry`);
    
    // Add database context if title is generic
    if (title.length < 20 && !title.includes(result.database)) {
        title = `${title} (${result.database})`;
    }
    
    return title;
}

/**
 * Enhance details display
 */
function enhanceDetails(result) {
    let details = result.details || '';
    
    // If details are insufficient, construct from available data
    if (!details || details === 'N/A' || details.length < 20) {
        const parts = [];
        
        if (result.type) parts.push(`Type: ${result.type}`);
        if (result.phase && result.phase !== 'N/A') parts.push(`Phase: ${result.phase}`);
        if (result.sponsor && result.sponsor !== 'N/A') parts.push(`Sponsor: ${result.sponsor}`);
        if (result.year && result.year > 1990) parts.push(`Year: ${result.year}`);
        
        // Add database-specific enhancements
        if (result.database === 'EvaluatePharma' && result.market_value) {
            parts.push(`Market Value: ${result.market_value}`);
        }
        if (result.database === 'ClinicalTrials.gov' && result.enrollment) {
            parts.push(`Enrollment: ${result.enrollment}`);
        }
        
        details = parts.length > 0 ? parts.join(' | ') : `Research data from ${result.database}`;
    }
    
    return details;
}
