// OpenTarget.js - Fixed Implementation for Clinical Precedence Data
// This module handles Open Targets Platform GraphQL API queries for drug-disease-target associations

/**
 * Open Targets Platform API Configuration
 * Using the current GraphQL endpoint and proper query structure
 */
const OPEN_TARGETS_CONFIG = {
    // Current Open Targets Platform GraphQL API endpoint
    baseUrl: 'https://api.platform.opentargets.org/api/v4/graphql',
    
    // Request headers for GraphQL API calls
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    
    // Default pagination and limits
    pagination: {
        defaultSize: 20,
        maxSize: 100
    }
};

/**
 * GraphQL Query Templates
 * These queries are designed to get clinical precedence data for drug-disease-target associations
 */
const GRAPHQL_QUERIES = {
    // Query for drug-specific clinical precedence data
    drugKnownDrugs: `
        query DrugKnownDrugs($drugId: String!, $size: Int) {
            drug(chemblId: $drugId) {
                id
                name
                knownDrugs(size: $size) {
                    count
                    rows {
                        drugId
                        diseaseId
                        targetId
                        phase
                        status
                        mechanismOfAction
                        approvedSymbol
                        approvedName
                        prefName
                        label
                        ctIds
                        references {
                            source
                            urls
                            ids
                        }
                        urls {
                            url
                            name
                        }
                        disease {
                            id
                            name
                            therapeuticAreas {
                                id
                                name
                            }
                        }
                        target {
                            id
                            approvedSymbol
                            approvedName
                            biotype
                            genomicLocation {
                                chromosome
                                start
                                end
                            }
                        }
                        drug {
                            id
                            name
                            drugType
                            maximumClinicalTrialPhase
                            isApproved
                        }
                    }
                }
            }
        }
    `,
    
    // Query for disease-specific clinical precedence data
    diseaseKnownDrugs: `
        query DiseaseKnownDrugs($diseaseId: String!, $size: Int) {
            disease(efoId: $diseaseId) {
                id
                name
                knownDrugs(size: $size) {
                    count
                    rows {
                        drugId
                        diseaseId
                        targetId
                        phase
                        status
                        mechanismOfAction
                        approvedSymbol
                        approvedName
                        prefName
                        label
                        ctIds
                        references {
                            source
                            urls
                            ids
                        }
                        urls {
                            url
                            name
                        }
                        disease {
                            id
                            name
                        }
                        target {
                            id
                            approvedSymbol
                            approvedName
                            biotype
                        }
                        drug {
                            id
                            name
                            drugType
                            maximumClinicalTrialPhase
                            isApproved
                        }
                    }
                }
            }
        }
    `,
    
    // Query for target-specific clinical precedence data  
    targetKnownDrugs: `
        query TargetKnownDrugs($targetId: String!, $size: Int) {
            target(ensemblId: $targetId) {
                id
                approvedSymbol
                approvedName
                knownDrugs(size: $size) {
                    count
                    rows {
                        drugId
                        diseaseId
                        targetId
                        phase
                        status
                        mechanismOfAction
                        approvedSymbol
                        approvedName
                        prefName
                        label
                        ctIds
                        references {
                            source
                            urls
                            ids
                        }
                        urls {
                            url
                            name
                        }
                        disease {
                            id
                            name
                        }
                        target {
                            id
                            approvedSymbol
                            approvedName
                            biotype
                        }
                        drug {
                            id
                            name
                            drugType
                            maximumClinicalTrialPhase
                            isApproved
                        }
                    }
                }
            }
        }
    `
};

/**
 * OpenTarget Service Class
 * Handles all interactions with the Open Targets Platform API
 */
class OpenTargetService {
    constructor() {
        this.config = OPEN_TARGETS_CONFIG;
        this.queries = GRAPHQL_QUERIES;
    }

    /**
     * Generic GraphQL query executor with error handling and retry logic
     * @param {string} query - GraphQL query string
     * @param {Object} variables - Query variables
     * @param {number} retries - Number of retry attempts
     * @returns {Promise<Object>} API response data
     */
    async executeGraphQLQuery(query, variables = {}, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`Open Targets API Request (Attempt ${attempt}):`, {
                    query: query.substring(0, 100) + '...',
                    variables
                });

                const response = await fetch(this.config.baseUrl, {
                    method: 'POST',
                    headers: this.config.headers,
                    body: JSON.stringify({
                        query,
                        variables
                    })
                });

                // Check if response is ok
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
                }

                const data = await response.json();

                // Check for GraphQL errors
                if (data.errors) {
                    console.error('GraphQL errors:', data.errors);
                    throw new Error(`GraphQL error: ${data.errors.map(e => e.message).join(', ')}`);
                }

                console.log('Open Targets API Response received successfully');
                return data.data;

            } catch (error) {
                console.error(`Open Targets API attempt ${attempt} failed:`, error);
                
                if (attempt === retries) {
                    throw new Error(`Open Targets API failed after ${retries} attempts: ${error.message}`);
                }
                
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    /**
     * Search for clinical precedence data by drug
     * @param {string} drugId - ChEMBL drug ID (e.g., 'CHEMBL941')
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Formatted clinical precedence data
     */
    async searchByDrug(drugId, limit = 20) {
        try {
            const data = await this.executeGraphQLQuery(
                this.queries.drugKnownDrugs,
                { 
                    drugId: drugId,
                    size: Math.min(limit, this.config.pagination.maxSize)
                }
            );

            if (!data.drug || !data.drug.knownDrugs) {
                console.warn(`No clinical precedence data found for drug: ${drugId}`);
                return [];
            }

            return this.formatKnownDrugsData(data.drug.knownDrugs.rows, 'drug');

        } catch (error) {
            console.error('Error searching by drug:', error);
            throw error;
        }
    }

    /**
     * Search for clinical precedence data by disease
     * @param {string} diseaseId - EFO disease ID (e.g., 'EFO_0000685')  
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Formatted clinical precedence data
     */
    async searchByDisease(diseaseId, limit = 20) {
        try {
            const data = await this.executeGraphQLQuery(
                this.queries.diseaseKnownDrugs,
                { 
                    diseaseId: diseaseId,
                    size: Math.min(limit, this.config.pagination.maxSize)
                }
            );

            if (!data.disease || !data.disease.knownDrugs) {
                console.warn(`No clinical precedence data found for disease: ${diseaseId}`);
                return [];
            }

            return this.formatKnownDrugsData(data.disease.knownDrugs.rows, 'disease');

        } catch (error) {
            console.error('Error searching by disease:', error);
            throw error;
        }
    }

    /**
     * Search for clinical precedence data by target
     * @param {string} targetId - Ensembl target ID (e.g., 'ENSG00000167733')
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Formatted clinical precedence data
     */
    async searchByTarget(targetId, limit = 20) {
        try {
            const data = await this.executeGraphQLQuery(
                this.queries.targetKnownDrugs,
                { 
                    targetId: targetId,
                    size: Math.min(limit, this.config.pagination.maxSize)
                }
            );

            if (!data.target || !data.target.knownDrugs) {
                console.warn(`No clinical precedence data found for target: ${targetId}`);
                return [];
            }

            return this.formatKnownDrugsData(data.target.knownDrugs.rows, 'target');

        } catch (error) {
            console.error('Error searching by target:', error);
            throw error;
        }
    }

    /**
     * Format known drugs data into standardized structure for UI display
     * @param {Array} knownDrugsData - Raw data from Open Targets API
     * @param {string} searchType - Type of search performed ('drug', 'disease', 'target')
     * @returns {Array} Formatted data ready for UI rendering
     */
    formatKnownDrugsData(knownDrugsData, searchType) {
        if (!Array.isArray(knownDrugsData)) {
            console.warn('Invalid knownDrugsData format, expected array');
            return [];
        }

        return knownDrugsData.map((item, index) => {
            // Extract and format basic information
            const drugName = item.drug?.name || item.prefName || 'Unknown Drug';
            const diseaseName = item.disease?.name || item.label || 'Unknown Disease';
            const targetSymbol = item.target?.approvedSymbol || item.approvedSymbol || 'Unknown Target';
            const targetName = item.target?.approvedName || item.approvedName || 'Unknown Target Name';
            
            // Format phase information
            const phase = this.formatPhase(item.phase);
            const status = this.formatStatus(item.status);
            
            // Generate proper links
            const links = this.generateLinks(item);
            
            // Create detailed description
            const description = this.createDescription(item, searchType);

            return {
                // Unique identifier for the row
                id: `${item.drugId}-${item.diseaseId}-${item.targetId}-${index}`,
                
                // Basic identifiers  
                drugId: item.drugId,
                diseaseId: item.diseaseId,
                targetId: item.targetId,
                
                // Display names
                drugName,
                diseaseName,
                targetSymbol,
                targetName,
                
                // Clinical trial information
                phase,
                status,
                mechanismOfAction: item.mechanismOfAction || 'Not specified',
                
                // UI display fields (matching your current table structure)
                database: 'Open Targets',
                title: `${drugName} - ${diseaseName}`,
                type: this.formatType(item),
                statusSignificance: status,
                details: description,
                
                // Links and references
                links,
                viewLink: links.primary,
                
                // Raw data for additional processing
                raw: item
            };
        });
    }

    /**
     * Format clinical trial phase for display
     * @param {number|null} phase - Clinical trial phase
     * @returns {string} Formatted phase string
     */
    formatPhase(phase) {
        if (phase === null || phase === undefined) return 'Not specified';
        if (phase === 0) return 'Preclinical';
        if (phase === 4) return 'Phase IV (Post-marketing)';
        return `Phase ${phase}`;
    }

    /**
     * Format clinical trial status for display
     * @param {string|null} status - Clinical trial status
     * @returns {string} Formatted status string
     */
    formatStatus(status) {
        if (!status) return 'Unknown';
        
        // Standardize status display
        const statusMap = {
            'recruiting': 'Recruiting',
            'active': 'Active, not recruiting',
            'completed': 'Completed',
            'terminated': 'Terminated',
            'suspended': 'Suspended',
            'withdrawn': 'Withdrawn',
            'approved': 'Approved'
        };
        
        return statusMap[status.toLowerCase()] || status;
    }

    /**
     * Format the type field for display
     * @param {Object} item - Known drugs data item
     * @returns {string} Formatted type string
     */
    formatType(item) {
        const drugType = item.drug?.drugType || 'Unknown';
        const phase = this.formatPhase(item.phase);
        return `${drugType} - ${phase}`;
    }

    /**
     * Create a detailed description for the entry
     * @param {Object} item - Known drugs data item
     * @param {string} searchType - Type of search performed
     * @returns {string} Detailed description
     */
    createDescription(item, searchType) {
        const components = [];
        
        if (item.mechanismOfAction) {
            components.push(`Mechanism: ${item.mechanismOfAction}`);
        }
        
        if (item.drug?.drugType) {
            components.push(`Drug type: ${item.drug.drugType}`);
        }
        
        if (item.target?.biotype) {
            components.push(`Target type: ${item.target.biotype}`);
        }
        
        if (item.ctIds && item.ctIds.length > 0) {
            components.push(`Clinical trials: ${item.ctIds.length} registered`);
        }
        
        return components.length > 0 ? components.join(' | ') : 'Clinical precedence data available';
    }

    /**
     * Generate appropriate links for the entry
     * @param {Object} item - Known drugs data item
     * @returns {Object} Object containing various link types
     */
    generateLinks(item) {
        const links = {
            primary: null,
            clinicalTrials: [],
            references: [],
            openTargets: null
        };

        // Generate Open Targets Platform links
        if (item.drugId && item.diseaseId) {
            links.openTargets = `https://platform.opentargets.org/evidence/${item.targetId}/${item.diseaseId}`;
            if (!links.primary) links.primary = links.openTargets;
        }

        // Generate ClinicalTrials.gov links
        if (item.ctIds && Array.isArray(item.ctIds)) {
            links.clinicalTrials = item.ctIds.map(ctId => ({
                url: `https://clinicaltrials.gov/ct2/show/${ctId}`,
                name: `ClinicalTrials.gov: ${ctId}`,
                id: ctId
            }));
            
            // Use first clinical trial as primary link if no Open Targets link
            if (!links.primary && links.clinicalTrials.length > 0) {
                links.primary = links.clinicalTrials[0].url;
            }
        }

        // Process reference URLs
        if (item.references && Array.isArray(item.references)) {
            item.references.forEach(ref => {
                if (ref.urls && Array.isArray(ref.urls)) {
                    ref.urls.forEach(url => {
                        links.references.push({
                            url: url,
                            name: `${ref.source} Reference`,
                            source: ref.source
                        });
                    });
                }
            });
        }

        // Process direct URLs
        if (item.urls && Array.isArray(item.urls)) {
            item.urls.forEach(urlObj => {
                links.references.push({
                    url: urlObj.url,
                    name: urlObj.name || 'Reference',
                    source: 'Open Targets'
                });
            });
        }

        // Fallback primary link
        if (!links.primary) {
            links.primary = 'https://platform.opentargets.org/';
        }

        return links;
    }

    /**
     * Search for clinical precedence data with automatic entity type detection
     * @param {string} query - Search query (drug name, disease name, or target symbol)
     * @param {string} entityType - Type of entity ('drug', 'disease', 'target', or 'auto')
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Formatted clinical precedence data
     */
    async search(query, entityType = 'auto', limit = 20) {
        try {
            console.log(`Searching Open Targets for: "${query}" (type: ${entityType})`);

            // For now, we'll assume the query is a drug ChEMBL ID if it starts with CHEMBL
            // You might want to implement a more sophisticated entity detection system
            if (entityType === 'auto') {
                if (query.startsWith('CHEMBL')) {
                    entityType = 'drug';
                } else if (query.startsWith('EFO_') || query.startsWith('MONDO_')) {
                    entityType = 'disease';
                } else if (query.startsWith('ENSG')) {
                    entityType = 'target';
                } else {
                    // Default to drug search for now
                    entityType = 'drug';
                }
            }

            switch (entityType) {
                case 'drug':
                    return await this.searchByDrug(query, limit);
                case 'disease':
                    return await this.searchByDisease(query, limit);
                case 'target':
                    return await this.searchByTarget(query, limit);
                default:
                    throw new Error(`Unsupported entity type: ${entityType}`);
            }

        } catch (error) {
            console.error('Open Targets search error:', error);
            throw error;
        }
    }
}

/**
 * Utility Functions for Open Targets Integration
 */
const OpenTargetUtils = {
    /**
     * Validate entity IDs based on their format
     * @param {string} id - Entity ID to validate
     * @returns {Object} Validation result with type and validity
     */
    validateEntityId(id) {
        if (!id || typeof id !== 'string') {
            return { valid: false, type: 'unknown', error: 'Invalid ID format' };
        }

        if (id.startsWith('CHEMBL')) {
            return { valid: true, type: 'drug', id: id };
        } else if (id.startsWith('EFO_') || id.startsWith('MONDO_') || id.startsWith('HP_')) {
            return { valid: true, type: 'disease', id: id };
        } else if (id.startsWith('ENSG')) {
            return { valid: true, type: 'target', id: id };
        } else {
            return { valid: false, type: 'unknown', error: 'Unrecognized ID format' };
        }
    },

    /**
     * Convert drug name to ChEMBL ID (placeholder - you'd need a mapping service)
     * @param {string} drugName - Drug name
     * @returns {Promise<string|null>} ChEMBL ID or null
     */
    async drugNameToChemblId(drugName) {
        // This is a placeholder - in a real implementation, you'd use Open Targets search API
        // or maintain a drug name to ChEMBL ID mapping
        const commonDrugs = {
            'imatinib': 'CHEMBL941',
            'aspirin': 'CHEMBL25',
            'paracetamol': 'CHEMBL112',
            'metformin': 'CHEMBL1431'
        };
        
        return commonDrugs[drugName.toLowerCase()] || null;
    },

    /**
     * Format clinical precedence data for export
     * @param {Array} data - Formatted clinical precedence data
     * @param {string} format - Export format ('csv', 'json', 'tsv')
     * @returns {string} Formatted export data
     */
    formatForExport(data, format = 'csv') {
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }

        switch (format.toLowerCase()) {
            case 'csv':
                return this.formatAsCsv(data);
            case 'tsv':
                return this.formatAsTsv(data);
            case 'json':
                return JSON.stringify(data, null, 2);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    },

    formatAsCsv(data) {
        const headers = ['Drug Name', 'Disease', 'Target Symbol', 'Target Name', 'Phase', 'Status', 'Mechanism of Action', 'Primary Link'];
        const rows = data.map(item => [
            item.drugName,
            item.diseaseName,
            item.targetSymbol,
            item.targetName,
            item.phase,
            item.status,
            item.mechanismOfAction,
            item.links.primary
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    },

    formatAsTsv(data) {
        return this.formatAsCsv(data).replace(/,/g, '\t').replace(/"/g, '');
    }
};

// Export the service and utilities
export { OpenTargetService, OpenTargetUtils, OPEN_TARGETS_CONFIG };

// Default export for easier importing
export default OpenTargetService;

/**
 * Example Usage:
 * 
 * import OpenTargetService from './OpenTarget.js';
 * 
 * const openTargets = new OpenTargetService();
 * 
 * // Search by drug ChEMBL ID
 * const drugResults = await openTargets.searchByDrug('CHEMBL941'); // Imatinib
 * 
 * // Search by disease EFO ID  
 * const diseaseResults = await openTargets.searchByDisease('EFO_0000685'); // Acute lymphoblastic leukemia
 * 
 * // Search by target Ensembl ID
 * const targetResults = await openTargets.searchByTarget('ENSG00000167733'); // KIT
 * 
 * // Auto-detect entity type
 * const autoResults = await openTargets.search('CHEMBL941');
 */
