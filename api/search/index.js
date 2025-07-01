// api/search/index.js - Enhanced combined search endpoint with comprehensive error handling and logging
export default async function handler(req, res) {
    // Set comprehensive CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            allowed_methods: ['GET', 'OPTIONS'],
            timestamp: new Date().toISOString()
        });
    }

    const startTime = performance.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
        const { query, database, limit = 50 } = req.query;
        
        // Enhanced input validation
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Query parameter is required and cannot be empty',
                example: '/api/search?query=alzheimer disease',
                request_id: requestId,
                timestamp: new Date().toISOString()
            });
        }

        if (query.trim().length > 1000) {
            return res.status(400).json({
                error: 'Query too long. Maximum 1000 characters allowed.',
                provided_length: query.length,
                request_id: requestId,
                timestamp: new Date().toISOString()
            });
        }

        // Determine base URL for internal API calls
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const baseUrl = host?.includes('localhost') 
            ? 'http://localhost:3000' 
            : `${protocol}://${host}`;

        console.log(`[${requestId}] Combined search for: "${query}" (base URL: ${baseUrl})`);

        // Define all available databases with enhanced configuration
        const availableDatabases = [
            { id: 'clinicaltrials', name: 'ClinicalTrials.gov', timeout: 30000, retries: 2 },
            { id: 'opentargets', name: 'Open Targets', timeout: 25000, retries: 2 }, 
            { id: 'chembl', name: 'ChEMBL', timeout: 20000, retries: 2 },
            { id: 'drugbank', name: 'DrugBank', timeout: 20000, retries: 2 },
            { id: 'evaluatepharma', name: 'EvaluatePharma', timeout: 15000, retries: 2 },
            { id: 'clinvar', name: 'ClinVar', timeout: 25000, retries: 2 },
            { id: 'hpa', name: 'Human Protein Atlas', timeout: 20000, retries: 2 },
            { id: 'uniprot', name: 'UniProt', timeout: 20000, retries: 2 },
            { id: 'pubmed', name: 'PubMed', timeout: 30000, retries: 2 },
            { id: 'mgi', name: 'Mouse Genome Informatics', timeout: 20000, retries: 2 },
            { id: 'iuphar', name: 'IUPHAR/BPS', timeout: 20000, retries: 2 }
        ];

        // Determine which databases to search
        const databasesToSearch = database && database !== 'all' 
            ? [database].filter(db => availableDatabases.find(adb => adb.id === db))
            : availableDatabases.map(db => db.id);

        if (databasesToSearch.length === 0) {
            return res.status(400).json({
                error: 'Invalid database specified',
                provided: database,
                available_databases: availableDatabases.map(db => db.id),
                request_id: requestId,
                timestamp: new Date().toISOString()
            });
        }

        console.log(`[${requestId}] Searching databases: ${databasesToSearch.join(', ')}`);

        // Execute searches in parallel with enhanced error handling
        const searchPromises = databasesToSearch.map(async (dbId, index) => {
            const dbConfig = availableDatabases.find(db => db.id === dbId);
            const searchStartTime = performance.now();
            
            // Retry mechanism for each database
            for (let attempt = 1; attempt <= (dbConfig?.retries || 2); attempt++) {
                try {
                    const apiUrl = `${baseUrl}/api/search/${dbId}?query=${encodeURIComponent(query)}&limit=${limit}`;
                    console.log(`[${requestId}] Attempt ${attempt} for ${dbId}: ${apiUrl}`);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => {
                        controller.abort();
                        console.log(`[${requestId}] ${dbId} timeout after ${dbConfig?.timeout || 20000}ms`);
                    }, dbConfig?.timeout || 20000);
                    
                    const response = await fetch(apiUrl, {
                        signal: controller.signal,
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'IntelliGRID-CombinedSearch/2.0',
                            'X-Request-ID': requestId
                        }
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    const responseTime = performance.now() - searchStartTime;
                    
                    // Enhanced result validation and processing
                    const validatedResults = (data.results || [])
                        .filter(result => result && typeof result === 'object')
                        .map((result, resultIndex) => {
                            // Ensure all critical fields are populated
                            const processedResult = {
                                ...result,
                                // Generate unique ID if missing
                                id: result.id || `${dbId}-${Date.now()}-${resultIndex}-${Math.random().toString(36).substr(2, 9)}`,
                                // Ensure database is set
                                database: result.database || dbConfig?.name || dbId,
                                // Clean up title
                                title: cleanupField(result.title) || `${dbConfig?.name || dbId} research entry`,
                                // Clean up details
                                details: cleanupField(result.details) || `Research data from ${dbConfig?.name || dbId}`,
                                // Clean up status
                                status: cleanupField(result.status) || 'Available',
                                // Ensure phase is set
                                phase: cleanupField(result.phase) || 'N/A',
                                // Ensure year is valid
                                year: validateYear(result.year) || new Date().getFullYear(),
                                // Clean up sponsor
                                sponsor: cleanupField(result.sponsor) || 'See details',
                                // Clean up enrollment
                                enrollment: cleanupField(result.enrollment) || 'N/A',
                                // Ensure link is valid
                                link: validateLink(result.link) || '#',
                                // Add search metadata
                                search_response_time: responseTime,
                                search_timestamp: new Date().toISOString(),
                                search_request_id: requestId,
                                search_attempt: attempt,
                                data_quality: assessDataQuality(result)
                            };
                            
                            return processedResult;
                        });
                    
                    console.log(`[${requestId}] ${dbId} success: ${validatedResults.length} results in ${Math.round(responseTime)}ms (attempt ${attempt})`);
                    
                    return {
                        database: dbId,
                        database_name: dbConfig?.name || dbId,
                        success: true,
                        results: validatedResults,
                        total: data.total || validatedResults.length,
                        response_time: responseTime,
                        search_timestamp: data.search_timestamp || new Date().toISOString(),
                        attempt: attempt,
                        metadata: {
                            query_processed: data.query || query,
                            filters_applied: data.filters || {},
                            intelligence_summary: data.intelligence_summary || null,
                            data_source: data.data_source || dbId,
                            api_version: data.api_version || '1.0'
                        }
                    };
                    
                } catch (error) {
                    const responseTime = performance.now() - searchStartTime;
                    const isLastAttempt = attempt === (dbConfig?.retries || 2);
                    
                    console.error(`[${requestId}] ${dbId} attempt ${attempt} failed after ${Math.round(responseTime)}ms:`, error.message);
                    
                    if (!isLastAttempt) {
                        // Wait before retrying with exponential backoff
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                        continue;
                    }
                    
                    // Return error result after all retries exhausted
                    return {
                        database: dbId,
                        database_name: dbConfig?.name || dbId,
                        success: false,
                        error: error.message,
                        error_type: error.name || 'UnknownError',
                        response_time: responseTime,
                        results: [],
                        total: 0,
                        attempt: attempt,
                        timeout: dbConfig?.timeout || 20000
                    };
                }
            }
        });

        // Wait for all searches to complete
        const searchResults = await Promise.allSettled(searchPromises);
        
        // Process results and collect comprehensive metrics
        const combinedResults = [];
        const successfulDatabases = [];
        const failedDatabases = [];
        const databaseMetrics = {};
        let totalResults = 0;
        
        searchResults.forEach((promiseResult, index) => {
            const dbId = databasesToSearch[index];
            const dbConfig = availableDatabases.find(db => db.id === dbId);
            
            if (promiseResult.status === 'fulfilled') {
                const result = promiseResult.value;
                
                if (result.success) {
                    combinedResults.push(...result.results);
                    successfulDatabases.push({
                        database: result.database,
                        database_name: result.database_name,
                        results_count: result.results.length,
                        total_available: result.total,
                        response_time: result.response_time,
                        attempts: result.attempt
                    });
                    totalResults += result.total;
                    
                    databaseMetrics[dbId] = {
                        status: 'success',
                        results_count: result.results.length,
                        total_available: result.total,
                        response_time: result.response_time,
                        attempts: result.attempt,
                        metadata: result.metadata
                    };
                } else {
                    failedDatabases.push({
                        database: result.database,
                        database_name: result.database_name,
                        error: result.error,
                        error_type: result.error_type,
                        response_time: result.response_time,
                        attempts: result.attempt,
                        timeout: result.timeout
                    });
                    
                    databaseMetrics[dbId] = {
                        status: 'error',
                        error: result.error,
                        error_type: result.error_type,
                        response_time: result.response_time,
                        attempts: result.attempt,
                        timeout: result.timeout
                    };
                }
            } else {
                failedDatabases.push({
                    database: dbId,
                    database_name: dbConfig?.name || dbId,
                    error: promiseResult.reason?.message || 'Promise rejected',
                    error_type: 'PromiseRejection',
                    response_time: null,
                    attempts: 0
                });
                
                databaseMetrics[dbId] = {
                    status: 'error',
                    error: promiseResult.reason?.message || 'Promise rejected',
                    error_type: 'PromiseRejection'
                };
            }
        });

        // Enhanced result processing
        const uniqueResults = removeDuplicateResults(combinedResults);
        const enhancedResults = enhanceResultsWithMetadata(uniqueResults, query, requestId);
        
        // Sort results by quality and relevance
        const sortedResults = enhancedResults.sort((a, b) => {
            // Primary sort: data quality
            const qualityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            const qualityDiff = (qualityOrder[b.data_quality] || 0) - (qualityOrder[a.data_quality] || 0);
            if (qualityDiff !== 0) return qualityDiff;
            
            // Secondary sort: response time (faster first)
            return (a.search_response_time || Infinity) - (b.search_response_time || Infinity);
        });

        const endTime = performance.now();
        const totalSearchTime = endTime - startTime;

        // Prepare comprehensive response
        const response = {
            // Core results
            results: sortedResults,
            total: totalResults,
            unique_results: uniqueResults.length,
            filtered_results: sortedResults.length,
            
            // Search metadata
            query: query,
            databases_searched: databasesToSearch,
            successful_databases: successfulDatabases,
            failed_databases: failedDatabases,
            database_metrics: databaseMetrics,
            
            // Request tracking
            request_id: requestId,
            search_timestamp: new Date().toISOString(),
            total_search_time: Math.round(totalSearchTime),
            
            // Performance metrics
            performance: {
                fastest_database: getExtremeDatabaseMetric(databaseMetrics, 'response_time', 'min'),
                slowest_database: getExtremeDatabaseMetric(databaseMetrics, 'response_time', 'max'),
                average_response_time: calculateAverageResponseTime(databaseMetrics),
                success_rate: calculateSuccessRate(successfulDatabases.length, databasesToSearch.length),
                total_api_calls: databasesToSearch.reduce((sum, dbId) => 
                    sum + (databaseMetrics[dbId]?.attempts || 0), 0)
            },
            
            // Summary statistics
            summary: {
                total_databases_searched: databasesToSearch.length,
                successful_databases_count: successfulDatabases.length,
                failed_databases_count: failedDatabases.length,
                high_quality_results: sortedResults.filter(r => r.data_quality === 'high').length,
                medium_quality_results: sortedResults.filter(r => r.data_quality === 'medium').length,
                low_quality_results: sortedResults.filter(r => r.data_quality === 'low').length,
                avg_completeness_score: calculateAverageCompleteness(sortedResults)
            },
            
            // Health status
            system_health: {
                overall_status: failedDatabases.length === 0 ? 'healthy' : 
                               successfulDatabases.length === 0 ? 'critical' : 'degraded',
                online_databases: successfulDatabases.length,
                offline_databases: failedDatabases.length,
                system_load: categorizeSystemLoad(totalSearchTime),
                data_quality_score: calculateDataQualityScore(sortedResults)
            }
        };

        // Log comprehensive search summary
        console.log(`[${requestId}] Search completed: ${uniqueResults.length} unique results from ${totalResults} total across ${successfulDatabases.length}/${databasesToSearch.length} databases in ${Math.round(totalSearchTime)}ms`);
        
        if (failedDatabases.length > 0) {
            console.warn(`[${requestId}] Failed databases: ${failedDatabases.map(f => f.database).join(', ')}`);
        }

        // Set appropriate status code based on results
        let statusCode = 200;
        if (failedDatabases.length === databasesToSearch.length) {
            statusCode = 503; // Service Unavailable - all databases failed
        } else if (failedDatabases.length > 0) {
            statusCode = 206; // Partial Content - some databases failed
        }

        return res.status(statusCode).json(response);

    } catch (error) {
        const endTime = performance.now();
        const totalSearchTime = endTime - startTime;
        
        console.error(`[${requestId}] Critical search failure after ${Math.round(totalSearchTime)}ms:`, error);
        
        return res.status(500).json({ 
            error: 'Internal server error during combined search',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            request_id: requestId,
            timestamp: new Date().toISOString(),
            total_search_time: Math.round(totalSearchTime),
            results: [],
            total: 0,
            query: req.query.query || null,
            system_health: {
                overall_status: 'critical',
                error_type: error.name || 'UnknownError'
            }
        });
    }
}

/**
 * Helper function to clean up text fields
 */
function cleanupField(value) {
    if (!value || value === 'null' || value === 'undefined') return null;
    if (typeof value !== 'string') return value;
    
    const cleaned = value.trim();
    if (cleaned === '' || cleaned.toLowerCase() === 'n/a' || cleaned.toLowerCase() === 'unknown') {
        return null;
    }
    return cleaned;
}

/**
 * Helper function to validate year values
 */
function validateYear(year) {
    const currentYear = new Date().getFullYear();
    const numYear = parseInt(year);
    
    if (isNaN(numYear) || numYear < 1900 || numYear > currentYear + 10) {
        return null;
    }
    return numYear;
}

/**
 * Helper function to validate link URLs
 */
function validateLink(link) {
    if (!link || typeof link !== 'string') return null;
    
    const cleaned = link.trim();
    if (cleaned === '' || cleaned === '#' || !cleaned.includes('http')) {
        return null;
    }
    return cleaned;
}

/**
 * Assess the quality of result data
 */
function assessDataQuality(result) {
    let score = 0;
    
    // Check for meaningful data presence
    if (result.title && result.title !== 'N/A' && result.title.length > 5) score += 3;
    if (result.details && result.details !== 'N/A' && result.details.length > 10) score += 3;
    if (result.link && result.link !== '#' && result.link.includes('http')) score += 2;
    if (result.status && result.status !== 'N/A' && result.status !== 'Unknown') score += 2;
    if (result.phase && result.phase !== 'N/A') score += 1;
    if (result.year && result.year > 1990) score += 1;
    if (result.sponsor && result.sponsor !== 'N/A' && result.sponsor !== 'Unknown') score += 1;
    
    // Database-specific quality indicators
    if (result.clinical_trials_count > 0) score += 2;
    if (result.market_value) score += 2;
    if (result.pubmed_id || result.pmid) score += 1;
    if (result.raw_data && Object.keys(result.raw_data).length > 3) score += 1;
    
    return score >= 8 ? 'high' : score >= 5 ? 'medium' : 'low';
}

/**
 * Remove duplicate results based on enhanced similarity analysis
 */
function removeDuplicateResults(results) {
    const seen = new Map();
    const unique = [];
    
    results.forEach(result => {
        // Create enhanced similarity key
        const titleWords = (result.title || '').toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2)
            .slice(0, 5)
            .sort()
            .join(' ');
            
        const key = `${titleWords}-${result.database}-${result.year}`;
        
        if (!seen.has(key)) {
            seen.set(key, true);
            unique.push(result);
        }
    });
    
    return unique;
}

/**
 * Enhance results with cross-database metadata
 */
function enhanceResultsWithMetadata(results, query, requestId) {
    return results.map(result => ({
        ...result,
        // Add cross-database relevance scoring
        cross_db_relevance: calculateCrossDbRelevance(result, query, results),
        // Add completeness scoring
        data_completeness: calculateDataCompleteness(result),
        // Add search context
        search_context: {
            query_match_score: calculateQueryMatchScore(result, query),
            database_confidence: getDatabaseConfidence(result.database),
            data_freshness: calculateDataFreshness(result),
            link_validity: result.link && result.link !== '#' ? 'valid' : 'invalid'
        },
        // Add request tracking
        search_request_id: requestId
    }));
}

/**
 * Calculate relevance across databases
 */
function calculateCrossDbRelevance(result, query, allResults) {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    let relevanceScore = 0;
    
    // Check query term matches with weights
    queryTerms.forEach(term => {
        if (result.title?.toLowerCase().includes(term)) relevanceScore += 3;
        if (result.details?.toLowerCase().includes(term)) relevanceScore += 2;
        if (result.sponsor?.toLowerCase().includes(term)) relevanceScore += 1;
        if (result.type?.toLowerCase().includes(term)) relevanceScore += 1;
    });
    
    // Bonus for high-value databases
    const premiumDatabases = ['EvaluatePharma', 'ClinicalTrials.gov', 'ChEMBL', 'Open Targets'];
    if (premiumDatabases.includes(result.database)) {
        relevanceScore += 2;
    }
    
    // Bonus for recent data
    if (result.year && result.year >= new Date().getFullYear() - 2) {
        relevanceScore += 1;
    }
    
    return Math.min(relevanceScore, 10); // Cap at 10
}

/**
 * Calculate data completeness percentage
 */
function calculateDataCompleteness(result) {
    const criticalFields = ['title', 'details', 'status', 'database', 'link'];
    const optionalFields = ['phase', 'sponsor', 'year', 'enrollment', 'type'];
    
    let completenessScore = 0;
    const totalPossibleScore = criticalFields.length * 2 + optionalFields.length;
    
    criticalFields.forEach(field => {
        if (result[field] && result[field] !== 'N/A' && result[field] !== 'Unknown' && result[field] !== '#') {
            completenessScore += 2; // Critical fields worth more
        }
    });
    
    optionalFields.forEach(field => {
        if (result[field] && result[field] !== 'N/A' && result[field] !== 'Unknown') {
            completenessScore += 1;
        }
    });
    
    return Math.round((completenessScore / totalPossibleScore) * 100);
}

/**
 * Calculate query match score
 */
function calculateQueryMatchScore(result, query) {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    if (result.title?.toLowerCase().includes(queryLower)) score += 5;
    if (result.details?.toLowerCase().includes(queryLower)) score += 3;
    if (result.sponsor?.toLowerCase().includes(queryLower)) score += 1;
    if (result.type?.toLowerCase().includes(queryLower)) score += 1;
    
    return Math.min(score, 10);
}

/**
 * Get database confidence rating
 */
function getDatabaseConfidence(database) {
    const confidenceRatings = {
        'ClinicalTrials.gov': 'very-high',
        'Open Targets': 'high',
        'ChEMBL': 'high',
        'DrugBank': 'high',
        'EvaluatePharma': 'high',
        'PubMed': 'very-high',
        'ClinVar': 'high',
        'UniProt': 'high',
        'Human Protein Atlas': 'medium',
        'Mouse Genome Informatics': 'medium',
        'IUPHAR/BPS': 'medium'
    };
    
    return confidenceRatings[database] || 'low';
}

/**
 * Calculate data freshness score
 */
function calculateDataFreshness(result) {
    if (!result.year) return 'unknown';
    
    const currentYear = new Date().getFullYear();
    const age = currentYear - result.year;
    
    if (age <= 1) return 'very-fresh';
    if (age <= 3) return 'fresh';
    if (age <= 5) return 'moderate';
    if (age <= 10) return 'aged';
    return 'old';
}

/**
 * Get extreme database metric (min/max)
 */
function getExtremeDatabaseMetric(metrics, field, type) {
    const validMetrics = Object.entries(metrics)
        .filter(([_, metric]) => metric.status === 'success' && metric[field] != null)
        .map(([db, metric]) => ({ database: db, value: metric[field] }));
    
    if (validMetrics.length === 0) return null;
    
    const sortedMetrics = validMetrics.sort((a, b) => 
        type === 'min' ? a.value - b.value : b.value - a.value
    );
    
    return sortedMetrics[0];
}

/**
 * Calculate average response time
 */
function calculateAverageResponseTime(metrics) {
    const validResponseTimes = Object.values(metrics)
        .filter(metric => metric.status === 'success' && metric.response_time != null)
        .map(metric => metric.response_time);
    
    if (validResponseTimes.length === 0) return null;
    
    return Math.round(validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length);
}

/**
 * Calculate success rate percentage
 */
function calculateSuccessRate(successful, total) {
    if (total === 0) return 0;
    return Math.round((successful / total) * 100);
}

/**
 * Calculate average completeness score
 */
function calculateAverageCompleteness(results) {
    if (results.length === 0) return 0;
    
    const total = results.reduce((sum, result) => sum + (result.data_completeness || 0), 0);
    return Math.round(total / results.length);
}

/**
 * Categorize system load based on search time
 */
function categorizeSystemLoad(searchTime) {
    if (searchTime < 5000) return 'low';
    if (searchTime < 15000) return 'medium';
    if (searchTime < 30000) return 'high';
    return 'critical';
}

/**
 * Calculate overall data quality score
 */
function calculateDataQualityScore(results) {
    if (results.length === 0) return 0;
    
    const qualityScores = { 'high': 3, 'medium': 2, 'low': 1 };
    const totalScore = results.reduce((sum, result) => 
        sum + (qualityScores[result.data_quality] || 0), 0);
    
    return Math.round((totalScore / (results.length * 3)) * 100);
}