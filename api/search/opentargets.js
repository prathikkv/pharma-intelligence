// api/search/opentargets.js - DYNAMIC VERSION with intent-based routing
import { QueryParser } from '../../utils/queryParser.js';

const queryParser = new QueryParser();

export default async function handler(req, res) {
    console.log('🎯 OpenTargets Dynamic API called with query:', req.query.query);
    
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
        const parsedIntent = queryParser.parseQuery(query);
        console.log('🧠 Parsed Intent:', parsedIntent);

        // 🎯 ROUTE TO APPROPRIATE HANDLER
        const results = await routeQuery(parsedIntent);
        
        return res.status(200).json({
            results: results.data,
            total: results.data.length,
            query: query,
            intent: parsedIntent,
            search_timestamp: new Date().toISOString(),
            api_status: 'success',
            data_source: 'OpenTargets Dynamic API'
        });

    } catch (error) {
        console.error('🚨 OpenTargets Dynamic API Error:', error);
        
        return res.status(500).json({
            error: 'OpenTargets API error',
            message: error.message,
            results: [],
            total: 0,
            query: req.query?.query || 'unknown'
        });
    }
}

// 🎯 DYNAMIC QUERY ROUTING
async function routeQuery(parsedIntent) {
    switch (parsedIntent.action) {
        case 'get_diseases_by_phase':
            return await getDiseasesByPhase(
                parsedIntent.entities.drug, 
                parsedIntent.entities.phase
            );
            
        case 'get_approved_diseases':
            return await getApprovedDiseases(parsedIntent.entities.drug);
            
        case 'get_toxicities':
            return await getToxicities(parsedIntent.entities.drug);
            
        case 'get_targets_and_binding':
            return await getTargetsAndBinding(parsedIntent.entities.compound);
            
        case 'get_associated_diseases':
            return await getAssociatedDiseases(parsedIntent.entities.target);
            
        case 'get_interacting_partners':
            return await getInteractingPartners(parsedIntent.entities.target);
            
        case 'get_approved_compounds':
            return await getApprovedCompounds(parsedIntent.entities.disease);
            
        default:
            return await genericSearch(parsedIntent.entities.query);
    }
}

// 🔬 SPECIFIC QUERY HANDLERS
async function getDiseasesByPhase(drugName, phase) {
    console.log(`🔍 Getting Phase ${phase} diseases for ${drugName}`);
    
    try {
        // First, search for the drug
        const drugSearch = await searchDrug(drugName);
        if (!drugSearch || drugSearch.length === 0) {
            throw new Error(`Drug "${drugName}" not found`);
        }
        
        const drugId = drugSearch[0].id;
        
        // Get diseases for specific phase
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `
                    query GetDrugDiseasesByPhase($chemblId: String!) {
                        drug(chemblId: $chemblId) {
                            id
                            name
                            linkedDiseases {
                                count
                                rows {
                                    disease {
                                        id
                                        name
                                    }
                                    maxPhaseForIndication
                                }
                            }
                        }
                    }
                `,
                variables: { chemblId: drugId }
            })
        });

        const data = await response.json();
        const diseases = data.data?.drug?.linkedDiseases?.rows || [];
        
        // Filter by requested phase
        const phaseNumber = parseInt(phase);
        const filteredDiseases = diseases.filter(d => d.maxPhaseForIndication === phaseNumber);
        
        return {
            data: filteredDiseases.map((diseaseAssoc, index) => ({
                id: `OT-${drugId}-${diseaseAssoc.disease.id}-${index}`,
                database: 'Open Targets',
                title: `${drugName} for ${diseaseAssoc.disease.name}`,
                type: `Drug-Disease Association - Phase ${phase}`,
                status_significance: `Phase ${phase} Clinical`,
                details: `${drugName} is in Phase ${phase} clinical trials for ${diseaseAssoc.disease.name}`,
                phase: `Phase ${phase}`,
                status: 'Clinical Development',
                sponsor: 'Multiple',
                year: 2025,
                enrollment: 'N/A',
                link: `https://platform.opentargets.org/evidence/${drugId}/${diseaseAssoc.disease.id}`,
                
                // Specific fields
                drug_id: drugId,
                drug_name: drugName,
                disease_id: diseaseAssoc.disease.id,
                disease_name: diseaseAssoc.disease.name,
                clinical_phase: phaseNumber
            })),
            metadata: {
                drug_found: drugName,
                phase_requested: phase,
                total_diseases_for_drug: diseases.length,
                phase_specific_diseases: filteredDiseases.length
            }
        };
        
    } catch (error) {
        console.error(`Error getting Phase ${phase} diseases for ${drugName}:`, error);
        throw error;
    }
}

async function getApprovedDiseases(drugName) {
    console.log(`🔍 Getting approved diseases for ${drugName}`);
    
    // Similar pattern but filter for approved (Phase 4) diseases
    return await getDiseasesByPhase(drugName, 4);
}

async function getToxicities(drugName) {
    console.log(`🔍 Getting toxicities for ${drugName}`);
    
    try {
        const drugSearch = await searchDrug(drugName);
        if (!drugSearch || drugSearch.length === 0) {
            throw new Error(`Drug "${drugName}" not found`);
        }
        
        const drugId = drugSearch[0].id;
        
        // Query for adverse effects
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `
                    query GetDrugAdverseEffects($chemblId: String!) {
                        drug(chemblId: $chemblId) {
                            id
                            name
                            adverseEvents {
                                count
                                rows {
                                    event {
                                        id
                                        name
                                    }
                                    logLR
                                    criticalValue
                                }
                            }
                        }
                    }
                `,
                variables: { chemblId: drugId }
            })
        });

        const data = await response.json();
        const adverseEvents = data.data?.drug?.adverseEvents?.rows || [];
        
        return {
            data: adverseEvents.map((event, index) => ({
                id: `OT-ADV-${drugId}-${index}`,
                database: 'Open Targets',
                title: `${drugName} - ${event.event.name}`,
                type: 'Adverse Effect',
                status_significance: event.criticalValue ? 'Significant' : 'Reported',
                details: `Adverse effect: ${event.event.name}. LogLR: ${event.logLR}`,
                phase: 'N/A',
                status: 'Adverse Effect',
                sponsor: 'N/A',
                year: 2025,
                enrollment: 'N/A',
                link: `https://platform.opentargets.org/drug/${drugId}`,
                
                // Specific fields
                drug_name: drugName,
                adverse_event: event.event.name,
                log_lr: event.logLR,
                critical_value: event.criticalValue
            }))
        };
        
    } catch (error) {
        console.error(`Error getting toxicities for ${drugName}:`, error);
        throw error;
    }
}

// 🔍 HELPER FUNCTIONS
async function searchDrug(drugName) {
    try {
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `
                    query SearchDrug($queryString: String!) {
                        search(queryString: $queryString, entityNames: ["drug"], page: {index: 0, size: 10}) {
                            hits {
                                id
                                name
                                entity
                                score
                            }
                        }
                    }
                `,
                variables: { queryString: drugName }
            })
        });

        const data = await response.json();
        return data.data?.search?.hits || [];
        
    } catch (error) {
        console.error('Error searching for drug:', error);
        return [];
    }
}

async function genericSearch(query) {
    // Fallback to generic search
    console.log(`🔍 Performing generic search for: ${query}`);
    
    try {
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `
                    query GenericSearch($queryString: String!) {
                        search(queryString: $queryString, page: {index: 0, size: 50}) {
                            hits {
                                id
                                name
                                entity
                                score
                                description
                            }
                        }
                    }
                `,
                variables: { queryString: query }
            })
        });

        const data = await response.json();
        const hits = data.data?.search?.hits || [];
        
        return {
            data: hits.map((hit, index) => ({
                id: `OT-GENERIC-${hit.id}-${index}`,
                database: 'Open Targets',
                title: hit.name,
                type: `${hit.entity} - Generic Search Result`,
                status_significance: 'Search Result',
                details: hit.description || `${hit.entity}: ${hit.name}`,
                phase: 'N/A',
                status: 'Search Result',
                sponsor: 'N/A',
                year: 2025,
                enrollment: 'N/A',
                link: `https://platform.opentargets.org/${hit.entity}/${hit.id}`,
                
                entity_type: hit.entity,
                entity_id: hit.id,
                search_score: hit.score
            }))
        };
        
    } catch (error) {
        console.error('Error in generic search:', error);
        return { data: [] };
    }
}
