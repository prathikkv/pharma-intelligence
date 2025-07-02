import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, Filter, Database, BarChart3, TrendingUp, AlertCircle, CheckCircle, Clock, Star, StarOff, Eye, EyeOff, Loader2, RefreshCw, ArrowUpDown, ChevronDown, ChevronUp, X, ExternalLink } from 'lucide-react';

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

    // Comprehensive inline styles
    const styles = {
        container: {
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            backgroundColor: '#ffffff',
            minHeight: '100vh'
        },
        header: {
            marginBottom: '30px',
            textAlign: 'center'
        },
        title: {
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#1a202c',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
        },
        subtitle: {
            fontSize: '1.1rem',
            color: '#4a5568',
            marginBottom: '20px'
        },
        tabContainer: {
            borderBottom: '2px solid #e2e8f0',
            marginBottom: '30px'
        },
        tabNav: {
            display: 'flex',
            gap: '20px',
            marginBottom: '-2px'
        },
        tab: {
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            borderBottom: '2px solid transparent',
            color: '#718096',
            transition: 'all 0.2s ease'
        },
        activeTab: {
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            borderBottom: '2px solid #4299e1',
            color: '#4299e1'
        },
        sectionTitle: {
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#2d3748',
            marginBottom: '20px'
        },
        databaseGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '15px',
            marginBottom: '30px'
        },
        databaseCard: {
            padding: '16px',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        databaseCardSelected: {
            padding: '16px',
            border: '2px solid #4299e1',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: '#ebf8ff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(66, 153, 225, 0.15)'
        },
        databaseIcon: {
            fontSize: '2rem'
        },
        databaseInfo: {
            flex: 1
        },
        databaseName: {
            fontSize: '1rem',
            fontWeight: '600',
            color: '#2d3748',
            marginBottom: '4px'
        },
        databaseDesc: {
            fontSize: '0.875rem',
            color: '#718096',
            marginBottom: '4px'
        },
        databaseCategory: {
            fontSize: '0.75rem',
            color: '#a0aec0',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
        },
        checkbox: {
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            border: '2px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff'
        },
        checkboxSelected: {
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            border: '2px solid #4299e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#4299e1',
            color: '#ffffff'
        },
        buttonGroup: {
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            marginTop: '20px'
        },
        button: {
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        },
        primaryButton: {
            padding: '12px 24px',
            backgroundColor: '#4299e1',
            color: '#ffffff',
            borderRadius: '8px',
            border: 'none',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        secondaryButton: {
            padding: '10px 20px',
            backgroundColor: '#718096',
            color: '#ffffff',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        },
        searchContainer: {
            padding: '24px',
            backgroundColor: '#f7fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '30px'
        },
        searchInputContainer: {
            display: 'flex',
            gap: '12px',
            marginBottom: '16px'
        },
        searchInput: {
            flex: 1,
            padding: '12px 16px 12px 40px',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '1rem',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            position: 'relative'
        },
        searchInputWrapper: {
            position: 'relative',
            flex: 1
        },
        searchIcon: {
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#a0aec0'
        },
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
        analyticsContainer: {
            padding: '24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            marginBottom: '30px',
            color: '#ffffff'
        },
        analyticsTitle: {
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        analyticsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
        },
        analyticsSection: {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '16px',
            borderRadius: '8px'
        },
        analyticsSectionTitle: {
            fontSize: '1rem',
            fontWeight: '500',
            marginBottom: '12px',
            color: '#ffffff'
        },
        analyticsItem: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        },
        analyticsLabel: {
            fontSize: '0.875rem',
            color: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
        },
        analyticsValue: {
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#ffffff'
        },
        resultsContainer: {
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '30px'
        },
        resultsHeader: {
            padding: '20px',
            backgroundColor: '#f7fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
        },
        resultsTitle: {
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#2d3748'
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
            borderRadius: '6px',
            fontSize: '0.875rem'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse'
        },
        tableHeader: {
            backgroundColor: '#f7fafc',
            borderBottom: '1px solid #e2e8f0'
        },
        tableHeaderCell: {
            padding: '12px 16px',
            textAlign: 'left',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#4a5568',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
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
        statusBadge: {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: '600'
        },
        statusActive: {
            backgroundColor: '#c6f6d5',
            color: '#22543d'
        },
        statusCompleted: {
            backgroundColor: '#bee3f8',
            color: '#2a4365'
        },
        statusRecruiting: {
            backgroundColor: '#faf089',
            color: '#744210'
        },
        statusApproved: {
            backgroundColor: '#d4edda',
            color: '#155724'
        },
        statusDefault: {
            backgroundColor: '#e2e8f0',
            color: '#4a5568'
        },
        actionButton: {
            padding: '6px 12px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
        },
        bookmarkButton: {
            padding: '4px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#a0aec0',
            transition: 'color 0.2s ease'
        },
        bookmarkButtonActive: {
            padding: '4px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#f6e05e',
            transition: 'color 0.2s ease'
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
        },
        badge: {
            display: 'inline-block',
            padding: '4px 8px',
            backgroundColor: '#e2e8f0',
            color: '#4a5568',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '500'
        },
        logContainer: {
            backgroundColor: '#f7fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
        },
        logEntry: {
            padding: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            marginBottom: '8px'
        }
    };

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

    // Enhanced status priority for pharmaceutical research
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

    // Database priority for pharmaceutical research
    const getDatabasePriority = useCallback((category, database) => {
        if (category === 'Clinical') return 10;  // ClinicalTrials.gov
        if (category === 'Drugs' || category === 'Chemistry') return 9;  // DrugBank, ChEMBL
        if (category === 'Targets') return 8;  // Open Targets
        if (category === 'Genetics') return 7;  // ClinVar
        if (category === 'Proteins') return 6;  // UniProt, HPA
        if (category === 'Pharmacology') return 6;  // IUPHAR
        if (category === 'Literature') return 5;  // PubMed
        if (category === 'Genomics') return 4;  // MGI
        return 3;
    }, []);

    // Enhanced phase number extraction
    const getPhaseNumber = useCallback((phase) => {
        if (!phase) return 0;
        const phaseStr = phase.toLowerCase();
        if (phaseStr.includes('approved') || phaseStr.includes('phase iv') || phaseStr.includes('phase 4')) return 4;
        if (phaseStr.includes('phase iii') || phaseStr.includes('phase 3')) return 3;
        if (phaseStr.includes('phase ii') || phaseStr.includes('phase 2')) return 2;
        if (phaseStr.includes('phase i') || phaseStr.includes('phase 1')) return 1;
        return 0;
    }, []);

    // ENHANCED SEARCH FUNCTION - Production Level
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
        
        const logEntry = {
            id: searchId,
            query: searchQuery,
            databases: selectedDatabases,
            timestamp: new Date().toISOString(),
            status: 'running'
        };
        setSearchLogs(prev => [logEntry, ...prev]);

        try {
            console.log(`🔍 GRID Search: "${searchQuery}" across ${selectedDatabases.length} databases`);
            
            // ENHANCED parallel search with better limits and error handling
            const searchPromises = selectedDatabases.map(async (dbId) => {
                const database = databases.find(db => db.id === dbId);
                const dbStartTime = Date.now();
                
                try {
                    // INCREASED LIMITS for comprehensive results
                    const limits = {
                        'clinicaltrials': 1000,  // ClinicalTrials can handle large requests
                        'opentargets': 300,      // Our enhanced Open Targets
                        'chembl': 200,           // ChEMBL comprehensive search
                        'pubmed': 100,           // PubMed rate limited
                        'clinvar': 150,          // ClinVar genetic variants
                        'drugbank': 100,         // DrugBank drug data
                        'uniprot': 200,          // UniProt proteins
                        'hpa': 100,              // Human Protein Atlas
                        'mgi': 100,              // Mouse Genome Informatics
                        'iuphar': 100            // IUPHAR/BPS pharmacology
                    };
                    
                    const queryParams = new URLSearchParams({
                        query: searchQuery,
                        limit: (limits[dbId] || 200).toString(),
                        format: 'json'
                    });
                    
                    console.log(`📡 Querying ${database.name} (limit: ${limits[dbId] || 200})...`);
                    
                    const response = await fetch(`${database.endpoint}?${queryParams}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'User-Agent': 'GRID-Intelligence/3.0'
                        },
                        signal: AbortSignal.timeout(45000) // Increased timeout for comprehensive searches
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();
                    const dbEndTime = Date.now();
                    
                    // ENHANCED result processing
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
                            // STANDARDIZED fields across all databases
                            title: item.title || item.brief_title || item.name || item.pref_name || 'No title',
                            status: item.status || item.overall_status || item.status_significance || item.clinical_significance || 'Unknown',
                            phase: item.phase || item.phases?.[0] || item.max_phase || 'N/A',
                            sponsor: item.sponsor || item.lead_sponsor || item.source || 'Unknown',
                            year: item.year || item.publication_year || new Date(item.start_date || Date.now()).getFullYear(),
                            link: item.link || item.url || item.study_url || '#',
                            // Additional standardized fields
                            description: item.details || item.brief_summary || item.description || '',
                            enrollment: item.enrollment || item.enrollment_count || 'N/A',
                            conditions: item.conditions || item.condition_summary || [],
                            interventions: item.interventions || item.intervention_summary || []
                        }));
                    }
                    
                    console.log(`✅ ${database.name}: ${processedResults.length} results (${dbEndTime - dbStartTime}ms)`);
                    
                    return {
                        database: dbId,
                        databaseName: database.name,
                        results: processedResults,
                        total: data.total || data.count || processedResults.length,
                        searchTime: dbEndTime - dbStartTime,
                        success: true,
                        apiStatus: data.api_status || 'success',
                        metadata: {
                            searchStrategies: data.search_strategies || [],
                            responseTime: data.response_time || (dbEndTime - dbStartTime),
                            dataSource: data.data_source || database.name
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
                        errorType: error.name
                    };
                }
            });

            // Wait for all searches with progress tracking
            const searchResults = await Promise.allSettled(searchPromises);
            
            // ENHANCED result processing and aggregation
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
            
            // INTELLIGENT SORTING for pharmaceutical research
            combinedResults.sort((a, b) => {
                // Priority 1: Clinical relevance (Active/Recruiting trials first)
                const statusPriorityA = getEnhancedStatusPriority(a.status);
                const statusPriorityB = getEnhancedStatusPriority(b.status);
                if (statusPriorityA !== statusPriorityB) {
                    return statusPriorityB - statusPriorityA;
                }
                
                // Priority 2: Database relevance for drug research
                const dbPriorityA = getDatabasePriority(a._category, a._database);
                const dbPriorityB = getDatabasePriority(b._category, b._database);
                if (dbPriorityA !== dbPriorityB) {
                    return dbPriorityB - dbPriorityA;
                }
                
                // Priority 3: Clinical phase (higher phases first)
                const phaseA = getPhaseNumber(a.phase);
                const phaseB = getPhaseNumber(b.phase);
                if (phaseA !== phaseB) {
                    return phaseB - phaseA;
                }
                
                // Priority 4: Recency
                return (b.year || 0) - (a.year || 0);
            });
            
            setResults(combinedResults);
            
            // COMPREHENSIVE search logging
            const searchEndTime = Date.now();
            const totalSearchTime = searchEndTime - searchStartTime;
            
            setSearchLogs(prev => prev.map(log => 
                log.id === searchId 
                    ? { 
                        ...log, 
                        status: 'completed',
                        resultsCount: combinedResults.length,
                        duration: totalSearchTime,
                        databases: searchResults.map(r => ({
                            name: r.status === 'fulfilled' ? r.value.databaseName : 'Unknown',
                            count: r.status === 'fulfilled' ? r.value.total : 0,
                            error: r.status === 'fulfilled' ? r.value.error : r.reason?.message,
                            searchTime: r.status === 'fulfilled' ? r.value.searchTime : 0,
                            apiStatus: r.status === 'fulfilled' ? r.value.apiStatus : 'failed'
                        })),
                        summary: {
                            successful: successfulResults.length,
                            failed: failedResults.length,
                            totalResults: combinedResults.length,
                            avgSearchTime: Math.round(totalSearchTime / selectedDatabases.length),
                            fastestDb: successfulResults.sort((a, b) => a.searchTime - b.searchTime)[0]?.databaseName,
                            slowestDb: successfulResults.sort((a, b) => b.searchTime - a.searchTime)[0]?.databaseName
                        }
                    }
                    : log
            ));
            
            // SUCCESS REPORTING
            console.log(`🎉 GRID Search Completed Successfully!`);
            console.log(`📊 Results: ${combinedResults.length} total`);
            console.log(`✅ Successful databases: ${successfulResults.length}/${selectedDatabases.length}`);
            console.log(`⏱️ Total time: ${totalSearchTime}ms`);
            console.log(`🔥 Top databases: ${successfulResults.slice(0, 3).map(r => `${r.databaseName}(${r.total})`).join(', ')}`);
            
            if (failedResults.length > 0) {
                console.warn(`⚠️ Failed databases: ${failedResults.map(f => f.databaseName).join(', ')}`);
            }
            
            // User feedback for zero results
            if (combinedResults.length === 0) {
                setError(
                    `No results found for "${searchQuery}". ` +
                    `${failedResults.length > 0 ? `${failedResults.length} databases had errors. ` : ''}` +
                    `💡 Try: (1) Broader terms like "cancer" or "diabetes", (2) Drug names like "imatinib", (3) Different databases.`
                );
            } else if (combinedResults.length < 10) {
                console.log(`💡 Tip: Try broader search terms for more results`);
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
                        duration: totalSearchTime
                    }
                    : log
            ));
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedDatabases, getEnhancedStatusPriority, getDatabasePriority, getPhaseNumber]);

    // Enhanced Filtering and Sorting
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
                    item._databaseName
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

    // Enhanced Analytics and Insights
    const enhancedAnalytics = useMemo(() => {
        const analysisResults = enhancedFilteredResults;
        
        // Database distribution with enhanced data
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

        // Enhanced status distribution
        const statusDistribution = analysisResults.reduce((acc, item) => {
            const status = item.status || item.overall_status || 'Unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        // Enhanced phase distribution with better parsing
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

        // Top sponsors with better data
        const sponsorDistribution = Object.entries(
            analysisResults.reduce((acc, item) => {
                const sponsor = item.sponsor || item.lead_sponsor || 'Unknown';
                acc[sponsor] = (acc[sponsor] || 0) + 1;
                return acc;
            }, {})
        ).sort(([,a], [,b]) => b - a).slice(0, 10);

        // Year distribution for trending analysis
        const yearDistribution = analysisResults.reduce((acc, item) => {
            const year = item.year || new Date().getFullYear();
            acc[year] = (acc[year] || 0) + 1;
            return acc;
        }, {});

        // Recent years for trending
        const currentYear = new Date().getFullYear();
        const recentYears = Object.entries(yearDistribution)
            .filter(([year]) => parseInt(year) >= currentYear - 5)
            .sort(([a], [b]) => b - a);

        return {
            total: analysisResults.length,
            databaseDistribution,
            statusDistribution,
            phaseDistribution,
            sponsorDistribution,
            yearDistribution,
            recentYears,
            summary: {
                activeStudies: analysisResults.filter(r => 
                    (r.status || '').toLowerCase().includes('recruiting') || 
                    (r.status || '').toLowerCase().includes('active')
                ).length,
                recentStudies: analysisResults.filter(r => 
                    (r.year || 0) >= currentYear - 2
                ).length,
                approvedDrugs: analysisResults.filter(r => 
                    (r.phase || '').toLowerCase().includes('approved') ||
                    (r.status || '').toLowerCase().includes('approved')
                ).length
            }
        };
    }, [enhancedFilteredResults]);

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

    // Enhanced Export Functionality
    const exportResults = useCallback(() => {
        const timestamp = new Date().toISOString().split('T')[0];
        const csvHeaders = [
            'Database', 'Title', 'ID', 'Status', 'Phase', 'Sponsor', 'Year', 
            'Enrollment', 'Conditions', 'Link', 'Search_Time_MS'
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
            item.link || item.url || 'N/A',
            item._searchTime || 'N/A'
        ]);

        const csvContent = [csvHeaders, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `GRID_pharmaceutical_research_${timestamp}_${enhancedFilteredResults.length}results.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`📊 Exported ${enhancedFilteredResults.length} results to CSV`);
    }, [enhancedFilteredResults]);

    // Get status badge style
    const getStatusBadgeStyle = (status) => {
        const baseStyle = styles.statusBadge;
        const statusLower = (status || '').toLowerCase();
        
        if (statusLower.includes('recruiting') || statusLower.includes('active')) {
            return { ...baseStyle, ...styles.statusActive };
        } else if (statusLower.includes('completed')) {
            return { ...baseStyle, ...styles.statusCompleted };
        } else if (statusLower.includes('not yet recruiting')) {
            return { ...baseStyle, ...styles.statusRecruiting };
        } else if (statusLower.includes('approved')) {
            return { ...baseStyle, ...styles.statusApproved };
        } else {
            return { ...baseStyle, ...styles.statusDefault };
        }
    };

    // Database Selection Component
    const renderDatabaseSelection = () => (
        <div style={{ marginBottom: '30px' }}>
            <h3 style={styles.sectionTitle}>Select Databases</h3>
            <div style={styles.databaseGrid}>
                {databases.map((db) => (
                    <div
                        key={db.id}
                        style={selectedDatabases.includes(db.id) ? styles.databaseCardSelected : styles.databaseCard}
                        onClick={() => {
                            setSelectedDatabases(prev => 
                                prev.includes(db.id)
                                    ? prev.filter(id => id !== db.id)
                                    : [...prev, db.id]
                            );
                        }}
                        onMouseEnter={(e) => {
                            if (!selectedDatabases.includes(db.id)) {
                                e.target.style.borderColor = '#a0aec0';
                                e.target.style.transform = 'translateY(-2px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!selectedDatabases.includes(db.id)) {
                                e.target.style.borderColor = '#e2e8f0';
                                e.target.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        <span style={styles.databaseIcon}>{db.icon}</span>
                        <div style={styles.databaseInfo}>
                            <div style={styles.databaseName}>{db.name}</div>
                            <div style={styles.databaseDesc}>{db.description}</div>
                            <div style={styles.databaseCategory}>{db.category}</div>
                        </div>
                        <div style={selectedDatabases.includes(db.id) ? styles.checkboxSelected : styles.checkbox}>
                            {selectedDatabases.includes(db.id) && <CheckCircle size={16} />}
                        </div>
                    </div>
                ))}
            </div>
            
            <div style={styles.buttonGroup}>
                <button
                    onClick={() => setSelectedDatabases(databases.map(db => db.id))}
                    style={styles.primaryButton}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#3182ce'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#4299e1'}
                >
                    Select All
                </button>
                <button
                    onClick={() => setSelectedDatabases([])}
                    style={styles.secondaryButton}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#4a5568'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#718096'}
                >
                    Clear All
                </button>
                <div style={{ flex: 1 }}></div>
                <span style={styles.badge}>
                    {selectedDatabases.length} of {databases.length} selected
                </span>
            </div>
        </div>
    );

    // Enhanced Analytics Display
    const renderEnhancedAnalytics = () => {
        if (results.length === 0) return null;

        return (
            <div style={styles.analyticsContainer}>
                <h3 style={styles.analyticsTitle}>
                    <BarChart3 size={20} />
                    Comprehensive Search Analytics
                </h3>
                
                <div style={styles.analyticsGrid}>
                    {/* Database Distribution */}
                    <div style={styles.analyticsSection}>
                        <h4 style={styles.analyticsSectionTitle}>Database Distribution</h4>
                        <div>
                            {enhancedAnalytics.databaseDistribution.map((db) => (
                                <div key={db.name} style={styles.analyticsItem}>
                                    <div style={styles.analyticsLabel}>
                                        <span>{db.icon}</span>
                                        <span>{db.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={styles.analyticsValue}>{db.count}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                                            ({db.percentage}%)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Distribution */}
                    <div style={styles.analyticsSection}>
                        <h4 style={styles.analyticsSectionTitle}>Status Distribution</h4>
                        <div>
                            {Object.entries(enhancedAnalytics.statusDistribution)
                                .sort(([,a], [,b]) => b - a)
                                .slice(0, 6)
                                .map(([status, count]) => (
                                <div key={status} style={styles.analyticsItem}>
                                    <span style={styles.analyticsLabel}>{status}</span>
                                    <span style={styles.analyticsValue}>{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Phase Distribution */}
                    <div style={styles.analyticsSection}>
                        <h4 style={styles.analyticsSectionTitle}>Phase Distribution</h4>
                        <div>
                            {Object.entries(enhancedAnalytics.phaseDistribution)
                                .sort(([,a], [,b]) => b - a)
                                .map(([phase, count]) => (
                                <div key={phase} style={styles.analyticsItem}>
                                    <span style={styles.analyticsLabel}>{phase}</span>
                                    <span style={styles.analyticsValue}>{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Key Insights */}
                    <div style={styles.analyticsSection}>
                        <h4 style={styles.analyticsSectionTitle}>Key Insights</h4>
                        <div>
                            <div style={styles.analyticsItem}>
                                <span style={styles.analyticsLabel}>
                                    <TrendingUp size={16} />
                                    Active Studies
                                </span>
                                <span style={styles.analyticsValue}>{enhancedAnalytics.summary.activeStudies}</span>
                            </div>
                            <div style={styles.analyticsItem}>
                                <span style={styles.analyticsLabel}>
                                    <Clock size={16} />
                                    Recent (2023+)
                                </span>
                                <span style={styles.analyticsValue}>{enhancedAnalytics.summary.recentStudies}</span>
                            </div>
                            <div style={styles.analyticsItem}>
                                <span style={styles.analyticsLabel}>
                                    <CheckCircle size={16} />
                                    Approved
                                </span>
                                <span style={styles.analyticsValue}>{enhancedAnalytics.summary.approvedDrugs}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        Total Results: {enhancedAnalytics.total}
                    </span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => {
                                console.log('Enhanced Analytics Data:', enhancedAnalytics);
                                alert('Analytics data logged to console for further analysis');
                            }}
                            style={{
                                ...styles.primaryButton,
                                backgroundColor: '#6366f1',
                                color: '#ffffff'
                            }}
                        >
                            <BarChart3 size={16} />
                            <span>View Details</span>
                        </button>
                        <button
                            onClick={exportResults}
                            style={{
                                ...styles.primaryButton,
                                backgroundColor: '#38a169',
                                color: '#ffffff'
                            }}
                        >
                            <Download size={16} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Enhanced Results Table
    const renderEnhancedResultsTable = () => {
        if (enhancedFilteredResults.length === 0) return null;

        return (
            <div style={styles.resultsContainer}>
                <div style={styles.resultsHeader}>
                    <h3 style={styles.resultsTitle}>
                        Search Results ({enhancedFilteredResults.length})
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
                                ...styles.actionButton,
                                backgroundColor: '#38a169',
                                color: '#ffffff'
                            }}
                        >
                            <Download size={16} />
                            Export
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
                                <th style={styles.tableHeaderCell}>Actions</th>
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
                                                <a 
                                                    href={result.link || result.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#4299e1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    {result.title || result.brief_title || 'View Study'}
                                                    <ExternalLink size={12} />
                                                </a>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '2px' }}>
                                                ID: {result.id || result.nct_id || 'N/A'}
                                            </div>
                                            {result.condition_summary && (
                                                <div style={{ fontSize: '0.75rem', color: '#4a5568' }}>
                                                    Conditions: {result.condition_summary}
                                                </div>
                                            )}
                                            {result.intervention_summary && (
                                                <div style={{ fontSize: '0.75rem', color: '#4a5568' }}>
                                                    Interventions: {result.intervention_summary}
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                onClick={() => toggleBookmark(result._id)}
                                                style={bookmarkedResults.includes(result._id) ? styles.bookmarkButtonActive : styles.bookmarkButton}
                                                title={bookmarkedResults.includes(result._id) ? 'Remove bookmark' : 'Add bookmark'}
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
                                                style={{
                                                    ...styles.actionButton,
                                                    backgroundColor: '#4299e1',
                                                    color: '#ffffff'
                                                }}
                                                title="View details"
                                            >
                                                {expandedResult === result._id ? 
                                                    <ChevronUp size={16} /> : 
                                                    <ChevronDown size={16} />
                                                }
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination info */}
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
                    <span>
                        Showing {enhancedFilteredResults.length} of {results.length} results
                    </span>
                    <span>
                        Search completed in {searchLogs[0]?.duration || 0}ms
                    </span>
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
                    Advanced multi-database pharmaceutical intelligence platform • Now returning 100s-1000s of comprehensive results
                </p>
            </div>

            {/* Navigation Tabs */}
            <div style={styles.tabContainer}>
                <div style={styles.tabNav}>
                    {['search', 'analytics', 'bookmarks'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={activeTab === tab ? styles.activeTab : styles.tab}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Tab */}
            {activeTab === 'search' && (
                <>
                    {renderDatabaseSelection()}
                    
                    {/* Search Interface */}
                    <div style={styles.searchContainer}>
                        <div style={styles.searchInputContainer}>
                            <div style={styles.searchInputWrapper}>
                                <Search style={styles.searchIcon} size={20} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Enter your research query (e.g., 'imatinib cancer phase 2', 'Alzheimer disease trials', 'BRCA1 mutations')"
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
                                        <span>Searching {selectedDatabases.length} databases...</span>
                                    </>
                                ) : (
                                    <>
                                        <Search size={20} />
                                        <span>Execute Comprehensive Search</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Search Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.875rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setShowLogs(!showLogs)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#718096',
                                    cursor: 'pointer'
                                }}
                            >
                                {showLogs ? <EyeOff size={16} /> : <Eye size={16} />}
                                <span>{showLogs ? 'Hide' : 'Show'} Search Logs</span>
                            </button>
                            {searchLogs.length > 0 && (
                                <span style={{ color: '#4a5568' }}>
                                    Last search: {searchLogs[0]?.resultsCount || 0} results in {searchLogs[0]?.duration || 0}ms
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div style={styles.errorContainer}>
                            <AlertCircle size={20} />
                            <span style={styles.errorText}>{error}</span>
                        </div>
                    )}

                    {/* Logs Display */}
                    {showLogs && searchLogs.length > 0 && (
                        <div style={styles.logContainer}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#2d3748' }}>Search History & Performance Logs</h3>
                                <button
                                    onClick={() => setShowLogs(false)}
                                    style={{ background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {searchLogs.slice(0, 5).map((log) => (
                                    <div key={log.id} style={styles.logEntry}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {log.status === 'running' && <Loader2 style={{ color: '#4299e1', animation: 'spin 1s linear infinite' }} size={16} />}
                                                {log.status === 'completed' && <CheckCircle style={{ color: '#38a169' }} size={16} />}
                                                {log.status === 'failed' && <AlertCircle style={{ color: '#e53e3e' }} size={16} />}
                                                <span style={{ fontWeight: '500' }}>{log.query}</span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        
                                        {log.summary && (
                                            <div style={{ fontSize: '0.75rem', color: '#4a5568' }}>
                                                <div>📊 {log.summary.totalResults} results from {log.summary.successful}/{log.summary.successful + log.summary.failed} databases</div>
                                                <div>⏱️ Average: {log.summary.avgSearchTime}ms | Fastest: {log.summary.fastestDb} | Slowest: {log.summary.slowestDb}</div>
                                            </div>
                                        )}
                                        
                                        {log.error && (
                                            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#e53e3e' }}>
                                                Error: {log.error}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Analytics */}
                    {renderEnhancedAnalytics()}

                    {/* Results Table */}
                    {renderEnhancedResultsTable()}
                </>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div>
                    <h2 style={{ ...styles.sectionTitle, fontSize: '2rem' }}>Advanced Analytics Dashboard</h2>
                    {renderEnhancedAnalytics()}
                    {results.length === 0 && (
                        <div style={styles.emptyState}>
                            <BarChart3 size={48} style={styles.emptyStateIcon} />
                            <p>No data available. Please perform a search first to see comprehensive analytics.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Bookmarks Tab */}
            {activeTab === 'bookmarks' && (
                <div>
                    <h2 style={{ ...styles.sectionTitle, fontSize: '2rem' }}>Bookmarked Results</h2>
                    {bookmarkedResults.length === 0 ? (
                        <div style={styles.emptyState}>
                            <Star size={48} style={styles.emptyStateIcon} />
                            <p>No bookmarked results yet. Star results during your searches to save them here for future reference.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {results.filter(result => bookmarkedResults.includes(result._id)).map((result) => (
                                <div key={result._id} style={{
                                    padding: '16px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    backgroundColor: '#ffffff'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#2d3748', marginBottom: '4px' }}>
                                                <a 
                                                    href={result.link || result.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#4299e1', textDecoration: 'none' }}
                                                >
                                                    {result.title || result.brief_title || 'View Study'}
                                                </a>
                                            </h3>
                                            <p style={{ fontSize: '0.875rem', color: '#718096' }}>
                                                {result._databaseName} • {result.status || 'Unknown Status'} • {result.phase || 'N/A'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => toggleBookmark(result._id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#f6e05e',
                                                cursor: 'pointer'
                                            }}
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
