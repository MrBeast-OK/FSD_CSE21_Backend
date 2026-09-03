/**
 * UniConnect Background Service Worker
 * Handles opening the captive portal tab and injecting the auto-fill script.
 * Optimized for Sophos/Cyberoam captive portals (common in Indian colleges).
 */

// Listen for login trigger from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'triggerLogin') {
        handleLogin(message)
            .then(() => sendResponse({ success: true }))
            .catch((err) => {
                console.error('UniConnect: Login trigger failed:', err);
                sendResponse({ success: false, error: err.message });
            });
        return true; // Keep message channel open for async response
    }
});

async function handleLogin({ url, username, password }) {
    // Force HTTP for local IPs to avoid SSL cert errors
    url = forceHttpForLocalIP(url);

    // Check if there's already a tab open with this URL
    const existingTabs = await chrome.tabs.query({});
    let targetTab = null;

    for (const tab of existingTabs) {
        if (tab.url && isSamePortal(tab.url, url)) {
            targetTab = tab;
            // Bring existing tab into focus and reload
            await chrome.tabs.update(tab.id, { active: true });
            await chrome.tabs.reload(tab.id);
            break;
        }
    }

    // Open a new tab if none found
    if (!targetTab) {
        targetTab = await chrome.tabs.create({ url, active: true });
    }

    // Wait for the tab to finish loading, then inject
    return new Promise((resolve, reject) => {
        const listener = (tabId, changeInfo) => {
            if (tabId === targetTab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);

                // Wait a bit longer for Sophos portals — they load JS dynamically
                setTimeout(async () => {
                    try {
                        const config = await chrome.storage.local.get([
                            'userSelector',
                            'passSelector',
                            'submitSelector'
                        ]);

                        await chrome.scripting.executeScript({
                            target: { tabId: targetTab.id },
                            func: autoFillAndSubmit,
                            args: [
                                username,
                                password,
                                config.userSelector || '',
                                config.passSelector || '',
                                config.submitSelector || ''
                            ]
                        });
                        resolve();
                    } catch (err) {
                        console.error('UniConnect: Injection failed:', err);
                        // If injection fails (e.g. SSL error page), try HTTP fallback
                        if (url.startsWith('https://')) {
                            const httpUrl = url.replace('https://', 'http://');
                            console.log('UniConnect: Retrying with HTTP...');
                            try {
                                await chrome.tabs.update(targetTab.id, { url: httpUrl });
                                // Re-listen for that tab to load
                                const retryListener = async (retryTabId, retryInfo) => {
                                    if (retryTabId === targetTab.id && retryInfo.status === 'complete') {
                                        chrome.tabs.onUpdated.removeListener(retryListener);
                                        setTimeout(async () => {
                                            try {
                                                await chrome.scripting.executeScript({
                                                    target: { tabId: targetTab.id },
                                                    func: autoFillAndSubmit,
                                                    args: [username, password, config.userSelector || '', config.passSelector || '', config.submitSelector || '']
                                                });
                                                resolve();
                                            } catch (e2) {
                                                reject(e2);
                                            }
                                        }, 500);
                                    }
                                };
                                chrome.tabs.onUpdated.addListener(retryListener);
                            } catch (e) {
                                reject(e);
                            }
                        } else {
                            reject(err);
                        }
                    }
                }, 500);
            }
        };

        chrome.tabs.onUpdated.addListener(listener);

        // Safety timeout
        setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            reject(new Error('Tab load timeout'));
        }, 30000);
    });
}

/**
 * Force HTTP for private IP addresses to avoid SSL certificate errors.
 */
function forceHttpForLocalIP(url) {
    if (!url.startsWith('https://')) return url;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname;
        const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.)/.test(host)
            || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
        if (isPrivate) {
            return url.replace('https://', 'http://');
        }
    } catch (e) { /* ignore */ }
    return url;
}

/**
 * Check if a tab URL matches the portal URL (same host:port).
 */
function isSamePortal(tabUrl, portalUrl) {
    try {
        const a = new URL(tabUrl);
        const b = new URL(portalUrl);
        return a.hostname === b.hostname && a.port === b.port;
    } catch {
        return false;
    }
}

/**
 * Auto-fill function injected into the captive portal page.
 * Handles Sophos/Cyberoam portals and generic login forms.
 */
function autoFillAndSubmit(username, password, userSel, passSel, submitSel) {
    console.log('UniConnect: Auto-fill script injected into', window.location.href);

    // ── Sophos/Cyberoam specific selectors (highest priority) ──
    const SOPHOS_SELECTORS = {
        user: [
            'input[name="username"]',
            'input#username',
            '#LoginUserPassword_auth_username',
        ],
        pass: [
            'input[name="password"]',
            'input#password',
            '#LoginUserPassword_auth_password',
        ],
        submit: [
            'input[id="loginbtn"]',
            '#loginbtn',
            'input[value="Login"]',
            'input[value="Sign In"]',
            'button#loginbtn',
        ]
    };

    // ── Generic/fallback selectors ──
    const GENERIC_SELECTORS = {
        user: [
            'input[name*="user" i]',
            'input[id*="user" i]',
            'input[name*="login" i]',
            'input[id*="login" i]',
            'input[name*="email" i]',
            'input[name*="identity" i]',
            'input[type="text"]',
            'input[type="email"]',
            'input:not([type="password"]):not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"])'
        ],
        pass: [
            'input[type="password"]',
            'input[name*="pass" i]',
            'input[id*="pass" i]'
        ],
        submit: [
            'button[type="submit"]',
            'input[type="submit"]',
            'button[id*="login" i]',
            'button[id*="submit" i]',
            'input[type="button"][value*="Log" i]',
            'input[type="button"][value*="Sign" i]',
            'button[class*="login" i]',
            'button[class*="submit" i]',
            'a[id*="login" i]',
            'button',
            'input[type="button"]'
        ]
    };

    // Build final selector lists: custom > Sophos > generic
    const userSelectors = userSel ? [userSel, ...SOPHOS_SELECTORS.user, ...GENERIC_SELECTORS.user]
        : [...SOPHOS_SELECTORS.user, ...GENERIC_SELECTORS.user];
    const passSelectors = passSel ? [passSel, ...SOPHOS_SELECTORS.pass, ...GENERIC_SELECTORS.pass]
        : [...SOPHOS_SELECTORS.pass, ...GENERIC_SELECTORS.pass];
    const submitSelectors = submitSel ? [submitSel, ...SOPHOS_SELECTORS.submit, ...GENERIC_SELECTORS.submit]
        : [...SOPHOS_SELECTORS.submit, ...GENERIC_SELECTORS.submit];

    function findElement(selectors) {
        for (const sel of selectors) {
            try {
                const el = document.querySelector(sel);
                if (el && el.offsetParent !== null) return el;
                if (el) return el;
            } catch (e) { /* invalid selector */ }
        }
        return null;
    }

    // Also check inside iframes (some portals use them)
    function findElementInFrames(selectors) {
        // Try main document first
        let el = findElement(selectors);
        if (el) return el;

        // Try iframes
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                for (const sel of selectors) {
                    try {
                        const iframeEl = iframeDoc.querySelector(sel);
                        if (iframeEl) return iframeEl;
                    } catch (e) { /* skip */ }
                }
            } catch (e) { /* cross-origin iframe, skip */ }
        }
        return null;
    }

    /**
     * Set value with proper event simulation for React/Angular/Sophos JS validation.
     */
    function setNativeValue(el, value) {
        // Clear first
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));

        // Use native setter if available (handles React controlled components)
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
        )?.set;

        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(el, value);
        } else {
            el.value = value;
        }

        // Fire all the events that login forms might listen for
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
        el.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, key: 'a' }));
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
    }

    // ── Retry loop — Sophos pages can take a while to render ──
    let attempts = 0;
    const maxAttempts = 30;

    const interval = setInterval(() => {
        attempts++;
        console.log('UniConnect: Attempt', attempts, 'to find login fields...');

        const userInput = findElementInFrames(userSelectors);
        const passInput = findElementInFrames(passSelectors);

        if (userInput && passInput) {
            clearInterval(interval);
            console.log('UniConnect: Found login fields!', userInput, passInput);

            // Focus and fill username
            userInput.focus();
            userInput.click();
            setNativeValue(userInput, username);

            // Fill password after a short delay
            setTimeout(() => {
                passInput.focus();
                passInput.click();
                setNativeValue(passInput, password);

                // Click submit after another delay
                setTimeout(() => {
                    const submitBtn = findElementInFrames(submitSelectors);
                    if (submitBtn) {
                        console.log('UniConnect: Clicking submit button...');
                        submitBtn.focus();
                        submitBtn.click();
                        // Also dispatch a MouseEvent for good measure
                        submitBtn.dispatchEvent(new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        }));
                    } else {
                        // Try submitting via the form element
                        const form = userInput.closest('form') || passInput.closest('form');
                        if (form) {
                            console.log('UniConnect: Submitting via form.submit()...');
                            form.submit();
                        } else {
                            // Last resort: press Enter on the password field
                            console.log('UniConnect: No submit found, pressing Enter...');
                            passInput.dispatchEvent(new KeyboardEvent('keydown', {
                                key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
                            }));
                            passInput.dispatchEvent(new KeyboardEvent('keypress', {
                                key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
                            }));
                            passInput.dispatchEvent(new KeyboardEvent('keyup', {
                                key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
                            }));
                        }
                    }
                }, 60);
            }, 30);
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.log('UniConnect: Could not find login fields after', maxAttempts, 'attempts.');
            console.log('UniConnect: Username field found:', !!userInput);
            console.log('UniConnect: Password field found:', !!passInput);
        }
    }, 250);
}
