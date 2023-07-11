import React from 'react';
import Homepage from '../components/home';
import Page from '../components/page';
import 'bootstrap/dist/css/bootstrap.css';

export default function Home({}) {
    return (
        <Page title="Dashboards" theme="light">
            <Homepage />
        </Page>
    );
}
