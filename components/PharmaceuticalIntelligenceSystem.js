// components/PharmaceuticalIntelligenceSystem.js - Enhanced with robust error handling and logging
import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Enhanced Pharmaceutical Intelligence System with comprehensive error handling and logging
 */
const PharmaceuticalIntelligenceSystem = () => {
    // Core state management
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalResults, setTotalResults] = useState(0);
    const [searchTimestamp, setSearchTimestamp] = useState(null);
    
    // Database selection state
    const [selectedDatabases, setSelectedDatabases] = useState([
        'clinicaltrials', 'opentargets', 'chembl', 'drugbank', 'evaluatepharma'
    ]);
    
    // Enhanced logging and status tracking
    const [searchLogs, setSearchLogs] = useState([]);
    const [apiStatus, setApiStatus] = useState({});
    const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0 });
    
    // Filtering and sorting state
    const [filters, setFilters] = useState({
        database: 'all',
        phase: 'all',
        status: 'all',
        year: 'all',
        type: 'all'
    });
    
    const [sortConfig, setSortConfig] = useState({
        key: 'year',
        direction: 'desc'
    });
    
    const [searchWithinResults, setSearchWithinResults] = useState('');
    const [showFilters, setShowFilters] = useState(true);
    const [showVisualization, setShowVisualization] = useState(true);
    const [bookmarkedItems, setBookmarkedItems] = useState(new Set());
    const [showLogs, setShowLogs] = useState(false);
    
    // Available databases configuration with enhanced status tracking
    const databases = [
        { id: 'clinicaltrials', name: 'ClinicalTrials.gov', icon: '🏥', color: '#2563eb', timeout: 30000 },
        { id: 'opentargets', name: 'Open Targets', icon: '🎯', color: '#dc2626', timeout: 25000 },
        { id: 'chembl', name: 'ChEMBL', icon: '🧪', color: '#7c3aed', timeout: 20000 },
        { id: 'drugbank', name: 'DrugBank', icon: '💊', color: '#059669', timeout: 20000 },
        { id: 'evaluatepharma', name: 'EvaluatePharma', icon: '📊', color: '#ea580c', timeout: 15000 },
        { id: 'clinvar', name: 'ClinVar', icon: '🧬', color: '#be185d', timeout: 25000 },
        { id: 'hpa', name: 'Human Protein Atlas', icon: '🔬', color: '#0891b2', timeout: 20000 },
        { id: 'uniprot', name: 'UniProt', icon: '🧠', color: '#7c2d12', timeout: 20000 },
        { id: 'pubmed', name: 'PubMed', icon: '📚', color: '#374151', timeout: 30000 },
        { id: 'mgi', name: 'Mouse Genome', icon: '🐭', color: '#6366f1', timeout: 20000 },
        { id: 'iuphar', name: 'IUPHAR/BPS', icon: '⚗️', color: '#c2410c', timeout: 20000 }
    ];

    /**
     * Enhanced logging system
     */
    const addLog = useCallback((level, message, data = null) => {
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            level, // 'info', 'warn', 'error', 'success'
            message,
            data,
            query: searchQuery
        };
        
        setSearchLogs(prev => [logEntry, ...prev.slice(0, 99)]); // Keep last 100 logs
        
        // Console logging for debugging
        const logMethod = console[level] || console.log;
        logMethod(`[IntelliGRID] ${message}`, data || '');
        
        return logEntry;
    }, [searchQuery]);

    /**
     * Enhanced API status checker
     */
    const checkApiStatus = useCallback(async (database) => {
        try {
            const dbConfig = databases.find(db => db.id === database);
            const baseUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:3000' 
                : `https://${window.location.hostname}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second health check
            
            const response = await fetch(
                `${baseUrl}/api/search/${database}?query=test&limit=1`,
                { 
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' }
                }
            );
            
            clearTimeout(timeoutId);
            
            const status = {
                online: response.ok,
                responseTime: performance.now(),
                lastChecked: new Date().toISOString(),
                error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
            };
            
            setApiStatus(prev => ({ ...prev, [database]: status }));
            return status;
            
        } catch (error) {
            const status = {
                online: false,
                responseTime: null,
                lastChecked: new Date().toISOString(),
                error: error.name === 'AbortError' ? 'Timeout' : error.message
            };
            
            setApiStatus(prev => ({ ...prev, [database]: status }));
            return status;
        }
    }, []);

    /**
     * Enhanced search execution with comprehensive error handling
     */
    const executeSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setError('Please enter a search query');
            addLog('warn', 'Empty search query attempted');
            return;
        }

        if (selectedDatabases.length === 0) {
            setError('Please select at least one database');
            addLog('warn', 'No databases selected');
            return;
        }

        setLoading(true);
        setError(null);
        setResults([]);
        setTotalResults(0);
        setSearchProgress({ current: 0, total: selectedDatabases.length });

        const searchStartTime = performance.now();
        addLog('info', `Starting search for "${searchQuery}" across ${selectedDatabases.length} databases`, {
            query: searchQuery,
            databases: selectedDatabases
        });

        try {
            const baseUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:3000' 
                : `https://${window.location.hostname}`;

            // Execute searches with enhanced error handling
            const searchPromises = selectedDatabases.map(async (database, index) => {
                const dbConfig = databases.find(db => db.id === database);
                const startTime = performance.now();
                
                try {
                    addLog('info', `Starting search for ${database}...`);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => {
                        controller.abort();
                        addLog('warn', `${database} search timed out after ${dbConfig?.timeout || 20000}ms`);
                    }, dbConfig?.timeout || 20000);
                    
                    const response = await fetch(
                        `${baseUrl}/api/search/${database}?query=${encodeURIComponent(searchQuery)}&limit=50`,
                        { 
                            signal: controller.signal,
                            headers: {
                                'Accept': 'application/json',
                                'User-Agent': 'IntelliGRID/2.0'
                            }
                        }
                    );
                    
                    clearTimeout(timeoutId);
                    const responseTime = performance.now() - startTime;
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    
                    // Enhanced result validation
                    const validResults = (data.results || [])
                        .filter(result => result && typeof result === 'object')
                        .map(result => ({
                            ...result,
                            // Ensure no null/undefined values in critical fields
                            id: result.id || `${database}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            title: result.title || `${database} entry`,
                            details: result.details || `Research data from ${database}`,
                            status: result.status || 'Available',
                            phase: result.phase || 'N/A',
                            year: result.year || new Date().getFullYear(),
                            sponsor: result.sponsor || 'See details',
                            enrollment: result.enrollment || 'N/A',
                            link: result.link || '#',
                            database: result.database || database,
                            // Add metadata
                            search_query: searchQuery,
                            search_database: database,
                            search_response_time: responseTime,
                            result_quality: assessResultQuality(result),
                            retrieved_at: new Date().toISOString()
                        }));
                    
                    setSearchProgress(prev => ({ ...prev, current: prev.current + 1 }));
                    
                    addLog('success', `${database} completed: ${validResults.length} results in ${Math.round(responseTime)}ms`, {
                        database,
                        resultCount: validResults.length,
                        responseTime: Math.round(responseTime),
                        totalAvailable: data.total || validResults.length
                    });
                    
                    return { 
                        database, 
                        results: validResults, 
                        total: data.total || validResults.length,
                        responseTime,
                        success: true,
                        metadata: data.metadata || {}
                    };
                    
                } catch (error) {
                    const responseTime = performance.now() - startTime;
                    setSearchProgress(prev => ({ ...prev, current: prev.current + 1 }));
                    
                    const errorMessage = error.name === 'AbortError' ? 'Request timeout' : error.message;
                    
                    addLog('error', `${database} failed: ${errorMessage}`, {
                        database,
                        error: errorMessage,
                        responseTime: Math.round(responseTime)
                    });
                    
                    return { 
                        database, 
                        results: [], 
                        total: 0, 
                        responseTime,
                        success: false,
                        error: errorMessage 
                    };
                }
            });

            const searchResults = await Promise.allSettled(searchPromises);
            
            // Process and combine results
            let combinedResults = [];
            let combinedTotal = 0;
            const successfulDatabases = [];
            const failedDatabases = [];

            searchResults.forEach((promiseResult, index) => {
                const database = selectedDatabases[index];
                
                if (promiseResult.status === 'fulfilled') {
                    const result = promiseResult.value;
                    
                    if (result.success && result.results.length > 0) {
                        combinedResults.push(...result.results);
                        combinedTotal += result.total;
                        successfulDatabases.push({
                            database: result.database,
                            resultCount: result.results.length,
                            responseTime: result.responseTime
                        });
                    } else if (!result.success) {
                        failedDatabases.push({
                            database: result.database,
                            error: result.error,
                            responseTime: result.responseTime
                        });
                    } else {
                        // Database succeeded but returned no results
                        successfulDatabases.push({
                            database: result.database,
                            resultCount: 0,
                            responseTime: result.responseTime
                        });
                    }
                } else {
                    failedDatabases.push({
                        database: database,
                        error: promiseResult.reason?.message || 'Promise rejected',
                        responseTime: null
                    });
                }
            });

            // Enhanced result processing
            const uniqueResults = removeDuplicates(combinedResults);
            const enhancedResults = enhanceResults(uniqueResults);
            
            const searchEndTime = performance.now();
            const totalSearchTime = searchEndTime - searchStartTime;
            
            setResults(enhancedResults);
            setTotalResults(combinedTotal);
            setSearchTimestamp(new Date().toISOString());
            
            // Comprehensive success/failure reporting
            if (enhancedResults.length === 0) {
                if (failedDatabases.length === selectedDatabases.length) {
                    setError('All selected databases failed to respond. Please check your connection and try again.');
                    addLog('error', 'Complete search failure - all databases failed', {
                        failedDatabases,
                        totalSearchTime: Math.round(totalSearchTime)
                    });
                } else {
                    setError('No results found. Try different keywords or select additional databases.');
                    addLog('warn', 'Search completed but no results found', {
                        successfulDatabases,
                        failedDatabases,
                        totalSearchTime: Math.round(totalSearchTime)
                    });
                }
            } else {
                let message = `Search completed: ${enhancedResults.length} unique results`;
                if (failedDatabases.length > 0) {
                    message += ` (${failedDatabases.length} database${failedDatabases.length > 1 ? 's' : ''} had issues)`;
                    setError(`Warning: ${failedDatabases.map(f => f.database).join(', ')} ${failedDatabases.length > 1 ? 'databases' : 'database'} encountered issues. Results may be incomplete.`);
                }
                
                addLog('success', message, {
                    uniqueResults: enhancedResults.length,
                    totalResults: combinedTotal,
                    successfulDatabases,
                    failedDatabases,
                    totalSearchTime: Math.round(totalSearchTime)
                });
            }

        } catch (error) {
            const searchEndTime = performance.now();
            const totalSearchTime = searchEndTime - searchStartTime;
            
            addLog('error', 'Critical search failure', {
                error: error.message,
                totalSearchTime: Math.round(totalSearchTime)
            });
            
            setError(`Search failed: ${error.message}. Please try again.`);
        } finally {
            setLoading(false);
            setSearchProgress({ current: 0, total: 0 });
        }
    }, [searchQuery, selectedDatabases, addLog]);

    /**
     * Enhanced result quality assessment
     */
    const assessResultQuality = (result) => {
        let score = 0;
        
        // Critical fields
        if (result.title && result.title !== 'N/A' && result.title.length > 5) score += 3;
        if (result.details && result.details !== 'N/A' && result.details.length > 10) score += 3;
        if (result.link && result.link !== '#' && result.link.includes('http')) score += 2;
        
        // Important fields
        if (result.phase && result.phase !== 'N/A') score += 2;
        if (result.status && result.status !== 'N/A' && result.status !== 'Unknown') score += 2;
        if (result.year && result.year > 1990) score += 1;
        if (result.sponsor && result.sponsor !== 'N/A' && result.sponsor !== 'Unknown') score += 1;
        
        // Additional quality indicators
        if (result.clinical_trials_count > 0) score += 2;
        if (result.raw_data && Object.keys(result.raw_data).length > 3) score += 1;
        if (result.enrollment && result.enrollment !== 'N/A') score += 1;
        
        return score >= 8 ? 'high' : score >= 5 ? 'medium' : 'low';
    };

    /**
     * Enhanced duplicate removal
     */
    const removeDuplicates = (results) => {
        const seen = new Map();
        const unique = [];
        
        results.forEach(result => {
            // Create composite key for better duplicate detection
            const titleKey = (result.title || '').toLowerCase().replace(/[^\w\s]/g, '').slice(0, 50);
            const key = `${titleKey}-${result.database}-${result.year}`;
            
            if (!seen.has(key)) {
                seen.set(key, true);
                unique.push(result);
            }
        });
        
        return unique;
    };

    /**
     * Enhanced result processing
     */
    const enhanceResults = (results) => {
        return results.map(result => ({
            ...result,
            relevance_score: calculateRelevance(result),
            completeness_score: calculateCompleteness(result),
            display_title: formatDisplayTitle(result),
            display_details: formatDisplayDetails(result),
            display_status: formatDisplayStatus(result)
        }));
    };

    const calculateRelevance = (result) => {
        const queryLower = searchQuery.toLowerCase();
        let score = 0;
        
        if (result.title?.toLowerCase().includes(queryLower)) score += 3;
        if (result.details?.toLowerCase().includes(queryLower)) score += 2;
        if (result.status?.toLowerCase().includes(queryLower)) score += 1;
        if (result.sponsor?.toLowerCase().includes(queryLower)) score += 1;
        if (result.type?.toLowerCase().includes(queryLower)) score += 1;
        
        return score;
    };

    const calculateCompleteness = (result) => {
        const fields = ['title', 'details', 'status', 'phase', 'sponsor', 'year', 'link'];
        const filledFields = fields.filter(field => 
            result[field] && result[field] !== 'N/A' && result[field] !== 'Unknown' && result[field] !== '#'
        );
        return Math.round((filledFields.length / fields.length) * 100);
    };

    const formatDisplayTitle = (result) => {
        let title = result.title || 'Research Entry';
        
        // Clean up title
        title = title.replace(/^(N\/A|Unknown|null|undefined)$/i, `${result.database} Entry`);
        
        // Truncate if too long
        if (title.length > 80) {
            title = title.substring(0, 77) + '...';
        }
        
        return title;
    };

    const formatDisplayDetails = (result) => {
        let details = result.details || '';
        
        // If details are empty or N/A, construct from available data
        if (!details || details === 'N/A' || details.length < 10) {
            const parts = [];
            
            if (result.database) parts.push(`Source: ${result.database}`);
            if (result.type && result.type !== 'N/A') parts.push(`Type: ${result.type}`);
            if (result.year && result.year > 1990) parts.push(`Year: ${result.year}`);
            if (result.phase && result.phase !== 'N/A') parts.push(`Phase: ${result.phase}`);
            
            details = parts.length > 0 ? parts.join(' | ') : 'Research data available';
        }
        
        return details;
    };

    const formatDisplayStatus = (result) => {
        let status = result.status || 'Available';
        
        // Map common N/A values to meaningful statuses
        if (status === 'N/A' || status === 'Unknown' || status === '') {
            const statusMap = {
                'ClinicalTrials.gov': 'Clinical Study',
                'ChEMBL': 'Bioactive Compound',
                'DrugBank': 'Drug Information',
                'EvaluatePharma': 'Market Data',
                'PubMed': 'Published Research',
                'Open Targets': 'Target Data',
                'ClinVar': 'Genetic Variant',
                'Human Protein Atlas': 'Protein Expression',
                'UniProt': 'Protein Data',
                'Mouse Genome Informatics': 'Mouse Model',
                'IUPHAR/BPS': 'Pharmacology Data'
            };
            status = statusMap[result.database] || 'Research Available';
        }
        
        return status;
    };

    /**
     * Process filtered and sorted results
     */
    const processedResults = useMemo(() => {
        let filtered = [...results];

        // Apply filters
        if (filters.database !== 'all') {
            filtered = filtered.filter(result => result.database === filters.database);
        }

        if (filters.phase !== 'all') {
            filtered = filtered.filter(result => 
                result.phase?.toLowerCase().includes(filters.phase.toLowerCase())
            );
        }

        if (filters.status !== 'all') {
            filtered = filtered.filter(result => 
                result.display_status?.toLowerCase().includes(filters.status.toLowerCase())
            );
        }

        if (filters.year !== 'all') {
            const yearFilter = parseInt(filters.year);
            filtered = filtered.filter(result => {
                const resultYear = parseInt(result.year);
                return resultYear >= yearFilter;
            });
        }

        if (filters.type !== 'all') {
            filtered = filtered.filter(result => 
                result.type?.toLowerCase().includes(filters.type.toLowerCase())
            );
        }

        // Apply search within results
        if (searchWithinResults.trim()) {
            const searchTerm = searchWithinResults.toLowerCase();
            filtered = filtered.filter(result =>
                result.display_title?.toLowerCase().includes(searchTerm) ||
                result.display_details?.toLowerCase().includes(searchTerm) ||
                result.sponsor?.toLowerCase().includes(searchTerm)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Special handling for different data types
            if (sortConfig.key === 'year') {
                aValue = parseInt(aValue) || 0;
                bValue = parseInt(bValue) || 0;
            } else if (sortConfig.key === 'relevance_score' || sortConfig.key === 'completeness_score') {
                aValue = aValue || 0;
                bValue = bValue || 0;
            } else {
                aValue = String(aValue || '').toLowerCase();
                bValue = String(bValue || '').toLowerCase();
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return filtered;
    }, [results, filters, sortConfig, searchWithinResults]);

    /**
     * Get filter options from current results
     */
    const filterOptions = useMemo(() => {
        return {
            databases: [...new Set(results.map(r => r.database))].sort(),
            phases: [...new Set(results.map(r => r.phase).filter(p => p && p !== 'N/A'))].sort(),
            statuses: [...new Set(results.map(r => r.display_status).filter(s => s && s !== 'N/A'))].sort(),
            types: [...new Set(results.map(r => r.type).filter(t => t && t !== 'N/A'))].sort(),
            years: [...new Set(results.map(r => r.year).filter(y => y && y > 1990))].sort((a, b) => b - a)
        };
    }, [results]);

    /**
     * Generate visualization data
     */
    const visualizationData = useMemo(() => {
        if (!results.length) return null;

        const databaseCounts = {};
        const phaseCounts = {};
        const statusCounts = {};
        const yearCounts = {};
        const qualityCounts = { high: 0, medium: 0, low: 0 };

        results.forEach(result => {
            // Database distribution
            databaseCounts[result.database] = (databaseCounts[result.database] || 0) + 1;
            
            // Phase distribution
            const phase = result.phase !== 'N/A' ? result.phase : 'Other';
            phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
            
            // Status distribution
            const status = result.display_status || 'Other';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            
            // Year distribution (group by ranges)
            const year = result.year > 1990 ? result.year : 'Other';
            if (year !== 'Other') {
                const yearRange = `${Math.floor(year / 5) * 5}-${Math.floor(year / 5) * 5 + 4}`;
                yearCounts[yearRange] = (yearCounts[yearRange] || 0) + 1;
            } else {
                yearCounts[year] = (yearCounts[year] || 0) + 1;
            }
            
            // Quality distribution
            qualityCounts[result.result_quality] = (qualityCounts[result.result_quality] || 0) + 1;
        });

        return {
            databaseCounts,
            phaseCounts,
            statusCounts,
            yearCounts,
            qualityCounts
        };
    }, [results]);

    /**
     * Export enhanced logs
     */
    const exportLogs = useCallback((format = 'json') => {
        try {
            const exportData = {
                exportTime: new Date().toISOString(),
                searchQuery,
                selectedDatabases,
                resultsSummary: {
                    totalResults: results.length,
                    filteredResults: processedResults.length,
                    highQuality: results.filter(r => r.result_quality === 'high').length,
                    mediumQuality: results.filter(r => r.result_quality === 'medium').length,
                    lowQuality: results.filter(r => r.result_quality === 'low').length
                },
                apiStatus,
                logs: searchLogs.slice(0, 50) // Last 50 log entries
            };

            let data, mimeType, extension;
            
            if (format === 'csv') {
                const headers = ['Timestamp', 'Level', 'Message', 'Database', 'Details'];
                const csvRows = [headers.join(',')];
                
                searchLogs.forEach(log => {
                    const row = [
                        `"${log.timestamp}"`,
                        log.level,
                        `"${log.message.replace(/"/g, '""')}"`,
                        log.data?.database || '',
                        `"${JSON.stringify(log.data || {}).replace(/"/g, '""')}"`
                    ];
                    csvRows.push(row.join(','));
                });
                
                data = csvRows.join('\n');
                mimeType = 'text/csv';
                extension = 'csv';
            } else {
                data = JSON.stringify(exportData, null, 2);
                mimeType = 'application/json';
                extension = 'json';
            }

            const blob = new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `intelligrid-logs-${new Date().toISOString().split('T')[0]}.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            addLog('info', `Logs exported as ${extension.toUpperCase()}`);
        } catch (error) {
            addLog('error', 'Failed to export logs', { error: error.message });
        }
    }, [searchLogs, searchQuery, selectedDatabases, results, processedResults, apiStatus, addLog]);

    /**
     * Render enhanced progress indicator with smooth animations
     */
    const renderProgressIndicator = () => {
        if (!loading) return null;

        const progress = searchProgress.total > 0 ? (searchProgress.current / searchProgress.total) * 100 : 0;
        
        return (
            <div className="fixed top-5 right-5 glass-card p-4 min-w-64 z-50">
                <div className="flex items-center gap-3 mb-3">
                    <div className="loading-spinner text-xl">🔄</div>
                    <span className="font-semibold text-slate-700">Searching Databases</span>
                </div>
                <div className="text-sm text-slate-600 mb-3">
                    {searchProgress.current} of {searchProgress.total} databases completed
                </div>
                <div className="progress-container">
                    <div 
                        className="progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="text-xs text-slate-500 mt-2">
                    This may take up to 30 seconds...
                </div>
            </div>
        );
    };

    /**
     * Render enhanced error display with better UX
     */
    const renderErrorDisplay = () => {
        if (!error) return null;

        const isWarning = error.toLowerCase().includes('warning');
        const isCritical = error.toLowerCase().includes('critical') || error.toLowerCase().includes('failed');
        
        return (
            <div className={`card mb-6 border-l-4 ${
                isCritical ? 'border-red-500 bg-red-50' : 
                isWarning ? 'border-yellow-500 bg-yellow-50' : 
                'border-blue-500 bg-blue-50'
            }`}>
                <div className="card-body">
                    <div className="flex items-start gap-4">
                        <div className="text-2xl">
                            {isCritical ? '❌' : isWarning ? '⚠️' : 'ℹ️'}
                        </div>
                        <div className="flex-1">
                            <h4 className={`font-semibold mb-2 ${
                                isCritical ? 'text-red-800' : 
                                isWarning ? 'text-yellow-800' : 
                                'text-blue-800'
                            }`}>
                                {isCritical ? 'Critical Error' : isWarning ? 'Warning' : 'Notice'}
                            </h4>
                            <p className={`mb-3 ${
                                isCritical ? 'text-red-700' : 
                                isWarning ? 'text-yellow-700' : 
                                'text-blue-700'
                            }`}>
                                {error}
                            </p>
                            
                            {/* Action buttons */}
                            <div className="flex gap-3">
                                {searchLogs.length > 0 && (
                                    <button
                                        onClick={() => setShowLogs(!showLogs)}
                                        className="btn btn-ghost text-sm"
                                    >
                                        {showLogs ? '🔽 Hide' : '🔍 Show'} Logs
                                    </button>
                                )}
                                
                                {isCritical && (
                                    <button
                                        onClick={() => {
                                            setError(null);
                                            setSelectedDatabases(['clinicaltrials', 'opentargets']);
                                        }}
                                        className="btn btn-secondary text-sm"
                                    >
                                        🔄 Reset to Core Databases
                                    </button>
                                )}
                                
                                <button
                                    onClick={() => setError(null)}
                                    className="btn btn-ghost text-sm"
                                >
                                    ✕ Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Continue with render methods... (This is getting quite long, would you like me to continue with the rest of the component in a separate artifact?)

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)',
            padding: '20px'
        }}>
            {renderProgressIndicator()}
            
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Enhanced Header */}
                <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '30px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '40px',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                    <h1 style={{ 
                        margin: '0 0 15px 0', 
                        fontSize: '3em', 
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontWeight: '700',
                        letterSpacing: '-0.02em'
                    }}>
                        🧬 IntelliGRID
                    </h1>
                    <p style={{ 
                        margin: '0 0 25px 0', 
                        fontSize: '1.3em', 
                        color: '#64748b',
                        fontWeight: '300',
                        lineHeight: '1.6'
                    }}>
                        Global Research Intelligence Database • 11+ Biomedical Databases • Unlimited Results
                    </p>
                    
                    {/* Enhanced Search Interface */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        maxWidth: '700px', 
                        margin: '0 auto',
                        alignItems: 'stretch'
                    }}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && executeSearch()}
                            placeholder="Search across 11+ databases (e.g., Alzheimer disease, BRCA1, immunotherapy...)"
                            style={{
                                flex: 1,
                                padding: '16px 20px',
                                border: '2px solid rgba(148, 163, 184, 0.3)',
                                borderRadius: '12px',
                                fontSize: '1.1em',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                background: 'rgba(255, 255, 255, 0.8)',
                                backdropFilter: 'blur(10px)'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#4f46e5';
                                e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                        <button
                            onClick={executeSearch}
                            disabled={loading || !searchQuery.trim() || selectedDatabases.length === 0}
                            style={{
                                padding: '16px 28px',
                                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '1.1em',
                                fontWeight: '600',
                                transition: 'all 0.3s ease',
                                boxShadow: loading ? 'none' : '0 4px 12px rgba(79, 70, 229, 0.3)'
                            }}
                        >
                            {loading ? '🔄 Searching...' : '🔍 Search'}
                        </button>
                    </div>
                </div>

                {/* Enhanced Database Selector with Professional Styling */}
                <div className="card mb-8">
                    <div className="card-header">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-slate-700">
                                Select Databases ({selectedDatabases.length}/{databases.length})
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedDatabases(databases.map(db => db.id))}
                                    className="btn btn-success text-sm"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => setSelectedDatabases([])}
                                    className="btn btn-error text-sm"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="database-grid">
                            {databases.map(db => {
                                const isSelected = selectedDatabases.includes(db.id);
                                const status = apiStatus[db.id];
                                
                                return (
                                    <label 
                                        key={db.id} 
                                        className={`database-card ${isSelected ? 'selected' : ''}`}
                                        style={{
                                            borderColor: isSelected ? db.color : 'var(--color-gray-200)',
                                            background: isSelected 
                                                ? `linear-gradient(135deg, ${db.color}15, ${db.color}25)` 
                                                : 'var(--bg-card)'
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {
                                                    setSelectedDatabases(prev => {
                                                        if (prev.includes(db.id)) {
                                                            return prev.filter(id => id !== db.id);
                                                        } else {
                                                            return [...prev, db.id];
                                                        }
                                                    });
                                                }}
                                                className="w-4 h-4 transform scale-110"
                                            />
                                            <span className="text-2xl">{db.icon}</span>
                                            <div className="flex-1">
                                                <div className="font-semibold text-slate-700 mb-1">
                                                    {db.name}
                                                </div>
                                                {status && (
                                                    <div className={`status-badge ${status.online ? 'status-online' : 'status-offline'}`}>
                                                        {status.online ? (
                                                            <span className="flex items-center gap-1">
                                                                🟢 Online
                                                                {status.responseTime && (
                                                                    <span className="text-xs">
                                                                        ({Math.round(status.responseTime)}ms)
                                                                    </span>
                                                                )}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1">
                                                                🔴 Offline
                                                                {status.error && (
                                                                    <span className="text-xs" title={status.error}>
                                                                        ({status.error.slice(0, 10)}...)
                                                                    </span>
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {renderErrorDisplay()}

                {/* Enhanced Logs Display */}
                {showLogs && searchLogs.length > 0 && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        padding: '20px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ margin: 0, fontSize: '1em', color: '#334155' }}>Search Logs</h4>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => exportLogs('json')}
                                    style={{
                                        padding: '4px 8px',
                                        background: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.75em'
                                    }}
                                >
                                    Export JSON
                                </button>
                                <button
                                    onClick={() => exportLogs('csv')}
                                    style={{
                                        padding: '4px 8px',
                                        background: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.75em'
                                    }}
                                >
                                    Export CSV
                                </button>
                                <button
                                    onClick={() => setSearchLogs([])}
                                    style={{
                                        padding: '4px 8px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.75em'
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                        {searchLogs.slice(0, 20).map(log => (
                            <div key={log.id} style={{
                                padding: '8px 12px',
                                marginBottom: '6px',
                                background: log.level === 'error' ? '#fee2e2' : 
                                           log.level === 'warn' ? '#fef3c7' : 
                                           log.level === 'success' ? '#dcfce7' : '#f1f5f9',
                                borderRadius: '6px',
                                fontSize: '0.8em',
                                borderLeft: `4px solid ${
                                    log.level === 'error' ? '#ef4444' :
                                    log.level === 'warn' ? '#f59e0b' :
                                    log.level === 'success' ? '#10b981' : '#6b7280'
                                }`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ fontWeight: '500' }}>{log.message}</span>
                                    <span style={{ color: '#6b7280', fontSize: '0.9em' }}>
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                {log.data && (
                                    <div style={{ marginTop: '4px', color: '#6b7280', fontSize: '0.9em' }}>
                                        {typeof log.data === 'object' ? JSON.stringify(log.data) : log.data}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

    /**
     * Render enhanced logs display with professional styling
     */
    const renderLogsDisplay = () => {
        if (!showLogs || searchLogs.length === 0) return null;

        return (
            <div className="card mb-6">
                <div className="card-header">
                    <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-slate-700">Search Logs</h4>
                        <div className="flex gap-2">
                            <button
                                onClick={() => exportLogs('json')}
                                className="btn btn-secondary text-sm"
                            >
                                📄 Export JSON
                            </button>
                            <button
                                onClick={() => exportLogs('csv')}
                                className="btn btn-success text-sm"
                            >
                                📊 Export CSV
                            </button>
                            <button
                                onClick={() => setSearchLogs([])}
                                className="btn btn-error text-sm"
                            >
                                🗑️ Clear
                            </button>
                        </div>
                    </div>
                </div>
                <div className="card-body max-h-80 overflow-y-auto">
                    {searchLogs.slice(0, 50).map(log => (
                        <div 
                            key={log.id} 
                            className={`p-3 mb-2 rounded-lg border-l-4 ${
                                log.level === 'error' ? 'bg-red-50 border-red-500' : 
                                log.level === 'warn' ? 'bg-yellow-50 border-yellow-500' : 
                                log.level === 'success' ? 'bg-green-50 border-green-500' : 
                                'bg-blue-50 border-blue-500'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`font-medium text-sm ${
                                    log.level === 'error' ? 'text-red-800' :
                                    log.level === 'warn' ? 'text-yellow-800' :
                                    log.level === 'success' ? 'text-green-800' :
                                    'text-blue-800'
                                }`}>
                                    {log.message}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            {log.data && (
                                <div className="text-xs text-slate-600 mt-1 bg-white bg-opacity-50 p-2 rounded">
                                    {typeof log.data === 'object' ? 
                                        JSON.stringify(log.data, null, 2) : 
                                        String(log.data)
                                    }
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    /**
     * Render enhanced visualization with professional charts
     */
    const renderVisualization = () => {
        if (!visualizationData || !showVisualization) return null;

        return (
            <div className="card mb-6">
                <div className="card-header">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-slate-700">Results Overview</h3>
                        <button 
                            onClick={() => setShowVisualization(!showVisualization)}
                            className="btn btn-ghost text-sm"
                        >
                            {showVisualization ? '📊 Hide Charts' : '📈 Show Charts'}
                        </button>
                    </div>
                </div>
                
                <div className="card-body">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Database Distribution */}
                        <div className="glass-card p-4">
                            <h4 className="font-medium text-slate-700 mb-3 text-sm">
                                Database Distribution
                            </h4>
                            <div className="space-y-2">
                                {Object.entries(visualizationData.databaseCounts)
                                    .sort(([,a], [,b]) => b - a)
                                    .slice(0, 5)
                                    .map(([database, count]) => (
                                        <div key={database} className="flex justify-between items-center text-xs">
                                            <span className="truncate pr-2">{database}</span>
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="h-2 bg-indigo-500 rounded-full"
                                                    style={{ 
                                                        width: `${Math.max(10, (count / Math.max(...Object.values(visualizationData.databaseCounts))) * 40)}px` 
                                                    }}
                                                />
                                                <span className="font-medium text-slate-600">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Phase Distribution */}
                        <div className="glass-card p-4">
                            <h4 className="font-medium text-slate-700 mb-3 text-sm">
                                Development Phases
                            </h4>
                            <div className="space-y-2">
                                {Object.entries(visualizationData.phaseCounts)
                                    .sort(([,a], [,b]) => b - a)
                                    .slice(0, 5)
                                    .map(([phase, count]) => (
                                        <div key={phase} className="flex justify-between items-center text-xs">
                                            <span className="truncate pr-2">{phase}</span>
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="h-2 bg-purple-500 rounded-full"
                                                    style={{ 
                                                        width: `${Math.max(10, (count / Math.max(...Object.values(visualizationData.phaseCounts))) * 40)}px` 
                                                    }}
                                                />
                                                <span className="font-medium text-slate-600">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Status Distribution */}
                        <div className="glass-card p-4">
                            <h4 className="font-medium text-slate-700 mb-3 text-sm">
                                Status Distribution
                            </h4>
                            <div className="space-y-2">
                                {Object.entries(visualizationData.statusCounts)
                                    .sort(([,a], [,b]) => b - a)
                                    .slice(0, 5)
                                    .map(([status, count]) => (
                                        <div key={status} className="flex justify-between items-center text-xs">
                                            <span className="truncate pr-2">{status}</span>
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="h-2 bg-emerald-500 rounded-full"
                                                    style={{ 
                                                        width: `${Math.max(10, (count / Math.max(...Object.values(visualizationData.statusCounts))) * 40)}px` 
                                                    }}
                                                />
                                                <span className="font-medium text-slate-600">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Quality Distribution */}
                        <div className="glass-card p-4">
                            <h4 className="font-medium text-slate-700 mb-3 text-sm">
                                Data Quality
                            </h4>
                            <div className="space-y-2">
                                {Object.entries(visualizationData.qualityCounts)
                                    .sort(([,a], [,b]) => b - a)
                                    .map(([quality, count]) => (
                                        <div key={quality} className="flex justify-between items-center text-xs">
                                            <span className="capitalize truncate pr-2">{quality}</span>
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className={`h-2 rounded-full ${
                                                        quality === 'high' ? 'bg-green-500' :
                                                        quality === 'medium' ? 'bg-yellow-500' :
                                                        'bg-red-500'
                                                    }`}
                                                    style={{ 
                                                        width: `${Math.max(10, (count / Math.max(...Object.values(visualizationData.qualityCounts))) * 40)}px` 
                                                    }}
                                                />
                                                <span className="font-medium text-slate-600">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-indigo-600">{results.length}</div>
                            <div className="text-xs text-slate-600">Total Results</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{processedResults.length}</div>
                            <div className="text-xs text-slate-600">Filtered Results</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">
                                {results.filter(r => r.result_quality === 'high').length}
                            </div>
                            <div className="text-xs text-slate-600">High Quality</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-pink-600">{bookmarkedItems.size}</div>
                            <div className="text-xs text-slate-600">Bookmarked</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    /**
     * Render enhanced filters section
     */
    const renderFilters = () => {
        if (!showFilters || !results.length) return null;

        return (
            <div className="card mb-6">
                <div className="card-header">
                    <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-slate-700">Filters & Search</h4>
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className="btn btn-ghost text-sm"
                        >
                            {showFilters ? '🔽 Hide' : '🔼 Show'} Filters
                        </button>
                    </div>
                </div>

                <div className="card-body">
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        {/* Database Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Database
                            </label>
                            <select 
                                value={filters.database} 
                                onChange={(e) => setFilters(prev => ({ ...prev, database: e.target.value }))}
                                className="input-field text-sm"
                            >
                                <option value="all">All Databases</option>
                                {filterOptions.databases.map(db => (
                                    <option key={db} value={db}>{db}</option>
                                ))}
                            </select>
                        </div>

                        {/* Phase Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Phase
                            </label>
                            <select 
                                value={filters.phase} 
                                onChange={(e) => setFilters(prev => ({ ...prev, phase: e.target.value }))}
                                className="input-field text-sm"
                            >
                                <option value="all">All Phases</option>
                                {filterOptions.phases.map(phase => (
                                    <option key={phase} value={phase}>{phase}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Status
                            </label>
                            <select 
                                value={filters.status} 
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="input-field text-sm"
                            >
                                <option value="all">All Statuses</option>
                                {filterOptions.statuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>

                        {/* Year Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Since Year
                            </label>
                            <select 
                                value={filters.year} 
                                onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                                className="input-field text-sm"
                            >
                                <option value="all">All Years</option>
                                {filterOptions.years.slice(0, 10).map(year => (
                                    <option key={year} value={year}>Since {year}</option>
                                ))}
                            </select>
                        </div>

                        {/* Type Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Type
                            </label>
                            <select 
                                value={filters.type} 
                                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                                className="input-field text-sm"
                            >
                                <option value="all">All Types</option>
                                {filterOptions.types.slice(0, 10).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Search within results */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Search within results
                        </label>
                        <input
                            type="text"
                            value={searchWithinResults}
                            onChange={(e) => setSearchWithinResults(e.target.value)}
                            placeholder="Filter current results..."
                            className="input-field"
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3">
                        <button 
                            onClick={() => handleExport('csv')}
                            className="btn btn-success"
                        >
                            📊 Export CSV
                        </button>
                        <button 
                            onClick={() => handleExport('json')}
                            className="btn btn-secondary"
                        >
                            📄 Export JSON
                        </button>
                        <button 
                            onClick={() => {
                                setFilters({ database: 'all', phase: 'all', status: 'all', year: 'all', type: 'all' });
                                setSearchWithinResults('');
                            }}
                            className="btn btn-ghost"
                        >
                            🔄 Clear Filters
                        </button>
                        <button
                            onClick={() => setShowLogs(!showLogs)}
                            className="btn btn-ghost"
                        >
                            📜 {showLogs ? 'Hide' : 'Show'} Logs
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    /**
     * Render enhanced results table
     */
    const renderResultsTable = () => {
        if (!processedResults.length) return null;

        return (
            <div className="table-container">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('database')} className="cursor-pointer hover:bg-slate-100">
                                    Database {sortConfig.key === 'database' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('display_title')} className="cursor-pointer hover:bg-slate-100">
                                    Title {sortConfig.key === 'display_title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('type')} className="cursor-pointer hover:bg-slate-100">
                                    Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('display_status')} className="cursor-pointer hover:bg-slate-100">
                                    Status {sortConfig.key === 'display_status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('phase')} className="cursor-pointer hover:bg-slate-100">
                                    Phase {sortConfig.key === 'phase' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('year')} className="cursor-pointer hover:bg-slate-100">
                                    Year {sortConfig.key === 'year' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('data_completeness')} className="cursor-pointer hover:bg-slate-100">
                                    Quality {sortConfig.key === 'data_completeness' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedResults.map((result, index) => (
                                <tr key={result.id || index} className="hover:bg-slate-50">
                                    <td>
                                        <span className={`status-badge ${getDatabaseColor(result.database)}`}>
                                            {result.database}
                                        </span>
                                    </td>
                                    <td>
                                        <div>
                                            <div className="font-medium text-slate-800 mb-1">
                                                {result.display_title}
                                            </div>
                                            <div className="text-xs text-slate-600 line-clamp-2">
                                                {result.display_details}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-sm text-slate-700">
                                            {result.type || 'Research'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${getStatusColor(result.display_status)}`}>
                                            {result.display_status}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-sm text-slate-700">
                                            {result.phase}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-sm text-slate-700">
                                            {result.year}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${
                                                result.result_quality === 'high' ? 'bg-green-500' :
                                                result.result_quality === 'medium' ? 'bg-yellow-500' :
                                                'bg-red-500'
                                            }`} />
                                            <span className="text-xs text-slate-600">
                                                {result.completeness_score || 0}%
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleBookmarkToggle(result.id)}
                                                className={`btn btn-ghost text-sm p-1 ${
                                                    bookmarkedItems.has(result.id) ? 'text-yellow-500' : 'text-slate-400'
                                                }`}
                                                title={bookmarkedItems.has(result.id) ? 'Remove bookmark' : 'Add bookmark'}
                                            >
                                                ★
                                            </button>
                                            {result.link && result.link !== '#' && (
                                                <a 
                                                    href={result.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="btn btn-ghost text-sm p-1 text-indigo-600 hover:text-indigo-800"
                                                >
                                                    🔗
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Helper functions for styling
    const getDatabaseColor = (database) => {
        const db = databases.find(d => d.name === database || d.id === database);
        return db ? db.color : 'var(--color-gray-500)';
    };

    const getStatusColor = (status) => {
        if (status?.toLowerCase().includes('recruiting') || status?.toLowerCase().includes('active')) {
            return 'status-online';
        }
        if (status?.toLowerCase().includes('completed') || status?.toLowerCase().includes('approved')) {
            return 'status-online';
        }
        if (status?.toLowerCase().includes('terminated') || status?.toLowerCase().includes('withdrawn')) {
            return 'status-offline';
        }
        return 'status-warning';
    };

                {/* Welcome/Empty State with Professional Design */}
                {!loading && !searchQuery && (
                    <div className="card text-center p-16">
                        <div className="text-6xl mb-6 loading-bounce">🚀</div>
                        <h3 className="text-2xl font-semibold text-slate-700 mb-5">
                            Welcome to IntelliGRID
                        </h3>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-3xl mx-auto">
                            Search across 11+ major biomedical databases simultaneously. 
                            Get unlimited results with advanced filtering, real-time monitoring, and comprehensive logging.
                        </p>
                        
                        <div className="grid md:grid-cols-3 gap-6 mt-8 text-left max-w-4xl mx-auto">
                            <div className="glass-card p-6">
                                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    🔬 Example Searches
                                </h4>
                                <ul className="space-y-2 text-sm text-slate-600">
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                        Alzheimer disease trials
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                        BRCA1 mutations
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                        immunotherapy cancer
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                        diabetes GLP-1 agonist
                                    </li>
                                </ul>
                            </div>
                            
                            <div className="glass-card p-6">
                                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    📊 Key Features
                                </h4>
                                <ul className="space-y-2 text-sm text-slate-600">
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Unlimited results
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                        Advanced filtering
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                                        Real-time monitoring
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                                        CSV/JSON export
                                    </li>
                                </ul>
                            </div>
                            
                            <div className="glass-card p-6">
                                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    🏥 Data Sources
                                </h4>
                                <ul className="space-y-2 text-sm text-slate-600">
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                        Clinical trials
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                        Drug databases
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                        Genetic variants
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-lime-500 rounded-full"></span>
                                        Research literature
                                    </li>
                                </ul>
                            </div>
                        </div>
                        
                        {/* System Status */}
                        {Object.keys(apiStatus).length > 0 && (
                            <div className="mt-8 p-4 bg-slate-50 rounded-lg">
                                <h5 className="font-medium text-slate-700 mb-2">System Status</h5>
                                <div className="flex justify-center gap-4 text-xs">
                                    <span className="status-badge status-online">
                                        {Object.values(apiStatus).filter(s => s.online).length} Online
                                    </span>
                                    <span className="status-badge status-offline">
                                        {Object.values(apiStatus).filter(s => !s.online).length} Offline
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* No Results State */}
                {!loading && !results.length && searchQuery && (
                    <div className="card text-center p-12">
                        <div className="text-5xl mb-6">🔍</div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-3">No Results Found</h3>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            No results found for "<span className="font-medium text-slate-800">{searchQuery}</span>". 
                            Try different keywords or select more databases.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="btn btn-secondary"
                            >
                                🔄 Clear Search
                            </button>
                            <button 
                                onClick={() => setSelectedDatabases(databases.map(db => db.id))}
                                className="btn btn-primary"
                            >
                                📡 Select All Databases
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PharmaceuticalIntelligenceSystem;
