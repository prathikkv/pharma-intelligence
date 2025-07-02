// api/search/clinicaltrials.js - ENHANCED VERSION for comprehensive results
// Replace your current clinicaltrials.js with this enhanced version

/**
 * Enhanced ClinicalTrials.gov API handler - Returns 100s-1000s of comprehensive results
 * Optimized queries, better parsing, multiple search strategies
 */

const CLINICALTRIALS_CONFIG = {
    baseUrl: 'https://clinicaltrials.gov/api/v2',
    webUrl: 'https://clinicaltrials.gov',
    maxRetries: 2,
    timeout: 20000,
    rateLimit: 10,
    maxPageSize: 1000 // Maximum allowed by API
};

/**
 * SMART query enhancement for better results
 */
function enhanceSearchQuery(originalQuery) {
    const queryLower = originalQuery.toLowerCase();
    
    // Extract specific entities and enhance the search
    const enhancements = [];
    
    // Drug name extraction and enhancement
    const drugPatterns = [
        /\b([a-z]+(?:inib|mab|nab|tuzumab|mycin|cillin))\b/gi,
        /(?:drug|medication|compound|agent)\s+([a-zA-Z0-9\-]+)/gi
    ];
    
    drugPatterns.forEach(pattern => {
        const matches = [...originalQuery.matchAll(pattern)];
        matches.forEach(match => {
            if (match[1] && match[1].length > 3) {
                enhancements.push(match[1]);
            }
        });
    });
    
    // Disease/condition enhancement
    const diseaseKeywords = [
        'cancer', 'carcinoma', 'adenocarcinoma', 'sarcoma', 'lymphoma', 'leukemia',
        'alzheimer', 'diabetes', 'hypertension', 'depression', 'arthritis',
        'covid', 'influenza', 'hepatitis', 'HIV', 'tuberculosis'
    ];
    
    diseaseKeywords.forEach(keyword => {
        if (queryLower.includes(keyword)) {
            enhancements.push(keyword);
        }
    });
    
    // Create multiple search variations
    const searchVariations = [
        originalQuery,
        ...enhancements,
        // Add OR combinations for broader results
        enhancements.length > 1 ? enhancements.join(' OR ') : null
    ].filter(Boolean);
    
    return {
        primary: originalQuery,
        variations: [...new Set(searchVariations)], // Remove duplicates
        enhancements
    };
}

/**
 * Execute multiple search strategies for comprehensive results
 */
async function comprehensiveSearch(query, limit = 500) {
    const enhancedQuery = enhanceSearchQuery(query);
    const allResults = [];
    const searchStrategies = [];
    
    console.log('ClinicalTrials.gov: Enhanced query variations:', enhancedQuery.variations);
    
    // Strategy 1: Primary query search
    try {
        console.log('ClinicalTrials.gov: Executing primary search...');
        const primaryResults = await searchClinicalTrials(enhancedQuery.primary, {
            pageSize: Math.min(limit, 500),
            fields: 'all' // Request all available fields
        });
        
        if (primaryResults.length > 0) {
            allResults.push(...primaryResults);
            searchStrategies.push(`Primary query: ${primaryResults.length} results`);
        }
    } catch (error) {
        console.warn('Primary search failed:', error.message);
        searchStrategies.push(`Primary query: Failed (${error.message})`);
    }
    
    // Strategy 2: Enhanced term searches
    for (const variation of enhancedQuery.variations.slice(1)) {
        try {
            console.log(`ClinicalTrials.gov: Searching variation: "${variation}"`);
            const variationResults = await searchClinicalTrials(variation, {
                pageSize: Math.min(200, limit - allResults.length),
                fields: 'essential'
            });
            
            if (variationResults.length > 0) {
                allResults.push(...variationResults);
                searchStrategies.push(`Variation "${variation}": ${variationResults.length} results`);
            }
            
            // Stop if we have enough results
            if (allResults.length >= limit) break;
            
        } catch (error) {
            console.warn(`Variation search failed for "${variation}":`, error.message);
            searchStrategies.push(`Variation "${variation}": Failed`);
        }
    }
    
    // Strategy 3: Broad category search if still not enough results
    if (allResults.length < 50 && enhancedQuery.enhancements.length > 0) {
        try {
            console.log('ClinicalTrials.gov: Executing broad category search...');
            const broadQuery = enhancedQuery.enhancements[0]; // Use first enhancement
            const broadResults = await searchClinicalTrials(broadQuery, {
                pageSize: Math.min(300, limit - allResults.length),
                fields: 'essential',
                broad: true
            });
            
            if (broadResults.length > 0) {
                allResults.push(...broadResults);
                searchStrategies.push(`Broad search: ${broadResults.length} results`);
            }
        } catch (error) {
            console.warn('Broad search failed:', error.message);
            searchStrategies.push(`Broad search: Failed`);
        }
    }
    
    // Remove duplicates based on NCT ID
    const uniqueResults = allResults.filter((study, index, self) => 
        index === self.findIndex(s => s.nct_id === study.nct_id)
    );
    
    console.log(`ClinicalTrials.gov: Comprehensive search completed - ${uniqueResults.length} unique results`);
    console.log('Search strategies used:', searchStrategies);
    
    return {
        results: uniqueResults,
        strategies: searchStrategies,
        totalFound: uniqueResults.length
    };
}

/**
 * Enhanced ClinicalTrials.gov API search
 */
async function searchClinicalTrials(searchQuery, options = {}) {
    const {
        pageSize = 500,
        fields = 'all',
        broad = false
    } = options;
    
    try {
        // Construct API request with enhanced parameters
        const params = {
            'query.term': searchQuery,
            'format': 'json',
            'countTotal': 'true',
            'pageSize': Math.min(pageSize, CLINICALTRIALS_CONFIG.maxPageSize)
        };
        
        // Add fields specification for more comprehensive data
        if (fields === 'all') {
            params['fields'] = [
                'NCTId', 'BriefTitle', 'OfficialTitle', 'OverallStatus', 'Phase',
                'StudyType', 'PrimaryPurpose', 'Condition', 'Intervention',
                'LeadSponsorName', 'LeadSponsorClass', 'Collaborator',
                'StartDate', 'CompletionDate', 'PrimaryCompletionDate',
                'EnrollmentCount', 'EnrollmentType', 'EligibilityCriteria',
                'BriefSummary', 'DetailedDescription', 'PrimaryOutcome',
                'SecondaryOutcome', 'LocationCountry', 'LocationFacility',
                'ResponsiblePartyType', 'Gender', 'MinimumAge', 'MaximumAge',
                'StdAge', 'StudyFirstSubmitDate', 'LastUpdateSubmitDate',
                'CompletionDateType', 'StartDateType'
            ].join(',');
        }
        
        const url = `${CLINICALTRIALS_CONFIG.baseUrl}/studies?${new URLSearchParams(params)}`;
        
        console.log(`ClinicalTrials.gov API request: ${url.substring(0, 100)}...`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'PharmaceuticalIntelligence/3.0'
            },
            signal: AbortSignal.timeout(CLINICALTRIALS_CONFIG.timeout)
        });
        
        if (!response.ok) {
            throw new Error(`ClinicalTrials.gov API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.studies || data.studies.length === 0) {
            console.log('ClinicalTrials.gov: No studies found for query:', searchQuery);
            return [];
        }
        
        // Process and enhance the results
        const processedStudies = data.studies.map(study => enhanceStudyData(study));
        
        console.log(`ClinicalTrials.gov: ${processedStudies.length} studies processed for query: "${searchQuery}"`);
        
        return processedStudies;
        
    } catch (error) {
        console.error(`ClinicalTrials.gov search error for "${searchQuery}":`, error);
        throw error;
    }
}

/**
 * Enhanced study data processing
 */
function enhanceStudyData(study) {
    const protocolSection = study.protocolSection || {};
    const identificationModule = protocolSection.identificationModule || {};
    const statusModule = protocolSection.statusModule || {};
    const designModule = protocolSection.designModule || {};
    const conditionsModule = protocolSection.conditionsModule || {};
    const armsInterventionsModule = protocolSection.armsInterventionsModule || {};
    const sponsorCollaboratorsModule = protocolSection.sponsorCollaboratorsModule || {};
    const descriptionModule = protocolSection.descriptionModule || {};
    const eligibilityModule = protocolSection.eligibilityModule || {};
    const contactsLocationsModule = protocolSection.contactsLocationsModule || {};
    
    // Extract comprehensive data
    const nctId = identificationModule.nctId || 'Unknown';
    const briefTitle = identificationModule.briefTitle || 'No title available';
    const officialTitle = identificationModule.officialTitle || '';
    
    // Status and phase information
    const overallStatus = statusModule.overallStatus || 'Unknown';
    const phases = designModule.phases || [];
    const studyType = designModule.studyType || 'Unknown';
    const primaryPurpose = designModule.designInfo?.primaryPurpose || 'Unknown';
    
    // Conditions and interventions
    const conditions = conditionsModule.conditions || [];
    const interventions = armsInterventionsModule.interventions || [];
    
    // Sponsor information
    const leadSponsor = sponsorCollaboratorsModule.leadSponsor?.name || 'Unknown';
    const sponsorClass = sponsorCollaboratorsModule.leadSponsor?.class || 'Unknown';
    const collaborators = sponsorCollaboratorsModule.collaborators || [];
    
    // Dates and enrollment
    const startDate = statusModule.startDateStruct?.date;
    const completionDate = statusModule.primaryCompletionDateStruct?.date || 
                          statusModule.completionDateStruct?.date;
    const enrollmentInfo = designModule.enrollmentInfo || {};
    
    // Descriptions
    const briefSummary = descriptionModule.briefSummary || 'No summary available';
    const detailedDescription = descriptionModule.detailedDescription || '';
    
    // Eligibility
    const eligibilityCriteria = eligibilityModule.eligibilityCriteria || 'Not specified';
    const gender = eligibilityModule.gender || 'All';
    const minimumAge = eligibilityModule.minimumAge || 'Not specified';
    const maximumAge = eligibilityModule.maximumAge || 'Not specified';
    
    // Locations
    const locations = contactsLocationsModule.locations || [];
    const countries = [...new Set(locations.map(loc => loc.country).filter(Boolean))];
    
    // Create enhanced study object
    const enhancedStudy = {
        // Standard identifiers
        id: nctId,
        nct_id: nctId,
        
        // Titles and descriptions
        title: briefTitle,
        brief_title: briefTitle,
        official_title: officialTitle,
        brief_summary: briefSummary,
        detailed_description: detailedDescription,
        
        // Status and classification
        status: overallStatus,
        overall_status: overallStatus,
        study_type: studyType,
        primary_purpose: primaryPurpose,
        
        // Phase information
        phase: phases.length > 0 ? formatPhases(phases) : 'N/A',
        phases: phases,
        
        // Conditions and interventions
        conditions: conditions,
        condition_summary: conditions.slice(0, 3).join(', ') || 'Not specified',
        interventions: interventions.map(int => ({
            name: int.name,
            type: int.type,
            description: int.description
        })),
        intervention_summary: interventions.slice(0, 3).map(int => int.name).join(', ') || 'Not specified',
        
        // Sponsor information
        sponsor: leadSponsor,
        lead_sponsor: leadSponsor,
        sponsor_class: sponsorClass,
        collaborators: collaborators.map(collab => collab.name),
        collaborator_summary: collaborators.slice(0, 2).map(collab => collab.name).join(', '),
        
        // Dates
        start_date: startDate,
        completion_date: completionDate,
        year: startDate ? new Date(startDate).getFullYear() : new Date().getFullYear(),
        
        // Enrollment
        enrollment: enrollmentInfo.count || 'Not specified',
        enrollment_type: enrollmentInfo.type || 'Not specified',
        
        // Eligibility
        eligibility_criteria: eligibilityCriteria,
        gender: gender,
        minimum_age: minimumAge,
        maximum_age: maximumAge,
        age_range: `${minimumAge} - ${maximumAge}`,
        
        // Geographic information
        locations: locations.slice(0, 5), // Limit for performance
        countries: countries,
        location_summary: countries.slice(0, 3).join(', ') || 'Not specified',
        
        // URLs and links
        url: `${CLINICALTRIALS_CONFIG.webUrl}/study/${nctId}`,
        link: `${CLINICALTRIALS_CONFIG.webUrl}/study/${nctId}`,
        study_url: `${CLINICALTRIALS_CONFIG.webUrl}/study/${nctId}`,
        
        // Metadata for search and filtering
        last_update_date: statusModule.lastUpdateSubmitDate,
        study_first_submitted_date: statusModule.studyFirstSubmitDate,
        
        // Enhanced search relevance fields
        search_keywords: [
            ...conditions,
            ...interventions.map(int => int.name),
            leadSponsor,
            studyType,
            primaryPurpose,
            ...phases
        ].filter(Boolean),
        
        // Raw data for advanced processing
        raw_data: study
    };
    
    return enhancedStudy;
}

/**
 * Format phases for display
 */
function formatPhases(phases) {
    if (!phases || phases.length === 0) return 'Not specified';
    
    const phaseMap = {
        'EARLY_PHASE1': 'Early Phase I',
        'PHASE1': 'Phase I',
        'PHASE1_PHASE2': 'Phase I/II',
        'PHASE2': 'Phase II',
        'PHASE2_PHASE3': 'Phase II/III',
        'PHASE3': 'Phase III',
        'PHASE4': 'Phase IV',
        'NOT_APPLICABLE': 'Not Applicable'
    };
    
    const formattedPhases = phases.map(phase => phaseMap[phase] || phase);
    return formattedPhases.join(', ');
}

/**
 * Main API handler
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

    const { 
        query, 
        limit = 500,
        status = null,
        phase = null,
        sponsor = null,
        study_type = null
    } = req.query;

    if (!query) {
        return res.status(400).json({ 
            error: 'Query parameter is required',
            example: 'Try: "imatinib cancer" or "Alzheimer disease phase 3"'
        });
    }

    const startTime = performance.now();

    try {
        console.log(`ClinicalTrials.gov enhanced search for: "${query}"`);
        
        const searchLimit = Math.min(parseInt(limit) || 500, 1000);
        
        // Execute comprehensive search
        const searchResults = await comprehensiveSearch(query, searchLimit);
        
        let results = searchResults.results;
        
        // Apply additional filters if specified
        if (status) {
            results = results.filter(study => 
                study.overall_status?.toLowerCase().includes(status.toLowerCase())
            );
        }
        
        if (phase) {
            results = results.filter(study => 
                study.phases?.some(p => p.toLowerCase().includes(phase.toLowerCase())) ||
                study.phase?.toLowerCase().includes(phase.toLowerCase())
            );
        }
        
        if (sponsor) {
            results = results.filter(study => 
                study.lead_sponsor?.toLowerCase().includes(sponsor.toLowerCase())
            );
        }
        
        if (study_type) {
            results = results.filter(study => 
                study.study_type?.toLowerCase().includes(study_type.toLowerCase())
            );
        }
        
        // Enhanced sorting for relevance
        results.sort((a, b) => {
            // Priority 1: Active/Recruiting studies
            const statusPriorityA = getStatusPriority(a.overall_status);
            const statusPriorityB = getStatusPriority(b.overall_status);
            if (statusPriorityA !== statusPriorityB) {
                return statusPriorityB - statusPriorityA;
            }
            
            // Priority 2: Recent studies
            const yearA = a.year || 0;
            const yearB = b.year || 0;
            if (yearA !== yearB) {
                return yearB - yearA;
            }
            
            // Priority 3: Higher phases
            const phaseA = getPhaseNumber(a.phases);
            const phaseB = getPhaseNumber(b.phases);
            return phaseB - phaseA;
        });
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.log(`ClinicalTrials.gov search completed: ${results.length} results in ${responseTime}ms`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            filters: { status, phase, sponsor, study_type },
            search_strategies: searchResults.strategies,
            search_timestamp: new Date().toISOString(),
            response_time: responseTime,
            api_status: 'success',
            data_source: 'ClinicalTrials.gov API v2'
        });

    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        console.error('ClinicalTrials.gov API error:', error);
        
        return res.status(500).json({
            error: 'ClinicalTrials.gov API error',
            message: error.message,
            results: [],
            total: 0,
            query: query,
            response_time: responseTime,
            search_timestamp: new Date().toISOString()
        });
    }
}

// Helper functions
function getStatusPriority(status) {
    if (!status) return 0;
    const statusLower = status.toLowerCase();
    if (statusLower.includes('recruiting')) return 5;
    if (statusLower.includes('active')) return 4;
    if (statusLower.includes('completed')) return 3;
    if (statusLower.includes('enrolling')) return 4;
    if (statusLower.includes('not yet recruiting')) return 3;
    if (statusLower.includes('terminated') || statusLower.includes('withdrawn')) return 1;
    return 2;
}

function getPhaseNumber(phases) {
    if (!phases || phases.length === 0) return 0;
    const phaseNumbers = phases.map(phase => {
        if (phase.includes('4') || phase.includes('IV')) return 4;
        if (phase.includes('3') || phase.includes('III')) return 3;
        if (phase.includes('2') || phase.includes('II')) return 2;
        if (phase.includes('1') || phase.includes('I')) return 1;
        return 0;
    });
    return Math.max(...phaseNumbers);
}
