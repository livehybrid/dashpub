import React, { useState, useEffect } from 'react';

function ClientOnly({ children, fallback = null }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    console.log('ClientOnly: Rendering fallback (server-side)');
    return fallback;
  }

  console.log('ClientOnly: Rendering children (client-side)');
  return children;
}

export default ClientOnly;
