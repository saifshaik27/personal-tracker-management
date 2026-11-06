/**
 * Saif's Personal Expense Tracker Management System
 * Authentication & Session Management Module
 */

const AUTH_TOKEN_KEY = 'saif_expense_tracker_token';
const AUTH_USER_KEY = 'saif_expense_tracker_user';

function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getUser() {
    try {
        const userStr = localStorage.getItem(AUTH_USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
}

function setSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

function isAuthenticated() {
    return !!getToken();
}

// Redirect logic based on page
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('login.html') || path.endsWith('/login');

    if (!isAuthenticated() && !isLoginPage) {
        window.location.href = 'login.html';
    } else if (isAuthenticated() && isLoginPage) {
        window.location.href = 'index.html';
    }
});

// Switch between Login and Register tabs on login.html
function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const alertBox = document.getElementById('auth-alert');

    if (alertBox) {
        alertBox.className = 'alert d-none';
        alertBox.innerText = '';
    }

    if (tab === 'login') {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.classList.remove('d-none');
        registerForm.classList.add('d-none');
    } else {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerForm.classList.remove('d-none');
        loginForm.classList.add('d-none');
    }
}

// Toggle password text visibility
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Show alert message on auth page
function showAuthAlert(message, type = 'danger') {
    const alertBox = document.getElementById('auth-alert');
    if (!alertBox) return;
    alertBox.className = `alert alert-${type}`;
    alertBox.innerText = message;
    alertBox.classList.remove('d-none');
}

// Demo Credentials Auto-Fill
function fillDemoCredentials() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    if (emailInput && passwordInput) {
        emailInput.value = 'saif@example.com';
        passwordInput.value = 'password123';
        showAuthAlert('Demo credentials filled! Click "Sign In" to proceed.', 'success');
    }
}

// Handle Login Form Submission
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('btn-login-submit');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            setSession(data.token, data.user);
            showAuthAlert('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 600);
        } else {
            showAuthAlert(data.message || 'Login failed. Please check your credentials.', 'danger');
        }
    } catch (err) {
        console.error('Login error:', err);
        showAuthAlert('Unable to connect to the server. Please verify MySQL and Express are running.', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to Dashboard';
    }
}

// Handle Registration Form Submission
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const submitBtn = document.getElementById('btn-reg-submit');

    if (password.length < 6) {
        showAuthAlert('Password must be at least 6 characters long.', 'danger');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            setSession(data.token, data.user);
            showAuthAlert('Account created successfully! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 600);
        } else {
            showAuthAlert(data.message || 'Registration failed.', 'danger');
        }
    } catch (err) {
        console.error('Registration error:', err);
        showAuthAlert('Unable to connect to server. Please try again.', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Create Account';
    }
}

// Global Logout Handler
function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        clearSession();
        window.location.href = 'login.html';
    }
}
