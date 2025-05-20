document.addEventListener('DOMContentLoaded', async () => {
    // Ensure DB is open before attaching event listeners
    try {
        await openDB(); 
    } catch (error) {
        console.error("Failed to open DB on auth page:", error);
        const authMessage = document.getElementById('auth-message');
        if(authMessage) {
            authMessage.textContent = 'Database initialization failed. Please refresh or try another browser.';
            authMessage.style.color = 'red';
        }
        return; // Stop further execution if DB fails
    }

    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');

    const registerUsernameInput = document.getElementById('register-username');
    const registerPasswordInput = document.getElementById('register-password');
    const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
    const registerBtn = document.getElementById('register-btn');

    const authMessage = document.getElementById('auth-message');

    // Redirect if already logged in (localStorage still tracks loggedInUser for simplicity)
    if (localStorage.getItem('loggedInUser')) {
        window.location.href = 'game.html';
        return; // Added return to prevent further script execution
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const username = registerUsernameInput.value.trim();
            const password = registerPasswordInput.value;
            const confirmPassword = registerConfirmPasswordInput.value;
            authMessage.textContent = '';

            if (!username || !password || !confirmPassword) {
                authMessage.textContent = 'All registration fields are required.';
                authMessage.style.color = 'red';
                return;
            }
            if (username.length < 3) { // Basic validation
                authMessage.textContent = 'Username must be at least 3 characters.';
                authMessage.style.color = 'red';
                return;
            }
            if (password.length < 6) { // Basic validation
                authMessage.textContent = 'Password must be at least 6 characters.';
                authMessage.style.color = 'red';
                return;
            }
            if (password !== confirmPassword) {
                authMessage.textContent = 'Passwords do not match.';
                authMessage.style.color = 'red';
                return;
            }
            
            let userRole = 'player';
            if (username.toLowerCase() === 'zithro') { // Ensure case-insensitivity for admin username if desired, or keep as is
                userRole = 'admin';
            }

            const userData = {
                username: username,
                password: password, 
                role: userRole, // Added role
                avatarUrl: 'https://via.placeholder.com/150/1a1a1a/d4ac6e?text=Avatar', // Default avatar
                level: 1,
                money: (userRole === 'admin') ? 100000 : 100, // Admin gets more money
                energy: (userRole === 'admin') ? 1000 : 100,
                maxEnergy: (userRole === 'admin') ? 1000 : 100,
                nerve: (userRole === 'admin') ? 100 : 10,
                maxNerve: (userRole === 'admin') ? 100 : 10,
                strength: (userRole === 'admin') ? 50 : 1,
                agility: (userRole === 'admin') ? 50 : 1,
                inventory: [],
                rank: 'Neophyte' // Initial rank
            };

            try {
                await addUser(userData);
                authMessage.textContent = `Registration successful! Role: ${userRole}. Please login.`;
                authMessage.style.color = 'green';
                registerUsernameInput.value = '';
                registerPasswordInput.value = '';
                registerConfirmPasswordInput.value = '';
            } catch (error) {
                authMessage.textContent = String(error); 
                authMessage.style.color = 'red';
            }
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const username = loginUsernameInput.value.trim();
            const password = loginPasswordInput.value;
            authMessage.textContent = '';

            if (!username || !password) {
                authMessage.textContent = 'Username and password are required.';
                authMessage.style.color = 'red';
                return;
            }

            try {
                const userData = await getUser(username);
                if (userData.password === password) {
                    localStorage.setItem('loggedInUser', username); 
                    authMessage.textContent = 'Login successful! Redirecting...';
                    authMessage.style.color = 'green';
                    window.location.href = 'game.html';
                } else {
                    authMessage.textContent = 'Invalid credentials.'; // More generic message
                    authMessage.style.color = 'red';
                }
            } catch (error) {
                authMessage.textContent = String(error); 
                authMessage.style.color = 'red';
            }
        });
    }
}); 
