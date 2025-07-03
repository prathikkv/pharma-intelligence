// 🧠 ENHANCED QUERY INTELLIGENCE SYSTEM (FIXED VERSION)
    const QueryIntelligence = {
        // Helper functions for entity extraction
        extractDrugName: (match) => {
            if (!match) return null;
            for (let i = 1; i < match.length; i++) {
                if (match[i] && match[i].length > 2 && !match[i].match(/^\d+$/)) {
                    return match[i].toLowerCase();
                }
            }
            return null;
        },

        extractTargetName: (match) => {
            if (!match) return null;
            for (let i = 1; i < match.length; i++) {
                if (match[i] && match[i].length > 2) {
                    return match[i].toUpperCase();
                }
            }
            return null;
        },

        extractDiseaseName: (match) => {
            if (!match) return null;
            for (let i = 1; i < match.length; i++) {
                if (match[i] && match[i].length > 2) {
                    return match[i];
                }
            }
            return null;
        },

        extractPhase: (match) => {
            if (!match) return null;
            for (let i = 1; i < match.length; i++) {
                if (match[i] && match[i].match(/^\d+$/)) {
                    return parseInt(match[i]);
                }
            }
            return null;
        },

        calculateConfidence: (match, query) => {
            const matchLength = match[0].length;
            const queryLength = query.length;
            return Math.min(0.95, (matchLength / queryLength) * 1.3);
        },

        // Comprehensive query patterns for all 8 use cases
        patterns: {
            // 1. Drug → Diseases by Phase (ENHANCED FOR IMATINIB PHASE 2)
            DRUG_DISEASES_PHASE: {
                regex: [
                    /(?:phase[-\s]?(\d+)|phase\s*(\d+)).*(?:for|of)\s+(\w+)/i,
                    /(\w+).*phase[-\s]?(\d+).*diseases?/i,
                    /(?:list|show|find|get).*diseases.*(?:phase[- ]?(\d+)|phase.*(\d+)).*(?:for|of)\s+(\w+)/i,
                    /diseases.*phase.*(\d+).*(\w+)/i,
                    /(\w+).*diseases.*phase[- ]?(\d+)/i
                ],
                extract: (query, match) => ({
                    entity: 'drug',
                    drug: QueryIntelligence.extractDrugName(match),
                    phase: QueryIntelligence.extractPhase(match),
                    action: 'get_diseases_by_phase'
                }),
                databases: ['opentargets', 'clinicaltrials'],
                examples: [
                    'Phase-2 for Imatinib',
                    'List diseases in Phase 2 for imatinib',
                    'imatinib phase 2 diseases',
                    'Phase 2 diseases for pembrolizumab'
                ]
            },

            // 2. Drug → Approved Diseases  
            DRUG_APPROVED_DISEASES: {
                regex: [
                    /(?:list|show|find|get).*diseases.*(?:approved|indication).*(?:for|of)\s+(\w+)/i,
                    /(\w+).*(?:approved|indication).*diseases/i,
                    /approved.*diseases.*(\w+)/i,
                    /(\w+).*approved.*(?:for|diseases)/i
                ],
                extract: (query, match) => ({
                    entity: 'drug',
                    drug: QueryIntelligence.extractDrugName(match),
                    action: 'get_approved_diseases'
                }),
                databases: ['opentargets', 'clinicaltrials'],
                examples: [
                    'List approved diseases for rituximab',
                    'rituximab approved diseases',
                    'What diseases is imatinib approved for'
                ]
            },

            // 3. Drug → Toxicities
            DRUG_TOXICITIES: {
                regex: [
                    /(?:list|show|find|get).*(?:toxicit|adverse|side.effect).*(?:for|of)\s+(\w+)/i,
                    /(\w+).*(?:toxicit|adverse|side.effect)/i,
                    /(?:toxicit|adverse).*(\w+)/i
                ],
                extract: (query, match) => ({
                    entity: 'drug',
                    drug: QueryIntelligence.extractDrugName(match),
                    action: 'get_toxicities'
                }),
                databases: ['opentargets', 'drugbank'],
                examples: [
                    'List toxicities for dasatinib',
                    'dasatinib adverse effects',
                    'Side effects of imatinib'
                ]
            },

            // 4. Compound → Targets & Binding Affinities
            COMPOUND_TARGETS: {
                regex: [
                    /(?:list|show|find|get).*(?:targets?|binding.*affinit).*(?:for|of)\s+(\w+)/i,
                    /(\w+).*(?:targets?|binding)/i,
                    /targets?.*(\w+)/i,
                    /binding.*affinit.*(\w+)/i
                ],
                extract: (query, match) => ({
                    entity: 'compound',
                    compound: QueryIntelligence.extractDrugName(match),
                    action: 'get_targets_and_binding'
                }),
                databases: ['opentargets', 'chembl'],
                examples: [
                    'List targets for compound CHEMBL25',
                    'CHEMBL25 binding affinities',
                    'What targets does imatinib bind to'
                ]
            },

            // 5. Target → Associated Diseases
            TARGET_DISEASES: {
                regex: [
                    /(?:list|show|find|get).*diseases.*associated.*(?:with|to)\s+(\w+)/i,
                    /(\w+).*associated.*diseases/i,
                    /diseases.*(\w+).*target/i,
                    /(\w+).*target.*diseases/i
                ],
                extract: (query, match) => ({
                    entity: 'target',
                    target: QueryIntelligence.extractTargetName(match),
                    action: 'get_associated_diseases'
                }),
                databases: ['opentargets'],
                examples: [
                    'List diseases associated with JAK2',
                    'JAK2 associated diseases',
                    'What diseases involve EGFR target'
                ]
            },

            // 6. Target → Interacting Partners
            TARGET_INTERACTIONS: {
                regex: [
                    /(?:list|show|find|get).*(?:interacting|interaction).*partners.*(?:for|of)\s+(\w+)/i,
                    /(\w+).*(?:interacting|interaction).*partners/i,
                    /(?:proteins?|genes?).*interact.*(\w+)/i,
                    /(\w+).*interact/i
                ],
                extract: (query, match) => ({
                    entity: 'target',
                    target: QueryIntelligence.extractTargetName(match),
                    action: 'get_interacting_partners'
                }),
                databases: ['opentargets'],
                examples: [
                    'List interacting partners for ENSG00000141510',
                    'ENSG00000141510 protein interactions',
                    'What proteins interact with TP53'
                ]
            },

            // 7. Disease → Approved Compounds  
            DISEASE_COMPOUNDS: {
                regex: [
                    /(?:list|show|find|get).*(?:approved|compounds?).*(?:for|of).*disease\s+(\w+)/i,
                    /(?:approved|compounds?).*(?:for|of)\s+(\w+)/i,
                    /(?:drugs|compounds).*approved.*(\w+)/i,
                    /(\w+).*approved.*(?:drugs|compounds)/i
                ],
                extract: (query, match) => ({
                    entity: 'disease',
                    disease: QueryIntelligence.extractDiseaseName(match),
                    action: 'get_approved_compounds'
                }),
                databases: ['opentargets', 'drugbank'],
                examples: [
                    'List approved compounds for disease EFO_0000756',
                    'EFO_0000756 approved drugs',
                    'What drugs are approved for cancer'
                ]
            },

            // 8. Generic Search
            GENERIC_SEARCH: {
                regex: [/.*/],
                extract: (query, match) => ({
                    entity: 'general',
                    query: query,
                    action: 'generic_search'
                }),
                databases: ['opentargets', 'clinicaltrials', 'chembl', 'drugbank', 'clinvar', 'pubmed'],
                examples: [
                    'cancer immunotherapy',
                    'EGFR inhibitors',
                    'Alzheimer disease research'
                ]
            }
        },

        // Main parsing function
        parseQuery: (query) => {
            const normalizedQuery = query.trim().toLowerCase();
            
            // Try each pattern
            for (const [intentName, pattern] of Object.entries(QueryIntelligence.patterns)) {
                for (const regex of pattern.regex) {
                    const match = normalizedQuery.match(regex);
                    if (match) {
                        const extracted = pattern.extract(normalizedQuery, match);
                        if (extracted && (extracted.drug || extracted.target || extracted.compound || extracted.disease || extracted.query)) {
                            return {
                                intent: intentName,
                                ...extracted,
                                confidence: QueryIntelligence.calculateConfidence(match, normalizedQuery),
                                recommendedDatabases: pattern.databases,
                                originalQuery: query,
                                examples: pattern.examples
                            };
                        }
                    }
                }
            }

            // Fallback to generic search
            return {
                intent: 'GENERIC_SEARCH',
                entity: 'general',
                query: query,
                action: 'generic_search',
                confidence: 0.5,
                recommendedDatabases: ['opentargets', 'clinicaltrials'],
                originalQuery: query
            };
        }
    };
