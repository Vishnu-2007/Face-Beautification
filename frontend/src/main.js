import './style.css'

// --- State Management ---
let currentState = {
    isLoggedIn: !!localStorage.getItem('user'),
    theme: 'light',
    files: { image: null, reference: null }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initAnimations();
    initNeuralNetwork();
    checkAuthStatus();
    initStudioLogic(); 
    initDashboardLogic(); // Added Dashboard logic
    if (currentState.isLoggedIn) {
        fetchUserHistory();
        showUserUI();
    }
});

function checkAuthStatus() {
    const authBtn = document.getElementById('auth-btn');
    const profileTrigger = document.getElementById('user-profile-trigger');
    
    if (currentState.isLoggedIn) {
        if (authBtn) authBtn.classList.add('hidden');
        if (profileTrigger) profileTrigger.classList.remove('hidden');
    } else {
        if (authBtn) {
            authBtn.classList.remove('hidden');
            authBtn.onclick = () => window.location.href = '/login.html';
        }
        if (profileTrigger) profileTrigger.classList.add('hidden');
    }
}

function showUserUI() {
    const userData = localStorage.getItem('user');
    if (!userData) return;
    
    const user = JSON.parse(userData);
    // Be more explicit: if name exists and isn't just whitespace, use it. 
    // Otherwise check for 'User' as a generic name from the DB.
    const displayName = (user.name && user.name !== "User") ? user.name : (user.name || "AI Beauty");
    
    const nameEl = document.getElementById('user-display-name');
    const emailEl = document.getElementById('user-display-email');
    
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = user.email;
    
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle && displayName !== "AI Beauty") {
        const firstName = displayName.split(' ')[0];
        heroTitle.innerHTML = `Welcome Back, <span class="glow-text">${firstName}</span>`;
    }
}

// --- Dashboard Logic ---
function initDashboardLogic() {
    const trigger = document.getElementById('user-profile-trigger');
    const overlay = document.getElementById('dashboard-overlay');
    const closeBtn = document.querySelector('.close-dashboard');
    const tabs = document.querySelectorAll('.dash-tab');
    const logoutTab = document.querySelector('.logout-tab');

    // Password Update Elements
    const showPassUpdateBtn = document.getElementById('show-pass-update');
    const passUpdateBox = document.getElementById('password-update-box');
    const confirmPassUpdateBtn = document.getElementById('confirm-pass-update');

    if (trigger) trigger.onclick = () => overlay.classList.remove('hidden');
    if (closeBtn) closeBtn.onclick = () => overlay.classList.add('hidden');
    
    if (logoutTab) logoutTab.onclick = logout;

    if (showPassUpdateBtn) {
        showPassUpdateBtn.onclick = () => {
            passUpdateBox.classList.toggle('hidden');
            showPassUpdateBtn.textContent = passUpdateBox.classList.contains('hidden') ? 'Update Password' : 'Cancel';
        };
    }

    if (confirmPassUpdateBtn) {
        confirmPassUpdateBtn.onclick = async () => {
            const oldPassword = document.getElementById('old-pass').value;
            const newPassword = document.getElementById('new-pass').value;
            const token = localStorage.getItem('token');

            if (!oldPassword || !newPassword) {
                alert('Please fill in both password fields.');
                return;
            }

            try {
                const res = await fetch('/api/auth/update-password', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ oldPassword, newPassword })
                });

                const data = await res.json();
                if (res.ok) {
                    alert('Password updated successfully!');
                    passUpdateBox.classList.add('hidden');
                    showPassUpdateBtn.textContent = 'Update Password';
                    document.getElementById('old-pass').value = '';
                    document.getElementById('new-pass').value = '';
                } else {
                    alert(data.message || 'Update failed');
                }
            } catch (err) {
                console.error('Password update error:', err);
                alert('Could not connect to server.');
            }
        };
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('logout-tab')) return;
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const target = tab.dataset.tab;
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            const targetPane = document.getElementById(`tab-${target}`);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // Close on background click
    if (overlay) {
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.classList.add('hidden');
        };
    }
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
}

// --- Scroll Reveal Animations ---
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-up-active');
            }
        });
    }, observerOptions);

    document.querySelectorAll('section, .feature-card, .price-card, .analysis-card').forEach(el => {
        el.classList.add('fade-up');
        observer.observe(el);
    });

    // Sticky Nav Blur Effect
    const nav = document.querySelector('.glass-nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                nav.style.padding = '8px 24px';
                nav.style.background = 'rgba(255, 255, 255, 0.9)';
            } else {
                nav.style.padding = '12px 32px';
                nav.style.background = 'var(--glass-bg)';
            }
        });
    }
}

// --- Background Neural Network Particles ---
function initNeuralNetwork() {
    const canvas = document.getElementById('neural-canvas');
    if (!canvas) return;

    for (let i = 0; i < 20; i++) {
        const dot = document.createElement('div');
        dot.className = 'neural-dot';
        dot.style.left = `${Math.random() * 100}%`;
        dot.style.top = `${Math.random() * 100}%`;
        dot.style.animationDelay = `${Math.random() * 5}s`;
        canvas.appendChild(dot);
    }
}

// --- Studio / Analysis Logic ---
function initStudioLogic() {
    const getStarted = document.getElementById('get-started');
    if (getStarted) {
        getStarted.addEventListener('click', () => {
            if (!currentState.isLoggedIn) {
                window.location.href = '/login.html';
            } else {
                window.location.href = '/studio.html'; // Navigate to dedicated studio
            }
        });
    }
}

// CSS for the dots and animations
const style = document.createElement('style');
style.textContent = `
    .fade-up {
        opacity: 0;
        transform: translateY(40px);
        transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .fade-up-active {
        opacity: 1;
        transform: translateY(0);
    }
    .neural-dot {
        position: absolute;
        width: 4px;
        height: 4px;
        background: var(--primary);
        border-radius: 50%;
        opacity: 0.1;
        animation: float-neural 10s infinite alternate ease-in-out;
    }
    @keyframes float-neural {
        from { transform: translate(0, 0); }
        to { transform: translate(100px, 100px); }
    }
`;
document.head.appendChild(style);
async function fetchUserHistory() {
    const token = localStorage.getItem('token');
    const historyList = document.getElementById('history-list');
    if (!token || !historyList) return;

    try {
        const res = await fetch('/api/user/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const history = await res.json();
        
        if (history.length > 0) {
            historyList.innerHTML = history.map(item => `
                <div class="history-item tilt-3d">
                    <img src="/uploads/${item.beautified_image}" alt="Beautified">
                    <div class="history-info">
                        <span>${new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('');
            
            const badge = document.querySelector('.badge');
            if (badge) badge.textContent = `${history.length} Transformations Saved`;
        }
    } catch (err) {
        console.error('Failed to fetch history', err);
    }
}
