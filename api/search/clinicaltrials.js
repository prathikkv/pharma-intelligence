// api/search/clinicaltrials.js - Enhanced ClinicalTrials.gov implementation with API v2.0
// Replace your current api/search/clinicaltrials.js file with this enhanced version

/**
 * Enhanced ClinicalTrials.gov API handler using the new API v2.0
 * Returns actionable clinical trial data with proper study details and links
 */

const CLINICALTRIALS_CONFIG = {
    baseUrl: 'https://clinicaltrials.gov/api/v2',
    webUrl: 'https://clinicaltrials.gov',
    maxRetries: 3,
    timeout: 30000,
    rateLimit: 20, // requests per second
    maxPageSize: 1000
};

/**
 * Execute ClinicalTrials.gov API request with error handling and retries
 */
async function executeClinicalTrialsRequest(endpoint, params = {}, retries = 3) {
    const url = new URL(`${CLINICALTRIALS_CONFIG.baseUrl}/${endpoint}`);
    
    // Add default parameters
    if (!params.format) params.format = 'json';
    if (!params.pageSize) params.pageSize = Math.min(params.limit || 50, 1000);
    
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
                    'Accept': 'application/json',
                    'User-Agent': 'PharmaIntelligence/1.0'
                },
                signal: AbortSignal.timeout(CLINICALTRIALS_CONFIG.timeout)
            });

            if (!response.ok) {
                throw new Error(`ClinicalTrials.gov API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error(`ClinicalTrials.gov API attempt ${attempt} failed:`, error);
            
            if (attempt === retries) {
                throw new Error(`ClinicalTrials.gov API failed after ${retries} attempts: ${error.message}`);
            }
            
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
}

/**
 * Format study phase for display
 */
function formatPhase(phases) {
    if (!phases || phases.length === 0) return 'Not specified';
    
    // Handle array of phases
    if (Array.isArray(phases)) {
        const sortedPhases = phases.sort();
        if (sortedPhases.length === 1) {
            return formatSinglePhase(sortedPhases[0]);
        } else {
            return sortedPhases.map(formatSinglePhase).join(', ');
        }
    }
    
    return formatSinglePhase(phases);
}

function formatSinglePhase(phase) {
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
    
    return phaseMap[phase] || phase || 'Not specified';
}

/**
 * Format recruitment status
 */
function formatStatus(status) {
    const statusMap = {
        'NOT_YET_RECRUITING': 'Not yet recruiting',
        'RECRUITING': 'Recruiting',
        'ENROLLING_BY_INVITATION': 'Enrolling by invitation',
        'ACTIVE_NOT_RECRUITING': 'Active, not recruiting',
        'SUSPENDED': 'Suspended',
        'TERMINATED': 'Terminated',
        'COMPLETED': 'Completed',
        'WITHDRAWN': 'Withdrawn',
        'UNKNOWN': 'Unknown status'
    };
    
    return statusMap[status] || status || 'Unknown';
}

/**
 * Format study type
 */
function formatStudyType(studyType) {
    const typeMap = {
        'INTERVENTIONAL': 'Interventional',
        'OBSERVATIONAL': 'Observational',
        'PATIENT_REGISTRY': 'Patient Registry',
        'EXPANDED_ACCESS': 'Expanded Access'
    };
    
    return typeMap[studyType] || studyType || 'Unknown';
}

/**
 * Extract intervention names from study
 */
function extractInterventions(study) {
    const interventions = study.protocolSection?.armsInterventionsModule?.interventions || [];
    return interventions
        .map(intervention => intervention.name || intervention.otherNames?.[0])
        .filter(Boolean)
        .slice(0, 3); // Limit to first 3 interventions
}

/**
 * Extract condition names from study
 */
function extractConditions(study) {
    const conditions = study.protocolSection?.conditionsModule?.conditions || [];
    return conditions.slice(0, 3); // Limit to first 3 conditions
}

/**
 * Extract sponsor information
 */
function extractSponsor(study) {
    const sponsorsModule = study.protocolSection?.sponsorCollaboratorsModule;
    if (!sponsorsModule) return 'Unknown';
    
    const leadSponsor = sponsorsModule.leadSponsor?.name;
    const collaborators = sponsorsModule.collaborators || [];
    
    if (collaborators.length > 0) {
        return `${leadSponsor} (+${collaborators.length} collaborators)`;
    }
    
    return leadSponsor || 'Unknown';
}

/**
 * Extract enrollment information
 */
function extractEnrollment(study) {
    const designModule = study.protocolSection?.designModule;
    const enrollment = designModule?.enrollmentInfo;
    
    if (!enrollment) return 'Not specified';
    
    const count = enrollment.count || 'Unknown';
    const type = enrollment.type === 'ESTIMATED' ? ' (estimated)' : 
                 enrollment.type === 'ACTUAL' ? ' (actual)' : '';
    
    return `${count}${type}`;
}

/**
 * Extract study dates
 */
function extractDates(study) {
    const statusModule = study.protocolSection?.statusModule;
    
    const startDate = statusModule?.startDateStruct?.date;
    const completionDate = statusModule?.primaryCompletionDateStruct?.date || 
                          statusModule?.completionDateStruct?.date;
    
    return {
        startDate: startDate ? new Date(startDate) : null,
        completionDate: completionDate ? new Date(completionDate) : null,
        startYear: startDate ? new Date(startDate).getFullYear() : new Date().getFullYear()
    };
}

/**
 * Generate study links
 */
function generateStudyLinks(study) {
    const nctId = study.protocolSection?.identificationModule?.nctId;
    
    if (!nctId) {
        return {
            primary: `${CLINICALTRIALS_CONFIG.webUrl}`,
            study: null,
            results: null
        };
    }
    
    return {
        primary: `${CLINICALTRIALS_CONFIG.webUrl}/study/${nctId}`,
        study: `${CLINICALTRIALS_CONFIG.webUrl}/study/${nctId}`,
        results: study.resultsSection ? `${CLINICALTRIALS_CONFIG.webUrl}/study/${nctId}?tab=results` : null,
        documents: `${CLINICALTRIALS_CONFIG.webUrl}/study/${nctId}?tab=documents`,
        history: `${CLINICALTRIALS_CONFIG.webUrl}/study/${nctId}?tab=history`
    };
}

/**
 * Create detailed description from study data
 */
function createStudyDescription(study) {
    const components = [];
    
    const interventions = extractInterventions(study);
    if (interventions.length > 0) {
        components.push(`Interventions: ${interventions.join(', ')}`);
    }
    
    const conditions = extractConditions(study);
    if (conditions.length > 0) {
        components.push(`Conditions: ${conditions.join(', ')}`);
    }
    
    const enrollment = extractEnrollment(study);
    if (enrollment !== 'Not specified') {
        components.push(`Enrollment: ${enrollment}`);
    }
    
    const studyType = formatStudyType(study.protocolSection?.designModule?.studyType);
    if (studyType !== 'Unknown') {
        components.push(`Type: ${studyType}`);
    }
    
    return components.length > 0 ? components.join(' | ') : 'Clinical trial';
}

/**
 * Format study data for consistent output
 */
function formatStudyData(studies) {
    return studies.map((study, index) => {
        const protocolSection = study.protocolSection;
        const identificationModule = protocolSection?.identificationModule;
        const statusModule = protocolSection?.statusModule;
        const designModule = protocolSection?.designModule;
        
        const nctId = identificationModule?.nctId || `UNKNOWN-${index}`;
        const title = identificationModule?.briefTitle || 'Unknown Study Title';
        const phases = designModule?.phases || [];
        const status = statusModule?.overallStatus;
        const studyType = designModule?.studyType;
        
        const links = generateStudyLinks(study);
        const description = createStudyDescription(study);
        const dates = extractDates(study);
        const interventions = extractInterventions(study);
        const conditions = extractConditions(study);
        const sponsor = extractSponsor(study);
        const enrollment = extractEnrollment(study);
        
        const formattedPhase = formatPhase(phases);
        const formattedStatus = formatStatus(status);
        const formattedStudyType = formatStudyType(studyType);
        
        // Create type string combining study type and phase
        const typeString = phases.length > 0 ? 
            `${formattedStudyType} - ${formattedPhase}` : 
            formattedStudyType;
        
        return {
            id: `CT-${nctId}`,
            database: 'ClinicalTrials.gov',
            title: title,
            type: typeString,
            status_significance: formattedStatus,
            details: description,
            phase: formattedPhase,
            status: formattedStatus,
            sponsor: sponsor,
            year: dates.startYear,
            enrollment: enrollment,
            link: links.primary,
            
            // ClinicalTrials.gov specific fields
            nct_id: nctId,
            study_type: formattedStudyType,
            interventions: interventions,
            conditions: conditions,
            start_date: dates.startDate?.toISOString(),
            completion_date: dates.completionDate?.toISOString(),
            
            // Additional useful fields
            official_title: identificationModule?.officialTitle,
            brief_summary: protocolSection?.descriptionModule?.briefSummary,
            study_population: protocolSection?.eligibilityModule?.eligibilityCriteria,
            
            // Links to different study sections
            results_link: links.results,
            documents_link: links.documents,
            history_link: links.history,
            
            // Raw data for further processing
            raw_data: study
        };
    });
}

/**
 * Search studies by various criteria
 */
async function searchStudies(query, options = {}) {
    const {
        limit = 50,
        status = null,
        phase = null,
        studyType = null,
        sponsor = null
    } = options;
    
    try {
        const params = {
            'query.titles': query,
            pageSize: Math.min(limit, CLINICALTRIALS_CONFIG.maxPageSize),
            format: 'json'
        };
        
        // Add filters if specified
        if (status) params['filter.overallStatus'] = status;
        if (phase) params['filter.phase'] = phase;
        if (studyType) params['filter.studyType'] = studyType;
        if (sponsor) params['query.lead'] = sponsor;
        
        const data = await executeClinicalTrialsRequest('studies', params);
        
        return data.studies || [];
        
    } catch (error) {
        console.error('ClinicalTrials.gov search error:', error);
        
        // Try a broader search if the specific search fails
        try {
            const broadParams = {
                'query.cond': query,
                pageSize: Math.min(limit, 100),
                format: 'json'
            };
            
            const broadData = await executeClinicalTrialsRequest('studies', broadParams);
            return broadData.studies || [];
            
        } catch (broadError) {
            console.error('Broad ClinicalTrials.gov search also failed:', broadError);
            return [];
        }
    }
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

    const { 
        query, 
        limit = 50, 
        status = null, 
        phase = null, 
        study_type = null, 
        sponsor = null 
    } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        console.log(`ClinicalTrials.gov search for: "${query}"`);
        
        const searchLimit = Math.min(parseInt(limit) || 50, 1000);
        
        // Search for studies
        const studies = await searchStudies(query, {
            limit: searchLimit,
            status,
            phase,
            studyType: study_type,
            sponsor
        });
        
        if (studies.length === 0) {
            return res.status(200).json({
                results: [],
                total: 0,
                query: query,
                search_timestamp: new Date().toISOString(),
                message: 'No clinical trials found for the given query'
            });
        }
        
        // Format study data
        const results = formatStudyData(studies);
        
        // Sort by relevance (recruiting first, then by start date)
        results.sort((a, b) => {
            // Priority: Recruiting > Active > Completed > Others
            const statusPriority = {
                'Recruiting': 4,
                'Active, not recruiting': 3,
                'Completed': 2,
                'Not yet recruiting': 2
            };
            
            const aPriority = statusPriority[a.status] || 1;
            const bPriority = statusPriority[b.status] || 1;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            // Secondary sort by start year (newer first)
            return b.year - a.year;
        });
        
        console.log(`ClinicalTrials.gov returned ${results.length} results`);

        return res.status(200).json({
            results: results,
            total: results.length,
            query: query,
            filters: {
                status,
                phase,
                study_type,
                sponsor
            },
            search_timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('ClinicalTrials.gov API error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message,
            results: [],
            total: 0,
            query: query
        });
    }
}
