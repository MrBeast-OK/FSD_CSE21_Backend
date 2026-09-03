/**
 * UniConnect Content Script
 * Runs on every page load — if the user gets redirected to the captive portal
 * (e.g. when connecting to WiFi), this auto-fills without needing to click the extension.
 * 
 * Optimized for Sophos/Cyberoam portals at 192.168.x.x / 172.x.x.x
 */

(function () {
    // Don't run on extension pages or browser internal pages
    if (window.location.protocol === 'chrome-extension:') return;
    if (window.location.protocol === 'chrome:') return;
    if (window.location.protocol === 'about:') return;

    chrome.storage.local.get(
        ['username', 'password', 'loginUrl', 'userSelector', 'passSelector', 'submitSelector'],
        (config) => {
            if (!config.username || !config.password || !config.loginUrl) return;

            // Normalize URLs for comparison
            const currentUrl = window.location.href.toLowerCase().replace('https://', 'http://');
            const loginUrl = config.loginUrl.toLowerCase().replace('https://', 'http://');

            // Check if current page matches the saved login URL
            let isLoginPage = false;
            try {
                const current = new URL(currentUrl);
                const saved = new URL(loginUrl);
                // Match on hostname + port (path may differ due to redirects)
                isLoginPage = current.hostname === saved.hostname && current.port === saved.port;
            } catch (e) {
                // Fallback to simple string matching
                isLoginPage = currentUrl.includes(loginUrl) || loginUrl.includes(currentUrl.split('?')[0]);
            }

            if (!isLoginPage) return;

            console.log('UniConnect: Captive portal detected! Auto-filling...');

            // ── Sophos/Cyberoam specific selectors ──
            const SOPHOS_USER = ['input[name="username"]', 'input#username', '#LoginUserPassword_auth_username'];
            const SOPHOS_PASS = ['input[name="password"]', 'input#password', '#LoginUserPassword_auth_password'];
            const SOPHOS_SUBMIT = ['input[id="loginbtn"]', '#loginbtn', 'input[value="Login"]', 'input[value="Sign In"]'];

            const GENERIC_USER = [
                'input[name*="user" i]', 'input[id*="user" i]',
                'input[name*="login" i]', 'input[type="text"]'
            ];
            const GENERIC_PASS = ['input[type="password"]', 'input[name*="pass" i]', 'input[id*="pass" i]'];
            const GENERIC_SUBMIT = [
                'button[type="submit"]', 'input[type="submit"]',
                'button[id*="login" i]', 'button', 'input[type="button"]'
            ];

            const userSelectors = config.userSelector
                ? [config.userSelector, ...SOPHOS_USER, ...GENERIC_USER]
                : [...SOPHOS_USER, ...GENERIC_USER];
            const passSelectors = config.passSelector
                ? [config.passSelector, ...SOPHOS_PASS, ...GENERIC_PASS]
                : [...SOPHOS_PASS, ...GENERIC_PASS];
            const submitSelectors = config.submitSelector
                ? [config.submitSelector, ...SOPHOS_SUBMIT, ...GENERIC_SUBMIT]
                : [...SOPHOS_SUBMIT, ...GENERIC_SUBMIT];

            function findElement(selectors) {
                for (const sel of selectors) {
                    try {
                        const el = document.querySelector(sel);
                        if (el) return el;
                    } catch (e) { /* skip */ }
                }
                return null;
            }

            function setNativeValue(el, value) {
                el.value = '';
                const setter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 'value'
                )?.set;
                if (setter) setter.call(el, value);
                else el.value = value;

                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
            }

            let attempts = 0;
            const maxAttempts = 30;
            const interval = setInterval(() => {
                attempts++;
                const userInput = findElement(userSelectors);
                const passInput = findElement(passSelectors);

                if (userInput && passInput) {
                    clearInterval(interval);

                    userInput.focus();
                    userInput.click();
                    setNativeValue(userInput, config.username);

                    setTimeout(() => {
                        passInput.focus();
                        passInput.click();
                        setNativeValue(passInput, config.password);

                        setTimeout(() => {
                            const submitBtn = findElement(submitSelectors);
                            if (submitBtn) {
                                submitBtn.click();
                                console.log('UniConnect: Auto-login submitted!');
                            } else {
                                const form = userInput.closest('form') || passInput.closest('form');
                                if (form) form.submit();
                            }
                        }, 60);
                    }, 30);
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    console.log('UniConnect: Login fields not found after retries.');
                }
            }, 250);
        }
    );
})();
