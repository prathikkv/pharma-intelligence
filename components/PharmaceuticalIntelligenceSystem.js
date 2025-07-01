// components/PharmaceuticalIntelligenceSystem.js - Enhanced Main Component

import React, { useState, useEffect, useMemo } from 'react';

const PharmaceuticalIntelligenceSystem = () => {
    // State management
    const [query, setQuery] = useState('');
    const [selectedDatabases, setSelectedDatabases] = useState(['clinicaltrials', 'opentargets']);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState({});
    const [combinedResults, setCombinedResults] = useState([]);
    const [error, setError] = useState(null);
    const [searchHistory, setSearchHistory] = useState([]);
    const [filters, setFilters] = useState({
        phase: '',
        status: '',
        source: '',
        minScore: '',
        searchWithin: ''
    });

    // Database configuration with OpenTargets enhancement
    const databases = [
        {
            id: 'clinicaltrials',
            name: 'ClinicalTrials.gov',
            description: '480K+ clinical trials',
            color: '#0066cc',
            enabled: true
        },
        {
            id: 'opentargets',
            name: 'Open Targets',
            description: '29K+ target-disease associations',
            color: '#ff6b35',
            enabled: true
        },
        {
            id: 'clinvar',
            name: 'ClinVar',
            description: '2.1M+ genetic variants',
            color: '#28a745',
            enabled: false
        },
        {
            id: 'chembl',
            name: 'ChEMBL',
            description: '2.3M+ bioactivity records',
            color: '#6f42c1',
            enabled: false
        },
        {
            id: 'drugbank',
            name: 'DrugBank',
            description: '14K+ drug entries',
            color: '#fd7e14',
            enabled: false
        }
    ];

    /**
     * Enhanced search function with better OpenTargets integration
     */
    const executeSearch = async () => {
        if (!query.trim()) {
            setError('Please enter a search query');
            return;
        }

        setIsSearching(true);
        setError(null);
        setSearchResults({});
        setCombinedResults([]);

        try {
            console.log('Executing search for:', query);
            console.log('Selected databases:', selectedDatabases);

            // Execute searches in parallel
            const searchPromises = selectedDatabases.map(async (db) => {
                try {
                    console.log(`Searching ${db}...`);
                    const response = await fetch(`/api/search/${db}?query=${encodeURIComponent(query)}`);
                    
                    if (!response.ok) {
                        throw new Error(`${db} API error: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log(`${db} returned:`, data.total, 'results');
                    
                    return {
                        database: db,
                        success: true,
                        data: data.results || [],
                        total: data.total || 0,
                        metadata: data
                    };
                } catch (error) {
                    console.error(`Error searching ${db}:`, error);
                    return {
                        database: db,
                        success: false,
                        error: error.message,
                        data: [],
                        total: 0
                    };
                }
            });

            const results = await Promise.all(searchPromises);
            
            // Process results
            const newSearchResults = {};
            let totalResults = 0;
            
            results.forEach(result => {
                newSearchResults[result.database] = result;
                if (result.success) {
                    totalResults += result.total;
                }
            });

            setSearchResults(newSearchResults);

            // Combine and process results for display
            const combined = combineSearchResults(newSearchResults);
            setCombinedResults(combined);

            // Add to search history
            setSearchHistory(prev => [
                { 
                    query, 
                    timestamp: new Date(), 
                    resultCount: totalResults,
                    databases: selectedDatabases.length
                },
                ...prev.slice(0, 4)
            ]);

            console.log('Search completed:', totalResults, 'total results');

        } catch (error) {
            console.error('Search execution error:', error);
            setError(`Search failed: ${error.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    /**
     * Enhanced function to combine search results from multiple databases
     */
    const combineSearchResults = (searchResults) => {
        const combined = [];
        
        Object.entries(searchResults).forEach(([database, result]) => {
            if (result.success && result.data) {
                result.data.forEach(item => {
                    // Normalize data structure for consistent display
                    const normalizedItem = normalizeResultItem(item, database);
                    combined.push(normalizedItem);
                });
            }
        });

        // Sort by relevance score, then by database priority
        return combined.sort((a, b) => {
            // Prioritize items with clinical trial URLs
            if (a.clinical_trial_url && !b.clinical_trial_url) return -1;
            if (!a.clinical_trial_url && b.clinical_trial_url) return 1;
            
            // Then by score
            const scoreA = parseFloat(a.score) || 0;
            const scoreB = parseFloat(b.score) || 0;
            if (scoreA !== scoreB) return scoreB - scoreA;
            
            // Then by database priority (OpenTargets first for target data)
            const dbPriority = { opentargets: 3, clinicaltrials: 2, clinvar: 1 };
            return (dbPriority[b.database] || 0) - (dbPriority[a.database] || 0);
        });
    };

    /**
     * Normalize result items from different databases for consistent display
     */
    const normalizeResultItem = (item, database) => {
        const normalized = {
            ...item,
            database,
            id: item.id || `${database}_${Math.random().toString(36).substr(2, 9)}`,
        };

        // Ensure required fields exist
        if (!normalized.disease) normalized.disease = item.condition || item.disease_name || '';
        if (!normalized.symbol) normalized.symbol = item.target_symbol || item.gene || item.symbol || '';
        if (!normalized.name) normalized.name = item.target_name || item.gene_name || item.name || '';
        if (!normalized.phase) normalized.phase = item.phase || item.clinical_phase || '';
        if (!normalized.status) normalized.status = item.status || item.recruitment_status || '';
        if (!normalized.source) normalized.source = item.source || database;

        // Enhanced URL handling for OpenTargets
        if (database === 'opentargets') {
            // Fix the "clinicaltrial.column2" issue
            if (item.clinical_trial_url && item.clinical_trial_url !== 'clinicaltrial.column2') {
                normalized.clinical_trial_url = item.clinical_trial_url;
            } else {
                // Generate proper URL if possible
                normalized.clinical_trial_url = generateClinicalTrialUrl(item);
            }
            
            // Add OpenTargets-specific URLs
            if (item.target_id && item.disease_id) {
                normalized.opentargets_url = `https://platform.opentargets.org/evidence/${item.target_id}/${item.disease_id}`;
                normalized.target_url = `https://platform.opentargets.org/target/${item.target_id}`;
                normalized.disease_url = `https://platform.opentargets.org/disease/${item.disease_id}`;
            }

            // Ensure score is properly formatted
            if (item.score) {
                normalized.score = parseFloat(item.score).toFixed(4);
            }
        }

        // Enhanced URL handling for ClinicalTrials
        if (database === 'clinicaltrials') {
            if (item.nct_id) {
                normalized.clinical_trial_url = `https://clinicaltrials.gov/ct2/show/${item.nct_id}`;
            }
        }

        return normalized;
    };

    /**
     * Generate clinical trial URL from OpenTargets data
     */
    const generateClinicalTrialUrl = (item) => {
        // Try to extract NCT ID from various fields
        const nctPattern = /NCT\d{8}/g;
        
        // Check common fields for NCT IDs
        const fieldsToCheck = [
            item.study_id,
            item.references,
            item.source_url,
            item.external_id,
            JSON.stringify(item)
        ];

        for (const field of fieldsToCheck) {
            if (field && typeof field === 'string') {
                const matches = field.match(nctPattern);
                if (matches && matches.length > 0) {
                    return `https://clinicaltrials.gov/ct2/show/${matches[0]}`;
                }
            }
        }

        // If no NCT ID found, create a search URL
        if (item.drug_name && item.disease) {
            const searchTerm = `${item.drug_name} ${item.disease}`.replace(/\s+/g, '+');
            return `https://clinicaltrials.gov/ct2/results?term=${encodeURIComponent(searchTerm)}`;
        }

        return null;
    };

    /**
     * Apply filters to combined results
     */
    const filteredResults = useMemo(() => {
        let filtered = combinedResults;

        // Apply phase filter
        if (filters.phase) {
            filtered = filtered.filter(item => 
                item.phase && item.phase.toString().includes(filters.phase)
            );
        }

        // Apply status filter
        if (filters.status) {
            filtered = filtered.filter(item => 
                item.status && item.status.toLowerCase().includes(filters.status.toLowerCase())
            );
        }

        // Apply source filter
        if (filters.source) {
            filtered = filtered.filter(item => 
                item.database === filters.source || item.source === filters.source
            );
        }

        // Apply minimum score filter (for OpenTargets)
        if (filters.minScore) {
            const minScore = parseFloat(filters.minScore);
            filtered = filtered.filter(item => {
                const score = parseFloat(item.score);
                return !isNaN(score) && score >= minScore;
            });
        }

        // Apply search within results
        if (filters.searchWithin) {
            const searchTerm = filters.searchWithin.toLowerCase();
            filtered = filtered.filter(item => 
                Object.values(item).some(value => 
                    value && value.toString().toLowerCase().includes(searchTerm)
                )
            );
        }

        return filtered;
    }, [combinedResults, filters]);

    /**
     * Render individual result row with enhanced display
     */
    const renderResultRow = (item, index) => {
        const isOpenTargets = item.database === 'opentargets';
        const hasClinicalUrl = item.clinical_trial_url && item.clinical_trial_url !== 'clinicaltrial.column2';
        
        return (
            <tr key={item.id || index} style={{
                backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                borderLeft: `4px solid ${getDatabaseColor(item.database)}`
            }}>
                <td style={tableCellStyle}>
                    {item.disease || 'N/A'}
                    {isOpenTargets && item.disease_url && (
                        <a 
                            href={item.disease_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={linkStyle}
                            title="View on OpenTargets"
                        >
                            🔗
                        </a>
                    )}
                </td>
                <td style={tableCellStyle}>
                    <strong>{item.symbol || 'N/A'}</strong>
                    {isOpenTargets && item.target_url && (
                        <a 
                            href={item.target_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={linkStyle}
                            title="View target on OpenTargets"
                        >
                            🎯
                        </a>
                    )}
                </td>
                <td style={tableCellStyle}>
                    {item.name || 'N/A'}
                    {isOpenTargets && item.score && (
                        <div style={{ fontSize: '0.8em', color: '#666', marginTop: '2px' }}>
                            Score: <span style={{ 
                                color: getScoreColor(item.score), 
                                fontWeight: 'bold' 
                            }}>
                                {item.score}
                            </span>
                        </div>
                    )}
                </td>
                <td style={tableCellStyle}>
                    {item.phase && (
                        <span style={{
                            ...phaseStyle,
                            backgroundColor: getPhaseColor(item.phase)
                        }}>
                            {item.phase}
                        </span>
                    )}
                </td>
                <td style={tableCellStyle}>
                    {item.status || 'N/A'}
                </td>
                <td style={tableCellStyle}>
                    {hasClinicalUrl ? (
                        <a 
                            href={item.clinical_trial_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                                ...buttonStyle,
                                backgroundColor: '#0066cc',
                                color: 'white',
                                textDecoration: 'none'
                            }}
                        >
                            ClinicalTrials.gov
                        </a>
                    ) : isOpenTargets && item.opentargets_url ? (
                        <a 
                            href={item.opentargets_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                                ...buttonStyle,
                                backgroundColor: '#ff6b35',
                                color: 'white',
                                textDecoration: 'none'
                            }}
                        >
                            OpenTargets
                        </a>
                    ) : (
                        <span style={{ color: '#666' }}>
                            {item.source || item.database}
                        </span>
                    )}
                </td>
            </tr>
        );
    };

    /**
     * Get color for database
     */
    const getDatabaseColor = (dbName) => {
        const db = databases.find(d => d.id === dbName);
        return db ? db.color : '#6c757d';
    };

    /**
     * Get color for association score
     */
    const getScoreColor = (score) => {
        const numScore = parseFloat(score);
        if (numScore >= 0.7) return '#28a745';
        if (numScore >= 0.5) return '#ffc107';
        if (numScore >= 0.2) return '#fd7e14';
        return '#dc3545';
    };

    /**
     * Get color for clinical phase
     */
    const getPhaseColor = (phase) => {
        if (phase.toString().includes('4') || phase.toString().toLowerCase().includes('approved')) return '#28a745';
        if (phase.toString().includes('3')) return '#007bff';
        if (phase.toString().includes('2')) return '#ffc107';
        if (phase.toString().includes('1')) return '#fd7e14';
        return '#6c757d';
    };

    /**
     * Handle database selection
     */
    const toggleDatabase = (dbId) => {
        setSelectedDatabases(prev => 
            prev.includes(dbId) 
                ? prev.filter(id => id !== dbId)
                : [...prev, dbId]
        );
    };

    /**
     * Clear all filters
     */
    const clearFilters = () => {
        setFilters({
            phase: '',
            status: '',
            source: '',
            minScore: '',
            searchWithin: ''
        });
    };

    /**
     * Export results to CSV
     */
    const exportToCSV = () => {
        if (filteredResults.length === 0) return;

        const headers = ['Disease', 'Symbol', 'Name', 'Phase', 'Status', 'Source', 'Score', 'Database', 'Clinical Trial URL'];
        const csvContent = [
            headers.join(','),
            ...filteredResults.map(item => [
                `"${item.disease || ''}"`,
                `"${item.symbol || ''}"`,
                `"${item.name || ''}"`,
                `"${item.phase || ''}"`,
                `"${item.status || ''}"`,
                `"${item.source || ''}"`,
                `"${item.score || ''}"`,
                `"${item.database || ''}"`,
                `"${item.clinical_trial_url || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `pharma_intelligence_${query.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Styles
    const containerStyle = {
        fontFamily: 'Arial, sans-serif',
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: '#f5f5f5'
    };

    const headerStyle = {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };

    const searchContainerStyle = {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        fontSize: '16px',
        border: '2px solid #ddd',
        borderRadius: '4px',
        marginBottom: '15px'
    };

    const buttonStyle = {
        padding: '10px 20px',
        fontSize: '14px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        margin: '5px'
    };

    const tableStyle = {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };

    const tableHeaderStyle = {
        backgroundColor: '#f8f9fa',
        padding: '12px',
        textAlign: 'left',
        borderBottom: '2px solid #dee2e6',
        fontWeight: 'bold'
    };

    const tableCellStyle = {
        padding: '12px',
        borderBottom: '1px solid #dee2e6',
        verticalAlign: 'top'
    };

    const linkStyle = {
        marginLeft: '5px',
        textDecoration: 'none'
    };

    const phaseStyle = {
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.8em',
        fontWeight: 'bold',
        color: 'white'
    };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>
                    Pharmaceutical Intelligence Platform
                </h1>
                <p style={{ margin: 0, color: '#666' }}>
                    Enhanced OpenTargets Integration with Clinical Trial Links
                </p>
            </div>

            {/* Search Interface */}
            <div style={searchContainerStyle}>
                <h3 style={{ marginTop: 0 }}>Search Configuration</h3>
                
                {/* Database Selection */}
                <div style={{ marginBottom: '15px' }}>
                    <h4>Select Databases:</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {databases.map(db => (
                            <label key={db.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedDatabases.includes(db.id)}
                                    onChange={() => toggleDatabase(db.id)}
                                    style={{ marginRight: '8px' }}
                                />
                                <span style={{ 
                                    color: db.color, 
                                    fontWeight: 'bold',
                                    opacity: selectedDatabases.includes(db.id) ? 1 : 0.5
                                }}>
                                    {db.name}
                                </span>
                                <span style={{ 
                                    fontSize: '0.8em', 
                                    color: '#666', 
                                    marginLeft: '5px' 
                                }}>
                                    ({db.description})
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Search Input */}
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter disease, target, or drug (e.g., 'acute lymphoblastic leukemia', 'BRCA1', 'imatinib')"
                    style={inputStyle}
                    onKeyPress={(e) => e.key === 'Enter' && executeSearch()}
                />

                {/* Search Button */}
                <button
                    onClick={executeSearch}
                    disabled={isSearching || !query.trim() || selectedDatabases.length === 0}
                    style={{
                        ...buttonStyle,
                        backgroundColor: isSearching ? '#ccc' : '#007bff',
                        color: 'white',
                        fontSize: '16px',
                        padding: '12px 24px'
                    }}
                >
                    {isSearching ? 'Searching...' : 'Execute Search'}
                </button>

                {/* Quick Examples */}
                <div style={{ marginTop: '15px' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '10px' }}>Quick Examples:</span>
                    {['acute lymphoblastic leukemia', 'BRCA1', 'imatinib', 'diabetes'].map(example => (
                        <button
                            key={example}
                            onClick={() => setQuery(example)}
                            style={{
                                ...buttonStyle,
                                backgroundColor: '#f8f9fa',
                                color: '#007bff',
                                border: '1px solid #dee2e6'
                            }}
                        >
                            {example}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '15px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    border: '1px solid #f5c6cb'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Search Results Summary */}
            {Object.keys(searchResults).length > 0 && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3>Search Results Summary</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        {Object.entries(searchResults).map(([db, result]) => (
                            <div key={db} style={{
                                padding: '15px',
                                backgroundColor: result.success ? '#d4edda' : '#f8d7da',
                                borderRadius: '4px',
                                border: `2px solid ${getDatabaseColor(db)}`
                            }}>
                                <strong style={{ color: getDatabaseColor(db) }}>
                                    {databases.find(d => d.id === db)?.name || db}
                                </strong>
                                <div style={{ marginTop: '5px' }}>
                                    {result.success ? (
                                        <span style={{ color: '#155724' }}>
                                            ✅ {result.total} results
                                        </span>
                                    ) : (
                                        <span style={{ color: '#721c24' }}>
                                            ❌ {result.error}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            {combinedResults.length > 0 && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3>Filters</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        <div>
                            <label>Phase:</label>
                            <select
                                value={filters.phase}
                                onChange={(e) => setFilters(prev => ({ ...prev, phase: e.target.value }))}
                                style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                            >
                                <option value="">All Phases</option>
                                <option value="1">Phase I</option>
                                <option value="2">Phase II</option>
                                <option value="3">Phase III</option>
                                <option value="4">Phase IV</option>
                            </select>
                        </div>
                        <div>
                            <label>Status:</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                            >
                                <option value="">All Statuses</option>
                                <option value="recruiting">Recruiting</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="approved">Approved</option>
                            </select>
                        </div>
                        <div>
                            <label>Source:</label>
                            <select
                                value={filters.source}
                                onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
                                style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                            >
                                <option value="">All Sources</option>
                                <option value="opentargets">OpenTargets</option>
                                <option value="clinicaltrials">ClinicalTrials.gov</option>
                            </select>
                        </div>
                        <div>
                            <label>Min Score (OpenTargets):</label>
                            <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.1"
                                value={filters.minScore}
                                onChange={(e) => setFilters(prev => ({ ...prev, minScore: e.target.value }))}
                                style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                                placeholder="0.0 - 1.0"
                            />
                        </div>
                        <div>
                            <label>Search Within Results:</label>
                            <input
                                type="text"
                                value={filters.searchWithin}
                                onChange={(e) => setFilters(prev => ({ ...prev, searchWithin: e.target.value }))}
                                style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                                placeholder="Filter results..."
                            />
                        </div>
                    </div>
                    <button
                        onClick={clearFilters}
                        style={{
                            ...buttonStyle,
                            backgroundColor: '#6c757d',
                            color: 'white',
                            marginTop: '15px'
                        }}
                    >
                        Clear Filters
                    </button>
                </div>
            )}

            {/* Results Table */}
            {filteredResults.length > 0 && (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>
                                Results ({filteredResults.length} of {combinedResults.length})
                            </h3>
                            <button
                                onClick={exportToCSV}
                                style={{
                                    ...buttonStyle,
                                    backgroundColor: '#28a745',
                                    color: 'white'
                                }}
                            >
                                Export CSV
                            </button>
                        </div>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={tableHeaderStyle}>Disease</th>
                                    <th style={tableHeaderStyle}>Symbol</th>
                                    <th style={tableHeaderStyle}>Name</th>
                                    <th style={tableHeaderStyle}>Phase</th>
                                    <th style={tableHeaderStyle}>Status</th>
                                    <th style={tableHeaderStyle}>Source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResults.map((item, index) => renderResultRow(item, index))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* No Results Message */}
            {!isSearching && combinedResults.length === 0 && Object.keys(searchResults).length > 0 && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '40px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3>No Results Found</h3>
                    <p>Try adjusting your search terms or selecting different databases.</p>
                </div>
            )}

            {/* Search History */}
            {searchHistory.length > 0 && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    marginTop: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3>Recent Searches</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {searchHistory.map((search, index) => (
                            <button
                                key={index}
                                onClick={() => setQuery(search.query)}
                                style={{
                                    ...buttonStyle,
                                    backgroundColor: '#f8f9fa',
                                    color: '#007bff',
                                    border: '1px solid #dee2e6',
                                    fontSize: '12px'
                                }}
                                title={`${search.resultCount} results from ${search.databases} databases`}
                            >
                                {search.query} ({search.resultCount})
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PharmaceuticalIntelligenceSystem;
