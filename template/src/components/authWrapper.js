import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// Simple authentication wrapper component
// This can be used in individual pages instead of middleware
export default function AuthWrapper({ children, requireAuth = false }) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // If authentication is not required, skip the check
        if (!requireAuth || process.env.JWT_REQUIRED !== 'true') {
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
        }

        // Check for auth token
        const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('auth_token='))
            ?.split('=')[1];

        if (token) {
            setIsAuthenticated(true);
        } else {
            // Redirect to login if no token
            const returnTo = router.asPath;
            router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        }
        setIsLoading(false);
    }, [requireAuth, router]);

    if (isLoading) {
        return React.createElement('div', null, "Loading...");
    }

    if (!isAuthenticated && requireAuth) {
        return null; // Will redirect to login
    }

    return children;
}
