import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Database, Activity, Zap, AlertCircle, Clock, FileText, ExternalLink, RefreshCw, Brain, Sparkles, Filter } from 'lucide-react';

const PharmaceuticalIntelligenceSystem = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchStats, setSearchStats] = useState(null);
    const [error, setError] = useState(null);
    const [queryAnalysis, setQueryAnalysis] = useState(null);

    const searchInputRef = useRef(null);

    const exampleQueries = [
        {
            query: "List diseases in Phase-2 for Imatinib",
            description: "Find all diseases where Imatinib is in Phase 2 clinical trials",
            category: "Drug-Phase Analysis"
        },
        {
            query: "Pembrolizumab Phase 3 diseases",
            description: "Pembrolizumab Phase 3 disease indications", 
            category: "Drug-Phase Analysis"
        },
        {
            query: "cancer immunotherapy targets",
            description: "Search for cancer immunotherapy research",
            category: "General Research"
        },
        {
            query: "Imatinib all phases",
            description: "All clinical phases for Imatinib across diseases",
            category: "Drug Analysis"
        }
    ];

    const executeSearch = useCallback(async (query) => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setSearchResults([]);
        setSearchStats(null);
        setQueryAnalysis(null);

        try {
            console.log('🔍 Executing search for:', query);
            
            const response = await fetch(`/api/search/opentargets?query=${encodeURIComponent(query)}&limit=100`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message || data.error);
            }

            console.log('📊 Search results:', data);

            setSearchResults(data.results || []);
            setSearchStats({
                total: data.total || 0,
                responseTime: data.response_time || 0
            });
            setQueryAnalysis(data.parsed_query || null);

            // Success feedback
            if (data.results && data.results.length > 0) {
                console.log(`✅ Found ${data.results.length} results`);
            } else {
                console.log('⚠️ No results found');
            }

        } catch (error) {
            console.error('🚨 Search error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
            <header className="glass-card mx-4 mt-4 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                                <Brain className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">PharmaCopilot</h1>
                                <p className="text-gray-600">AI-Powered Pharmaceutical Intelligence Platform</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Database className="w-4 h-4" />
                            <span>OpenTargets Platform v4</span>
                        </div>
                    </div>

                    <form onSubmit={handleSearchSubmit} className="relative">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Sparkles className="h-5 w-5 text-blue-500" />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ask me anything... (e.g., 'List diseases in Phase-2 for Imatinib')"
                                className="input-field pl-12 pr-32 py-4 text-lg"
                                disabled={isLoading}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-4">
                                <button
                                    type="submit"
                                    disabled={isLoading || !searchQuery.trim()}
                                    className={`btn btn-primary px-6 py-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                            <span>Searching...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-4 h-4 mr-2" />
                                            <span>Search</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Query Analysis Display */}
                    {queryAnalysis && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                                <Activity className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-blue-800">Query Analysis:</span>
                                {queryAnalysis.drugName && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                        Drug: {queryAnalysis.drugName}
                                    </span>
                                )}
                                {queryAnalysis.phase && (
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                        Phase: {queryAnalysis.phase}
                                    </span>
                                )}
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                    Intent: {queryAnalysis.intent}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {!searchResults.length && !isLoading && !error && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                            Try These Queries
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {exampleQueries.map((example, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleExampleClick(example.query)}
                                    className="card p-4 cursor-pointer hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500"
                                >
                                    <div className="flex items-start gap-3">
                                        <Search className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h3 className="font-medium text-gray-800 mb-1">
                                                "{example.query}"
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-2">
                                                {example.description}
                                            </p>
                                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                {example.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-800">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <div>
                                <span className="font-medium">Search Error</span>
                                <p className="text-sm mt-1">{error}</p>
                                <p className="text-xs mt-2 text-red-600">
                                    Try rephrasing your query or check your internet connection.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {searchStats && !error && (
                    <div className="mb-6 glass-card p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <span className="text-sm font-medium flex items-center gap-1">
                                    <Database className="w-4 h-4" />
                                    {searchResults.length} results
                                </span>
                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {searchStats.responseTime}ms
                                </span>
                            </div>
                            {searchResults.length > 0 && (
                                <button className="btn btn-secondary text-xs px-3 py-1">
                                    <FileText className="w-3 h-3 mr-1" />
                                    Export CSV
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {searchResults.length > 0 && (
                    <div className="table-container">
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="text-left">
                                            <div className="flex items-center gap-1">
                                                <span>Drug-Disease Association</span>
                                                <Filter className="w-3 h-3 text-gray-400" />
                                            </div>
                                        </th>
                                        <th className="text-left">Phase</th>
                                        <th className="text-left">Status</th>
                                        <th className="text-left">Details</th>
                                        <th className="text-left">Trials</th>
                                        <th className="text-center">Link</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {searchResults.map((result, index) => (
                                        <tr key={result.id || index} className="hover:bg-blue-50 transition-colors">
                                            <td className="font-medium">
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {result.drug_name || result.title}
                                                    </div>
                                                    <div className="text-xs text-gray-600">
                                                        for {result.disease_name || 'Unknown Disease'}
                                                    </div>
                                                </div>
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
                                                {result.link ? (
                                                    <a 
                                                        href={result.link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                                                        title="View in OpenTargets"
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

                {!isLoading && searchResults.length === 0 && searchStats && !error && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                        <p className="text-gray-600 mb-4">
                            Try a different search query or check the spelling of drug names.
                        </p>
                        <div className="text-sm text-gray-500">
                            <p>Suggestions:</p>
                            <ul className="mt-2 space-y-1">
                                <li>• Use specific drug names (e.g., "Imatinib", "Pembrolizumab")</li>
                                <li>• Include phase information (e.g., "Phase 2", "Phase II")</li>
                                <li>• Try general terms (e.g., "cancer", "diabetes")</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="glass-card p-8 max-w-sm w-full mx-4">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Searching OpenTargets...</h3>
                            <p className="text-gray-600 text-sm">
                                Analyzing your query and searching the database
                            </p>
                            {queryAnalysis && (
                                <div className="mt-3 text-xs text-gray-500">
                                    {queryAnalysis.drugName && <div>Drug: {queryAnalysis.drugName}</div>}
                                    {queryAnalysis.phase && <div>Phase: {queryAnalysis.phase}</div>}
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
