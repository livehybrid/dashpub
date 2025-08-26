/*
Copyright 2020 Splunk Inc. 

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { useEffect, useState } from 'react';

class ReadyHandle {
    _ready = false;
    constructor(type) {
        this.type = type;
        // Initialize notify as a no-op function to prevent errors
        this.notify = () => {};
    }
    ready() {
        if (!this._ready) {
            this._ready = true;
            if (typeof this.notify === 'function') {
                this.notify(this.type);
            }
        }
    }
    isReady() {
        return this._ready;
    }
    remove() {
        if (typeof this.onDelete === 'function') {
            this.onDelete();
        }
        this.notify = null;
    }
}

let isReady = false;
const readinessDeps = new Set();
const readynessCallbacks = new Set();

function trigger() {
    if (isReady) {
        return;
    }
    
    try {
        if ([...readinessDeps].every((d) => d && typeof d.isReady === 'function' && d.isReady())) {
            isReady = true;
            setTimeout(() => {
                for (const cb of readynessCallbacks) {
                    try {
                        if (typeof cb === 'function') {
                            cb();
                        }
                    } catch (error) {
                        console.warn('Error in readiness callback:', error);
                    }
                }
            }, 250);
        }
    } catch (error) {
        console.warn('Error in trigger function:', error);
    }
}

function sub(cb) {
    if (isReady) {
        try {
            if (typeof cb === 'function') {
                cb();
            }
        } catch (error) {
            console.warn('Error in immediate callback:', error);
        }
        return () => {};
    } else {
        if (typeof cb === 'function') {
            readynessCallbacks.add(cb);
        }
        const fallbackTimer = setTimeout(trigger, 100);
        return () => {
            clearTimeout(fallbackTimer);
            if (typeof cb === 'function') {
                readynessCallbacks.delete(cb);
            }
        };
    }
}

export function registerScreenshotReadinessDep(type) {
    const handle = new ReadyHandle(type);
    readinessDeps.add(handle);
    
    // Ensure notify is properly assigned
    handle.notify = trigger;
    
    // Ensure onDelete is properly assigned
    handle.onDelete = () => {
        readinessDeps.delete(handle);
    };
    
    return handle;
}

export function useReadyForScreenshot() {
    const [ready, setReady] = useState(isReady);
    useEffect(
        () =>
            sub(() => {
                setReady(isReady);
            }),
        [setReady]
    );
    return ready;
}

export function SayCheese() {
    const ready = useReadyForScreenshot();
    return ready ? React.createElement('div', { className: "url2png-cheese" }) : null;
}
