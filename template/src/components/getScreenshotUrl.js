import crypto from 'crypto';

const BASE_SCREENSHOT_URL = process.env.NEXT_PUBLIC_BASE_SCREENSHOT_URL || null;
const BASE_DASHBOARD_URL = process.env.NEXT_PUBLIC_URL ? `https://${process.env.NEXT_PUBLIC_URL}` : "http://localhost";

const generateHash = (url) => {
    return crypto.createHash("sha256").update(url).digest("hex").substring(0, 10);
};

/**
 * Returns the URL to the screenshot of the specified dashboard.
 * @param {string} dashboardKey - The unique key of the dashboard.
 * @returns {string|null} - The screenshot URL or null if screenshots are disabled.
 */
const getScreenshotUrl = (dashboardKey) => {
    if (BASE_SCREENSHOT_URL) {
        // Generate the hash and construct the screenshot URL
        const adjustedDashboardKey = (dashboardKey === "index") ? "" : dashboardKey;
        const dashboardURL = `${BASE_DASHBOARD_URL}/${adjustedDashboardKey}`;
        const hash = generateHash(dashboardURL);
        return `${BASE_SCREENSHOT_URL}/screenshots/${hash}.jpg`;
    }
    // Fallback to the original local logic if BASE_SCREENSHOT_URL is not set
    return format("/%s/%s.%s", process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTDIR || "screens" , dashboardKey, process.env.NEXT_PUBLIC_DASHPUBSCREENSHOTEXT || "png");
};

export default getScreenshotUrl;
