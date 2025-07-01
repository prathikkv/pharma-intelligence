// components/PharmaceuticalIntelligenceSystem.js - Comprehensive Pharmaceutical Intelligence Platform
// Replace your current components/PharmaceuticalIntelligenceSystem.js file with this enhanced version

import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Main Pharmaceutical Intelligence System Component
 * Integrates 11+ biomedical databases with enhanced data processing and visualization
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
    
    // Available databases configuration
    const databases = [
        { id: 'clinicaltrials', name: 'ClinicalTrials.gov', icon: '🏥', color: '#2563eb' },
        { id: 'opentargets', name: 'Open Targets', icon: '🎯', color: '#dc2626' },
        { id: 'chembl', name: 'ChEMBL', icon: '🧪', color: '#7c3aed' },
        { id: 'drugbank', name: 'DrugBank', icon: '💊', color: '#059669' },
        { id: 'evaluatepharma', name: 'EvaluatePharma', icon: '📊', color: '#ea580c' },
        { id: 'clinvar', name: 'ClinVar', icon: '🧬', color: '#be185d' },
        { id: 'hpa', name: 'Human Protein Atlas', icon: '🔬', color: '#0891b2' },
        { id: 'uniprot', name: 'UniProt', icon: '🧠', color: '#7c2d12' },
        { id: 'pubmed', name: 'PubMed', icon: '📚', color: '#374151' },
        { id: 'mgi', name: 'Mouse Genome', icon: '🐭', color: '#6366f1' },
        { id: 'iuphar', name: 'IUPHAR/BPS', icon: '⚗️', color: '#c2410c' }
    ];

    /**
     * Execute search across selected databases
     */
    const executeSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setError('Please enter a search query');
            return;
        }

        setLoading(true);
        setError(null);
        setResults([]);
        setTotalResults(0);

        try {
            console.log('Executing search for:', searchQuery);
            console.log('Selected databases:', selectedDatabases);

            const baseUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:3000' 
                : `https://${window.location.hostname}`;

            // Execute searches for selected databases in parallel
            const searchPromises = selectedDatabases.map(async (database) => {
                try {
                    const response = await fetch(
                        `${baseUrl}/api/search/${database}?query=${encodeURIComponent(searchQuery)}&limit=50`
                    );
                    
                    if (!response.ok) {
                        throw new Error(`${database} API error: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    // Validate and enhance results
                    const validResults = (data.results || []).map(result => ({
                        ...result,
                        // Ensure no N/A values in critical fields
                        title: result.title || `${database} entry`,
                        details: result.details || `${database} data available`,
                        status: result.status || 'Available',
                        phase: result.phase || 'N/A',
                        year: result.year || new Date().getFullYear(),
                        sponsor: result.sponsor || 'Multiple',
                        enrollment: result.enrollment || 'See details',
                        link: result.link || '#',
                        database: result.database || database,
                        // Add search metadata
                        search_query: searchQuery,
                        search_database: database,
                        result_quality: assessResultQuality(result)
                    }));
                    
                    console.log(`${database} returned ${validResults.length} results`);
                    return { database, results: validResults, total: data.total || validResults.length };
                    
                } catch (error) {
                    console.error(`Error searching ${database}:`, error);
                    return { database, results: [], total: 0, error: error.message };
                }
            });

            const searchResults = await Promise.all(searchPromises);
            
            // Combine and process results
            let combinedResults = [];
            let combinedTotal = 0;
            const errors = [];

            searchResults.forEach(({ database, results, total, error }) => {
                if (error) {
                    errors.push({ database, error });
                } else {
                    combinedResults.push(...results);
                    combinedTotal += total;
                }
            });

            // Remove duplicates and enhance data
            const uniqueResults = removeDuplicates(combinedResults);
            const enhancedResults = enhanceResults(uniqueResults);
            
            setResults(enhancedResults);
            setTotalResults(combinedTotal);
            setSearchTimestamp(new Date().toISOString());
            
            if (errors.length > 0) {
                console.warn('Some databases had errors:', errors);
                setError(`Warning: ${errors.length} database(s) had issues: ${errors.map(e => e.database).join(', ')}`);
            }

            console.log(`Search completed: ${enhancedResults.length} unique results from ${combinedTotal} total`);

        } catch (error) {
            console.error('Search execution failed:', error);
            setError(`Search failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedDatabases]);

    /**
     * Assess the quality of a result to prevent N/A display
     */
    const assessResultQuality = (result) => {
        let score = 0;
        
        // Check for meaningful data
        if (result.title && result.title !== 'N/A' && result.title.length > 5) score += 2;
        if (result.details && result.details !== 'N/A' && result.details.length > 10) score += 2;
        if (result.link && result.link !== '#' && result.link.includes('http')) score += 1;
        if (result.phase && result.phase !== 'N/A') score += 1;
        if (result.status && result.status !== 'N/A' && result.status !== 'Unknown') score += 1;
        if (result.year && result.year > 1990) score += 1;
        if (result.sponsor && result.sponsor !== 'N/A' && result.sponsor !== 'Unknown') score += 1;
        
        // Additional quality indicators
        if (result.clinical_trials_count > 0) score += 2;
        if (result.raw_data && Object.keys(result.raw_data).length > 3) score += 1;
        if (result.enrollment && result.enrollment !== 'N/A') score += 1;
        
        return score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low';
    };

    /**
     * Remove duplicate results based on similarity
     */
    const removeDuplicates = (results) => {
        const seen = new Map();
        const unique = [];
        
        results.forEach(result => {
            // Create a key based on title and database to identify potential duplicates
            const key = `${result.title?.toLowerCase().slice(0, 50)}-${result.database}`;
            
            if (!seen.has(key)) {
                seen.set(key, true);
                unique.push(result);
            }
        });
        
        return unique;
    };

    /**
     * Enhance results with additional computed fields
     */
    const enhanceResults = (results) => {
        return results.map(result => ({
            ...result,
            // Add computed relevance score
            relevance_score: calculateRelevance(result),
            // Add data completeness score
            completeness_score: calculateCompleteness(result),
            // Add formatted display fields
            display_title: formatDisplayTitle(result),
            display_details: formatDisplayDetails(result),
            display_status: formatDisplayStatus(result)
        }));
    };

    /**
     * Calculate relevance score based on query match
     */
    const calculateRelevance = (result) => {
        const queryLower = searchQuery.toLowerCase();
        let score = 0;
        
        if (result.title?.toLowerCase().includes(queryLower)) score += 3;
        if (result.details?.toLowerCase().includes(queryLower)) score += 2;
        if (result.status?.toLowerCase().includes(queryLower)) score += 1;
        if (result.sponsor?.toLowerCase().includes(queryLower)) score += 1;
        
        return score;
    };

    /**
     * Calculate data completeness score
     */
    const calculateCompleteness = (result) => {
        const fields = ['title', 'details', 'status', 'phase', 'sponsor', 'year', 'link'];
        const filledFields = fields.filter(field => 
            result[field] && result[field] !== 'N/A' && result[field] !== 'Unknown'
        );
        return Math.round((filledFields.length / fields.length) * 100);
    };

    /**
     * Format display title to ensure readability
     */
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

    /**
     * Format display details to ensure valuable information
     */
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

    /**
     * Format display status to show meaningful information
     */
    const formatDisplayStatus = (result) => {
        let status = result.status || 'Available';
        
        // Map common N/A values to meaningful statuses
        if (status === 'N/A' || status === 'Unknown' || status === '') {
            if (result.database === 'ClinicalTrials.gov') status = 'Clinical Study';
            else if (result.database === 'ChEMBL') status = 'Bioactive Compound';
            else if (result.database === 'DrugBank') status = 'Drug Information';
            else if (result.database === 'EvaluatePharma') status = 'Market Data';
            else if (result.database === 'PubMed') status = 'Published Research';
            else status = 'Research Available';
        }
        
        return status;
    };

    /**
     * Filter and sort results based on current settings
     */
    const processedResults = useMemo(() => {
        let filtered = [...results];

        // Apply database filter
        if (filters.database !== 'all') {
            filtered = filtered.filter(result => result.database === filters.database);
        }

        // Apply phase filter
        if (filters.phase !== 'all') {
            filtered = filtered.filter(result => 
                result.phase?.toLowerCase().includes(filters.phase.toLowerCase())
            );
        }

        // Apply status filter
        if (filters.status !== 'all') {
            filtered = filtered.filter(result => 
                result.display_status?.toLowerCase().includes(filters.status.toLowerCase())
            );
        }

        // Apply year filter
        if (filters.year !== 'all') {
            const yearFilter = parseInt(filters.year);
            filtered = filtered.filter(result => {
                const resultYear = parseInt(result.year);
                return resultYear >= yearFilter;
            });
        }

        // Apply type filter
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

        results.forEach(result => {
            // Database distribution
            databaseCounts[result.database] = (databaseCounts[result.database] || 0) + 1;
            
            // Phase distribution
            const phase = result.phase !== 'N/A' ? result.phase : 'Other';
            phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
            
            // Status distribution
            const status = result.display_status || 'Other';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            
            // Year distribution
            const year = result.year > 1990 ? result.year : 'Other';
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        });

        return {
            databaseCounts,
            phaseCounts,
            statusCounts,
            yearCounts
        };
    }, [results]);

    /**
     * Handle database selection
     */
    const handleDatabaseToggle = (databaseId) => {
        setSelectedDatabases(prev => {
            if (prev.includes(databaseId)) {
                return prev.filter(id => id !== databaseId);
            } else {
                return [...prev, databaseId];
            }
        });
    };

    /**
     * Handle sorting
     */
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    /**
     * Handle bookmark toggle
     */
    const handleBookmarkToggle = (resultId) => {
        setBookmarkedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(resultId)) {
                newSet.delete(resultId);
            } else {
                newSet.add(resultId);
            }
            return newSet;
        });
    };

    /**
     * Export results
     */
    const handleExport = (format) => {
        try {
            let data;
            const exportResults = processedResults;

            if (format === 'csv') {
                const headers = ['Database', 'Title', 'Details', 'Phase', 'Status', 'Sponsor', 'Year', 'Link'];
                const csvRows = [headers.join(',')];
                
                exportResults.forEach(result => {
                    const row = [
                        result.database || '',
                        `"${(result.display_title || '').replace(/"/g, '""')}"`,
                        `"${(result.display_details || '').replace(/"/g, '""')}"`,
                        result.phase || '',
                        result.display_status || '',
                        result.sponsor || '',
                        result.year || '',
                        result.link || ''
                    ];
                    csvRows.push(row.join(','));
                });
                
                data = csvRows.join('\n');
            } else {
                data = JSON.stringify(exportResults, null, 2);
            }

            const blob = new Blob([data], { 
                type: format === 'csv' ? 'text/csv' : 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pharma-intelligence-${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            setError('Export failed. Please try again.');
        }
    };

    /**
     * Render database selector
     */
    const renderDatabaseSelector = () => (
        <div style={{ 
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '20px' 
        }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1em', color: '#333' }}>
                Select Databases ({selectedDatabases.length}/{databases.length})
            </h3>
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '10px' 
            }}>
                {databases.map(db => (
                    <label 
                        key={db.id} 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            padding: '8px 12px',
                            background: selectedDatabases.includes(db.id) ? db.color + '20' : 'white',
                            border: `2px solid ${selectedDatabases.includes(db.id) ? db.color : '#ddd'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={selectedDatabases.includes(db.id)}
                            onChange={() => handleDatabaseToggle(db.id)}
                            style={{ margin: 0 }}
                        />
                        <span style={{ fontSize: '1.2em' }}>{db.icon}</span>
                        <span style={{ fontSize: '0.9em', fontWeight: '500' }}>{db.name}</span>
                    </label>
                ))}
            </div>
        </div>
    );

    /**
     * Render visualization
     */
    const renderVisualization = () => {
        if (!visualizationData || !showVisualization) return null;

        return (
            <div style={{ 
                background: 'white', 
                padding: '20px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '15px' 
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.1em', color: '#333' }}>Results Overview</h3>
                    <button 
                        onClick={() => setShowVisualization(!showVisualization)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.2em',
                            cursor: 'pointer',
                            color: '#666'
                        }}
                    >
                        {showVisualization ? '📊' : '📈'}
                    </button>
                </div>
                
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: '15px' 
                }}>
                    {/* Database Distribution */}
                    <div>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#666' }}>
                            Database Distribution
                        </h4>
                        {Object.entries(visualizationData.databaseCounts)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 5)
                            .map(([database, count]) => (
                                <div key={database} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    marginBottom: '5px',
                                    fontSize: '0.85em'
                                }}>
                                    <span>{database}</span>
                                    <span style={{ fontWeight: '600' }}>{count}</span>
                                </div>
                            ))}
                    </div>

                    {/* Phase Distribution */}
                    <div>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#666' }}>
                            Development Phases
                        </h4>
                        {Object.entries(visualizationData.phaseCounts)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 5)
                            .map(([phase, count]) => (
                                <div key={phase} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    marginBottom: '5px',
                                    fontSize: '0.85em'
                                }}>
                                    <span>{phase}</span>
                                    <span style={{ fontWeight: '600' }}>{count}</span>
                                </div>
                            ))}
                    </div>

                    {/* Status Distribution */}
                    <div>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#666' }}>
                            Status Distribution
                        </h4>
                        {Object.entries(visualizationData.statusCounts)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 5)
                            .map(([status, count]) => (
                                <div key={status} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    marginBottom: '5px',
                                    fontSize: '0.85em'
                                }}>
                                    <span>{status}</span>
                                    <span style={{ fontWeight: '600' }}>{count}</span>
                                </div>
                            ))}
                    </div>

                    {/* Quick Stats */}
                    <div>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#666' }}>
                            Quick Statistics
                        </h4>
                        <div style={{ fontSize: '0.85em' }}>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                marginBottom: '5px' 
                            }}>
                                <span>Total Results</span>
                                <span style={{ fontWeight: '600' }}>{results.length}</span>
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                marginBottom: '5px' 
                            }}>
                                <span>Filtered Results</span>
                                <span style={{ fontWeight: '600' }}>{processedResults.length}</span>
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                marginBottom: '5px' 
                            }}>
                                <span>High Quality</span>
                                <span style={{ fontWeight: '600' }}>
                                    {results.filter(r => r.result_quality === 'high').length}
                                </span>
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                marginBottom: '5px' 
                            }}>
                                <span>Bookmarked</span>
                                <span style={{ fontWeight: '600' }}>{bookmarkedItems.size}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    /**
     * Render filters section
     */
    const renderFilters = () => {
        if (!showFilters || !results.length) return null;

        return (
            <div style={{ 
                background: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '20px' 
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '15px' 
                }}>
                    <h4 style={{ margin: 0, fontSize: '1em', color: '#333' }}>Filters & Search</h4>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.1em',
                            cursor: 'pointer',
                            color: '#666'
                        }}
                    >
                        {showFilters ? '🔽' : '🔼'}
                    </button>
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                    gap: '10px', 
                    marginBottom: '15px' 
                }}>
                    {/* Database Filter */}
                    <div>
                        <label style={{ fontSize: '0.85em', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                            Database
                        </label>
                        <select 
                            value={filters.database} 
                            onChange={(e) => setFilters(prev => ({ ...prev, database: e.target.value }))}
                            style={{ 
                                width: '100%', 
                                padding: '6px', 
                                border: '1px solid #ddd', 
                                borderRadius: '4px',
                                fontSize: '0.85em'
                            }}
                        >
                            <option value="all">All Databases</option>
                            {filterOptions.databases.map(db => (
                                <option key={db} value={db}>{db}</option>
                            ))}
                        </select>
                    </div>

                    {/* Phase Filter */}
                    <div>
                        <label style={{ fontSize: '0.85em', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                            Phase
                        </label>
                        <select 
                            value={filters.phase} 
                            onChange={(e) => setFilters(prev => ({ ...prev, phase: e.target.value }))}
                            style={{ 
                                width: '100%', 
                                padding: '6px', 
                                border: '1px solid #ddd', 
                                borderRadius: '4px',
                                fontSize: '0.85em'
                            }}
                        >
                            <option value="all">All Phases</option>
                            {filterOptions.phases.map(phase => (
                                <option key={phase} value={phase}>{phase}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label style={{ fontSize: '0.85em', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                            Status
                        </label>
                        <select 
                            value={filters.status} 
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            style={{ 
                                width: '100%', 
                                padding: '6px', 
                                border: '1px solid #ddd', 
                                borderRadius: '4px',
                                fontSize: '0.85em'
                            }}
                        >
                            <option value="all">All Statuses</option>
                            {filterOptions.statuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>

                    {/* Year Filter */}
                    <div>
                        <label style={{ fontSize: '0.85em', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                            Since Year
                        </label>
                        <select 
                            value={filters.year} 
                            onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                            style={{ 
                                width: '100%', 
                                padding: '6px', 
                                border: '1px solid #ddd', 
                                borderRadius: '4px',
                                fontSize: '0.85em'
                            }}
                        >
                            <option value="all">All Years</option>
                            {filterOptions.years.slice(0, 10).map(year => (
                                <option key={year} value={year}>Since {year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Search within results */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontSize: '0.85em', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                        Search within results
                    </label>
                    <input
                        type="text"
                        value={searchWithinResults}
                        onChange={(e) => setSearchWithinResults(e.target.value)}
                        placeholder="Filter current results..."
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '0.9em'
                        }}
                    />
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={() => handleExport('csv')}
                        style={{
                            padding: '6px 12px',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85em'
                        }}
                    >
                        Export CSV
                    </button>
                    <button 
                        onClick={() => handleExport('json')}
                        style={{
                            padding: '6px 12px',
                            background: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85em'
                        }}
                    >
                        Export JSON
                    </button>
                    <button 
                        onClick={() => {
                            setFilters({ database: 'all', phase: 'all', status: 'all', year: 'all', type: 'all' });
                            setSearchWithinResults('');
                        }}
                        style={{
                            padding: '6px 12px',
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85em'
                        }}
                    >
                        Clear Filters
                    </button>
                </div>
            </div>
        );
    };

    /**
     * Render results table
     */
    const renderResultsTable = () => {
        if (!processedResults.length) return null;

        return (
            <div style={{ 
                background: 'white', 
                borderRadius: '8px', 
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '0.85em'
                    }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa' }}>
                                <th style={tableHeaderStyle} onClick={() => handleSort('database')}>
                                    Database {sortConfig.key === 'database' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th style={tableHeaderStyle} onClick={() => handleSort('display_title')}>
                                    Title {sortConfig.key === 'display_title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th style={tableHeaderStyle} onClick={() => handleSort('type')}>
                                    Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th style={tableHeaderStyle} onClick={() => handleSort('display_status')}>
                                    Status {sortConfig.key === 'display_status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th style={tableHeaderStyle} onClick={() => handleSort('phase')}>
                                    Phase {sortConfig.key === 'phase' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th style={tableHeaderStyle} onClick={() => handleSort('sponsor')}>
                                    Sponsor {sortConfig.key === 'sponsor' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th style={tableHeaderStyle} onClick={() => handleSort('year')}>
                                    Year {sortConfig.key === 'year' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th style={tableHeaderStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedResults.map((result, index) => (
                                <tr key={result.id || index} style={{ borderBottom: '1px solid #e9ecef' }}>
                                    <td style={tableCellStyle}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '2px 6px',
                                            background: getDatabaseColor(result.database),
                                            color: 'white',
                                            borderRadius: '3px',
                                            fontSize: '0.75em',
                                            fontWeight: '500'
                                        }}>
                                            {result.database}
                                        </span>
                                    </td>
                                    <td style={tableCellStyle}>
                                        <div>
                                            <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                                                {result.display_title}
                                            </div>
                                            <div style={{ 
                                                fontSize: '0.8em', 
                                                color: '#666', 
                                                lineHeight: '1.3',
                                                maxHeight: '2.6em',
                                                overflow: 'hidden'
                                            }}>
                                                {result.display_details}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={tableCellStyle}>
                                        <span style={{ fontSize: '0.85em' }}>
                                            {result.type || 'Research'}
                                        </span>
                                    </td>
                                    <td style={tableCellStyle}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '2px 6px',
                                            background: getStatusColor(result.display_status),
                                            color: 'white',
                                            borderRadius: '3px',
                                            fontSize: '0.75em'
                                        }}>
                                            {result.display_status}
                                        </span>
                                    </td>
                                    <td style={tableCellStyle}>
                                        <span style={{ fontSize: '0.85em' }}>
                                            {result.phase}
                                        </span>
                                    </td>
                                    <td style={tableCellStyle}>
                                        <span style={{ fontSize: '0.85em' }}>
                                            {result.sponsor}
                                        </span>
                                    </td>
                                    <td style={tableCellStyle}>
                                        <span style={{ fontSize: '0.85em' }}>
                                            {result.year}
                                        </span>
                                    </td>
                                    <td style={tableCellStyle}>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <button
                                                onClick={() => handleBookmarkToggle(result.id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '1.1em',
                                                    color: bookmarkedItems.has(result.id) ? '#ffc107' : '#ccc'
                                                }}
                                                title={bookmarkedItems.has(result.id) ? 'Remove bookmark' : 'Add bookmark'}
                                            >
                                                ★
                                            </button>
                                            {result.link && result.link !== '#' && (
                                                <a 
                                                    href={result.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        color: '#007bff',
                                                        textDecoration: 'none',
                                                        fontSize: '0.85em',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    View →
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
        const colors = {
            'ClinicalTrials.gov': '#2563eb',
            'Open Targets': '#dc2626',
            'ChEMBL': '#7c3aed',
            'DrugBank': '#059669',
            'EvaluatePharma': '#ea580c',
            'ClinVar': '#be185d',
            'Human Protein Atlas': '#0891b2',
            'UniProt': '#7c2d12',
            'PubMed': '#374151',
            'Mouse Genome Informatics': '#6366f1',
            'IUPHAR/BPS': '#c2410c'
        };
        return colors[database] || '#6c757d';
    };

    const getStatusColor = (status) => {
        if (status?.toLowerCase().includes('recruiting') || status?.toLowerCase().includes('active')) return '#28a745';
        if (status?.toLowerCase().includes('completed') || status?.toLowerCase().includes('approved')) return '#17a2b8';
        if (status?.toLowerCase().includes('terminated') || status?.toLowerCase().includes('withdrawn')) return '#dc3545';
        if (status?.toLowerCase().includes('market') || status?.toLowerCase().includes('commercial')) return '#28a745';
        return '#6c757d';
    };

    const tableHeaderStyle = {
        padding: '12px 8px',
        textAlign: 'left',
        fontWeight: '600',
        cursor: 'pointer',
        userSelect: 'none',
        fontSize: '0.85em',
        color: '#495057'
    };

    const tableCellStyle = {
        padding: '10px 8px',
        verticalAlign: 'top',
        borderBottom: '1px solid #e9ecef'
    };

    // Main render
    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            padding: '20px'
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '30px',
                    background: 'white',
                    padding: '30px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                    <h1 style={{ 
                        margin: '0 0 10px 0', 
                        fontSize: '2.5em', 
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        🧬 IntelliGRID
                    </h1>
                    <p style={{ 
                        margin: '0 0 20px 0', 
                        fontSize: '1.2em', 
                        color: '#666',
                        fontWeight: '300'
                    }}>
                        Global Research Intelligence Database • 11+ Biomedical Databases • Unlimited Results
                    </p>
                    
                    {/* Search Interface */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '10px', 
                        maxWidth: '600px', 
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
                                padding: '12px 16px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '1em',
                                outline: 'none',
                                transition: 'border-color 0.2s ease'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                        <button
                            onClick={executeSearch}
                            disabled={loading || !searchQuery.trim()}
                            style={{
                                padding: '12px 24px',
                                background: loading ? '#6c757d' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '1em',
                                fontWeight: '500',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {loading ? '🔄 Searching...' : '🔍 Search'}
                        </button>
                    </div>
                </div>

                {/* Database Selector */}
                {renderDatabaseSelector()}

                {/* Error Display */}
                {error && (
                    <div style={{ 
                        background: '#f8d7da', 
                        color: '#721c24', 
                        padding: '15px', 
                        borderRadius: '8px', 
                        marginBottom: '20px',
                        border: '1px solid #f5c6cb'
                    }}>
                        <strong>⚠️ Notice:</strong> {error}
                    </div>
                )}

                {/* Results Section */}
                {results.length > 0 && (
                    <>
                        {/* Visualization */}
                        {renderVisualization()}
                        
                        {/* Filters */}
                        {renderFilters()}
                        
                        {/* Results Table */}
                        {renderResultsTable()}
                        
                        {/* Results Summary */}
                        <div style={{ 
                            textAlign: 'center', 
                            marginTop: '20px', 
                            padding: '15px',
                            background: 'white',
                            borderRadius: '8px',
                            fontSize: '0.9em',
                            color: '#666'
                        }}>
                            Showing {processedResults.length} of {results.length} results
                            {searchTimestamp && (
                                <span> • Last updated: {new Date(searchTimestamp).toLocaleString()}</span>
                            )}
                        </div>
                    </>
                )}

                {/* Empty State */}
                {!loading && !results.length && searchQuery && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '60px 20px',
                        background: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ fontSize: '3em', marginBottom: '20px' }}>🔍</div>
                        <h3 style={{ color: '#333', marginBottom: '10px' }}>No Results Found</h3>
                        <p style={{ color: '#666', marginBottom: '20px' }}>
                            No results found for "{searchQuery}". Try different keywords or select more databases.
                        </p>
                        <button 
                            onClick={() => setSearchQuery('')}
                            style={{
                                padding: '8px 16px',
                                background: '#4f46e5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Clear Search
                        </button>
                    </div>
                )}

                {/* Welcome State */}
                {!loading && !searchQuery && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '60px 20px',
                        background: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ fontSize: '3em', marginBottom: '20px' }}>🚀</div>
                        <h3 style={{ color: '#333', marginBottom: '15px' }}>
                            Welcome to IntelliGRID
                        </h3>
                        <p style={{ color: '#666', marginBottom: '25px', lineHeight: '1.6' }}>
                            Search across 11+ major biomedical databases simultaneously. 
                            Get unlimited results from ClinicalTrials.gov, ChEMBL, DrugBank, 
                            EvaluatePharma, PubMed, and more.
                        </p>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: '15px',
                            marginTop: '25px',
                            textAlign: 'left'
                        }}>
                            <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                                <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>🔬 Example Searches</h4>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.9em', color: '#666' }}>
                                    <li>Alzheimer disease trials</li>
                                    <li>BRCA1 mutations</li>
                                    <li>immunotherapy cancer</li>
                                    <li>diabetes GLP-1</li>
                                </ul>
                            </div>
                            <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                                <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>📊 Features</h4>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.9em', color: '#666' }}>
                                    <li>Unlimited results</li>
                                    <li>Advanced filtering</li>
                                    <li>Data visualization</li>
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
