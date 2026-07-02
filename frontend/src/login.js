import './style.css'

// --- State ---
const API_BASE = '/api';
let isOtpStep = false;
let pendingEmail = '';

// --- DOM Elements ---
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const otpInput = document.getElementById('otp-input');
const passwordGroup = document.getElementById('password-group');
const otpGroup = document.getElementById('otp-group');
const otpHelp = document.getElementById('otp-help');
const otpFooter = document.getElementById('otp-footer');
const resendButton = document.getElementById('resend-otp-btn');
const otpTimer = document.getElementById('otp-timer');
const loginButton = loginForm?.querySelector('button[type="submit"]');
const togglePassword = document.querySelector('.toggle-password');

let otpCountdown = null;
let otpSecondsLeft = 45;

const enableResend = () => {
    if (resendButton) {
        resendButton.disabled = false;
        resendButton.textContent = 'Resend OTP';
    }
};

const disableResend = () => {
    if (resendButton) {
        resendButton.disabled = true;
    }
};

const updateTimerText = () => {
    if (otpTimer) {
        otpTimer.textContent = otpSecondsLeft > 0 ? `${otpSecondsLeft}s remaining` : 'OTP expired. Resend to get a new code.';
    }
};

const startOtpTimer = () => {
    otpSecondsLeft = 45;
    disableResend();
    updateTimerText();
    if (otpFooter) otpFooter.classList.remove('hidden');

    if (otpCountdown) clearInterval(otpCountdown);
    otpCountdown = setInterval(() => {
        otpSecondsLeft -= 1;
        updateTimerText();
        if (otpSecondsLeft <= 0) {
            clearInterval(otpCountdown);
            enableResend();
        }
    }, 1000);
};

const showOtpStep = () => {
    isOtpStep = true;
    pendingEmail = emailInput.value.trim();
    if (passwordGroup) passwordGroup.classList.add('hidden');
    if (otpGroup) otpGroup.classList.remove('hidden');
    if (otpHelp) otpHelp.classList.remove('hidden');
    if (loginButton) loginButton.textContent = 'Verify OTP';
    if (otpFooter) otpFooter.classList.remove('hidden');
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.required = false;
    }
    if (otpInput) {
        otpInput.value = '';
        otpInput.required = true;
    }
    startOtpTimer();
};

const resetLoginStep = () => {
    isOtpStep = false;
    pendingEmail = '';
    if (passwordGroup) passwordGroup.classList.remove('hidden');
    if (otpGroup) otpGroup.classList.add('hidden');
    if (otpHelp) otpHelp.classList.add('hidden');
    if (otpFooter) otpFooter.classList.add('hidden');
    if (loginButton) loginButton.textContent = 'Login';
    if (otpInput) {
        otpInput.value = '';
        otpInput.required = false;
    }
    if (passwordInput) passwordInput.required = true;
    if (otpCountdown) clearInterval(otpCountdown);
    otpSecondsLeft = 45;
};

// --- Password Toggle ---
if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.setAttribute('data-lucide', type === 'password' ? 'eye' : 'eye-off');
        lucide.createIcons();
    });
}

// --- Auth Logic ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!emailInput.value.trim()) {
            alert('Please enter your email.');
            return;
        }

        if (!isOtpStep) {
            if (!passwordInput.value.trim()) {
                alert('Please enter your password.');
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: emailInput.value.trim(),
                        password: passwordInput.value
                    })
                });
                const data = await res.json();

                if (res.ok) {
                    showOtpStep();
                    alert(data.message || 'OTP sent. Check your email.');
                } else {
                    alert(data.message || 'Login failed');
                }
            } catch (err) {
                console.error('Auth error:', err);
                alert('Could not connect to server. Ensure backend is running.');
            }
        } else {
            if (!otpInput.value.trim()) {
                alert('Please enter the OTP sent to your email.');
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/auth/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: pendingEmail,
                        otp: otpInput.value.trim()
                    })
                });
                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '/';
                } else {
                    alert(data.message || 'OTP verification failed');
                }
            } catch (err) {
                console.error('OTP verify error:', err);
                alert('Could not connect to server. Ensure backend is running.');
            }
        }
    });
}

if (resendButton) {
    resendButton.addEventListener('click', async () => {
        if (!pendingEmail) {
            alert('Unable to resend OTP: no email found. Please restart login flow.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingEmail })
            });
            const data = await res.json();

            if (res.ok) {
                startOtpTimer();
                alert(data.message || 'New OTP sent to your email.');
            } else {
                alert(data.message || 'Could not resend OTP.');
            }
        } catch (err) {
            console.error('Resend OTP error:', err);
            alert('Could not connect to server. Ensure backend is running.');
        }
    });
}
