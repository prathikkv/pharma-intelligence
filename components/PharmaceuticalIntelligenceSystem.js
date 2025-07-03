// components/PharmaceuticalIntelligenceSystem.js - COMPLETE WORKING VERSION
import React, { useState, useRef, useCallback } from 'react';
import { Search, Database, Activity, Zap, AlertCircle, Clock, FileText, ExternalLink, RefreshCw, Brain, Sparkles } from 'lucide-react';

const PharmaceuticalIntelligenceSystem = () => {
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchStats, setSearchStats] = useState(null);
    const [error, setError] = useState(null);

    const searchInputRef = useRef(null);

    // Example queries
    const exampleQueries = [
        {
            query: "Phase-2 for Imatinib",
            description: "Find all diseases where Imatinib is in Phase 2 clinical trials",
            category: "Drug-Phase Analysis"
        },
        {
            query: "List diseases in Phase 3 for pembrolizumab",
            description: "Pembrolizumab Phase 3 disease indications", 
            category: "Drug-Phase Analysis"
        },
        {
            query: "cancer immunotherapy targets",
            description: "Search for cancer immunotherapy research",
            category: "General Research"
        }
    ];

    // Search function
    const executeSearch = useCallback(async (query) => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setSearchResults([]);
        setSearchStats(null);

        try {
            console.log('Executing search:', query);
            
            const response = await fetch(`/api/search/opentargets?query=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message || data.error);
            }

            setSearchResults(data.results || []);
            setSearchStats({
                total: data.total || 0,
                responseTime: data.response_time || 0
            });

            console.log('Search completed:', data.total, 'results');

        } catch (error) {
            console.error('Search error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handlers
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
        setError(null);
    };

    return (
        <div className="min-h-screen" style={{ 
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)' 
        }}>
            {/* Header */}
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
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>

                    {/* Search Bar */}
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
                                placeholder="Ask me anything... (e.g., 'Phase-2 for Imatinib')"
                                className="input-field pl-12 pr-32 py-4 text-lg"
                                disabled={isLoading}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-4">
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={handleClearSearch}
                                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4 text-gray-400" />
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isLoading || !searchQuery.trim()}
                                    className="btn btn-primary px-6 py-2"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Searching...</span>
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
                    </form>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Example Queries */}
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
                                    className="card p-4 cursor-pointer hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="mb-2">
                                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            {example.category}
                                        </span>
                                    </div>
                                    <h3 className="font-medium text-gray-800 mb-1">
                                        "{example.query}"
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {example.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-800">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Search Error</span>
                        </div>
                        <p className="text-red-700 mt-1">{error}</p>
                    </div>
                )}

                {/* Search Statistics */}
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
                        </div>
                    </div>
                )}

                {/* Results Table */}
                {searchResults.length > 0 && (
                    <div className="table-container">
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Drug-Disease Association</th>
                                        <th>Phase</th>
                                        <th>Status</th>
                                        <th>Details</th>
                                        <th>Link</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {searchResults.map((result, index) => (
                                        <tr key={index}>
                                            <td className="font-medium">
                                                <div className="text-gray-900 font-semibold">
                                                    {result.drug_name || 'Unknown Drug'}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    for {result.disease_name || result.title}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="status-badge bg-blue-100 text-blue-800">
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
                                                        className="text-blue-600 hover:text-blue-800"
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

                {/* Empty State */}
                {!isLoading && searchResults.length === 0 && searchStats && !error && (
                    <div className="text-center py-12">
                        <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                        <p className="text-gray-600 mb-6">Try refining your search query.</p>
                        <button
                            onClick={() => handleExampleClick("Phase-2 for Imatinib")}
                            className="btn btn-primary"
                        >
                            Try Example Query
                        </button>
                    </div>
                )}
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="glass-card p-8 max-w-md mx-4">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">AI Analysis in Progress</h3>
                            <p className="text-gray-600">Searching OpenTargets database...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PharmaceuticalIntelligenceSystem;
