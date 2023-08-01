import React, { lazy, Suspense, useState, useEffect } from 'react';
import Loading from '../../components/loading';
import NoSSR from '../../components/nossr';
import Page from '../../components/page';
import { useRouter } from 'next/router';
import Fullscreen from '@splunk/react-icons/Fullscreen';

//This rotator takes following parameters:
//pages: comma separated values. This expects the following parameters, pages and timer:
// type, id

//type: either video, or dashboard
//id: either the dashboard id, the movie file hosted in this project

//timer: Note: for video files, we will simply play the entire video and ignore this. For dashboards, this is how long to show the dashboard, in ms.

//So for example:
//https://yourproject.vercel.app/advancedrotator?pages=video,movie.mov,90000,swag_store,dashboard,5000

const Dashboard = lazy(() => import('../../components/dashboard'));

export default function DashboardPage({}) {
    //These are the URL params
    const { query } = useRouter();

    //This let's us know the timer is ticking
    const [ticking, setTicking] = useState(true);

    //This is the current count of the timer
    const [count, setCount] = useState(0);

    //This is the value of the timer. For example "how long do we want each dashboard to show"
    const [timerValue, setTimerValue] = useState(0);

    //These are the final pages that will be shown
    const [finalpages, setFinalPages] = useState([[]]);

    //This is the index of the current page
    const [currPageIndex, setCurrPageIndex] = useState(0);

    //This is the current type of page
    const [currType, setCurrType] = useState('dashboard');

    //This let's us know a video is done playing
    const [videoPlayOver, setVideoPlayOver] = useState(false);

    useEffect(() => {
        console.log(currType);

        if (currType == 'dashboard') {
            if (count > timerValue) {
                setCount(0);
                if (currPageIndex == finalpages.length - 1) {
                    setCurrPageIndex(0);
                    setCurrType(finalpages[0][1]);
                } else {
                    setCurrPageIndex(currPageIndex + 1);
                    setCurrType(finalpages[currPageIndex + 1][1]);
                }
            }
        }

        if (currType == 'video') {
            if (videoPlayOver) {
                setCount(0);
                if (currPageIndex == finalpages.length - 1) {
                    setCurrPageIndex(0);
                    setCurrType(finalpages[0][1]);
                    setVideoPlayOver(false);
                } else {
                    setCurrPageIndex(currPageIndex + 1);
                    setCurrType(finalpages[currPageIndex + 1][1]);
                    setVideoPlayOver(false);
                }
            }
        }
        const timer = setTimeout(() => ticking && setCount(count + 1), 1e3);
        return () => clearTimeout(timer);
    }, [count, ticking]);

    useEffect(() => {
        setTimerValue(query.timer / 1000);
    }, [query.timer]);

    useEffect(() => {
        if (typeof query.pages != 'undefined') {
            var dashboards = [];
            var dashboards = query.pages.split(',');
            setCurrType(dashboards[0]);

            var iterator = 0;

            var pages = [];
            var new_obj = {};
            for (var dashboard in dashboards) {
                if (iterator == 2) {
                    iterator = 0;
                }

                if (iterator == 0) {
                    new_obj['type'] = dashboards[dashboard];
                }
                if (iterator == 1) {
                    new_obj.id = dashboards[dashboard];
                    pages.push(new_obj);
                    new_obj = {};
                }
                iterator = iterator + 1;
            }

            var baseUrl = `https://${process.env.VERCEL_URL}`;

            var temp_pages = [];

            for (var page in pages) {
                if (pages[page].type == 'dashboard') {
                    var definition = require(`../../dashboards/${pages[page].id}/definition.json`);
                    console.log(definition);

                    temp_pages.push([
                        <Page
                            title={definition.title || 'Dashboard'}
                            description={definition.description}
                            imageUrl={`/screens/${pages[page].id}.png`}
                            path={`/${pages[page].id}`}
                            backgroundColor={definition.layout.options.backgroundColor}
                            theme={definition.theme}
                            baseUrl={baseUrl}
                        >
                            <NoSSR>
                                <Suspense fallback={<Loading />}>
                                    <Dashboard definition={definition} />
                                </Suspense>
                            </NoSSR>
                        </Page>,
                        'dashboard',
                    ]);
                }

                if (pages[page].type == 'video') {
                    temp_pages.push([
                        <Page title="Dashboards" theme="dark" backgroundColor="#000">
                            <div style={{ width: '100%', margin: 'auto', display: 'block' }}>
                                <img
                                    style={{
                                        display: 'block',
                                        margin: '20px',
                                        marginLeft: 'auto',
                                        marginTop: '50px',
                                        marginRight: '50px',
                                    }}
                                    src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAzIiBoZWlnaHQ9IjYwIiB2aWV3Qm94PSIwIDAgMjAzIDYwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMjIuMDQ2OCAzNi4zMzY1QzIyLjA0NjggMzcuNjczIDIxLjc2NDIgMzguOTE1MiAyMS4xOTg4IDQwLjA2MjhDMjAuNjMzNSA0MS4xOTUgMTkuODMyNSA0Mi4xNjk4IDE4LjgyNzMgNDIuOTU2QzE3LjgwNjUgNDMuNzU3OCAxNi41OTczIDQ0LjM3MSAxNS4xOTk2IDQ0LjgxMTNDMTMuODAxOSA0NS4yNTE1IDEyLjI2MjggNDUuNDcxNyAxMC41OTgxIDQ1LjQ3MTdDOC42MDM2MyA0NS40NzE3IDYuODEzMyA0NS4yMDQzIDUuMjQyODMgNDQuNjU0MkMzLjY3MjM3IDQ0LjExOTUgMi4wODYxNyA0My4yMDc1IDAuNSA0MS45NDk3TDMuMTIyNyAzNy42ODg3QzQuMzc5MDcgMzguNzQyMiA1LjUwOTggMzkuNTEyNyA2LjUzMDYgNDBDNy41MzU3IDQwLjQ4NzUgOC41NzIyMiA0MC43MjMzIDkuNjQwMTMgNDAuNzIzM0MxMC45NDM2IDQwLjcyMzMgMTEuOTgwMSA0MC4zOTMgMTIuNzgxMSAzOS43MTdDMTMuNTgyIDM5LjA0MDggMTMuOTU4OSAzOC4xNDQ3IDEzLjk1ODkgMzYuOTk2OEMxMy45NTg5IDM2LjUwOTUgMTMuODgwNCAzNi4wNTM1IDEzLjczOTEgMzUuNjI5QzEzLjU5NzcgMzUuMjA0MyAxMy4zMzA3IDM0Ljc2NDIgMTIuOTUzOCAzNC4zMDgyQzEyLjU3NjkgMzMuODY4IDEyLjA0MyAzMy4zNjQ4IDExLjM2NzYgMzIuODQ2QzEwLjcwODEgMzIuMzI3IDkuODQ0MyAzMS42NjY3IDguNzc2MzggMzAuODk2MkM3Ljk3NTQ1IDMwLjMzMDIgNy4xNzQ0OCAyOS43MzI3IDYuNDA0OTcgMjkuMTM1MkM1LjYzNTQzIDI4LjUyMiA0Ljk0NDQzIDI3Ljg3NzMgNC4zMDA1NSAyNy4xODU1QzMuNjcyMzcgMjYuNDkzNyAzLjE2OTggMjUuNzIzMyAyLjc3NzE4IDI0Ljg1ODVDMi40MDAyNyAyNC4wMDk1IDIuMTk2MTIgMjMuMDE4OCAyLjE5NjEyIDIxLjkzNEMyLjE5NjEyIDIwLjY3NjIgMi40NjMxIDE5LjUxMjUgMi45ODEzNSAxOC40NzQ4QzMuNDk5NiAxNy40MzcyIDQuMjIyMDIgMTYuNTU2NiA1LjEzMjg4IDE1LjgxNzZDNi4wNDM3NSAxNS4wNzg2IDcuMTI3MzggMTQuNTEyNiA4LjQxNTE3IDE0LjEwMzhDOS42ODcyNSAxMy42OTUgMTEuMDY5MyAxMy40OTA2IDEyLjU3NjkgMTMuNDkwNkMxNC4xNjMxIDEzLjQ5MDYgMTUuNjg2NCAxMy42OTUgMTcuMTYyNyAxNC4xMTk1QzE4LjYzODggMTQuNTQ0IDIwLjAwNTIgMTUuMTU3MiAyMS4yNzczIDE1Ljk3NDhMMTguOTA1OCAxOS44MTEzQzE3LjI4ODMgMTguNjc5MiAxNS41NzY1IDE4LjA5NzUgMTMuNzg2MiAxOC4wOTc1QzEyLjcwMjUgMTguMDk3NSAxMS43OTE3IDE4LjM4MDUgMTEuMDg1IDE4Ljk0NjVDMTAuMzc4MiAxOS41MTI1IDEwLjAxNyAyMC4yMjAyIDEwLjAxNyAyMS4wODQ4QzEwLjAxNyAyMS45MDI1IDEwLjMzMTEgMjIuNjQxNSAxMC45NTkzIDIzLjI4NjJDMTEuNTg3NSAyMy45NDY1IDEyLjY3MTEgMjQuODQyOCAxNC4yMTAyIDI2LjAzNzdDMTUuNzY1IDI3LjE2OTggMTcuMDUyNyAyOC4xNzYyIDE4LjA1NzggMjkuMDI1MkMxOS4wNzg3IDI5Ljg3NDIgMTkuODc5NyAzMC42OTE4IDIwLjQ3NjMgMzEuNDQ2NUMyMS4wNzMyIDMyLjIwMTMgMjEuNDY1OCAzMi45NTYgMjEuNzAxMyAzMy43NDIyQzIxLjkzNjggMzQuNTQ0IDIyLjA0NjggMzUuMzkzIDIyLjA0NjggMzYuMzM2NVpNNDguOTgwMyAyOS4xNTFDNDguOTgwMyAzMC4zMzAyIDQ4Ljg1NDcgMzEuNjAzOCA0OC42MDM1IDMyLjk3MTdDNDguMzY3OCAzNC4zMzk3IDQ3Ljk0MzggMzUuNTk3NSA0Ny4zNDcyIDM2Ljc2MUM0Ni43NTAzIDM3LjkyNDUgNDUuOTgwOCAzOC44ODM3IDQ1LjAyMjggMzkuNjIyN0M0NC4wNjQ4IDQwLjM3NzMgNDIuODM5OCA0MC43NTQ3IDQxLjM3OTMgNDAuNzU0N0MzOC45MjkzIDQwLjc1NDcgMzYuOTk3NyAzOS43Nzk4IDM1LjU4NDMgMzcuODE0NUMzNC4xNzA4IDM1Ljg2NDggMzMuNDY0MiAzMy4xNzYyIDMzLjQ2NDIgMjkuNzY0MkMzMy40NjQyIDI2LjI1NzggMzQuMTcwOCAyMy40OTA1IDM1LjYxNTcgMjEuNDMwOEMzNy4wNDQ4IDE5LjM3MSAzOC45OTIyIDE4LjM0OSA0MS40NDIyIDE4LjM0OUM0My43NjY1IDE4LjM0OSA0NS42MDM4IDE5LjMyMzggNDYuOTU0NSAyMS4yNDIyQzQ4LjMwNTIgMjMuMTc2MiA0OC45ODAzIDI1LjgxNzcgNDguOTgwMyAyOS4xNTFaTTU3LjQ5MjMgMjguODUyMkM1Ny40OTIzIDI2LjU3MjMgNTcuMTYyNSAyNC40OTY4IDU2LjUxODcgMjIuNjQxNUM1NS44NTkgMjAuNzcwNSA1NC45NDgyIDE5LjE2NjcgNTMuNzM4OCAxNy44MTQ1QzUyLjUyOTcgMTYuNDYyMyA1MS4xMTYyIDE1LjQyNDUgNDkuNDY3MiAxNC42Njk4QzQ3LjgxODIgMTMuOTE1MSA0NS45OTY1IDEzLjUzNzcgNDQuMDAyIDEzLjUzNzdDNDEuODAzMyAxMy41Mzc3IDM5Ljg3MTcgMTMuOTYyMyAzOC4yMDcgMTQuNzc5OUMzNi41NDIzIDE1LjYxMzIgMzQuOTg3NSAxNi45MTgyIDMzLjU3NCAxOC43MTA3TDMzLjUyNyAxNC4yNjFIMjUuNjkwM1Y2MEgzMy41MTEzVjQwLjY3NjJDMzQuMjgwOCA0MS41NzIzIDM1LjAxODggNDIuMzI3IDM1Ljc0MTMgNDIuOTQwM0MzNi40NDggNDMuNTUzNSAzNy4xNzA1IDQ0LjA1NjcgMzcuOTA4NyA0NC40MzRDMzguNjQ2NyA0NC44MTEzIDM5LjQxNjIgNDUuMDk0MyA0MC4yMzI4IDQ1LjI1MTdDNDEuMDQ5NSA0NS40MDg4IDQxLjkyOSA0NS40ODc1IDQyLjg1NTUgNDUuNDg3NUM0NC45Mjg1IDQ1LjQ4NzUgNDYuODc2IDQ1LjA2MjggNDguNjY2MyA0NC4yNDUzQzUwLjQ1NjcgNDMuNDEyIDUyLjAxMTMgNDIuMjQ4NSA1My4zMTQ4IDQwLjczOUM1NC42MTgzIDM5LjIyOTUgNTUuNjM5MiAzNy40Njg1IDU2LjM3NzMgMzUuNDcxN0M1Ny4xMzEyIDMzLjQ1OTIgNTcuNDkyMyAzMS4yNDIyIDU3LjQ5MjMgMjguODUyMlpNNjAuOTc4OCA0NC43NDg1SDY5LjAxOTVWMEg2MC45Nzg4VjQ0Ljc0ODVaTTEwMy4zMTkgNDQuNzY0MlYxNC4yMjk2SDk1LjI3NzhWMzAuNjYwM0M5NS4yNzc4IDMyLjEyMjcgOTUuMjE1IDMzLjI1NDcgOTUuMDg5MyAzNC4wNTY3Qzk0Ljk2MzcgMzQuODU4NSA5NC43NTk1IDM1LjU2NiA5NC40NzY4IDM2LjIyNjVDOTMuMzQ2MiAzOC43NDIyIDkxLjI1NzMgNDAuMDE1NyA4OC4yMjYzIDQwLjAxNTdDODUuODU1IDQwLjAxNTcgODQuMjA2IDM5LjE2NjcgODMuMjYzNyAzNy40NTI4QzgyLjg4NjggMzYuODA4MiA4Mi42MzU1IDM2LjA2OTIgODIuNDk0MiAzNS4yNTE1QzgyLjM1MjggMzQuNDM0IDgyLjI3NDMgMzMuMjU0NyA4Mi4yNzQzIDMxLjY5ODJWMTQuMjI5Nkg3NC4yMzM1VjMxLjU3MjNDNzQuMjMzNSAzMi43NTE1IDc0LjI0OTIgMzMuNzU3OCA3NC4yNjUgMzQuNTU5OEM3NC4yODA3IDM1LjM2MTcgNzQuMzQzNSAzNi4xMDA3IDc0LjQyMiAzNi43Mjk1Qzc0LjUwMDUgMzcuMzU4NSA3NC41OTQ3IDM3LjkyNDUgNzQuNzA0NyAzOC40MTJDNzQuNzk4OCAzOC44OTkzIDc0Ljk1NiAzOS4zNzEgNzUuMTYwMiAzOS44MTEzQzc1Ljg5ODIgNDEuNjgyMyA3Ny4wNzYgNDMuMDk3NSA3OC43MjUgNDQuMDU2N0M4MC4zNzQgNDUuMDE1NyA4Mi40IDQ1LjQ4NzUgODQuNzg3MiA0NS40ODc1Qzg2LjkzODcgNDUuNDg3NSA4OC44Mzg4IDQ1LjExIDkwLjQ3MjIgNDQuMzU1M0M5Mi4xMDU1IDQzLjYwMDcgOTMuNjkxNyA0Mi4zNzQyIDk1LjIzMDcgNDAuNjYwM0w5NS4yNDYzIDQ0Ljc0ODVMMTAzLjMxOSA0NC43NjQyWk0xMzcuOTYzIDQ0Ljc0ODVWMjcuNDM3MkMxMzcuOTYzIDI2LjI1NzggMTM3Ljk0NyAyNS4yNTE1IDEzNy45MzIgMjQuNDE4MkMxMzcuOTE2IDIzLjU4NDggMTM3Ljg2OSAyMi44NjE3IDEzNy43NzUgMjIuMjQ4NUMxMzcuNjk2IDIxLjYzNTIgMTM3LjU4NiAyMS4xMDA3IDEzNy40NzYgMjAuNjQ0N0MxMzcuMzUxIDIwLjE3MyAxMzcuMjA5IDE5LjcxNyAxMzcuMDUyIDE5LjI3NjdDMTM2LjMxNCAxNy40NTI4IDEzNS4xMzYgMTYuMDM3NyAxMzMuNDg3IDE1LjA0NzJDMTMxLjgzOCAxNC4wNTY2IDEyOS44MTIgMTMuNTUzNSAxMjcuNDEgMTMuNTUzNUMxMjUuMjU4IDEzLjU1MzUgMTIzLjM1OCAxMy45MzA4IDEyMS43MjQgMTQuNjg1NUMxMjAuMDkxIDE1LjQ0MDMgMTE4LjUwNSAxNi42ODIzIDExNi45NjYgMTguMzgwNUwxMTYuOTUgMTQuMjkyNUgxMDguODYyVjQ0Ljc2NDJIMTE2Ljk2NlYyOC4zMTc3QzExNi45NjYgMjYuOTAyNSAxMTcuMDEzIDI1Ljc4NjIgMTE3LjEyMyAyNUMxMTcuMjE3IDI0LjIxMzggMTE3LjQyMSAyMy40NzQ4IDExNy43MDQgMjIuNzY3M0MxMTguMjIyIDIxLjU0MDggMTE5LjAzOSAyMC42MjkgMTIwLjEyMyAyMEMxMjEuMjA2IDE5LjM3MSAxMjIuNDk0IDE5LjA1NjcgMTI0LjAwMiAxOS4wNTY3QzEyNi4zNzMgMTkuMDU2NyAxMjguMDIyIDE5LjkwNTcgMTI4Ljk2NCAyMS42MTk1QzEyOS4zMjYgMjIuMjY0MiAxMjkuNTc3IDIzLjAwMzIgMTI5LjcxOCAyMy44MDVDMTI5Ljg1OSAyNC42MDcgMTI5LjkzOCAyNS44MDE4IDEyOS45MzggMjcuMzQyOFY0NC43MzI3TDEzNy45NjMgNDQuNzQ4NVpNMTcxLjIyNSA0Mi43MzU4TDE1OC45NzYgMjcuNUwxNjkuMzI1IDE2LjM5OTRMMTYzLjIzMiAxMy43NzM2TDE1Mi40NTggMjYuMjczNUgxNTEuNjFWMEgxNDMuNTA3VjQ0Ljc0ODVIMTUxLjYxVjI4LjUzNzdMMTYzLjczNCA0NS4zNjE3TDE3MS4yMjUgNDIuNzM1OFpNMjAyLjU0MiAzMS43OTI1VjI2LjgwODJMMTc4LjE4MyAxNC41NzU1VjIwLjA2MjhMMTk3LjA2IDI5LjI2MUwxNzguMTgzIDM4LjU4NDhWNDMuOTQ2NUwyMDIuNTQyIDMxLjc5MjVaTTE4MC41MzggNi42NjY2N0MxNzkuMDQ3IDYuNjY2NjcgMTc3LjgzNyA3Ljg5MzA4IDE3Ny44MzcgOS40MDI1MkMxNzcuODM3IDEwLjk0MzQgMTc5LjA0NyAxMi4xNTQxIDE4MC41MzggMTIuMTU0MUMxODIuMDQ3IDEyLjE1NDEgMTgzLjI0IDEwLjk0MzQgMTgzLjI0IDkuNDAyNTJDMTgzLjI0IDcuODc3MzcgMTgyLjA0NyA2LjY2NjY3IDE4MC41MzggNi42NjY2N1pNMTgwLjU1NSA3LjA5MTE4QzE4MS43NjMgNy4wOTExOCAxODIuNzM3IDguMTI4OTMgMTgyLjczNyA5LjQxODI1QzE4Mi43MzcgMTAuNzA3NiAxODEuNzYzIDExLjc0NTMgMTgwLjU1NSAxMS43Mjk2QzE3OS4zMyAxMS43Mjk2IDE3OC4zNTUgMTAuNzA3NiAxNzguMzU1IDkuNDAyNTJDMTc4LjM1NSA4LjEyODkzIDE3OS4zMyA3LjA5MTE4IDE4MC41NTUgNy4wOTExOFpNMTgwLjAzNyA5LjY4NTUzSDE4MC4zNjVDMTgwLjc1OCA5LjY4NTUzIDE4MC45NDcgOS44MjcwNSAxODEuMDI1IDEwLjIyMDFDMTgxLjA4OCAxMC42Mjg5IDE4MS4xNjcgMTAuODk2MiAxODEuMjMgMTAuOTkwNkgxODEuNzQ4QzE4MS43IDEwLjg5NjIgMTgxLjYyMiAxMC43MDc2IDE4MS41NiAxMC4yMzU5QzE4MS40OTcgOS43Nzk4NyAxODEuMzIzIDkuNTQ0MDMgMTgxLjA0MiA5LjQ5Njg3VjkuNDY1NEMxODEuMzcyIDkuMzcxMDcgMTgxLjYzOCA5LjExOTUgMTgxLjYzOCA4LjcyNjQyQzE4MS42MzggOC40NDM0IDE4MS41NDMgOC4yMjMyNyAxODEuMzU1IDguMDk3NDhDMTgxLjE2NyA3Ljk1NTk4IDE4MC44NjggNy44NjE2MyAxODAuNDEzIDcuODYxNjNDMTgwLjA1MiA3Ljg2MTYzIDE3OS44IDcuODkzMDggMTc5LjU1IDcuOTQwMjVWMTAuOTkwNkgxODAuMDM3VjkuNjg1NTNaTTE4MC4wMzcgOC4yNzA0M0MxODAuMTE1IDguMjU0NzIgMTgwLjIyNSA4LjIzOSAxODAuMzgyIDguMjM5QzE4MC45MzIgOC4yMzkgMTgxLjEyIDguNTA2MyAxODEuMTIgOC43NzM2QzE4MS4xMiA5LjE1MDk1IDE4MC43NzMgOS4yOTI0NSAxODAuMzgyIDkuMjkyNDVIMTgwLjAzN1Y4LjI3MDQzWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg=="
                                ></img>
                            </div>
                            <div style={{ width: '100%', margin: 'auto' }}>
                                {' '}
                                <video
                                    autoPlay
                                    muted
                                    onEnded={(e) => {
                                        setVideoPlayOver(true);
                                    }}
                                    width="1080px"
                                    style={{ margin: 'auto', align: 'center', display: 'block' }}
                                    src={require('../../../public/' + pages[page].id)}
                                />{' '}
                            </div>
                        </Page>,
                        'video',
                    ]);
                }
            }
            setFinalPages(temp_pages);
            console.log(temp_pages);
        }
    }, [query.pages]);

    const toggleFullSceen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            document.body.style.cursor = 'none';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    if (!query.pages || !query.timer) {
        return <></>;
    } else {
        return (
            <>
                <Fullscreen
                    style={{
                        position: 'fixed',
                        zIndex: '2',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        color: 'black',
                    }}
                    onClick={() => toggleFullSceen()}
                ></Fullscreen>

                <div
                    style={{
                        '&:hover': {
                            cursor: 'none',
                        },
                    }}
                >
                    {finalpages[currPageIndex][0]}
                </div>
            </>
        );
    }
}
