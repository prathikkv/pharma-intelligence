// api/search/opentargets.js - ULTRA SIMPLE TEST
export default function handler(req, res) {
    console.log('🧪 Ultra simple API called');
    
    // Set basic headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Return immediate response - no async, no fetch, no try/catch
    return res.status(200).json({
        message: 'Ultra simple API is working!',
        query: req.query.query || 'no query',
        timestamp: new Date().toISOString(),
        test: 'success'
    });
}
