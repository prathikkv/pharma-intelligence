// OpenTargetsComponent.jsx - React Component for Open Targets Clinical Precedence Data
// This component integrates with your existing pharma-intelligence UI

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import OpenTargetService from './OpenTarget.js'; // Import our fixed service

/**
 * Main OpenTargets Component
 * Integrates with your existing table-based UI to display clinical precedence data
 */
const OpenTargetsComponent = ({ 
    searchQuery = 'CHEMBL941', // Default to Imatinib
    entityType = 'auto',
    limit = 50,
    onDataUpdate = null,
    className = '',
    showFilters = true 
}) => {
    // State management
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        phase: 'all',
        status: 'all',
        drugType: 'all'
    });
    const [sortConfig, setSortConfig] = useState({
        key: 'phase',
        direction: 'desc'
    });

    // Initialize Open Targets service
    const openTargetsService = useMemo(() => new OpenTargetService(), []);

    /**
     * Fetch data from Open Targets Platform
     */
    const fetchData = useCallback(async () => {
        if (!searchQuery) return;

        setLoading(true);
        setError(null);

        try {
            console.log('Fetching Open Targets data for:', searchQuery);
            const results = await openTargetsService.search(searchQuery, entityType, limit);
            
            console.log('Open Targets results:', results);
            setData(results);

            // Notify parent component of data update
            if (onDataUpdate) {
                onDataUpdate(results);
            }

        } catch (err) {
            console.error('Open Targets fetch error:', err);
            setError(err.message);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, entityType, limit, openTargetsService, onDataUpdate]);

    /**
     * Effect to fetch data when search parameters change
     */
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /**
     * Filter and sort the data based on current filters and sort configuration
     */
    const processedData = useMemo(() => {
        let filtered = [...data];

        // Apply filters
        if (filters.phase !== 'all') {
            filtered = filtered.filter(item => 
                item.phase.toLowerCase().includes(filters.phase.toLowerCase())
            );
        }

        if (filters.status !== 'all') {
            filtered = filtered.filter(item => 
                item.status.toLowerCase().includes(filters.status.toLowerCase())
            );
        }

        if (filters.drugType !== 'all') {
            filtered = filtered.filter(item => 
                item.raw?.drug?.drugType?.toLowerCase() === filters.drugType.toLowerCase()
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Special handling for phase sorting
            if (sortConfig.key === 'phase') {
                aValue = a.raw?.phase || 0;
                bValue = b.raw?.phase || 0;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return filtered;
    }, [data, filters, sortConfig]);

    /**
     * Get unique values for filter dropdowns
     */
    const filterOptions = useMemo(() => {
        return {
            phases: [...new Set(data.map(item => item.phase))].sort(),
            statuses: [...new Set(data.map(item => item.status))].sort(),
            drugTypes: [...new Set(data.map(item => item.raw?.drug?.drugType).filter(Boolean))].sort()
        };
    }, [data]);

    /**
     * Handle sorting when column header is clicked
     */
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    /**
     * Handle filter changes
     */
    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    /**
     * Generate proper link for clinical trial or reference
     */
    const generateLink = (item) => {
        if (item.links?.clinicalTrials?.length > 0) {
            return item.links.clinicalTrials[0];
        }
        if (item.links?.openTargets) {
            return { url: item.links.openTargets, name: 'View in Open Targets' };
        }
        return { url: item.links?.primary || '#', name: 'View' };
    };

    /**
     * Export data functionality
     */
    const handleExport = (format) => {
        try {
            const exportData = openTargetsService.formatForExport 
                ? openTargetsService.formatForExport(processedData, format)
                : JSON.stringify(processedData, null, 2);

            const blob = new Blob([exportData], { 
                type: format === 'json' ? 'application/json' : 'text/csv' 
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `open-targets-data.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
        }
    };

    /**
     * Render loading state
     */
    if (loading) {
        return (
            <div className={`open-targets-container ${className}`}>
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading clinical precedence data from Open Targets Platform...</p>
                </div>
            </div>
        );
    }

    /**
     * Render error state
     */
    if (error) {
        return (
            <div className={`open-targets-container error ${className}`}>
                <div className="error-state">
                    <h3>Error Loading Open Targets Data</h3>
                    <p>{error}</p>
                    <button onClick={fetchData} className="retry-button">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    /**
     * Render empty state
     */
    if (!data || data.length === 0) {
        return (
            <div className={`open-targets-container empty ${className}`}>
                <div className="empty-state">
                    <h3>No Clinical Precedence Data Found</h3>
                    <p>No clinical trials or drug-disease-target associations found for "{searchQuery}"</p>
                    <button onClick={fetchData} className="retry-button">
                        Refresh
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`open-targets-container ${className}`}>
            {/* Header with summary statistics */}
            <div className="data-summary">
                <h3>Open Targets Clinical Precedence</h3>
                <div className="summary-stats">
                    <span className="stat">
                        <strong>{processedData.length}</strong> entries found
                    </span>
                    <span className="stat">
                        <strong>{new Set(processedData.map(item => item.drugName)).size}</strong> unique drugs
                    </span>
                    <span className="stat">
                        <strong>{new Set(processedData.map(item => item.diseaseName)).size}</strong> unique diseases
                    </span>
                    <span className="stat">
                        <strong>{new Set(processedData.map(item => item.targetSymbol)).size}</strong> unique targets
                    </span>
                </div>
            </div>

            {/* Filters section */}
            {showFilters && (
                <div className="filters-section">
                    <div className="filter-group">
                        <label>
                            Phase:
                            <select 
                                value={filters.phase} 
                                onChange={(e) => handleFilterChange('phase', e.target.value)}
                            >
                                <option value="all">All Phases</option>
                                {filterOptions.phases.map(phase => (
                                    <option key={phase} value={phase}>{phase}</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Status:
                            <select 
                                value={filters.status} 
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                {filterOptions.statuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Drug Type:
                            <select 
                                value={filters.drugType} 
                                onChange={(e) => handleFilterChange('drugType', e.target.value)}
                            >
                                <option value="all">All Types</option>
                                {filterOptions.drugTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="action-buttons">
                        <button onClick={() => handleExport('csv')} className="export-btn">
                            Export CSV
                        </button>
                        <button onClick={() => handleExport('json')} className="export-btn">
                            Export JSON
                        </button>
                        <button onClick={fetchData} className="refresh-btn">
                            Refresh
                        </button>
                    </div>
                </div>
            )}

            {/* Main data table */}
            <div className="data-table-container">
                <table className="open-targets-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('database')}>
                                Database
                                {sortConfig.key === 'database' && (
                                    <span className={`sort-indicator ${sortConfig.direction}`}></span>
                                )}
                            </th>
                            <th onClick={() => handleSort('drugName')}>
                                Drug/Title
                                {sortConfig.key === 'drugName' && (
                                    <span className={`sort-indicator ${sortConfig.direction}`}></span>
                                )}
                            </th>
                            <th onClick={() => handleSort('diseaseName')}>
                                Disease
                                {sortConfig.key === 'diseaseName' && (
                                    <span className={`sort-indicator ${sortConfig.direction}`}></span>
                                )}
                            </th>
                            <th onClick={() => handleSort('targetSymbol')}>
                                Target
                                {sortConfig.key === 'targetSymbol' && (
                                    <span className={`sort-indicator ${sortConfig.direction}`}></span>
                                )}
                            </th>
                            <th onClick={() => handleSort('phase')}>
                                Phase
                                {sortConfig.key === 'phase' && (
                                    <span className={`sort-indicator ${sortConfig.direction}`}></span>
                                )}
                            </th>
                            <th onClick={() => handleSort('status')}>
                                Status
                                {sortConfig.key === 'status' && (
                                    <span className={`sort-indicator ${sortConfig.direction}`}></span>
                                )}
                            </th>
                            <th>Details</th>
                            <th>Link</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.map((item, index) => {
                            const link = generateLink(item);
                            
                            return (
                                <tr key={item.id || index} className="data-row">
                                    <td>
                                        <span className="database-badge">Open Targets</span>
                                    </td>
                                    
                                    <td className="drug-title">
                                        <div>
                                            <strong>{item.drugName}</strong>
                                            {item.targetSymbol && (
                                                <span className="target-symbol">
                                                    targeting {item.targetSymbol}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    
                                    <td className="disease-name">
                                        {item.diseaseName}
                                    </td>
                                    
                                    <td className="target-info">
                                        <div>
                                            <strong>{item.targetSymbol}</strong>
                                            <div className="target-full-name">
                                                {item.targetName}
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="phase">
                                        <span className={`phase-badge phase-${item.raw?.phase || 0}`}>
                                            {item.phase}
                                        </span>
                                    </td>
                                    
                                    <td className="status">
                                        <span className={`status-badge status-${item.status.toLowerCase().replace(/[^a-z]/g, '')}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    
                                    <td className="details">
                                        <div className="details-content">
                                            {item.mechanismOfAction && (
                                                <div><strong>MoA:</strong> {item.mechanismOfAction}</div>
                                            )}
                                            {item.raw?.drug?.drugType && (
                                                <div><strong>Type:</strong> {item.raw.drug.drugType}</div>
                                            )}
                                            {item.raw?.ctIds?.length > 0 && (
                                                <div><strong>Trials:</strong> {item.raw.ctIds.length} registered</div>
                                            )}
                                        </div>
                                    </td>
                                    
                                    <td className="link-cell">
                                        {link && (
                                            <a 
                                                href={link.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="view-link"
                                            >
                                                {link.name || 'View →'}
                                            </a>
                                        )}
                                    </td>
                                    
                                    <td className="actions-cell">
                                        <div className="action-buttons">
                                            <button 
                                                className="star-button"
                                                title="Add to favorites"
                                                onClick={() => console.log('Star clicked for:', item.id)}
                                            >
                                                ☆
                                            </button>
                                            
                                            {/* Additional links dropdown */}
                                            {(item.links?.clinicalTrials?.length > 1 || item.links?.references?.length > 0) && (
                                                <div className="dropdown">
                                                    <button className="dropdown-toggle">⋮</button>
                                                    <div className="dropdown-menu">
                                                        {item.links.clinicalTrials?.map((trial, idx) => (
                                                            <a 
                                                                key={idx} 
                                                                href={trial.url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                            >
                                                                {trial.name}
                                                            </a>
                                                        ))}
                                                        {item.links.references?.map((ref, idx) => (
                                                            <a 
                                                                key={idx} 
                                                                href={ref.url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                            >
                                                                {ref.name}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/**
 * CSS Styles for Open Targets Component
 * Add these styles to your CSS file or styled-components
 */
const OpenTargetsStyles = `
.open-targets-container {
    width: 100%;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.data-summary {
    margin-bottom: 20px;
}

.data-summary h3 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 1.2em;
}

.summary-stats {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
}

.stat {
    background: #f8f9fa;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 0.9em;
}

.filters-section {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 15px;
}

.filter-group {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}

.filter-group label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.9em;
}

.filter-group select {
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    min-width: 120px;
}

.action-buttons {
    display: flex;
    gap: 8px;
}

.export-btn, .refresh-btn, .retry-button {
    padding: 6px 12px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
}

.export-btn:hover, .refresh-btn:hover, .retry-button:hover {
    background: #0056b3;
}

.data-table-container {
    overflow-x: auto;
}

.open-targets-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9em;
}

.open-targets-table th,
.open-targets-table td {
    padding: 12px 8px;
    text-align: left;
    border-bottom: 1px solid #dee2e6;
}

.open-targets-table th {
    background: #f8f9fa;
    font-weight: 600;
    cursor: pointer;
    position: relative;
    user-select: none;
}

.open-targets-table th:hover {
    background: #e9ecef;
}

.sort-indicator {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
}

.sort-indicator.asc::after {
    content: '↑';
}

.sort-indicator.desc::after {
    content: '↓';
}

.database-badge {
    background: #28a745;
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.8em;
}

.target-symbol {
    display: block;
    font-size: 0.8em;
    color: #666;
    margin-top: 2px;
}

.target-full-name {
    font-size: 0.8em;
    color: #666;
    margin-top: 2px;
}

.phase-badge {
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 0.8em;
    font-weight: 500;
}

.phase-0 { background: #6c757d; color: white; }
.phase-1 { background: #fd7e14; color: white; }
.phase-2 { background: #ffc107; color: black; }
.phase-3 { background: #17a2b8; color: white; }
.phase-4 { background: #28a745; color: white; }

.status-badge {
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 0.8em;
    font-weight: 500;
}

.status-recruiting { background: #28a745; color: white; }
.status-active { background: #17a2b8; color: white; }
.status-completed { background: #6c757d; color: white; }
.status-terminated { background: #dc3545; color: white; }
.status-approved { background: #28a745; color: white; }

.details-content {
    font-size: 0.8em;
    line-height: 1.4;
}

.details-content div {
    margin-bottom: 2px;
}

.view-link {
    color: #007bff;
    text-decoration: none;
    font-weight: 500;
}

.view-link:hover {
    text-decoration: underline;
}

.actions-cell {
    width: 80px;
}

.action-buttons {
    display: flex;
    gap: 4px;
    align-items: center;
}

.star-button {
    background: none;
    border: none;
    font-size: 1.2em;
    cursor: pointer;
    color: #ccc;
}

.star-button:hover,
.star-button.starred {
    color: #ffc107;
}

.dropdown {
    position: relative;
}

.dropdown-toggle {
    background: none;
    border: none;
    font-size: 1.2em;
    cursor: pointer;
    padding: 2px 4px;
}

.dropdown-menu {
    display: none;
    position: absolute;
    right: 0;
    top: 100%;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    min-width: 150px;
    z-index: 1000;
}

.dropdown:hover .dropdown-menu {
    display: block;
}

.dropdown-menu a {
    display: block;
    padding: 8px 12px;
    color: #333;
    text-decoration: none;
    font-size: 0.9em;
    border-bottom: 1px solid #eee;
}

.dropdown-menu a:hover {
    background: #f8f9fa;
}

.dropdown-menu a:last-child {
    border-bottom: none;
}

.loading-state,
.error-state,
.empty-state {
    text-align: center;
    padding: 40px 20px;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.error-state {
    color: #dc3545;
}

.empty-state {
    color: #6c757d;
}

/* Responsive design */
@media (max-width: 768px) {
    .filters-section {
        flex-direction: column;
        align-items: stretch;
    }
    
    .filter-group {
        justify-content: space-between;
    }
    
    .summary-stats {
        justify-content: center;
    }
    
    .open-targets-table {
        font-size: 0.8em;
    }
    
    .open-targets-table th,
    .open-targets-table td {
        padding: 8px 4px;
    }
}
`;

export default OpenTargetsComponent;
export { OpenTargetsStyles };

/**
 * Usage Example:
 * 
 * import OpenTargetsComponent from './OpenTargetsComponent';
 * 
 * function App() {
 *   return (
 *     <div>
 *       <OpenTargetsComponent 
 *         searchQuery="CHEMBL941"  // Imatinib ChEMBL ID
 *         entityType="drug"
 *         limit={50}
 *         onDataUpdate={(data) => console.log('Data updated:', data)}
 *         showFilters={true}
 *       />
 *     </div>
 *   );
 * }
 */
