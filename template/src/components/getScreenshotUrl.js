/**
 * Legacy function - screenshots are now handled via the API with pre-computed URLs.
 * This function is kept for backward compatibility but should not be used in new code.
 * @deprecated Use screenshotUrl from the dashboard manifest API instead
 */
export default function getScreenshotUrl(dashboardId) {
    console.warn('getScreenshotUrl is deprecated. Use screenshotUrl from the dashboard manifest API instead.');
    
    // Return null to prevent any issues
    return null;
}
