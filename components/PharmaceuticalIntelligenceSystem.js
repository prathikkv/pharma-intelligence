import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, Filter, Database, BarChart3, TrendingUp, AlertCircle, CheckCircle, Clock, Star, StarOff, Eye, EyeOff, Loader2, RefreshCw, ArrowUpDown, ChevronDown, ChevronUp, X, ExternalLink, Table, FileSpreadsheet } from 'lucide-react';

const PharmaceuticalIntelligenceSystem = () => {
    // Core State Management
    const [selectedDatabases, setSelectedDatabases] = useState(['clinicaltrials', 'opentargets']); // Default selection
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

    // Focused Database Configuration (6 databases as requested)
    const databases = [
        { 
            id: 'clinicaltrials', 
            name: 'ClinicalTrials.gov', 
            description: '480K+ clinical trials - The gold standard for clinical research',
            endpoint: '/api/search/clinicaltrials',
            icon: '🏥',
            category: 'Clinical',
            priority: 'high'
        },
        { 
            id: 'opentargets', 
            name: 'Open Targets', 
            description: '29K+ target-disease associations - Comprehensive drug-target-disease data',
            endpoint: '/api/search/opentargets',
            icon: '🎯',
            category: 'Targets',
            priority: 'high'
        },
        { 
            id: 'hpa', 
            name: 'Human Protein Atlas', 
            description: '19K+ protein expressions - Tissue-specific protein data',
            endpoint: '/api/search/hpa',
            icon: '🔬',
            category: 'Proteins',
            priority: 'medium'
        },
        { 
            id: 'clinvar', 
            name: 'ClinVar', 
            description: '2.1M+ genetic variants - Clinical significance of genetic variants',
            endpoint: '/api/search/clinvar',
            icon: '🧬',
            category: 'Genetics',
            priority: 'medium'
        },
        { 
            id: 'mgi', 
            name: 'MGI (Mouse Genome)', 
            description: '1.2M+ mouse genome records - Model organism data',
            endpoint: '/api/search/mgi',
            icon: '🐭',
            category: 'Genomics',
            priority: 'medium'
        },
        { 
            id: 'iuphar', 
            name: 'IUPHAR/BPS', 
            description: '3.5K+ pharmacology targets - Drug-target interactions',
            endpoint: '/api/search/iuphar',
            icon: '💊',
            category: 'Pharmacology',
            priority: 'medium'
        }
    ];

    // Enhanced inline styles with better layout
    const styles = {
        container: {
            maxWidth: '1400px', // Increased width
            margin: '0 auto',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            backgroundColor: '#ffffff',
            minHeight: '100vh'
        },
        header: {
            marginBottom: '20px', // Reduced margin
            textAlign: 'center'
        },
        title: {
            fontSize: '2.25rem', // Slightly smaller
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
        
        // Search Section at Top
        searchSection: {
            backgroundColor: '#f8fafc',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '25px',
            border: '2px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
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
            padding: '14px 16px 14px 44px', // Increased padding
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '1.1rem', // Larger font
            outline: 'none',
            transition: 'border-color 0.2s ease',
            minHeight: '52px' // Minimum height to ensure visibility
        },
        searchIcon: {
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#a0aec0'
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', // Wider cards
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
            padding: '14px 28px', // Larger buttons
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
        
        // Status badges
        statusBadge: {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.025em'
        },
        statusActive: {
            backgroundColor: '#c6f6d5',
            color: '#22543d'
        },
        statusCompleted: {
            backgroundColor: '#bee3f8',
            color: '#2a4365'
        },
        statusApproved: {
            backgroundColor: '#d4edda',
            color: '#155724'
        },
        statusDefault: {
            backgroundColor: '#e2e8f0',
            color: '#4a5568'
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
        },
        
        // Utility classes
        badge: {
            display: 'inline-block',
            padding: '4px 8px',
            backgroundColor: '#e2e8f0',
            color: '#4a5568',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '500'
        }
    };

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
    const getDatabasePriority = useCallback((dbId) => {
        const priorityMap = {
            'clinicaltrials': 10,
            'opentargets': 9,
            'hpa': 7,
            'clinvar': 6,
            'mgi': 5,
            'iuphar': 8
        };
        return priorityMap[dbId] || 3;
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
                        'clinicaltrials': 1000,
                        'opentargets': 300,
                        'hpa': 150,
                        'clinvar': 150,
                        'mgi': 100,
                        'iuphar': 100
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
                        signal: AbortSignal.timeout(45000)
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
                            _priority: database.priority,
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

            // Wait for all searches
            const searchResults = await Promise.allSettled(searchPromises);
            
            // Process results
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
                const dbPriorityA = getDatabasePriority(a._database);
                const dbPriorityB = getDatabasePriority(b._database);
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
            
            // Update search logs
            const searchEndTime = Date.now();
            const totalSearchTime = searchEndTime - searchStartTime;
            
            setSearchLogs(prev => prev.map(log => 
                log.id === searchId 
                    ? { 
                        ...log, 
                        status: 'completed',
                        resultsCount: combinedResults.length,
                        duration: totalSearchTime,
                        summary: {
                            successful: successfulResults.length,
                            failed: failedResults.length,
                            totalResults: combinedResults.length,
                            avgSearchTime: Math.round(totalSearchTime / selectedDatabases.length)
                        }
                    }
                    : log
            ));
            
            // SUCCESS REPORTING
            console.log(`🎉 GRID Search Completed Successfully!`);
            console.log(`📊 Results: ${combinedResults.length} total`);
            console.log(`✅ Successful databases: ${successfulResults.length}/${selectedDatabases.length}`);
            console.log(`⏱️ Total time: ${totalSearchTime}ms`);
            
            if (failedResults.length > 0) {
                console.warn(`⚠️ Failed databases: ${failedResults.map(f => f.databaseName).join(', ')}`);
            }
            
            // User feedback for zero results
            if (combinedResults.length === 0) {
                setError(
                    `No results found for "${searchQuery}". ` +
                    `${failedResults.length > 0 ? `${failedResults.length} databases had errors. ` : ''}` +
                    `💡 Try: (1) Drug names like "imatinib" or "pembrolizumab", (2) Disease terms like "cancer" or "diabetes", (3) Gene symbols like "EGFR" or "TP53".`
                );
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

    // Enhanced Analytics
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
            statusDistribution,
            phaseDistribution,
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
                ).length
            }
        };
    }, [enhancedFilteredResults]);

    // Export functionality
    const exportResults = useCallback(() => {
        const timestamp = new Date().toISOString().split('T')[0];
        const csvHeaders = [
            'Database', 'Title', 'ID', 'Status', 'Phase', 'Sponsor', 'Year', 
            'Enrollment', 'Conditions', 'Link'
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
            item.link || item.url || 'N/A'
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
        } else if (statusLower.includes('approved')) {
            return { ...baseStyle, ...styles.statusApproved };
        } else {
            return { ...baseStyle, ...styles.statusDefault };
        }
    };

    // Search Section Component (Always visible at top)
    const renderSearchSection = () => (
        <div style={styles.searchSection}>
            <h2 style={styles.searchTitle}>
                <Search size={20} />
                Search Pharmaceutical Intelligence
            </h2>
            
            <div style={styles.searchInputContainer}>
                <div style={styles.searchInputWrapper}>
                    <Search style={styles.searchIcon} size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter your research query (e.g., 'imatinib cancer phase 2', 'Alzheimer disease trials', 'BRCA1 mutations', 'EGFR inhibitors')"
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
                            <span>Search Intelligence Databases</span>
                        </>
                    )}
                </button>
            </div>

            {/* Database Selection */}
            <div style={styles.databaseSection}>
                <h3 style={{ ...styles.sectionTitle, fontSize: '1rem', marginBottom: '12px' }}>
                    <Database size={16} />
                    Selected Databases ({selectedDatabases.length}/6)
                </h3>
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
                        >
                            <div style={{
                                ...styles.priorityBadge,
                                ...(db.priority === 'high' ? styles.highPriority : styles.mediumPriority)
                            }}>
                                {db.priority}
                            </div>
                            <span style={{ fontSize: '1.5rem' }}>{db.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>
                                    {db.name}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#718096' }}>
                                    {db.description}
                                </div>
                            </div>
                            <div style={selectedDatabases.includes(db.id) ? 
                                { width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#4299e1', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' } :
                                { width: '20px', height: '20px', borderRadius: '4px', border: '2px solid #e2e8f0' }
                            }>
                                {selectedDatabases.includes(db.id) && <CheckCircle size={16} />}
                            </div>
                        </div>
                    ))}
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

    // Results Table Component (for Results tab)
    const renderResultsTable = () => {
        if (enhancedFilteredResults.length === 0) {
            return (
                <div style={styles.emptyState}>
                    <Table size={48} style={styles.emptyStateIcon} />
                    <p>No results to display. Please perform a search first to see results here.</p>
                </div>
            );
        }

        return (
            <div style={styles.resultsContainer}>
                <div style={styles.resultsHeader}>
                    <h3 style={styles.resultsTitle}>
                        <Table size={20} />
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
                                            View Study
                                            <ExternalLink size={12} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Summary */}
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

    // Analytics Component
    const renderAnalytics = () => {
        if (results.length === 0) {
            return (
                <div style={styles.emptyState}>
                    <BarChart3 size={48} style={styles.emptyStateIcon} />
                    <p>No data available. Please perform a search first to see comprehensive analytics.</p>
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
                    Search Analytics
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
                        <span>Export All Results</span>
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
                    Advanced pharmaceutical intelligence platform • 6 specialized databases • Comprehensive drug discovery insights
                </p>
            </div>

            {/* Search Section - Always at Top */}
            {renderSearchSection()}

            {/* Navigation Tabs */}
            <div style={styles.tabContainer}>
                <div style={styles.tabNav}>
                    <button
                        onClick={() => setActiveTab('search')}
                        style={activeTab === 'search' ? styles.activeTab : styles.tab}
                    >
                        <Search size={16} />
                        Search
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
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'search' && (
                <div>
                    {/* Quick Analytics Summary */}
                    {results.length > 0 && renderAnalytics()}
                    
                    {/* Sample Queries */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px', color: '#2d3748' }}>
                            💡 Sample Queries to Try
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            {[
                                'imatinib cancer trials',
                                'EGFR inhibitors phase 3',
                                'Alzheimer disease targets',
                                'BRCA1 mutations clinical',
                                'pembrolizumab melanoma',
                                'JAK2 inhibitors'
                            ].map((sampleQuery) => (
                                <button
                                    key={sampleQuery}
                                    onClick={() => {
                                        setSearchQuery(sampleQuery);
                                        executeSearch();
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #cbd5e0',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = '#edf2f7';
                                        e.target.style.borderColor = '#4299e1';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = '#ffffff';
                                        e.target.style.borderColor = '#cbd5e0';
                                    }}
                                >
                                    {sampleQuery}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'results' && renderResultsTable()}

            {activeTab === 'analytics' && (
                <div>
                    <h2 style={{ ...styles.sectionTitle, fontSize: '2rem', marginBottom: '24px' }}>Advanced Analytics Dashboard</h2>
                    {renderAnalytics()}
                    {results.length > 0 && (
                        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '16px', color: '#2d3748' }}>
                                Export Options
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
                                    Export to CSV
                                </button>
                                <button
                                    onClick={() => {
                                        console.log('Detailed analytics:', enhancedAnalytics);
                                        alert('Detailed analytics logged to console for further analysis');
                                    }}
                                    style={{
                                        ...styles.primaryButton,
                                        backgroundColor: '#6366f1'
                                    }}
                                >
                                    <BarChart3 size={16} />
                                    View Raw Data
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PharmaceuticalIntelligenceSystem;
