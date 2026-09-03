/**
 * UniConnect Popup Script
 * Handles credential management and triggers auto-login via the background service worker.
 */

const DEFAULT_PORTAL_URL = 'http://192.168.1.254:8090/httpclient.html';

const loginIdInput = document.getElementById('loginId');
const loginPassInput = document.getElementById('loginPass');
const portalUrlInput = document.getElementById('portalUrl');
const loginBtn = document.getElementById('loginBtn');
const saveBtn = document.getElementById('saveCredentials');
const settingsBtn = document.getElementById('openSettings');
const togglePassBtn = document.getElementById('togglePass');
const feedbackEl = document.getElementById('feedback');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// ── Load saved credentials on popup open ──
chrome.storage.local.get(['username', 'password', 'loginUrl', 'userSelector', 'passSelector', 'submitSelector'], (data) => {
    if (data.username) loginIdInput.value = data.username;
    if (data.password) loginPassInput.value = data.password;
    portalUrlInput.value = data.loginUrl || DEFAULT_PORTAL_URL;

    // Update status indicator
    if (data.username && data.password && data.loginUrl) {
        statusDot.classList.remove('inactive');
        statusText.textContent = 'Credentials saved — Ready';
        statusText.classList.add('active');
    } else {
        statusDot.classList.add('inactive');
        statusText.textContent = 'Enter credentials to start';
        statusText.classList.remove('active');
    }
});

// ── Toggle password visibility ──
togglePassBtn.addEventListener('click', () => {
    const isPassword = loginPassInput.type === 'password';
    loginPassInput.type = isPassword ? 'text' : 'password';
    togglePassBtn.textContent = isPassword ? '🔒' : '👁';
});

// ── Auto-fix HTTPS → HTTP for captive portals ──
function sanitizePortalUrl(url) {
    url = url.trim();
    if (!url) return url;

    // Force HTTP for private/local IPs — HTTPS will cause SSL warnings
    // that the extension CANNOT bypass
    if (url.startsWith('https://')) {
        try {
            const parsed = new URL(url);
            const host = parsed.hostname;
            // Detect private IPs: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, or any IP (not a domain)
            const isPrivateIP = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.)/.test(host)
                || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
            if (isPrivateIP) {
                const httpUrl = url.replace(/^https:\/\//, 'http://');
                console.log('UniConnect: Converted HTTPS to HTTP for local IP to avoid SSL warning');
                return httpUrl;
            }
        } catch (e) { /* not a valid URL, return as-is */ }
    }

    // Add http:// if no protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
    }

    return url;
}



// ── Save credentials ──
saveBtn.addEventListener('click', () => {
    const creds = {
        username: loginIdInput.value.trim(),
        password: loginPassInput.value,
        loginUrl: sanitizePortalUrl(portalUrlInput.value)
    };

    if (!creds.username || !creds.password || !creds.loginUrl) {
        showFeedback('Fill in all fields first', 'error');
        return;
    }

    // Update the URL field to show the sanitized version
    portalUrlInput.value = creds.loginUrl;

    chrome.storage.local.set(creds, () => {
        showFeedback('✓ Credentials saved!', 'success');
        statusDot.classList.remove('inactive');
        statusText.textContent = 'Credentials saved — Ready';
        statusText.classList.add('active');
    });
});

// ── LOGIN NOW — main action ──
loginBtn.addEventListener('click', () => {
    const username = loginIdInput.value.trim();
    const password = loginPassInput.value;
    let loginUrl = sanitizePortalUrl(portalUrlInput.value);

    if (!username || !password || !loginUrl) {
        showFeedback('Please fill all fields', 'error');
        return;
    }

    // Update URL field with sanitized version
    portalUrlInput.value = loginUrl;

    // Save credentials before login
    chrome.storage.local.set({ username, password, loginUrl });

    // Show loading state
    loginBtn.classList.add('loading');
    showFeedback('Opening login page...', 'success');

    // Send message to background script to open the page and inject
    chrome.runtime.sendMessage(
        { action: 'triggerLogin', url: loginUrl, username, password },
        (response) => {
            setTimeout(() => {
                loginBtn.classList.remove('loading');
                if (response && response.success) {
                    showFeedback('✓ Login triggered!', 'success');
                } else {
                    showFeedback('Tab opened — auto-fill will run', 'success');
                }
            }, 800);
        }
    );
});

// ── Open advanced options ──
settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

// ── Feedback helper ──
function showFeedback(msg, type) {
    feedbackEl.textContent = msg;
    feedbackEl.className = 'feedback show ' + type;
    clearTimeout(feedbackEl._timer);
    feedbackEl._timer = setTimeout(() => {
        feedbackEl.classList.remove('show');
    }, 3500);
}
