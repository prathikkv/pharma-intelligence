// components/PharmaceuticalIntelligenceSystem.js - CORRECTED VERSION
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Database, Activity, Zap, AlertCircle, CheckCircle, Clock, TrendingUp, FileText, ExternalLink, Filter, Download, RefreshCw, Brain, Sparkles } from 'lucide-react';

// 🧠 ENHANCED QUERY INTELLIGENCE SYSTEM
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
            }),
            examples: [
                'Phase-2 for Imatinib',
                'List diseases in Phase 2 for imatinib',
                'imatinib phase 2 diseases',
                'Phase 3 diseases for pembrolizumab'
            ]
        },
        DRUG_APPROVED_DISEASES: {
            regex: [
                /(?:list|show|find|get).*diseases.*(?:approved|indication).*(?:for|of)\s+(\w+)/i,
                /(\w+).*(?:approved|indication).*diseases/i,
                /approved.*diseases.*(\w+)/i,
                /(\w+).*approved.*(?:for|diseases)/i
            ],
            extract: (query, match) => ({
                entity: 'drug',
                drug: extractDrugName(match),
                action: 'get_approved_diseases'
            }),
            examples: [
                'List approved diseases for rituximab',
                'rituximab approved diseases',
                'What diseases is imatinib approved for'
            ]
        },
        GENERIC_SEARCH: {
            regex: [/.*/],
            extract: (query, match) => ({
                entity: 'general',
                query: query,
                action: 'generic_search'
            }),
            examples: [
                'cancer immunotherapy',
                'EGFR inhibitors',
                'Alzheimer disease research'
            ]
        }
    };

    const parseQuery = (query) => {
        const normalizedQuery = query.trim().toLowerCase();
        
        for (const [intentName, pattern] of Object.entries(patterns)) {
            for (const regex of pattern.regex) {
                const match = normalizedQuery.match(regex);
                if (match) {
                    const extracted = pattern.extract(normalizedQuery, match);
                    if (extracted && (extracted.drug || extracted.target || extracted.compound || extracted.disease || extracted.query)) {
                        return {
                            intent: intentName,
                            ...extracted,
                            confidence: calculateConfidence(match, normalizedQuery),
                            originalQuery: query,
                            examples: pattern.examples
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

    return { parseQuery, patterns };
})();

// 🎯 MAIN PHARMACEUTICAL INTELLIGENCE COMPONENT
const PharmaceuticalIntelligenceSystem = () => {
    // 📊 STATE MANAGEMENT
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchStats, setSearchStats] = useState(null);
    const [queryIntent, setQueryIntent] = useState(null);
    const [searchHistory, setSearchHistory] = useState([]);
    const [error, setError] = useState(null);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [filters, setFilters] = useState({
        phase: '',
        status: '',
        therapeuticArea: ''
    });

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
            query: "rituximab approved diseases",
            description: "Find all approved indications for rituximab",
            icon: <CheckCircle className="w-4 h-4" />,
            category: "Approved Indications"
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

        // Cancel previous request
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
            
            // Parse query intent
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

            // Update results
            setSearchResults(data.results || []);
            setSearchStats({
                total: data.total || 0,
                responseTime: data.response_time || clientResponseTime,
                intent: data.intent || intent,
                metadata: data.metadata || {},
                apiStatus: data.api_status || 'success'
            });

            // Add to search history
            setSearchHistory(prev => [
                { query, timestamp: new Date(), resultCount: data.total || 0, intent },
                ...prev.slice(0, 9) // Keep last 10 searches
            ]);

            // Special validation for Imatinib Phase 2
            if (intent.drug === 'imatinib' && intent.phase === 2) {
                const resultCount = data.total || 0;
                console.log('✅ Imatinib Phase 2 Validation:', {
                    expected: 74,
                    actual: resultCount,
                    success: resultCount >= 70,
                    variance: Math.abs(74 - resultCount)
                });

                if (resultCount >= 70) {
                    console.log('🎉 SUCCESS: Imatinib Phase 2 test passed!');
                } else {
                    console.warn('⚠️ WARNING: Imatinib Phase 2 results below expected threshold');
                }
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

    // 📝 INPUT HANDLERS
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

    // 📊 RESULT FILTERING
    const filteredResults = searchResults.filter(result => {
        if (filters.phase && !result.phase?.toLowerCase().includes(filters.phase.toLowerCase())) {
            return false;
        }
        if (filters.status && !result.status?.toLowerCase().includes(filters.status.toLowerCase())) {
            return false;
        }
        if (filters.therapeuticArea && !result.details?.toLowerCase().includes(filters.therapeuticArea.toLowerCase())) {
            return false;
        }
        return true;
    });

    // 📁 EXPORT FUNCTIONALITY
    const exportResults = () => {
        if (filteredResults.length === 0) return;

        const csvData = filteredResults.map(result => ({
            'Drug Name': result.drug_name || 'N/A',
            'Disease Name': result.disease_name || result.title,
            'Phase': result.phase || 'N/A',
            'Status': result.status || 'N/A',
            'Therapeutic Areas': result.therapeutic_areas?.map(ta => ta.name).join('; ') || 'N/A',
            'Max Phase': result.max_phase_for_indication || 'N/A',
            'Details': result.details || 'N/A',
            'Link': result.link || 'N/A'
        }));

        const csvContent = [
            Object.keys(csvData[0]).join(','),
            ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `opentargets-results-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ⌨️ KEYBOARD SHORTCUTS
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'k') {
                    e.preventDefault();
                    searchInputRef.current?.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // 🎨 RENDER COMPONENT
    return (
        <div className="min-h-screen" style={{ 
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)' 
        }}>
            {/* 🎯 HEADER */}
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
