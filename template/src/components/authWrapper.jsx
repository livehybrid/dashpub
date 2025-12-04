import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';

// Simple authentication wrapper component
// This can be used in individual pages instead of middleware
export default function AuthWrapper({ children, requireAuth = false }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { config, loading: configLoading } = useConfig();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Wait for config to load
        if (configLoading) {
            return;
        }

        // Check if JWT is required from config
        const jwtRequired = config?.jwtRequired === true || config?.jwtRequired === 'true';
        
        // If authentication is not required, skip the check
        if (!requireAuth || !jwtRequired) {
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
        }

        // Check authentication via API call since cookie is httpOnly
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/auth/verify', {
                    method: 'GET',
                    credentials: 'include' // Include cookies in request
                });
                
                console.log('AuthWrapper: Auth check response status:', response.status);
                
                if (response.ok) {
                    setIsAuthenticated(true);
                } else {
                    // Redirect to login if not authenticated
                    const returnTo = location.pathname;
                    console.log('AuthWrapper: Not authenticated, redirecting to login', { returnTo });
                    navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
                }
            } catch (error) {
                console.error('AuthWrapper: Auth check failed:', error);
                // Redirect to login on error
                const returnTo = location.pathname;
                navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
            }
        };

        checkAuth();
        setIsLoading(false);
    }, [requireAuth, navigate, location.pathname, config, configLoading]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated && requireAuth) {
        return null; // Will redirect to login
    }

    return children;
}
