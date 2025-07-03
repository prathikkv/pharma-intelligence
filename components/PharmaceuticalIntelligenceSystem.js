// components/PharmaceuticalIntelligenceSystem.js - FIXED VERSION
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Database, Activity, Zap, AlertCircle, CheckCircle, Clock, TrendingUp, FileText, ExternalLink, Filter, Download, RefreshCw, Brain, Sparkles } from 'lucide-react';

// 🧠 QUERY INTELLIGENCE SYSTEM
const QueryIntelligence = (() => {
    const extractDrugName = (match) => {
        if (!match) return null;
        for (let i = 1; i < match.length; i++) {
            if (match[i] && match[i].length > 2 && !match[i].match(/^\d+$/)) {
                return match[i].toLowerCase();
            }
        }
        return null;
    };

    const extractPhase = (match) => {
        if (!match) return null;
        for (let i = 1; i < match.length; i++) {
            if (match[i] && match[i].match(/^\d+$/)) {
                return parseInt(match[i]);
            }
        }
        return null;
    };

    const calculateConfidence = (match, query) => {
        const matchLength = match[0].length;
        const queryLength = query.length;
        return Math.min(0.95, (matchLength / queryLength) * 1.3);
    };

    const patterns = {
        DRUG_DISEASES_PHASE: {
            regex: [
                /(?:phase[-\s]?(\d+)|phase\s*(\d+)).*(?:for|of)\s+(\w+)/i,
                /(\w+).*phase[-\s]?(\d+).*diseases?/i,
                /(?:list|show|find|get).*diseases.*(?:phase[- ]?(\d+)|phase.*(\d+)).*(?:for|of)\s+(\w+)/i,
                /diseases.*phase.*(\d+).*(\w+)/i,
                /(\w+).*diseases.*phase[- ]?(\d+)/i
            ],
            extract: (query, match) => ({
                entity: 'drug',
                drug: extractDrugName(match),
                phase: extractPhase(match),
                action: 'get_diseases_by_phase'
            })
        },
        GENERIC_SEARCH: {
            regex: [/.*/],
            extract: (query, match) => ({
                entity: 'general',
                query: query,
                action: 'generic_search'
            })
        }
    };

    const parseQuery = (query) => {
        const normalizedQuery = query.trim().toLowerCase();
        
        for (const [intentName, pattern] of Object.entries(patterns)) {
            for (const regex of pattern.regex) {
                const match = normalizedQuery.match(regex);
                if (match) {
                    const extracted = pattern.extract(normalizedQuery, match);
                    if (extracted && (extracted.drug || extracted.query)) {
                        return {
                            intent: intentName,
                            ...extracted,
                            confidence: calculateConfidence(match, normalizedQuery),
                            originalQuery: query
                        };
                    }
                }
            }
        }

        return {
            intent: 'GENERIC_SEARCH',
            entity: 'general',
            query: query,
            action: 'generic_search',
            confidence: 0.5,
            originalQuery: query
        };
    };

    return { parseQuery };
})();

// 🎯 MAIN COMPONENT
const PharmaceuticalIntelligenceSystem = () => {
    // 📊 STATE
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchStats, setSearchStats] = useState(null);
    const [queryIntent, setQueryIntent] = useState(null);
    const [error, setError] = useState(null);

    // 🔗 REFS
    const searchInputRef = useRef(null);
    const abortControllerRef = useRef(null);

    // 📋 EXAMPLE QUERIES
    const exampleQueries = [
        {
            query: "Phase-2 for Imatinib",
            description: "Find all diseases where Imatinib is in Phase 2 clinical trials",
            icon: <Activity className="w-4 h-4" />,
            category: "Drug-Phase Analysis"
        },
        {
            query: "List diseases in Phase 3 for pembrolizumab",
            description: "Pembrolizumab Phase 3 disease indications",
            icon: <TrendingUp className="w-4 h-4" />,
            category: "Drug-Phase Analysis"
        },
        {
            query: "cancer immunotherapy targets",
            description: "Search for cancer immunotherapy research",
            icon: <Search className="w-4 h-4" />,
            category: "General Research"
        }
    ];

    // 🔍 SEARCH EXECUTION
    const executeSearch = useCallback(async (query) => {
        if (!query.trim()) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsLoading(true);
        setError(null);
        setSearchResults([]);
        setSearchStats(null);

        try {
            console.log('🔍 Executing search:', query);
            
            const intent = QueryIntelligence.parseQuery(query);
            setQueryIntent(intent);
            console.log('🧠 Parsed Intent:', intent);

            const startTime = Date.now();
            
            const response = await fetch(`/api/search/opentargets?query=${encodeURIComponent(query)}`, {
                signal: abortControllerRef.current.signal,
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message || data.error);
            }

            const endTime = Date.now();
            const clientResponseTime = endTime - startTime;

            setSearchResults(data.results || []);
            setSearchStats({
                total: data.total || 0,
                responseTime: data.response_time || clientResponseTime,
                intent: data.intent || intent,
                metadata: data.metadata || {},
                apiStatus: data.api_status || 'success'
            });

            if (intent.drug === 'imatinib' && intent.phase === 2) {
                const resultCount = data.total || 0;
                console.log('✅ Imatinib Phase 2 Validation:', {
                    expected: 74,
                    actual: resultCount,
                    success: resultCount >= 70
                });
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Search aborted');
                return;
            }

            console.error('Search error:', error);
            setError(error.message);
            setSearchResults([]);
            setSearchStats({ error: error.message });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 📝 HANDLERS
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            executeSearch(searchQuery.trim());
        }
    };

    const handleExampleClick = (exampleQuery) => {
        setSearchQuery(exampleQuery);
        executeSearch(exampleQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSearchStats(null);
        setQueryIntent(null);
        setError(null);
    };

    // 🎨 RENDER
    return (
        <div className="min-h-screen" style={{ 
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)' 
        }}>
            {/* HEADER */}
            <header className="glass-card mx-4 mt-4 p-6 border-b-0">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                                <Brain className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">
                                    PharmaCopilot
                                </h1>
                                <p className="text-gray-600">
                                    AI-Powered Pharmaceutical Intelligence Platform
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Database className="w-4 h-4" />
                            <span>OpenTargets Platform v4</span>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>

                    {/* SEARCH BAR */}
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Sparkles className="h-5 w-5 text-blue-500 group-focus-within:text-blue-600 transition-colors" />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ask me anything... (e.g., 'Phase-2 for Imatinib')"
                                className="input-field pl-12 pr-32 py-4 text-lg placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isLoading}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-4">
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={handleClearSearch}
                                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                        title="Clear search"
                                    >
                                        <RefreshCw className="w-4 h-4 text-gray-400" />
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isLoading || !searchQuery.trim()}
                                    className="btn btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Analyzing...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Search className="w-4 h-4" />
                                            <span>Search</span>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        {/* QUERY INTENT */}
                        {queryIntent && queryIntent.confidence > 0.7 && (
                            <div className="mt-3 flex items-center gap-2 text-sm">
                                <Brain className="w-4 h-4 text-blue-500" />
                                <span className="text-gray-600">
                                    AI Intent: <span className="font-medium text-blue-600">
                                        {queryIntent.intent === 'DRUG_DISEASES_PHASE' 
                                            ? `Find Phase ${queryIntent.phase} diseases for ${queryIntent.drug}`
                                            : 'General pharmaceutical research'}
                                    </span>
                                </span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                                    {Math.round(queryIntent.confidence * 100)}% confidence
                                </span>
                            </div>
                        )}
                    </form>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* EXAMPLE QUERIES */}
                {!searchResults.length && !isLoading && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            Try These AI-Powered Queries
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {exampleQueries.map((example, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleExampleClick(example.query)}
                                    className="card p-4 cursor-pointer hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            {example.icon}
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                {example.category}
                                            </span>
                                            <h3 className="font-medium text-gray-800 mb-1 mt-2">
                                                "{example.query}"
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {example.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ERROR DISPLAY */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-800">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Search Error</span>
                        </div>
                        <p className="text-red-700 mt-1">{error}</p>
                    </div>
                )}

                {/* SEARCH STATISTICS */}
                {searchStats && !error && (
                    <div className="mb-6 glass-card p-4">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium">
                                    {searchResults.length} results
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-gray-600">
                                    {searchStats.responseTime}ms
                                </span>
                            </div>
                            {searchStats.metadata?.drug && (
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-purple-500" />
                                    <span className="text-sm text-gray-600">
                                        Drug: {searchStats.metadata.drug.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* RESULTS TABLE */}
                {searchResults.length > 0 && (
                    <div className="table-container">
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="text-left">Drug-Disease Association</th>
                                        <th className="text-left">Phase</th>
                                        <th className="text-left">Status</th>
                                        <th className="text-left">Details</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {searchResults.map((result, index) => (
                                        <tr key={result.id || index} className="hover:bg-blue-50 transition-colors">
                                            <td className="font-medium">
                                                <div>
                                                    <div className="text-gray-900 font-semibold">
                                                        {result.drug_name || 'Unknown Drug'}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        for {result.disease_name || result.title}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="status-badge bg-blue-100 text-blue-800 border-blue-200">
                                                    {result.phase || 'Unknown'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="text-sm text-gray-600">
                                                    {result.status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="text-sm text-gray-600 max-w-md truncate">
                                                    {result.details || 'No details available'}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                {result.link && (
                                                    
                                                        href={result.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                                                        title="View in OpenTargets"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* EMPTY STATE */}
                {!isLoading && searchResults.length === 0 && searchStats && !error && (
                    <div className="text-center py-12">
                        <div className="max-w-md mx-auto">
                            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No Results Found
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Try refining your search query or using different keywords.
                            </p>
                            <button
                                onClick={() => handleExampleClick("Phase-2 for Imatinib")}
                                className="btn btn-primary"
                            >
                                Try Example Query
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* LOADING OVERLAY */}
            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="glass-card p-8 max-w-md mx-4">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                AI Analysis in Progress
                            </h3>
                            <p className="text-gray-600">
                                Searching OpenTargets database and analyzing results...
                            </p>
                            {queryIntent && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        Processing: {queryIntent.intent === 'DRUG_DISEASES_PHASE' 
                                            ? `Phase ${queryIntent.phase} diseases for ${queryIntent.drug}`
                                            : 'Pharmaceutical research query'}
                                    </p>
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
