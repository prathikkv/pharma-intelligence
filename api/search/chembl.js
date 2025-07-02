// api/search/chembl.js - ENHANCED VERSION for comprehensive drug discovery results
// Replace your current chembl.js with this enhanced version

/**
 * Enhanced ChEMBL API handler optimized for pharmaceutical research
 * Returns comprehensive drug discovery data with bioactivity, targets, and clinical info
 */

const CHEMBL_CONFIG = {
    baseUrl: 'https://www.ebi.ac.uk/chembl/api/data',
    webUrl: 'https://www.ebi.ac.uk/chembl',
    maxRetries: 2,
    timeout: 20000,
    rateLimit: 15 // More aggressive for comprehensive results
};

/**
 * ENHANCED search strategies for comprehensive drug discovery data
 */
async function comprehensiveChEMBLSearch(query, limit = 200) {
    const allResults = [];
    const searchStrategies = [];
    
    console.log(`ChEMBL: Starting comprehensive search for "${query}"`);
    
    try {
        // Strategy 1: Molecule search (primary for drug discovery)
        const moleculeResults = await searchMolecules(query, Math.min(limit, 100));
        if (moleculeResults.length > 0) {
            allResults.push(...moleculeResults);
            searchStrategies.push(`Molecules: ${moleculeResults.length} results`);
            console.log(`ChEMBL: Found ${moleculeResults.length} molecules`);
        }
        
        // Strategy 2: Target search for comprehensive protein data
        const targetResults = await searchTargets(query, Math.min(50, limit - allResults.length));
        if (targetResults.length > 0) {
            allResults.push(...targetResults);
            searchStrategies.push(`Targets: ${targetResults.length} results`);
            console.log(`ChEMBL: Found ${targetResults.length} targets`);
        }
        
        // Strategy 3: Bioactivity search for mechanism data
        const bioactivityResults = await searchBioactivities(query, Math.min(100, limit - allResults.length));
        if (bioactivityResults.length > 0) {
            allResults.push(...bioactivityResults);
            searchStrategies.push(`Bioactivities: ${bioactivityResults.length} results`);
            console.log(`ChEMBL: Found ${bioactivityResults.length} bioactivities`);
        }
        
        // Strategy 4: Drug indication search
        const indicationResults = await searchByIndication(query, Math.min(50, limit - allResults.length));
        if (indicationResults.length > 0) {
            allResults.push(...indicationResults);
            searchStrategies.push(`Indications: ${indicationResults.length} results`);
            console.log(`ChEMBL: Found ${indicationResults.length} indication matches`);
        }
        
    } catch (error) {
        console.error('ChEMBL comprehensive search error:', error);
        searchStrategies.push(`Error: ${error.message}`);
    }
    
    // Remove duplicates and enhance data
    const uniqueResults = removeDuplicates(allResults);
    const enhancedResults = await enhanceResultsWithAdditionalData(uniqueResults);
    
    console.log(`ChEMBL: Comprehensive search completed - ${enhancedResults.length} unique results`);
    
    return {
        results: enhancedResults,
        strategies: searchStrategies,
        totalFound: enhancedResults.length
    };
}

/**
 * Enhanced molecule search with comprehensive data
 */
async function searchMolecules(query, limit = 100) {
    try {
        const searchParams = {
            q: query,
            limit: limit,
            format: 'json'
        };
        
        const response = await executeChEMBLRequest('molecule/search.json', searchParams);
        
        if (!response?.molecules) {
            // Fallback to broader search
            const broadResponse = await executeChEMBLRequest('molecule.json', {
                pref_name__icontains: query,
                limit: Math.min(limit, 50),
                format: 'json'
            });
            return processMoleculeData(broadResponse?.molecules || []);
        }
        
        return processMoleculeData(response.molecules);
        
    } catch (error) {
        console.error('ChEMBL molecule search error:', error);
        return [];
    }
}

/**
 * Enhanced target search
 */
async function searchTargets(query, limit = 50) {
    try {
        const searchParams = {
            q: query,
            limit: limit,
            format: 'json'
        };
        
        const response = await executeChEMBLRequest('target/search.json', searchParams);
        return processTargetData(response?.targets || []);
        
    } catch (error) {
        console.error('ChEMBL target search error:', error);
        return [];
    }
}

/**
 * Enhanced bioactivity search for mechanism insights
 */
async function searchBioactivities(query, limit = 100) {
    try {
        // Search bioactivities by target or compound name
        const searchParams = {
            target_pref_name__icontains: query,
            limit: limit,
            format: 'json'
        };
        
        const response = await executeChEMBLRequest('activity.json', searchParams);
        return processBioactivityData(response?.activities || []);
        
    } catch (error) {
        console.error('ChEMBL bioactivity search error:', error);
        return [];
    }
}

/**
 * Search by drug indication
 */
async function searchByIndication(query, limit = 50) {
    try {
        const searchParams = {
            indication_class__icontains: query,
            limit: limit,
            format: 'json'
        };
        
        const response = await executeChEMBLRequest('drug_indication.json', searchParams);
        return processIndicationData(response?.drug_indications || []);
        
    } catch (error) {
        console.error('ChEMBL indication search error:', error);
        return [];
    }
}

/**
 * Process molecule data with enhanced information
 */
function processMoleculeData(molecules) {
    return molecules.map((molecule, index) => {
        const chemblId = molecule.molecule_chembl_id;
        const name = molecule.pref_name || chemblId;
        const phase = molecule.max_phase;
        
        return {
            id: `CHEMBL-MOL-${chemblId}`,
            database: 'ChEMBL',
            title: `${name} - Drug Profile`,
            type: `${molecule.molecule_type || 'Molecule'} - ${formatChEMBLPhase(phase)}`,
            status_significance: determineChEMBLStatus(molecule),
            details: createMoleculeDescription(molecule),
            phase: formatChEMBLPhase(phase),
            status: determineChEMBLStatus(molecule),
            sponsor: 'Multiple (See ChEMBL)',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: `${CHEMBL_CONFIG.webUrl}/compound_report_card/${chemblId}`,
            
            // ChEMBL-specific fields
            chembl_id: chemblId,
            molecule_type: molecule.molecule_type,
            max_phase: phase,
            molecular_weight: molecule.molecule_properties?.molecular_weight,
            alogp: molecule.molecule_properties?.alogp,
            hbd: molecule.molecule_properties?.hbd,
            hba: molecule.molecule_properties?.hba,
            num_ro5_violations: molecule.molecule_properties?.num_ro5_violations,
            indication_class: molecule.indication_class,
            first_approval: molecule.first_approval,
            
            // Enhanced links
            structure_link: `${CHEMBL_CONFIG.baseUrl}/image/${chemblId}`,
            bioactivity_link: `${CHEMBL_CONFIG.webUrl}/compound_report_card/${chemblId}#bioactivity`,
            
            raw_data: molecule
        };
    });
}

/**
 * Process target data
 */
function processTargetData(targets) {
    return targets.map((target, index) => {
        const chemblId = target.target_chembl_id;
        const name = target.pref_name || chemblId;
        
        return {
            id: `CHEMBL-TGT-${chemblId}`,
            database: 'ChEMBL',
            title: `${name} - Protein Target`,
            type: `${target.target_type || 'Protein'} Target - ${target.organism || 'Unknown organism'}`,
            status_significance: 'Drug Target',
            details: createTargetDescription(target),
            phase: 'N/A',
            status: 'Drug Target',
            sponsor: 'N/A',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: `${CHEMBL_CONFIG.webUrl}/target_report_card/${chemblId}`,
            
            // Target-specific fields
            chembl_id: chemblId,
            target_type: target.target_type,
            organism: target.organism,
            tax_id: target.tax_id,
            
            raw_data: target
        };
    });
}

/**
 * Process bioactivity data for mechanism insights
 */
function processBioactivityData(activities) {
    const processedActivities = [];
    
    activities.forEach((activity, index) => {
        const targetName = activity.target_pref_name || 'Unknown Target';
        const compoundName = activity.molecule_pref_name || activity.molecule_chembl_id;
        
        processedActivities.push({
            id: `CHEMBL-ACT-${activity.activity_id || index}`,
            database: 'ChEMBL',
            title: `${compoundName} → ${targetName}`,
            type: `Bioactivity - ${activity.standard_type || 'Unknown'} assay`,
            status_significance: 'Bioactivity Data',
            details: createBioactivityDescription(activity),
            phase: 'N/A',
            status: 'Bioactivity Data',
            sponsor: 'N/A',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: activity.molecule_chembl_id ? 
                `${CHEMBL_CONFIG.webUrl}/compound_report_card/${activity.molecule_chembl_id}` :
                CHEMBL_CONFIG.webUrl,
            
            // Bioactivity-specific fields
            molecule_chembl_id: activity.molecule_chembl_id,
            target_chembl_id: activity.target_chembl_id,
            assay_type: activity.assay_type,
            standard_type: activity.standard_type,
            standard_value: activity.standard_value,
            standard_units: activity.standard_units,
            standard_relation: activity.standard_relation,
            
            raw_data: activity
        });
    });
    
    return processedActivities;
}

/**
 * Process drug indication data
 */
function processIndicationData(indications) {
    return indications.map((indication, index) => {
        const moleculeName = indication.molecule_pref_name || indication.molecule_chembl_id;
        
        return {
            id: `CHEMBL-IND-${indication.drugind_id || index}`,
            database: 'ChEMBL',
            title: `${moleculeName} for ${indication.indication}`,
            type: `Drug Indication - ${indication.indication_class || 'Unknown class'}`,
            status_significance: 'Drug Indication',
            details: `${moleculeName} indicated for ${indication.indication}. Max phase: ${indication.max_phase_for_ind || 'Unknown'}`,
            phase: formatChEMBLPhase(indication.max_phase_for_ind),
            status: 'Drug Indication',
            sponsor: 'Multiple',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: indication.molecule_chembl_id ? 
                `${CHEMBL_CONFIG.webUrl}/compound_report_card/${indication.molecule_chembl_id}` :
                CHEMBL_CONFIG.webUrl,
            
            // Indication-specific fields
            molecule_chembl_id: indication.molecule_chembl_id,
            indication: indication.indication,
            indication_class: indication.indication_class,
            max_phase_for_indication: indication.max_phase_for_ind,
            
            raw_data: indication
        };
    });
}

/**
 * Execute ChEMBL API request with enhanced error handling
 */
async function executeChEMBLRequest(endpoint, params = {}, retries = 2) {
    const url = new URL(`${CHEMBL_CONFIG.baseUrl}/${endpoint}`);
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'PharmaceuticalIntelligence/3.0'
                },
                signal: AbortSignal.timeout(CHEMBL_CONFIG.timeout)
            });

            if (!response.ok) {
                throw new Error(`ChEMBL API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error(`ChEMBL API attempt ${attempt} failed:`, error);
            
            if (attempt === retries) {
                throw error;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

/**
 * Helper functions for data processing
 */
function formatChEMBLPhase(phase) {
    if (phase === null || phase === undefined) return 'Unknown';
    if (phase === 0) return 'Preclinical';
    if (phase === 4) return 'Approved';
    return `Phase ${phase}`;
}

function determineChEMBLStatus(molecule) {
    if (molecule.max_phase === 4) return 'Approved';
    if (molecule.max_phase >= 1) return 'Clinical Development';
    return 'Research';
}

function createMoleculeDescription(molecule) {
    const parts = [];
    
    if (molecule.molecule_type) parts.push(`Type: ${molecule.molecule_type}`);
    if (molecule.max_phase !== null) parts.push(`Max Phase: ${molecule.max_phase}`);
    if (molecule.indication_class) parts.push(`Indication: ${molecule.indication_class}`);
    if (molecule.molecule_properties?.molecular_weight) {
        parts.push(`MW: ${Math.round(molecule.molecule_properties.molecular_weight)} Da`);
    }
    if (molecule.first_approval) parts.push(`First Approval: ${molecule.first_approval}`);
    
    return parts.length > 0 ? parts.join(' | ') : 'ChEMBL molecule entry';
}

function createTargetDescription(target) {
    const parts = [];
    
    if (target.target_type) parts.push(`Type: ${target.target_type}`);
    if (target.organism) parts.push(`Organism: ${target.organism}`);
    if (target.target_components?.length) parts.push(`Components: ${target.target_components.length}`);
    
    return parts.length > 0 ? parts.join(' | ') : 'ChEMBL protein target';
}

function createBioactivityDescription(activity) {
    const parts = [];
    
    if (activity.standard_type && activity.standard_value && activity.standard_units) {
        parts.push(`${activity.standard_type}: ${activity.standard_relation || ''}${activity.standard_value} ${activity.standard_units}`);
    }
    if (activity.assay_type) parts.push(`Assay: ${activity.assay_type}`);
    if (activity.target_pref_name) parts.push(`Target: ${activity.target_pref_name}`);
    
    return parts.length > 0 ? parts.join(' | ') : 'ChEMBL bioactivity data';
}

function removeDuplicates(results) {
    const seen = new Set();
    return results.filter(result => {
        const key = result.id || result.chembl_id || Math.random();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

async function enhanceResultsWithAdditionalData(results) {
    // For now, return as-is. In production, could fetch additional mechanism data
    return results.sort((a, b) => {
        // Sort by clinical relevance
        const phaseA = extractPhaseNumber(a.phase);
        const phaseB = extractPhaseNumber(b.phase);
        return phaseB - phaseA;
    });
}

function extractPhaseNumber(phase) {
    if (!phase) return 0;
    if (phase.includes('Approved')) return 4;
    if (phase.includes('Phase IV')) return 4;
    if (phase.includes('Phase III')) return 3;
    if (phase.includes('Phase II')) return 2;
    if (phase.includes('Phase I')) return 1;
    return 0;
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query, limit = 200 } = req.query;

    if (!query) {
        return res.status(400).json({ 
            error: 'Query parameter is required',
            example: 'Try: "imatinib" or "kinase inhibitor" or "cancer"'
        });
    }

    const startTime = performance.now();

    try {
        console.log(`ChEMBL comprehensive search for: "${query}"`);
        
        const searchLimit = Math.min(parseInt(limit) || 200, 500);
        const searchResults = await comprehensiveChEMBLSearch(query, searchLimit);
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.log(`ChEMBL search completed: ${searchResults.results.length} results in ${responseTime}ms`);

        return res.status(200).json({
            results: searchResults.results,
            total: searchResults.results.length,
            query: query,
            search_strategies: searchResults.strategies,
            search_timestamp: new Date().toISOString(),
            response_time: responseTime,
            api_status: 'success',
            data_source: 'ChEMBL API'
        });

    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.error('ChEMBL API error:', error);
        
        return res.status(500).json({
            error: 'ChEMBL API error',
            message: error.message,
            results: [],
            total: 0,
            query: query,
            response_time: responseTime,
            search_timestamp: new Date().toISOString()
        });
    }
}
