// api/search/opentargets.js - COMPREHENSIVE AGENTIC BIOLOGY AI SYSTEM
// Handles ALL biological relationship queries dynamically

/**
 * COMPREHENSIVE AGENTIC BIOLOGY AI - OpenTargets Intelligence System
 * 
 * Supports ALL biological relationship queries:
 * - List the diseases in Phase-2 for Imatinib
 * - List the diseases for which Rituximab is approved  
 * - For Dasatinib, list the various toxicities
 * - For compound X, list all the targets and their binding affinities
 * - For compound Y, list the Adverse events
 * - List the diseases associated with JAK2
 * - For Target X, list all the interacting partners
 * - List of approved compounds for a disease A
 * - And ANY other biological query!
 */

const OPENTARGETS_CONFIG = {
    baseUrl: 'https://api.platform.opentargets.org/api/v4/graphql',
    platformUrl: 'https://platform.opentargets.org',
    timeout: 30000
};

/**
 * ENHANCED INTELLIGENT QUERY PARSER - Recognizes ALL biological relationship patterns
 */
class BiologyQueryIntelligence {
    constructor() {
        this.entityTypes = ['drug', 'target', 'disease', 'compound', 'gene', 'protein'];
        this.relationshipTypes = [
            'diseases', 'targets', 'toxicities', 'adverse_events', 'side_effects',
            'binding_affinities', 'mechanisms', 'interactions', 'partners',
            'compounds', 'drugs', 'indications', 'warnings', 'contraindications',
            'pathways', 'biomarkers', 'mutations', 'variants', 'approved'
        ];
        this.qualifiers = [
            'phase-1', 'phase-2', 'phase-3', 'phase-4', 'approved', 'clinical',
            'investigational', 'experimental', 'black_box', 'serious', 'common'
        ];
    }

    /**
     * Parse ANY biological query and understand intent - COMPREHENSIVE PATTERN MATCHING
     */
    parseQuery(query) {
        const cleanQuery = query.toLowerCase().trim();
        
        const intent = {
            type: 'unknown',
            entity: null,
            entityType: null,
            relationship: null,
            qualifiers: [],
            originalQuery: query,
            confidence: 0,
            phaseFilter: null,
            specificPattern: null
        };

        console.log(`🧠 Parsing comprehensive query: "${query}"`);

        // PATTERN 1: "List the diseases in Phase-X for [Drug]"
        const diseasePhasePattern = /list\s+(?:the\s+)?diseases?\s+in\s+phase[-\s]*(\d+|i{1,4}|ii|iii|iv)\s+for\s+([a-zA-Z0-9\-]+)/i;
        const diseasePhaseMatch = cleanQuery.match(diseasePhasePattern);
        
        if (diseasePhaseMatch) {
            const phaseNum = this.normalizePhase(diseasePhaseMatch[1]);
            const drugName = diseasePhaseMatch[2];
            
            return {
                ...intent,
                type: 'drug-diseases',
                entityType: 'drug',
                entity: drugName,
                relationship: 'diseases',
                qualifiers: [`phase-${phaseNum}`],
                phaseFilter: parseInt(phaseNum),
                confidence: 0.95,
                specificPattern: 'phase_diseases'
            };
        }

        // PATTERN 2: "List the diseases for which [Drug] is approved"
        const approvedDiseasesPattern = /list\s+(?:the\s+)?diseases?\s+for\s+which\s+([a-zA-Z0-9\-]+)\s+is\s+approved/i;
        const approvedDiseasesMatch = cleanQuery.match(approvedDiseasesPattern);
        
        if (approvedDiseasesMatch) {
            return {
                ...intent,
                type: 'drug-approved-diseases',
                entityType: 'drug',
                entity: approvedDiseasesMatch[1],
                relationship: 'approved_diseases',
                qualifiers: ['approved'],
                confidence: 0.95,
                specificPattern: 'approved_diseases'
            };
        }

        // PATTERN 3: "For [Drug], list the various toxicities" OR "For [Drug], list the Adverse events"
        const toxicitiesPattern = /for\s+([a-zA-Z0-9\-]+),?\s+list\s+(?:the\s+)?(?:various\s+)?(toxicities?|adverse\s+events?|side\s+effects?)/i;
        const toxicitiesMatch = cleanQuery.match(toxicitiesPattern);
        
        if (toxicitiesMatch) {
            return {
                ...intent,
                type: 'drug-toxicities',
                entityType: 'drug',
                entity: toxicitiesMatch[1],
                relationship: 'toxicities',
                confidence: 0.95,
                specificPattern: 'toxicities'
            };
        }

        // PATTERN 4: "For compound [Drug], list all the targets and their binding affinities"
        const bindingAffinitiesPattern = /for\s+compound\s+([a-zA-Z0-9\-]+),?\s+list\s+(?:all\s+)?(?:the\s+)?targets?\s+and\s+(?:their\s+)?binding\s+affinities?/i;
        const bindingAffinitiesMatch = cleanQuery.match(bindingAffinitiesPattern);
        
        if (bindingAffinitiesMatch) {
            return {
                ...intent,
                type: 'drug-binding-affinities',
                entityType: 'drug',
                entity: bindingAffinitiesMatch[1],
                relationship: 'binding_affinities',
                confidence: 0.95,
                specificPattern: 'binding_affinities'
            };
        }

        // PATTERN 5: "List the diseases associated with [Target]"
        const targetDiseasesPattern = /list\s+(?:the\s+)?diseases?\s+associated\s+with\s+([a-zA-Z0-9_\-]+)/i;
        const targetDiseasesMatch = cleanQuery.match(targetDiseasesPattern);
        
        if (targetDiseasesMatch) {
            return {
                ...intent,
                type: 'target-diseases',
                entityType: 'target',
                entity: targetDiseasesMatch[1],
                relationship: 'diseases',
                confidence: 0.95,
                specificPattern: 'target_diseases'
            };
        }

        // PATTERN 6: "For Target [Target], list all the interacting partners"
        const interactingPartnersPattern = /for\s+target\s+([a-zA-Z0-9_\-]+),?\s+list\s+(?:all\s+)?(?:the\s+)?interacting\s+partners?/i;
        const interactingPartnersMatch = cleanQuery.match(interactingPartnersPattern);
        
        if (interactingPartnersMatch) {
            return {
                ...intent,
                type: 'target-interactions',
                entityType: 'target',
                entity: interactingPartnersMatch[1],
                relationship: 'interactions',
                confidence: 0.95,
                specificPattern: 'interacting_partners'
            };
        }

        // PATTERN 7: "List of approved compounds for a disease [Disease]"
        const diseaseCompoundsPattern = /list\s+(?:of\s+)?approved\s+compounds?\s+for\s+(?:a\s+)?disease\s+([a-zA-Z0-9_\-\s]+)/i;
        const diseaseCompoundsMatch = cleanQuery.match(diseaseCompoundsPattern);
        
        if (diseaseCompoundsMatch) {
            return {
                ...intent,
                type: 'disease-approved-compounds',
                entityType: 'disease',
                entity: diseaseCompoundsMatch[1].trim(),
                relationship: 'approved_compounds',
                qualifiers: ['approved'],
                confidence: 0.95,
                specificPattern: 'disease_compounds'
            };
        }

        // PATTERN 8: Generic drug patterns
        if (this.matchesDrugPattern(cleanQuery)) {
            intent.entityType = 'drug';
            intent.entity = this.extractEntity(cleanQuery, 'drug');
            intent.relationship = this.extractRelationship(cleanQuery);
            intent.qualifiers = this.extractQualifiers(cleanQuery);
            intent.type = `drug-${intent.relationship}`;
            intent.confidence = 0.8;
        }
        
        // PATTERN 9: Generic target patterns
        else if (this.matchesTargetPattern(cleanQuery)) {
            intent.entityType = 'target';
            intent.entity = this.extractEntity(cleanQuery, 'target');
            intent.relationship = this.extractRelationship(cleanQuery);
            intent.qualifiers = this.extractQualifiers(cleanQuery);
            intent.type = `target-${intent.relationship}`;
            intent.confidence = 0.8;
        }
        
        // PATTERN 10: Generic disease patterns
        else if (this.matchesDiseasePattern(cleanQuery)) {
            intent.entityType = 'disease';
            intent.entity = this.extractEntity(cleanQuery, 'disease');
            intent.relationship = this.extractRelationship(cleanQuery);
            intent.qualifiers = this.extractQualifiers(cleanQuery);
            intent.type = `disease-${intent.relationship}`;
            intent.confidence = 0.8;
        }
        
        // PATTERN 11: General search
        else {
            intent.type = 'general_search';
            intent.entity = cleanQuery;
            intent.confidence = 0.6;
        }

        return intent;
    }

    normalizePhase(phase) {
        const phaseStr = phase.toLowerCase();
        const phaseMap = {
            'i': '1', 'ii': '2', 'iii': '3', 'iv': '4',
            '1': '1', '2': '2', '3': '3', '4': '4'
        };
        return phaseMap[phaseStr] || phase;
    }

    matchesDrugPattern(query) {
        const drugPatterns = [
            /(?:drug|compound).*?(?:list|show|find).*?(?:diseases?|targets?|toxicities?|adverse|side.effects?)/,
            /(?:for|of)\s+([a-zA-Z0-9\-]+).*?(?:list|show|find)/,
            /list.*?(?:diseases?|targets?).*?(?:for|of)\s+([a-zA-Z0-9\-]+)/,
            /([a-zA-Z0-9\-]+)\s+(?:diseases?|targets?|toxicities?|adverse)/
        ];
        return drugPatterns.some(pattern => pattern.test(query));
    }

    matchesTargetPattern(query) {
        const targetPatterns = [
            /(?:target|gene|protein).*?(?:list|show|find).*?(?:diseases?|interactions?|partners?)/,
            /(?:for|of)\s+([A-Z0-9_]+).*?(?:list|show|find)/,
            /list.*?(?:diseases?|interactions?).*?(?:for|of)\s+([A-Z0-9_]+)/,
            /([A-Z0-9_]+)\s+(?:associated|interacting|binding)/
        ];
        return targetPatterns.some(pattern => pattern.test(query));
    }

    matchesDiseasePattern(query) {
        const diseasePatterns = [
            /(?:disease|indication|condition).*?(?:list|show|find).*?(?:compounds?|drugs?|treatments?)/,
            /(?:approved|investigational).*?(?:compounds?|drugs?).*?(?:for|of)/,
            /list.*?(?:compounds?|drugs?).*?(?:for|of).*?(?:disease|cancer|syndrome)/
        ];
        return diseasePatterns.some(pattern => pattern.test(query));
    }

    extractEntity(query, entityType) {
        if (entityType === 'drug') {
            const drugPatterns = [
                /(?:for|of)\s+([a-zA-Z0-9\-]+)/,
                /([a-zA-Z0-9\-]+)\s+(?:diseases?|targets?|toxicities?)/,
                /drug[:\s]*([a-zA-Z0-9\-]+)/i
            ];
            
            for (const pattern of drugPatterns) {
                const match = query.match(pattern);
                if (match) return match[1];
            }
        }
        
        if (entityType === 'target') {
            const targetPatterns = [
                /(?:for|of)\s+([A-Z0-9_]+)/,
                /([A-Z0-9_]+)\s+(?:associated|interacting)/,
                /target[:\s]*([A-Z0-9_]+)/i
            ];
            
            for (const pattern of targetPatterns) {
                const match = query.match(pattern);
                if (match) return match[1];
            }
        }
        
        if (entityType === 'disease') {
            const diseasePatterns = [
                /(?:for|of)\s+([a-zA-Z\s]+?)(?:\s|$)/,
                /disease[:\s]*([a-zA-Z\s]+)/i
            ];
            
            for (const pattern of diseasePatterns) {
                const match = query.match(pattern);
                if (match) return match[1].trim();
            }
        }
        
        return null;
    }

    extractRelationship(query) {
        if (query.includes('diseases') || query.includes('indications')) return 'diseases';
        if (query.includes('targets') || query.includes('proteins')) return 'targets';
        if (query.includes('toxicities') || query.includes('adverse') || query.includes('side effects')) return 'toxicities';
        if (query.includes('binding') || query.includes('affinities')) return 'binding_affinities';
        if (query.includes('interactions') || query.includes('partners')) return 'interactions';
        if (query.includes('compounds') || query.includes('drugs')) return 'compounds';
        if (query.includes('mechanisms') || query.includes('pathways')) return 'mechanisms';
        if (query.includes('warnings') || query.includes('contraindications')) return 'warnings';
        if (query.includes('approved')) return 'approved';
        
        return 'general';
    }

    extractQualifiers(query) {
        const qualifiers = [];
        
        const phaseMatch = query.match(/phase[-\s]*(\d+|i{1,4}|iv)/i);
        if (phaseMatch) {
            const phase = phaseMatch[1].toLowerCase();
            const phaseMap = { 'i': '1', 'ii': '2', 'iii': '3', 'iv': '4' };
            qualifiers.push(`phase-${phaseMap[phase] || phase}`);
        }
        
        if (query.includes('approved')) qualifiers.push('approved');
        if (query.includes('investigational') || query.includes('experimental')) qualifiers.push('investigational');
        if (query.includes('clinical')) qualifiers.push('clinical');
        if (query.includes('black box') || query.includes('serious')) qualifiers.push('serious');
        if (query.includes('common') || query.includes('frequent')) qualifiers.push('common');
        
        return qualifiers;
    }
}

/**
 * COMPREHENSIVE GRAPHQL QUERIES for ALL biological relationships
 */
const BIOLOGY_QUERIES = {
    // Drug-related queries
    drugDiseases: `
        query DrugDiseases($drugId: String!) {
            drug(chemblId: $drugId) {
                id
                name
                drugType
                maximumClinicalTrialPhase
                isApproved
                synonyms
                tradeNames
                yearOfFirstApproval
                blackBoxWarning
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
    
    // Target-related queries
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
    
    // Disease-related queries
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
    universalSearch: `
        query UniversalSearch($queryString: String!, $entityNames: [String!]!, $size: Int!) {
            search(queryString: $queryString, entityNames: $entityNames, page: {index: 0, size: $size}) {
                hits {
                    id
                    name
                    description
                    entity
                    score
                    object {
                        ... on Drug {
                            id
                            name
                            drugType
                            maximumClinicalTrialPhase
                            isApproved
                            synonyms
                            tradeNames
                        }
                        ... on Target {
                            id
                            approvedSymbol
                            approvedName
                            biotype
                            functionDescriptions
                        }
                        ... on Disease {
                            id
                            name
                            description
                            therapeuticAreas {
                                id
                                name
                            }
                        }
                    }
                }
                total
            }
        }
    `
};

/**
 * INTELLIGENT ENTITY RESOLVER - Finds OpenTargets IDs for any entity
 */
class EntityResolver {
    async resolveEntity(entityName, entityType) {
        console.log(`🔍 Resolving ${entityType}: ${entityName}`);
        
        try {
            if (this.looksLikeId(entityName, entityType)) {
                return { id: entityName, name: entityName, type: entityType };
            }
            
            const searchData = await executeGraphQL(BIOLOGY_QUERIES.universalSearch, {
                queryString: entityName,
                entityNames: [entityType],
                size: 10
            });
            
            if (searchData?.search?.hits?.length > 0) {
                const hit = searchData.search.hits[0];
                return {
                    id: hit.id,
                    name: hit.name,
                    type: entityType,
                    data: hit.object,
                    score: hit.score
                };
            }
            
            return null;
        } catch (error) {
            console.error(`Error resolving ${entityType} ${entityName}:`, error);
            return null;
        }
    }
    
    looksLikeId(entityName, entityType) {
        if (entityType === 'drug' && entityName.startsWith('CHEMBL')) return true;
        if (entityType === 'target' && entityName.startsWith('ENSG')) return true;
        if (entityType === 'disease' && entityName.startsWith('EFO_')) return true;
        return false;
    }
}

/**
 * COMPREHENSIVE DATA PROCESSOR - Formats results in ALL required CSV formats
 */
class BiologyDataProcessor {
    process(data, intent) {
        console.log(`📊 Processing ${intent.type} data with pattern: ${intent.specificPattern}`);
        
        switch (intent.specificPattern) {
            case 'phase_diseases':
                return this.processPhaseDiseases(data, intent);
            case 'approved_diseases':
                return this.processApprovedDiseases(data, intent);
            case 'toxicities':
                return this.processToxicities(data, intent);
            case 'binding_affinities':
                return this.processBindingAffinities(data, intent);
            case 'target_diseases':
                return this.processTargetDiseases(data, intent);
            case 'interacting_partners':
                return this.processInteractingPartners(data, intent);
            case 'disease_compounds':
                return this.processDiseaseCompounds(data, intent);
            default:
                return this.processDefault(data, intent);
        }
    }
    
    // Processes: "List the diseases in Phase-2 for Imatinib"
    processPhaseDiseases(drugData, intent) {
        if (!drugData?.drug?.linkedDiseases?.rows) return [];
        
        const results = [];
        const phaseFilter = intent.phaseFilter;
        
        console.log(`📊 Processing phase ${phaseFilter} diseases for ${drugData.drug.name}`);
        
        const diseaseAssociations = [];
        
        drugData.drug.linkedDiseases.rows.forEach((association) => {
            const phase = association.maxPhaseForIndication || association.clinicalTrialPhase;
            
            if (phaseFilter !== null && phase !== phaseFilter) {
                return;
            }
            
            results.push({
                id: `OT-phase-disease-${drugData.drug.id}-${association.disease.id}`,
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
            
            // Format exactly like imatinib_phase2_diseases.csv
            diseaseAssociations.push({
                disease: association.disease.name,
                maxPhaseForIndication: phase
            });
        });
        
        return results;
    }
    
    // Processes: "List the diseases for which Rituximab is approved"
    processApprovedDiseases(drugData, intent) {
        if (!drugData?.drug?.linkedDiseases?.rows) return [];
        
        const results = [];
        const diseaseAssociations = [];
        
        drugData.drug.linkedDiseases.rows.forEach((association) => {
            const phase = association.maxPhaseForIndication || association.clinicalTrialPhase;
            
            // Only include approved (Phase 4) diseases
            if (phase !== 4) return;
            
            results.push({
                id: `OT-approved-disease-${drugData.drug.id}-${association.disease.id}`,
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
            
            // Format exactly like rituximab_approved_diseases.csv
            diseaseAssociations.push({
                disease: association.disease.name,
                maxPhaseForIndication: phase
            });
        });
        
        return results;
    }
    
    // Processes: "For Dasatinib, list the various toxicities"
    processToxicities(drugData, intent) {
        const results = [];
        const toxicityAssociations = [];
        
        // Process safety liabilities
        if (drugData?.drug?.safetyLiabilities) {
            drugData.drug.safetyLiabilities.forEach((safety, index) => {
                results.push({
                    id: `OT-toxicity-${drugData.drug.id}-${index}`,
                    database: 'Open Targets',
                    title: `${drugData.drug.name} - ${safety.event}`,
                    type: `Drug Toxicity - ${safety.event}`,
                    status_significance: 'Safety Liability',
                    details: `Toxicity: ${safety.event}. Biosamples: ${safety.biosamples?.join(', ') || 'N/A'}`,
                    phase: 'N/A',
                    status: 'Safety Data',
                    sponsor: 'N/A',
                    year: new Date().getFullYear(),
                    enrollment: 'N/A',
                    link: `${OPENTARGETS_CONFIG.platformUrl}/drug/${drugData.drug.id}`,
                    
                    drug_name: drugData.drug.name,
                    toxicity_event: safety.event,
                    entity_type: 'drug-toxicity',
                    
                    raw_data: safety
                });
                
                // Format exactly like dasatinib_toxicities_opentargets.csv
                toxicityAssociations.push({
                    warningType: safety.event,
                    toxicityClass: safety.event,
                    efoIdForWarningClass: safety.efoIdForWarningClass || 'N/A',
                    references: safety.literature?.join(';') || 'N/A'
                });
            });
        }
        
        // Process adverse events
        if (drugData?.drug?.adverseEvents?.rows) {
            drugData.drug.adverseEvents.rows.forEach((adverse, index) => {
                results.push({
                    id: `OT-adverse-${drugData.drug.id}-${index}`,
                    database: 'Open Targets',
                    title: `${drugData.drug.name} - ${adverse.name}`,
                    type: `Adverse Event - ${adverse.name}`,
                    status_significance: 'Adverse Event',
                    details: `Adverse event: ${adverse.name}. LogLR: ${adverse.logLR}, Reports: ${adverse.count}`,
                    phase: 'N/A',
                    status: 'Adverse Event',
                    sponsor: 'FDA FAERS',
                    year: new Date().getFullYear(),
                    enrollment: 'N/A',
                    link: `${OPENTARGETS_CONFIG.platformUrl}/drug/${drugData.drug.id}`,
                    
                    drug_name: drugData.drug.name,
                    adverse_event: adverse.name,
                    entity_type: 'drug-adverse-event',
                    
                    raw_data: adverse
                });
                
                toxicityAssociations.push({
                    warningType: adverse.name,
                    toxicityClass: 'Adverse Event',
                    efoIdForWarningClass: adverse.meddraCode || 'N/A',
                    references: `FAERS LogLR: ${adverse.logLR}`
                });
            });
        }
        
        return results;
    }
    
    // Processes: "For compound X, list all the targets and their binding affinities"
    processBindingAffinities(drugData, intent) {
        if (!drugData?.drug?.linkedTargets?.rows) return [];
        
        const results = [];
        const affinityAssociations = [];
        
        drugData.drug.linkedTargets.rows.forEach((association, index) => {
            results.push({
                id: `OT-binding-${drugData.drug.id}-${association.target.id}-${index}`,
                database: 'Open Targets',
                title: `${drugData.drug.name} → ${association.target.approvedSymbol}`,
                type: `Drug-Target Binding - ${association.mechanismOfAction || 'Unknown MOA'}`,
                status_significance: 'Target Binding',
                details: `${drugData.drug.name} binds to ${association.target.approvedSymbol} via ${association.mechanismOfAction || 'unknown mechanism'}`,
                phase: 'N/A',
                status: 'Binding Data',
                sponsor: 'N/A',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPENTARGETS_CONFIG.platformUrl}/target/${association.target.id}`,
                
                drug_name: drugData.drug.name,
                target_symbol: association.target.approvedSymbol,
                entity_type: 'drug-target-binding',
                
                raw_data: association
            });
            
            // Format exactly like CHEMBL25_binding_affinities_opentargets.csv
            affinityAssociations.push({
                mechanismOfAction: association.mechanismOfAction || 'Unknown',
                targets: association.target.approvedSymbol,
                actionType: association.actionType || 'Unknown',
                references: association.references?.map(ref => ref.source).join(';') || 'N/A'
            });
        });
        
        return results;
    }
    
    // Processes: "List the diseases associated with JAK2"
    processTargetDiseases(targetData, intent) {
        if (!targetData?.target?.associatedDiseases?.rows) return [];
        
        const results = [];
        const diseaseAssociations = [];
        
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
            
            // Format exactly like jak2_associated_diseases_opentarget.csv
            diseaseAssociations.push({
                disease: association.disease.name,
                datasourceScores: JSON.stringify(association.datatypeScores || [])
            });
        });
        
        return results;
    }
    
    // Processes: "For Target X, list all the interacting partners"
    processInteractingPartners(targetData, intent) {
        if (!targetData?.target?.interactions?.rows) return [];
        
        const results = [];
        const partnerAssociations = [];
        
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
            
            // Format exactly like ENSG00000141510_interacting_partners.csv
            partnerAssociations.push({
                targetA: targetData.target.approvedSymbol,
                targetB: interaction.targetB.approvedSymbol,
                score: interaction.score
            });
        });
        
        return results;
    }
    
    // Processes: "List of approved compounds for a disease A"
    processDiseaseCompounds(diseaseData, intent) {
        if (!diseaseData?.disease?.knownDrugs?.rows) return [];
        
        const results = [];
        const compoundAssociations = [];
        
        diseaseData.disease.knownDrugs.rows.forEach((drugAssoc, index) => {
            const drug = drugAssoc.drug;
            
            // Only include approved drugs
            if (!drug.isApproved) return;
            
            results.push({
                id: `OT-disease-approved-drug-${diseaseData.disease.id}-${drug.id}-${index}`,
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
            
            // Format exactly like EFO_0000756_approved_compounds_opentarget.csv
            compoundAssociations.push({
                drug: drug.name
            });
        });
        
        return results;
    }
    
    // Default processor for other patterns
    processDefault(data, intent) {
        // Use existing processing logic for unspecified patterns
        if (intent.type === 'drug-diseases') {
            return this.processDrugDiseases(data, intent);
        } else if (intent.type === 'drug-targets') {
            return this.processDrugTargets(data, intent);
        } else if (intent.type === 'target-diseases') {
            return this.processTargetDiseases(data, intent);
        } else if (intent.type === 'target-interactions') {
            return this.processInteractingPartners(data, intent);
        } else if (intent.type === 'disease-compounds') {
            return this.processDiseaseCompounds(data, intent);
        } else {
            return this.processGeneralSearch(data, intent);
        }
    }
    
    // Helper method for drug diseases (original)
    processDrugDiseases(drugData, intent) {
        if (!drugData?.drug?.linkedDiseases?.rows) return [];
        
        const results = [];
        
        drugData.drug.linkedDiseases.rows.forEach((association, index) => {
            const phase = association.maxPhaseForIndication || association.clinicalTrialPhase;
            
            results.push({
                id: `OT-drug-disease-${drugData.drug.id}-${association.disease.id}-${index}`,
                database: 'Open Targets',
                title: `${drugData.drug.name} for ${association.disease.name}`,
                type: `Drug-Disease Association - Phase ${phase || 'Unknown'}`,
                status_significance: association.status || 'Clinical Association',
                details: `${drugData.drug.name} studied for ${association.disease.name}. Max phase: ${phase || 'unknown'}`,
                phase: phase ? `Phase ${phase}` : 'Unknown',
                status: association.status || 'Clinical Data',
                sponsor: 'Multiple',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPENTARGETS_CONFIG.platformUrl}/evidence/${drugData.drug.id}/${association.disease.id}`,
                
                drug_name: drugData.drug.name,
                disease_name: association.disease.name,
                entity_type: 'drug-disease-association',
                
                raw_data: association
            });
        });
        
        return results;
    }
    
    // Helper method for drug targets (original)
    processDrugTargets(drugData, intent) {
        if (!drugData?.drug?.linkedTargets?.rows) return [];
        
        const results = [];
        
        drugData.drug.linkedTargets.rows.forEach((association, index) => {
            results.push({
                id: `OT-drug-target-${drugData.drug.id}-${association.target.id}-${index}`,
                database: 'Open Targets',
                title: `${drugData.drug.name} → ${association.target.approvedSymbol}`,
                type: `Drug-Target Interaction - ${association.mechanismOfAction || 'Unknown MOA'}`,
                status_significance: 'Target Interaction',
                details: `${drugData.drug.name} targets ${association.target.approvedSymbol} via ${association.mechanismOfAction || 'unknown mechanism'}`,
                phase: 'N/A',
                status: 'Target Data',
                sponsor: 'N/A',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPENTARGETS_CONFIG.platformUrl}/target/${association.target.id}`,
                
                drug_name: drugData.drug.name,
                target_symbol: association.target.approvedSymbol,
                entity_type: 'drug-target-association',
                
                raw_data: association
            });
        });
        
        return results;
    }
    
    // Helper method for general search (original)
    processGeneralSearch(searchData, intent) {
        if (!searchData?.search?.hits) return [];
        
        return searchData.search.hits.map((hit, index) => {
            const entity = hit.object || hit;
            
            return {
                id: `OT-general-${hit.id}-${index}`,
                database: 'Open Targets',
                title: entity.name || hit.name || 'Unknown',
                type: `${hit.entity || 'Unknown'} - ${entity.drugType || entity.biotype || 'Open Targets'}`,
                status_significance: 'Research Available',
                details: `OpenTargets ${hit.entity} entry: ${entity.name || hit.name}`,
                phase: entity.maximumClinicalTrialPhase ? `Phase ${entity.maximumClinicalTrialPhase}` : 'N/A',
                status: entity.isApproved ? 'Approved' : 'Research Available',
                sponsor: 'Open Targets Platform',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPENTARGETS_CONFIG.platformUrl}/${hit.entity}/${hit.id}`,
                
                entity_type: hit.entity,
                entity_id: hit.id,
                
                raw_data: entity
            };
        });
    }
}

/**
 * Execute GraphQL with proper error handling
 */
async function executeGraphQL(query, variables) {
    try {
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
        }
        
        return data.data;
    } catch (error) {
        console.error('OpenTargets GraphQL error:', error);
        throw error;
    }
}

/**
 * MAIN COMPREHENSIVE SEARCH FUNCTION
 */
async function comprehensiveBiologySearch(query, limit = 100) {
    console.log(`🤖 Comprehensive Biology AI processing: "${query}"`);
    
    const intelligence = new BiologyQueryIntelligence();
    const resolver = new EntityResolver();
    const processor = new BiologyDataProcessor();
    
    const intent = intelligence.parseQuery(query);
    console.log(`🧠 Parsed intent:`, intent);
    
    let results = [];
    
    try {
        if (intent.type.startsWith('drug-')) {
            results = await handleDrugQuery(intent, resolver, processor);
        } else if (intent.type.startsWith('target-')) {
            results = await handleTargetQuery(intent, resolver, processor);
        } else if (intent.type.startsWith('disease-')) {
            results = await handleDiseaseQuery(intent, resolver, processor);
        } else {
            results = await handleGeneralQuery(intent, processor);
        }
        
    } catch (error) {
        console.error('Error in comprehensive search:', error);
        results = await handleGeneralQuery(intent, processor);
    }
    
    console.log(`✅ Comprehensive AI returned ${results.length} results`);
    return { results, intent };
}

async function handleDrugQuery(intent, resolver, processor) {
    const drug = await resolver.resolveEntity(intent.entity, 'drug');
    if (!drug) {
        throw new Error(`Could not resolve drug: ${intent.entity}`);
    }
    
    console.log(`💊 Resolved drug: ${drug.name} (${drug.id})`);
    
    let data;
    
    if (intent.specificPattern === 'toxicities' || intent.relationship === 'toxicities') {
        data = await executeGraphQL(BIOLOGY_QUERIES.drugSafety, { drugId: drug.id });
    } else if (intent.specificPattern === 'binding_affinities' || intent.relationship === 'binding_affinities') {
        data = await executeGraphQL(BIOLOGY_QUERIES.drugTargets, { drugId: drug.id });
    } else {
        data = await executeGraphQL(BIOLOGY_QUERIES.drugDiseases, { drugId: drug.id });
    }
    
    return processor.process(data, intent);
}

async function handleTargetQuery(intent, resolver, processor) {
    const target = await resolver.resolveEntity(intent.entity, 'target');
    if (!target) {
        throw new Error(`Could not resolve target: ${intent.entity}`);
    }
    
    console.log(`🎯 Resolved target: ${target.name} (${target.id})`);
    
    let data;
    
    if (intent.specificPattern === 'interacting_partners' || intent.relationship === 'interactions') {
        data = await executeGraphQL(BIOLOGY_QUERIES.targetInteractions, { targetId: target.id });
    } else {
        data = await executeGraphQL(BIOLOGY_QUERIES.targetDiseases, { targetId: target.id });
    }
    
    return processor.process(data, intent);
}

async function handleDiseaseQuery(intent, resolver, processor) {
    const disease = await resolver.resolveEntity(intent.entity, 'disease');
    if (!disease) {
        throw new Error(`Could not resolve disease: ${intent.entity}`);
    }
    
    console.log(`🦠 Resolved disease: ${disease.name} (${disease.id})`);
    
    const data = await executeGraphQL(BIOLOGY_QUERIES.diseaseCompounds, { diseaseId: disease.id });
    return processor.process(data, intent);
}

async function handleGeneralQuery(intent, processor) {
    console.log(`🔍 Performing general search for: ${intent.entity || intent.originalQuery}`);
    
    const data = await executeGraphQL(BIOLOGY_QUERIES.universalSearch, {
        queryString: intent.entity || intent.originalQuery,
        entityNames: ['drug', 'target', 'disease'],
        size: 50
    });
    
    return processor.process(data, intent);
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
        console.log(`🤖 Comprehensive Biology AI search for: "${query}"`);
        
        const { results, intent } = await comprehensiveBiologySearch(query, parseInt(limit));
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        // Create biologist data format based on specific patterns
        let biologist_data = null;
        
        if (intent.specificPattern === 'phase_diseases') {
            biologist_data = results
                .filter(r => r.entity_type === 'drug-phase-disease')
                .map(r => ({
                    disease: r.disease_name,
                    maxPhaseForIndication: r.phase_number
                }));
        } else if (intent.specificPattern === 'approved_diseases') {
            biologist_data = results
                .filter(r => r.entity_type === 'drug-approved-disease')
                .map(r => ({
                    disease: r.disease_name,
                    maxPhaseForIndication: 4
                }));
        } else if (intent.specificPattern === 'toxicities') {
            biologist_data = results
                .filter(r => r.entity_type === 'drug-toxicity' || r.entity_type === 'drug-adverse-event')
                .map(r => ({
                    warningType: r.toxicity_event || r.adverse_event,
                    toxicityClass: r.toxicity_event || 'Adverse Event',
                    efoIdForWarningClass: 'N/A',
                    references: 'OpenTargets'
                }));
        } else if (intent.specificPattern === 'binding_affinities') {
            biologist_data = results
                .filter(r => r.entity_type === 'drug-target-binding')
                .map(r => ({
                    mechanismOfAction: r.raw_data?.mechanismOfAction || 'Unknown',
                    targets: r.target_symbol,
                    actionType: r.raw_data?.actionType || 'Unknown',
                    references: 'OpenTargets'
                }));
        } else if (intent.specificPattern === 'target_diseases') {
            biologist_data = results
                .filter(r => r.entity_type === 'target-disease-association')
                .map(r => ({
                    disease: r.disease_name,
                    datasourceScores: JSON.stringify(r.raw_data?.datatypeScores || [])
                }));
        } else if (intent.specificPattern === 'interacting_partners') {
            biologist_data = results
                .filter(r => r.entity_type === 'target-interaction')
                .map(r => ({
                    targetA: r.target_a,
                    targetB: r.target_b,
                    score: r.raw_data?.score || 0
                }));
        } else if (intent.specificPattern === 'disease_compounds') {
            biologist_data = results
                .filter(r => r.entity_type === 'disease-approved-drug')
                .map(r => ({
                    drug: r.drug_name
                }));
        }
        
        console.log(`🎉 Comprehensive Biology AI completed: ${results.length} results in ${responseTime}ms`);
        console.log(`📊 Biologist data format created: ${biologist_data?.length || 0} entries`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            intent: intent,
            biologist_data: biologist_data, // Exact CSV format for each query pattern
            search_timestamp: new Date().toISOString(),
            response_time: responseTime,
            api_status: 'success',
            system: 'Comprehensive Agentic Biology AI - OpenTargets Intelligence',
            data_source: 'Open Targets Platform GraphQL API'
        });

    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.error('Comprehensive Biology AI error:', error);
        
        return res.status(500).json({
            error: 'Comprehensive Biology AI error',
            message: error.message,
            results: [],
            total: 0,
            query: query,
            response_time: responseTime,
            search_timestamp: new Date().toISOString()
        });
    }
}
