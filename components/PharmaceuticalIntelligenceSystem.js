import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, Filter, Database, BarChart3, TrendingUp, AlertCircle, CheckCircle, Clock, Star, StarOff, Eye, EyeOff, Loader2, RefreshCw, ArrowUpDown, ChevronDown, ChevronUp, X } from 'lucide-react';

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
            alignItems: 'center'
        },
        resultsTitle: {
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#2d3748'
        },
        resultsControls: {
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
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
            color: '#2d3748'
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
            transition: 'all 0.2s ease'
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

    // Production-Level Search Function
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
        
        // Add search to logs
        const logEntry = {
            id: searchId,
            query: searchQuery,
            databases: selectedDatabases,
            timestamp: new Date().toISOString(),
            status: 'running'
        };
        setSearchLogs(prev => [logEntry, ...prev]);

        try {
            // Execute parallel searches for better performance
            const searchPromises = selectedDatabases.map(async (dbId) => {
                const database = databases.find(db => db.id === dbId);
                try {
                    const response = await fetch(`${database.endpoint}?query=${encodeURIComponent(searchQuery)}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    
                    // Normalize data structure across different APIs
                    return {
                        database: dbId,
                        databaseName: database.name,
                        results: data.results || data.data || [],
                        total: data.total || data.count || 0,
                        metadata: {
                            searchTime: Date.now() - searchStartTime,
                            source: database.name
                        }
                    };
                } catch (error) {
                    console.error(`Error searching ${database.name}:`, error);
                    return {
                        database: dbId,
                        databaseName: database.name,
                        results: [],
                        total: 0,
                        error: error.message,
                        metadata: {
                            searchTime: Date.now() - searchStartTime,
                            source: database.name
                        }
                    };
                }
            });

            const searchResults = await Promise.all(searchPromises);
            
            // Combine and enhance results
            const combinedResults = searchResults.reduce((acc, result) => {
                if (result.results && result.results.length > 0) {
                    const enhancedResults = result.results.map(item => ({
                        ...item,
                        _database: result.database,
                        _databaseName: result.databaseName,
                        _searchTime: result.metadata.searchTime,
                        _id: `${result.database}_${item.id || Math.random()}`
                    }));
                    acc.push(...enhancedResults);
                }
                return acc;
            }, []);

            setResults(combinedResults);
            
            // Update search log
            setSearchLogs(prev => prev.map(log => 
                log.id === searchId 
                    ? { 
                        ...log, 
                        status: 'completed',
                        resultsCount: combinedResults.length,
                        duration: Date.now() - searchStartTime,
                        databases: searchResults.map(r => ({
                            name: r.databaseName,
                            count: r.total,
                            error: r.error
                        }))
                    }
                    : log
            ));

        } catch (error) {
            console.error('Search execution error:', error);
            setError(`Search failed: ${error.message}`);
            
            // Update search log with error
            setSearchLogs(prev => prev.map(log => 
                log.id === searchId 
                    ? { 
                        ...log, 
                        status: 'failed',
                        error: error.message,
                        duration: Date.now() - searchStartTime
                    }
                    : log
            ));
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedDatabases]);

    // Enhanced Filtering and Sorting
    const filteredAndSortedResults = useMemo(() => {
        let filtered = [...results];

        // Apply search within results
        if (searchWithinResults) {
            const searchTerm = searchWithinResults.toLowerCase();
            filtered = filtered.filter(item => 
                Object.values(item).some(value => 
                    value && value.toString().toLowerCase().includes(searchTerm)
                )
            );
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

    // Analytics and Insights
    const analytics = useMemo(() => {
        const databaseDistribution = databases.map(db => ({
            name: db.name,
            count: results.filter(item => item._database === db.id).length,
            icon: db.icon
        })).filter(db => db.count > 0);

        const statusDistribution = results.reduce((acc, item) => {
            const status = item.status || 'Unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const phaseDistribution = results.reduce((acc, item) => {
            const phase = item.phase || 'Unknown';
            acc[phase] = (acc[phase] || 0) + 1;
            return acc;
        }, {});

        return {
            total: results.length,
            databaseDistribution,
            statusDistribution,
            phaseDistribution,
            topSponsors: Object.entries(
                results.reduce((acc, item) => {
                    const sponsor = item.sponsor || 'Unknown';
                    acc[sponsor] = (acc[sponsor] || 0) + 1;
                    return acc;
                }, {})
            ).sort(([,a], [,b]) => b - a).slice(0, 5)
        };
    }, [results]);

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

    // Export Functionality
    const exportResults = useCallback(() => {
        const csvHeaders = ['Database', 'Title', 'ID', 'Status', 'Phase', 'Sponsor', 'Date'];
        const csvData = filteredAndSortedResults.map(item => [
            item._databaseName,
            item.title || item.brief_title || 'N/A',
            item.id || item.nct_id || 'N/A',
            item.status || 'N/A',
            item.phase || 'N/A',
            item.sponsor || 'N/A',
            item.start_date || item.study_first_submitted_date || 'N/A'
        ]);

        const csvContent = [csvHeaders, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pharma_intelligence_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }, [filteredAndSortedResults]);

    // Get status badge style
    const getStatusBadgeStyle = (status) => {
        const baseStyle = styles.statusBadge;
        switch (status?.toLowerCase()) {
            case 'recruiting':
            case 'active':
                return { ...baseStyle, ...styles.statusActive };
            case 'completed':
                return { ...baseStyle, ...styles.statusCompleted };
            case 'not yet recruiting':
                return { ...baseStyle, ...styles.statusRecruiting };
            default:
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

    // Analytics Display
    const renderAnalytics = () => {
        if (results.length === 0) return null;

        return (
            <div style={styles.analyticsContainer}>
                <h3 style={styles.analyticsTitle}>
                    <BarChart3 size={20} />
                    Search Analytics
                </h3>
                
                <div style={styles.analyticsGrid}>
                    {/* Database Distribution */}
                    <div style={styles.analyticsSection}>
                        <h4 style={styles.analyticsSectionTitle}>Database Distribution</h4>
                        <div>
                            {analytics.databaseDistribution.map((db) => (
                                <div key={db.name} style={styles.analyticsItem}>
                                    <div style={styles.analyticsLabel}>
                                        <span>{db.icon}</span>
                                        <span>{db.name}</span>
                                    </div>
                                    <span style={styles.analyticsValue}>{db.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Distribution */}
                    <div style={styles.analyticsSection}>
                        <h4 style={styles.analyticsSectionTitle}>Status Distribution</h4>
                        <div>
                            {Object.entries(analytics.statusDistribution).map(([status, count]) => (
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
                            {Object.entries(analytics.phaseDistribution).map(([phase, count]) => (
                                <div key={phase} style={styles.analyticsItem}>
                                    <span style={styles.analyticsLabel}>{phase}</span>
                                    <span style={styles.analyticsValue}>{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        Total Results: {analytics.total}
                    </span>
                    <button
                        onClick={exportResults}
                        style={{
                            ...styles.primaryButton,
                            backgroundColor: '#38a169',
                            color: '#ffffff'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#2f855a'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#38a169'}
                    >
                        <Download size={16} />
                        <span>Export CSV</span>
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
                    Pharmaceutical Intelligence System
                </h1>
                <p style={styles.subtitle}>
                    Advanced multi-database search and analysis platform for pharmaceutical research
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
                                    placeholder="Enter your research query (e.g., 'Alzheimer disease trials', 'BRCA1 mutations')"
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
                                        <span>Searching...</span>
                                    </>
                                ) : (
                                    <>
                                        <Search size={20} />
                                        <span>Execute AI Analysis</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Search Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.875rem' }}>
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
                                <span>{showLogs ? 'Hide' : 'Show'} Logs</span>
                            </button>
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
                        <div style={{ ...styles.searchContainer, marginBottom: '30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#2d3748' }}>Search History & Logs</h3>
                                <button
                                    onClick={() => setShowLogs(false)}
                                    style={{ background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                {searchLogs.map((log) => (
                                    <div key={log.id} style={{ 
                                        padding: '12px', 
                                        backgroundColor: '#ffffff', 
                                        border: '1px solid #e2e8f0', 
                                        borderRadius: '6px',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                                        
                                        {log.resultsCount !== undefined && (
                                            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#718096' }}>
                                                Found {log.resultsCount} results in {log.duration}ms
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
                    {renderAnalytics()}

                    {/* Results Table */}
                    {filteredAndSortedResults.length > 0 && (
                        <div style={styles.resultsContainer}>
                            <div style={styles.resultsHeader}>
                                <h3 style={styles.resultsTitle}>
                                    Search Results ({filteredAndSortedResults.length})
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
                                                {db.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={styles.table}>
                                    <thead style={styles.tableHeader}>
                                        <tr>
                                            <th style={styles.tableHeaderCell}>Database</th>
                                            <th style={styles.tableHeaderCell}>Title</th>
                                            <th style={styles.tableHeaderCell}>Status</th>
                                            <th style={styles.tableHeaderCell}>Phase</th>
                                            <th style={styles.tableHeaderCell}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAndSortedResults.map((result) => (
                                            <tr 
                                                key={result._id} 
                                                style={styles.tableRow}
                                                onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = '#f7fafc'}
                                                onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = 'transparent'}
                                            >
                                                <td style={styles.tableCell}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '1.125rem' }}>
                                                            {databases.find(db => db.id === result._database)?.icon}
                                                        </span>
                                                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                                                            {result._databaseName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={styles.tableCell}>
                                                    <div>
                                                        <div style={{ fontSize: '0.875rem', color: '#2d3748', marginBottom: '2px' }}>
                                                            {result.title || result.brief_title || 'N/A'}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                                                            ID: {result.id || result.nct_id || 'N/A'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={styles.tableCell}>
                                                    <span style={getStatusBadgeStyle(result.status)}>
                                                        {result.status || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td style={styles.tableCell}>
                                                    {result.phase || 'N/A'}
                                                </td>
                                                <td style={styles.tableCell}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <button
                                                            onClick={() => toggleBookmark(result._id)}
                                                            style={bookmarkedResults.includes(result._id) ? styles.bookmarkButtonActive : styles.bookmarkButton}
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
                                                        >
                                                            {expandedResult === result._id ? 'Collapse' : 'Expand'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div>
                    <h2 style={{ ...styles.sectionTitle, fontSize: '2rem' }}>Advanced Analytics</h2>
                    {renderAnalytics()}
                    {results.length === 0 && (
                        <div style={styles.emptyState}>
                            <BarChart3 size={48} style={styles.emptyStateIcon} />
                            <p>No data available. Please perform a search first.</p>
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
                            <p>No bookmarked results yet. Star results to save them here.</p>
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
                                                {result.title || result.brief_title || 'N/A'}
                                            </h3>
                                            <p style={{ fontSize: '0.875rem', color: '#718096' }}>
                                                {result._databaseName} • {result.status || 'Unknown Status'}
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