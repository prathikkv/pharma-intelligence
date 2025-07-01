// api/search/uniprot.js - Enhanced UniProt implementation with protein function and pathway data
// Replace your current api/search/uniprot.js file with this enhanced version

/**
 * Enhanced UniProt API handler for protein sequences and functional information
 * Returns actionable protein data with functions, pathways, diseases, and interactions
 */

const UNIPROT_CONFIG = {
    baseUrl: 'https://rest.uniprot.org',
    webUrl: 'https://www.uniprot.org',
    maxRetries: 3,
    timeout: 30000,
    rateLimit: 10, // requests per second
    maxResults: 500
};

/**
 * Execute UniProt API request with error handling and retries
 */
async function executeUniProtRequest(endpoint, params = {}, retries = 3) {
    const url = new URL(`${UNIPROT_CONFIG.baseUrl}/${endpoint}`);
    
    // Add default parameters for enhanced data
    if (!params.format) params.format = 'json';
    if (!params.size) params.size = Math.min(params.limit || 50, UNIPROT_CONFIG.maxResults);
    
    // Add fields for comprehensive protein information
    if (endpoint.includes('uniprotkb/search') && !params.fields) {
        params.fields = [
            'accession', 'id', 'gene_names', 'protein_name', 'organism_name',
            'length', 'mass', 'cc_function', 'cc_pathway', 'cc_disease',
            'cc_interaction', 'cc_subcellular_location', 'ft_domain',
            'go_p', 'go_c', 'go_f', 'xref_reactome', 'xref_kegg',
            'xref_string', 'xref_pdb', 'keyword', 'ec'
        ].join(',');
    }
    
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
                signal: AbortSignal.timeout(UNIPROT_CONFIG.timeout)
            });

            if (!response.ok) {
                throw new Error(`UniProt API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error(`UniProt API attempt ${attempt} failed:`, error);
            
            if (attempt === retries) {
                throw new Error(`UniProt API failed after ${retries} attempts: ${error.message}`);
            }
            
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
}

/**
 * Extract gene names from UniProt entry
 */
function extractGeneNames(protein) {
    if (!protein.genes) return [];
    
    const geneNames = [];
    protein.genes.forEach(gene => {
        if (gene.geneName?.value) {
            geneNames.push(gene.geneName.value);
        }
        if (gene.synonyms) {
            gene.synonyms.forEach(synonym => {
                if (synonym.value) geneNames.push(synonym.value);
            });
        }
    });
    
    return [...new Set(geneNames)]; // Remove duplicates
}

/**
 * Extract protein function information
 */
function extractFunction(protein) {
    const functions = [];
    
    if (protein.comments) {
        protein.comments.forEach(comment => {
            if (comment.commentType === 'FUNCTION' && comment.texts) {
                comment.texts.forEach(text => {
                    if (text.value) functions.push(text.value);
                });
            }
        });
    }
    
    return functions.join(' ');
}

/**
 * Extract pathway information
 */
function extractPathways(protein) {
    const pathways = [];
    
    if (protein.comments) {
        protein.comments.forEach(comment => {
            if (comment.commentType === 'PATHWAY' && comment.texts) {
                comment.texts.forEach(text => {
                    if (text.value) pathways.push(text.value);
                });
            }
        });
    }
    
    // Also extract from cross-references
    if (protein.uniProtKBCrossReferences) {
        protein.uniProtKBCrossReferences.forEach(xref => {
            if (xref.database === 'Reactome' || xref.database === 'KEGG') {
                if (xref.properties) {
                    xref.properties.forEach(prop => {
                        if (prop.key === 'PathwayName' && prop.value) {
                            pathways.push(prop.value);
                        }
                    });
                }
            }
        });
    }
    
    return [...new Set(pathways)]; // Remove duplicates
}

/**
 * Extract disease associations
 */
function extractDiseases(protein) {
    const diseases = [];
    
    if (protein.comments) {
        protein.comments.forEach(comment => {
            if (comment.commentType === 'DISEASE' && comment.disease) {
                diseases.push({
                    name: comment.disease.diseaseId || 'Unknown disease',
                    description: comment.texts?.[0]?.value || ''
                });
            }
        });
    }
    
    return diseases;
}

/**
 * Extract subcellular location
 */
function extractSubcellularLocation(protein) {
    const locations = [];
    
    if (protein.comments) {
        protein.comments.forEach(comment => {
            if (comment.commentType === 'SUBCELLULAR_LOCATION' && comment.subcellularLocations) {
                comment.subcellularLocations.forEach(location => {
                    if (location.location?.value) {
                        locations.push(location.location.value);
                    }
                });
            }
        });
    }
    
    return [...new Set(locations)];
}

/**
 * Extract GO terms
 */
function extractGOTerms(protein) {
    const goTerms = {
        biological_process: [],
        cellular_component: [],
        molecular_function: []
    };
    
    if (protein.uniProtKBCrossReferences) {
        protein.uniProtKBCrossReferences.forEach(xref => {
            if (xref.database === 'GO' && xref.properties) {
                xref.properties.forEach(prop => {
                    if (prop.key === 'GoTerm') {
                        const term = prop.value;
                        if (term.startsWith('P:')) {
                            goTerms.biological_process.push(term.substring(2));
                        } else if (term.startsWith('C:')) {
                            goTerms.cellular_component.push(term.substring(2));
                        } else if (term.startsWith('F:')) {
                            goTerms.molecular_function.push(term.substring(2));
                        }
                    }
                });
            }
        });
    }
    
    return goTerms;
}

/**
 * Extract domains and features
 */
function extractDomains(protein) {
    const domains = [];
    
    if (protein.features) {
        protein.features.forEach(feature => {
            if (feature.type === 'Domain' && feature.description) {
                domains.push(feature.description);
            }
        });
    }
    
    return [...new Set(domains)];
}

/**
 * Generate UniProt links
 */
function generateUniProtLinks(protein) {
    const accession = protein.primaryAccession;
    
    const links = {
        primary: `${UNIPROT_CONFIG.webUrl}/uniprotkb/${accession}/entry`,
        uniprot: `${UNIPROT_CONFIG.webUrl}/uniprotkb/${accession}/entry`,
        function: `${UNIPROT_CONFIG.webUrl}/uniprotkb/${accession}/entry#function`,
        pathways: `${UNIPROT_CONFIG.webUrl}/uniprotkb/${accession}/entry#pathology_and_biotech`,
        interactions: `${UNIPROT_CONFIG.webUrl}/uniprotkb/${accession}/entry#interaction`,
        structure: `${UNIPROT_CONFIG.webUrl}/uniprotkb/${accession}/entry#structure`,
        publications: `${UNIPROT_CONFIG.webUrl}/uniprotkb/${accession}/entry#references`
    };
    
    // Add external database links
    if (protein.uniProtKBCrossReferences) {
        protein.uniProtKBCrossReferences.forEach(xref => {
            if (xref.database === 'PDB' && xref.id) {
                links.pdb = `https://www.rcsb.org/structure/${xref.id}`;
            } else if (xref.database === 'STRING' && xref.id) {
                links.string = `https://string-db.org/network/${xref.id}`;
            } else if (xref.database === 'Reactome' && xref.id) {
                links.reactome = `https://reactome.org/content/detail/${xref.id}`;
            }
        });
    }
    
    return links;
}

/**
 * Create detailed description from protein data
 */
function createProteinDescription(protein) {
    const components = [];
    
    const geneNames = extractGeneNames(protein);
    if (geneNames.length > 0) {
        components.push(`Gene: ${geneNames.slice(0, 2).join(', ')}`);
    }
    
    if (protein.organism?.scientificName) {
        components.push(`Organism: ${protein.organism.scientificName}`);
    }
    
    const locations = extractSubcellularLocation(protein);
    if (locations.length > 0) {
        components.push(`Location: ${locations.slice(0, 2).join(', ')}`);
    }
    
    const domains = extractDomains(protein);
    if (domains.length > 0) {
        components.push(`Domains: ${domains.slice(0, 2).join(', ')}`);
    }
    
    if (protein.sequence?.length) {
        components.push(`Length: ${protein.sequence.length} AA`);
    }
    
    return components.length > 0 ? components.join(' | ') : 'UniProt protein entry';
}

/**
 * Format protein status based on evidence and review
 */
function formatProteinStatus(protein) {
    const entryType = protein.entryType || 'Unknown';
    const reviewed = protein.entryType === 'UniProtKB reviewed (Swiss-Prot)';
    
    if (reviewed) {
        return 'Reviewed (Swiss-Prot)';
    } else if (entryType.includes('TrEMBL')) {
        return 'Unreviewed (TrEMBL)';
    }
    
    return 'Unknown Status';
}

/**
 * Search UniProt proteins
 */
async function searchUniProtProteins(query, limit = 50) {
    try {
        // Construct search query for UniProt
        const searchParams = {
            query: query,
            size: Math.min(limit, UNIPROT_CONFIG.maxResults),
            format: 'json'
        };
        
        const data = await executeUniProtRequest('uniprotkb/search', searchParams);
        
        return data.results || [];
        
    } catch (error) {
        console.error('UniProt search error:', error);
        
        // Try a simpler search as fallback
        try {
            const fallbackParams = {
                query: `gene:${query} OR protein_name:${query}`,
                size: Math.min(limit, 50),
                format: 'json'
            };
            
            const fallbackData = await executeUniProtRequest('uniprotkb/search', fallbackParams);
            return fallbackData.results || [];
            
        } catch (fallbackError) {
            console.error('UniProt fallback search failed:', fallbackError);
            return [];
        }
    }
}

/**
 * Format protein data for consistent output
 */
function formatProteinData(proteins) {
    return proteins.map((protein, index) => {
        const links = generateUniProtLinks(protein);
        const description = createProteinDescription(protein);
        const geneNames = extractGeneNames(protein);
        const proteinFunction = extractFunction(protein);
        const pathways = extractPathways(protein);
        const diseases = extractDiseases(protein);
        const goTerms = extractGOTerms(protein);
        const status = formatProteinStatus(protein);
        
        const proteinName = protein.proteinDescription?.recommendedName?.fullName?.value || 
                           protein.proteinDescription?.submissionNames?.[0]?.fullName?.value ||
                           'Unknown protein';
        
        return {
            id: `UP-${protein.primaryAccession}`,
            database: 'UniProt',
            title: `${proteinName} (${geneNames[0] || protein.primaryAccession})`,
            type: `Protein - ${protein.organism?.scientificName || 'Unknown organism'}`,
            status_significance: status,
            details: description,
            phase: 'N/A',
            status: status,
            sponsor: 'N/A',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: links.primary,
            
            // UniProt-specific fields
            accession: protein.primaryAccession,
            entry_name: protein.uniProtkbId,
            protein_name: proteinName,
            gene_names: geneNames,
            organism: protein.organism?.scientificName,
            sequence_length: protein.sequence?.length,
            molecular_weight: protein.sequence?.molWeight,
            
            // Functional information
            function: proteinFunction,
            pathways: pathways,
            diseases: diseases,
            subcellular_location: extractSubcellularLocation(protein),
            domains: extractDomains(protein),
            go_terms: goTerms,
            
            // Additional links
            function_link: links.function,
            pathways_link: links.pathways,
            interactions_link: links.interactions,
            structure_link: links.structure,
            pdb_link: links.pdb,
            string_link: links.string,
            reactome_link: links.reactome,
            
            raw_data: protein
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

    const { query, limit = 50, organism = null } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        console.log(`UniProt search for: "${query}"`);
        
        const searchLimit = Math.min(parseInt(limit) || 50, UNIPROT_CONFIG.maxResults);
        
        // Modify query if organism filter is specified
        let searchQuery = query;
        if (organism) {
            searchQuery = `${query} AND organism_name:${organism}`;
        }
        
        // Search UniProt proteins
        const proteins = await searchUniProtProteins(searchQuery, searchLimit);
        
        if (proteins.length === 0) {
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                search_timestamp: new Date().toISOString(),
                message: 'No proteins found for the given query'
            });
        }
        
        // Format protein data
        const results = formatProteinData(proteins);
        
        // Sort by relevance (reviewed entries first, then by organism)
        results.sort((a, b) => {
            // Swiss-Prot (reviewed) entries first
            if (a.status.includes('Reviewed') && !b.status.includes('Reviewed')) return -1;
            if (!a.status.includes('Reviewed') && b.status.includes('Reviewed')) return 1;
            
            // Human proteins first, then model organisms
            const humanA = a.organism?.includes('Homo sapiens') ? 1 : 0;
            const humanB = b.organism?.includes('Homo sapiens') ? 1 : 0;
            if (humanA !== humanB) return humanB - humanA;
            
            // Then by sequence length (longer proteins often more studied)
            return (b.sequence_length || 0) - (a.sequence_length || 0);
        });
        
        console.log(`UniProt returned ${results.length} results`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            organism_filter: organism,
            search_timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('UniProt API error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message,
            results: [],
            total: 0,
            query: query
        });
    }
}
