// api/search/opentargets.js - AGENTIC BIOLOGY AI SYSTEM
// Intelligent system that understands biological relationships and responds dynamically

/**
 * AGENTIC BIOLOGY AI - OpenTargets Intelligence System
 * 
 * This system learns from biology team patterns but handles ANY biological query dynamically:
 * - Drug → Diseases (any phase, approved, etc.)
 * - Drug → Targets & Binding Affinities  
 * - Drug → Toxicities & Adverse Events
 * - Target → Associated Diseases
 * - Target → Interacting Partners
 * - Disease → Approved/Investigational Compounds
 * - And many more biological relationships...
 */

const OPENTARGETS_CONFIG = {
    baseUrl: 'https://api.platform.opentargets.org/api/v4/graphql',
    platformUrl: 'https://platform.opentargets.org',
    timeout: 30000
};

/**
 * INTELLIGENT QUERY PARSER - Understands biological intent
 */
class BiologyQueryIntelligence {
    constructor() {
        this.entityTypes = ['drug', 'target', 'disease', 'compound', 'gene', 'protein'];
        this.relationshipTypes = [
            'diseases', 'targets', 'toxicities', 'adverse_events', 'side_effects',
            'binding_affinities', 'mechanisms', 'interactions', 'partners',
            'compounds', 'drugs', 'indications', 'warnings', 'contraindications',
            'pathways', 'biomarkers', 'mutations', 'variants'
        ];
        this.qualifiers = [
            'phase-1', 'phase-2', 'phase-3', 'phase-4', 'approved', 'clinical',
            'investigational', 'experimental', 'black_box', 'serious', 'common'
        ];
    }

    /**
     * Parse any biological query and understand intent
     */
    parseQuery(query) {
        const cleanQuery = query.toLowerCase().trim();
        
        // Extract biological entities and relationships
        const intent = {
            type: 'unknown',
            entity: null,
            entityType: null,
            relationship: null,
            qualifiers: [],
            originalQuery: query,
            confidence: 0
        };

        // PATTERN 1: Drug/Compound queries
        if (this.matchesDrugPattern(cleanQuery)) {
            intent.entityType = 'drug';
            intent.entity = this.extractEntity(cleanQuery, 'drug');
            intent.relationship = this.extractRelationship(cleanQuery);
            intent.qualifiers = this.extractQualifiers(cleanQuery);
            intent.type = `drug-${intent.relationship}`;
            intent.confidence = 0.9;
        }
        
        // PATTERN 2: Target/Gene/Protein queries  
        else if (this.matchesTargetPattern(cleanQuery)) {
            intent.entityType = 'target';
            intent.entity = this.extractEntity(cleanQuery, 'target');
            intent.relationship = this.extractRelationship(cleanQuery);
            intent.qualifiers = this.extractQualifiers(cleanQuery);
            intent.type = `target-${intent.relationship}`;
            intent.confidence = 0.9;
        }
        
        // PATTERN 3: Disease queries
        else if (this.matchesDiseasePattern(cleanQuery)) {
            intent.entityType = 'disease';
            intent.entity = this.extractEntity(cleanQuery, 'disease');
            intent.relationship = this.extractRelationship(cleanQuery);
            intent.qualifiers = this.extractQualifiers(cleanQuery);
            intent.type = `disease-${intent.relationship}`;
            intent.confidence = 0.9;
        }
        
        // PATTERN 4: General biological search
        else {
            intent.type = 'general_search';
            intent.entity = cleanQuery;
            intent.confidence = 0.6;
        }

        return intent;
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
        // Extract the main biological entity being queried
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
        // Determine what biological relationship is being asked for
        if (query.includes('diseases') || query.includes('indications')) return 'diseases';
        if (query.includes('targets') || query.includes('proteins')) return 'targets';
        if (query.includes('toxicities') || query.includes('adverse') || query.includes('side effects')) return 'toxicities';
        if (query.includes('binding') || query.includes('affinities')) return 'binding_affinities';
        if (query.includes('interactions') || query.includes('partners')) return 'interactions';
        if (query.includes('compounds') || query.includes('drugs')) return 'compounds';
        if (query.includes('mechanisms') || query.includes('pathways')) return 'mechanisms';
        if (query.includes('warnings') || query.includes('contraindications')) return 'warnings';
        
        return 'general';
    }

    extractQualifiers(query) {
        const qualifiers = [];
        
        // Phase qualifiers
        const phaseMatch = query.match(/phase[-\s]*(\d+|i{1,4}|iv)/i);
        if (phaseMatch) {
            const phase = phaseMatch[1].toLowerCase();
            const phaseMap = { 'i': '1', 'ii': '2', 'iii': '3', 'iv': '4' };
            qualifiers.push(`phase-${phaseMap[phase] || phase}`);
        }
        
        // Approval status
        if (query.includes('approved')) qualifiers.push('approved');
        if (query.includes('investigational') || query.includes('experimental')) qualifiers.push('investigational');
        if (query.includes('clinical')) qualifiers.push('clinical');
        
        // Severity/Type qualifiers
        if (query.includes('black box') || query.includes('serious')) qualifiers.push('serious');
        if (query.includes('common') || query.includes('frequent')) qualifiers.push('common');
        
        return qualifiers;
    }
}

/**
 * COMPREHENSIVE GRAPHQL QUERIES for all biological relationships
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
            // First try direct ID lookup if it looks like an ID
            if (this.looksLikeId(entityName, entityType)) {
                return { id: entityName, name: entityName, type: entityType };
            }
            
            // Search for the entity
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
 * DYNAMIC DATA PROCESSOR - Formats results in biology team structure
 */
class BiologyDataProcessor {
    process(data, intent) {
        console.log(`📊 Processing ${intent.type} data...`);
        
        switch (intent.type) {
            case 'drug-diseases':
                return this.processDrugDiseases(data, intent);
            case 'drug-targets':
                return this.processDrugTargets(data, intent);
            case 'drug-toxicities':
                return this.processDrugToxicities(data, intent);
            case 'target-diseases':
                return this.processTargetDiseases(data, intent);
            case 'target-interactions':
                return this.processTargetInteractions(data, intent);
            case 'disease-compounds':
                return this.processDiseaseCompounds(data, intent);
            default:
                return this.processGeneralSearch(data, intent);
        }
    }
    
    processDrugDiseases(drugData, intent) {
        if (!drugData?.drug?.linkedDiseases?.rows) return [];
        
        const results = [];
        const phaseFilter = this.getPhaseFilter(intent.qualifiers);
        const approvedOnly = intent.qualifiers.includes('approved');
        
        // Main drug entry
        results.push({
            id: `OT-drug-${drugData.drug.id}`,
            database: 'Open Targets',
            title: `${drugData.drug.name} - Drug Profile`,
            type: `Drug - ${drugData.drug.drugType || 'Unknown'}`,
            status_significance: drugData.drug.isApproved ? 'Approved Drug' : 'Clinical Development',
            details: this.createDrugDescription(drugData.drug),
            phase: drugData.drug.maximumClinicalTrialPhase ? `Phase ${drugData.drug.maximumClinicalTrialPhase}` : 'Unknown',
            status: drugData.drug.isApproved ? 'Approved' : 'In Development',
            sponsor: 'Multiple (See Open Targets)',
            year: drugData.drug.yearOfFirstApproval || new Date().getFullYear(),
            enrollment: 'N/A',
            link: `${OPENTARGETS_CONFIG.platformUrl}/drug/${drugData.drug.id}`,
            
            // Enhanced drug data
            drug_name: drugData.drug.name,
            drug_id: drugData.drug.id,
            entity_type: 'drug',
            total_disease_associations: drugData.drug.linkedDiseases.count,
            
            raw_data: drugData.drug
        });
        
        // Process disease associations with filtering
        drugData.drug.linkedDiseases.rows.forEach((association, index) => {
            const phase = association.maxPhaseForIndication || association.clinicalTrialPhase;
            
            // Apply filters
            if (phaseFilter !== null && phase !== phaseFilter) return;
            if (approvedOnly && phase !== 4) return;
            
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
                
                // Biology team format
                drug_name: drugData.drug.name,
                disease_name: association.disease.name,
                disease_id: association.disease.id,
                max_phase_for_indication: association.maxPhaseForIndication,
                clinical_trial_phase: association.clinicalTrialPhase,
                phase_number: phase,
                entity_type: 'drug-disease-association',
                
                raw_data: association
            });
        });
        
        return results;
    }
    
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
                
                // Biology team format
                drug_name: drugData.drug.name,
                target_symbol: association.target.approvedSymbol,
                target_name: association.target.approvedName,
                target_id: association.target.id,
                mechanism_of_action: association.mechanismOfAction,
                action_type: association.actionType,
                references: association.references,
                entity_type: 'drug-target-association',
                
                raw_data: association
            });
        });
        
        return results;
    }
    
    processDrugToxicities(drugData, intent) {
        const results = [];
        
        if (drugData?.drug?.safetyLiabilities) {
            drugData.drug.safetyLiabilities.forEach((safety, index) => {
                results.push({
                    id: `OT-drug-toxicity-${drugData.drug.id}-${index}`,
                    database: 'Open Targets',
                    title: `${drugData.drug.name} - ${safety.event}`,
                    type: `Drug Safety - ${safety.event}`,
                    status_significance: 'Safety Information',
                    details: `Safety liability: ${safety.event}. Biosamples: ${safety.biosamples?.join(', ') || 'N/A'}`,
                    phase: 'N/A',
                    status: 'Safety Data',
                    sponsor: 'N/A',
                    year: new Date().getFullYear(),
                    enrollment: 'N/A',
                    link: `${OPENTARGETS_CONFIG.platformUrl}/drug/${drugData.drug.id}`,
                    
                    // Biology team format
                    drug_name: drugData.drug.name,
                    warning_type: safety.event,
                    toxicity_class: safety.event,
                    effects: safety.effects,
                    biosamples: safety.biosamples,
                    datasource: safety.datasource,
                    literature: safety.literature,
                    entity_type: 'drug-toxicity',
                    
                    raw_data: safety
                });
            });
        }
        
        // Add black box warning if present
        if (drugData?.drug?.blackBoxWarning) {
            results.push({
                id: `OT-drug-blackbox-${drugData.drug.id}`,
                database: 'Open Targets',
                title: `${drugData.drug.name} - Black Box Warning`,
                type: 'Drug Safety - Black Box Warning',
                status_significance: 'Black Box Warning',
                details: `${drugData.drug.name} has FDA Black Box Warning`,
                phase: 'N/A',
                status: 'Black Box Warning',
                sponsor: 'FDA',
                year: new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPENTARGETS_CONFIG.platformUrl}/drug/${drugData.drug.id}`,
                
                warning_type: 'Black Box Warning',
                toxicity_class: 'Serious',
                drug_name: drugData.drug.name,
                entity_type: 'drug-warning',
                
                raw_data: { blackBoxWarning: true }
            });
        }
        
        return results;
    }
    
    processTargetDiseases(targetData, intent) {
        if (!targetData?.target?.associatedDiseases?.rows) return [];
        
        const results = [];
        
        // Main target entry
        results.push({
            id: `OT-target-${targetData.target.id}`,
            database: 'Open Targets',
            title: `${targetData.target.approvedSymbol} - ${targetData.target.approvedName}`,
            type: `Target - ${targetData.target.biotype || 'Protein'}`,
            status_significance: 'Drug Target',
            details: `Target: ${targetData.target.approvedSymbol}. Associated diseases: ${targetData.target.associatedDiseases.count}`,
            phase: 'N/A',
            status: 'Drug Target',
            sponsor: 'N/A',
            year: new Date().getFullYear(),
            enrollment: 'N/A',
            link: `${OPENTARGETS_CONFIG.platformUrl}/target/${targetData.target.id}`,
            
            target_symbol: targetData.target.approvedSymbol,
            target_name: targetData.target.approvedName,
            target_id: targetData.target.id,
            entity_type: 'target',
            total_disease_associations: targetData.target.associatedDiseases.count,
            
            raw_data: targetData.target
        });
        
        // Process disease associations
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
                
                // Biology team format
                target_symbol: targetData.target.approvedSymbol,
                disease_name: association.disease.name,
                disease_id: association.disease.id,
                association_score: association.score,
                datasource_scores: association.datatypeScores,
                entity_type: 'target-disease-association',
                
                raw_data: association
            });
        });
        
        return results;
    }
    
    processTargetInteractions(targetData, intent) {
        if (!targetData?.target?.interactions?.rows) return [];
        
        const results = [];
        
        targetData.target.interactions.rows.forEach((interaction, index) => {
            results.push({
                id: `OT-target-interaction-${targetData.target.id}-${interaction.targetB.id}-${index}`,
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
                
                // Biology team format
                target_a: {
                    id: targetData.target.id,
                    approvedSymbol: targetData.target.approvedSymbol,
                    approvedName: targetData.target.approvedName
                },
                target_b: {
                    id: interaction.targetB.id,
                    approvedSymbol: interaction.targetB.approvedSymbol,
                    approvedName: interaction.targetB.approvedName
                },
                interaction_score: interaction.score,
                source_database: interaction.sourceDatabase,
                interaction_type: interaction.intType,
                entity_type: 'target-interaction',
                
                raw_data: interaction
            });
        });
        
        return results;
    }
    
    processDiseaseCompounds(diseaseData, intent) {
        if (!diseaseData?.disease?.knownDrugs?.rows) return [];
        
        const results = [];
        const approvedOnly = intent.qualifiers.includes('approved');
        
        diseaseData.disease.knownDrugs.rows.forEach((drugAssoc, index) => {
            const drug = drugAssoc.drug;
            
            // Apply approved filter if requested
            if (approvedOnly && !drug.isApproved) return;
            
            results.push({
                id: `OT-disease-drug-${diseaseData.disease.id}-${drug.id}-${index}`,
                database: 'Open Targets',
                title: `${drug.name} for ${diseaseData.disease.name}`,
                type: `Disease-Drug Association - ${drug.isApproved ? 'Approved' : 'Investigational'}`,
                status_significance: drug.isApproved ? 'Approved Treatment' : 'Investigational',
                details: `${drug.name} ${drug.isApproved ? 'approved' : 'investigated'} for ${diseaseData.disease.name}. Max phase: ${drug.maximumClinicalTrialPhase}`,
                phase: drug.maximumClinicalTrialPhase ? `Phase ${drug.maximumClinicalTrialPhase}` : 'Unknown',
                status: drugAssoc.status || (drug.isApproved ? 'Approved' : 'Clinical'),
                sponsor: 'Multiple',
                year: drug.yearOfFirstApproval || new Date().getFullYear(),
                enrollment: 'N/A',
                link: `${OPENTARGETS_CONFIG.platformUrl}/evidence/${drug.id}/${diseaseData.disease.id}`,
                
                // Biology team format
                drug_name: drug.name,
                drug_id: drug.id,
                disease_name: diseaseData.disease.name,
                is_approved: drug.isApproved,
                year_of_first_approval: drug.yearOfFirstApproval,
                maximum_clinical_trial_phase: drug.maximumClinicalTrialPhase,
                black_box_warning: drug.blackBoxWarning,
                mechanism_of_action: drugAssoc.mechanismOfAction,
                clinical_trial_phase: drugAssoc.clinicalTrialPhase,
                entity_type: 'disease-drug-association',
                
                raw_data: drugAssoc
            });
        });
        
        return results;
    }
    
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
                score: hit.score || 0,
                
                raw_data: entity
            };
        });
    }
    
    // Helper methods
    getPhaseFilter(qualifiers) {
        const phaseQualifier = qualifiers.find(q => q.startsWith('phase-'));
        return phaseQualifier ? parseInt(phaseQualifier.split('-')[1]) : null;
    }
    
    createDrugDescription(drug) {
        const parts = [];
        if (drug.drugType) parts.push(`Type: ${drug.drugType}`);
        if (drug.maximumClinicalTrialPhase) parts.push(`Max Phase: ${drug.maximumClinicalTrialPhase}`);
        if (drug.isApproved) parts.push('Status: Approved');
        if (drug.yearOfFirstApproval) parts.push(`First Approval: ${drug.yearOfFirstApproval}`);
        if (drug.blackBoxWarning) parts.push('⚠️ Black Box Warning');
        return parts.join(' | ');
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
 * MAIN AGENTIC AI SEARCH FUNCTION
 */
async function agenticBiologySearch(query, limit = 100) {
    console.log(`🤖 Agentic Biology AI processing: "${query}"`);
    
    // Initialize AI components
    const intelligence = new BiologyQueryIntelligence();
    const resolver = new EntityResolver();
    const processor = new BiologyDataProcessor();
    
    // Parse query intent
    const intent = intelligence.parseQuery(query);
    console.log(`🧠 Parsed intent:`, intent);
    
    if (intent.confidence < 0.5) {
        console.log('⚠️ Low confidence query, falling back to general search');
        intent.type = 'general_search';
    }
    
    let results = [];
    
    try {
        // Route to appropriate handler based on intent
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
        console.error('Error in agentic search:', error);
        // Fallback to general search
        results = await handleGeneralQuery(intent, processor);
    }
    
    console.log(`✅ Agentic AI returned ${results.length} results`);
    return results;
}

async function handleDrugQuery(intent, resolver, processor) {
    // Resolve drug entity
    const drug = await resolver.resolveEntity(intent.entity, 'drug');
    if (!drug) {
        throw new Error(`Could not resolve drug: ${intent.entity}`);
    }
    
    console.log(`💊 Resolved drug: ${drug.name} (${drug.id})`);
    
    // Choose appropriate query based on relationship
    let queryType, data;
    
    if (intent.relationship === 'diseases') {
        data = await executeGraphQL(BIOLOGY_QUERIES.drugDiseases, { drugId: drug.id });
        return processor.process(data, intent);
    } else if (intent.relationship === 'targets') {
        data = await executeGraphQL(BIOLOGY_QUERIES.drugTargets, { drugId: drug.id });
        return processor.process(data, intent);
    } else if (intent.relationship === 'toxicities' || intent.relationship === 'adverse_events') {
        data = await executeGraphQL(BIOLOGY_QUERIES.drugSafety, { drugId: drug.id });
        return processor.process(data, intent);
    } else {
        // Default to diseases for drug queries
        data = await executeGraphQL(BIOLOGY_QUERIES.drugDiseases, { drugId: drug.id });
        return processor.process(data, intent);
    }
}

async function handleTargetQuery(intent, resolver, processor) {
    // Resolve target entity
    const target = await resolver.resolveEntity(intent.entity, 'target');
    if (!target) {
        throw new Error(`Could not resolve target: ${intent.entity}`);
    }
    
    console.log(`🎯 Resolved target: ${target.name} (${target.id})`);
    
    let data;
    
    if (intent.relationship === 'diseases') {
        data = await executeGraphQL(BIOLOGY_QUERIES.targetDiseases, { targetId: target.id });
        return processor.process(data, intent);
    } else if (intent.relationship === 'interactions') {
        data = await executeGraphQL(BIOLOGY_QUERIES.targetInteractions, { targetId: target.id });
        return processor.process(data, intent);
    } else {
        // Default to diseases for target queries
        data = await executeGraphQL(BIOLOGY_QUERIES.targetDiseases, { targetId: target.id });
        return processor.process(data, intent);
    }
}

async function handleDiseaseQuery(intent, resolver, processor) {
    // Resolve disease entity
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
    // CORS headers
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
                'Drug: List the diseases in Phase-2 for Imatinib',
                'Drug: List the targets for pembrolizumab',
                'Drug: List the toxicities for dasatinib', 
                'Target: List the diseases associated with JAK2',
                'Target: List the interacting partners for TP53',
                'Disease: List approved compounds for melanoma',
                'imatinib phase 2 diseases',
                'EGFR protein interactions',
                'cancer drug approvals'
            ]
        });
    }

    const startTime = performance.now();

    try {
        console.log(`🤖 Agentic Biology AI search for: "${query}"`);
        
        // Execute agentic search
        const results = await agenticBiologySearch(query, parseInt(limit));
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        // Create biology team data format if applicable
        const intelligence = new BiologyQueryIntelligence();
        const intent = intelligence.parseQuery(query);
        
        let biologist_data = null;
        if (intent.type === 'drug-diseases') {
            const phaseFilter = intent.qualifiers.find(q => q.startsWith('phase-'));
            if (phaseFilter) {
                const phase = parseInt(phaseFilter.split('-')[1]);
                biologist_data = results
                    .filter(r => r.entity_type === 'drug-disease-association' && r.phase_number === phase)
                    .map(r => ({
                        disease: { name: r.disease_name },
                        maxPhaseForIndication: r.max_phase_for_indication || r.phase_number
                    }));
            }
        }
        
        console.log(`🎉 Agentic Biology AI completed: ${results.length} results in ${responseTime}ms`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            intent: intent,
            biologist_data: biologist_data,
            search_timestamp: new Date().toISOString(),
            response_time: responseTime,
            api_status: 'success',
            system: 'Agentic Biology AI - OpenTargets Intelligence',
            data_source: 'Open Targets Platform GraphQL API'
        });

    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.error('Agentic Biology AI error:', error);
        
        return res.status(500).json({
            error: 'Agentic Biology AI error',
            message: error.message,
            results: [],
            total: 0,
            query: query,
            response_time: responseTime,
            search_timestamp: new Date().toISOString()
        });
    }
}
