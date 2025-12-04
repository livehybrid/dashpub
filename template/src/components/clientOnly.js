import React, { useState, useEffect } from 'react';

// ClientOnly component to prevent hydration mismatches
export default function ClientOnly({ children, fallback = null }) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        console.log('ClientOnly: Component mounted on client');
        setHasMounted(true);
    }, []);

    if (!hasMounted) {
        console.log('ClientOnly: Rendering fallback (server-side)');
        return fallback;
    }

    console.log('ClientOnly: Rendering children (client-side)');
    return children;
}
