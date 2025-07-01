// api/search/clinicaltrials.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    // Call ClinicalTrials.gov API v2.0
    const apiUrl = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(query)}&pageSize=20&format=json`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`ClinicalTrials API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform data to standardized format
    const transformedResults = data.studies?.map(study => {
      const protocol = study.protocolSection;
      const identification = protocol?.identificationModule;
      const description = protocol?.descriptionModule;
      const design = protocol?.designModule;
      const eligibility = protocol?.eligibilityModule;
      const contacts = protocol?.contactsLocationsModule;
      const status = protocol?.statusModule;

      return {
        title: identification?.briefTitle || 'Clinical Trial',
        nct_id: identification?.nctId || '',
        status: status?.overallStatus || '',
        phase: design?.phases?.join(', ') || '',
        condition: query,
        intervention: design?.interventionModel || '',
        sponsor: identification?.organization?.fullName || '',
        location: contacts?.locations?.[0]?.city + ', ' + contacts?.locations?.[0]?.country || '',
        start_date: status?.startDateStruct?.date || '',
        completion_date: status?.primaryCompletionDateStruct?.date || '',
        enrollment: design?.enrollmentInfo?.count || 0,
        url: `https://clinicaltrials.gov/study/${identification?.nctId}`,
        source: 'ClinicalTrials.gov',
        description: description?.briefSummary || '',
        eligibility_criteria: eligibility?.eligibilityCriteria || '',
        primary_outcome: protocol?.outcomesModule?.primaryOutcomes?.[0]?.measure || ''
      };
    }) || [];

    res.status(200).json({
      results: transformedResults,
      total: data.totalCount || 0,
      query: query
    });

  } catch (error) {
    console.error('ClinicalTrials API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch clinical trials data',
      details: error.message 
    });
  }
}