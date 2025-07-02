// api/search/opentargets.js - COMPLETE DYNAMIC OpenTargets API for ALL biological queries

const OPENTARGETS_CONFIG = {
    baseUrl: 'https://api.platform.opentargets.org/api/v4/graphql',
    platformUrl: 'https://platform.opentargets.org',
    timeout: 30000
};

/**
 * COMPREHENSIVE DYNAMIC QUERY PARSER - Handles ALL patterns
 */
class BiologyQueryIntelligence {
    parseQuery(query) {
        const cleanQuery = query.toLowerCase().trim();
        
        console.log(`🧠 Parsing dynamic query: "${query}"`);

        // PATTERN 1: "List the diseases in Phase-X for [Drug]"
        const diseasePhasePattern = /list\s+(?:the\s+)?diseases?\s+in\s+phase[-\s]*(\d+|i{1,4}|ii|iii|iv)\s+for\s+([a-zA-Z0-9\-]+)/i;
        const diseasePhaseMatch = cleanQuery.match(diseasePhasePattern);
        
        if (diseasePhaseMatch) {
            const phaseNum = this.normalizePhase(diseasePhaseMatch[1]);
            const drugName = diseasePhaseMatch[2];
            
            return {
                type: 'drug-diseases-phase',
                entity: drugName,
                entityType: 'drug',
                relationship: 'diseases',
                phaseFilter: parseInt(phaseNum),
                confidence: 0.95,
                pattern: 'phase_diseases',
                originalQuery: query
            };
        }

        // PATTERN 2: "List the diseases for which [Drug] is approved"
        const approvedDiseasesPattern = /list\s+(?:the\s+)?diseases?\s+for\s+which\s+([a-zA-Z0-9\-]+)\s+is\s+approved/i;
        const approvedDiseasesMatch = cleanQuery.match(approvedDiseasesPattern);
        
        if (approvedDiseasesMatch) {
            return {
                type: 'drug-approved-diseases',
                entity: approvedDiseasesMatch[1],
                entityType: 'drug',
                relationship: 'approved_diseases',
                confidence: 0.95,
                pattern: 'approved_diseases',
                originalQuery: query
            };
        }

        // PATTERN 3: "For [Drug], list the various toxicities" OR "For [Drug], list the Adverse events"
        const toxicitiesPattern = /for\s+([a-zA-Z0-9\-]+),?\s+list\s+(?:the\s+)?(?:various\s+)?(toxicities?|adverse\s+events?|side\s+effects?)/i;
        const toxicitiesMatch = cleanQuery.match(toxicitiesPattern);
        
        if (toxicitiesMatch) {
            return {
                type: 'drug-toxicities',
                entity: toxicitiesMatch[1],
                entityType: 'drug',
                relationship: 'toxicities',
                confidence: 0.95,
                pattern: 'toxicities',
                originalQuery: query
            };
        }

        // PATTERN 4: "For compound [Drug], list all the targets and their binding affinities"
        const bindingAffinitiesPattern = /for\s+compound\s+([a-zA-Z0-9\-]+),?\s+list\s+(?:all\s+)?(?:the\s+)?targets?\s+and\s+(?:their\s+)?binding\s+affinities?/i;
        const bindingAffinitiesMatch = cleanQuery.match(bindingAffinitiesPattern);
        
        if (bindingAffinitiesMatch) {
            return {
                type: 'drug-binding-affinities',
                entity: bindingAffinitiesMatch[1],
                entityType: 'drug',
                relationship: 'binding_affinities',
                confidence: 0.95,
                pattern: 'binding_affinities',
                originalQuery: query
            };
        }

        // PATTERN 5: "List the diseases associated with [Target]"
        const targetDiseasesPattern = /list\s+(?:the\s+)?diseases?\s+associated\s+with\s+([a-zA-Z0-9_\-]+)/i;
        const targetDiseasesMatch = cleanQuery.match(targetDiseasesPattern);
        
        if (targetDiseasesMatch) {
            return {
                type: 'target-diseases',
                entity: targetDiseasesMatch[1],
                entityType: 'target',
                relationship: 'diseases',
                confidence: 0.95,
                pattern: 'target_diseases',
                originalQuery: query
            };
        }

        // PATTERN 6: "For Target [Target], list all the interacting partners"
        const interactingPartnersPattern = /for\s+target\s+([a-zA-Z0-9_\-]+),?\s+list\s+(?:all\s+)?(?:the\s+)?interacting\s+partners?/i;
        const interactingPartnersMatch = cleanQuery.match(interactingPartnersPattern);
        
        if (interactingPartnersMatch) {
            return {
                type: 'target-interactions',
                entity: interactingPartnersMatch[1],
                entityType: 'target',
                relationship: 'interactions',
                confidence: 0.95,
                pattern: 'interacting_partners',
                originalQuery: query
            };
        }

        // PATTERN 7: "List of approved compounds for a disease [Disease]"
        const diseaseCompoundsPattern = /list\s+(?:of\s+)?approved\s+compounds?\s+for\s+(?:a\s+)?disease\s+([a-zA-Z0-9_\-\s]+)/i;
        const diseaseCompoundsMatch = cleanQuery.match(diseaseCompoundsPattern);
        
        if (diseaseCompoundsMatch) {
            return {
                type: 'disease-approved-compounds',
                entity: diseaseCompoundsMatch[1].trim(),
                entityType: 'disease',
                relationship: 'approved_compounds',
                confidence: 0.95,
                pattern: 'disease_compounds',
                originalQuery: query
            };
        }

        // PATTERN 8: General drug queries
        if (cleanQuery.includes('drug') || cleanQuery.includes('compound')) {
            const drugMatch = cleanQuery.match(/(?:drug|compound)\s+([a-zA-Z0-9\-]+)/i);
            if (drugMatch) {
                return {
                    type: 'drug-general',
                    entity: drugMatch[1],
                    entityType: 'drug',
                    relationship: 'general',
                    confidence: 0.7,
                    pattern: 'general',
                    originalQuery: query
                };
            }
        }

        // PATTERN 9: General target queries
        if (cleanQuery.includes('target') || cleanQuery.includes('gene')) {
            const targetMatch = cleanQuery.match(/(?:target|gene)\s+([a-zA-Z0-9_\-]+)/i);
            if (targetMatch) {
                return {
                    type: 'target-general',
                    entity: targetMatch[1],
                    entityType: 'target',
                    relationship: 'general',
                    confidence: 0.7,
                    pattern: 'general',
                    originalQuery: query
                };
            }
        }

        return {
            type: 'general_search',
            entity: cleanQuery,
            confidence: 0.6,
            pattern: 'general',
            originalQuery: query
        };
    }

    normalizePhase(phase) {
        const phaseStr = phase.toLowerCase();
        const phaseMap = {
            'i': '1', 'ii': '2', 'iii': '3', 'iv': '4',
            '1': '1', '2': '2', '3': '3', '4': '4'
        };
        return phaseMap[phaseStr] || phase;
    }
}

/**
 * COMPREHENSIVE GraphQL QUERIES for ALL data types
 */
const GRAPHQL_QUERIES = {
    // Drug diseases with clinical trial phases
    drugDiseases: `
        query DrugDiseases($drugId: String!) {
            drug(chemblId: $drugId) {
                id
                name
                drugType
                maximumClinicalTrialPhase
                isApproved
                yearOfFirstApproval
                linkedDiseases {
                    count
                    rows {
                        disease {
                            id
                            name
                        }
                        clinicalTrialPhase
                        maxPhaseForIndication
                        status
                    }
                }
            }
        }
    `,

    // Drug targets and mechanisms
    drugTargets: `
        query DrugTargets($drugId: String!) {
            drug(chemblId: $drugId) {
                id
                name
                linkedTargets {
                    count
                    rows {
                        target {
                            id
                            approvedSymbol
                            approvedName
                            biotype
                        }
                        mechanismOfAction
                        actionType
                        references {
                            source
                            urls
                        }
                    }
                }
            }
        }
    `,

    // Drug safety and adverse events
    drugSafety: `
        query DrugSafety($drugId: String!) {
            drug(chemblId: $drugId) {
                id
                name
                safetyLiabilities {
                    event
                    effects {
                        direction
                        dosing
                    }
                    biosamples
                    datasource
                    literature
                }
                blackBoxWarning
                withdrawnNotice {
                    countries
                    reasons
                    year
                }
                adverseEvents {
                    count
                    criticalValue
                    rows {
                        name
                        meddraCode
                        count
                        logLR
                    }
                }
            }
        }
    `,

    // Target diseases
    targetDiseases: `
        query TargetDiseases($targetId: String!) {
            target(ensemblId: $targetId) {
                id
                approvedSymbol
                approvedName
                biotype
                associatedDiseases {
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
                        score
                        datatypeScores {
                            id
                            score
                        }
                    }
                }
            }
        }
    `,

    // Target interactions
    targetInteractions: `
        query TargetInteractions($targetId: String!) {
            target(ensemblId: $targetId) {
                id
                approvedSymbol
                approvedName
                interactions {
                    count
                    rows {
                        targetB {
                            id
                            approvedSymbol
                            approvedName
                        }
                        score
                        sourceDatabase
                        intType
                    }
                }
            }
        }
    `,

    // Disease compounds
    diseaseCompounds: `
        query DiseaseCompounds($diseaseId: String!) {
            disease(efoId: $diseaseId) {
                id
                name
                description
                knownDrugs {
                    count
                    rows {
                        drug {
                            id
                            name
                            drugType
                            maximumClinicalTrialPhase
                            isApproved
                            yearOfFirstApproval
                            blackBoxWarning
                        }
                        clinicalTrialPhase
                        mechanismOfAction
                        status
                    }
                }
            }
        }
    `,

    // Universal search
    search: `
        query UniversalSearch($queryString: String!, $entityNames: [String!]!, $size: Int!) {
            search(queryString: $queryString, entityNames: $entityNames, page: {index: 0, size: $size}) {
                hits {
                    id
                    name
                    entity
                    score
                    object {
                        ... on Drug {
                            id
                            name
                            drugType
                            maximumClinicalTrialPhase
                            isApproved
                        }
                        ... on Target {
                            id
                            approvedSymbol
                            approvedName
                            biotype
                        }
                        ... on Disease {
                            id
                            name
                            description
                        }
                    }
                }
                total
            }
        }
    `
};

/**
 * Execute GraphQL query with error handling
 */
async function executeGraphQL(query, variables) {
    try {
        console.log(`📡 Executing GraphQL query with variables:`, variables);
        
        const response = await fetch(OPENTARGETS_CONFIG.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ query, variables }),
            signal: AbortSignal.timeout(OPENTARGETS_CONFIG.timeout)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.errors && data.errors.length > 0) {
            console.warn('OpenTargets GraphQL errors:', data.errors);
            throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
        }
        
        console.log(`✅ GraphQL query successful`);
        return data.data;
    } catch (error) {
        console.error('GraphQL execution error:', error);
        throw error;
    }
}

/**
 * DYNAMIC ENTITY RESOLVER - Works for any drug/target/disease
 */
async function resolveEntity(entityName, entityType) {
    console.log(`🔍 Resolving ${entityType}: ${entityName}`);
    
    // Check if it's already an ID
    if (entityType === 'drug' && entityName.startsWith('CHEMBL')) {
        return { id: entityName, name: entityName };
    }
    if (entityType === 'target' && entityName.startsWith('ENSG')) {
        return { id: entityName, name: entityName };
    }
    if (entityType === 'disease' && entityName.startsWith('EFO_')) {
        return { id: entityName, name: entityName };
    }
    
    try {
        const searchData = await executeGraphQL(GRAPHQL_QUERIES.search, {
            queryString: entityName,
            entityNames: [entityType],
            size: 10
        });
        
        if (searchData?.search?.hits?.length > 0) {
            const hit = searchData.search.hits[0];
            console.log(`✅ Resolved ${entityName} to ${hit.id} (${hit.name})`);
            return {
                id: hit.id,
                name: hit.name,
                score: hit.score,
                data: hit.object
            };
        }
        
        throw new Error(`Could not resolve ${entityType}: ${entityName}`);
    } catch (error) {
        console.error(`❌ Failed to resolve ${entityName}:`, error);
        throw error;
    }
}

/**
 * COMPREHENSIVE DATA PROCESSORS for ALL query patterns
 */
class DataProcessor {
    // Process: "List the diseases in Phase-2 for Imatinib"
    static processPhaseDiseases(drugData, intent) {
        if (!drugData?.drug?.linkedDiseases?.rows) return { results: [], biologist_data: [] };
        
        const results = [];
        const biologist_data = [];
        
        console.log(`📊 Processing phase ${intent.phaseFilter} diseases for ${drugData.drug.name}`);
        
        drugData.drug.linkedDiseases.rows.forEach((association, index) => {
            const phase = association.maxPhaseForIndication || association.clinicalTrialPhase;
            
            if (intent.phaseFilter !== undefined && phase !== intent.phaseFilter) {
                return;
            }
            
            results.push({
                id: `OT-phase-${drugData.drug.id}-${association.disease.id}-${index}`,
                database: 'Open Targets',
                title: `${drugData.drug.name} for ${association.disease.name} (Phase ${phase})`,
                type: `Phase ${phase} Disease Association`,
                status_significance: 'Phase Clinical Data',
                details: `${drugData.drug.name} in Phase ${phase} for ${association.disease.name}`,
                phase: `Phase ${phase}`,
                status: 'Clinical Development',
                sponsor: 'Multiple',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPENTARGETS_CONFIG.platformUrl}/evidence/${drugData.drug.id}/${association.disease.id}`,
                
                drug_name: drugData.drug.name,
                disease_name: association.disease.name,
                phase_number: phase,
                entity_type: 'drug-phase-disease',
                raw_data: association
            });
            
            biologist_data.push({
                disease: association.disease.name,
                maxPhaseForIndication: phase
            });
        });
        
        return { results, biologist_data };
    }

    // Process: "List the diseases for which Rituximab is approved"
    static processApprovedDiseases(drugData, intent) {
        if (!drugData?.drug?.linkedDiseases?.rows) return { results: [], biologist_data: [] };
        
        const results = [];
        const biologist_data = [];
        
        drugData.drug.linkedDiseases.rows.forEach((association, index) => {
            const phase = association.maxPhaseForIndication || association.clinicalTrialPhase;
            
            // Only include approved (Phase 4) diseases
            if (phase !== 4) return;
            
            results.push({
                id: `OT-approved-${drugData.drug.id}-${association.disease.id}-${index}`,
                database: 'Open Targets',
                title: `${drugData.drug.name} approved for ${association.disease.name}`,
                type: 'Approved Disease Indication',
                status_significance: 'FDA Approved',
                details: `${drugData.drug.name} is approved for treatment of ${association.disease.name}`,
                phase: 'Approved',
                status: 'Approved',
                sponsor: 'Multiple',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPENTARGETS_CONFIG.platformUrl}/evidence/${drugData.drug.id}/${association.disease.id}`,
                
                drug_name: drugData.drug.name,
                disease_name: association.disease.name,
                entity_type: 'drug-approved-disease',
                raw_data: association
            });
            
            biologist_data.push({
                disease: association.disease.name,
                maxPhaseForIndication: phase
            });
        });
        
        return { results, biologist_data };
    }

    // Process: "For Dasatinib, list the various toxicities"
    static processToxicities(safetyData, intent) {
        const results = [];
        const biologist_data = [];
        
        // Process safety liabilities
        if (safetyData?.drug?.safetyLiabilities) {
            safetyData.drug.safetyLiabilities.forEach((safety, index) => {
                results.push({
                    id: `OT-toxicity-${safetyData.drug.id}-${index}`,
                    database: 'Open Targets',
                    title: `${safetyData.drug.name} - ${safety.event}`,
                    type: `Drug Toxicity - ${safety.event}`,
                    status_significance: 'Safety Liability',
                    details: `Toxicity: ${safety.event}. Biosamples: ${safety.biosamples?.join(', ') || 'N/A'}`,
                    phase: 'N/A',
                    status: 'Safety Data',
                    sponsor: 'N/A',
                    year: new Date().getFullYear(),
                    enrollment: 'N/A',
                    link: `${OPENTARGETS_CONFIG.platformUrl}/drug/${safetyData.drug.id}`,
                    
                    drug_name: safetyData.drug.name,
                    toxicity_event: safety.event,
                    entity_type: 'drug-toxicity',
                    raw_data: safety
                });
                
                biologist_data.push({
                    warningType: safety.event,
                    toxicityClass: safety.event,
                    efoIdForWarningClass: 'N/A',
                    references: safety.literature?.join(';') || 'OpenTargets'
                });
            });
        }
        
        // Process adverse events
        if (safetyData?.drug?.adverseEvents?.rows) {
            safetyData.drug.adverseEvents.rows.forEach((adverse, index) => {
                results.push({
                    id: `OT-adverse-${safetyData.drug.id}-${index}`,
                    database: 'Open Targets',
                    title: `${safetyData.drug.name} - ${adverse.name}`,
                    type: `Adverse Event - ${adverse.name}`,
                    status_significance: 'Adverse Event',
                    details: `Adverse event: ${adverse.name}. LogLR: ${adverse.logLR}, Reports: ${adverse.count}`,
                    phase: 'N/A',
                    status: 'Adverse Event',
                    sponsor: 'FDA FAERS',
                    year: new Date().getFullYear(),
                    enrollment: 'N/A',
                    link: `${OPENTARGETS_CONFIG.platformUrl}/drug/${safetyData.drug.id}`,
                    
                    drug_name: safetyData.drug.name,
                    adverse_event: adverse.name,
                    entity_type: 'drug-adverse-event',
                    raw_data: adverse
                });
                
                biologist_data.push({
                    warningType: adverse.name,
                    toxicityClass: 'Adverse Event',
                    efoIdForWarningClass: adverse.meddraCode || 'N/A',
                    references: `FAERS LogLR: ${adverse.logLR}`
                });
            });
        }
        
        return { results, biologist_data };
    }

    // Process: "For compound X, list all the targets and their binding affinities"
    static processBindingAffinities(targetsData, intent) {
        if (!targetsData?.drug?.linkedTargets?.rows) return { results: [], biologist_data: [] };
        
        const results = [];
        const biologist_data = [];
        
        targetsData.drug.linkedTargets.rows.forEach((association, index) => {
            results.push({
                id: `OT-binding-${targetsData.drug.id}-${association.target.id}-${index}`,
                database: 'Open Targets',
                title: `${targetsData.drug.name} → ${association.target.approvedSymbol}`,
                type: `Drug-Target Binding - ${association.mechanismOfAction || 'Unknown MOA'}`,
                status_significance: 'Target Binding',
                details: `${targetsData.drug.name} binds to ${association.target.approvedSymbol} via ${association.mechanismOfAction || 'unknown mechanism'}`,
                phase: 'N/A',
                status: 'Binding Data',
                sponsor: 'N/A',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPENTARGETS_CONFIG.platformUrl}/target/${association.target.id}`,
                
                drug_name: targetsData.drug.name,
                target_symbol: association.target.approvedSymbol,
                entity_type: 'drug-target-binding',
                raw_data: association
            });
            
            biologist_data.push({
                mechanismOfAction: association.mechanismOfAction || 'Unknown',
                targets: association.target.approvedSymbol,
                actionType: association.actionType || 'Unknown',
                references: association.references?.map(ref => ref.source).join(';') || 'OpenTargets'
            });
        });
        
        return { results, biologist_data };
    }

    // Process: "List the diseases associated with JAK2"
    static processTargetDiseases(targetData, intent) {
        if (!targetData?.target?.associatedDiseases?.rows) return { results: [], biologist_data: [] };
        
        const results = [];
        const biologist_data = [];
        
        targetData.target.associatedDiseases.rows.forEach((association, index) => {
            results.push({
                id: `OT-target-disease-${targetData.target.id}-${association.disease.id}-${index}`,
                database: 'Open Targets',
                title: `${targetData.target.approvedSymbol} ↔ ${association.disease.name}`,
                type: `Target-Disease Association - Score ${association.score.toFixed(3)}`,
                status_significance: 'Disease Association',
                details: `${targetData.target.approvedSymbol} associated with ${association.disease.name}. Score: ${association.score.toFixed(3)}`,
                phase: 'N/A',
                status: 'Association Data',
                sponsor: 'N/A',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPENTARGETS_CONFIG.platformUrl}/evidence/${targetData.target.id}/${association.disease.id}`,
                
                target_symbol: targetData.target.approvedSymbol,
                disease_name: association.disease.name,
                entity_type: 'target-disease-association',
                raw_data: association
            });
            
            biologist_data.push({
                disease: association.disease.name,
                datasourceScores: JSON.stringify(association.datatypeScores || [])
            });
        });
        
        return { results, biologist_data };
    }

    // Process: "For Target X, list all the interacting partners"
    static processInteractingPartners(targetData, intent) {
        if (!targetData?.target?.interactions?.rows) return { results: [], biologist_data: [] };
        
        const results = [];
        const biologist_data = [];
        
        targetData.target.interactions.rows.forEach((interaction, index) => {
            results.push({
                id: `OT-interaction-${targetData.target.id}-${interaction.targetB.id}-${index}`,
                database: 'Open Targets',
                title: `${targetData.target.approvedSymbol} ↔ ${interaction.targetB.approvedSymbol}`,
                type: `Protein-Protein Interaction - Score ${interaction.score.toFixed(3)}`,
                status_significance: 'Protein Interaction',
                details: `${targetData.target.approvedSymbol} interacts with ${interaction.targetB.approvedSymbol}. Score: ${interaction.score.toFixed(3)}`,
                phase: 'N/A',
                status: 'Interaction Data',
                sponsor: 'N/A',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPENTARGETS_CONFIG.platformUrl}/target/${targetData.target.id}`,
                
                target_a: targetData.target.approvedSymbol,
                target_b: interaction.targetB.approvedSymbol,
                entity_type: 'target-interaction',
                raw_data: interaction
            });
            
            biologist_data.push({
                targetA: targetData.target.approvedSymbol,
                targetB: interaction.targetB.approvedSymbol,
                score: interaction.score
            });
        });
        
        return { results, biologist_data };
    }

    // Process: "List of approved compounds for a disease A"
    static processDiseaseCompounds(diseaseData, intent) {
        if (!diseaseData?.disease?.knownDrugs?.rows) return { results: [], biologist_data: [] };
        
        const results = [];
        const biologist_data = [];
        
        diseaseData.disease.knownDrugs.rows.forEach((drugAssoc, index) => {
            const drug = drugAssoc.drug;
            
            // Only include approved drugs
            if (!drug.isApproved) return;
            
            results.push({
                id: `OT-disease-drug-${diseaseData.disease.id}-${drug.id}-${index}`,
                database: 'Open Targets',
                title: `${drug.name} approved for ${diseaseData.disease.name}`,
                type: `Approved Drug - ${drug.drugType || 'Unknown'}`,
                status_significance: 'Approved Treatment',
                details: `${drug.name} is approved for ${diseaseData.disease.name}`,
                phase: 'Approved',
                status: 'Approved',
                sponsor: 'Multiple',
                year: drug.yearOfFirstApproval || new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPENTARGETS_CONFIG.platformUrl}/drug/${drug.id}`,
                
                drug_name: drug.name,
                disease_name: diseaseData.disease.name,
                entity_type: 'disease-approved-drug',
                raw_data: drugAssoc
            });
            
            biologist_data.push({
                drug: drug.name
            });
        });
        
        return { results, biologist_data };
    }
}

/**
 * MAIN DYNAMIC SEARCH HANDLER
 */
async function handleDynamicSearch(intent) {
    console.log(`🚀 Handling dynamic search for pattern: ${intent.pattern}`);
    
    let results = [];
    let biologist_data = [];
    
    try {
        if (intent.pattern === 'phase_diseases') {
            // "List the diseases in Phase-2 for Imatinib"
            const drug = await resolveEntity(intent.entity, 'drug');
            const data = await executeGraphQL(GRAPHQL_QUERIES.drugDiseases, { drugId: drug.id });
            const processed = DataProcessor.processPhaseDiseases(data, intent);
            results = processed.results;
            biologist_data = processed.biologist_data;
            
        } else if (intent.pattern === 'approved_diseases') {
            // "List the diseases for which Rituximab is approved"
            const drug = await resolveEntity(intent.entity, 'drug');
            const data = await executeGraphQL(GRAPHQL_QUERIES.drugDiseases, { drugId: drug.id });
            const processed = DataProcessor.processApprovedDiseases(data, intent);
            results = processed.results;
            biologist_data = processed.biologist_data;
            
        } else if (intent.pattern === 'toxicities') {
            // "For Dasatinib, list the various toxicities"
            const drug = await resolveEntity(intent.entity, 'drug');
            const data = await executeGraphQL(GRAPHQL_QUERIES.drugSafety, { drugId: drug.id });
            const processed = DataProcessor.processToxicities(data, intent);
            results = processed.results;
            biologist_data = processed.biologist_data;
            
        } else if (intent.pattern === 'binding_affinities') {
            // "For compound X, list all the targets and their binding affinities"
            const drug = await resolveEntity(intent.entity, 'drug');
            const data = await executeGraphQL(GRAPHQL_QUERIES.drugTargets, { drugId: drug.id });
            const processed = DataProcessor.processBindingAffinities(data, intent);
            results = processed.results;
            biologist_data = processed.biologist_data;
            
        } else if (intent.pattern === 'target_diseases') {
            // "List the diseases associated with JAK2"
            const target = await resolveEntity(intent.entity, 'target');
            const data = await executeGraphQL(GRAPHQL_QUERIES.targetDiseases, { targetId: target.id });
            const processed = DataProcessor.processTargetDiseases(data, intent);
            results = processed.results;
            biologist_data = processed.biologist_data;
            
        } else if (intent.pattern === 'interacting_partners') {
            // "For Target X, list all the interacting partners"
            const target = await resolveEntity(intent.entity, 'target');
            const data = await executeGraphQL(GRAPHQL_QUERIES.targetInteractions, { targetId: target.id });
            const processed = DataProcessor.processInteractingPartners(data, intent);
            results = processed.results;
            biologist_data = processed.biologist_data;
            
        } else if (intent.pattern === 'disease_compounds') {
            // "List of approved compounds for a disease A"
            const disease = await resolveEntity(intent.entity, 'disease');
            const data = await executeGraphQL(GRAPHQL_QUERIES.diseaseCompounds, { diseaseId: disease.id });
            const processed = DataProcessor.processDiseaseCompounds(data, intent);
            results = processed.results;
            biologist_data = processed.biologist_data;
            
        } else {
            console.log(`ℹ️ Pattern "${intent.pattern}" not yet implemented`);
        }
        
    } catch (error) {
        console.error(`❌ Error in handleDynamicSearch:`, error);
        throw error;
    }
    
    return { results, biologist_data };
}

/**
 * MAIN API HANDLER
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

    const { query, limit = 100 } = req.query;

    if (!query) {
        return res.status(400).json({ 
            error: 'Query parameter is required',
            examples: [
                'List the diseases in Phase-2 for Imatinib',
                'List the diseases for which Rituximab is approved',
                'For Dasatinib, list the various toxicities',
                'For compound imatinib, list all the targets and their binding affinities',
                'List the diseases associated with JAK2',
                'For Target TP53, list all the interacting partners',
                'List of approved compounds for a disease melanoma'
            ]
        });
    }

    const startTime = performance.now();

    try {
        console.log(`🤖 DYNAMIC OpenTargets search for: "${query}"`);
        
        // Parse the query to understand intent
        const intelligence = new BiologyQueryIntelligence();
        const intent = intelligence.parseQuery(query);
        
        console.log(`🧠 Query intent:`, intent);
        
        // Handle the search dynamically
        const { results, biologist_data } = await handleDynamicSearch(intent);
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.log(`🎉 DYNAMIC OpenTargets completed: ${results.length} results in ${responseTime}ms`);
        console.log(`📊 Biologist data: ${biologist_data.length} entries`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            intent: intent,
            biologist_data: biologist_data, // Exact CSV format for each pattern
            search_timestamp: new Date().toISOString(),
            response_time: responseTime,
            api_status: 'success',
            system: 'DYNAMIC OpenTargets Intelligence System',
            data_source: 'Open Targets Platform GraphQL API'
        });

    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.error('DYNAMIC OpenTargets error:', error);
        
        return res.status(500).json({
            error: 'DYNAMIC OpenTargets error',
            message: error.message,
            results: [],
            total: 0,
            query: query,
            response_time: responseTime,
            search_timestamp: new Date().toISOString()
        });
    }
}
