// api/health.js - System health check endpoint
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    const startTime = performance.now();
    const healthCheckId = `health_${Date.now()}`;

    try {
        // Determine base URL
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const baseUrl = host?.includes('localhost') 
            ? 'http://localhost:3000' 
            : `${protocol}://${host}`;

        // Define databases to check
        const databases = [
            { id: 'clinicaltrials', name: 'ClinicalTrials.gov', priority: 'high' },
            { id: 'opentargets', name: 'Open Targets', priority: 'high' },
            { id: 'chembl', name: 'ChEMBL', priority: 'medium' },
            { id: 'drugbank', name: 'DrugBank', priority: 'medium' },
            { id: 'evaluatepharma', name: 'EvaluatePharma', priority: 'low' },
            { id: 'clinvar', name: 'ClinVar', priority: 'medium' },
            { id: 'hpa', name: 'Human Protein Atlas', priority: 'low' },
            { id: 'uniprot', name: 'UniProt', priority: 'medium' },
            { id: 'pubmed', name: 'PubMed', priority: 'high' },
            { id: 'mgi', name: 'Mouse Genome Informatics', priority: 'low' },
            { id: 'iuphar', name: 'IUPHAR/BPS', priority: 'low' }
        ];

        console.log(`[${healthCheckId}] Starting health check for ${databases.length} databases`);

        // Check each database with lightweight queries
        const healthChecks = await Promise.allSettled(
            databases.map(async (db) => {
                const checkStartTime = performance.now();
                
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
                    
                    const response = await fetch(
                        `${baseUrl}/api/search/${db.id}?query=test&limit=1`,
                        {
                            signal: controller.signal,
                            headers: {
                                'Accept': 'application/json',
                                'X-Health-Check': healthCheckId
                            }
                        }
                    );
                    
                    clearTimeout(timeoutId);
                    const responseTime = performance.now() - checkStartTime;
                    
                    // Consider the database healthy if it responds (even with errors)
                    const isHealthy = response.status < 500;
                    
                    let responseData = null;
                    try {
                        responseData = await response.json();
                    } catch (jsonError) {
                        // Response might not be JSON, that's ok for health check
                    }
                    
                    return {
                        database: db.id,
                        name: db.name,
                        priority: db.priority,
                        status: isHealthy ? 'healthy' : 'unhealthy',
                        response_time: Math.round(responseTime),
                        http_status: response.status,
                        has_results: responseData?.results?.length > 0 || false,
                        error: isHealthy ? null : `HTTP ${response.status}`,
                        last_checked: new Date().toISOString()
                    };
                    
                } catch (error) {
                    const responseTime = performance.now() - checkStartTime;
                    
                    return {
                        database: db.id,
                        name: db.name,
                        priority: db.priority,
                        status: 'unhealthy',
                        response_time: Math.round(responseTime),
                        http_status: null,
                        has_results: false,
                        error: error.name === 'AbortError' ? 'Timeout' : error.message,
                        last_checked: new Date().toISOString()
                    };
                }
            })
        );

        // Process health check results
        const results = healthChecks.map(result => 
            result.status === 'fulfilled' ? result.value : {
                database: 'unknown',
                name: 'Unknown',
                priority: 'unknown',
                status: 'error',
                response_time: null,
                error: result.reason?.message || 'Health check failed',
                last_checked: new Date().toISOString()
            }
        );

        // Calculate overall system health
        const healthyDatabases = results.filter(r => r.status === 'healthy');
        const unhealthyDatabases = results.filter(r => r.status === 'unhealthy');
        const highPriorityDatabases = results.filter(r => r.priority === 'high');
        const healthyHighPriority = highPriorityDatabases.filter(r => r.status === 'healthy');
        
        // Determine overall status
        let overallStatus = 'healthy';
        let statusMessage = 'All systems operational';
        
        if (healthyHighPriority.length < highPriorityDatabases.length) {
            overallStatus = 'degraded';
            statusMessage = 'Some high-priority databases are experiencing issues';
        } else if (unhealthyDatabases.length > databases.length / 2) {
            overallStatus = 'degraded';
            statusMessage = 'Multiple databases are experiencing issues';
        } else if (unhealthyDatabases.length > 0) {
            overallStatus = 'warning';
            statusMessage = 'Some databases are experiencing issues';
        }
        
        if (healthyDatabases.length === 0) {
            overallStatus = 'critical';
            statusMessage = 'All databases are unavailable';
        }

        const endTime = performance.now();
        const totalCheckTime = endTime - startTime;

        // Calculate performance metrics
        const avgResponseTime = results
            .filter(r => r.response_time !== null)
            .reduce((sum, r) => sum + r.response_time, 0) / 
            results.filter(r => r.response_time !== null).length || 0;

        const fastestDatabase = results
            .filter(r => r.response_time !== null && r.status === 'healthy')
            .sort((a, b) => a.response_time - b.response_time)[0];

        const slowestDatabase = results
            .filter(r => r.response_time !== null && r.status === 'healthy')
            .sort((a, b) => b.response_time - a.response_time)[0];

        // Prepare comprehensive response
        const healthResponse = {
            // Overall system status
            status: overallStatus,
            message: statusMessage,
            timestamp: new Date().toISOString(),
            check_id: healthCheckId,
            total_check_time: Math.round(totalCheckTime),
            
            // Database statuses
            databases: results,
            
            // Summary statistics
            summary: {
                total_databases: databases.length,
                healthy_databases: healthyDatabases.length,
                unhealthy_databases: unhealthyDatabases.length,
                health_percentage: Math.round((healthyDatabases.length / databases.length) * 100),
                high_priority_health: Math.round((healthyHighPriority.length / highPriorityDatabases.length) * 100)
            },
            
            // Performance metrics
            performance: {
                average_response_time: Math.round(avgResponseTime),
                fastest_database: fastestDatabase ? {
                    name: fastestDatabase.name,
                    response_time: fastestDatabase.response_time
                } : null,
                slowest_database: slowestDatabase ? {
                    name: slowestDatabase.name,
                    response_time: slowestDatabase.response_time
                } : null,
                system_load: totalCheckTime < 2000 ? 'low' : 
                            totalCheckTime < 5000 ? 'medium' : 'high'
            },
            
            // Categorized results
            by_priority: {
                high: results.filter(r => r.priority === 'high'),
                medium: results.filter(r => r.priority === 'medium'),
                low: results.filter(r => r.priority === 'low')
            },
            
            by_status: {
                healthy: healthyDatabases,
                unhealthy: unhealthyDatabases
            },
            
            // System information
            system: {
                environment: process.env.NODE_ENV || 'development',
                version: '2.0.0',
                uptime: process.uptime ? Math.round(process.uptime()) : null,
                memory_usage: process.memoryUsage ? process.memoryUsage() : null,
                base_url: baseUrl
            }
        };

        console.log(`[${healthCheckId}] Health check completed: ${healthyDatabases.length}/${databases.length} healthy in ${Math.round(totalCheckTime)}ms`);

        // Set appropriate HTTP status
        let httpStatus = 200;
        if (overallStatus === 'critical') httpStatus = 503;
        else if (overallStatus === 'degraded') httpStatus = 206;
        else if (overallStatus === 'warning') httpStatus = 200;

        return res.status(httpStatus).json(healthResponse);

    } catch (error) {
        const endTime = performance.now();
        const totalCheckTime = endTime - startTime;
        
        console.error(`[${healthCheckId}] Health check failed after ${Math.round(totalCheckTime)}ms:`, error);
        
        return res.status(500).json({
            status: 'critical',
            message: 'Health check system failure',
            timestamp: new Date().toISOString(),
            check_id: healthCheckId,
            total_check_time: Math.round(totalCheckTime),
            error: error.message,
            databases: [],
            summary: {
                total_databases: 0,
                healthy_databases: 0,
                unhealthy_databases: 0,
                health_percentage: 0
            },
            system: {
                environment: process.env.NODE_ENV || 'development',
                version: '2.0.0',
                error_type: error.name
            }
        });
    }
}