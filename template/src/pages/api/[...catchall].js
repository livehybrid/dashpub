// Catch-all API route for unknown endpoints
export default function handler(req, res) {
    const { method, url, query } = req;
    
    // Log the unknown request for debugging
    console.log(`Unknown API endpoint accessed: ${method} ${url}`);
    console.log('Query parameters:', query);
    
    // Check if this is a Splunk dashboard request
    if (url.includes('github_status') || url.includes('form.global_time')) {
        console.log('This appears to be a Splunk dashboard request to an external service');
        console.log('Consider implementing the required endpoint or handling this request appropriately');
    }
    
    // Return a proper 404 response
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The requested endpoint '${url}' does not exist`,
        timestamp: new Date().toISOString(),
        method: method,
        query: query,
        suggestion: 'If this is a Splunk dashboard request, check if the required data source is configured correctly'
    });
}
