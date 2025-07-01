import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, Filter, Database, BarChart3, TrendingUp, AlertCircle, CheckCircle, Clock, Star, StarOff, Eye, EyeOff, Loader2, RefreshCw, ArrowUpDown, ChevronDown, ChevronUp, X } from 'lucide-react';

const PharmaceuticalIntelligenceSystem = () => {
    // Core State Management
    const [selectedDatabases, setSelectedDatabases] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchLogs, setSearchLogs] = useState([]);
    const [showLogs, setShowLogs] = useState(false);
    const [bookmarkedResults, setBookmarkedResults] = useState([]);
    
    // Filter and Sorting State
    const [filters, setFilters] = useState({
        phase: '',
        status: '',
        sponsor: '',
        yearRange: { start: '', end: '' },
        enrollmentRange: { min: '', max: '' }
    });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [searchWithinResults, setSearchWithinResults] = useState('');
    const [databaseFilter, setDatabaseFilter] = useState('');
    
    // UI State
    const [activeTab, setActiveTab] = useState('search');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [expandedResult, setExpandedResult] = useState(null);

    // Database Configuration - Production Ready (10 databases)
    const databases = [
        { 
            id: 'clinicaltrials', 
            name: 'ClinicalTrials.gov', 
            description: '480K+ clinical trials',
            endpoint: '/api/search/clinicaltrials',
            icon: '🔬',
            category: 'Clinical'
        },
        { 
            id: 'opentargets', 
            name: 'Open Targets', 
            description: '29K+ target-disease associations',
            endpoint: '/api/search/opentargets',
            icon: '🎯',
            category: 'Targets'
        },
        { 
            id: 'clinvar', 
            name: 'ClinVar', 
            description: '2.1M+ genetic variants',
            endpoint: '/api/search/clinvar',
            icon: '🧬',
            category: 'Genetics'
        },
        { 
            id: 'hpa', 
            name: 'Human Protein Atlas', 
            description: '19K+ protein expressions',
            endpoint: '/api/search/hpa',
            icon: '🔬',
            category: 'Proteins'
        },
        { 
            id: 'chembl', 
            name: 'ChEMBL', 
            description: '2.3M+ bioactivity records',
            endpoint: '/api/search/chembl',
            icon: '⚗️',
            category: 'Chemistry'
        },
        { 
            id: 'drugbank', 
            name: 'DrugBank', 
            description: '14K+ drug entries',
            endpoint: '/api/search/drugbank',
            icon: '💊',
            category: 'Drugs'
        },
        { 
            id: 'uniprot', 
            name: 'UniProt', 
            description: '240M+ protein sequences',
            endpoint: '/api/search/uniprot',
            icon: '🧬',
            category: 'Proteins'
        },
        { 
            id: 'pubmed', 
            name: 'PubMed', 
            description: '35M+ research papers',
            endpoint: '/api/search/pubmed',
            icon: '📚',
            category: 'Literature'
        },
        { 
            id: 'mgi', 
            name: 'MGI', 
            description: '1.2M+ mouse genome records',
            endpoint: '/api/search/mgi',
            icon: '🐭',
            category: 'Genomics'
        },
        { 
            id: 'iuphar', 
            name: 'IUPHAR/BPS', 
            description: '3.5K+ pharmacology targets',
            endpoint: '/api/search/iuphar',
            icon: '💉',
            category: 'Pharmacology'
        }
    ];

    // Initialize with all databases selected
    useEffect(() => {
        setSelectedDatabases(databases.map(db => db.id));
    }, []);

    // Production-Level Search Function
    const executeSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setError('Please enter a search query');
            return;
        }

        if (selectedDatabases.length === 0) {
            setError('Please select at least one database');
            return;
        }

        setLoading(true);
        setError(null);
        setResults([]);
        
        const searchStartTime = Date.now();
        const searchId = `search_${searchStartTime}`;
        
        // Add search to logs
        const logEntry = {
            id: searchId,
            query: searchQuery,
            databases: selectedDatabases,
            timestamp: new Date().toISOString(),
            status: 'running'
        };
        setSearchLogs(prev => [logEntry, ...prev]);

        try {
            // Execute parallel searches for better performance
            const searchPromises = selectedDatabases.map(async (dbId) => {
                const database = databases.find(db => db.id === dbId);
                try {
                    const response = await fetch(`${database.endpoint}?query=${encodeURIComponent(searchQuery)}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    
                    // Normalize data structure across different APIs
                    return {
                        database: dbId,
                        databaseName: database.name,
                        results: data.results || data.data || [],
                        total: data.total || data.count || 0,
                        metadata: {
                            searchTime: Date.now() - searchStartTime,
                            source: database.name
                        }
                    };
                } catch (error) {
                    console.error(`Error searching ${database.name}:`, error);
                    return {
                        database: dbId,
                        databaseName: database.name,
                        results: [],
                        total: 0,
                        error: error.message,
                        metadata: {
                            searchTime: Date.now() - searchStartTime,
                            source: database.name
                        }
                    };
                }
            });

            const searchResults = await Promise.all(searchPromises);
            
            // Combine and enhance results
            const combinedResults = searchResults.reduce((acc, result) => {
                if (result.results && result.results.length > 0) {
                    const enhancedResults = result.results.map(item => ({
                        ...item,
                        _database: result.database,
                        _databaseName: result.databaseName,
                        _searchTime: result.metadata.searchTime,
                        _id: `${result.database}_${item.id || Math.random()}`
                    }));
                    acc.push(...enhancedResults);
                }
                return acc;
            }, []);

            setResults(combinedResults);
            
            // Update search log
            setSearchLogs(prev => prev.map(log => 
                log.id === searchId 
                    ? { 
                        ...log, 
                        status: 'completed',
                        resultsCount: combinedResults.length,
                        duration: Date.now() - searchStartTime,
                        databases: searchResults.map(r => ({
                            name: r.databaseName,
                            count: r.total,
                            error: r.error
                        }))
                    }
                    : log
            ));

        } catch (error) {
            console.error('Search execution error:', error);
            setError(`Search failed: ${error.message}`);
            
            // Update search log with error
            setSearchLogs(prev => prev.map(log => 
                log.id === searchId 
                    ? { 
                        ...log, 
                        status: 'failed',
                        error: error.message,
                        duration: Date.now() - searchStartTime
                    }
                    : log
            ));
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedDatabases]);

    // Enhanced Filtering and Sorting
    const filteredAndSortedResults = useMemo(() => {
        let filtered = [...results];

        // Apply search within results
        if (searchWithinResults) {
            const searchTerm = searchWithinResults.toLowerCase();
            filtered = filtered.filter(item => 
                Object.values(item).some(value => 
                    value && value.toString().toLowerCase().includes(searchTerm)
                )
            );
        }

        // Apply database filter
        if (databaseFilter) {
            filtered = filtered.filter(item => item._database === databaseFilter);
        }

        // Apply advanced filters
        if (filters.phase) {
            filtered = filtered.filter(item => 
                item.phase && item.phase.toLowerCase().includes(filters.phase.toLowerCase())
            );
        }

        if (filters.status) {
            filtered = filtered.filter(item => 
                item.status && item.status.toLowerCase().includes(filters.status.toLowerCase())
            );
        }

        if (filters.sponsor) {
            filtered = filtered.filter(item => 
                item.sponsor && item.sponsor.toLowerCase().includes(filters.sponsor.toLowerCase())
            );
        }

        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue === bValue) return 0;
                
                const comparison = aValue < bValue ? -1 : 1;
                return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
            });
        }

        return filtered;
    }, [results, searchWithinResults, databaseFilter, filters, sortConfig]);

    // Analytics and Insights
    const analytics = useMemo(() => {
        const databaseDistribution = databases.map(db => ({
            name: db.name,
            count: results.filter(item => item._database === db.id).length,
            icon: db.icon
        })).filter(db => db.count > 0);

        const statusDistribution = results.reduce((acc, item) => {
            const status = item.status || 'Unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const phaseDistribution = results.reduce((acc, item) => {
            const phase = item.phase || 'Unknown';
            acc[phase] = (acc[phase] || 0) + 1;
            return acc;
        }, {});

        return {
            total: results.length,
            databaseDistribution,
            statusDistribution,
            phaseDistribution,
            topSponsors: Object.entries(
                results.reduce((acc, item) => {
                    const sponsor = item.sponsor || 'Unknown';
                    acc[sponsor] = (acc[sponsor] || 0) + 1;
                    return acc;
                }, {})
            ).sort(([,a], [,b]) => b - a).slice(0, 5)
        };
    }, [results]);

    // Bookmark Management
    const toggleBookmark = useCallback((resultId) => {
        setBookmarkedResults(prev => {
            const isBookmarked = prev.includes(resultId);
            if (isBookmarked) {
                return prev.filter(id => id !== resultId);
            } else {
                return [...prev, resultId];
            }
        });
    }, []);

    // Export Functionality
    const exportResults = useCallback(() => {
        const csvHeaders = ['Database', 'Title', 'ID', 'Status', 'Phase', 'Sponsor', 'Date'];
        const csvData = filteredAndSortedResults.map(item => [
            item._databaseName,
            item.title || item.brief_title || 'N/A',
            item.id || item.nct_id || 'N/A',
            item.status || 'N/A',
            item.phase || 'N/A',
            item.sponsor || 'N/A',
            item.start_date || item.study_first_submitted_date || 'N/A'
        ]);

        const csvContent = [csvHeaders, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pharma_intelligence_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }, [filteredAndSortedResults]);

    // Enhanced Logs Display
    const renderLogsDisplay = () => {
        if (!showLogs || searchLogs.length === 0) return null;

        return (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Search History & Logs</h3>
                    <button
                        onClick={() => setShowLogs(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                    {searchLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-white rounded border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    {log.status === 'running' && <Loader2 className="animate-spin text-blue-500" size={16} />}
                                    {log.status === 'completed' && <CheckCircle className="text-green-500" size={16} />}
                                    {log.status === 'failed' && <AlertCircle className="text-red-500" size={16} />}
                                    <span className="font-medium">{log.query}</span>
                                </div>
                                <span className="text-sm text-gray-500">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            
                            {log.resultsCount !== undefined && (
                                <div className="mt-2 text-sm text-gray-600">
                                    Found {log.resultsCount} results in {log.duration}ms
                                </div>
                            )}
                            
                            {log.error && (
                                <div className="mt-2 text-sm text-red-600">
                                    Error: {log.error}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Database Selection Component
    const renderDatabaseSelection = () => (
        <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Select Databases</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {databases.map((db) => (
                    <div
                        key={db.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedDatabases.includes(db.id)
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                            setSelectedDatabases(prev => 
                                prev.includes(db.id)
                                    ? prev.filter(id => id !== db.id)
                                    : [...prev, db.id]
                            );
                        }}
                    >
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">{db.icon}</span>
                            <div className="flex-1">
                                <div className="font-medium text-gray-800">{db.name}</div>
                                <div className="text-sm text-gray-600">{db.description}</div>
                                <div className="text-xs text-gray-500 mt-1">{db.category}</div>
                            </div>
                            <div className={`w-4 h-4 rounded border-2 ${
                                selectedDatabases.includes(db.id)
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-gray-300'
                            }`}>
                                {selectedDatabases.includes(db.id) && (
                                    <CheckCircle className="text-white" size={16} />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-4 flex space-x-2">
                <button
                    onClick={() => setSelectedDatabases(databases.map(db => db.id))}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                    Select All
                </button>
                <button
                    onClick={() => setSelectedDatabases([])}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                    Clear All
                </button>
                <div className="flex-1"></div>
                <span className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded">
                    {selectedDatabases.length} of {databases.length} selected
                </span>
            </div>
        </div>
    );

    // Analytics Display
    const renderAnalytics = () => {
        if (results.length === 0) return null;

        return (
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                    <BarChart3 className="mr-2" size={20} />
                    Search Analytics
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Database Distribution */}
                    <div>
                        <h4 className="font-medium mb-3 text-gray-700">Database Distribution</h4>
                        <div className="space-y-2">
                            {analytics.databaseDistribution.map((db) => (
                                <div key={db.name} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span>{db.icon}</span>
                                        <span className="text-sm text-gray-600">{db.name}</span>
                                    </div>
                                    <span className="font-medium text-blue-600">{db.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Distribution */}
                    <div>
                        <h4 className="font-medium mb-3 text-gray-700">Status Distribution</h4>
                        <div className="space-y-2">
                            {Object.entries(analytics.statusDistribution).map(([status, count]) => (
                                <div key={status} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">{status}</span>
                                    <span className="font-medium text-green-600">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Phase Distribution */}
                    <div>
                        <h4 className="font-medium mb-3 text-gray-700">Phase Distribution</h4>
                        <div className="space-y-2">
                            {Object.entries(analytics.phaseDistribution).map(([phase, count]) => (
                                <div key={phase} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">{phase}</span>
                                    <span className="font-medium text-purple-600">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-800">
                            Total Results: {analytics.total}
                        </span>
                        <button
                            onClick={exportResults}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                            <Download size={16} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-6 bg-white">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Pharmaceutical Intelligence System
                </h1>
                <p className="text-gray-600">
                    Advanced multi-database search and analysis platform for pharmaceutical research
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {['search', 'analytics', 'bookmarks'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Search Tab */}
            {activeTab === 'search' && (
                <>
                    {renderDatabaseSelection()}
                    
                    {/* Search Interface */}
                    <div className="mb-6 p-6 bg-gray-50 rounded-lg border">
                        <div className="flex space-x-4 mb-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Enter your research query (e.g., 'Alzheimer disease trials', 'BRCA1 mutations')"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    onKeyPress={(e) => e.key === 'Enter' && executeSearch()}
                                />
                            </div>
                            <button
                                onClick={executeSearch}
                                disabled={loading || !searchQuery.trim() || selectedDatabases.length === 0}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>Searching...</span>
                                    </>
                                ) : (
                                    <>
                                        <Search size={20} />
                                        <span>Execute AI Analysis</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Search Controls */}
                        <div className="flex items-center space-x-4 text-sm">
                            <button
                                onClick={() => setShowLogs(!showLogs)}
                                className="flex items-center space-x-1 text-gray-600 hover:text-gray-800"
                            >
                                {showLogs ? <EyeOff size={16} /> : <Eye size={16} />}
                                <span>{showLogs ? 'Hide' : 'Show'} Logs</span>
                            </button>
                            
                            <button
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className="flex items-center space-x-1 text-gray-600 hover:text-gray-800"
                            >
                                <Filter size={16} />
                                <span>Advanced Filters</span>
                                {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center space-x-2 text-red-700">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        </div>
                    )}

                    {/* Logs Display */}
                    {renderLogsDisplay()}

                    {/* Analytics */}
                    {renderAnalytics()}

                    {/* Results Table */}
                    {filteredAndSortedResults.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        Search Results ({filteredAndSortedResults.length})
                                    </h3>
                                    <div className="flex items-center space-x-4">
                                        <input
                                            type="text"
                                            value={searchWithinResults}
                                            onChange={(e) => setSearchWithinResults(e.target.value)}
                                            placeholder="Search within results..."
                                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                                        />
                                        <select
                                            value={databaseFilter}
                                            onChange={(e) => setDatabaseFilter(e.target.value)}
                                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                                        >
                                            <option value="">All Databases</option>
                                            {databases.map(db => (
                                                <option key={db.id} value={db.id}>
                                                    {db.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <button
                                                    onClick={() => setSortConfig({
                                                        key: '_databaseName',
                                                        direction: sortConfig.key === '_databaseName' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                                                    })}
                                                    className="flex items-center space-x-1 hover:text-gray-700"
                                                >
                                                    <span>Database</span>
                                                    <ArrowUpDown size={12} />
                                                </button>
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Title
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Phase
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredAndSortedResults.map((result) => (
                                            <tr key={result._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-lg">
                                                            {databases.find(db => db.id === result._database)?.icon}
                                                        </span>
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {result._databaseName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">
                                                        {result.title || result.brief_title || 'N/A'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        ID: {result.id || result.nct_id || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        result.status === 'Recruiting' ? 'bg-green-100 text-green-800' :
                                                        result.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                                                        result.status === 'Active' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {result.status || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {result.phase || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => toggleBookmark(result._id)}
                                                            className={`p-1 rounded hover:bg-gray-100 ${
                                                                bookmarkedResults.includes(result._id)
                                                                    ? 'text-yellow-500'
                                                                    : 'text-gray-400'
                                                            }`}
                                                        >
                                                            {bookmarkedResults.includes(result._id) ? 
                                                                <Star size={16} fill="currentColor" /> : 
                                                                <StarOff size={16} />
                                                            }
                                                        </button>
                                                        <button
                                                            onClick={() => setExpandedResult(
                                                                expandedResult === result._id ? null : result._id
                                                            )}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            {expandedResult === result._id ? 'Collapse' : 'Expand'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
                    {renderAnalytics()}
                    {results.length === 0 && (
                        <div className="text-center py-12">
                            <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600">No data available. Please perform a search first.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Bookmarks Tab */}
            {activeTab === 'bookmarks' && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Bookmarked Results</h2>
                    {bookmarkedResults.length === 0 ? (
                        <div className="text-center py-12">
                            <Star size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600">No bookmarked results yet. Star results to save them here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {results.filter(result => bookmarkedResults.includes(result._id)).map((result) => (
                                <div key={result._id} className="p-4 border border-gray-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">
                                                {result.title || result.brief_title || 'N/A'}
                                            </h3>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {result._databaseName} • {result.status || 'Unknown Status'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => toggleBookmark(result._id)}
                                            className="text-yellow-500 hover:text-yellow-700"
                                        >
                                            <Star size={20} fill="currentColor" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PharmaceuticalIntelligenceSystem;