import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { variables } from '@splunk/themes';
import Button from '@splunk/react-ui/Button';
import Modal from '@splunk/react-ui/Modal';
import Magnifier from '@splunk/react-icons/Magnifier';
import Clipboard from '@splunk/react-icons/Clipboard';

/*
 * ViewSourceModal — a Splunk-UI "View source" affordance for a published
 * dashboard. A pill button floats top-right; clicking it opens a Splunk Modal
 * showing the dashboard's Dashboard Studio definition JSON, with copy-to-
 * clipboard. Gated by config.viewSource (env: DASHPUB_VIEW_SOURCE).
 *
 * Uses @splunk/react-ui (Modal/Button) + @splunk/themes so it inherits the
 * SplunkThemeProvider already wrapping the app (light/dark follows the page).
 */

// dashpub decorates the definition with these; strip them so the shown source
// is the clean Studio JSON you can paste straight back into Splunk.
const DASHPUB_ONLY_KEYS = ['screenshotUrl', 'screenshotHash'];

const TriggerContainer = styled.div`
    position: fixed;
    top: 8px;
    right: 12px;
    z-index: 100;
`;

const SourcePre = styled.pre`
    margin: 0;
    padding: 12px 14px;
    max-height: 60vh;
    overflow: auto;
    white-space: pre;
    font-family: 'Splunk Platform Mono', Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
    border: 1px solid ${variables.borderColor || '#e0e0e0'};
    border-radius: 3px;
    background-color: ${variables.backgroundColorSection || '#f6f6f6'};
    color: ${variables.contentColorDefault || '#24292e'};
`;

function toSourceJson(definition) {
    if (!definition) return '';
    const clean = { ...definition };
    for (const k of DASHPUB_ONLY_KEYS) delete clean[k];
    return JSON.stringify(clean, null, 2);
}

export default function ViewSourceModal({ definition, title }) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const json = useMemo(() => toSourceJson(definition), [definition]);

    const handleCopy = useCallback(async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(json);
            } else {
                const ta = document.createElement('textarea');
                ta.value = json;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (e) {
            // Clipboard blocked (e.g. non-secure context) — JSON stays on screen
            // for manual selection, so this is a soft failure.
        }
    }, [json]);

    if (!definition) return null;

    const close = () => setOpen(false);

    return (
        <>
            <TriggerContainer>
                <Button
                    appearance="pill"
                    icon={<Magnifier />}
                    label="View source"
                    onClick={() => setOpen(true)}
                />
            </TriggerContainer>
            {open && (
                <Modal onRequestClose={close} open style={{ width: '960px', maxWidth: '94vw' }}>
                    <Modal.Header
                        title="Dashboard source"
                        subtitle={title}
                        icon={<Magnifier />}
                        onRequestClose={close}
                    />
                    <Modal.Body>
                        <SourcePre>{json}</SourcePre>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            appearance="secondary"
                            icon={<Clipboard />}
                            label={copied ? 'Copied!' : 'Copy JSON'}
                            onClick={handleCopy}
                        />
                        <Button appearance="primary" label="Close" onClick={close} />
                    </Modal.Footer>
                </Modal>
            )}
        </>
    );
}
