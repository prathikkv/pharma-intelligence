// api/search/clinvar.js - Enhanced ClinVar implementation with clinical significance and variant data
// Replace your current api/search/clinvar.js file with this enhanced version

/**
 * Enhanced ClinVar API handler for clinical variant significance and interpretation
 * Returns actionable variant data with pathogenicity, clinical significance, and disease associations
 */

const CLINVAR_CONFIG = {
    baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
    webUrl: 'https://www.ncbi.nlm.nih.gov/clinvar',
    varWebUrl: 'https://www.ncbi.nlm.nih.gov/clinvar/variation',
    maxRetries: 3,
    timeout: 30000,
    rateLimit: 3, // NCBI rate limit: 3 requests per second
    maxResults: 200
};

/**
 * Rate limiter for NCBI API compliance
 */
class ClinVarRateLimiter {
    constructor(requestsPerSecond) {
        this.requests = [];
        this.limit = requestsPerSecond;
    }
    
    async checkLimit() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < 1000);
        
        if (this.requests.length >= this.limit) {
            const waitTime = 1000 - (now - this.requests[0]);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.checkLimit();
        }
        
        this.requests.push(now);
        return true;
    }
}

const rateLimiter = new ClinVarRateLimiter(CLINVAR_CONFIG.rateLimit);

/**
 * Execute ClinVar E-utilities request with rate limiting and error handling
 */
async function executeClinVarRequest(endpoint, params = {}, retries = 3) {
    // Rate limiting
    await rateLimiter.checkLimit();
    
    const url = new URL(`${CLINVAR_CONFIG.baseUrl}/${endpoint}`);
    
    // Add required parameters
    params.email = 'pharma.intelligence@example.com';
    params.tool = 'PharmaIntelligence';
    params.db = 'clinvar';
    
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
                    'Accept': 'application/xml,text/xml',
                    'User-Agent': 'PharmaIntelligence/1.0'
                },
                signal: AbortSignal.timeout(CLINVAR_CONFIG.timeout)
            });

            if (!response.ok) {
                throw new Error(`ClinVar API error: ${response.status} ${response.statusText}`);
            }

            return await response.text();

        } catch (error) {
            console.error(`ClinVar API attempt ${attempt} failed:`, error);
            
            if (attempt === retries) {
                throw new Error(`ClinVar API failed after ${retries} attempts: ${error.message}`);
            }
            
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
}

/**
 * Parse ClinVar XML response
 */
function parseClinVarXML(xmlText) {
    try {
        const variants = [];
        
        // Extract DocumentSummary elements (from esummary)
        const docSummaryRegex = /<DocumentSummary[^>]*uid="([^"]*)"[^>]*>(.*?)<\/DocumentSummary>/gs;
        let match;
        
        while ((match = docSummaryRegex.exec(xmlText)) !== null) {
            const uid = match[1];
            const summaryXML = match[2];
            
            try {
                const variant = parseVariantSummary(uid, summaryXML);
                if (variant) {
                    variants.push(variant);
                }
            } catch (parseError) {
                console.warn('Error parsing individual variant:', parseError);
                continue;
            }
        }
        
        return variants;
    } catch (error) {
        console.error('Error parsing ClinVar XML:', error);
        return [];
    }
}

/**
 * Parse individual variant summary XML
 */
function parseVariantSummary(uid, summaryXML) {
    const extractText = (xml, tag) => {
        const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 's');
        const match = regex.exec(xml);
        return match ? match[1].replace(/<[^>]*>/g, '').trim() : '';
    };
    
    const extractAttribute = (xml, tag, attribute) => {
        const regex = new RegExp(`<${tag}[^>]*${attribute}="([^"]*)"`, 'i');
        const match = regex.exec(xml);
        return match ? match[1] : '';
    };
    
    // Extract basic variant information
    const title = extractText(summaryXML, 'Title');
    const clinicalSignificance = extractText(summaryXML, 'ClinicalSignificance');
    const reviewStatus = extractText(summaryXML, 'ReviewStatus');
    const variationType = extractText(summaryXML, 'VariationType');
    const geneSymbol = extractText(summaryXML, 'GeneSymbol');
    const chromosome = extractText(summaryXML, 'Chr');
    const start = extractText(summaryXML, 'Start');
    const stop = extractText(summaryXML, 'Stop');
    const assembly = extractText(summaryXML, 'Assembly');
    const cytogenetic = extractText(summaryXML, 'Cytogenetic');
    const molecularConsequence = extractText(summaryXML, 'MolecularConsequence');
    const origin = extractText(summaryXML, 'Origin');
    const conditions = extractText(summaryXML, 'Condition');
    
    // Extract accession (RCV)
    const rcvAccession = extractText(summaryXML, 'RCVAccession');
    
    // Extract variant ID
    const variationId = extractText(summaryXML, 'VariationID');
    
    if (!title && !variationId) return null;
    
    return {
        uid: uid,
        variation_id: variationId,
        rcv_accession: rcvAccession,
        title: title || `Variant ${variationId}`,
        clinical_significance: clinicalSignificance || 'Unknown',
        review_status: reviewStatus || 'Unknown',
        variant_type: variationType || 'Unknown',
        gene_symbol: geneSymbol || 'Unknown',
        chromosome: chromosome,
        start_position: start,
        stop_position: stop,
        assembly: assembly || 'Unknown',
        cytogenetic: cytogenetic,
        molecular_consequence: molecularConsequence,
        origin: origin || 'Unknown',
        conditions: conditions || 'Unknown condition'
    };
}

/**
 * Search ClinVar variants
 */
async function searchClinVarVariants(query, limit = 50) {
    try {
        // Step 1: Search for variant IDs
        const searchParams = {
            term: query,
            retmax: Math.min(limit, CLINVAR_CONFIG.maxResults),
            retmode: 'json',
            sort: 'relevance'
        };
        
        const searchResponse = await executeClinVarRequest('esearch.fcgi', searchParams);
        
        let variantIds = [];
        try {
            const searchData = JSON.parse(searchResponse);
            variantIds = searchData.esearchresult?.idlist || [];
        } catch (parseError) {
            console.error('Error parsing ClinVar search response:', parseError);
            return [];
        }
        
        if (variantIds.length === 0) {
            return [];
        }
        
        // Step 2: Fetch detailed variant summaries
        const summaryParams = {
            id: variantIds.join(','),
            retmode: 'xml',
            rettype: 'summary'
        };
        
        const summaryResponse = await executeClinVarRequest('esummary.fcgi', summaryParams);
        
        return parseClinVarXML(summaryResponse);
        
    } catch (error) {
        console.error('ClinVar search error:', error);
        return [];
    }
}

/**
 * Format clinical significance for display
 */
function formatClinicalSignificance(significance) {
    if (!significance) return 'Unknown';
    
    const significanceMap = {
        'Pathogenic': 'Pathogenic',
        'Likely pathogenic': 'Likely Pathogenic',
        'Uncertain significance': 'VUS (Uncertain)',
        'Likely benign': 'Likely Benign',
        'Benign': 'Benign',
        'Conflicting interpretations of pathogenicity': 'Conflicting',
        'not provided': 'Not Provided',
        'other': 'Other'
    };
    
    return significanceMap[significance] || significance;
}

/**
 * Get clinical significance color/priority
 */
function getClinicalSignificancePriority(significance) {
    const priorities = {
        'Pathogenic': 5,
        'Likely pathogenic': 4,
        'Conflicting interpretations of pathogenicity': 3,
        'Uncertain significance': 2,
        'Likely benign': 1,
        'Benign': 0
    };
    
    return priorities[significance] || -1;
}

/**
 * Format variant type for display
 */
function formatVariantType(variantType) {
    const typeMap = {
        'single nucleotide variant': 'SNV',
        'deletion': 'Deletion',
        'insertion': 'Insertion',
        'duplication': 'Duplication',
        'indel': 'InDel',
        'copy number gain': 'CNV (Gain)',
        'copy number loss': 'CNV (Loss)',
        'inversion': 'Inversion',
        'complex': 'Complex'
    };
    
    return typeMap[variantType] || variantType || 'Unknown';
}

/**
 * Generate ClinVar links
 */
function generateClinVarLinks(variant) {
    const variationId = variant.variation_id;
    const rcvAccession = variant.rcv_accession;
    
    const links = {
        primary: variationId ? `${CLINVAR_CONFIG.varWebUrl}/${variationId}/` : `${CLINVAR_CONFIG.webUrl}/`,
        clinvar: variationId ? `${CLINVAR_CONFIG.varWebUrl}/${variationId}/` : null,
        rcv: rcvAccession ? `${CLINVAR_CONFIG.webUrl}/${rcvAccession}/` : null,
        gene: variant.gene_symbol ? `${CLINVAR_CONFIG.webUrl}/?term=${variant.gene_symbol}[gene]` : null,
        condition: `${CLINVAR_CONFIG.webUrl}/?term=${encodeURIComponent(variant.conditions)}`
    };
    
    return links;
}

/**
 * Create detailed description from variant data
 */
function createVariantDescription(variant) {
    const components = [];
    
    if (variant.gene_symbol && variant.gene_symbol !== 'Unknown') {
        components.push(`Gene: ${variant.gene_symbol}`);
    }
    
    if (variant.molecular_consequence) {
        components.push(`Effect: ${variant.molecular_consequence}`);
    }
    
    if (variant.chromosome && variant.start_position) {
        components.push(`Location: chr${variant.chromosome}:${variant.start_position}`);
    }
    
    if (variant.origin && variant.origin !== 'Unknown') {
        components.push(`Origin: ${variant.origin}`);
    }
    
    if (variant.review_status && variant.review_status !== 'Unknown') {
        components.push(`Review: ${variant.review_status}`);
    }
    
    return components.length > 0 ? components.join(' | ') : 'ClinVar genetic variant';
}

/**
 * Format variant data for consistent output
 */
function formatVariantData(variants) {
    return variants.map((variant, index) => {
        const links = generateClinVarLinks(variant);
        const description = createVariantDescription(variant);
        const formattedSignificance = formatClinicalSignificance(variant.clinical_significance);
        const formattedType = formatVariantType(variant.variant_type);
        
        const typeString = `${formattedType} - ${formattedSignificance}`;
        
        return {
            id: `CV-${variant.variation_id || variant.uid}`,
            database: 'ClinVar',
            title: variant.title,
            type: typeString,
            status_significance: formattedSignificance,
            details: description,
            phase: 'N/A',
            status: formattedSignificance,
            sponsor: 'N/A',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: links.primary,
            
            // ClinVar-specific fields
            variation_id: variant.variation_id,
            rcv_accession: variant.rcv_accession,
            clinical_significance: variant.clinical_significance,
            review_status: variant.review_status,
            variant_type: variant.variant_type,
            gene_symbol: variant.gene_symbol,
            chromosome: variant.chromosome,
            start_position: variant.start_position,
            stop_position: variant.stop_position,
            assembly: variant.assembly,
            cytogenetic: variant.cytogenetic,
            molecular_consequence: variant.molecular_consequence,
            origin: variant.origin,
            conditions: variant.conditions,
            
            // Clinical significance priority for sorting
            significance_priority: getClinicalSignificancePriority(variant.clinical_significance),
            
            // Additional links
            rcv_link: links.rcv,
            gene_link: links.gene,
            condition_link: links.condition,
            
            raw_data: variant
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

    const { query, limit = 50, significance = null } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        console.log(`ClinVar search for: "${query}"`);
        
        const searchLimit = Math.min(parseInt(limit) || 50, CLINVAR_CONFIG.maxResults);
        
        // Modify query if significance filter is specified
        let searchQuery = query;
        if (significance) {
            searchQuery = `${query} AND ${significance}[clin_sig]`;
        }
        
        // Search ClinVar variants
        const variants = await searchClinVarVariants(searchQuery, searchLimit);
        
        if (variants.length === 0) {
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                search_timestamp: new Date().toISOString(),
                message: 'No variants found for the given query'
            });
        }
        
        // Format variant data
        const results = formatVariantData(variants);
        
        // Sort by clinical significance (pathogenic first)
        results.sort((a, b) => {
            // Primary sort by clinical significance priority
            if (a.significance_priority !== b.significance_priority) {
                return b.significance_priority - a.significance_priority;
            }
            
            // Secondary sort by gene symbol
            const geneA = a.gene_symbol || 'ZZZ';
            const geneB = b.gene_symbol || 'ZZZ';
            return geneA.localeCompare(geneB);
        });
        
        console.log(`ClinVar returned ${results.length} results`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            significance_filter: significance,
            search_timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('ClinVar API error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message,
            results: [],
            total: 0,
            query: query
        });
    }
}
