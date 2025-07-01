// api/search/index.js - Main search endpoint
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

    const { query, databases } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        // Database configurations
        const databaseConfigs = {
            clinicaltrials: {
                name: 'ClinicalTrials.gov',
                endpoint: 'https://clinicaltrials.gov/api/v2/studies',
                searchLogic: async (searchQuery) => {
                    const response = await fetch(
                        `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(searchQuery)}&format=json&countTotal=true&pageSize=1000`
                    );
                    const data = await response.json();
                    return {
                        results: data.studies?.map(study => ({
                            id: study.protocolSection?.identificationModule?.nctId,
                            title: study.protocolSection?.identificationModule?.briefTitle,
                            status: study.protocolSection?.statusModule?.overallStatus,
                            phase: study.protocolSection?.designModule?.phases?.[0],
                            sponsor: study.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name,
                            start_date: study.protocolSection?.statusModule?.startDateStruct?.date,
                            brief_summary: study.protocolSection?.descriptionModule?.briefSummary,
                            conditions: study.protocolSection?.conditionsModule?.conditions,
                            interventions: study.protocolSection?.armsInterventionsModule?.interventions,
                            enrollment: study.protocolSection?.designModule?.enrollmentInfo?.count,
                            study_type: study.protocolSection?.designModule?.studyType,
                            url: `https://clinicaltrials.gov/study/${study.protocolSection?.identificationModule?.nctId}`
                        })) || [],
                        total: data.totalCount || 0
                    };
                }
            },

            opentargets: {
                name: 'Open Targets',
                endpoint: 'https://api.platform.opentargets.org/api/v4/graphql',
                searchLogic: async (searchQuery) => {
                    const graphqlQuery = `
                        query Search($queryString: String!) {
                            search(queryString: $queryString, entityNames: ["target", "disease"]) {
                                hits {
                                    id
                                    name
                                    description
                                    category
                                    entity
                                    ... on Target {
                                        approvedSymbol
                                        biotype
                                        proteinAnnotations {
                                            id
                                            accessions
                                        }
                                    }
                                    ... on Disease {
                                        id
                                        name
                                        therapeuticAreas {
                                            id
                                            name
                                        }
                                    }
                                }
                                total
                            }
                        }
                    `;
                    
                    const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: graphqlQuery,
                            variables: { queryString: searchQuery }
                        })
                    });
                    
                    const data = await response.json();
                    return {
                        results: data.data?.search?.hits?.map(hit => ({
                            id: hit.id,
                            title: hit.name,
                            description: hit.description,
                            category: hit.category,
                            entity: hit.entity,
                            symbol: hit.approvedSymbol,
                            biotype: hit.biotype,
                            therapeutic_areas: hit.therapeuticAreas?.map(area => area.name).join(', '),
                            url: `https://platform.opentargets.org/${hit.entity}/${hit.id}`
                        })) || [],
                        total: data.data?.search?.total || 0
                    };
                }
            },

            pubmed: {
                name: 'PubMed',
                endpoint: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/',
                searchLogic: async (searchQuery) => {
                    // First, search for PMIDs
                    const searchResponse = await fetch(
                        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchQuery)}&retmax=100&retmode=json`
                    );
                    const searchData = await searchResponse.json();
                    
                    if (!searchData.esearchresult?.idlist?.length) {
                        return { results: [], total: 0 };
                    }

                    // Get detailed information for the first 20 results
                    const pmids = searchData.esearchresult.idlist.slice(0, 20);
                    const summaryResponse = await fetch(
                        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`
                    );
                    const summaryData = await summaryResponse.json();

                    return {
                        results: pmids.map(pmid => {
                            const article = summaryData.result?.[pmid];
                            return {
                                id: pmid,
                                title: article?.title || 'Title not available',
                                authors: article?.authors?.map(author => author.name).join(', ') || 'Authors not available',
                                journal: article?.fulljournalname || article?.source || 'Journal not available',
                                publication_date: article?.pubdate || 'Date not available',
                                doi: article?.elocationid || '',
                                abstract: article?.abstract || 'Abstract not available',
                                url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
                            };
                        }),
                        total: parseInt(searchData.esearchresult.count) || 0
                    };
                }
            },

            drugbank: {
                name: 'DrugBank',
                endpoint: 'https://go.drugbank.com/api/v1/',
                searchLogic: async (searchQuery) => {
                    // Note: DrugBank requires API key for full access
                    // This is a simplified implementation
                    try {
                        // Mock data for demonstration - replace with actual API call
                        return {
                            results: [
                                {
                                    id: 'DB00001',
                                    title: `Drug entry related to: ${searchQuery}`,
                                    status: 'Approved',
                                    type: 'Small Molecule',
                                    indication: 'Treatment indication',
                                    mechanism: 'Mechanism of action',
                                    url: 'https://go.drugbank.com/drugs/DB00001'
                                }
                            ],
                            total: 1
                        };
                    } catch (error) {
                        console.error('DrugBank API error:', error);
                        return { results: [], total: 0, error: 'DrugBank API unavailable' };
                    }
                }
            },

            chembl: {
                name: 'ChEMBL',
                endpoint: 'https://www.ebi.ac.uk/chembl/api/data/',
                searchLogic: async (searchQuery) => {
                    try {
                        const response = await fetch(
                            `https://www.ebi.ac.uk/chembl/api/data/molecule/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=100`
                        );
                        const data = await response.json();

                        return {
                            results: data.molecules?.map(molecule => ({
                                id: molecule.molecule_chembl_id,
                                title: molecule.pref_name || molecule.molecule_chembl_id,
                                molecular_formula: molecule.molecule_properties?.molecular_formula,
                                molecular_weight: molecule.molecule_properties?.molecular_weight,
                                alogp: molecule.molecule_properties?.alogp,
                                compound_type: molecule.molecule_type,
                                max_phase: molecule.max_phase,
                                url: `https://www.ebi.ac.uk/chembl/compound_report_card/${molecule.molecule_chembl_id}/`
                            })) || [],
                            total: data.page_meta?.total_count || 0
                        };
                    } catch (error) {
                        console.error('ChEMBL API error:', error);
                        return { results: [], total: 0, error: 'ChEMBL API unavailable' };
                    }
                }
            },

            clinvar: {
                name: 'ClinVar',
                endpoint: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/',
                searchLogic: async (searchQuery) => {
                    try {
                        const searchResponse = await fetch(
                            `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${encodeURIComponent(searchQuery)}&retmax=50&retmode=json`
                        );
                        const searchData = await searchResponse.json();

                        if (!searchData.esearchresult?.idlist?.length) {
                            return { results: [], total: 0 };
                        }

                        const ids = searchData.esearchresult.idlist.slice(0, 20);
                        const summaryResponse = await fetch(
                            `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=${ids.join(',')}&retmode=json`
                        );
                        const summaryData = await summaryResponse.json();

                        return {
                            results: ids.map(id => {
                                const variant = summaryData.result?.[id];
                                return {
                                    id: id,
                                    title: variant?.title || `ClinVar Variant ${id}`,
                                    clinical_significance: variant?.clinical_significance || 'Unknown',
                                    gene_symbol: variant?.gene_symbol || 'Unknown',
                                    condition: variant?.condition || 'Unknown',
                                    variant_type: variant?.variant_type || 'Unknown',
                                    url: `https://www.ncbi.nlm.nih.gov/clinvar/variation/${id}/`
                                };
                            }),
                            total: parseInt(searchData.esearchresult.count) || 0
                        };
                    } catch (error) {
                        console.error('ClinVar API error:', error);
                        return { results: [], total: 0, error: 'ClinVar API unavailable' };
                    }
                }
            }
        };

        // Default to all databases if none specified
        const selectedDatabases = databases ? databases.split(',') : Object.keys(databaseConfigs);
        
        // Execute searches in parallel with error handling
        const searchPromises = selectedDatabases.map(async (dbId) => {
            const config = databaseConfigs[dbId];
            if (!config) {
                return {
                    database: dbId,
                    error: `Unknown database: ${dbId}`,
                    results: [],
                    total: 0
                };
            }

            try {
                const startTime = Date.now();
                const searchResult = await config.searchLogic(query);
                const endTime = Date.now();

                return {
                    database: dbId,
                    databaseName: config.name,
                    results: searchResult.results || [],
                    total: searchResult.total || 0,
                    searchTime: endTime - startTime,
                    error: searchResult.error || null
                };
            } catch (error) {
                console.error(`Error searching ${config.name}:`, error);
                return {
                    database: dbId,
                    databaseName: config.name,
                    results: [],
                    total: 0,
                    error: error.message,
                    searchTime: 0
                };
            }
        });

        const searchResults = await Promise.all(searchPromises);
        
        // Combine results
        const combinedResults = searchResults.reduce((acc, result) => {
            if (result.results && result.results.length > 0) {
                const enhancedResults = result.results.map(item => ({
                    ...item,
                    _database: result.database,
                    _databaseName: result.databaseName,
                    _searchTime: result.searchTime
                }));
                acc.push(...enhancedResults);
            }
            return acc;
        }, []);

        // Calculate statistics
        const totalResults = combinedResults.length;
        const totalSearchTime = Math.max(...searchResults.map(r => r.searchTime));
        const databaseStats = searchResults.map(r => ({
            database: r.databaseName,
            count: r.results.length,
            total: r.total,
            searchTime: r.searchTime,
            error: r.error
        }));

        res.status(200).json({
            results: combinedResults,
            total: totalResults,
            query: query,
            databases: selectedDatabases,
            statistics: {
                totalResults,
                totalSearchTime,
                databaseStats,
                successfulDatabases: searchResults.filter(r => !r.error).length,
                failedDatabases: searchResults.filter(r => r.error).length
            },
            search_timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Search execution error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            query: query
        });
    }
}

// api/search/clinicaltrials.js - Individual database endpoint
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

    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const response = await fetch(
            `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(query)}&format=json&countTotal=true&pageSize=1000`
        );
        
        if (!response.ok) {
            throw new Error(`ClinicalTrials.gov API error: ${response.status}`);
        }

        const data = await response.json();
        
        const results = data.studies?.map(study => ({
            id: study.protocolSection?.identificationModule?.nctId,
            nct_id: study.protocolSection?.identificationModule?.nctId,
            title: study.protocolSection?.identificationModule?.briefTitle,
            brief_title: study.protocolSection?.identificationModule?.briefTitle,
            official_title: study.protocolSection?.identificationModule?.officialTitle,
            status: study.protocolSection?.statusModule?.overallStatus,
            phase: study.protocolSection?.designModule?.phases?.[0],
            sponsor: study.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name,
            start_date: study.protocolSection?.statusModule?.startDateStruct?.date,
            completion_date: study.protocolSection?.statusModule?.completionDateStruct?.date,
            brief_summary: study.protocolSection?.descriptionModule?.briefSummary,
            detailed_description: study.protocolSection?.descriptionModule?.detailedDescription,
            conditions: study.protocolSection?.conditionsModule?.conditions,
            interventions: study.protocolSection?.armsInterventionsModule?.interventions?.map(int => int.name),
            enrollment: study.protocolSection?.designModule?.enrollmentInfo?.count,
            study_type: study.protocolSection?.designModule?.studyType,
            primary_purpose: study.protocolSection?.designModule?.designInfo?.primaryPurpose,
            masking: study.protocolSection?.designModule?.designInfo?.maskingInfo?.masking,
            allocation: study.protocolSection?.designModule?.designInfo?.allocation,
            url: `https://clinicaltrials.gov/study/${study.protocolSection?.identificationModule?.nctId}`,
            last_update_date: study.protocolSection?.statusModule?.lastUpdateSubmitDate
        })) || [];

        res.status(200).json({
            results: results,
            total: data.totalCount || 0,
            query: query,
            source: 'ClinicalTrials.gov',
            search_timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('ClinicalTrials.gov search error:', error);
        res.status(500).json({
            error: 'Failed to search ClinicalTrials.gov',
            message: error.message,
            query: query
        });
    }
}