export default async function handler(req, res) {
    console.log('🎯 OpenTargets API called');
    console.log('Query params:', req.query);
    
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ 
                error: 'Query parameter required',
                example: '/api/search/opentargets?query=imatinib'
            });
        }

        console.log('Processing query:', query);

        // Return mock data for now to test the pipeline
        const mockResults = [
            {
                id: 'MOCK-IMATINIB-CML',
                database: 'Open Targets',
                title: 'Imatinib for Chronic Myeloid Leukemia',
                type: 'Drug-Disease Association - Phase 2',
                status_significance: 'Phase 2 Clinical',
                details: 'Imatinib is in Phase 2 clinical trials for Chronic Myeloid Leukemia',
                phase: 'Phase 2',
                status: 'Clinical Development',
                sponsor: 'Multiple',
                year: 2025,
                enrollment: 'N/A',
                link: 'https://platform.opentargets.org',
                drug_name: 'Imatinib',
                disease_name: 'Chronic Myeloid Leukemia',
                clinical_phase: 2
            },
            {
                id: 'MOCK-IMATINIB-GIST',
                database: 'Open Targets',
                title: 'Imatinib for Gastrointestinal Stromal Tumor',
                type: 'Drug-Disease Association - Phase 2',
                status_significance: 'Phase 2 Clinical',
                details: 'Imatinib is in Phase 2 clinical trials for GIST',
                phase: 'Phase 2',
                status: 'Clinical Development',
                sponsor: 'Multiple',
                year: 2025,
                enrollment: 'N/A',
                link: 'https://platform.opentargets.org',
                drug_name: 'Imatinib',
                disease_name: 'Gastrointestinal Stromal Tumor',
                clinical_phase: 2
            }
        ];

        console.log('Returning mock results:', mockResults.length);

        return res.status(200).json({
            results: mockResults,
            total: mockResults.length,
            query: query,
            message: 'Mock data from OpenTargets API',
            search_timestamp: new Date().toISOString(),
            api_status: 'success'
        });

    } catch (error) {
        console.error('API Error:', error);
        
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            results: [],
            total: 0,
            search_timestamp: new Date().toISOString()
        });
    }
}
