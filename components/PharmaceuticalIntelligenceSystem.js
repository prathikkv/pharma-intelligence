// components/PharmaceuticalIntelligenceSystem.js - AMAZING UI with ALL DATABASES
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
    Search, Database, Activity, Zap, AlertCircle, Clock, FileText, ExternalLink, 
    RefreshCw, Brain, Sparkles, Filter, Download, BarChart3, PieChart, TrendingUp,
    Settings, ChevronDown, ChevronUp, SortAsc, SortDesc, Eye, EyeOff, Bookmark,
    Star, Heart, Share2, MoreVertical, Grid3X3, List, Map, Calendar
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
    const [selectedDatabases, setSelectedDatabases] = useState(['opentargets']);
    const [showDatabaseSelector, setShowDatabaseSelector] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // table, cards, chart
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

    // Database configurations with all available databases
    const databases = [
        {
            id: 'opentargets',
            name: 'Open Targets',
            description: 'Target-disease associations and drug evidence',
            color: '#3B82F6',
            icon: '🎯',
            count: '29K+ associations'
        },
        {
            id: 'clinicaltrials',
            name: 'ClinicalTrials.gov',
            description: 'Clinical trial registry and results',
            color: '#10B981',
            icon: '🏥',
            count: '480K+ trials'
        },
        {
            id: 'chembl',
            name: 'ChEMBL',
            description: 'Bioactivity database for drug discovery',
            color: '#F59E0B',
            icon: '🧪',
            count: '2.3M+ bioactivities'
        },
        {
            id: 'pubmed',
            name: 'PubMed',
            description: 'Biomedical literature database',
            color: '#8B5CF6',
            icon: '📚',
            count: '35M+ papers'
        },
        {
            id: 'drugbank',
            name: 'DrugBank',
            description: 'Comprehensive drug and target database',
            color: '#EF4444',
            icon: '💊',
            count: '14K+ drugs'
        },
        {
            id: 'clinvar',
            name: 'ClinVar',
            description: 'Clinical significance of genetic variants',
            color: '#06B6D4',
            icon: '🧬',
            count: '2.1M+ variants'
        },
        {
            id: 'uniprot',
            name: 'UniProt',
            description: 'Protein sequence and annotation',
            color: '#84CC16',
            icon: '🔬',
            count: '240M+ proteins'
        },
        {
            id: 'hpa',
            name: 'Human Protein Atlas',
            description: 'Protein expression in tissues and cells',
            color: '#F97316',
            icon: '🗂️',
            count: '19K+ proteins'
        },
        {
            id: 'mgi',
            name: 'Mouse Genome Informatics',
            description: 'Mouse genome and phenotype data',
            color: '#A855F7',
            icon: '🐭',
            count: '1.2M+ records'
        },
        {
            id: 'iuphar',
            name: 'IUPHAR/BPS',
            description: 'Pharmacology targets and interactions',
            color: '#EC4899',
            icon: '⚗️',
            count: '3.5K+ targets'
        }
    ];

    const exampleQueries = [
        {
            query: "List diseases in Phase-2 for Imatinib",
            description: "Find all diseases where Imatinib is in Phase 2 clinical trials",
            category: "Drug-Phase Analysis",
            databases: ['opentargets', 'clinicaltrials']
        },
        {
            query: "Pembrolizumab Phase 3 diseases",
            description: "Pembrolizumab Phase 3 disease indications", 
            category: "Drug-Phase Analysis",
            databases: ['opentargets', 'clinicaltrials']
        },
        {
            query: "BRCA1 mutations pathogenic",
            description: "Find pathogenic BRCA1 genetic variants",
            category: "Genetic Variants",
            databases: ['clinvar', 'uniprot']
        },
        {
            query: "cancer immunotherapy targets",
            description: "Search for cancer immunotherapy research",
            category: "General Research",
            databases: ['opentargets', 'pubmed', 'chembl']
        },
        {
            query: "Alzheimer disease protein expression",
            description: "Protein expression patterns in Alzheimer's disease",
            category: "Protein Studies",
            databases: ['hpa', 'uniprot', 'pubmed']
        },
        {
            query: "kinase inhibitors approved drugs",
            description: "FDA approved kinase inhibitor drugs",
            category: "Drug Discovery",
            databases: ['drugbank', 'chembl', 'opentargets']
        }
    ];

    // Execute comprehensive multi-database search
    const executeSearch = useCallback(async (query) => {
        if (!query.trim()) return;

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
                    const response = await fetch(`/api/search/${dbId}?query=${encodeURIComponent(query)}&limit=100`);
                    
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
                        total: data.total || 0,
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
            const successfulDatabases = searchResults.filter(r => !r.error).length;
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

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            executeSearch(searchQuery.trim());
        }
    };

    const handleExampleClick = (example) => {
        setSearchQuery(example.query);
        setSelectedDatabases(example.databases);
        executeSearch(example.query);
    };

    const toggleDatabase = (dbId) => {
        setSelectedDatabases(prev => 
            prev.includes(dbId) 
                ? prev.filter(id => id !== dbId)
                : [...prev, dbId]
        );
    };

    const toggleBookmark = (resultId) => {
        setBookmarkedResults(prev => {
            const newSet = new Set(prev);
            if (newSet.has(resultId)) {
                newSet.delete(resultId);
            } else {
                newSet.add(resultId);
            }
            return newSet;
        });
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

    // Visualization data
    const chartData = useMemo(() => {
        const phaseDistribution = {};
        const databaseDistribution = {};
        const statusDistribution = {};
        const yearDistribution = {};

        filteredAndSortedResults.forEach(result => {
            // Phase distribution
            const phase = result.phase || 'Unknown';
            phaseDistribution[phase] = (phaseDistribution[phase] || 0) + 1;

            // Database distribution
            const db = result._database_name || result.database || 'Unknown';
            databaseDistribution[db] = (databaseDistribution[db] || 0) + 1;

            // Status distribution
            const status = result.status || 'Unknown';
            statusDistribution[status] = (statusDistribution[status] || 0) + 1;

            // Year distribution
            const year = result.year || 'Unknown';
            yearDistribution[year] = (yearDistribution[year] || 0) + 1;
        });

        return {
            phases: Object.entries(phaseDistribution).map(([phase, count]) => ({ phase, count })),
            databases: Object.entries(databaseDistribution).map(([database, count]) => ({ database, count })),
            statuses: Object.entries(statusDistribution).map(([status, count]) => ({ status, count })),
            years: Object.entries(yearDistribution).map(([year, count]) => ({ year, count }))
        };
    }, [filteredAndSortedResults]);

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
        <div className="min-h-screen" style={{ 
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)' 
        }}>
            {/* Enhanced Header */}
            <header className="glass-card mx-4 mt-4 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                                <Brain className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-gray-800 mb-1">PharmaCopilot</h1>
                                <p className="text-gray-600">AI-Powered Multi-Database Pharmaceutical Intelligence Platform</p>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="text-sm text-green-600 flex items-center gap-1">
                                        <Activity className="w-4 h-4" />
                                        {selectedDatabases.length} databases active
                                    </span>
                                    <span className="text-sm text-blue-600">
                                        Unlimited results
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setShowDatabaseSelector(!showDatabaseSelector)}
                                className="btn btn-secondary flex items-center gap-2"
                            >
                                <Database className="w-4 h-4" />
                                Databases ({selectedDatabases.length})
                                {showDatabaseSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Database Selector */}
                    {showDatabaseSelector && (
                        <div className="mb-6 p-4 bg-white/50 rounded-xl border border-white/20">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800">Select Databases to Search</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {databases.map(db => (
                                    <div
                                        key={db.id}
                                        onClick={() => toggleDatabase(db.id)}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                                            selectedDatabases.includes(db.id)
                                                ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                                                : 'border-gray-200 bg-white/70 hover:border-gray-300 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{db.icon}</span>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-gray-800">{db.name}</h4>
                                                <p className="text-xs text-gray-600 mb-1">{db.description}</p>
                                                <span className="text-xs font-medium text-gray-500">{db.count}</span>
                                            </div>
                                            {selectedDatabases.includes(db.id) && (
                                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-xs">✓</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button 
                                    onClick={() => setSelectedDatabases(databases.map(db => db.id))}
                                    className="btn btn-primary text-sm px-3 py-1"
                                >
                                    Select All
                                </button>
                                <button 
                                    onClick={() => setSelectedDatabases(['opentargets'])}
                                    className="btn btn-secondary text-sm px-3 py-1"
                                >
                                    Reset to Default
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Enhanced Search Form */}
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Sparkles className="h-6 w-6 text-blue-500" />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ask me anything... (e.g., 'List diseases in Phase-2 for Imatinib')"
                                className="input-field pl-14 pr-40 py-5 text-lg shadow-xl border-2"
                                disabled={isLoading}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-4">
                                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {selectedDatabases.length} DB
                                </span>
                                <button
                                    type="submit"
                                    disabled={isLoading || !searchQuery.trim()}
                                    className={`btn btn-primary px-8 py-3 shadow-lg ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                                            <span>Searching...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-5 h-5 mr-2" />
                                            <span>Search</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Query Analysis Display */}
                    {queryAnalysis && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="flex items-center gap-2 text-sm">
                                <Activity className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-blue-800">AI Query Analysis:</span>
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
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                    Confidence: {Math.round((queryAnalysis.confidence || 0) * 100)}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Example Queries */}
                {!searchResults.length && !isLoading && !error && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-blue-500" />
                            Try These Intelligent Queries
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {exampleQueries.map((example, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleExampleClick(example)}
                                    className="card p-5 cursor-pointer hover:shadow-2xl transition-all duration-300 border-l-4 border-blue-500 group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                            <Search className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                                                "{example.query}"
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-3">
                                                {example.description}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                    {example.category}
                                                </span>
                                                {example.databases.map(dbId => {
                                                    const db = databases.find(d => d.id === dbId);
                                                    return db ? (
                                                        <span 
                                                            key={dbId}
                                                            className="text-xs px-2 py-1 rounded text-white"
                                                            style={{ backgroundColor: db.color }}
                                                        >
                                                            {db.icon} {db.name}
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                                <p className="text-xs mt-2 text-red-600">
                                    Try rephrasing your query or selecting different databases.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Statistics */}
                {searchStats && !error && (
                    <div className="mb-6 glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-6">
                                <span className="text-lg font-semibold flex items-center gap-2">
                                    <Database className="w-5 h-5 text-blue-600" />
                                    {filteredAndSortedResults.length} results
                                    {filterConfig.searchTerm || filterConfig.phase || filterConfig.status ? 
                                        ` (${searchResults.length} total)` : ''
                                    }
                                </span>
                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {searchStats.responseTime}ms
                                </span>
                                <span className="text-sm text-green-600 flex items-center gap-1">
                                    <Activity className="w-4 h-4" />
                                    {searchStats.successfulDatabases} databases
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="btn btn-secondary text-sm px-4 py-2 flex items-center gap-2"
                                >
                                    <Filter className="w-4 h-4" />
                                    Filters
                                    {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('cards')}
                                        className={`p-2 rounded ${viewMode === 'cards' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
                                    >
                                        <Grid3X3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('chart')}
                                        className={`p-2 rounded ${viewMode === 'chart' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                    </button>
                                </div>
                                {searchResults.length > 0 && (
                                    <button 
                                        onClick={exportToCSV}
                                        className="btn btn-success text-sm px-4 py-2 flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export CSV
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Database Breakdown */}
                        <div className="flex flex-wrap gap-2">
                            {searchStats.databaseBreakdown.map(db => {
                                const dbConfig = databases.find(d => d.id === db.database);
                                return (
                                    <div 
                                        key={db.database}
                                        className="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                                        style={{ 
                                            backgroundColor: `${dbConfig?.color}20`, 
                                            border: `1px solid ${dbConfig?.color}40` 
                                        }}
                                    >
                                        <span>{dbConfig?.icon}</span>
                                        <span className="font-medium">{dbConfig?.name}</span>
                                        <span 
                                            className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
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

                {/* Advanced Filters */}
                {showFilters && searchResults.length > 0 && (
                    <div className="mb-6 glass-card p-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Advanced Filters
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Search in results</label>
                                <input
                                    type="text"
                                    placeholder="Filter by title..."
                                    value={filterConfig.searchTerm}
                                    onChange={(e) => setFilterConfig(prev => ({ ...prev, searchTerm: e.target.value }))}
                                    className="input-field text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phase</label>
                                <select
                                    value={filterConfig.phase}
                                    onChange={(e) => setFilterConfig(prev => ({ ...prev, phase: e.target.value }))}
                                    className="input-field text-sm"
                                >
                                    <option value="">All Phases</option>
                                    <option value="Phase 1">Phase 1</option>
                                    <option value="Phase 2">Phase 2</option>
                                    <option value="Phase 3">Phase 3</option>
                                    <option value="Phase 4">Phase 4</option>
                                    <option value="Approved">Approved</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select
                                    value={filterConfig.status}
                                    onChange={(e) => setFilterConfig(prev => ({ ...prev, status: e.target.value }))}
                                    className="input-field text-sm"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Recruiting">Recruiting</option>
                                    <option value="Active">Active</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Clinical Evidence">Clinical Evidence</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Database</label>
                                <select
                                    value={filterConfig.database}
                                    onChange={(e) => setFilterConfig(prev => ({ ...prev, database: e.target.value }))}
                                    className="input-field text-sm"
                                >
                                    <option value="">All Databases</option>
                                    {databases.map(db => (
                                        <option key={db.id} value={db.id}>{db.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Year</label>
                                <input
                                    type="number"
                                    placeholder="e.g., 2023"
                                    value={filterConfig.year}
                                    onChange={(e) => setFilterConfig(prev => ({ ...prev, year: e.target.value }))}
                                    className="input-field text-sm"
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button 
                                onClick={() => setFilterConfig({ phase: '', status: '', database: '', year: '', searchTerm: '' })}
                                className="btn btn-secondary text-xs px-3 py-1"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Visualization Mode */}
                {viewMode === 'chart' && searchResults.length > 0 && (
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Phase Distribution Chart */}
                        <div className="glass-card p-6">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <PieChart className="w-5 h-5 text-blue-600" />
                                Phase Distribution
                            </h3>
                            <div className="space-y-3">
                                {chartData.phases.map((item, index) => {
                                    const percentage = (item.count / filteredAndSortedResults.length) * 100;
                                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                                    return (
                                        <div key={item.phase} className="flex items-center gap-3">
                                            <div 
                                                className="w-4 h-4 rounded"
                                                style={{ backgroundColor: colors[index % colors.length] }}
                                            ></div>
                                            <span className="flex-1 text-sm">{item.phase}</span>
                                            <span className="text-sm font-medium">{item.count}</span>
                                            <div className="w-20 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="h-2 rounded-full"
                                                    style={{ 
                                                        width: `${percentage}%`, 
                                                        backgroundColor: colors[index % colors.length] 
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Database Distribution Chart */}
                        <div className="glass-card p-6">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-green-600" />
                                Database Distribution
                            </h3>
                            <div className="space-y-3">
                                {chartData.databases.map((item, index) => {
                                    const percentage = (item.count / filteredAndSortedResults.length) * 100;
                                    const dbConfig = databases.find(db => db.name === item.database);
                                    return (
                                        <div key={item.database} className="flex items-center gap-3">
                                            <span className="text-lg">{dbConfig?.icon || '📊'}</span>
                                            <span className="flex-1 text-sm">{item.database}</span>
                                            <span className="text-sm font-medium">{item.count}</span>
                                            <div className="w-20 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="h-2 rounded-full"
                                                    style={{ 
                                                        width: `${percentage}%`, 
                                                        backgroundColor: dbConfig?.color || '#6B7280' 
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Display */}
                {filteredAndSortedResults.length > 0 && viewMode !== 'chart' && (
                    <>
                        {viewMode === 'table' && (
                            <div className="table-container">
                                <div className="overflow-x-auto">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th className="text-left">
                                                    <button 
                                                        onClick={() => handleSort('title')}
                                                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                                    >
                                                        <span>Title</span>
                                                        {sortConfig.key === 'title' && (
                                                            sortConfig.direction === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="text-left">
                                                    <button 
                                                        onClick={() => handleSort('_database_name')}
                                                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                                    >
                                                        <span>Database</span>
                                                        {sortConfig.key === '_database_name' && (
                                                            sortConfig.direction === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="text-left">
                                                    <button 
                                                        onClick={() => handleSort('phase')}
                                                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                                    >
                                                        <span>Phase</span>
                                                        {sortConfig.key === 'phase' && (
                                                            sortConfig.direction === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="text-left">
                                                    <button 
                                                        onClick={() => handleSort('status')}
                                                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                                    >
                                                        <span>Status</span>
                                                        {sortConfig.key === 'status' && (
                                                            sortConfig.direction === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="text-left">Details</th>
                                                <th className="text-left">
                                                    <button 
                                                        onClick={() => handleSort('enrollment')}
                                                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                                    >
                                                        <span>Trials/Info</span>
                                                        {sortConfig.key === 'enrollment' && (
                                                            sortConfig.direction === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAndSortedResults.map((result, index) => (
                                                <tr key={result.id || index} className="hover:bg-blue-50 transition-colors">
                                                    <td className="font-medium">
                                                        <div className="max-w-md">
                                                            <div className="text-sm font-semibold text-gray-900 mb-1">
                                                                {result.drug_name || result.title}
                                                            </div>
                                                            {result.disease_name && (
                                                                <div className="text-xs text-gray-600">
                                                                    for {result.disease_name}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span 
                                                            className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                                            style={{ backgroundColor: result._database_color }}
                                                        >
                                                            {databases.find(db => db.id === result._source_database)?.icon} {result._database_name}
                                                        </span>
                                                    </td>
                                                    <td>
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
                                                    <td>
                                                        <span className="text-sm text-gray-700">
                                                            {result.status || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="max-w-md">
                                                        <div className="text-sm text-gray-600 truncate">
                                                            {result.details || 'No details available'}
                                                        </div>
                                                    </td>
                                                    <td className="text-sm text-gray-600">
                                                        {result.clinical_trial_count || result.enrollment || 'N/A'}
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => toggleBookmark(result.id)}
                                                                className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                                                                    bookmarkedResults.has(result.id) ? 'text-yellow-500' : 'text-gray-400'
                                                                }`}
                                                                title="Bookmark"
                                                            >
                                                                <Bookmark className="w-4 h-4" />
                                                            </button>
                                                            {result.link ? (
                                                                <a 
                                                                    href={result.link} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                                                                    title="View Details"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                            ) : (
                                                                <span className="text-gray-400 w-8 h-8 flex items-center justify-center">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {viewMode === 'cards' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredAndSortedResults.map((result, index) => (
                                    <div key={result.id || index} className="card p-6 hover:shadow-xl transition-all duration-300">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                                    {result.drug_name || result.title}
                                                </h3>
                                                {result.disease_name && (
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        for {result.disease_name}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => toggleBookmark(result.id)}
                                                className={`p-2 rounded-full transition-colors ${
                                                    bookmarkedResults.has(result.id) 
                                                        ? 'text-yellow-500 bg-yellow-50' 
                                                        : 'text-gray-400 hover:bg-gray-50'
                                                }`}
                                            >
                                                <Bookmark className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span 
                                                    className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                                    style={{ backgroundColor: result._database_color }}
                                                >
                                                    {databases.find(db => db.id === result._source_database)?.icon} {result._database_name}
                                                </span>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    result.phase?.includes('4') ? 'bg-green-100 text-green-800' :
                                                    result.phase?.includes('3') ? 'bg-blue-100 text-blue-800' :
                                                    result.phase?.includes('2') ? 'bg-yellow-100 text-yellow-800' :
                                                    result.phase?.includes('1') ? 'bg-orange-100 text-orange-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {result.phase || 'N/A'}
                                                </span>
                                            </div>
                                            
                                            <p className="text-sm text-gray-600 line-clamp-3">
                                                {result.details || 'No details available'}
                                            </p>
                                            
                                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                <span className="text-xs text-gray-500">
                                                    {result.clinical_trial_count || result.enrollment || 'N/A'}
                                                </span>
                                                {result.link && (
                                                    <a 
                                                        href={result.link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="btn btn-primary text-xs px-3 py-1 flex items-center gap-1"
                                                    >
                                                        <span>View</span>
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* No Results Message */}
                {!isLoading && filteredAndSortedResults.length === 0 && searchStats && !error && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                        <p className="text-gray-600 mb-4">
                            Try a different search query or adjust your filters.
                        </p>
                        <div className="text-sm text-gray-500">
                            <p>Suggestions:</p>
                            <ul className="mt-2 space-y-1">
                                <li>• Use specific drug names (e.g., "Imatinib", "Pembrolizumab")</li>
                                <li>• Include phase information (e.g., "Phase 2", "Phase II")</li>
                                <li>• Try general terms (e.g., "cancer", "diabetes")</li>
                                <li>• Select more databases for broader coverage</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="glass-card p-8 max-w-sm w-full mx-4">
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
                            {queryAnalysis && (
                                <div className="mt-4 text-xs text-gray-500">
                                    {queryAnalysis.drugName && <div>Drug: {queryAnalysis.drugName}</div>}
                                    {queryAnalysis.phase && <div>Phase: {queryAnalysis.phase}</div>}
                                    <div>Intent: {queryAnalysis.intent}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PharmaceuticalIntelligenceSystem;
