import React, { useState, useRef, useCallback } from 'react';
import { Search, Database, Activity, Zap, AlertCircle, Clock, FileText, ExternalLink, RefreshCw, Brain, Sparkles } from 'lucide-react';

const PharmaceuticalIntelligenceSystem = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchStats, setSearchStats] = useState(null);
    const [error, setError] = useState(null);

    const searchInputRef = useRef(null);

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

    const executeSearch = useCallback(async (query) => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setSearchResults([]);
        setSearchStats(null);

        try {
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

        } catch (error) {
            console.error('Search error:', error);
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
                                placeholder="Ask me anything... (e.g., 'Phase-2 for Imatinib')"
                                className="input-field pl-12 pr-32 py-4 text-lg"
                                disabled={isLoading}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-4">
                                <button
                                    type="submit"
                                    disabled={isLoading || !searchQuery.trim()}
                                    className="btn btn-primary px-6 py-2"
                                >
                                    {isLoading ? (
                                        <span>Searching...</span>
                                    ) : (
                                        <span>Search</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {!searchResults.length && !isLoading && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Try These Queries</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {exampleQueries.map((example, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleExampleClick(example.query)}
                                    className="card p-4 cursor-pointer hover:shadow-xl transition-all duration-300"
                                >
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

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-800">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Error: {error}</span>
                        </div>
                    </div>
                )}

                {searchStats && !error && (
                    <div className="mb-6 glass-card p-4">
                        <div className="flex items-center gap-6">
                            <span className="text-sm font-medium">{searchResults.length} results</span>
                            <span className="text-sm text-gray-600">{searchStats.responseTime}ms</span>
                        </div>
                    </div>
                )}

                {searchResults.length > 0 && (
                    <div className="table-container">
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Association</th>
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
                                                {result.drug_name || 'Unknown'} for {result.disease_name || result.title}
                                            </td>
                                            <td>{result.phase || 'Unknown'}</td>
                                            <td>{result.status || 'Unknown'}</td>
                                            <td className="max-w-md truncate">{result.details || 'No details'}</td>
                                            <td>
                                                {result.link ? (
                                                    <a href={result.link} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                ) : (
                                                    <span>-</span>
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
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                        <p className="text-gray-600">Try a different search query.</p>
                    </div>
                )}
            </div>

            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="glass-card p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Searching...</h3>
                            <p className="text-gray-600">Please wait while we search the database.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PharmaceuticalIntelligenceSystem;
