// api/search/opentargets-test.js - Simple test version
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

    const { query } = req.query;

    console.log(`🧪 OpenTargets TEST API called with query: "${query}"`);

    try {
        // For testing, return mock data that matches your expected format
        if (query && query.toLowerCase().includes('imatinib') && query.toLowerCase().includes('phase')) {
            console.log(`✅ Returning test data for imatinib phase query`);
            
            const mockResults = [
                {
                    id: 'TEST-1',
                    database: 'Open Targets',
                    title: 'Imatinib for Chronic myeloid leukemia (Phase 2)',
                    type: 'Drug-Disease Association - Phase 2',
                    status_significance: 'Phase Clinical Data',
                    details: 'Imatinib in Phase 2 for Chronic myeloid leukemia',
                    phase: 'Phase 2',
                    status: 'Clinical Development',
                    sponsor: 'Multiple',
                    year: 2023,
                    enrollment: 'N/A',
                    link: 'https://platform.opentargets.org/evidence/CHEMBL941/EFO_0000339',
                    
                    drug_name: 'Imatinib',
                    disease_name: 'Chronic myeloid leukemia',
                    phase_number: 2,
                    entity_type: 'drug-phase-disease',
                    
                    raw_data: { test: true }
                },
                {
                    id: 'TEST-2',
                    database: 'Open Targets', 
                    title: 'Imatinib for Gastrointestinal stromal tumor (Phase 2)',
                    type: 'Drug-Disease Association - Phase 2',
                    status_significance: 'Phase Clinical Data',
                    details: 'Imatinib in Phase 2 for Gastrointestinal stromal tumor',
                    phase: 'Phase 2',
                    status: 'Clinical Development',
                    sponsor: 'Multiple',
                    year: 2023,
                    enrollment: 'N/A',
                    link: 'https://platform.opentargets.org/evidence/CHEMBL941/EFO_0005203',
                    
                    drug_name: 'Imatinib',
                    disease_name: 'Gastrointestinal stromal tumor',
                    phase_number: 2,
                    entity_type: 'drug-phase-disease',
                    
                    raw_data: { test: true }
                }
            ];

            // Create the biologist_data format
            const biologist_data = mockResults.map(r => ({
                disease: r.disease_name,
                maxPhaseForIndication: r.phase_number
            }));

            return res.status(200).json({
                results: mockResults,
                total: mockResults.length,
                query: query,
                biologist_data: biologist_data,
                search_timestamp: new Date().toISOString(),
                response_time: 50,
                api_status: 'success - TEST MODE',
                system: 'OpenTargets Test API',
                data_source: 'Test Data'
            });
        }

        // For other queries, return empty but successful response
        console.log(`ℹ️ No test data for query: "${query}"`);
        return res.status(200).json({
            results: [],
            total: 0,
            query: query,
            biologist_data: [],
            search_timestamp: new Date().toISOString(),
            response_time: 20,
            api_status: 'success - TEST MODE (no data)',
            system: 'OpenTargets Test API',
            data_source: 'Test Data'
        });

    } catch (error) {
        console.error('OpenTargets TEST API error:', error);
        return res.status(500).json({
            error: 'OpenTargets TEST API error',
            message: error.message,
            results: [],
            total: 0,
            query: query
        });
    }
}
