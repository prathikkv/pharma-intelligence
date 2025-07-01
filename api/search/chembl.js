// api/search/chembl.js - Enhanced ChEMBL implementation with bioactive molecules and clinical data
// Replace your current api/search/chembl.js file with this enhanced version

/**
 * Enhanced ChEMBL API handler for bioactive molecules and drug discovery data
 * Returns actionable drug data with bioactivity, clinical phases, and mechanism information
 */

const CHEMBL_CONFIG = {
    baseUrl: 'https://www.ebi.ac.uk/chembl/api/data',
    webUrl: 'https://www.ebi.ac.uk/chembl',
    maxRetries: 3,
    timeout: 30000,
    rateLimit: 20 // requests per second
};

/**
 * Execute ChEMBL API request with error handling and retries
 */
async function executeChEMBLRequest(endpoint, params = {}, retries = 3) {
    const url = new URL(`${CHEMBL_CONFIG.baseUrl}/${endpoint}`);
    
    // Add default parameters
    params.format = 'json';
    if (!params.limit) params.limit = 50;
    
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
                    'User-Agent': 'PharmaIntelligence/1.0'
                },
                signal: AbortSignal.timeout(CHEMBL_CONFIG.timeout)
            });

            if (!response.ok) {
                throw new Error(`ChEMBL API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error(`ChEMBL API attempt ${attempt} failed:`, error);
            
            if (attempt === retries) {
                throw new Error(`ChEMBL API failed after ${retries} attempts: ${error.message}`);
            }
            
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
}

/**
 * Format clinical phase for display
 */
function formatPhase(phase) {
    if (phase === null || phase === undefined || phase === '') return 'Unknown';
    if (phase === 0) return 'Preclinical';
    if (phase === 4) return 'Approved';
    return `Phase ${phase}`;
}

/**
 * Format molecule type for better display
 */
function formatMoleculeType(type) {
    const typeMap = {
        'Small molecule': 'Small Molecule',
        'Protein': 'Protein/Biologic',
        'Oligosaccharide': 'Oligosaccharide',
        'Oligonucleotide': 'Oligonucleotide',
        'Cell': 'Cell Therapy',
        'Unknown': 'Unknown Type'
    };
    return typeMap[type] || type || 'Unknown Type';
}

/**
 * Generate proper ChEMBL links
 */
function generateChEMBLLinks(molecule) {
    const chemblId = molecule.molecule_chembl_id;
    
    return {
        primary: `${CHEMBL_CONFIG.webUrl}/compound_report_card/${chemblId}`,
        molecule: `${CHEMBL_CONFIG.webUrl}/compound_report_card/${chemblId}`,
        bioactivity: `${CHEMBL_CONFIG.webUrl}/compound_report_card/${chemblId}#bioactivity`,
        mechanisms: `${CHEMBL_CONFIG.webUrl}/compound_report_card/${chemblId}#mechanisms`,
        structure: molecule.structure_type ? `${CHEMBL_CONFIG.baseUrl}/image/${chemblId}` : null,
        clinical_trials: chemblId ? `https://clinicaltrials.gov/search?term=${chemblId}` : null
    };
}

/**
 * Create detailed description from molecule data
 */
function createMoleculeDescription(molecule, bioactivities = [], mechanisms = []) {
    const components = [];
    
    if (molecule.indication_class) {
        components.push(`Indication: ${molecule.indication_class}`);
    }
    
    if (bioactivities.length > 0) {
        components.push(`Bioactivities: ${bioactivities.length} recorded`);
        
        // Get unique target types
        const targetTypes = [...new Set(bioactivities
            .map(b => b.target_type)
            .filter(Boolean))];
        if (targetTypes.length > 0) {
            components.push(`Target types: ${targetTypes.slice(0, 3).join(', ')}`);
        }
    }
    
    if (mechanisms.length > 0) {
        const uniqueMechanisms = [...new Set(mechanisms
            .map(m => m.mechanism_of_action)
            .filter(Boolean))];
        if (uniqueMechanisms.length > 0) {
            components.push(`Mechanisms: ${uniqueMechanisms.slice(0, 2).join(', ')}`);
        }
    }
    
    if (molecule.molecular_weight) {
        components.push(`MW: ${Math.round(molecule.molecular_weight)} Da`);
    }
    
    if (molecule.alogp) {
        components.push(`LogP: ${parseFloat(molecule.alogp).toFixed(1)}`);
    }
    
    return components.length > 0 ? components.join(' | ') : 'ChEMBL bioactive molecule';
}

/**
 * Get additional molecule data (bioactivities and mechanisms)
 */
async function getAdditionalMoleculeData(chemblId) {
    try {
        const [bioactivities, mechanisms] = await Promise.allSettled([
            executeChEMBLRequest(`activity.json`, { 
                molecule_chembl_id: chemblId,
                limit: 10
            }),
            executeChEMBLRequest(`mechanism.json`, { 
                molecule_chembl_id: chemblId,
                limit: 10
            })
        ]);

        return {
            bioactivities: bioactivities.status === 'fulfilled' ? bioactivities.value.activities || [] : [],
            mechanisms: mechanisms.status === 'fulfilled' ? mechanisms.value.mechanisms || [] : []
        };
    } catch (error) {
        console.error(`Error fetching additional data for ${chemblId}:`, error);
        return { bioactivities: [], mechanisms: [] };
    }
}

/**
 * Search molecules by text query
 */
async function searchMolecules(query, limit = 50) {
    try {
        // First try molecule search
        const moleculeData = await executeChEMBLRequest('molecule/search.json', {
            q: query,
            limit: limit
        });

        if (!moleculeData.molecules || moleculeData.molecules.length === 0) {
            // If no molecules found, try a broader search
            const broadData = await executeChEMBLRequest('molecule.json', {
                pref_name__icontains: query,
                limit: Math.min(limit, 20)
            });
            return broadData.molecules || [];
        }

        return moleculeData.molecules || [];
    } catch (error) {
        console.error('ChEMBL molecule search error:', error);
        return [];
    }
}

/**
 * Search targets by text query
 */
async function searchTargets(query, limit = 20) {
    try {
        const targetData = await executeChEMBLRequest('target/search.json', {
            q: query,
            limit: limit
        });

        return targetData.targets || [];
    } catch (error) {
        console.error('ChEMBL target search error:', error);
        return [];
    }
}

/**
 * Format molecule data for consistent output
 */
async function formatMoleculeData(molecules) {
    const results = [];
    
    for (const molecule of molecules) {
        try {
            // Get additional data for more detailed information
            const additionalData = await getAdditionalMoleculeData(molecule.molecule_chembl_id);
            
            const links = generateChEMBLLinks(molecule);
            const description = createMoleculeDescription(
                molecule, 
                additionalData.bioactivities, 
                additionalData.mechanisms
            );
            
            const phase = formatPhase(molecule.max_phase);
            const moleculeType = formatMoleculeType(molecule.molecule_type);
            
            // Determine status based on phase and availability
            let status = 'Research';
            if (molecule.max_phase === 4) status = 'Approved';
            else if (molecule.max_phase === 3) status = 'Phase III';
            else if (molecule.max_phase === 2) status = 'Phase II';
            else if (molecule.max_phase === 1) status = 'Phase I';
            else if (molecule.max_phase === 0) status = 'Preclinical';
            
            // Extract year from first approval or use current year
            const year = molecule.first_approval ? new Date(molecule.first_approval).getFullYear() : new Date().getFullYear();
            
            results.push({
                id: `CHEMBL-${molecule.molecule_chembl_id}`,
                database: 'ChEMBL',
                title: molecule.pref_name || molecule.molecule_chembl_id,
                type: `${moleculeType} - ${phase}`,
                status_significance: status,
                details: description,
                phase: phase,
                status: status,
                sponsor: 'Multiple (See ChEMBL)',
                year: year,
                enrollment: 'N/A',
                link: links.primary,
                
                // ChEMBL-specific fields
                chembl_id: molecule.molecule_chembl_id,
                molecule_type: moleculeType,
                max_phase: molecule.max_phase,
                indication_class: molecule.indication_class,
                molecular_weight: molecule.molecular_weight,
                alogp: molecule.alogp,
                bioactivities_count: additionalData.bioactivities.length,
                mechanisms_count: additionalData.mechanisms.length,
                
                // Additional links
                structure_link: links.structure,
                bioactivity_link: links.bioactivity,
                mechanisms_link: links.mechanisms,
                clinical_trials_link: links.clinical_trials,
                
                // Raw data for further processing
                raw_data: {
                    molecule: molecule,
                    bioactivities: additionalData.bioactivities,
                    mechanisms: additionalData.mechanisms
                }
            });
            
        } catch (error) {
            console.error(`Error processing molecule ${molecule.molecule_chembl_id}:`, error);
            
            // Add basic data even if detailed processing fails
            const links = generateChEMBLLinks(molecule);
            results.push({
                id: `CHEMBL-${molecule.molecule_chembl_id}`,
                database: 'ChEMBL',
                title: molecule.pref_name || molecule.molecule_chembl_id,
                type: `${formatMoleculeType(molecule.molecule_type)} - ${formatPhase(molecule.max_phase)}`,
                status_significance: molecule.max_phase === 4 ? 'Approved' : 'Research',
                details: 'ChEMBL bioactive molecule',
                phase: formatPhase(molecule.max_phase),
                status: molecule.max_phase === 4 ? 'Approved' : 'Research',
                sponsor: 'Multiple (See ChEMBL)',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: links.primary,
                chembl_id: molecule.molecule_chembl_id,
                raw_data: { molecule: molecule }
            });
        }
    }
    
    return results;
}

/**
 * Format target data for consistent output
 */
function formatTargetData(targets) {
    return targets.map((target, index) => {
        const links = {
            primary: `${CHEMBL_CONFIG.webUrl}/target_report_card/${target.target_chembl_id}`,
            target: `${CHEMBL_CONFIG.webUrl}/target_report_card/${target.target_chembl_id}`,
            bioactivity: `${CHEMBL_CONFIG.webUrl}/target_report_card/${target.target_chembl_id}#bioactivity`
        };
        
        const description = [
            target.target_type ? `Type: ${target.target_type}` : '',
            target.organism ? `Organism: ${target.organism}` : '',
            target.target_components?.length ? `Components: ${target.target_components.length}` : ''
        ].filter(Boolean).join(' | ') || 'ChEMBL protein target';
        
        return {
            id: `CHEMBL-TARGET-${target.target_chembl_id}`,
            database: 'ChEMBL',
            title: target.pref_name || target.target_chembl_id,
            type: `${target.target_type || 'Protein Target'} - ${target.organism || 'Unknown organism'}`,
            status_significance: 'Target',
            details: description,
            phase: 'N/A',
            status: 'Target',
            sponsor: 'N/A',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: links.primary,
            
            // Target-specific fields
            chembl_id: target.target_chembl_id,
            target_type: target.target_type,
            organism: target.organism,
            target_components: target.target_components,
            
            // Additional links
            bioactivity_link: links.bioactivity,
            
            raw_data: target
        };
    });
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
    // Set CORS headers
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

    const { query, limit = 50, search_type = 'molecule' } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        console.log(`ChEMBL search for: "${query}" (type: ${search_type})`);
        
        const searchLimit = Math.min(parseInt(limit) || 50, 100);
        let results = [];

        if (search_type === 'molecule' || search_type === 'all') {
            // Search for molecules
            const molecules = await searchMolecules(query, searchLimit);
            if (molecules.length > 0) {
                const moleculeResults = await formatMoleculeData(molecules);
                results.push(...moleculeResults);
            }
        }

        if (search_type === 'target' || search_type === 'all') {
            // Search for targets
            const targets = await searchTargets(query, Math.min(searchLimit, 20));
            if (targets.length > 0) {
                const targetResults = formatTargetData(targets);
                results.push(...targetResults);
            }
        }

        // Remove duplicates and sort by relevance
        const uniqueResults = results.filter((item, index, self) => 
            index === self.findIndex(t => t.id === item.id)
        );

        // Sort by clinical phase (approved first, then by phase)
        uniqueResults.sort((a, b) => {
            if (a.status === 'Approved' && b.status !== 'Approved') return -1;
            if (a.status !== 'Approved' && b.status === 'Approved') return 1;
            
            const phaseA = a.raw_data?.molecule?.max_phase || 0;
            const phaseB = b.raw_data?.molecule?.max_phase || 0;
            return phaseB - phaseA;
        });

        console.log(`ChEMBL returned ${uniqueResults.length} results`);

        return res.status(200).json({
            results: uniqueResults.slice(0, searchLimit),
            total: uniqueResults.length,
            query: query,
            search_type: search_type,
            search_timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('ChEMBL API error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message,
            results: [],
            total: 0,
            query: query
        });
    }
}
