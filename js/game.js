document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUser = localStorage.getItem('loggedInUser');
    const sessionToken = localStorage.getItem('sessionToken');

    if (!loggedInUser || !sessionToken) { // Check for token too
        localStorage.clear(); // Ensure no partial login state
        window.location.href = 'index.html';
        return;
    }
    // const userRole = localStorage.getItem('userRole'); // Also available if needed directly

    // --- Game Configuration Variables (will be populated from server) ---
    let GAME_CONFIG = {
        ENERGY_REGEN_RATE: 1, // Default fallback
        NERVE_REGEN_RATE: 1,  // Default fallback
        TICK_INTERVAL: 1000,  // Default fallback
        RANDOM_EVENT_CHANCE: 0.01, // Default fallback
        CRIME_SHOPLIFT_SUCCESS: 0.90,
        CRIME_SHOPLIFT_MIN_REWARD: 5,
        CRIME_SHOPLIFT_MAX_REWARD: 20,
        // Add other crime defaults if needed
    };
    // -------------------------------------------------------------------

    // --- DOM Elements ---
    // Top Bar
    const playerUsernameDisplayTop = document.getElementById('player-username-top');
    const playerUsernameClickableArea = document.getElementById('player-username-clickable-area');
    const logoutBtnTop = document.getElementById('logout-btn-top');
    const playerAvatarLeftNav = document.getElementById('player-avatar-leftnav');

    // Left Nav Stats
    const playerLevelDisplay = document.getElementById('player-level');
    const playerMoneyDisplay = document.getElementById('player-money');
    const playerEnergyDisplay = document.getElementById('player-energy');
    const playerMaxEnergyDisplay = document.getElementById('player-max-energy');
    const playerNerveDisplay = document.getElementById('player-nerve');
    const playerMaxNerveDisplay = document.getElementById('player-max-nerve');
    const playerStrengthDisplay = document.getElementById('player-strength');
    const playerAgilityDisplay = document.getElementById('player-agility');

    // Main Content Area & Dynamic Content Sections
    const gameplayContentArea = document.getElementById('gameplay-content-area');
    const pageContents = document.querySelectorAll('.page-content');
    const navButtons = document.querySelectorAll('#page-navigation .nav-button');
    
    // Shared message elements (now in the "home"/"dashboard" page, or could be moved outside if truly global)
    const actionMessageDisplay = document.getElementById('action-message-placeholder'); 
    const cooldownMessageDisplay = document.getElementById('cooldown-message-placeholder');

    // Specific Content Elements (inventory list, log list are now specific to their content views)
    const inventoryListMain = document.getElementById('inventory-list-main');
    const logListMain = document.getElementById('log-list-main');

    // Profile Page Elements
    const profileUsernameDisplay = document.getElementById('profile-username');
    const profileAvatarMain = document.getElementById('profile-avatar-main');
    const profileRoleDisplay = document.getElementById('profile-role');
    const profileLevelDisplay = document.getElementById('profile-level'); // Note: ID conflict with leftnav, rename if issue
    const profileRankDisplay = document.getElementById('profile-rank');
    const profileMoneyDisplay = document.getElementById('profile-money'); // Conflict
    const profileStrengthDisplay = document.getElementById('profile-strength-stat');
    const profileAgilityDisplay = document.getElementById('profile-agility-stat');
    const goToSettingsBtn = document.getElementById('go-to-settings-btn');

    // Settings Page Elements
    const avatarUrlInput = document.getElementById('avatar-url-input');
    const saveAvatarBtn = document.getElementById('save-avatar-btn');
    const avatarSaveMessage = document.getElementById('avatar-save-message');

    // Crime & Training Buttons (now within their respective content divs)
    const crimeShopliftBtn = document.getElementById('action-crime-shoplift');
    const crimePickpocketBtn = document.getElementById('action-crime-pickpocket');
    const crimeRobberyBtn = document.getElementById('action-crime-robbery');
    const trainStrengthBtn = document.getElementById('action-train-strength');
    const trainAgilityBtn = document.getElementById('action-train-agility');

    // Chat Elements
    const chatFeed = document.getElementById('chat-feed');
    const chatMessageInput = document.getElementById('chat-message-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatTabBtns = document.querySelectorAll('.chat-tab-btn');

    const pageNavigation = document.getElementById('page-navigation'); // Get the container for nav buttons

    // --- Game State Variables ---
    let playerData = null;
    let isInJail = false;
    let jailTimer = 0;
    let currentChatChannel = 'global'; // For mock chat
    let chatPollingInterval;
    const CHAT_POLL_INTERVAL = 5000; // Poll every 5 seconds
    let lastMessageId = 0; // To fetch only new messages, more advanced

    const availableDungeonsList = document.getElementById('available-dungeons-list');
    let currentDungeonInstance = null; // To hold active dungeon data and progress

    // Dungeon Gameplay State Variables
    let currentDungeonRun = null; // Stores data for the active dungeon run { dungeonDetails, encounter_sequence, current_health, etc. }
    let currentEncounterIndex = 0;
    let currentEnemiesInView = []; // Array to hold state of enemies in the current encounter (e.g. their current health)

    // DOM Elements Cache (add new elements as needed)
    const contentSections = {};
    const statElements = {};
    const gameLogUl = document.getElementById('game-log-messages');
    const crimeButtons = {};
    // ... (keep existing element lookups)

    // Dungeon Run UI Elements
    const dungeonRunContentDiv = document.getElementById('content-dungeon-run');
    const dungeonRunNameEl = document.getElementById('dungeon-run-name');
    const dungeonRunEncounterStatusEl = document.getElementById('dungeon-run-encounter-status');
    const dungeonPlayerHealthEl = document.getElementById('dungeon-player-health');
    const dungeonPlayerMaxHealthEl = document.getElementById('dungeon-player-max-health');
    // const dungeonPlayerSkillEnergyEl = document.getElementById('dungeon-player-skill-energy'); // If using a separate skill energy
    // const dungeonPlayerMaxSkillEnergyEl = document.getElementById('dungeon-player-max-skill-energy');
    const dungeonEnemiesAreaEl = document.getElementById('dungeon-enemies-area');
    const dungeonCombatLogUl = document.getElementById('dungeon-log-messages');
    const exitDungeonEarlyBtn = document.getElementById('exit-dungeon-early-btn');

    // --- Initialization ---
    async function fetchGameConfig() {
        try {
            const response = await fetch('/api/game/config');
            if (response.ok) {
                const fetchedConfig = await response.json();
                GAME_CONFIG = { ...GAME_CONFIG, ...fetchedConfig }; // Merge, server overrides defaults
                console.log('Game configuration loaded:', GAME_CONFIG);
            } else {
                console.error('Failed to fetch game config, using defaults.', await response.text());
            }
        } catch (error) {
            console.error('Error fetching game config, using defaults:', error);
        }
    }

    function cacheDomElements() {
        // ... (existing cacheDomElements code from previous versions, ensure it covers all sections)
        contentSections.home = document.getElementById('content-home');
        contentSections.crimes = document.getElementById('content-crimes');
        contentSections.gym = document.getElementById('content-gym');
        contentSections.inventory = document.getElementById('content-inventory');
        contentSections.log = document.getElementById('content-log');
        contentSections.profile = document.getElementById('content-profile');
        contentSections.settings = document.getElementById('content-settings');
        contentSections.dungeons = document.getElementById('content-dungeons');
        contentSections.dungeonRun = document.getElementById('content-dungeon-run');
        // Add other dungeon specific elements if frequently accessed and not already cached
    }

    async function initializeGame() {
        await fetchGameConfig(); // Fetch config first
        await loadPlayerDataFromServer();
        cacheDomElements();
        setupEventListeners();
        navigateToPage('home'); // Default page
        if (gameLoopInterval) clearInterval(gameLoopInterval); // Clear existing if any
        gameLoopInterval = setInterval(gameLoop, GAME_CONFIG.TICK_INTERVAL || 1000);
        addLog('Game dashboard initialized.');
        if (playerData) addLog(`Welcome back, ${loggedInUser}! Role: ${playerData.role}.`);
        
        loadChatMessages(currentChatChannel, true); // Initial load of chat, true for full refresh
        if (chatPollingInterval) clearInterval(chatPollingInterval);
        chatPollingInterval = setInterval(() => fetchNewChatMessages(currentChatChannel), CHAT_POLL_INTERVAL);

        // Event listener for dungeon list clicks (delegated)
        const dungeonsContent = document.getElementById('content-dungeons');
        if (dungeonsContent) {
            dungeonsContent.addEventListener('click', async (event) => {
                if (event.target.classList.contains('enter-dungeon-btn')) {
                    const dungeonId = event.target.dataset.dungeonId;
                    if (dungeonId) {
                        await enterDungeon(dungeonId);
                    }
                }
                // Add loot preview listener if not already present
                if (event.target.classList.contains('preview-loot-btn')) {
                    const dungeonCard = event.target.closest('.dungeon-card');
                    const dungeonId = dungeonCard.dataset.dungeonId;
                    if (dungeonId) {
                        fetchAndDisplayLootPreview(dungeonId, dungeonCard.querySelector('.dungeon-loot-preview'));
                    }
                }
            });
        }

        if (dungeonEnemiesAreaEl) {
            dungeonEnemiesAreaEl.addEventListener('click', handleEnemyAttackClick);
        }
        if(exitDungeonEarlyBtn) exitDungeonEarlyBtn.addEventListener('click', () => handleDungeonFailure(true)); // true for flee

        loadPlayerDataFromServer();
        loadGameConfig();
        startEnergyAndNerveRegen();
        startChatPolling(); 
    }
    let gameLoopInterval;

    // --- Player Data Management (from db.js) ---
    async function loadPlayerDataFromServer() {
        const storedPlayerData = localStorage.getItem('playerData');
        const token = localStorage.getItem('sessionToken');
        
        if (storedPlayerData) {
            playerData = JSON.parse(storedPlayerData);
            console.log('Player data loaded from localStorage cache:', playerData);
        } else if (loggedInUser && token) {
            console.warn('Player data not in localStorage cache, fetching from server for:', loggedInUser);
            try {
                const response = await fetch(`/api/game/playerdata/${loggedInUser}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // Send token
                    }
                });
                if (response.ok) {
                    playerData = await response.json();
                    localStorage.setItem('playerData', JSON.stringify(playerData));
                } else {
                    if (response.status === 401 || response.status === 403) {
                        alert('Session expired or invalid. Please log in again.');
                        localStorage.clear(); window.location.href = 'index.html'; return;
                    }
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch player data');
                }
            } catch (fetchError) {
                console.error("Error fetching player data:", fetchError);
                alert('Failed to load game data. Please log in.');
                localStorage.clear(); window.location.href = 'index.html'; return;
            }
        } else {
             alert('No user session. Redirecting to login.');
             localStorage.clear(); window.location.href = 'index.html'; return;
        }
        if (!playerData) {
            alert('Critical error loading player data. Redirecting to login.');
            localStorage.clear();
            window.location.href = 'index.html';
            return;
        }
        playerData.inventory = typeof playerData.inventory === 'string' ? JSON.parse(playerData.inventory || '[]') : (playerData.inventory || []);
        playerData.avatarUrl = playerData.avatarUrl || 'https://via.placeholder.com/150/1a1a1a/d4ac6e?text=Avatar';
        playerData.rank = playerData.rank || calculateRank(playerData.level);
        playerData.role = playerData.role || 'player';

        updateDisplay();
    }

    async function savePlayerData() {
        if (!playerData) return;
        const token = localStorage.getItem('sessionToken');
        if (!token) { console.error("No session token found for save."); addSystemMessageToChat('Error: Not authenticated to save.'); return; }
        try {
            const dataToSend = { ...playerData, inventory: JSON.stringify(playerData.inventory || []) };
            const response = await fetch('/api/game/saveplayerdata', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dataToSend)
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Save Fail:', errorData.message);
                addSystemMessageToChat('Save Error!');
                if (response.status === 401 || response.status === 403) { localStorage.clear(); window.location.href = 'index.html'; }
            }
        } catch (error) { console.error("Save Network Error:", error); addSystemMessageToChat('Save Network Error!'); }
    }

    // --- UI Update Functions ---
    function updateAdminDashboardButton() {
        let adminButton = document.getElementById('admin-dashboard-nav-btn');
        if (playerData && playerData.role === 'admin') {
            if (!adminButton) {
                adminButton = document.createElement('button');
                adminButton.id = 'admin-dashboard-nav-btn';
                adminButton.classList.add('nav-button');
                adminButton.textContent = 'Admin Panel'; // Changed text slightly
                adminButton.addEventListener('click', () => { window.location.href = 'admin.html'; });
                if (pageNavigation) pageNavigation.appendChild(adminButton);
            }
            adminButton.style.display = 'block';
        } else {
            if (adminButton) adminButton.style.display = 'none';
        }
    }

    function updateDisplay() {
        if (!playerData) {
            if(playerUsernameDisplayTop) playerUsernameDisplayTop.textContent = 'Loading...';
            return;
        }
        // Update top bar user info
        if(playerUsernameDisplayTop) playerUsernameDisplayTop.textContent = loggedInUser;
        if(playerAvatarLeftNav) playerAvatarLeftNav.src = playerData.avatarUrl;

        // Update left nav stats
        if(playerLevelDisplay) playerLevelDisplay.textContent = playerData.level;
        if(playerMoneyDisplay) playerMoneyDisplay.textContent = playerData.money;
        if(playerEnergyDisplay) playerEnergyDisplay.textContent = playerData.energy;
        if(playerMaxEnergyDisplay) playerMaxEnergyDisplay.textContent = playerData.maxEnergy;
        if(playerNerveDisplay) playerNerveDisplay.textContent = playerData.nerve;
        if(playerMaxNerveDisplay) playerMaxNerveDisplay.textContent = playerData.maxNerve;
        if(playerStrengthDisplay) playerStrengthDisplay.textContent = playerData.strength;
        if(playerAgilityDisplay) playerAgilityDisplay.textContent = playerData.agility;
        
        updateAdminDashboardButton(); // Call to show/hide admin button
        
        // Update cooldown message (now using the placeholder)
        if(cooldownMessageDisplay) cooldownMessageDisplay.textContent = isInJail ? `Jailed for ${jailTimer}s.` : '';
        
        // Disable action buttons if in jail (buttons are now page-specific)
        document.querySelectorAll('#content-crimes button, #content-gym button').forEach(button => {
            button.disabled = isInJail;
        });

        // Update Inventory Display (in its own content section)
        if (inventoryListMain) {
            inventoryListMain.innerHTML = ''; 
            if (playerData.inventory.length === 0) {
                inventoryListMain.innerHTML = '<li>Your hoard is empty.</li>';
            } else {
                playerData.inventory.forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${item.name} (Qty: ${item.quantity})`;
                    inventoryListMain.appendChild(listItem);
                });
            }
        }
        // Note: Log display is handled by addLog directly for now.

        // If on profile page, refresh its specific elements too
        if (document.getElementById('content-profile').style.display === 'block') {
            displayUserProfile();
        }
    }

    function setActionMessage(message, type, displayElement = actionMessageDisplay) {
        if (!displayElement) return;
        displayElement.textContent = message;
        displayElement.className = 'message-area'; 
        if (type) {
            displayElement.classList.add(type);
        }
    }

    // --- Navigation --- 
    function navigateToPage(pageId) {
        pageContents.forEach(content => {
            content.style.display = content.id === `content-${pageId}` ? 'block' : 'none';
        });
        navButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.page === pageId);
        });
        addLog(`Navigated to ${pageId}.`);
        // Clear action messages when navigating to a new page if desired
        if(actionMessageDisplay) setActionMessage('', null, actionMessageDisplay); 

        if (pageId === 'profile') displayUserProfile();
        if (pageId === 'settings') displaySettingsPage();
        if (pageId === 'home') updateDisplay(); // Refresh stats etc. on home dashboard view if needed.
        if (pageId === 'dungeons') {
            loadAndDisplayAvailableDungeons();
            // If returning from a dungeon run, ensure the dungeon instance view is hidden
            const dungeonInstanceView = document.getElementById('content-dungeon-run');
            if (dungeonInstanceView) dungeonInstanceView.style.display = 'none';
            if (gameplayContentArea.querySelector('#content-dungeons')) gameplayContentArea.querySelector('#content-dungeons').style.display = 'block';
        }
    }

    // --- Logging ---
    function addLog(message) {
        if (!logListMain) return; // Ensure log list for the main page exists
        const listItem = document.createElement('li');
        listItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logListMain.insertBefore(listItem, logListMain.firstChild);
        if (logListMain.children.length > 50) { 
            logListMain.removeChild(logListMain.lastChild);
        }
    }

    // --- Chat Mock ---
    function addChatMessage(user, message, channel = 'global') {
        if (channel !== currentChatChannel) return; // Only display for current channel
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        const userSpan = document.createElement('span');
        userSpan.textContent = `${user}: `;
        messageElement.appendChild(userSpan);
        messageElement.append(document.createTextNode(message)); // Append text node for message content
        if(chatFeed) chatFeed.appendChild(messageElement);
        if(chatFeed) chatFeed.scrollTop = chatFeed.scrollHeight; // Scroll to bottom
    }
    function addSystemMessageToChat(message) {
        addChatMessage("System", message, currentChatChannel);
    }

    // --- Game Actions (Refactored for async and specific message display) ---
    async function addItemToInventory(itemName, quantity) {
        if (!playerData) return;
        const existingItem = playerData.inventory.find(item => item.name === itemName);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            playerData.inventory.push({ name: itemName, quantity: quantity });
        }
        addLog(`Acquired ${quantity}x ${itemName}!`);
        setActionMessage(`Acquired ${quantity}x ${itemName}!`, 'success', actionMessageDisplay);
        updateDisplay(); // Make sure inventory list updates
        await savePlayerData();
    }

    async function consumeItem(itemName) {
        if (!playerData) return false;
        const itemIndex = playerData.inventory.findIndex(item => item.name === itemName);
        if (itemIndex > -1) {
            playerData.inventory[itemIndex].quantity--;
            if (playerData.inventory[itemIndex].quantity <= 0) {
                playerData.inventory.splice(itemIndex, 1);
            }
            addLog(`Used 1x ${itemName}.`);
            setActionMessage(`Used 1x ${itemName}.`, 'event', actionMessageDisplay); // Or 'success' depending on context
            updateDisplay();
            await savePlayerData();
            return true;
        }
        return false;
    }

    function hasItem(itemName) {
        if (!playerData) return false;
        return playerData.inventory.some(item => item.name === itemName && item.quantity > 0);
    }

    async function handleCrime(crimeType, nerveCost, baseSuccessChanceKey, minRewardKey, maxRewardKey, baseJailDuration, itemFindDetails) {
        if (!playerData) return;
        setActionMessage('', null, actionMessageDisplay); 
        if (isInJail) {
            setActionMessage('Cannot act while imprisoned.', 'error', actionMessageDisplay);
            return;
        }
        if (playerData.nerve < nerveCost) {
            setActionMessage(`Not enough Nerve for ${crimeType}.`, 'error', actionMessageDisplay);
            addLog(`Failed ${crimeType}: Insufficient Nerve.`);
            return;
        }
        playerData.nerve -= nerveCost;
        let currentSuccessChance = GAME_CONFIG[baseSuccessChanceKey] !== undefined ? GAME_CONFIG[baseSuccessChanceKey] : 0.5; // Default if config missing
        let minReward = GAME_CONFIG[minRewardKey] !== undefined ? GAME_CONFIG[minRewardKey] : 1;
        let maxReward = GAME_CONFIG[maxRewardKey] !== undefined ? GAME_CONFIG[maxRewardKey] : 10;
        let currentJailDuration = baseJailDuration;
        if (crimeType === 'Pickpocketing' && hasItem('Lockpick')) {
            if (await consumeItem('Lockpick')) {
                currentSuccessChance += 0.15; // This could also be a config
                currentJailDuration = Math.max(0, baseJailDuration - 5); // This too
                addLog('A Lockpick aided your attempt.');
            }
        }
        const success = Math.random() < currentSuccessChance;
        if (success) {
            const moneyEarned = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
            playerData.money += moneyEarned;
            setActionMessage(`${crimeType} successful! Looted $${moneyEarned}.`, 'success', actionMessageDisplay);
            addLog(`${crimeType}: +$${moneyEarned}.`);
            if (itemFindDetails && Math.random() < (GAME_CONFIG[itemFindDetails.chanceKey] || itemFindDetails.defaultChance || 0.05)) { // Use config for item find chance
                await addItemToInventory(itemFindDetails.name, 1);
            }
        } else {
            setActionMessage(`${crimeType} failed! The price is paid.`, 'error', actionMessageDisplay);
            addLog(`${crimeType} failed.`);
            if (currentJailDuration > 0) {
                isInJail = true;
                jailTimer = currentJailDuration;
                addLog(`Imprisoned for ${currentJailDuration} turns.`);
            }
        }
        updateDisplay();
        await savePlayerData();
    }

    async function handleTraining(statName, energyCost, statKey) {
        if (!playerData) return;
        setActionMessage('', null, actionMessageDisplay);
        if (isInJail) {
            setActionMessage('Cannot train while shackled.', 'error', actionMessageDisplay);
            return;
        }
        if (playerData.energy < energyCost) {
            setActionMessage(`Not enough Energy to train ${statName}.`, 'error', actionMessageDisplay);
            addLog(`Failed training ${statName}: Insufficient Energy.`);
            return;
        }
        playerData.energy -= energyCost;
        playerData[statKey] = (playerData[statKey] || 0) + 1;
        const successMsg = `Trained ${statName}. ${statName} is now ${playerData[statKey]}.`;
        setActionMessage(successMsg, 'success', actionMessageDisplay);
        addLog(successMsg);
        if (playerData[statKey] % 5 === 0) {
            playerData.level++;
            playerData.maxEnergy += 10;
            playerData.maxNerve += 2;
            playerData.energy = playerData.maxEnergy;
            playerData.nerve = playerData.maxNerve;
            playerData.rank = calculateRank(playerData.level);
            addLog(`LEVEL UP! You are now Level ${playerData.level}, Rank: ${playerData.rank}. Power surges!`);
            setActionMessage(`LEVEL UP! Level ${playerData.level}! New Rank: ${playerData.rank}!`, 'success', actionMessageDisplay);
        }
        updateDisplay();
        await savePlayerData();
    }
    
    async function handleRandomEvent() {
        if (!playerData) return;
        const events = [
            { type: 'money_gain', message: "Found a hidden stash! +$50!", effect: () => { playerData.money += 50; } },
            { type: 'money_loss', message: "A curse drains $20 from your coffers!", effect: () => { playerData.money = Math.max(0, playerData.money - 20); } },
            { type: 'energy_boost', message: "A fleeting blessing! +20 Energy!", effect: () => { playerData.energy = Math.min(playerData.maxEnergy, playerData.energy + 20); } },
            { type: 'nerve_boost', message: "A surge of dark confidence! +5 Nerve!", effect: () => { playerData.nerve = Math.min(playerData.maxNerve, playerData.nerve + 5); } },
            { type: 'item_find_small', message: "A Discarded Trinket materializes!", effect: async () => { await addItemToInventory('Cheap Trinket', 1); } }
        ];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        addLog(`Random Event: ${randomEvent.message}`);
        setActionMessage(`Random Event: ${randomEvent.message}`, 'event', actionMessageDisplay);
        await randomEvent.effect();
        if (!randomEvent.type.includes('item_find')) {
            updateDisplay();
            await savePlayerData();
        }
    }

    function calculateRank(level) {
        if (level < 5) return 'Neophyte';
        if (level < 10) return 'Acolyte';
        if (level < 15) return 'Initiate';
        if (level < 20) return 'Shadow Agent';
        if (level < 25) return 'Master of Whispers';
        return 'Shadow Legend';
    }

    function displayUserProfile() {
        if (!playerData) return;
        if(profileUsernameDisplay) profileUsernameDisplay.textContent = playerData.username;
        if(profileAvatarMain) profileAvatarMain.src = playerData.avatarUrl;
        if(profileRoleDisplay) profileRoleDisplay.textContent = playerData.role ? playerData.role.charAt(0).toUpperCase() + playerData.role.slice(1) : 'Player';
        // Use specific IDs for profile page stats to avoid conflict
        const profLevel = document.getElementById('profile-level'); // This is the one in profile section
        const profMoney = document.getElementById('profile-money'); // This is the one in profile section
        if(profLevel) profLevel.textContent = playerData.level;
        if(profMoney) profMoney.textContent = playerData.money;
        if(profileRankDisplay) profileRankDisplay.textContent = playerData.rank;
        if(profileStrengthDisplay) profileStrengthDisplay.textContent = playerData.strength;
        if(profileAgilityDisplay) profileAgilityDisplay.textContent = playerData.agility;
    }

    function displaySettingsPage() {
        if (!playerData || !avatarUrlInput) return;
        avatarUrlInput.value = playerData.avatarUrl || '';
        if(avatarSaveMessage) avatarSaveMessage.textContent = '';
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        if(logoutBtnTop) logoutBtnTop.addEventListener('click', () => {
            localStorage.clear();
            addLog('Logged out.');
            window.location.href = 'index.html';
        });
        if(playerUsernameClickableArea) playerUsernameClickableArea.addEventListener('click', () => navigateToPage('profile'));
        if(goToSettingsBtn) goToSettingsBtn.addEventListener('click', () => navigateToPage('settings'));

        navButtons.forEach(button => {
            button.addEventListener('click', () => navigateToPage(button.dataset.page));
        });

        // Action buttons
        if(crimeShopliftBtn) crimeShopliftBtn.addEventListener('click', () => handleCrime('Shoplifting', 2, 'CRIME_SHOPLIFT_SUCCESS', 'CRIME_SHOPLIFT_MIN_REWARD', 'CRIME_SHOPLIFT_MAX_REWARD', 0, { name: 'Cheap Trinket', chanceKey: 'CRIME_ITEM_FIND_CHANCE_LOW', defaultChance: 0.05 }));
        if(crimePickpocketBtn) crimePickpocketBtn.addEventListener('click', () => handleCrime('Pickpocketing', 3, 'CRIME_PICKPOCKET_SUCCESS', 'CRIME_PICKPOCKET_MIN', 'CRIME_PICKPOCKET_MAX', 10, { name: 'Lockpick', chanceKey: 'CRIME_ITEM_FIND_CHANCE_MED', defaultChance: 0.10 }));
        if(crimeRobberyBtn) crimeRobberyBtn.addEventListener('click', () => handleCrime('Minor Robbery', 5, 'CRIME_ROBBERY_SUCCESS', 'CRIME_ROBBERY_MIN', 'CRIME_ROBBERY_MAX', 30, null));
        if(trainStrengthBtn) trainStrengthBtn.addEventListener('click', () => handleTraining('Strength', 20, 'strength'));
        if(trainAgilityBtn) trainAgilityBtn.addEventListener('click', () => handleTraining('Agility', 15, 'agility'));
        
        // Chat
        if(chatSendBtn) chatSendBtn.addEventListener('click', sendChatMessage);
        if(chatMessageInput) chatMessageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
        chatTabBtns.forEach(tab => {
            tab.addEventListener('click', () => {
                currentChatChannel = tab.dataset.chat;
                chatTabBtns.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                addSystemMessageToChat(`Switched to ${currentChatChannel} channel.`);
                loadChatMessages(currentChatChannel, true); // Full refresh on channel switch
            });
        });

        // Settings Page Listeners
        if(saveAvatarBtn) saveAvatarBtn.addEventListener('click', async () => {
            if (!playerData || !avatarUrlInput || !avatarSaveMessage) return;
            const newAvatarUrl = avatarUrlInput.value.trim();
            if (newAvatarUrl) {
                // Basic URL validation (very simple)
                if (newAvatarUrl.startsWith('http://') || newAvatarUrl.startsWith('https://')) {
                    playerData.avatarUrl = newAvatarUrl;
                    await savePlayerData();
                    updateDisplay(); // Will update avatar in left nav
                    if (document.getElementById('content-profile').style.display === 'block') {
                        displayUserProfile(); // If profile page is active, update it too
                    }
                    avatarSaveMessage.textContent = 'Avatar URL saved!';
                    avatarSaveMessage.className = 'message-area success';
                } else {
                    avatarSaveMessage.textContent = 'Invalid URL. Must start with http:// or https://';
                    avatarSaveMessage.className = 'message-area error';
                }
            } else {
                avatarSaveMessage.textContent = 'Avatar URL cannot be empty.';
                avatarSaveMessage.className = 'message-area error';
            }
            setTimeout(() => { if(avatarSaveMessage) avatarSaveMessage.textContent=''; avatarSaveMessage.className = 'message-area';}, 3000);
        });

        if(gameplayContentArea) gameplayContentArea.addEventListener('click', async (event) => {
            if (event.target.classList.contains('enter-dungeon-btn')) {
                const dungeonId = event.target.dataset.dungeonid;
                const token = localStorage.getItem('sessionToken');
                if (!token) { alert("Auth error!"); return; }
                try {
                    // Fetch full dungeon data including encounter_sequence
                    const response = await fetch(`/api/admin/dungeons/${dungeonId}`, { headers: { 'Authorization': `Bearer ${token}` }});
                    if (!response.ok) throw new Error('Could not load dungeon details to enter.');
                    const dungeonData = await response.json();
                    showDungeonRunView(dungeonData);
                } catch (e) { console.error('Enter dungeon error:', e); setActionMessage('Could not enter dungeon.', 'error'); }
            }
        });
    }

    // --- Game Loop ---
    async function gameLoop() {
        if (!playerData) return;
        let stateChanged = false;
        if (playerData.energy < playerData.maxEnergy) {
            playerData.energy = Math.min(playerData.maxEnergy, playerData.energy + (GAME_CONFIG.ENERGY_REGEN_RATE || 1));
            stateChanged = true;
        }
        if (playerData.nerve < playerData.maxNerve) {
            playerData.nerve = Math.min(playerData.maxNerve, playerData.nerve + (GAME_CONFIG.NERVE_REGEN_RATE || 1));
            stateChanged = true;
        }
        if (isInJail && jailTimer > 0) {
            jailTimer--;
            stateChanged = true;
            if (jailTimer === 0) {
                isInJail = false;
                addLog('Freedom! (Jail time served).');
                setActionMessage('The shackles are broken.', 'success', actionMessageDisplay);
            }
        }
        if (!isInJail && Math.random() < (GAME_CONFIG.RANDOM_EVENT_CHANCE || 0.01)) {
            await handleRandomEvent();
            return; // Return to avoid double save if event also saves & updates display
        }
        const newRank = calculateRank(playerData.level);
        if (playerData.rank !== newRank) {
            playerData.rank = newRank;
            addLog(`New Rank: ${newRank}!`);
            stateChanged = true;
        }
        if (stateChanged) {
            updateDisplay();
            await savePlayerData();
        }
    }

    // --- Chat Logic ---
    function displayChatMessage(msg) { // msg object from server
        if (!chatFeed) return;
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.dataset.messageId = msg.message_id;

        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('chat-timestamp');
        timestampSpan.textContent = `[${new Date(msg.timestamp).toLocaleTimeString()}] `;
        messageElement.appendChild(timestampSpan);

        const userSpan = document.createElement('span');
        userSpan.classList.add('chat-username');
        userSpan.textContent = `${msg.username}: `;
        if (msg.username === loggedInUser) userSpan.classList.add('own-message-user');
        if (msg.role === 'admin') userSpan.classList.add('admin-message-user'); // Example admin styling
        messageElement.appendChild(userSpan);
        
        messageElement.append(document.createTextNode(msg.message_content));
        chatFeed.appendChild(messageElement);
        chatFeed.scrollTop = chatFeed.scrollHeight;
        lastMessageId = Math.max(lastMessageId, msg.message_id); // Track last displayed ID
    }

    async function loadChatMessages(channel, fullRefresh = false) {
        if (!chatFeed) return;
        const token = localStorage.getItem('sessionToken');
        if (!token) { addSystemMessageToChat("Chat auth error."); return; }

        if (fullRefresh) {
            chatFeed.innerHTML = ''; // Clear for full refresh or channel switch
            lastMessageId = 0;
        }

        // To get only *new* messages, we'd ideally have an API like /api/chat/messages/:channel?sinceId=<lastMessageId>
        // For now, fetching last N messages and filtering client-side if not fullRefresh (simple poll)
        // The server currently reverses, so they come in chronological order to client.
        let url = `/api/chat/messages/${channel}?limit=50`; // Fetch last 50 on full load/switch
        // If not fullRefresh and we want only newer: (this part is more complex without server support for sinceId)
        // if (!fullRefresh && lastMessageId > 0) { /* url += `&after_id=${lastMessageId}`; */ }

        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401 || response.status === 403) {
                addSystemMessageToChat("Chat session error. Re-login."); localStorage.clear(); window.location.href = 'index.html'; return;
            }
            if (!response.ok) { addSystemMessageToChat("Error loading messages."); return; }
            const messages = await response.json();
            messages.forEach(msg => {
                // Simple check to avoid re-displaying if just polling last N and not using sinceId
                if (fullRefresh || !chatFeed.querySelector(`[data-message-id="${msg.message_id}"]`)) {
                    displayChatMessage(msg);
                }
            });
        } catch (error) { console.error("Chat load error:", error); addSystemMessageToChat("Could not load chat."); }
    }

    async function sendChatMessage() {
        if (!chatMessageInput || !playerData) return;
        const messageContent = chatMessageInput.value.trim();
        if (!messageContent) return;

        // Client-side mute check (server also validates, this is for immediate UI feedback)
        if (playerData.is_muted && (playerData.mute_until === null || new Date(playerData.mute_until) > new Date())){
            setActionMessage("You are currently muted.", 'error');
            return;
        }

        const token = localStorage.getItem('sessionToken');
        if (!token) { addSystemMessageToChat("Cannot send: Not authenticated."); return; }

        try {
            const response = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ channel: currentChatChannel, message_content: messageContent })
            });
            if (response.ok) {
                const newMessage = await response.json();
                // displayChatMessage(newMessage); // Display immediately or wait for poll
                chatMessageInput.value = '';
                // If not using WebSockets, the poll will pick it up.
                // For instant display, uncomment above and ensure poll doesn't re-add.
            } else {
                const errorData = await response.json();
                setActionMessage(errorData.message || "Failed to send message.", 'error');
                 if (response.status === 403) { // Specifically if muted by server
                    // Refresh playerData to get updated mute status if server unmuted due to expiry
                    const freshPlayerData = await fetch(`/api/game/playerdata/${loggedInUser}`, { headers: { 'Authorization': `Bearer ${token}` }});
                    if(freshPlayerData.ok) localStorage.setItem('playerData', JSON.stringify(await freshPlayerData.json()));
                    loadPlayerDataFromServer(); // Reload to update playerData.is_muted
                }
            }
        } catch (error) { console.error("Send chat error:", error); setActionMessage("Network error sending message.",'error'); }
    }

    function fetchNewChatMessages(channel) {
        // This is a simplified poll. It re-fetches last N and client filters.
        // Better: server endpoint supporting `?sinceId=`
        loadChatMessages(channel, false);
    }

    function addSystemMessageToChat(message) {
        if (!chatFeed) return;
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', 'system-message');
        messageElement.textContent = `[System] ${message}`;
        chatFeed.appendChild(messageElement);
        chatFeed.scrollTop = chatFeed.scrollHeight;
    }

    // --- Dungeon Listing & Entering Logic ---
    async function loadAndDisplayAvailableDungeons() {
        if (!availableDungeonsList) return;
        availableDungeonsList.innerHTML = '<p>Searching for nearby dungeons...</p>';
        const token = localStorage.getItem('sessionToken');
        if (!token) { availableDungeonsList.innerHTML = '<p>Authentication error.</p>'; return; }

        try {
            const response = await fetch('/api/game/dungeons', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch dungeons');
            const dungeons = await response.json();

            availableDungeonsList.innerHTML = ''; // Clear loading
            if (dungeons && dungeons.length > 0) {
                dungeons.forEach(dungeon => {
                    const card = document.createElement('div');
                    card.className = 'dungeon-card';
                    card.innerHTML = `
                        <img src="${dungeon.image_url || 'https://via.placeholder.com/300x100/1a1818/e0c9a6?text=' + encodeURIComponent(dungeon.name)}" alt="${dungeon.name}">
                        <div class="dungeon-card-content">
                            <h3><i class="fas fa-dungeon"></i> ${dungeon.name}</h3>
                            <p class="dungeon-desc">${dungeon.description || 'An air of mystery surrounds this place.'}</p>
                            <p><strong>Recommended Level:</strong> ${dungeon.recommended_level || 'N/A'}</p>
                            <div class="dungeon-reco-stats"><strong>Recommended Stats:</strong> 
                                ${dungeon.recommended_stats ? Object.entries(dungeon.recommended_stats).map(([key,val])=>`${key.charAt(0).toUpperCase()+key.slice(1)}: ${val}`).join(', ') : 'None specified'}
                            </div>
                            <div class="dungeon-loot-preview" id="loot-preview-${dungeon.dungeon_id}"><p><em>Loading loot preview...</em></p></div>
                            <button class="game-action-btn enter-dungeon-btn" data-dungeonid="${dungeon.dungeon_id}"><i class="fas fa-door-open"></i> Enter ${dungeon.name}</button>
                        </div>
                    `;
                    availableDungeonsList.appendChild(card);
                    fetchAndDisplayLootPreview(dungeon.dungeon_id);
                });
            } else {
                availableDungeonsList.innerHTML = '<p>No dungeons are currently accessible or known.</p>';
            }
        } catch (error) { console.error('Error loading dungeons:', error); availableDungeonsList.innerHTML = `<p>Error: ${error.message}</p>`; }
    }

    async function fetchAndDisplayLootPreview(dungeonId) {
        const previewEl = document.getElementById(`loot-preview-${dungeonId}`);
        if (!previewEl) return;
        const token = localStorage.getItem('sessionToken');
        try {
            const response = await fetch(`/api/game/dungeons/${dungeonId}/loot-preview`, { headers: { 'Authorization': `Bearer ${token}` } });
            if(!response.ok) { previewEl.innerHTML = '<p><em>Could not load loot info.</em></p>'; return; }
            const lootData = await response.json();
            let html = '<h4>Potential Drops:</h4><ul>';
            const rarities = ['mythical', 'legendary', 'rare', 'uncommon', 'common'];
            let foundLoot = false;
            rarities.forEach(rarity => {
                if (lootData[rarity] && lootData[rarity].length > 0) {
                    foundLoot = true;
                    html += `<li><strong>${rarity.charAt(0).toUpperCase() + rarity.slice(1)}:</strong> ${lootData[rarity].join(', ')}</li>`;
                }
            });
            if (!foundLoot) html += '<li><em>No specific drops listed.</em></li>';
            html += '</ul>';
            previewEl.innerHTML = html;
        } catch (e) { console.error('Loot preview error:', e); previewEl.innerHTML = '<p><em>Loot info unavailable.</em></p>'; }
    }

    function showDungeonRunView(dungeonData) {
        pageContents.forEach(pc => pc.style.display = 'none'); // Hide all main content sections
        let dungeonRunView = document.getElementById('content-dungeon-run');
        if (!dungeonRunView) { // Create if doesn't exist
            dungeonRunView = document.createElement('div');
            dungeonRunView.id = 'content-dungeon-run';
            dungeonRunView.classList.add('page-content', 'game-content-panel');
            if(gameplayContentArea) gameplayContentArea.appendChild(dungeonRunView);
        }
        currentDungeonInstance = {
            ...dungeonData, // Full data including encounter_sequence, etc.
            currentEncounterIndex: 0,
            playerHealth: playerData.max_energy, // Example: use max_energy as health pool
            lootCollected: [],
            startTime: Date.now()
        };
        dungeonRunView.innerHTML = `<h2><i class="fas fa-skull-crossbones"></i> Entering ${dungeonData.name}...</h2>
                                  <p>Encounter and combat gameplay to be implemented here.</p>
                                  <p>Encounters: ${JSON.stringify(dungeonData.encounter_sequence)}</p>
                                  <button id="temp-dungeon-complete-btn">Simulate Boss Defeat</button>`;
        dungeonRunView.style.display = 'block';

        document.getElementById('temp-dungeon-complete-btn').addEventListener('click', () => {
            showDungeonVictoryPopup(dungeonData.name);
        });
    }

    function showDungeonVictoryPopup(dungeonName) {
        // Create and show a modal/popup
        let popup = document.getElementById('dungeon-victory-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'dungeon-victory-popup';
            popup.classList.add('modal-popup'); // Style this class
            document.body.appendChild(popup);
        }
        const timeTaken = ((Date.now() - (currentDungeonInstance?.startTime || Date.now())) / 1000).toFixed(1);
        popup.innerHTML = `
            <div class="modal-content">
                <h2><i class="fas fa-trophy"></i> Dungeon Complete!</h2>
                <p>You have vanquished the evils within ${dungeonName}!</p>
                <h4>Summary:</h4>
                <ul>
                    <li>Experience Gained: <span id="dungeon-xp-gain">125</span> (mock)</li>
                    <li>Gold Collected: <span id="dungeon-gold-gain">50</span> (mock)</li>
                    <li>Items Found: <span id="dungeon-items-found">Rusty Dagger, 2x Health Potion</span> (mock)</li>
                    <li>Time Taken: ${timeTaken} seconds</li>
                </ul>
                <button id="exit-dungeon-popup-btn">Exit Dungeon</button>
            </div>
        `;
        popup.style.display = 'flex';
        document.getElementById('exit-dungeon-popup-btn').addEventListener('click', () => {
            popup.style.display = 'none';
            // TODO: Call API to save player progress (XP, gold, items)
            // For now, just clear the dungeon instance and navigate back
            currentDungeonInstance = null;
            navigateToPage('dungeons'); // Go back to dungeon list
        }, { once: true }); 
    }

    // --- Start the Game --- 
    initializeGame();
}); 