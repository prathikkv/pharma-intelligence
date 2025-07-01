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
     * Render enhanced progress indicator
     */
    const renderProgressIndicator = () => {
        if (!loading) return null;

        const progress = searchProgress.total > 0 ? (searchProgress.current / searchProgress.total) * 100 : 0;
        
        return (
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '15px 20px',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                zIndex: 1000,
                minWidth: '200px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div className="spin" style={{ fontSize: '1.2em' }}>🔄</div>
                    <span style={{ fontWeight: '600', color: '#333' }}>Searching...</span>
                </div>
                <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '8px' }}>
                    {searchProgress.current} of {searchProgress.total} databases
                </div>
                <div style={{
                    width: '100%',
                    height: '4px',
                    background: '#e2e8f0',
                    borderRadius: '2px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
            </div>
        );
    };

    /**
     * Render enhanced error display
     */
    const renderErrorDisplay = () => {
        if (!error) return null;

        const isWarning = error.toLowerCase().includes('warning');
        
        return (
            <div style={{
                background: isWarning ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                color: isWarning ? '#92400e' : '#991b1b',
                padding: '16px 20px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: `1px solid ${isWarning ? '#f59e0b' : '#ef4444'}`,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '1.2em' }}>{isWarning ? '⚠️' : '❌'}</span>
                    <div style={{ flex: 1 }}>
                        <strong>{isWarning ? 'Warning' : 'Error'}:</strong> {error}
                        {searchLogs.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                                <button
                                    onClick={() => setShowLogs(!showLogs)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: isWarning ? '#92400e' : '#991b1b',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        fontSize: '0.85em'
                                    }}
                                >
                                    {showLogs ? 'Hide' : 'Show'} detailed logs
                                </button>
                            </div>
                        )}
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

                {/* Enhanced Database Selector */}
                <div style={{ 
                    background: 'rgba(255, 255, 255, 0.9)', 
                    padding: '25px', 
                    borderRadius: '16px', 
                    marginBottom: '25px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2em', color: '#334155', fontWeight: '600' }}>
                            Select Databases ({selectedDatabases.length}/{databases.length})
                        </h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setSelectedDatabases(databases.map(db => db.id))}
                                style={{
                                    padding: '6px 12px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.8em',
                                    fontWeight: '500'
                                }}
                            >
                                Select All
                            </button>
                            <button
                                onClick={() => setSelectedDatabases([])}
                                style={{
                                    padding: '6px 12px',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.8em',
                                    fontWeight: '500'
                                }}
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                        gap: '12px' 
                    }}>
                        {databases.map(db => {
                            const isSelected = selectedDatabases.includes(db.id);
                            const status = apiStatus[db.id];
                            
                            return (
                                <label 
                                    key={db.id} 
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '10px',
                                        padding: '12px 16px',
                                        background: isSelected 
                                            ? `linear-gradient(135deg, ${db.color}20, ${db.color}30)` 
                                            : 'rgba(255, 255, 255, 0.6)',
                                        border: `2px solid ${isSelected ? db.color : 'rgba(148, 163, 184, 0.2)'}`,
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        position: 'relative'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                                            e.target.style.transform = 'translateY(-1px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.target.style.background = 'rgba(255, 255, 255, 0.6)';
                                            e.target.style.transform = 'translateY(0)';
                                        }
                                    }}
                                >
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
                                        style={{ margin: 0, transform: 'scale(1.1)' }}
                                    />
                                    <span style={{ fontSize: '1.3em' }}>{db.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: '0.9em', fontWeight: '600', color: '#334155' }}>
                                            {db.name}
                                        </span>
                                        {status && (
                                            <div style={{ fontSize: '0.7em', color: status.online ? '#10b981' : '#ef4444', marginTop: '2px' }}>
                                                {status.online ? '🟢 Online' : '🔴 Offline'}
                                                {status.responseTime && ` (${Math.round(status.responseTime)}ms)`}
                                            </div>
                                        )}
                                    </div>
                                </label>
                            );
                        })}
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

                {/* Continue with rest of the component... */}
                {/* Note: This is getting quite long. Should I continue with the remaining parts in another artifact? */}
                {results.length > 0 && (
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.9)', 
                        padding: '20px', 
                        borderRadius: '16px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#334155' }}>
                            Search Results ({processedResults.length} of {results.length})
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '0.9em' }}>
                            Results retrieved and processed successfully. Use filters below to refine your search.
                        </p>
                    </div>
                )}

                {/* Welcome/Empty State */}
                {!loading && !searchQuery && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '80px 40px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '20px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div style={{ fontSize: '4em', marginBottom: '25px' }}>🚀</div>
                        <h3 style={{ color: '#334155', marginBottom: '20px', fontSize: '1.8em', fontWeight: '600' }}>
                            Welcome to IntelliGRID
                        </h3>
                        <p style={{ color: '#64748b', marginBottom: '35px', lineHeight: '1.7', fontSize: '1.1em', maxWidth: '600px', margin: '0 auto 35px' }}>
                            Search across 11+ major biomedical databases simultaneously. 
                            Get unlimited results with advanced filtering, data visualization, and comprehensive logging.
                        </p>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                            gap: '20px',
                            marginTop: '35px',
                            textAlign: 'left'
                        }}>
                            <div style={{ 
                                padding: '20px', 
                                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
                                borderRadius: '12px',
                                border: '1px solid rgba(148, 163, 184, 0.2)'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    🔬 Example Searches
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.95em', color: '#64748b', lineHeight: '1.6' }}>
                                    <li>Alzheimer disease trials</li>
                                    <li>BRCA1 mutations</li>
                                    <li>immunotherapy cancer</li>
                                    <li>diabetes GLP-1 agonist</li>
                                </ul>
                            </div>
                            <div style={{ 
                                padding: '20px', 
                                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
                                borderRadius: '12px',
                                border: '1px solid rgba(148, 163, 184, 0.2)'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📊 Features
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.95em', color: '#64748b', lineHeight: '1.6' }}>
                                    <li>Unlimited results</li>
                                    <li>Advanced filtering</li>
                                    <li>Real-time logging</li>
                                    <li>CSV/JSON export</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PharmaceuticalIntelligenceSystem;
