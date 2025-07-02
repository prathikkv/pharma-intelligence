import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, Filter, Database, BarChart3, TrendingUp, AlertCircle, CheckCircle, Clock, Star, StarOff, Eye, EyeOff, Loader2, RefreshCw, ArrowUpDown, ChevronDown, ChevronUp, X, ExternalLink, Table, FileSpreadsheet, Brain, Zap } from 'lucide-react';

const PharmaceuticalIntelligenceSystem = () => {
    // Core State Management
    const [selectedDatabases, setSelectedDatabases] = useState(['opentargets', 'clinicaltrials']); // Default selection
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchLogs, setSearchLogs] = useState([]);
    const [queryIntent, setQueryIntent] = useState(null);
    
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

    // Enhanced Database Configuration with Intelligence
    const databases = [
        { 
            id: 'opentargets', 
            name: 'Open Targets', 
            description: '29K+ target-disease associations - Comprehensive drug-target-disease data',
            endpoint: '/api/search/opentargets',
            icon: '🎯',
            category: 'Targets',
            priority: 'high',
            capabilities: [
                'drug_diseases_by_phase',
                'approved_diseases', 
                'toxicities',
                'target_diseases',
                'compound_targets',
                'disease_compounds',
                'target_interactions'
            ]
        },
        { 
            id: 'clinicaltrials', 
            name: 'ClinicalTrials.gov', 
            description: '480K+ clinical trials - The gold standard for clinical research',
            endpoint: '/api/search/clinicaltrials',
            icon: '🏥',
            category: 'Clinical',
            priority: 'high',
            capabilities: [
                'clinical_trials',
                'drug_trials',
                'disease_trials',
                'phase_trials'
            ]
        },
        { 
            id: 'chembl', 
            name: 'ChEMBL', 
            description: '2.3M+ bioactivity records - Drug discovery data',
            endpoint: '/api/search/chembl',
            icon: '⚗️',
            category: 'Chemistry',
            priority: 'high',
            capabilities: [
                'compound_data',
                'bioactivity',
                'molecular_properties'
            ]
        },
        { 
            id: 'drugbank', 
            name: 'DrugBank', 
            description: '14K+ drug entries - Comprehensive drug information',
            endpoint: '/api/search/drugbank',
            icon: '💊',
            category: 'Drugs',
            priority: 'medium',
            capabilities: [
                'drug_information',
                'drug_interactions',
                'mechanisms'
            ]
        },
        { 
            id: 'clinvar', 
            name: 'ClinVar', 
            description: '2.1M+ genetic variants - Clinical significance of genetic variants',
            endpoint: '/api/search/clinvar',
            icon: '🧬',
            category: 'Genetics',
            priority: 'medium',
            capabilities: [
                'genetic_variants',
                'pathogenicity',
                'clinical_significance'
            ]
        },
        { 
            id: 'pubmed', 
            name: 'PubMed', 
            description: '35M+ research papers - Scientific literature',
            endpoint: '/api/search/pubmed',
            icon: '📚',
            category: 'Literature',
            priority: 'medium',
            capabilities: [
                'scientific_literature',
                'research_papers',
                'publications'
            ]
        }
    ];

    // 🧠 ENHANCED QUERY INTELLIGENCE SYSTEM
    const QueryIntelligence = {
        // Comprehensive query patterns for all 8 use cases
        patterns: {
            // 1. Drug → Diseases by Phase
            DRUG_DISEASES_PHASE: {
                regex: [
                    /(?:list|show|find|get).*diseases.*(?:phase[- ]?(\d+)|phase.*(\d+)).*(?:for|of)\s+(\w+)/i,
                    /(\w+).*diseases.*phase[- ]?(\d+)/i,
                    /phase[- ]?(\d+).*diseases.*(?:for|of)\s+(\w+)/i,
                    /diseases.*phase.*(\d+).*(\w+)/i
                ],
                extract: (query, match) => ({
                    entity: 'drug',
                    drug: this.extractDrugName(match),
                    phase: this.extractPhase(match),
                    action: 'get_diseases_by_phase'
                }),
                databases: ['opentargets', 'clinicaltrials'],
                examples: [
                    'List diseases in Phase 2 for imatinib',
                    'imatinib phase 2 diseases',
                    'Phase 2 diseases for pembrolizumab'
                ]
            },

            // 2. Drug → Approved Diseases  
            DRUG_APPROVED_DISEASES: {
                regex: [
                    /(?:list|show|find|get).*diseases.*(?:approved|indication).*(?:for|of)\s+(\w+)/i,
                    /(\w+).*(?:approved|indication).*diseases/i,
                    /approved.*diseases.*(\w+)/i,
                    /(\w+).*approved.*(?:for|diseases)/i
                ],
                extract: (query, match) => ({
                    entity: 'drug',
                    drug: this.extractDrugName(match),
                    action: 'get_approved_diseases'
                }),
                databases: ['opentargets', 'clinicaltrials'],
                examples: [
                    'List approved diseases for rituximab',
                    'rituximab approved diseases',
                    'What diseases is imatinib approved for'
                ]
            },

            // 3. Drug → Toxicities
            DRUG_TOXICITIES: {
                regex: [
                    /(?:list|show|find|get).*(?:toxicit|adverse|side.effect).*(?:for|of)\s+(\w+)/i,
                    /(\w+).*(?:toxicit|adverse|side.effect)/i,
                    /(?:toxicit|adverse).*(\w+)/i
                ],
                extract: (query, match) => ({
                    entity: 'drug',
                    drug: this.extractDrugName(match),
                    action: 'get_toxicities'
                }),
                databases: ['opentargets', 'drugbank'],
                examples: [
                    'List toxicities for dasatinib',
                    'dasatinib adverse effects',
                    'Side effects of imatinib'
                ]
            },

            // 4. Compound → Targets & Binding Affinities
            COMPOUND_TARGETS: {
                regex: [
                    /(?:list|show|find|get).*(?:targets?|binding.*affinit).*(?:for|of)\s+(\w+)/i,
                    /(\w+).*(?:targets?|binding)/i,
                    /targets?.*(\w+)/i,
                    /binding.*affinit.*(\w+)/i
                ],
                extract: (query, match) => ({
                    entity: 'compound',
                    compound: this.extractDrugName(match),
                    action: 'get_targets_and_binding'
                }),
                databases: ['opentargets', 'chembl'],
                examples: [
                    'List targets for compound CHEMBL25',
                    'CHEMBL25 binding affinities',
                    'What targets does imatinib bind to'
                ]
            },

            // 5. Target → Associated Diseases
            TARGET_DISEASES: {
                regex: [
                    /(?:list|show|find|get).*diseases.*associated.*(?:with|to)\s+(\w+)/i,
                    /(\w+).*associated.*diseases/i,
                    /diseases.*(\w+).*target/i,
                    /(\w+).*target.*diseases/i
                ],
                extract: (query, match) => ({
                    entity: 'target',
                    target: this.extractTargetName(match),
                    action: 'get_associated_diseases'
                }),
                databases: ['opentargets'],
                examples: [
                    'List diseases associated with JAK2',
                    'JAK2 associated diseases',
                    'What diseases involve EGFR target'
                ]
            },

            // 6. Target → Interacting Partners
            TARGET_INTERACTIONS: {
                regex: [
                    /(?:list|show|find|get).*(?:interacting|interaction).*partners.*(?:for|of)\s+(\w+)/i,
                    /(\w+).*(?:interacting|interaction).*partners/i,
                    /(?:proteins?|genes?).*interact.*(\w+)/i,
                    /(\w+).*interact/i
                ],
                extract: (query, match) => ({
                    entity: 'target',
                    target: this.extractTargetName(match),
                    action: 'get_interacting_partners'
                }),
                databases: ['opentargets'],
                examples: [
                    'List interacting partners for ENSG00000141510',
                    'ENSG00000141510 protein interactions',
                    'What proteins interact with TP53'
                ]
            },

            // 7. Disease → Approved Compounds  
            DISEASE_COMPOUNDS: {
                regex: [
                    /(?:list|show|find|get).*(?:approved|compounds?).*(?:for|of).*disease\s+(\w+)/i,
                    /(?:approved|compounds?).*(?:for|of)\s+(\w+)/i,
                    /(?:drugs|compounds).*approved.*(\w+)/i,
                    /(\w+).*approved.*(?:drugs|compounds)/i
                ],
                extract: (query, match) => ({
                    entity: 'disease',
                    disease: this.extractDiseaseName(match),
                    action: 'get_approved_compounds'
                }),
                databases: ['opentargets', 'drugbank'],
                examples: [
                    'List approved compounds for disease EFO_0000756',
                    'EFO_0000756 approved drugs',
                    'What drugs are approved for cancer'
                ]
            },

            // 8. Generic Search
            GENERIC_SEARCH: {
                regex: [/.*/],
                extract: (query, match) => ({
                    entity: 'general',
                    query: query,
                    action: 'generic_search'
                }),
                databases: ['opentargets', 'clinicaltrials', 'chembl', 'drugbank', 'clinvar', 'pubmed'],
                examples: [
                    'cancer immunotherapy',
                    'EGFR inhibitors',
                    'Alzheimer disease research'
                ]
            }
        },

        // Enhanced entity extraction
        extractDrugName: (match) => {
            // Extract drug name from regex match
            if (!match) return null;
            // Look for the captured group that contains the drug name
            for (let i = 1; i < match.length; i++) {
                if (match[i] && match[i].length > 2 && !match[i].match(/^\d+$/)) {
                    return match[i].toLowerCase();
                }
            }
            return null;
        },

        extractTargetName: (match) => {
            if (!match) return null;
            for (let i = 1; i < match.length; i++) {
                if (match[i] && match[i].length > 2) {
                    return match[i].toUpperCase(); // Targets are usually uppercase
                }
            }
            return null;
        },

        extractDiseaseName: (match) => {
            if (!match) return null;
            for (let i = 1; i < match.length; i++) {
                if (match[i] && match[i].length > 2) {
                    return match[i];
                }
            }
            return null;
        },

        extractPhase: (match) => {
            if (!match) return null;
            for (let i = 1; i < match.length; i++) {
                if (match[i] && match[i].match(/^\d+$/)) {
                    return parseInt(match[i]);
                }
            }
            return null;
        },

        // Main parsing function
        parseQuery: (query) => {
            const normalizedQuery = query.trim().toLowerCase();
            
            // Try each pattern
            for (const [intentName, pattern] of Object.entries(QueryIntelligence.patterns)) {
                for (const regex of pattern.regex) {
                    const match = normalizedQuery.match(regex);
                    if (match) {
                        const extracted = pattern.extract(normalizedQuery, match);
                        if (extracted) {
                            return {
                                intent: intentName,
                                ...extracted,
                                confidence: QueryIntelligence.calculateConfidence(match, normalizedQuery),
                                recommendedDatabases: pattern.databases,
                                originalQuery: query,
                                examples: pattern.examples
                            };
                        }
                    }
                }
            }

            // Fallback to generic search
            return {
                intent: 'GENERIC_SEARCH',
                entity: 'general',
                query: query,
                action: 'generic_search',
                confidence: 0.5,
                recommendedDatabases: ['opentargets', 'clinicaltrials'],
                originalQuery: query
            };
        },

        calculateConfidence: (match, query) => {
            const matchLength = match[0].length;
            const queryLength = query.length;
            return Math.min(0.95, (matchLength / queryLength) * 1.3);
        }
    };

    // 🎯 ENHANCED SEARCH EXECUTION with Full Results
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
        
        // 🧠 Parse query intent
        const parsedIntent = QueryIntelligence.parseQuery(searchQuery);
        setQueryIntent(parsedIntent);
        
        console.log('🧠 Parsed Query Intent:', parsedIntent);
        
        const logEntry = {
            id: searchId,
            query: searchQuery,
            intent: parsedIntent,
            databases: selectedDatabases,
            timestamp: new Date().toISOString(),
            status: 'running'
        };
        setSearchLogs(prev => [logEntry, ...prev]);

        try {
            console.log(`🔍 GRID Search: "${searchQuery}" with intent: ${parsedIntent.intent}`);
            
            // Enhanced parallel search with intent-aware routing
            const searchPromises = selectedDatabases.map(async (dbId) => {
                const database = databases.find(db => db.id === dbId);
                const dbStartTime = Date.now();
                
                try {
                    // 🎯 SMART LIMITS based on query intent and expected results
                    const limits = {
                        'opentargets': QueryIntelligence.getExpectedResultCount(parsedIntent),
                        'clinicaltrials': 1000,
                        'chembl': 300,
                        'drugbank': 200,
                        'clinvar': 150,
                        'pubmed': 100
                    };
                    
                    // 📊 Build enhanced query parameters with intent
                    const queryParams = new URLSearchParams({
                        query: searchQuery,
                        limit: (limits[dbId] || 200).toString(),
                        format: 'json',
                        intent: parsedIntent.intent,
                        action: parsedIntent.action,
                        entity: parsedIntent.entity
                    });

                    // Add specific parameters based on intent
                    if (parsedIntent.drug) queryParams.append('drug', parsedIntent.drug);
                    if (parsedIntent.phase) queryParams.append('phase', parsedIntent.phase.toString());
                    if (parsedIntent.target) queryParams.append('target', parsedIntent.target);
                    if (parsedIntent.compound) queryParams.append('compound', parsedIntent.compound);
                    if (parsedIntent.disease) queryParams.append('disease', parsedIntent.disease);
                    
                    console.log(`📡 Querying ${database.name} with intent: ${parsedIntent.intent} (expecting ~${limits[dbId]} results)...`);
                    
                    const response = await fetch(`${database.endpoint}?${queryParams}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'User-Agent': 'GRID-Intelligence/4.0',
                            'X-Query-Intent': parsedIntent.intent
                        },
                        signal: AbortSignal.timeout(60000) // Increased timeout for comprehensive results
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();
                    const dbEndTime = Date.now();
                    
                    // Enhanced result processing with intent-aware formatting
                    let processedResults = [];
                    
                    if (data.results && Array.isArray(data.results)) {
                        processedResults = data.results.map(item => ({
                            ...item,
                            _database: dbId,
                            _databaseName: database.name,
                            _searchTime: dbEndTime - dbStartTime,
                            _id: `${dbId}_${item.id || item.nct_id || item.chembl_id || Math.random()}`,
                            _icon: database.icon,
                            _category: database.category,
                            _priority: database.priority,
                            _intent: parsedIntent.intent,
                            
                            // Standardized fields with enhanced data
                            title: item.title || item.brief_title || item.name || item.pref_name || 'No title',
                            status: item.status || item.overall_status || item.status_significance || item.clinical_significance || 'Unknown',
                            phase: item.phase || item.phases?.[0] || item.max_phase || 'N/A',
                            sponsor: item.sponsor || item.lead_sponsor || item.source || 'Unknown',
                            year: item.year || item.publication_year || new Date(item.start_date || Date.now()).getFullYear(),
                            link: item.link || item.url || item.study_url || '#',
                            
                            // Intent-specific enrichment
                            description: QueryIntelligence.enhanceDescription(item, parsedIntent),
                            relevanceScore: QueryIntelligence.calculateRelevance(item, parsedIntent),
                            
                            // Additional standardized fields
                            enrollment: item.enrollment || item.enrollment_count || 'N/A',
                            conditions: item.conditions || item.condition_summary || [],
                            interventions: item.interventions || item.intervention_summary || []
                        }));
                    }
                    
                    console.log(`✅ ${database.name}: ${processedResults.length} results (${dbEndTime - dbStartTime}ms) - Intent: ${parsedIntent.intent}`);
                    
                    return {
                        database: dbId,
                        databaseName: database.name,
                        results: processedResults,
                        total: data.total || data.count || processedResults.length,
                        searchTime: dbEndTime - dbStartTime,
                        success: true,
                        intent: parsedIntent.intent,
                        apiStatus: data.api_status || 'success',
                        metadata: {
                            searchStrategies: data.search_strategies || [],
                            responseTime: data.response_time || (dbEndTime - dbStartTime),
                            dataSource: data.data_source || database.name,
                            intentMatched: data.intent || parsedIntent.intent,
                            expectedResults: limits[dbId],
                            actualResults: processedResults.length
                        }
                    };
                    
                } catch (error) {
                    const dbEndTime = Date.now();
                    console.error(`❌ ${database.name} failed:`, error.message);
                    
                    return {
                        database: dbId,
                        databaseName: database.name,
                        results: [],
                        total: 0,
                        searchTime: dbEndTime - dbStartTime,
                        success: false,
                        error: error.message,
                        errorType: error.name,
                        intent: parsedIntent.intent
                    };
                }
            });

            // Wait for all searches with comprehensive results
            const searchResults = await Promise.allSettled(searchPromises);
            
            // Process and combine results with intelligence
            const successfulResults = [];
            const failedResults = [];
            let totalResults = 0;
            
            searchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    const dbResult = result.value;
                    if (dbResult.success && dbResult.results.length > 0) {
                        successfulResults.push(dbResult);
                        totalResults += dbResult.results.length;
                    } else if (!dbResult.success) {
                        failedResults.push(dbResult);
                    }
                } else {
                    failedResults.push({
                        error: result.reason.message,
                        databaseName: 'Unknown'
                    });
                }
            });
            
            // Combine all results with intelligent sorting
            const combinedResults = successfulResults.reduce((acc, dbResult) => {
                acc.push(...dbResult.results);
                return acc;
            }, []);
            
            // 🎯 INTENT-AWARE SORTING for better results organization
            combinedResults.sort((a, b) => {
                // Priority 1: Intent-specific relevance
                if (a.relevanceScore !== b.relevanceScore) {
                    return (b.relevanceScore || 0) - (a.relevanceScore || 0);
                }
                
                // Priority 2: Database priority for the specific intent
                const dbPriorityA = QueryIntelligence.getDatabasePriorityForIntent(a._database, parsedIntent);
                const dbPriorityB = QueryIntelligence.getDatabasePriorityForIntent(b._database, parsedIntent);
                if (dbPriorityA !== dbPriorityB) {
                    return dbPriorityB - dbPriorityA;
                }
                
                // Priority 3: Clinical relevance (Active/Recruiting trials first)
                const statusPriorityA = getEnhancedStatusPriority(a.status);
                const statusPriorityB = getEnhancedStatusPriority(b.status);
                if (statusPriorityA !== statusPriorityB) {
                    return statusPriorityB - statusPriorityA;
                }
                
                // Priority 4: Recency
                return (b.year || 0) - (a.year || 0);
            });
            
            setResults(combinedResults);
            
            // Enhanced search logging with intent tracking
            const searchEndTime = Date.now();
            const totalSearchTime = searchEndTime - searchStartTime;
            
            setSearchLogs(prev => prev.map(log => 
                log.id === searchId 
                    ? { 
                        ...log, 
                        status: 'completed',
                        intent: parsedIntent,
                        resultsCount: combinedResults.length,
                        duration: totalSearchTime,
                        summary: {
                            successful: successfulResults.length,
                            failed: failedResults.length,
                            totalResults: combinedResults.length,
                            avgSearchTime: Math.round(totalSearchTime / selectedDatabases.length),
                            intentMatched: parsedIntent.intent,
                            confidence: parsedIntent.confidence
                        }
                    }
                    : log
            ));
            
            // 🎉 SUCCESS REPORTING with intent analysis
            console.log(`🎉 GRID Search Completed Successfully!`);
            console.log(`🧠 Intent: ${parsedIntent.intent} (${Math.round(parsedIntent.confidence * 100)}% confidence)`);
            console.log(`📊 Results: ${combinedResults.length} total`);
            console.log(`✅ Successful databases: ${successfulResults.length}/${selectedDatabases.length}`);
            console.log(`⏱️ Total time: ${totalSearchTime}ms`);
            
            // Show detailed results breakdown by intent
            if (parsedIntent.intent !== 'GENERIC_SEARCH') {
                const intentResults = combinedResults.filter(r => r._intent === parsedIntent.intent);
                console.log(`🎯 Intent-specific results: ${intentResults.length}`);
            }
            
            if (failedResults.length > 0) {
                console.warn(`⚠️ Failed databases: ${failedResults.map(f => f.databaseName).join(', ')}`);
            }
            
            // Enhanced user feedback for different scenarios
            if (combinedResults.length === 0) {
                const suggestion = QueryIntelligence.getSuggestionForIntent(parsedIntent);
                setError(
                    `No results found for "${searchQuery}". ` +
                    `${failedResults.length > 0 ? `${failedResults.length} databases had errors. ` : ''}` +
                    `💡 ${suggestion}`
                );
            } else if (combinedResults.length < 10 && parsedIntent.intent !== 'GENERIC_SEARCH') {
                console.log(`ℹ️ Found ${combinedResults.length} results. For queries like "${parsedIntent.intent}", you might expect more comprehensive results.`);
            }

        } catch (error) {
            const searchEndTime = Date.now();
            const totalSearchTime = searchEndTime - searchStartTime;
            
            console.error('🚨 GRID Search failed:', error);
            setError(`Search failed: ${error.message}. Please try a different query or check your connection.`);
            
            setSearchLogs(prev => prev.map(log => 
                log.id === searchId 
                    ? { 
                        ...log, 
                        status: 'failed',
                        error: error.message,
                        duration: totalSearchTime,
                        intent: parsedIntent
                    }
                    : log
            ));
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedDatabases]);

    // Enhanced QueryIntelligence helper methods
    QueryIntelligence.getExpectedResultCount = (intent) => {
        const expectedCounts = {
            'DRUG_DISEASES_PHASE': 500,  // For comprehensive results like 74 for imatinib Phase 2
            'DRUG_APPROVED_DISEASES': 200, // For results like 13 for rituximab
            'DRUG_TOXICITIES': 100,       // For results like 7 for dasatinib
            'COMPOUND_TARGETS': 50,       // For binding affinity data
            'TARGET_DISEASES': 300,       // For results like 25 for JAK2
            'TARGET_INTERACTIONS': 300,   // For results like 25 for ENSG00000141510
            'DISEASE_COMPOUNDS': 300,     // For results like 25 for EFO_0000756
            'GENERIC_SEARCH': 200
        };
        return expectedCounts[intent.intent] || 200;
    };

    QueryIntelligence.getDatabasePriorityForIntent = (dbId, intent) => {
        const priorities = {
            'DRUG_DISEASES_PHASE': { opentargets: 10, clinicaltrials: 9, chembl: 7 },
            'DRUG_APPROVED_DISEASES': { opentargets: 10, clinicaltrials: 9, drugbank: 8 },
            'DRUG_TOXICITIES': { opentargets: 10, drugbank: 9, clinvar: 7 },
            'COMPOUND_TARGETS': { opentargets: 10, chembl: 9, drugbank: 7 },
            'TARGET_DISEASES': { opentargets: 10, clinvar: 8, pubmed: 7 },
            'TARGET_INTERACTIONS': { opentargets: 10, pubmed: 8 },
            'DISEASE_COMPOUNDS': { opentargets: 10, drugbank: 9, clinicaltrials: 8 },
            'GENERIC_SEARCH': { opentargets: 8, clinicaltrials: 9, chembl: 7, drugbank: 7, clinvar: 6, pubmed: 8 }
        };
        return priorities[intent.intent]?.[dbId] || 5;
    };

    QueryIntelligence.enhanceDescription = (item, intent) => {
        const baseDescription = item.details || item.brief_summary || item.description || '';
        
        // Add intent-specific context
        switch (intent.intent) {
            case 'DRUG_DISEASES_PHASE':
                return `Phase ${intent.phase} clinical development: ${baseDescription}`;
            case 'DRUG_APPROVED_DISEASES':
                return `Approved indication: ${baseDescription}`;
            case 'DRUG_TOXICITIES':
                return `Safety profile: ${baseDescription}`;
            default:
                return baseDescription;
        }
    };

    QueryIntelligence.calculateRelevance = (item, intent) => {
        let score = 0.5; // Base score
        
        // Boost relevance based on intent matching
        if (intent.intent === 'DRUG_DISEASES_PHASE' && item.phase?.includes(intent.phase?.toString())) {
            score += 0.3;
        }
        
        if (intent.drug && (item.title?.toLowerCase().includes(intent.drug) || 
                           item.intervention_summary?.toLowerCase().includes(intent.drug))) {
            score += 0.2;
        }
        
        return Math.min(1.0, score);
    };

    QueryIntelligence.getSuggestionForIntent = (intent) => {
        const suggestions = {
            'DRUG_DISEASES_PHASE': `Try specific drug names like "imatinib", "pembrolizumab", or "rituximab" with phase numbers.`,
            'DRUG_APPROVED_DISEASES': `Try approved drug names like "rituximab", "imatinib", or "dasatinib".`,
            'DRUG_TOXICITIES': `Try drug names like "dasatinib", "imatinib", or "pembrolizumab" with "toxicities" or "adverse effects".`,
            'COMPOUND_TARGETS': `Try compound IDs like "CHEMBL25" or drug names with "targets" or "binding".`,
            'TARGET_DISEASES': `Try target names like "JAK2", "EGFR", or "TP53" with "diseases".`,
            'TARGET_INTERACTIONS': `Try target IDs like "ENSG00000141510" or gene symbols with "interactions".`,
            'DISEASE_COMPOUNDS': `Try disease IDs like "EFO_0000756" or disease names with "compounds".`,
            'GENERIC_SEARCH': `Try specific terms like drug names, targets, or disease types.`
        };
        return suggestions[intent.intent] || suggestions['GENERIC_SEARCH'];
    };

    // Status priority helper (existing function)
    const getEnhancedStatusPriority = useCallback((status) => {
        if (!status) return 0;
        const statusStr = status.toLowerCase();
        if (statusStr.includes('recruiting')) return 10;
        if (statusStr.includes('active') && !statusStr.includes('not')) return 9;
        if (statusStr.includes('approved')) return 8;
        if (statusStr.includes('enrolling')) return 8;
        if (statusStr.includes('completed')) return 7;
        if (statusStr.includes('available')) return 6;
        if (statusStr.includes('published')) return 5;
        if (statusStr.includes('pathogenic')) return 5;
        if (statusStr.includes('likely pathogenic')) return 4;
        if (statusStr.includes('terminated') || statusStr.includes('withdrawn')) return 1;
        return 3;
    }, []);

    // Enhanced filtering with intent awareness
    const enhancedFilteredResults = useMemo(() => {
        let filtered = [...results];
        
        // Enhanced filtering with better search logic
        if (searchWithinResults) {
            const searchTerms = searchWithinResults.toLowerCase().split(' ');
            filtered = filtered.filter(item => {
                const searchableText = [
                    item.title,
                    item.brief_title,
                    item.condition_summary,
                    item.intervention_summary,
                    item.sponsor,
                    item.phase,
                    item.status,
                    item._databaseName,
                    item.description
                ].join(' ').toLowerCase();
                
                return searchTerms.every(term => searchableText.includes(term));
            });
        }

        // Apply database filter
        if (databaseFilter) {
            filtered = filtered.filter(item => item._database === databaseFilter);
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
    }, [results, searchWithinResults, databaseFilter, sortConfig]);

    // Enhanced analytics with intent insights
    const enhancedAnalytics = useMemo(() => {
        const analysisResults = enhancedFilteredResults;
        
        // Database distribution
        const databaseDistribution = databases.map(db => {
            const dbResults = analysisResults.filter(item => item._database === db.id);
            return {
                name: db.name,
                count: dbResults.length,
                icon: db.icon,
                category: db.category,
                percentage: analysisResults.length > 0 ? Math.round((dbResults.length / analysisResults.length) * 100) : 0
            };
        }).filter(db => db.count > 0).sort((a, b) => b.count - a.count);

        // Intent analysis
        const intentDistribution = analysisResults.reduce((acc, item) => {
            const intent = item._intent || 'Unknown';
            acc[intent] = (acc[intent] || 0) + 1;
            return acc;
        }, {});

        // Enhanced status distribution
        const statusDistribution = analysisResults.reduce((acc, item) => {
            const status = item.status || item.overall_status || 'Unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        // Enhanced phase distribution
        const phaseDistribution = analysisResults.reduce((acc, item) => {
            let phase = item.phase || 'Unknown';
            // Normalize phase names
            if (phase.includes('Phase I') && !phase.includes('Phase II')) phase = 'Phase I';
            else if (phase.includes('Phase II') && !phase.includes('Phase III')) phase = 'Phase II';
            else if (phase.includes('Phase III') && !phase.includes('Phase IV')) phase = 'Phase III';
            else if (phase.includes('Phase IV')) phase = 'Phase IV';
            else if (phase.includes('Approved')) phase = 'Approved';
            else if (phase === 'N/A' || phase === 'Not specified') phase = 'Not specified';
            
            acc[phase] = (acc[phase] || 0) + 1;
            return acc;
        }, {});

        return {
            total: analysisResults.length,
            databaseDistribution,
            intentDistribution,
            statusDistribution,
            phaseDistribution,
            queryIntent: queryIntent,
            summary: {
                activeStudies: analysisResults.filter(r => 
                    (r.status || '').toLowerCase().includes('recruiting') || 
                    (r.status || '').toLowerCase().includes('active')
                ).length,
                recentStudies: analysisResults.filter(r => 
                    (r.year || 0) >= new Date().getFullYear() - 2
                ).length,
                approvedDrugs: analysisResults.filter(r => 
                    (r.phase || '').toLowerCase().includes('approved') ||
                    (r.status || '').toLowerCase().includes('approved')
                ).length,
                intentMatches: queryIntent ? analysisResults.filter(r => r._intent === queryIntent.intent).length : 0
            }
        };
    }, [enhancedFilteredResults, queryIntent]);

    // Export functionality (existing)
    const exportResults = useCallback(() => {
        const timestamp = new Date().toISOString().split('T')[0];
        const csvHeaders = [
            'Database', 'Title', 'ID', 'Status', 'Phase', 'Sponsor', 'Year', 
            'Enrollment', 'Conditions', 'Intent', 'Relevance Score', 'Link'
        ];
        
        const csvData = enhancedFilteredResults.map(item => [
            item._databaseName || 'Unknown',
            (item.title || item.brief_title || 'N/A').replace(/"/g, '""'),
            item.id || item.nct_id || item.chembl_id || 'N/A',
            item.status || 'N/A',
            item.phase || 'N/A',
            item.sponsor || 'N/A',
            item.year || 'N/A',
            item.enrollment || 'N/A',
            Array.isArray(item.conditions) ? item.conditions.slice(0,3).join('; ') : (item.condition_summary || 'N/A'),
            item._intent || 'N/A',
            item.relevanceScore || 'N/A',
            item.link || item.url || 'N/A'
        ]);

        const csvContent = [csvHeaders, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `GRID_pharmaceutical_research_${timestamp}_${enhancedFilteredResults.length}results_${queryIntent?.intent || 'search'}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`📊 Exported ${enhancedFilteredResults.length} results to CSV with intent: ${queryIntent?.intent}`);
    }, [enhancedFilteredResults, queryIntent]);

    // Get status badge style (existing function)
    const getStatusBadgeStyle = (status) => {
        const baseStyle = {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.025em'
        };
        
        const statusLower = (status || '').toLowerCase();
        
        if (statusLower.includes('recruiting') || statusLower.includes('active')) {
            return { ...baseStyle, backgroundColor: '#c6f6d5', color: '#22543d' };
        } else if (statusLower.includes('completed')) {
            return { ...baseStyle, backgroundColor: '#bee3f8', color: '#2a4365' };
        } else if (statusLower.includes('approved')) {
            return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
        } else {
            return { ...baseStyle, backgroundColor: '#e2e8f0', color: '#4a5568' };
        }
    };

    // Enhanced inline styles
    const styles = {
        container: {
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            backgroundColor: '#ffffff',
            minHeight: '100vh'
        },
        header: {
            marginBottom: '20px',
            textAlign: 'center'
        },
        title: {
            fontSize: '2.25rem',
            fontWeight: 'bold',
            color: '#1a202c',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
        },
        subtitle: {
            fontSize: '1rem',
            color: '#4a5568',
            marginBottom: '15px'
        },
        
        // Enhanced Search Section with Intelligence Indicator
        searchSection: {
            backgroundColor: '#f8fafc',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '25px',
            border: '2px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            position: 'relative'
        },
        searchTitle: {
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#2d3748',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        searchInputContainer: {
            display: 'flex',
            gap: '12px',
            marginBottom: '16px'
        },
        searchInputWrapper: {
            position: 'relative',
            flex: 1
        },
        searchInput: {
            width: '100%',
            padding: '14px 16px 14px 44px',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '1.1rem',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            minHeight: '52px'
        },
        searchIcon: {
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#a0aec0'
        },
        
        // Intent Display
        intentDisplay: {
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            borderRadius: '20px',
            fontSize: '0.75rem',
            color: '#4f46e5',
            fontWeight: '500'
        },
        
        // Tab Navigation
        tabContainer: {
            borderBottom: '2px solid #e2e8f0',
            marginBottom: '25px'
        },
        tabNav: {
            display: 'flex',
            gap: '20px',
            marginBottom: '-2px'
        },
        tab: {
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            borderBottom: '2px solid transparent',
            color: '#718096',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        activeTab: {
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            borderBottom: '2px solid #4299e1',
            color: '#4299e1',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        
        // Database Selection
        databaseSection: {
            marginBottom: '25px'
        },
        sectionTitle: {
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#2d3748',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        databaseGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
        },
        databaseCard: {
            padding: '18px',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            position: 'relative'
        },
        databaseCardSelected: {
            padding: '18px',
            border: '2px solid #4299e1',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: '#ebf8ff',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 12px rgba(66, 153, 225, 0.15)',
            position: 'relative'
        },
        priorityBadge: {
            position: 'absolute',
            top: '8px',
            right: '8px',
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '10px',
            fontWeight: '500',
            textTransform: 'uppercase'
        },
        highPriority: {
            backgroundColor: '#f0fff4',
            color: '#2f855a',
            border: '1px solid #9ae6b4'
        },
        mediumPriority: {
            backgroundColor: '#fffaf0',
            color: '#c05621',
            border: '1px solid #fbd38d'
        },
        
        // Results Section
        resultsContainer: {
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '30px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
        },
        resultsHeader: {
            padding: '24px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
        },
        resultsTitle: {
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#2d3748',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        resultsControls: {
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
        },
        controlInput: {
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '0.875rem',
            minWidth: '150px'
        },
        
        // Buttons
        primaryButton: {
            padding: '14px 28px',
            backgroundColor: '#4299e1',
            color: '#ffffff',
            borderRadius: '12px',
            border: 'none',
            fontSize: '1.1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minHeight: '52px'
        },
        secondaryButton: {
            padding: '12px 24px',
            backgroundColor: '#718096',
            color: '#ffffff',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        },
        
        // Table styles
        table: {
            width: '100%',
            borderCollapse: 'collapse'
        },
        tableHeader: {
            backgroundColor: '#f8fafc',
            borderBottom: '2px solid #e2e8f0'
        },
        tableHeaderCell: {
            padding: '16px',
            textAlign: 'left',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#4a5568',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            cursor: 'pointer'
        },
        tableRow: {
            borderBottom: '1px solid #f1f5f9',
            transition: 'background-color 0.2s ease'
        },
        tableCell: {
            padding: '16px',
            fontSize: '0.875rem',
            color: '#2d3748',
            verticalAlign: 'top'
        },
        
        // Error and other states
        errorContainer: {
            padding: '16px',
            backgroundColor: '#fed7d7',
            border: '1px solid #feb2b2',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        errorText: {
            color: '#c53030',
            fontSize: '0.875rem'
        },
        emptyState: {
            textAlign: 'center',
            padding: '60px 20px',
            color: '#718096'
        },
        emptyStateIcon: {
            fontSize: '3rem',
            marginBottom: '16px',
            color: '#a0aec0'
        }
    };

    // Enhanced Search Section Component with Intelligence Display
    const renderSearchSection = () => (
        <div style={styles.searchSection}>
            {/* Intent Display */}
            {queryIntent && (
                <div style={styles.intentDisplay}>
                    <Brain size={12} />
                    <span>{queryIntent.intent}</span>
                    <span>({Math.round(queryIntent.confidence * 100)}%)</span>
                </div>
            )}
            
            <h2 style={styles.searchTitle}>
                <Search size={20} />
                Intelligent Pharmaceutical Research
                {queryIntent && (
                    <Zap size={16} style={{ color: '#f59e0b', marginLeft: '8px' }} />
                )}
            </h2>
            
            <div style={styles.searchInputContainer}>
                <div style={styles.searchInputWrapper}>
                    <Search style={styles.searchIcon} size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter your intelligent query (e.g., 'List diseases in Phase 2 for imatinib', 'Show approved diseases for rituximab', 'Get toxicities for dasatinib')"
                        style={styles.searchInput}
                        onKeyPress={(e) => e.key === 'Enter' && executeSearch()}
                        onFocus={(e) => e.target.style.borderColor = '#4299e1'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                </div>
                <button
                    onClick={executeSearch}
                    disabled={loading || !searchQuery.trim() || selectedDatabases.length === 0}
                    style={{
                        ...styles.primaryButton,
                        opacity: (loading || !searchQuery.trim() || selectedDatabases.length === 0) ? 0.6 : 1,
                        cursor: (loading || !searchQuery.trim() || selectedDatabases.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                            e.target.style.backgroundColor = '#3182ce';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!e.target.disabled) {
                            e.target.style.backgroundColor = '#4299e1';
                        }
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                            <span>Analyzing with AI...</span>
                        </>
                    ) : (
                        <>
                            <Brain size={20} />
                            <span>Execute Intelligent Search</span>
                        </>
                    )}
                </button>
            </div>

            {/* Enhanced Database Selection */}
            <div style={styles.databaseSection}>
                <h3 style={{ ...styles.sectionTitle, fontSize: '1rem', marginBottom: '12px' }}>
                    <Database size={16} />
                    Selected Databases ({selectedDatabases.length}/{databases.length})
                    {queryIntent && queryIntent.recommendedDatabases && (
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'normal', marginLeft: '8px' }}>
                            (AI recommends: {queryIntent.recommendedDatabases.join(', ')})
                        </span>
                    )}
                </h3>
                <div style={styles.databaseGrid}>
                    {databases.map((db) => {
                        const isRecommended = queryIntent?.recommendedDatabases?.includes(db.id);
                        const isSelected = selectedDatabases.includes(db.id);
                        
                        return (
                            <div
                                key={db.id}
                                style={{
                                    ...(isSelected ? styles.databaseCardSelected : styles.databaseCard),
                                    ...(isRecommended && !isSelected ? { borderColor: '#f59e0b', borderStyle: 'dashed' } : {})
                                }}
                                onClick={() => {
                                    setSelectedDatabases(prev => 
                                        prev.includes(db.id)
                                            ? prev.filter(id => id !== db.id)
                                            : [...prev, db.id]
                                    );
                                }}
                            >
                                <div style={{
                                    ...styles.priorityBadge,
                                    ...(db.priority === 'high' ? styles.highPriority : styles.mediumPriority)
                                }}>
                                    {db.priority}
                                </div>
                                {isRecommended && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '8px',
                                        left: '8px',
                                        fontSize: '0.7rem',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        fontWeight: '500',
                                        backgroundColor: '#fef3c7',
                                        color: '#92400e',
                                        border: '1px solid #fbbf24'
                                    }}>
                                        AI REC
                                    </div>
                                )}
                                <span style={{ fontSize: '1.5rem' }}>{db.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>
                                        {db.name}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#718096' }}>
                                        {db.description}
                                    </div>
                                    {db.capabilities && (
                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
                                            Capabilities: {db.capabilities.slice(0, 2).join(', ')}
                                        </div>
                                    )}
                                </div>
                                <div style={isSelected ? 
                                    { width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#4299e1', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' } :
                                    { width: '20px', height: '20px', borderRadius: '4px', border: '2px solid #e2e8f0' }
                                }>
                                    {isSelected && <CheckCircle size={16} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div style={styles.errorContainer}>
                    <AlertCircle size={20} />
                    <span style={styles.errorText}>{error}</span>
                </div>
            )}
        </div>
    );

    // Enhanced Results Table Component
    const renderResultsTable = () => {
        if (enhancedFilteredResults.length === 0) {
            return (
                <div style={styles.emptyState}>
                    <Table size={48} style={styles.emptyStateIcon} />
                    <p>No results to display. Please perform an intelligent search first to see comprehensive results here.</p>
                    {queryIntent && (
                        <p style={{ marginTop: '12px', fontSize: '0.875rem', color: '#6b7280' }}>
                            Last query intent: {queryIntent.intent} ({Math.round(queryIntent.confidence * 100)}% confidence)
                        </p>
                    )}
                </div>
            );
        }

        return (
            <div style={styles.resultsContainer}>
                <div style={styles.resultsHeader}>
                    <h3 style={styles.resultsTitle}>
                        <Table size={20} />
                        Intelligent Search Results ({enhancedFilteredResults.length})
                        {queryIntent && (
                            <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 'normal', marginLeft: '8px' }}>
                                Intent: {queryIntent.intent}
                            </span>
                        )}
                    </h3>
                    <div style={styles.resultsControls}>
                        <input
                            type="text"
                            value={searchWithinResults}
                            onChange={(e) => setSearchWithinResults(e.target.value)}
                            placeholder="Search within results..."
                            style={styles.controlInput}
                        />
                        <select
                            value={databaseFilter}
                            onChange={(e) => setDatabaseFilter(e.target.value)}
                            style={styles.controlInput}
                        >
                            <option value="">All Databases</option>
                            {databases.map(db => (
                                <option key={db.id} value={db.id}>
                                    {db.name} ({results.filter(r => r._database === db.id).length})
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={exportResults}
                            style={{
                                ...styles.primaryButton,
                                backgroundColor: '#38a169',
                                padding: '10px 16px',
                                fontSize: '0.875rem'
                            }}
                        >
                            <Download size={16} />
                            Export CSV
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead style={styles.tableHeader}>
                            <tr>
                                <th style={styles.tableHeaderCell}>Database</th>
                                <th style={styles.tableHeaderCell}>Study Details</th>
                                <th style={styles.tableHeaderCell}>Status & Phase</th>
                                <th style={styles.tableHeaderCell}>Sponsor</th>
                                <th style={styles.tableHeaderCell}>Intent Match</th>
                                <th style={styles.tableHeaderCell}>Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enhancedFilteredResults.map((result) => (
                                <tr 
                                    key={result._id} 
                                    style={styles.tableRow}
                                    onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = '#f7fafc'}
                                    onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = 'transparent'}
                                >
                                    <td style={styles.tableCell}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.125rem' }}>
                                                {result._icon}
                                            </span>
                                            <div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                                                    {result._databaseName}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                                                    {result._category}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={styles.tableCell}>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', color: '#2d3748', marginBottom: '4px', fontWeight: '500' }}>
                                                {result.title || result.brief_title || 'No title'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '2px' }}>
                                                ID: {result.id || result.nct_id || 'N/A'}
                                            </div>
                                            {result.condition_summary && (
                                                <div style={{ fontSize: '0.75rem', color: '#4a5568' }}>
                                                    Conditions: {result.condition_summary}
                                                </div>
                                            )}
                                            {result.description && (
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                                                    {result.description.substring(0, 100)}...
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={styles.tableCell}>
                                        <div>
                                            <span style={getStatusBadgeStyle(result.status || result.overall_status)}>
                                                {result.status || result.overall_status || 'Unknown'}
                                            </span>
                                            <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '4px' }}>
                                                {result.phase || 'N/A'}
                                            </div>
                                            {result.year && (
                                                <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                                                    Year: {result.year}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={styles.tableCell}>
                                        <div style={{ fontSize: '0.875rem' }}>
                                            {result.sponsor || result.lead_sponsor || 'Unknown'}
                                        </div>
                                        {result.enrollment && result.enrollment !== 'N/A' && (
                                            <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                                                Enrollment: {result.enrollment}
                                            </div>
                                        )}
                                    </td>
                                    <td style={styles.tableCell}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {result._intent === queryIntent?.intent ? (
                                                <>
                                                    <CheckCircle size={14} style={{ color: '#10b981' }} />
                                                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '500' }}>
                                                        Match
                                                    </span>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                    General
                                                </span>
                                            )}
                                        </div>
                                        {result.relevanceScore && (
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                                                Score: {Math.round(result.relevanceScore * 100)}%
                                            </div>
                                        )}
                                    </td>
                                    <td style={styles.tableCell}>
                                        <a 
                                            href={result.link || result.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            style={{ 
                                                color: '#4299e1', 
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            View Details
                                            <ExternalLink size={12} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Enhanced Summary with Intent Information */}
                <div style={{ 
                    padding: '16px', 
                    borderTop: '1px solid #e2e8f0', 
                    backgroundColor: '#f7fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    color: '#4a5568',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span>
                            Showing {enhancedFilteredResults.length} of {results.length} results
                        </span>
                        {queryIntent && (
                            <span>
                                Intent matches: {enhancedAnalytics.summary.intentMatches}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {queryIntent && (
                            <span>
                                Query confidence: {Math.round(queryIntent.confidence * 100)}%
                            </span>
                        )}
                        <span>
                            Search completed in {searchLogs[0]?.duration || 0}ms
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    // Enhanced Analytics Component with Intent Analysis
    const renderAnalytics = () => {
        if (results.length === 0) {
            return (
                <div style={styles.emptyState}>
                    <BarChart3 size={48} style={styles.emptyStateIcon} />
                    <p>No data available. Please perform an intelligent search first to see comprehensive analytics.</p>
                </div>
            );
        }

        return (
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '24px',
                color: '#ffffff',
                marginBottom: '24px'
            }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={24} />
                    Intelligent Search Analytics
                    {queryIntent && (
                        <span style={{ fontSize: '1rem', fontWeight: 'normal', marginLeft: '8px' }}>
                            ({queryIntent.intent})
                        </span>
                    )}
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    {/* Database Distribution */}
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '16px', borderRadius: '8px' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '12px' }}>Database Distribution</h4>
                        <div>
                            {enhancedAnalytics.databaseDistribution.map((db) => (
                                <div key={db.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
                                        <span>{db.icon}</span>
                                        <span>{db.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{db.count}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                                            ({db.percentage}%)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Intent Analysis */}
                    {queryIntent && (
                        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '16px', borderRadius: '8px' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '12px' }}>Query Intelligence</h4>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                    <span style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Brain size={16} />
                                        Intent Detected
                                    </span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{queryIntent.intent}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                    <span style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Zap size={16} />
                                        Confidence
                                    </span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{Math.round(queryIntent.confidence * 100)}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                                    <span style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CheckCircle size={16} />
                                        Intent Matches
                                    </span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{enhancedAnalytics.summary.intentMatches}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Key Metrics */}
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '16px', borderRadius: '8px' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '12px' }}>Key Insights</h4>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <span style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <TrendingUp size={16} />
                                    Active Studies
                                </span>
                                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{enhancedAnalytics.summary.activeStudies}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <span style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Clock size={16} />
                                    Recent (2023+)
                                </span>
                                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{enhancedAnalytics.summary.recentStudies}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                                <span style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <CheckCircle size={16} />
                                    Approved
                                </span>
                                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{enhancedAnalytics.summary.approvedDrugs}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        Total Results: {enhancedAnalytics.total}
                        {queryIntent && queryIntent.intent !== 'GENERIC_SEARCH' && (
                            <span style={{ fontSize: '1rem', fontWeight: 'normal', marginLeft: '8px' }}>
                                | Intent: {queryIntent.intent}
                            </span>
                        )}
                    </span>
                    <button
                        onClick={exportResults}
                        style={{
                            ...styles.primaryButton,
                            backgroundColor: '#38a169',
                            color: '#ffffff'
                        }}
                    >
                        <Download size={16} />
                        <span>Export Intelligent Results</span>
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>
                    GRID - Global Research Intelligence Database
                </h1>
                <p style={styles.subtitle}>
                    AI-powered pharmaceutical intelligence platform • 6 specialized databases • Comprehensive drug discovery insights
                </p>
            </div>

            {/* Enhanced Search Section - Always at Top */}
            {renderSearchSection()}

            {/* Navigation Tabs */}
            <div style={styles.tabContainer}>
                <div style={styles.tabNav}>
                    <button
                        onClick={() => setActiveTab('search')}
                        style={activeTab === 'search' ? styles.activeTab : styles.tab}
                    >
                        <Brain size={16} />
                        Intelligent Search
                    </button>
                    <button
                        onClick={() => setActiveTab('results')}
                        style={activeTab === 'results' ? styles.activeTab : styles.tab}
                    >
                        <Table size={16} />
                        Results ({results.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        style={activeTab === 'analytics' ? styles.activeTab : styles.tab}
                    >
                        <BarChart3 size={16} />
                        Analytics
                        {queryIntent && <Zap size={12} style={{ color: '#f59e0b' }} />}
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'search' && (
                <div>
                    {/* Quick Analytics Summary */}
                    {results.length > 0 && renderAnalytics()}
                    
                    {/* Enhanced Sample Queries with Intent Examples */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Brain size={20} />
                            💡 Try These Intelligent Queries (AI-Powered)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                            {[
                                { query: 'List diseases in Phase 2 for imatinib', intent: 'DRUG_DISEASES_PHASE', expected: '74 results' },
                                { query: 'Show approved diseases for rituximab', intent: 'DRUG_APPROVED_DISEASES', expected: '13 results' },
                                { query: 'Get toxicities for dasatinib', intent: 'DRUG_TOXICITIES', expected: '7 results' },
                                { query: 'List targets for compound CHEMBL25', intent: 'COMPOUND_TARGETS', expected: 'Binding data' },
                                { query: 'Find diseases associated with JAK2', intent: 'TARGET_DISEASES', expected: '25 results' },
                                { query: 'Show interacting partners for ENSG00000141510', intent: 'TARGET_INTERACTIONS', expected: '25 results' },
                                { query: 'List approved compounds for disease EFO_0000756', intent: 'DISEASE_COMPOUNDS', expected: '25 results' },
                                { query: 'pembrolizumab melanoma trials', intent: 'GENERIC_SEARCH', expected: 'Clinical trials' }
                            ].map((sample) => (
                                <div key={sample.query} style={{
                                    padding: '14px',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #cbd5e0',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}>
                                    <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '4px', fontWeight: '500', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{sample.intent}</span>
                                        <span style={{ color: '#10b981' }}>{sample.expected}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSearchQuery(sample.query);
                                            executeSearch();
                                        }}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '0',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            fontSize: '0.875rem',
                                            color: '#1f2937',
                                            cursor: 'pointer',
                                            fontWeight: '500'
                                        }}
                                    >
                                        {sample.query}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'results' && renderResultsTable()}

            {activeTab === 'analytics' && (
                <div>
                    <h2 style={{ ...styles.sectionTitle, fontSize: '2rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={32} />
                        Advanced Intelligence Dashboard
                        {queryIntent && <Brain size={24} style={{ color: '#4f46e5' }} />}
                    </h2>
                    {renderAnalytics()}
                    {results.length > 0 && (
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '16px', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileSpreadsheet size={20} />
                                Enhanced Export Options
                            </h3>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={exportResults}
                                    style={{
                                        ...styles.primaryButton,
                                        backgroundColor: '#38a169'
                                    }}
                                >
                                    <FileSpreadsheet size={16} />
                                    Export to CSV with Intent Data
                                </button>
                                <button
                                    onClick={() => {
                                        console.log('Detailed analytics:', enhancedAnalytics);
                                        console.log('Query intent:', queryIntent);
                                        alert('Detailed analytics and intent data logged to console for further analysis');
                                    }}
                                    style={{
                                        ...styles.primaryButton,
                                        backgroundColor: '#6366f1'
                                    }}
                                >
                                    <Brain size={16} />
                                    View AI Analysis Data
                                </button>
                            </div>
                            {queryIntent && (
                                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                    <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: '0' }}>
                                        <strong>AI Insight:</strong> Your query "{queryIntent.originalQuery}" was interpreted as "{queryIntent.intent}" with {Math.round(queryIntent.confidence * 100)}% confidence. 
                                        {queryIntent.recommendedDatabases && (
                                            <span> AI recommended databases: {queryIntent.recommendedDatabases.join(', ')}.</span>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PharmaceuticalIntelligenceSystem;
