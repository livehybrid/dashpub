const BASE_SCREENSHOT_URL = process.env.NEXT_PUBLIC_BASE_SCREENSHOT_URL || null;
const BASE_DASHBOARD_URL = process.env.NEXT_PUBLIC_URL ? `https://${process.env.NEXT_PUBLIC_URL}` : "http://localhost";

// Browser-compatible hash function
const generateHash = (str) => {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
};

/**
 * Returns the URL to the screenshot of the specified dashboard.
 * This function handles both server-side and client-side rendering to prevent hydration mismatches.
 * @param {string} dashboardId - The unique key of the dashboard.
 * @returns {string|null} - The screenshot URL or null if screenshots are disabled.
 */
export default function getScreenshotUrl(dashboardId) {
    // Ensure consistent behavior between server and client
    if (typeof window === 'undefined') {
        // Server-side: return null to prevent hydration mismatch
        return null;
    }
    
    // Client-side: return the actual screenshot URL
    if (BASE_SCREENSHOT_URL) {
        // Generate the hash and construct the screenshot URL
        const adjustedDashboardKey = (dashboardId === "index") ? "" : dashboardId;
        const dashboardURL = `${BASE_DASHBOARD_URL}/${adjustedDashboardKey}`;
        const hash = generateHash(dashboardURL);
        return `${BASE_SCREENSHOT_URL}/screenshots/${hash}.jpg`;
    }
    
    // Fallback to the original local logic if BASE_SCREENSHOT_URL is not set
    const screenshotDir = process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTDIR || 'assets';
    const screenshotExt = process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTEXT || 'png';
    
    if (!dashboardId || dashboardId === 'index') {
        return `/${screenshotDir}/home.${screenshotExt}`;
    }
    
    return `/${screenshotDir}/${dashboardId}.${screenshotExt}`;
}
