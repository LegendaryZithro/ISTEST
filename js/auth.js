document.addEventListener('DOMContentLoaded', () => {
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');

    const registerUsernameInput = document.getElementById('register-username');
    const registerPasswordInput = document.getElementById('register-password');
    const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
    const registerBtn = document.getElementById('register-btn');

    const authMessage = document.getElementById('auth-message');

    if (localStorage.getItem('sessionToken') && localStorage.getItem('loggedInUser')) {
        // A token exists, ideally we might verify it with a quick server call
        // For now, assume if token exists, user is logged in.
        window.location.href = 'game.html';
        return;
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const username = registerUsernameInput.value.trim();
            const password = registerPasswordInput.value;
            const confirmPassword = registerConfirmPasswordInput.value;
            authMessage.textContent = '';
            authMessage.className = 'message';

            if (!username || !password || !confirmPassword) {
                authMessage.textContent = 'All registration fields are required.';
                authMessage.classList.add('error');
                return;
            }
            if (username.length < 3) {
                authMessage.textContent = 'Username must be at least 3 characters.';
                authMessage.classList.add('error');
                return;
            }
            if (password.length < 6) {
                authMessage.textContent = 'Password must be at least 6 characters.';
                authMessage.classList.add('error');
                return;
            }
            if (password !== confirmPassword) {
                authMessage.textContent = 'Passwords do not match.';
                authMessage.classList.add('error');
                return;
            }

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) { // Status 200-299
                    authMessage.textContent = data.message + (data.role === 'admin' ? ' Welcome, Overlord Zithro!' : '');
                    authMessage.classList.add('success');
                    registerUsernameInput.value = '';
                    registerPasswordInput.value = '';
                    registerConfirmPasswordInput.value = '';
                } else {
                    authMessage.textContent = data.message || 'Registration failed. Please try again.';
                    authMessage.classList.add('error');
                }
            } catch (error) {
                console.error('Registration error:', error);
                authMessage.textContent = 'An error occurred during registration. Please try again.';
                authMessage.classList.add('error');
            }
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const username = loginUsernameInput.value.trim();
            const password = loginPasswordInput.value;
            authMessage.textContent = '';
            authMessage.className = 'message';

            if (!username || !password) {
                authMessage.textContent = 'Username and password are required.';
                authMessage.classList.add('error');
                return;
            }

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok && data.token) {
                    authMessage.textContent = data.message + ' Redirecting...';
                    authMessage.classList.add('success');
                    
                    // Store essential user info for other client-side parts
                    // In a more complex app, you'd get a session token here.
                    localStorage.setItem('sessionToken', data.token);
                    localStorage.setItem('loggedInUser', data.user.username);
                    localStorage.setItem('userRole', data.user.role); // Store role for client-side checks
                    // Potentially store all non-sensitive user data returned from login
                    // to avoid immediate re-fetch on game.html, or game.js can fetch it.
                    localStorage.setItem('playerData', JSON.stringify(data.user)); 

                    window.location.href = 'game.html';
                } else {
                    authMessage.textContent = data.message || 'Login failed. Please check your credentials.';
                    authMessage.classList.add('error');
                    localStorage.clear(); // Clear any stale tokens/data if login fails
                }
            } catch (error) {
                console.error('Login error:', error);
                authMessage.textContent = 'An error occurred during login. Please try again.';
                authMessage.classList.add('error');
                localStorage.clear();
            }
        });
    }
}); 