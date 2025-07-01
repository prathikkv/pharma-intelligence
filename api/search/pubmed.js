// api/search/pubmed.js - Enhanced PubMed implementation with E-utilities API
// Replace your current api/search/pubmed.js file with this enhanced version

/**
 * Enhanced PubMed API handler using NCBI E-utilities
 * Returns actionable scientific literature with abstracts, citations, and links
 */

const PUBMED_CONFIG = {
    baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
    webUrl: 'https://pubmed.ncbi.nlm.nih.gov',
    pmcUrl: 'https://www.ncbi.nlm.nih.gov/pmc',
    maxRetries: 3,
    timeout: 30000,
    rateLimit: 3, // NCBI rate limit: 3 requests per second
    maxResults: 200,
    email: 'pharma.intelligence@example.com' // Required by NCBI
};

/**
 * Rate limiter for NCBI API compliance
 */
class RateLimiter {
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

const rateLimiter = new RateLimiter(PUBMED_CONFIG.rateLimit);

/**
 * Execute PubMed E-utilities request with rate limiting and error handling
 */
async function executePubMedRequest(endpoint, params = {}, retries = 3) {
    // Rate limiting
    await rateLimiter.checkLimit();
    
    const url = new URL(`${PUBMED_CONFIG.baseUrl}/${endpoint}`);
    
    // Add required parameters
    params.email = PUBMED_CONFIG.email;
    params.tool = 'PharmaIntelligence';
    
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
                    'Accept': 'application/xml,application/json,text/xml',
                    'User-Agent': 'PharmaIntelligence/1.0'
                },
                signal: AbortSignal.timeout(PUBMED_CONFIG.timeout)
            });

            if (!response.ok) {
                throw new Error(`PubMed API error: ${response.status} ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }

        } catch (error) {
            console.error(`PubMed API attempt ${attempt} failed:`, error);
            
            if (attempt === retries) {
                throw new Error(`PubMed API failed after ${retries} attempts: ${error.message}`);
            }
            
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
}

/**
 * Parse XML response from PubMed
 */
function parseXMLResponse(xmlText) {
    try {
        // Simple XML parsing for PubMed responses
        // In a production environment, you might want to use a proper XML parser
        const articles = [];
        
        // Extract PubmedArticle elements
        const pubmedArticleRegex = /<PubmedArticle>(.*?)<\/PubmedArticle>/gs;
        let match;
        
        while ((match = pubmedArticleRegex.exec(xmlText)) !== null) {
            const articleXML = match[1];
            
            try {
                const article = parseArticleXML(articleXML);
                if (article) {
                    articles.push(article);
                }
            } catch (parseError) {
                console.warn('Error parsing individual article:', parseError);
                continue;
            }
        }
        
        return articles;
    } catch (error) {
        console.error('Error parsing PubMed XML:', error);
        return [];
    }
}

/**
 * Parse individual article XML
 */
function parseArticleXML(articleXML) {
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
    
    // Extract PMID
    const pmid = extractText(articleXML, 'PMID');
    if (!pmid) return null;
    
    // Extract basic article info
    const title = extractText(articleXML, 'ArticleTitle');
    const abstractText = extractText(articleXML, 'AbstractText');
    
    // Extract journal info
    const journalTitle = extractText(articleXML, 'Title'); // Journal title
    const journalISOAbbreviation = extractText(articleXML, 'ISOAbbreviation');
    
    // Extract publication date
    const pubYear = extractText(articleXML, 'Year') || new Date().getFullYear();
    const pubMonth = extractText(articleXML, 'Month') || '1';
    const pubDay = extractText(articleXML, 'Day') || '1';
    
    // Extract authors
    const authorsMatch = articleXML.match(/<AuthorList[^>]*>(.*?)<\/AuthorList>/s);
    const authors = [];
    if (authorsMatch) {
        const authorRegex = /<Author[^>]*>(.*?)<\/Author>/gs;
        let authorMatch;
        while ((authorMatch = authorRegex.exec(authorsMatch[1])) !== null) {
            const lastName = extractText(authorMatch[1], 'LastName');
            const foreName = extractText(authorMatch[1], 'ForeName');
            if (lastName) {
                authors.push(`${lastName}${foreName ? ', ' + foreName : ''}`);
            }
        }
    }
    
    // Extract DOI
    const doi = extractAttribute(articleXML, 'ArticleId', 'IdType="doi"') || 
               extractText(articleXML, 'ArticleId');
    
    // Extract PMC ID
    const pmcMatch = articleXML.match(/IdType="pmc">PMC(\d+)</);
    const pmcId = pmcMatch ? pmcMatch[1] : null;
    
    return {
        pmid,
        title: title || 'No title available',
        abstract: abstractText || 'No abstract available',
        journal: journalISOAbbreviation || journalTitle || 'Unknown journal',
        authors: authors.slice(0, 5), // Limit to first 5 authors
        publication_date: `${pubYear}-${pubMonth.padStart(2, '0')}-${pubDay.padStart(2, '0')}`,
        publication_year: parseInt(pubYear),
        doi: doi,
        pmc_id: pmcId
    };
}

/**
 * Search PubMed articles
 */
async function searchPubMedArticles(query, limit = 50) {
    try {
        // Step 1: Search for article IDs
        const searchParams = {
            db: 'pubmed',
            term: query,
            retmax: Math.min(limit, PUBMED_CONFIG.maxResults),
            retmode: 'json',
            sort: 'relevance'
        };
        
        const searchResponse = await executePubMedRequest('esearch.fcgi', searchParams);
        
        let pmids = [];
        if (typeof searchResponse === 'string') {
            try {
                const searchData = JSON.parse(searchResponse);
                pmids = searchData.esearchresult?.idlist || [];
            } catch (parseError) {
                console.error('Error parsing search response:', parseError);
                return [];
            }
        } else {
            pmids = searchResponse.esearchresult?.idlist || [];
        }
        
        if (pmids.length === 0) {
            return [];
        }
        
        // Step 2: Fetch detailed article information
        const fetchParams = {
            db: 'pubmed',
            id: pmids.join(','),
            retmode: 'xml',
            rettype: 'abstract'
        };
        
        const detailsResponse = await executePubMedRequest('efetch.fcgi', fetchParams);
        
        if (typeof detailsResponse === 'string') {
            return parseXMLResponse(detailsResponse);
        }
        
        return [];
        
    } catch (error) {
        console.error('PubMed search error:', error);
        return [];
    }
}

/**
 * Generate PubMed links
 */
function generatePubMedLinks(article) {
    const pmid = article.pmid;
    
    const links = {
        primary: `${PUBMED_CONFIG.webUrl}/${pmid}/`,
        pubmed: `${PUBMED_CONFIG.webUrl}/${pmid}/`,
        abstract: `${PUBMED_CONFIG.webUrl}/${pmid}/`,
        citations: `${PUBMED_CONFIG.webUrl}/${pmid}/#citedby`,
        similar: `${PUBMED_CONFIG.webUrl}/${pmid}/#similar-articles`
    };
    
    // Add PMC link if available
    if (article.pmc_id) {
        links.pmc = `${PUBMED_CONFIG.pmcUrl}/articles/PMC${article.pmc_id}/`;
        links.fulltext = links.pmc;
    }
    
    // Add DOI link if available
    if (article.doi) {
        links.doi = `https://doi.org/${article.doi}`;
        if (!links.fulltext) {
            links.fulltext = links.doi;
        }
    }
    
    return links;
}

/**
 * Create detailed description from article data
 */
function createArticleDescription(article) {
    const components = [];
    
    if (article.journal) {
        components.push(`Journal: ${article.journal}`);
    }
    
    if (article.authors && article.authors.length > 0) {
        const authorText = article.authors.length > 3 
            ? `${article.authors.slice(0, 3).join(', ')} et al.`
            : article.authors.join(', ');
        components.push(`Authors: ${authorText}`);
    }
    
    if (article.publication_year) {
        components.push(`Year: ${article.publication_year}`);
    }
    
    if (article.doi) {
        components.push(`DOI: ${article.doi}`);
    }
    
    return components.length > 0 ? components.join(' | ') : 'PubMed research article';
}

/**
 * Truncate abstract for display
 */
function truncateAbstract(abstract, maxLength = 300) {
    if (!abstract || abstract.length <= maxLength) {
        return abstract;
    }
    
    const truncated = abstract.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

/**
 * Format article data for consistent output
 */
function formatArticleData(articles) {
    return articles.map((article, index) => {
        const links = generatePubMedLinks(article);
        const description = createArticleDescription(article);
        const truncatedAbstract = truncateAbstract(article.abstract);
        
        return {
            id: `PMID-${article.pmid}`,
            database: 'PubMed',
            title: article.title,
            type: `Research Article - ${article.journal}`,
            status_significance: `Published ${article.publication_year}`,
            details: description,
            phase: 'N/A',
            status: 'Published',
            sponsor: 'N/A',
            year: article.publication_year,
            enrollment: 'N/A',
            link: links.primary,
            
            // PubMed-specific fields
            pmid: article.pmid,
            abstract: article.abstract,
            truncated_abstract: truncatedAbstract,
            journal: article.journal,
            authors: article.authors,
            publication_date: article.publication_date,
            doi: article.doi,
            pmc_id: article.pmc_id,
            
            // Additional links
            pmc_link: links.pmc,
            doi_link: links.doi,
            fulltext_link: links.fulltext,
            citations_link: links.citations,
            similar_link: links.similar,
            
            raw_data: article
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

    const { query, limit = 50, sort = 'relevance' } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        console.log(`PubMed search for: "${query}"`);
        
        const searchLimit = Math.min(parseInt(limit) || 50, PUBMED_CONFIG.maxResults);
        
        // Search PubMed articles
        const articles = await searchPubMedArticles(query, searchLimit);
        
        if (articles.length === 0) {
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                search_timestamp: new Date().toISOString(),
                message: 'No articles found for the given query'
            });
        }
        
        // Format article data
        const results = formatArticleData(articles);
        
        // Sort results based on sort parameter
        if (sort === 'date') {
            results.sort((a, b) => b.year - a.year);
        } else if (sort === 'relevance') {
            // Results are already sorted by relevance from PubMed
        }
        
        console.log(`PubMed returned ${results.length} results`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            sort: sort,
            search_timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('PubMed API error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message,
            results: [],
            total: 0,
            query: query
        });
    }
}
