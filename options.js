// Initialize UI elements
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginUrlInput = document.getElementById('loginUrl');
const userSelectorInput = document.getElementById('userSelector');
const passSelectorInput = document.getElementById('passSelector');
const submitSelectorInput = document.getElementById('submitSelector');
const saveBtn = document.getElementById('save');
const statusMsg = document.getElementById('status');
const advancedToggle = document.getElementById('toggleAdvanced');
const advancedSection = document.getElementById('advanced');

// Toggle advanced settings
advancedToggle.addEventListener('click', () => {
    advancedSection.classList.toggle('hidden');
    advancedToggle.textContent = advancedSection.classList.contains('hidden') 
        ? 'Advanced Selectors (Optional) ▾' 
        : 'Hide Advanced Selectors ▴';
});

// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get([
        'username', 
        'password', 
        'loginUrl', 
        'userSelector', 
        'passSelector', 
        'submitSelector'
    ], (result) => {
        if (result.username) usernameInput.value = result.username;
        if (result.password) passwordInput.value = result.password;
        if (result.loginUrl) loginUrlInput.value = result.loginUrl;
        if (result.userSelector) userSelectorInput.value = result.userSelector;
        if (result.passSelector) passSelectorInput.value = result.passSelector;
        if (result.submitSelector) submitSelectorInput.value = result.submitSelector;
    });
});

// Save settings with feedback animation
saveBtn.addEventListener('click', () => {
    const settings = {
        username: usernameInput.value.trim(),
        password: passwordInput.value,
        loginUrl: loginUrlInput.value.trim(),
        userSelector: userSelectorInput.value.trim(),
        passSelector: passSelectorInput.value.trim(),
        submitSelector: submitSelectorInput.value.trim()
    };

    if (!settings.username || !settings.password || !settings.loginUrl) {
        showStatus('Please fill in all basic fields', false);
        return;
    }

    chrome.storage.local.set(settings, () => {
        showStatus('✓ Configuration saved successfully', true);
    });
});

function showStatus(msg, isSuccess) {
    statusMsg.textContent = msg;
    statusMsg.style.color = isSuccess ? '#22c55e' : '#ef4444';
    statusMsg.classList.add('show');
    
    setTimeout(() => {
        statusMsg.classList.remove('show');
        setTimeout(() => { statusMsg.textContent = ''; }, 300);
    }, 3000);
}
