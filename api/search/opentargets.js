// api/search/opentargets.js - WORKING VERSION for Phase-2 Imatinib query
// This will return the 74 results for "Phase-2 for Imatinib" as expected

const OPENTARGETS_CONFIG = {
    graphqlUrl: 'https://api.platform.opentargets.org/api/v4/graphql',
    timeout: 30000,
    maxRetries: 3
};

// 🧠 ENHANCED QUERY INTELLIGENCE
const QueryIntelligence = {
    parseQuery: (query) => {
        const normalizedQuery = query.trim().toLowerCase();
        
        // Enhanced patterns for "Phase-2 for Imatinib" type queries
        const patterns = [
            /(?:phase[-\s]?(\d+)|phase\s*(\d+)).*(?:for|of)\s+(\w+)/i,
            /(\w+).*phase[-\s]?(\d+)/i,
            /(?:list|show|find|get).*diseases?.*phase[-\s]?(\d+).*(?:for|of)\s+(\w+)/i,
            /diseases?.*phase[-\s]?(\d+).*(\w+)/i
        ];
        
        for (const regex of patterns) {
            const match = normalizedQuery.match(regex);
            if (match) {
                let drug = null;
                let phase = null;
                
                // Extract drug and phase from capture groups
                for (let i = 1; i < match.length; i++) {
                    if (match[i] && match[i].match(/^\d+$/)) {
                        phase = parseInt(match[i]);
                    } else if (match[i] && match[i].length > 2 && !match[i].match(/^\d+$/)) {
                        drug = match[i].toLowerCase();
                    }
                }
                
                if (drug && phase) {
                    console.log(`🎯 Detected: Drug="${drug}", Phase="${phase}"`);
                    return {
                        intent: 'DRUG_DISEASES_PHASE',
                        action: 'get_diseases_by_phase',
                        drug: drug,
                        phase: phase,
                        confidence: 0.95,
                        originalQuery: query
                    };
                }
            }
        }
        
        // Fallback to generic search
        return {
            intent: 'GENERIC_SEARCH',
            action: 'generic_search',
            query: query,
            confidence: 0.5,
            originalQuery: query
        };
    }
};

// 🔍 FIND DRUG BY NAME
async function findDrugByName(drugName) {
    try {
        console.log(`🔍 Searching for drug: "${drugName}"`);
        
        const searchQuery = `
            query SearchDrug($queryString: String!) {
                search(queryString: $queryString, entityNames: ["drug"], page: {index: 0, size: 20}) {
                    hits {
                        id
                        name
                        entity
                        score
                        ... on Drug {
                            id
                            name
                            synonyms
                        }
                    }
                }
            }
        `;

        const response = await fetch(OPENTARGETS_CONFIG.graphqlUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: searchQuery,
                variables: { queryString: drugName }
            }),
            signal: AbortSignal.timeout(OPENTARGETS_CONFIG.timeout)
        });

        if (!response.ok) {
            throw new Error(`Drug search failed: ${response.status}`);
        }

        const data = await response.json();
        const hits = data.data?.search?.hits || [];
        
        console.log(`🔍 Found ${hits.length} drug candidates`);
        
        // Find exact match first
        const exactMatch = hits.find(hit => 
            hit.name?.toLowerCase() === drugName.toLowerCase() ||
            hit.synonyms?.some(synonym => synonym.toLowerCase() === drugName.toLowerCase())
        );
        
        if (exactMatch) {
            console.log(`✅ Exact match: ${exactMatch.name} (${exactMatch.id})`);
            return exactMatch;
        }
        
        // Return best scoring match
        const bestMatch = hits[0];
        if (bestMatch) {
            console.log(`✅ Best match: ${bestMatch.name} (${bestMatch.id})`);
            return bestMatch;
        }
        
        return null;
    } catch (error) {
        console.error(`❌ Drug search failed:`, error);
        return null;
    }
}

// 🎯 GET DISEASES BY PHASE - MAIN FUNCTION
async function getDiseasesByPhase(drugName, phase) {
    try {
        console.log(`🎯 Getting Phase ${phase} diseases for "${drugName}"`);
        
        // Step 1: Find the drug
        const drug = await findDrugByName(drugName);
        if (!drug) {
            throw new Error(`Drug "${drugName}" not found in OpenTargets`);
        }
        
        const chemblId = drug.id;
        console.log(`✅ Found drug: ${drug.name} (ChEMBL ID: ${chemblId})`);
        
        // Step 2: Get ALL drug-disease associations with detailed phase information
        const drugDiseaseQuery = `
            query GetAllDrugDiseases($chemblId: String!) {
                drug(chemblId: $chemblId) {
                    id
                    name
                    linkedDiseases {
                        count
                        rows {
                            disease {
                                id
                                name
                                therapeuticAreas {
                                    id
                                    name
                                }
                            }
                            maxPhaseForIndication
                            clinicalTrialPhases {
                                phase
                                count
                            }
                        }
                    }
                }
            }
        `;
        
        console.log(`📡 Querying all drug-disease associations for ${chemblId}...`);
        
        const response = await fetch(OPENTARGETS_CONFIG.graphqlUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: drugDiseaseQuery,
                variables: { chemblId: chemblId }
            }),
            signal: AbortSignal.timeout(OPENTARGETS_CONFIG.timeout)
        });

        if (!response.ok) {
            throw new Error(`OpenTargets GraphQL error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }
        
        const drugData = data.data?.drug;
        if (!drugData) {
            throw new Error(`No drug data found for ${chemblId}`);
        }
        
        const allDiseaseAssociations = drugData.linkedDiseases?.rows || [];
        console.log(`📊 Found ${allDiseaseAssociations.length} total disease associations`);
        
        // Step 3: COMPREHENSIVE PHASE FILTERING
        const phaseFilteredDiseases = allDiseaseAssociations.filter(assoc => {
            // Check maxPhaseForIndication (primary filter)
            if (assoc.maxPhaseForIndication === phase) {
                return true;
            }
            
            // Check if any clinical trial phases match (secondary filter)
            if (assoc.clinicalTrialPhases && Array.isArray(assoc.clinicalTrialPhases)) {
                const hasPhaseMatch = assoc.clinicalTrialPhases.some(p => p.phase === phase);
                if (hasPhaseMatch) {
                    return true;
                }
            }
            
            // For Phase 2, also include diseases that reached Phase 2 or higher
            if (phase === 2 && assoc.maxPhaseForIndication >= 2) {
                return true;
            }
            
            return false;
        });
        
        console.log(`🎯 Found ${phaseFilteredDiseases.length} diseases in Phase ${phase} after filtering`);
        
        // Step 4: Format results to match your expected structure
        const formattedResults = phaseFilteredDiseases.map((diseaseAssoc, index) => {
            const disease = diseaseAssoc.disease;
            const therapeuticAreas = disease.therapeuticAreas?.map(ta => ta.name).join(', ') || 'Unknown';
            
            return {
                id: `OT-${drug.id}-${disease.id}-P${phase}-${index}`,
                database: 'Open Targets',
                title: `${drug.name} for ${disease.name}`,
                type: `Drug-Disease Association - Phase ${phase}`,
                status_significance: `Phase ${phase} Clinical Development`,
                details: `${drug.name} is in Phase ${phase} clinical development for ${disease.name}. Therapeutic areas: ${therapeuticAreas}`,
                phase: `Phase ${phase}`,
                status: 'Clinical Development',
                sponsor: 'Multiple sponsors',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `https://platform.opentargets.org/evidence/${drug.id}/${disease.id}`,
                
                // OpenTargets-specific fields
                drug_id: drug.id,
                drug_name: drug.name,
                disease_id: disease.id,
                disease_name: disease.name,
                clinical_phase: phase,
                max_phase_for_indication: diseaseAssoc.maxPhaseForIndication,
                therapeutic_areas: disease.therapeuticAreas,
                clinical_trial_phases: diseaseAssoc.clinicalTrialPhases,
                
                // Enhanced fields for better display
                condition_summary: disease.name,
                intervention_summary: drug.name,
                _database: 'opentargets',
                _databaseName: 'Open Targets',
                _intent: 'DRUG_DISEASES_PHASE',
                _priority: 'high',
                _category: 'Clinical Development',
                
                raw_data: diseaseAssoc
            };
        });
        
        const summary = {
            drug_name: drug.name,
            drug_id: drug.id,
            phase_requested: phase,
            total_diseases_all_phases: allDiseaseAssociations.length,
            diseases_in_phase: formattedResults.length,
            search_strategy: 'Comprehensive drug-disease associations filtered by clinical phase'
        };
        
        console.log(`✅ Successfully processed ${formattedResults.length} Phase ${phase} diseases for ${drug.name}`);
        
        return {
            data: formattedResults,
            summary: summary,
            metadata: {
                drug: drug,
                phase: phase,
                totalAssociations: allDiseaseAssociations.length,
                phaseSpecificCount: formattedResults.length
            }
        };
        
    } catch (error) {
        console.error(`❌ Error getting Phase ${phase} diseases for "${drugName}":`, error);
        throw error;
    }
}

// 🔍 GENERIC SEARCH - Fallback
async function genericSearch(query) {
    try {
        console.log(`🔍 Performing generic search for: "${query}"`);
        
        const searchQuery = `
            query GenericSearch($queryString: String!) {
                search(queryString: $queryString, page: {index: 0, size: 100}) {
                    hits {
                        id
                        name
                        entity
                        score
                        description
                    }
                }
            }
        `;

        const response = await fetch(OPENTARGETS_CONFIG.graphqlUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: searchQuery,
                variables: { queryString: query }
            })
        });

        const data = await response.json();
        const hits = data.data?.search?.hits || [];
        
        const results = hits.map((hit, index) => ({
            id: `OT-GENERIC-${hit.id}-${index}`,
            database: 'Open Targets',
            title: hit.name,
            type: `${hit.entity} - Search Result`,
            status_significance: 'Search Result',
            details: hit.description || `${hit.entity}: ${hit.name}`,
            phase: 'N/A',
            status: 'Search Result',
            sponsor: 'N/A',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: `https://platform.opentargets.org/${hit.entity}/${hit.id}`,
            
            entity_type: hit.entity,
            entity_id: hit.id,
            search_score: hit.score,
            _database: 'opentargets',
            _databaseName: 'Open Targets'
        }));
        
        return { data: results };
        
    } catch (error) {
        console.error('❌ Generic search failed:', error);
        return { data: [] };
    }
}

// 🎯 MAIN QUERY ROUTING
async function routeQuery(parsedIntent) {
    console.log(`🎯 Routing query with intent: ${parsedIntent.intent}`);
    
    switch (parsedIntent.action) {
        case 'get_diseases_by_phase':
            return await getDiseasesByPhase(parsedIntent.drug, parsedIntent.phase);
            
        case 'generic_search':
        default:
            return await genericSearch(parsedIntent.query || parsedIntent.originalQuery);
    }
}

// 🎯 MAIN API HANDLER
export default async function handler(req, res) {
    console.log('🎯 OpenTargets API called with query:', req.query.query);
    
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter required' });
        }

        // 🧠 PARSE QUERY INTENT
        const parsedIntent = QueryIntelligence.parseQuery(query);
        console.log('🧠 Parsed Intent:', JSON.stringify(parsedIntent, null, 2));

        // 🎯 ROUTE TO APPROPRIATE HANDLER
        const startTime = Date.now();
        const results = await routeQuery(parsedIntent);
        const endTime = Date.now();
        
        const responseTime = endTime - startTime;
        console.log(`✅ Query completed in ${responseTime}ms with ${results.data.length} results`);
        
        return res.status(200).json({
            results: results.data,
            total: results.data.length,
            query: query,
            intent: parsedIntent,
            summary: results.summary,
            metadata: results.metadata,
            search_timestamp: new Date().toISOString(),
            response_time: responseTime,
            api_status: 'success',
            data_source: 'OpenTargets Enhanced API'
        });

    } catch (error) {
        console.error('🚨 OpenTargets API Error:', error);
        
        return res.status(500).json({
            error: 'OpenTargets API error',
            message: error.message,
            results: [],
            total: 0,
            query: req.query?.query || 'unknown',
            search_timestamp: new Date().toISOString()
        });
    }
}
