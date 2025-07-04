// api/search/opentargets.js - FIXED AI AGENT VERSION
// Properly handles drug ID mapping between OpenTargets and ChEMBL

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query, limit = 500 } = req.query;

    if (!query) {
        return res.status(400).json({ 
            error: 'Query parameter required',
            example: 'Try: "List diseases in Phase-2 for Imatinib" or "Pembrolizumab cancer trials"'
        });
    }

    const startTime = performance.now();

    try {
        console.log(`🤖 AI Agent: Processing query "${query}"`);
        
        // AI-powered query analysis
        const queryAnalysis = await intelligentQueryAnalysis(query);
        console.log(`🧠 AI Analysis:`, queryAnalysis);
        
        let results = [];
        
        // Dynamic drug discovery and search
        if (queryAnalysis.drugCandidates.length > 0) {
            console.log(`💊 Drug search mode: Found ${queryAnalysis.drugCandidates.length} potential drugs`);
            results = await dynamicDrugDiscoverySearch(queryAnalysis, limit);
        }
        // Intelligent general search
        else {
            console.log(`🔎 General search mode: ${query}`);
            results = await intelligentGeneralSearch(query, limit);
        }
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.log(`✅ AI Agent: Returning ${results.length} results in ${responseTime}ms`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            ai_analysis: queryAnalysis,
            search_timestamp: new Date().toISOString(),
            response_time: responseTime,
            api_status: 'success',
            data_source: 'OpenTargets Platform v4 + AI Agent'
        });

    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.error('🚨 AI Agent Error:', error);
        
        return res.status(500).json({
            error: 'AI Agent error',
            message: error.message,
            results: [],
            total: 0,
            query: query,
            response_time: responseTime,
            search_timestamp: new Date().toISOString()
        });
    }
}

/**
 * 🧠 INTELLIGENT QUERY ANALYSIS - Acts like an AI agent
 */
async function intelligentQueryAnalysis(query) {
    console.log(`🧠 AI: Analyzing query "${query}"`);
    
    const analysis = {
        originalQuery: query,
        drugCandidates: [],
        phase: null,
        diseaseTerms: [],
        intent: 'unknown',
        confidence: 0,
        searchStrategies: []
    };
    
    // Extract phase information
    const phasePatterns = [
        /phase[\s-]?(\d+)/gi,
        /phase[\s-]?(i{1,4}v?|v)/gi,
        /clinical[\s-]?phase[\s-]?(\d+)/gi,
        /\bp(\d+)\b/gi
    ];
    
    for (const pattern of phasePatterns) {
        const matches = [...query.matchAll(pattern)];
        if (matches.length > 0) {
            const phaseStr = matches[0][1].toLowerCase();
            if (/^\d+$/.test(phaseStr)) {
                analysis.phase = parseInt(phaseStr);
            } else {
                // Roman numeral conversion
                const romanMap = { 'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5 };
                analysis.phase = romanMap[phaseStr] || null;
            }
            break;
        }
    }
    
    // 🤖 DYNAMIC DRUG DISCOVERY using OpenTargets search
    const drugCandidates = await discoverDrugsFromQuery(query);
    analysis.drugCandidates = drugCandidates;
    
    // Extract disease/condition terms
    const diseaseKeywords = await extractDiseaseTerms(query);
    analysis.diseaseTerms = diseaseKeywords;
    
    // Determine intent based on analysis
    if (analysis.drugCandidates.length > 0 && analysis.phase) {
        analysis.intent = 'drug_phase_query';
        analysis.confidence = 0.9;
    } else if (analysis.drugCandidates.length > 0) {
        analysis.intent = 'drug_query';
        analysis.confidence = 0.8;
    } else if (analysis.diseaseTerms.length > 0) {
        analysis.intent = 'disease_query';
        analysis.confidence = 0.7;
    } else {
        analysis.intent = 'general_search';
        analysis.confidence = 0.5;
    }
    
    console.log(`🧠 AI Analysis complete: ${analysis.intent} (confidence: ${analysis.confidence})`);
    return analysis;
}

/**
 * 🔍 FIXED DRUG DISCOVERY - Prioritizes OpenTargets native search
 */
async function discoverDrugsFromQuery(query) {
    console.log(`🔍 Drug Discovery: Analyzing query for potential drugs`);
    
    const drugCandidates = [];
    
    try {
        // Strategy 1: Direct OpenTargets drug search (PRIORITY - gives correct IDs)
        console.log('🎯 Step 1: OpenTargets direct search');
        const directResults = await searchOpenTargetsDrugs(query);
        if (directResults.length > 0) {
            console.log(`✅ Found ${directResults.length} drugs in OpenTargets`);
            drugCandidates.push(...directResults);
            return deduplicateDrugCandidates(drugCandidates); // Return early if found
        }
        
        // Strategy 2: Word-by-word analysis
        console.log('🔍 Step 2: Word-by-word analysis');
        const words = query.toLowerCase().split(/\s+/).filter(word => 
            word.length > 3 && 
            !isCommonWord(word) &&
            !isPhaseWord(word) &&
            !isDiseaseWord(word)
        );
        
        for (const word of words) {
            const wordResults = await searchOpenTargetsDrugs(word);
            if (wordResults.length > 0) {
                console.log(`✅ Found drugs for word "${word}"`);
                drugCandidates.push(...wordResults);
            }
        }
        
        if (drugCandidates.length > 0) {
            return deduplicateDrugCandidates(drugCandidates);
        }
        
        // Strategy 3: Fallback - try generic search with different entity types
        console.log('🔄 Step 3: Fallback generic search');
        const fallbackResults = await searchFallbackDrugs(query);
        drugCandidates.push(...fallbackResults);
        
        const uniqueDrugs = deduplicateDrugCandidates(drugCandidates);
        console.log(`🔍 Drug Discovery: Found ${uniqueDrugs.length} potential drugs`);
        return uniqueDrugs;
        
    } catch (error) {
        console.error('Drug discovery error:', error);
        return [];
    }
}

/**
 * 🎯 OPENTARGETS NATIVE DRUG SEARCH - Uses correct OpenTargets drug IDs
 */
async function searchOpenTargetsDrugs(searchTerm) {
    try {
        const drugSearchQuery = `
            query searchDrugs($queryString: String!) {
                search(queryString: $queryString, entityNames: ["drug"]) {
                    hits {
                        id
                        name
                        entity
                        ... on Drug {
                            id
                            name
                            synonyms
                            tradeNames
                            drugType
                            isApproved
                            yearOfFirstApproval
                            maximumClinicalTrialPhase
                        }
                    }
                }
            }
        `;
        
        console.log(`🔎 OpenTargets drug search for: "${searchTerm}"`);
        
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AIPharmAgent/1.0'
            },
            body: JSON.stringify({
                query: drugSearchQuery,
                variables: { queryString: searchTerm }
            }),
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            console.log(`❌ OpenTargets search failed: ${response.status}`);
            return [];
        }

        const data = await response.json();
        if (data.errors) {
            console.log('❌ OpenTargets GraphQL errors:', data.errors);
            return [];
        }

        const hits = data.data?.search?.hits || [];
        console.log(`📊 OpenTargets found ${hits.length} drug hits`);
        
        return hits.map(hit => ({
            id: hit.id, // This is the correct OpenTargets drug ID
            name: hit.name,
            synonyms: hit.synonyms || [],
            tradeNames: hit.tradeNames || [],
            drugType: hit.drugType,
            isApproved: hit.isApproved,
            maxPhase: hit.maximumClinicalTrialPhase,
            confidence: calculateDrugConfidence(hit, searchTerm),
            source: 'OpenTargets'
        }));
        
    } catch (error) {
        console.error('OpenTargets drug search error:', error);
        return [];
    }
}

/**
 * 🔄 FALLBACK DRUG SEARCH - Generic search for drug discovery
 */
async function searchFallbackDrugs(query) {
    try {
        const genericQuery = `
            query genericSearch($queryString: String!) {
                search(queryString: $queryString) {
                    hits {
                        id
                        name
                        entity
                        ... on Drug {
                            id
                            name
                            synonyms
                            drugType
                            isApproved
                        }
                    }
                }
            }
        `;
        
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: genericQuery,
                variables: { queryString: query }
            })
        });

        if (!response.ok) return [];

        const data = await response.json();
        if (data.errors) return [];

        const drugHits = data.data?.search?.hits?.filter(hit => hit.entity === 'drug') || [];
        
        return drugHits.map(hit => ({
            id: hit.id,
            name: hit.name,
            synonyms: hit.synonyms || [],
            tradeNames: [],
            drugType: hit.drugType,
            isApproved: hit.isApproved,
            confidence: 0.6,
            source: 'OpenTargets-Generic'
        }));
        
    } catch (error) {
        console.error('Fallback drug search error:', error);
        return [];
    }
}

/**
 * 📊 DYNAMIC DRUG DISCOVERY SEARCH - Main search function
 */
async function dynamicDrugDiscoverySearch(queryAnalysis, limit) {
    console.log(`💊 Dynamic Drug Search: Processing ${queryAnalysis.drugCandidates.length} drug candidates`);
    
    const allResults = [];
    
    // Search each drug candidate
    for (const drug of queryAnalysis.drugCandidates) {
        console.log(`🔍 Searching evidence for: ${drug.name} (ID: ${drug.id})`);
        
        try {
            const drugResults = await searchDrugEvidence(
                drug.id, 
                drug.name, 
                queryAnalysis.phase, 
                Math.min(limit, 200)
            );
            
            if (drugResults.length > 0) {
                console.log(`✅ Found ${drugResults.length} evidence entries for ${drug.name}`);
                allResults.push(...drugResults);
            }
            
        } catch (error) {
            console.warn(`❌ Failed to search evidence for ${drug.name}:`, error.message);
            continue;
        }
    }
    
    // Comprehensive deduplication
    const uniqueResults = comprehensiveDeduplication(allResults);
    
    // Sort by relevance and phase
    uniqueResults.sort((a, b) => {
        // Requested phase first
        if (queryAnalysis.phase) {
            if (a.clinical_phase === queryAnalysis.phase && b.clinical_phase !== queryAnalysis.phase) return -1;
            if (a.clinical_phase !== queryAnalysis.phase && b.clinical_phase === queryAnalysis.phase) return 1;
        }
        
        // Higher phases first
        if (a.clinical_phase !== b.clinical_phase) {
            return b.clinical_phase - a.clinical_phase;
        }
        
        // More trials first
        return (b.clinical_trial_count || 0) - (a.clinical_trial_count || 0);
    });
    
    console.log(`💊 Dynamic Drug Search Complete: ${uniqueResults.length} unique results`);
    return uniqueResults.slice(0, limit);
}

/**
 * 🧬 SEARCH DRUG EVIDENCE - Get clinical evidence for a specific drug
 */
async function searchDrugEvidence(drugId, drugName, targetPhase, limit) {
    console.log(`🧬 Searching evidence for drug ID: ${drugId}`);
    
    const evidenceQuery = `
        query getDrugEvidence($drugId: String!, $size: Int!) {
            drug(efoId: $drugId) {
                id
                name
                drugType
                isApproved
                knownDrugs(size: $size) {
                    count
                    rows {
                        phase
                        status
                        drugId
                        diseaseId
                        targetId
                        label
                        prefName
                        ctIds
                        mechanismOfAction
                        approvedSymbol
                        drugType
                        drug {
                            id
                            name
                            drugType
                            isApproved
                        }
                        disease {
                            id
                            name
                            therapeuticAreas {
                                id
                                name
                            }
                        }
                        target {
                            id
                            approvedSymbol
                            approvedName
                        }
                    }
                }
            }
        }
    `;
    
    const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AIPharmAgent/1.0'
        },
        body: JSON.stringify({
            query: evidenceQuery,
            variables: { 
                drugId: drugId,
                size: limit 
            }
        }),
        signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
        throw new Error(`Evidence API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
        console.error('Evidence GraphQL errors:', data.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    const drug = data.data?.drug;
    if (!drug) {
        console.log(`❌ No drug data found for ID: ${drugId}`);
        return [];
    }
    
    const knownDrugs = drug.knownDrugs?.rows || [];
    console.log(`📊 Found ${knownDrugs.length} known drug entries`);
    
    // Apply phase filter if specified
    const filteredDrugs = targetPhase 
        ? knownDrugs.filter(entry => entry.phase === targetPhase)
        : knownDrugs;
    
    console.log(`🔍 After phase filter: ${filteredDrugs.length} entries`);
    
    // Format results
    return filteredDrugs.map(entry => formatEvidenceResult(entry, drugName));
}

/**
 * 🔧 COMPREHENSIVE DEDUPLICATION
 */
function comprehensiveDeduplication(results) {
    const uniqueMap = new Map();
    
    results.forEach(result => {
        const key = `${result.drug_id || result.drug_name}-${result.disease_id || result.disease_name}-${result.clinical_phase}`;
        
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, result);
        } else {
            // Merge additional data from duplicates
            const existing = uniqueMap.get(key);
            
            // Merge clinical trial IDs
            if (result.clinical_trial_ids && existing.clinical_trial_ids) {
                const combinedIds = [...new Set([...existing.clinical_trial_ids, ...result.clinical_trial_ids])];
                existing.clinical_trial_ids = combinedIds;
                existing.clinical_trial_count = combinedIds.length;
            }
        }
    });
    
    console.log(`🧹 Deduplication: ${results.length} → ${uniqueMap.size} unique results`);
    return Array.from(uniqueMap.values());
}

/**
 * 📋 FORMAT EVIDENCE RESULT
 */
function formatEvidenceResult(entry, drugName) {
    return {
        id: `OT-${entry.drugId}-${entry.diseaseId}-${entry.phase}`,
        database: 'Open Targets',
        title: `${entry.prefName || drugName} for ${entry.label}`,
        type: `Clinical Evidence - Phase ${entry.phase} (${entry.status || 'Clinical'})`,
        status_significance: `Phase ${entry.phase} ${entry.status || 'Clinical'}`,
        details: createDynamicDescription(entry),
        phase: `Phase ${entry.phase}`,
        status: entry.status || 'Clinical Evidence',
        sponsor: 'Multiple Sponsors',
        year: new Date().getFullYear(),
        enrollment: entry.ctIds?.length ? `${entry.ctIds.length} trials` : 'Clinical evidence',
        link: `https://platform.opentargets.org/evidence/${entry.drugId}/${entry.diseaseId}`,
        
        // Enhanced fields
        drug_id: entry.drugId,
        drug_name: entry.prefName,
        drug_type: entry.drugType || entry.drug?.drugType,
        target_id: entry.targetId,
        target_symbol: entry.approvedSymbol,
        disease_id: entry.diseaseId,
        disease_name: entry.label,
        clinical_phase: entry.phase,
        trial_status: entry.status,
        mechanism_of_action: entry.mechanismOfAction,
        clinical_trial_ids: entry.ctIds || [],
        clinical_trial_count: entry.ctIds?.length || 0,
        therapeutic_areas: entry.disease?.therapeuticAreas?.map(area => area.name) || [],
        is_approved: entry.drug?.isApproved,
        
        // Links
        drug_link: `https://platform.opentargets.org/drug/${entry.drugId}`,
        disease_link: `https://platform.opentargets.org/disease/${entry.diseaseId}`,
        clinical_trials_links: entry.ctIds?.map(ctId => 
            `https://clinicaltrials.gov/ct2/show/${ctId}`
        ) || [],
        
        raw_data: entry
    };
}

/**
 * 🧠 INTELLIGENT GENERAL SEARCH
 */
async function intelligentGeneralSearch(query, limit) {
    const searchQuery = `
        query intelligentSearch($queryString: String!) {
            search(queryString: $queryString) {
                hits {
                    id
                    name
                    entity
                    ... on Drug {
                        drugType
                        isApproved
                        yearOfFirstApproval
                    }
                    ... on Disease {
                        therapeuticAreas {
                            name
                        }
                    }
                    ... on Target {
                        approvedSymbol
                        biotype
                    }
                }
            }
        }
    `;
    
    try {
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: searchQuery,
                variables: { queryString: query }
            })
        });

        if (!response.ok) return [];
        const data = await response.json();
        if (data.errors) return [];
        
        const hits = data.data?.search?.hits || [];
        
        return hits.slice(0, limit).map((hit, index) => ({
            id: `OT-${hit.entity}-${hit.id}-${index}`,
            database: 'Open Targets',
            title: hit.name || hit.id,
            type: `${hit.entity} - ${hit.drugType || hit.biotype || 'General'}`,
            status_significance: hit.entity,
            details: createIntelligentDescription(hit),
            phase: 'N/A',
            status: hit.entity,
            sponsor: 'N/A',
            year: hit.yearOfFirstApproval || new Date().getFullYear(),
            enrollment: 'N/A',
            link: `https://platform.opentargets.org/${hit.entity}/${hit.id}`,
            
            entity_type: hit.entity,
            entity_id: hit.id,
            entity_name: hit.name,
            raw_data: hit
        }));
        
    } catch (error) {
        console.error('Intelligent general search error:', error);
        return [];
    }
}

// ============= HELPER FUNCTIONS =============

function calculateDrugConfidence(hit, searchTerm) {
    const term = searchTerm.toLowerCase();
    const name = hit.name.toLowerCase();
    
    if (name === term) return 1.0;
    if (name.includes(term) || term.includes(name)) return 0.9;
    if (hit.synonyms?.some(syn => syn.toLowerCase().includes(term))) return 0.8;
    if (hit.tradeNames?.some(trade => trade.toLowerCase().includes(term))) return 0.8;
    return 0.6;
}

function isCommonWord(word) {
    const commonWords = [
        'the', 'and', 'for', 'are', 'with', 'this', 'that', 'from', 'they',
        'have', 'been', 'their', 'said', 'each', 'which', 'what', 'will',
        'there', 'all', 'were', 'when', 'who', 'more', 'some', 'time',
        'very', 'can', 'may', 'use', 'than', 'first', 'water', 'long',
        'little', 'way', 'too', 'any', 'day', 'get', 'has', 'him',
        'old', 'see', 'now', 'find', 'head', 'part', 'came', 'made',
        'great', 'should', 'where', 'much', 'take', 'how', 'well',
        'list', 'diseases', 'disease', 'treatment', 'therapy', 'clinical',
        'trials', 'trial', 'patients', 'patient', 'study', 'studies'
    ];
    return commonWords.includes(word.toLowerCase());
}

function isPhaseWord(word) {
    return /^(phase|clinical|trial|study|p\d+)$/i.test(word);
}

function isDiseaseWord(word) {
    return /^(cancer|tumor|disease|syndrome|disorder|condition)$/i.test(word);
}

async function extractDiseaseTerms(query) {
    const diseaseKeywords = [
        'cancer', 'carcinoma', 'tumor', 'lymphoma', 'leukemia', 'sarcoma',
        'diabetes', 'alzheimer', 'parkinson', 'depression', 'anxiety',
        'hypertension', 'arthritis', 'asthma', 'copd', 'hepatitis'
    ];
    
    const foundDiseases = [];
    const queryLower = query.toLowerCase();
    
    diseaseKeywords.forEach(disease => {
        if (queryLower.includes(disease)) {
            foundDiseases.push(disease);
        }
    });
    
    return foundDiseases;
}

function deduplicateDrugCandidates(candidates) {
    const uniqueMap = new Map();
    
    candidates.forEach(drug => {
        const key = drug.id || drug.name.toLowerCase();
        if (!uniqueMap.has(key) || uniqueMap.get(key).confidence < drug.confidence) {
            uniqueMap.set(key, drug);
        }
    });
    
    return Array.from(uniqueMap.values())
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10);
}

function createDynamicDescription(entry) {
    const components = [];
    
    if (entry.mechanismOfAction) {
        components.push(`Mechanism: ${entry.mechanismOfAction}`);
    } else if (entry.approvedSymbol) {
        components.push(`Target: ${entry.approvedSymbol}`);
    }
    
    const drugType = entry.drugType || entry.drug?.drugType;
    if (drugType) {
        components.push(`Type: ${drugType}`);
    }
    
    if (entry.ctIds?.length) {
        components.push(`${entry.ctIds.length} trials`);
    }
    
    if (entry.status) {
        components.push(`Status: ${entry.status}`);
    }
    
    return components.length > 0 ? components.join(' | ') : 
           `${entry.prefName} for ${entry.label}`;
}

function createIntelligentDescription(hit) {
    const components = [];
    
    components.push(`Type: ${hit.entity}`);
    
    if (hit.drugType) {
        components.push(`Drug Type: ${hit.drugType}`);
    }
    
    if (hit.isApproved) {
        components.push('Status: Approved');
    }
    
    if (hit.yearOfFirstApproval) {
        components.push(`First Approval: ${hit.yearOfFirstApproval}`);
    }
    
    if (hit.biotype) {
        components.push(`Biotype: ${hit.biotype}`);
    }
    
    if (hit.therapeuticAreas?.length) {
        components.push(`Areas: ${hit.therapeuticAreas.slice(0, 2).map(area => area.name).join(', ')}`);
    }
    
    return components.length > 0 ? components.join(' | ') : 
           `${hit.entity}: ${hit.name}`;
}
