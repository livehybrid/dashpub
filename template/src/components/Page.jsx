import React from 'react';
import { SplunkThemeProvider, variables } from '@splunk/themes';
import styled from 'styled-components';
import NoSSR from './NoSSR';

const PageContainer = styled.div`
  width: 100vw;
  min-height: 100vh;
  background-color: ${variables.backgroundColor};
`;

const PageContent = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`;

function Page({ children }) {
  return (
    <PageContainer>
      <PageContent>
        <NoSSR>
          {children}
        </NoSSR>
      </PageContent>
    </PageContainer>
  );
}

export default Page;
