import React, { Suspense, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import styled from 'styled-components';
import { variables } from '@splunk/themes';
import { useConfig } from '../contexts/ConfigContext';

// Lazy load Breadcrumbs and Button
const Breadcrumbs = React.lazy(() => import('@splunk/react-ui/Breadcrumbs').catch(() => ({ default: null })));
const Button = React.lazy(() => import('@splunk/react-ui/Button').catch(() => ({ default: null })));

const BreadcrumbContainer = styled.div`
  padding: 12px 20px;
  border-bottom: 1px solid ${variables.borderColor || '#e0e0e0'};
  background-color: ${variables.backgroundColorPage || '#ffffff'};
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 100;
  position: relative;
  width: 100%;
  box-sizing: border-box;
`;

const BackButtonContainer = styled.div`
  margin-right: 8px;
`;

// Fallback simple breadcrumbs
function SimpleBreadcrumbs({ items, navigate }) {
  const getThemeColor = (colorName, fallback) => {
    try {
      return variables[colorName] || fallback;
    } catch {
      return fallback;
    }
  };
  
  return (
    <nav style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span style={{ margin: '0 4px', color: getThemeColor('textColorSecondary', '#666') }}>
              /
            </span>
          )}
          {item.onClick || item.to ? (
            <Link
              to={item.to || '/'}
              onClick={(e) => {
                e.preventDefault();
                if (item.onClick) {
                  item.onClick();
                } else {
                  navigate(item.to || '/');
                }
              }}
              style={{ 
                textDecoration: 'none', 
                color: getThemeColor('linkColor', '#007bff'),
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: getThemeColor('textColor', '#333'), fontSize: '14px', fontWeight: 500 }}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// Fallback simple back button
function SimpleBackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        border: `1px solid ${variables?.borderColor || '#ccc'}`,
        borderRadius: '4px',
        background: variables?.backgroundColorPage || 'white',
        cursor: 'pointer',
        fontSize: '14px',
        color: variables?.textColor || '#333'
      }}
    >
      ← Back
    </button>
  );
}

export default function BreadcrumbNavigation({ dashboardTitle, showBackButton = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { config } = useConfig();
  
  // Check if breadcrumbs are enabled
  const breadcrumbsEnabled = config?.breadcrumbs?.enabled !== false;
  
  // Don't show breadcrumbs on homepage
  if (location.pathname === '/') {
    return null;
  }
  
  if (!breadcrumbsEnabled) {
    return null;
  }

  const backButtonEnabled = config?.breadcrumbs?.showBackButton !== false;
  const homeTitle = config?.title || 'Dashboards';
  
  // Build breadcrumb items
  const items = [
    {
      label: homeTitle,
      onClick: () => navigate('/'),
      to: '/'
    }
  ];

  // Add dashboard breadcrumb if we're on a dashboard page
  if (dashboardTitle) {
    items.push({
      label: dashboardTitle,
    });
  }

  // Debug logging
  useEffect(() => {
    console.log('[Breadcrumbs] Rendering:', {
      pathname: location.pathname,
      dashboardTitle,
      breadcrumbsEnabled,
      items,
      config: config?.breadcrumbs
    });
  }, [location.pathname, dashboardTitle, breadcrumbsEnabled, config]);

  return (
    <BreadcrumbContainer>
      {showBackButton && backButtonEnabled && location.pathname !== '/' && (
        <BackButtonContainer>
          <SimpleBackButton onClick={() => navigate('/')} />
        </BackButtonContainer>
      )}
      <SimpleBreadcrumbs items={items} navigate={navigate} />
    </BreadcrumbContainer>
  );
}
