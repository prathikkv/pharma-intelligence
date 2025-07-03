// components/PharmaceuticalIntelligenceSystem.js - EXACT DESIGN MATCH
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
    Search, Database, Activity, Zap, AlertCircle, Clock, FileText, ExternalLink, 
    RefreshCw, Brain, Sparkles, Filter, Download, BarChart3, PieChart, TrendingUp,
    Settings, ChevronDown, ChevronUp, SortAsc, SortDesc, Eye, EyeOff, Bookmark,
    Star, Heart, Share2, MoreVertical, Grid3X3, List, Map, Calendar, Globe
} from 'lucide-react';

const PharmaceuticalIntelligenceSystem = () => {
    // Core state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchStats, setSearchStats] = useState(null);
    const [error, setError] = useState(null);
    const [queryAnalysis, setQueryAnalysis] = useState(null);

    // UI state
    const [selectedDatabases, setSelectedDatabases] = useState([]);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [viewMode, setViewMode] = useState('table');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filterConfig, setFilterConfig] = useState({
        phase: '',
        status: '',
        database: '',
        year: '',
        searchTerm: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [bookmarkedResults, setBookmarkedResults] = useState(new Set());
    
    const searchInputRef = useRef(null);

    // Database configurations matching the exact design
    const databases = [
        {
            id: 'opentargets',
            name: 'OpenTargets',
            icon: '🎯',
            color: '#ff6b9d',
            count: '29K+',
            status: 'Live'
        },
        {
            id: 'clinicaltrials',
            name: 'ClinicalTrials.gov',
            icon: '🏥',
            color: '#a855f7',
            count: '480K+',
            status: 'Live'
        },
        {
            id: 'chembl',
            name: 'ChEMBL',
            icon: '💉',
            color: '#22c55e',
            count: '2.3M+',
            status: 'Live'
        },
        {
            id: 'drugbank',
            name: 'DrugBank',
            icon: '💊',
            color: '#ef4444',
            count: '14K+',
            status: 'Live'
        },
        {
            id: 'clinvar',
            name: 'ClinVar',
            icon: '🧬',
            color: '#3b82f6',
            count: '2.1M+',
            status: 'Live'
        },
        {
            id: 'mgi',
            name: 'MGI',
            icon: '🐭',
            color: '#f59e0b',
            count: '1.2M+',
            status: 'Live'
        },
        {
            id: 'hpa',
            name: 'Human Protein Atlas',
            icon: '🔬',
            color: '#06b6d4',
            count: '19K+',
            status: 'Live'
        },
        {
            id: 'iuphar',
            name: 'IUPHAR/BPS',
            icon: '📊',
            color: '#84cc16',
            count: '3.5K+',
            status: 'Live'
        },
        {
            id: 'uniprot',
            name: 'UniProt',
            icon: '🧪',
            color: '#8b5cf6',
            count: '240M+',
            status: 'Live'
        },
        {
            id: 'pubmed',
            name: 'PubMed',
            icon: '📚',
            color: '#10b981',
            count: '35M+',
            status: 'Live'
        },
        {
            id: 'evaluatepharma',
            name: 'EvaluatePharma',
            icon: '📈',
            color: '#6366f1',
            count: '50K+',
            status: 'Live'
        }
    ];

    // Execute multi-database search with enhanced OpenTargets handling
    const executeSearch = useCallback(async (query) => {
        if (!query.trim()) return;
        if (selectedDatabases.length === 0) {
            setError('Please select at least one database to search');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSearchResults([]);
        setSearchStats(null);
        setQueryAnalysis(null);

        try {
            console.log('🔍 Executing multi-database search for:', query);
            console.log('📊 Selected databases:', selectedDatabases);
            
            const allResults = [];
            const searchPromises = selectedDatabases.map(async (dbId) => {
                try {
                    // Enhanced OpenTargets search with fallback strategies
                    let endpoint = `/api/search/${dbId}`;
                    let searchParams = `query=${encodeURIComponent(query)}&limit=200`;
                    
                    if (dbId === 'opentargets') {
                        // Try multiple OpenTargets strategies
                        console.log('🎯 Enhanced OpenTargets search for:', query);
                        return await enhancedOpenTargetsSearch(query);
                    }
                    
                    const response = await fetch(`${endpoint}?${searchParams}`);
                    
                    if (!response.ok) {
                        throw new Error(`${dbId} API error: ${response.status}`);
                    }

                    const data = await response.json();
                    
                    if (data.error) {
                        throw new Error(data.message || data.error);
                    }

                    // Add database info to results
                    const enhancedResults = (data.results || []).map(result => ({
                        ...result,
                        _source_database: dbId,
                        _database_name: databases.find(db => db.id === dbId)?.name || dbId,
                        _database_color: databases.find(db => db.id === dbId)?.color || '#6B7280'
                    }));

                    return {
                        database: dbId,
                        results: enhancedResults,
                        total: data.total || enhancedResults.length,
                        responseTime: data.response_time || 0,
                        parsed_query: data.parsed_query || data.ai_analysis
                    };

                } catch (error) {
                    console.error(`❌ ${dbId} search failed:`, error);
                    return {
                        database: dbId,
                        results: [],
                        total: 0,
                        error: error.message,
                        responseTime: 0
                    };
                }
            });

            const searchResults = await Promise.all(searchPromises);
            
            // Combine all results
            searchResults.forEach(dbResult => {
                if (dbResult.results && dbResult.results.length > 0) {
                    allResults.push(...dbResult.results);
                }
            });

            // Calculate statistics
            const totalResults = allResults.length;
            const maxResponseTime = Math.max(...searchResults.map(r => r.responseTime));
            const successfulDatabases = searchResults.filter(r => !r.error && r.results.length > 0).length;
            const failedDatabases = searchResults.filter(r => r.error).length;

            setSearchResults(allResults);
            setSearchStats({
                total: totalResults,
                responseTime: maxResponseTime,
                successfulDatabases,
                failedDatabases,
                databaseBreakdown: searchResults.map(r => ({
                    database: r.database,
                    count: r.results?.length || 0,
                    total: r.total,
                    responseTime: r.responseTime,
                    error: r.error
                }))
            });

            // Set query analysis from the first successful result
            const firstAnalysis = searchResults.find(r => r.parsed_query)?.parsed_query;
            if (firstAnalysis) {
                setQueryAnalysis(firstAnalysis);
            }

            console.log(`✅ Multi-database search completed: ${totalResults} total results from ${successfulDatabases} databases`);

        } catch (error) {
            console.error('🚨 Search execution error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [selectedDatabases]);

    // Enhanced OpenTargets search with multiple strategies
    const enhancedOpenTargetsSearch = async (query) => {
        const strategies = [
            // Strategy 1: Direct drug search
            async () => {
                const response = await fetch('/api/search/opentargets', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await response.json();
                return data;
            },
            
            // Strategy 2: Fallback general search if no drug found
            async () => {
                console.log('🔄 OpenTargets fallback: trying general search');
                const generalQuery = `
                    query generalSearch($queryString: String!) {
                        search(queryString: $queryString) {
                            hits {
                                id
                                name
                                entity
                                ... on Drug {
                                    id
                                    name
                                    drugType
                                    isApproved
                                }
                                ... on Disease {
                                    id
                                    name
                                }
                                ... on Target {
                                    id
                                    approvedSymbol
                                }
                            }
                        }
                    }
                `;
                
                const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: generalQuery,
                        variables: { queryString: query }
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const hits = data.data?.search?.hits || [];
                    
                    const results = hits.map((hit, index) => ({
                        id: `OT-${hit.entity}-${hit.id}-${index}`,
                        database: 'Open Targets',
                        title: hit.name || hit.id,
                        type: `${hit.entity} - ${hit.drugType || 'General'}`,
                        status_significance: hit.entity,
                        details: `${hit.entity}: ${hit.name || hit.id}`,
                        phase: 'N/A',
                        status: hit.entity,
                        sponsor: 'N/A',
                        year: new Date().getFullYear(),
                        enrollment: 'N/A',
                        link: `https://platform.opentargets.org/${hit.entity}/${hit.id}`,
                        entity_type: hit.entity,
                        entity_id: hit.id,
                        entity_name: hit.name,
                        raw_data: hit
                    }));
                    
                    return {
                        results: results,
                        total: results.length,
                        response_time: 0
                    };
                }
                
                return { results: [], total: 0 };
            }
        ];

        for (const strategy of strategies) {
            try {
                const result = await strategy();
                if (result.results && result.results.length > 0) {
                    console.log(`✅ OpenTargets strategy succeeded: ${result.results.length} results`);
                    return {
                        database: 'opentargets',
                        results: result.results.map(r => ({
                            ...r,
                            _source_database: 'opentargets',
                            _database_name: 'OpenTargets',
                            _database_color: '#ff6b9d'
                        })),
                        total: result.total,
                        responseTime: result.response_time || 0
                    };
                }
            } catch (error) {
                console.warn('OpenTargets strategy failed:', error);
                continue;
            }
        }

        console.log('❌ All OpenTargets strategies failed');
        return {
            database: 'opentargets',
            results: [],
            total: 0,
            error: 'No results found',
            responseTime: 0
        };
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            executeSearch(searchQuery.trim());
        }
    };

    const toggleDatabase = (dbId) => {
        setSelectedDatabases(prev => 
            prev.includes(dbId) 
                ? prev.filter(id => id !== dbId)
                : [...prev, dbId]
        );
    };

    const selectAllDatabases = () => {
        setSelectedDatabases(databases.map(db => db.id));
    };

    const clearAllDatabases = () => {
        setSelectedDatabases([]);
    };

    // Enhanced filtering and sorting
    const filteredAndSortedResults = useMemo(() => {
        let filtered = searchResults.filter(result => {
            if (filterConfig.phase && !result.phase?.toLowerCase().includes(filterConfig.phase.toLowerCase())) return false;
            if (filterConfig.status && !result.status?.toLowerCase().includes(filterConfig.status.toLowerCase())) return false;
            if (filterConfig.database && result._source_database !== filterConfig.database) return false;
            if (filterConfig.year && result.year && result.year.toString() !== filterConfig.year) return false;
            if (filterConfig.searchTerm && !result.title?.toLowerCase().includes(filterConfig.searchTerm.toLowerCase())) return false;
            return true;
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [searchResults, filterConfig, sortConfig]);

    // CSV Export functionality
    const exportToCSV = () => {
        const headers = [
            'Database', 'Title', 'Type', 'Phase', 'Status', 'Year', 
            'Enrollment', 'Details', 'Link'
        ];
        
        const csvData = filteredAndSortedResults.map(result => [
            result._database_name || result.database,
            result.title || '',
            result.type || '',
            result.phase || '',
            result.status || '',
            result.year || '',
            result.enrollment || '',
            result.details || '',
            result.link || ''
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pharma-intelligence-search-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Auto-focus search input on page load
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
            {/* Header - Exact Design Match */}
            <header className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-700"></div>
                <div className="relative px-6 py-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                    <Brain className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold text-white mb-1">
                                        NextGen Pharma Intelligence
                                    </h1>
                                    <p className="text-purple-100 text-lg">
                                        The IQVia Alternative • Powered by Claude AI • Unlimited Results
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-green-500 text-white px-4 py-2 rounded-full font-semibold">
                                    Production
                                </div>
                                <div className="text-white text-right">
                                    <div className="font-semibold">11 databases online</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="bg-gray-50 min-h-screen -mt-4 rounded-t-3xl">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Live Database Ecosystem - Exact Design Match */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Globe className="w-6 h-6 text-blue-600" />
                                <h2 className="text-2xl font-semibold text-gray-800">
                                    Live Database Ecosystem
                                </h2>
                            </div>
                            <div className="text-gray-600">
                                <span className="font-medium">{selectedDatabases.length} selected</span>
                                <span className="mx-2">•</span>
                                <span>Unlimited Results</span>
                            </div>
                        </div>

                        {/* Database Grid - Exact Layout */}
                        <div className="grid grid-cols-4 gap-6 mb-6">
                            {databases.map(db => (
                                <div
                                    key={db.id}
                                    onClick={() => toggleDatabase(db.id)}
                                    className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                                        selectedDatabases.includes(db.id)
                                            ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                                    }`}
                                >
                                    <div className="text-center">
                                        <div className="text-4xl mb-3">{db.icon}</div>
                                        <h3 className="font-semibold text-gray-800 mb-2">{db.name}</h3>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-sm text-green-600 font-medium">{db.status}</span>
                                        </div>
                                        <div className="text-sm font-medium text-gray-600">{db.count}</div>
                                    </div>
                                    {selectedDatabases.includes(db.id) && (
                                        <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs">✓</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons - Exact Design */}
                        <div className="flex gap-3">
                            <button 
                                onClick={selectAllDatabases}
                                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                            >
                                Select All ({databases.length})
                            </button>
                            <button 
                                onClick={clearAllDatabases}
                                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    {/* Search Section */}
                    {selectedDatabases.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                            <form onSubmit={handleSearchSubmit} className="relative">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Search className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Ask me anything... (e.g., 'List diseases in Phase-2 for Imatinib')"
                                        className="w-full pl-12 pr-32 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                                        disabled={isLoading}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center gap-3 pr-4">
                                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                            {selectedDatabases.length} DBs
                                        </span>
                                        <button
                                            type="submit"
                                            disabled={isLoading || !searchQuery.trim()}
                                            className={`bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-semibold transition-colors ${
                                                isLoading ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <RefreshCw className="w-5 h-5 animate-spin mr-2 inline" />
                                                    Searching...
                                                </>
                                            ) : (
                                                'Search'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {/* Query Analysis */}
                            {queryAnalysis && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Activity className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium text-blue-800">AI Analysis:</span>
                                        {queryAnalysis.drugName && (
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                Drug: {queryAnalysis.drugName}
                                            </span>
                                        )}
                                        {queryAnalysis.phase && (
                                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                                Phase: {queryAnalysis.phase}
                                            </span>
                                        )}
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                            Intent: {queryAnalysis.intent}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-center gap-2 text-red-800">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    <span className="font-medium">Search Error</span>
                                    <p className="text-sm mt-1">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search Statistics */}
                    {searchStats && !error && (
                        <div className="mb-6 bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-6">
                                    <span className="text-lg font-semibold flex items-center gap-2">
                                        <Database className="w-5 h-5 text-blue-600" />
                                        {filteredAndSortedResults.length} results
                                    </span>
                                    <span className="text-sm text-gray-600 flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {searchStats.responseTime}ms
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {searchResults.length > 0 && (
                                        <button 
                                            onClick={exportToCSV}
                                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Export CSV
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Database Breakdown */}
                            <div className="flex flex-wrap gap-3">
                                {searchStats.databaseBreakdown.map(db => {
                                    const dbConfig = databases.find(d => d.id === db.database);
                                    return (
                                        <div 
                                            key={db.database}
                                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100"
                                        >
                                            <span className="text-lg">{dbConfig?.icon}</span>
                                            <span className="font-medium">{dbConfig?.name}</span>
                                            <span 
                                                className="px-2 py-1 rounded-full text-xs font-bold text-white"
                                                style={{ backgroundColor: dbConfig?.color }}
                                            >
                                                {db.count}
                                            </span>
                                            {db.error && (
                                                <span className="text-red-500 text-xs">⚠️</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Results Table */}
                    {filteredAndSortedResults.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left p-4 font-semibold">Title</th>
                                            <th className="text-left p-4 font-semibold">Database</th>
                                            <th className="text-left p-4 font-semibold">Phase</th>
                                            <th className="text-left p-4 font-semibold">Status</th>
                                            <th className="text-left p-4 font-semibold">Details</th>
                                            <th className="text-left p-4 font-semibold">Trials</th>
                                            <th className="text-center p-4 font-semibold">Link</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAndSortedResults.map((result, index) => (
                                            <tr key={result.id || index} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-medium text-gray-900">
                                                        {result.drug_name || result.title}
                                                    </div>
                                                    {result.disease_name && (
                                                        <div className="text-sm text-gray-600">
                                                            for {result.disease_name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span 
                                                        className="px-3 py-1 rounded-full text-xs font-medium text-white"
                                                        style={{ backgroundColor: result._database_color }}
                                                    >
                                                        {databases.find(db => db.id === result._source_database)?.icon} {result._database_name}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        result.phase?.includes('4') ? 'bg-green-100 text-green-800' :
                                                        result.phase?.includes('3') ? 'bg-blue-100 text-blue-800' :
                                                        result.phase?.includes('2') ? 'bg-yellow-100 text-yellow-800' :
                                                        result.phase?.includes('1') ? 'bg-orange-100 text-orange-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {result.phase || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-gray-700">
                                                    {result.status || 'Unknown'}
                                                </td>
                                                <td className="p-4 max-w-md">
                                                    <div className="text-sm text-gray-600 truncate">
                                                        {result.details || 'No details available'}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">
                                                    {result.clinical_trial_count || result.enrollment || 'N/A'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {result.link ? (
                                                        <a 
                                                            href={result.link} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* No Results */}
                    {!isLoading && selectedDatabases.length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Database className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Select Databases to Start</h3>
                            <p className="text-gray-600">
                                Choose one or more databases from the ecosystem above to begin searching.
                            </p>
                        </div>
                    )}

                    {!isLoading && filteredAndSortedResults.length === 0 && searchStats && !error && selectedDatabases.length > 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                            <p className="text-gray-600 mb-4">
                                Try a different search query or select additional databases.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Searching {selectedDatabases.length} databases...
                            </h3>
                            <p className="text-gray-600 text-sm mb-4">
                                AI agent analyzing your query across multiple sources
                            </p>
                            <div className="flex flex-wrap gap-1 justify-center">
                                {selectedDatabases.map(dbId => {
                                    const db = databases.find(d => d.id === dbId);
                                    return db ? (
                                        <span 
                                            key={dbId}
                                            className="text-xs px-2 py-1 rounded text-white animate-pulse"
                                            style={{ backgroundColor: db.color }}
                                        >
                                            {db.icon}
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PharmaceuticalIntelligenceSystem;
