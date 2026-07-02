import './style.css'

// --- State ---
const API_BASE = '/api';

// --- DOM Elements ---
const signupForm = document.getElementById('signup-form');
const nameInput = document.getElementById('name-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const togglePassword = document.querySelector('.toggle-password');

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
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = nameInput.value.trim();
        if (!name) {
            alert('Please enter your full name to personalize your experience.');
            return;
        }

        const payload = {
            name: name,
            email: emailInput.value,
            password: passwordInput.value
        };

        try {
            const res = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = '/'; 
            } else {
                alert(data.message || 'Signup failed');
            }
        } catch (err) {
            console.error('Signup error:', err);
            alert('Could not connect to server. Ensure backend is running.');
        }
    });
}
