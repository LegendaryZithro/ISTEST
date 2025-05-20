document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUser = localStorage.getItem('loggedInUser');
    const userRole = localStorage.getItem('userRole');
    const sessionToken = localStorage.getItem('sessionToken');

    if (!loggedInUser || !sessionToken || userRole !== 'admin') {
        console.warn('Admin Access Denied: User not logged in as admin or missing token.');
        localStorage.clear(); // Clear any partial auth state
        window.location.href = '../game.html'; // Redirect to game, which will then redirect to index if needed
        return;
    }
    console.log('Admin authenticated via stored role & token:', loggedInUser);

    // --- DOM Element Lookups (Grouped at the top) ---
    const adminPageContents = document.querySelectorAll('.admin-page-content');
    const adminNavButtons = document.querySelectorAll('.admin-nav-button');
    const returnToGameBtn = document.getElementById('return-to-game-btn');
    const userListContainer = document.getElementById('user-list-container');
    const itemListContainer = document.getElementById('item-list-container');
    const showAddItemFormBtn = document.getElementById('show-add-item-form-btn');
    const itemForm = document.getElementById('add-edit-item-form');
    const itemFormTitle = document.getElementById('item-form-title');
    const itemFormMode = document.getElementById('item-form-mode');
    const itemFormEditId = document.getElementById('item-form-edit-id');
    const itemIdInput = document.getElementById('item-id');
    const itemNameInput = document.getElementById('item-name');
    const itemDescriptionInput = document.getElementById('item-description');
    const itemTypeSelect = document.getElementById('item-type');
    const itemEffectsTextarea = document.getElementById('item-effects');
    const itemValueInput = document.getElementById('item-value');
    const itemImageUrlInput = document.getElementById('item-image-url');
    const itemStackableCheckbox = document.getElementById('item-stackable');
    const itemDataTextarea = document.getElementById('item-data');
    const saveItemBtn = document.getElementById('save-item-btn');
    const cancelItemFormBtn = document.getElementById('cancel-item-form-btn');
    const itemFormMessage = document.getElementById('item-form-message');
    const pageSelector = document.getElementById('page-selector');
    const visualEditorCanvas = document.getElementById('visual-editor-canvas');
    const mockToolbarBtns = document.querySelectorAll('.mock-tool-btn');
    const visualEditorUndoBtn = document.getElementById('visual-editor-undo-btn');
    const visualEditorSaveBtn = document.getElementById('visual-editor-save-btn');
    const totalUsersStatEl = document.getElementById('total-users-stat');
    const totalItemsStatEl = document.getElementById('total-items-stat');
    const totalNpcsStatEl = document.getElementById('total-npcs-stat');
    const totalQuestsStatEl = document.getElementById('total-quests-stat');
    const totalLocationsStatEl = document.getElementById('total-locations-stat');
    const editUserForm = document.getElementById('edit-user-details-form');
    const editUserUsernameTitle = document.getElementById('edit-user-username-title');
    const editUserOriginalUsernameInput = document.getElementById('edit-user-original-username');
    const editUserMoneyInput = document.getElementById('edit-user-money');
    const editUserLevelInput = document.getElementById('edit-user-level');
    const editUserStrengthInput = document.getElementById('edit-user-strength');
    const editUserAgilityInput = document.getElementById('edit-user-agility');
    const editUserRankInput = document.getElementById('edit-user-rank');
    const editUserAvatarInput = document.getElementById('edit-user-avatar');
    const cancelEditUserBtn = document.getElementById('cancel-edit-user-btn');
    const editUserMessage = document.getElementById('edit-user-message');
    const playersOnlineCountEl = document.getElementById('players-online-count');
    const npcListContainer = document.getElementById('npc-list-container');
    const showAddNpcFormBtn = document.getElementById('show-add-npc-form-btn');
    const npcForm = document.getElementById('add-edit-npc-form');
    const npcFormTitle = document.getElementById('npc-form-title');
    const npcFormMode = document.getElementById('npc-form-mode');
    const npcFormEditId = document.getElementById('npc-form-edit-id');
    const npcIdInput = document.getElementById('npc-id');
    const npcNameInput = document.getElementById('npc-name');
    const npcDescriptionInput = document.getElementById('npc-description');
    const npcDialogueTextarea = document.getElementById('npc-dialogue');
    const npcAvatarUrlInput = document.getElementById('npc-avatar-url');
    const npcLocationIdInput = document.getElementById('npc-location-id');
    const saveNpcBtn = document.getElementById('save-npc-btn');
    const cancelNpcFormBtn = document.getElementById('cancel-npc-form-btn');
    const npcFormMessage = document.getElementById('npc-form-message');
    const questListContainer = document.getElementById('quest-list-container');
    const showAddQuestFormBtn = document.getElementById('show-add-quest-form-btn');
    const questForm = document.getElementById('add-edit-quest-form');
    const questFormTitle = document.getElementById('quest-form-title');
    const questFormMode = document.getElementById('quest-form-mode');
    const questFormEditId = document.getElementById('quest-form-edit-id');
    const questIdInput = document.getElementById('quest-id');
    const questTitleInput = document.getElementById('quest-title');
    const questDescriptionTextarea = document.getElementById('quest-description');
    const questObjectivesTextarea = document.getElementById('quest-objectives-summary');
    const questPrerequisitesTextarea = document.getElementById('quest-prerequisites');
    const questRewardsTextarea = document.getElementById('quest-rewards');
    const questStartNpcInput = document.getElementById('quest-start-npc-id');
    const questEndNpcInput = document.getElementById('quest-end-npc-id');
    const questIsRepeatableCheckbox = document.getElementById('quest-is-repeatable');
    const saveQuestBtn = document.getElementById('save-quest-btn');
    const cancelQuestFormBtn = document.getElementById('cancel-quest-form-btn');
    const questFormMessage = document.getElementById('quest-form-message');
    const locationListContainer = document.getElementById('location-list-container');
    const showAddLocationFormBtn = document.getElementById('show-add-location-form-btn');
    const locationForm = document.getElementById('add-edit-location-form');
    const locationFormTitle = document.getElementById('location-form-title');
    const locationFormMode = document.getElementById('location-form-mode');
    const locationFormEditId = document.getElementById('location-form-edit-id');
    const locationIdInput = document.getElementById('location-id');
    const locationNameInput = document.getElementById('location-name');
    const locationDescriptionTextarea = document.getElementById('location-description');
    const locationConnectionsTextarea = document.getElementById('location-connections');
    const locationImageUrlInput = document.getElementById('location-image-url');
    const locationDataTextarea = document.getElementById('location-data');
    const saveLocationBtn = document.getElementById('save-location-btn');
    const cancelLocationFormBtn = document.getElementById('cancel-location-form-btn');
    const locationFormMessage = document.getElementById('location-form-message');
    const recentUsersListEl = document.getElementById('recent-users-list');
    const recentAdminLogsListEl = document.getElementById('recent-admin-logs-list');

    // Game Settings Elements
    const gameSettingsFieldsContainer = document.getElementById('game-settings-fields-container');
    const gameSettingsForm = document.getElementById('game-settings-form');
    const gameSettingsFormMessage = document.getElementById('game-settings-form-message');
    // saveGameSettingsBtn is implicitly handled by form submit listener

    // Admin Log Elements
    const adminLogListContainer = document.getElementById('admin-log-list-container');
    const refreshAdminLogsBtn = document.getElementById('refresh-admin-logs-btn');
    const adminLogPrevPageBtn = document.getElementById('admin-log-prev-page');
    const adminLogNextPageBtn = document.getElementById('admin-log-next-page');
    const adminLogPageInfo = document.getElementById('admin-log-page-info');
    let currentAdminLogPage = 1;
    const adminLogsPerPage = 25; // Configurable
    let totalAdminLogs = 0;

    // Bot User Management Elements
    const botListContainer = document.getElementById('bot-list-container');
    const showAddBotFormBtn = document.getElementById('show-add-bot-form-btn');
    const botForm = document.getElementById('add-bot-form');
    const botUsernameInput = document.getElementById('bot-username');
    const botPasswordInput = document.getElementById('bot-password');
    const botInitialLevelInput = document.getElementById('bot-initial-level');
    const botInitialMoneyInput = document.getElementById('bot-initial-money');
    const saveBotBtn = document.getElementById('save-bot-btn'); // Or listen on form submit
    const cancelBotFormBtn = document.getElementById('cancel-bot-form-btn');
    const botFormMessage = document.getElementById('bot-form-message');

    // Dungeon Management Elements
    const dungeonListContainer = document.getElementById('dungeon-list-container');
    const showAddDungeonFormBtn = document.getElementById('show-add-dungeon-form-btn');
    const dungeonForm = document.getElementById('add-edit-dungeon-form');
    const dungeonFormTitle = document.getElementById('dungeon-form-title');
    const dungeonFormMode = document.getElementById('dungeon-form-mode');
    const dungeonFormEditId = document.getElementById('dungeon-form-edit-id');
    const dungeonIdInput = document.getElementById('dungeon-id');
    const dungeonNameInput = document.getElementById('dungeon-name');
    const dungeonDescriptionTextarea = document.getElementById('dungeon-description');
    const dungeonImageUrlInput = document.getElementById('dungeon-image-url');
    const dungeonRecLevelInput = document.getElementById('dungeon-recommended-level');
    const dungeonRecStatsTextarea = document.getElementById('dungeon-recommended-stats');
    const dungeonEncountersTextarea = document.getElementById('dungeon-encounter-sequence');
    const cancelDungeonFormBtn = document.getElementById('cancel-dungeon-form-btn');
    const dungeonFormMessage = document.getElementById('dungeon-form-message');
    // Loot Table Management Elements
    const dungeonLootManagerDiv = document.getElementById('dungeon-loot-manager');
    const lootManagerDungeonName = document.getElementById('loot-manager-dungeon-name');
    const addLootItemForm = document.getElementById('add-loot-item-form');
    const lootDungeonIdRef = document.getElementById('loot-dungeon-id-ref');
    const lootItemIdSelect = document.getElementById('loot-item-id');
    const lootRaritySelect = document.getElementById('loot-rarity');
    const lootDropChanceInput = document.getElementById('loot-drop-chance');
    const lootMinQtyInput = document.getElementById('loot-min-quantity');
    const lootMaxQtyInput = document.getElementById('loot-max-quantity');
    const dungeonLootTableContainer = document.getElementById('dungeon-loot-table-container');
    const lootFormMessage = document.getElementById('loot-form-message');

    // Enemy Management Elements
    const enemyListContainer = document.getElementById('enemy-list-container');
    const showAddEnemyFormBtn = document.getElementById('show-add-enemy-form-btn');
    const enemyForm = document.getElementById('add-edit-enemy-form');
    const enemyFormTitle = document.getElementById('enemy-form-title');
    const enemyFormMode = document.getElementById('enemy-form-mode');
    const enemyFormEditId = document.getElementById('enemy-form-edit-id');
    const enemyIdInput = document.getElementById('enemy-id');
    const enemyNameInput = document.getElementById('enemy-name');
    const enemyDescriptionTextarea = document.getElementById('enemy-description');
    const enemyAvatarUrlInput = document.getElementById('enemy-avatar-url');
    const enemyHealthInput = document.getElementById('enemy-health');
    const enemyAttackInput = document.getElementById('enemy-attack');
    const enemyDefenseInput = document.getElementById('enemy-defense');
    const enemyXpRewardInput = document.getElementById('enemy-xp-reward');
    const enemyMoneyMinInput = document.getElementById('enemy-money-drop-min');
    const enemyMoneyMaxInput = document.getElementById('enemy-money-drop-max');
    const enemyDataTextarea = document.getElementById('enemy-data');
    const cancelEnemyFormBtn = document.getElementById('cancel-enemy-form-btn');
    const enemyFormMessage = document.getElementById('enemy-form-message');

    function initializeAdminDashboard() { 
        console.log('Initializing Admin Dashboard...');
        setupAdminEventListeners();
        navigateToAdminPage('dashboard'); 
        if(playersOnlineCountEl) playersOnlineCountEl.textContent = '1 (You!)';
        console.log('Admin Dashboard Initialized');
        loadDashboardStats(); // Load dashboard stats on init
    }

    function navigateToAdminPage(pageId) {
        console.log("Navigating to admin page:", pageId);
        adminPageContents.forEach(content => {
            if (content.id === `admin-content-${pageId}`) {
                content.style.display = 'block';
            } else {
                content.style.display = 'none';
            }
        });
        adminNavButtons.forEach(button => {
            if (button.dataset.page === pageId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Hide forms when navigating away from their primary sections or to dashboard
        if (itemForm && pageId !== 'items') itemForm.style.display = 'none';
        if (editUserForm && pageId !== 'users') editUserForm.style.display = 'none';
        if (showAddItemFormBtn && pageId === 'items') showAddItemFormBtn.style.display = 'inline-block'; // Ensure add button is visible on items page
        if (npcForm && pageId !== 'npcs') npcForm.style.display = 'none';
        if (questForm && pageId !== 'quests') questForm.style.display = 'none'; // Hide Quest form
        if (locationForm && pageId !== 'locations') locationForm.style.display = 'none'; // Hide Location form
        if (gameSettingsForm && pageId !== 'game-settings' && gameSettingsForm.style.display !== 'none') { /* No form to explicitly hide yet besides what's inside game-settings-fields-container */ }
        if (botForm && pageId !== 'bots') botForm.style.display = 'none'; // Hide Bot form
        if (dungeonForm && pageId !== 'dungeons') { dungeonForm.style.display = 'none'; if(dungeonLootManagerDiv) dungeonLootManagerDiv.style.display = 'none'; }
        if (enemyForm && pageId !== 'enemies') enemyForm.style.display = 'none'; // Hide Enemy form

        // Load content for specific pages
        if (pageId === 'dashboard') loadDashboardStats();
        if (pageId === 'users') loadAndDisplayUsers();
        if (pageId === 'items') loadAndDisplayItems();
        if (pageId === 'npcs') loadAndDisplayNpcs();
        if (pageId === 'quests') loadAndDisplayQuests();
        if (pageId === 'editor') setupVisualEditor(); 
        if (pageId === 'game-settings') loadAndDisplayGameSettings();
        if (pageId === 'locations') loadAndDisplayLocations();
        if (pageId === 'admin-logs') loadAndDisplayAdminLogs();
        if (pageId === 'bots') loadAndDisplayBots();
        if (pageId === 'dungeons') loadAndDisplayDungeons();
        if (pageId === 'enemies') loadAndDisplayEnemies();
    }

    async function loadDashboardStats() {
        const token = localStorage.getItem('sessionToken');
        if (!token) return;

        // Helper to update stat element
        const updateStatElement = async (element, url, propertyName = 'length') => {
            if (!element) return;
            element.textContent = 'Loading...';
            try {
                const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                if (response.ok) {
                    const data = await response.json();
                    element.textContent = propertyName === 'length' ? (data.length || 0) : (data[propertyName] || 0);
                } else { element.textContent = 'Error'; }
            } catch (e) { console.error(`Error loading stat for ${url}:`, e); element.textContent = 'N/A'; }
        };

        await updateStatElement(totalUsersStatEl, '/api/admin/users');
        await updateStatElement(totalItemsStatEl, '/api/admin/items');
        await updateStatElement(totalNpcsStatEl, '/api/admin/npcs');
        await updateStatElement(totalQuestsStatEl, '/api/admin/quests');
        await updateStatElement(totalLocationsStatEl, '/api/admin/locations');

        // Load Recent Users (simplified: get all users, sort by created_at if available, take top 5)
        // A dedicated API endpoint would be better for performance with many users.
        if (recentUsersListEl) {
            recentUsersListEl.innerHTML = '<li>Loading recent users...</li>';
            try {
                const usersResponse = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
                if (usersResponse.ok) {
                    let users = await usersResponse.json();
                    // Assuming users have a 'created_at' field from DB. Sort and slice.
                    // If server doesn't sort, we can do a basic client sort if created_at is available
                    // For now, just take the first few if no created_at from this basic /api/admin/users endpoint
                    users = users.slice(0, 5); // Simplistic: takes first 5 as returned by API (usually by username)
                    recentUsersListEl.innerHTML = '';
                    if (users.length > 0) {
                        users.forEach(user => {
                            const li = document.createElement('li');
                            li.innerHTML = `${user.username} <span>(ID: ${user.id}, Role: ${user.role})</span>`;
                            recentUsersListEl.appendChild(li);
                        });
                    } else { recentUsersListEl.innerHTML = '<li>No users found.</li>'; }
                } else { recentUsersListEl.innerHTML = '<li>Error loading users.</li>'; }
            } catch (e) { console.error('Error loading recent users:', e); recentUsersListEl.innerHTML = '<li>Error loading users.</li>'; }
        }

        // Load Recent Admin Logs
        if (recentAdminLogsListEl) {
            recentAdminLogsListEl.innerHTML = '<li>Loading recent logs...</li>';
            try {
                const logsResponse = await fetch('/api/admin/logs?limit=5', { headers: { 'Authorization': `Bearer ${token}` } });
                if (logsResponse.ok) {
                    const logData = await logsResponse.json();
                    const logs = logData.logs;
                    recentAdminLogsListEl.innerHTML = '';
                    if (logs && logs.length > 0) {
                        logs.forEach(log => {
                            const li = document.createElement('li');
                            li.innerHTML = 
                                `<div><strong>${log.action_type}</strong> by ${log.admin_username} ` +
                                (log.target_id ? `on <em>${log.target_id}</em>` : '') + `</div>` +
                                `<span class="timestamp">${new Date(log.timestamp).toLocaleTimeString()} ${new Date(log.timestamp).toLocaleDateString()}</span>` +
                                (log.details ? `<div class="log-details"><pre>${JSON.stringify(log.details, null, 2)}</pre></div>` : '');
                            recentAdminLogsListEl.appendChild(li);
                        });
                    } else { recentAdminLogsListEl.innerHTML = '<li>No recent admin actions.</li>'; }
                } else { recentAdminLogsListEl.innerHTML = '<li>Error loading logs.</li>'; }
            } catch (e) { console.error('Error loading recent admin logs:', e); recentAdminLogsListEl.innerHTML = '<li>Error loading logs.</li>'; }
        }
    }

    async function loadAndDisplayUsers() {
        if (!userListContainer) return;
        userListContainer.innerHTML = '<p>Loading users...</p>';
        try {
            const token = localStorage.getItem('sessionToken');
            if (!token) { throw new Error("Admin token not found."); }

            const response = await fetch('/api/admin/users', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.status === 401 || response.status === 403) {
                alert("Session expired or unauthorized. Please log in again as admin.");
                localStorage.clear(); window.location.href = '../index.html'; return;
            }
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to fetch users.');
            }
            const allUsers = await response.json();
            
            if (allUsers && allUsers.length > 0) {
                const table = document.createElement('table');
                table.innerHTML = `<thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Level</th><th>Money</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody>`;
                const tbody = table.querySelector('tbody');
                allUsers.forEach(user => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = user.id;
                    row.insertCell().textContent = user.username;
                    
                    const roleCell = row.insertCell();
                    // Create a select for role editing if user is not Zithro
                    if (user.username.toLowerCase() !== 'zithro') {
                        const roleSelect = document.createElement('select');
                        roleSelect.classList.add('role-select');
                        roleSelect.dataset.username = user.username;
                        const roles = ['player', 'admin', 'moderator']; // Example roles
                        roles.forEach(r => {
                            const option = document.createElement('option');
                            option.value = r;
                            option.textContent = r.charAt(0).toUpperCase() + r.slice(1);
                            if (user.role === r) option.selected = true;
                            roleSelect.appendChild(option);
                        });
                        roleCell.appendChild(roleSelect);
                    } else {
                        roleCell.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1); // Display Zithro's role as text
                    }

                    row.insertCell().textContent = user.level;
                    row.insertCell().textContent = user.money;
                    
                    const statusCell = row.insertCell();
                    statusCell.textContent = user.is_banned ? 'Banned' : (user.is_muted ? `Muted (until ${user.mute_until || 'further notice'})` : 'Active');
                    if(user.is_banned) statusCell.classList.add('status-banned');
                    if(user.is_muted && !user.is_banned) statusCell.classList.add('status-muted');

                    const actionsCell = row.insertCell();
                    if (user.username.toLowerCase() !== 'zithro') {
                        actionsCell.innerHTML += `<button class="action-button save-role-btn" data-username="${user.username}">Save Role</button>`;
                        actionsCell.innerHTML += `<button class="action-button edit-user-details-btn" data-username="${user.username}">Edit Details</button>`;
                        actionsCell.innerHTML += user.is_banned ? `<button class="action-button unban-user-btn" data-username="${user.username}">Unban</button>` : `<button class="action-button ban-user-btn" data-username="${user.username}">Ban</button>`;
                        actionsCell.innerHTML += user.is_muted ? `<button class="action-button unmute-user-btn" data-username="${user.username}">Unmute</button>` : `<button class="action-button mute-user-btn" data-username="${user.username}">Mute</button>`;
                        actionsCell.innerHTML += `<button class="action-button delete-user-btn danger-action" data-username="${user.username}">Delete</button>`;
                    }
                });
                userListContainer.innerHTML = ''; 
                userListContainer.appendChild(table);
            } else {
                userListContainer.innerHTML = '<p>No users found in the database.</p>';
            }
        } catch (error) {
            console.error('Error loading users:', error);
            userListContainer.innerHTML = `<p>Error loading users: ${error.message}</p>`;
        }
    }

    async function handleUpdateUserRole(username, newRole) {
        try {
            const token = localStorage.getItem('sessionToken');
            if (!token) { throw new Error("Admin token not found for update action."); }
            const response = await fetch(`/api/admin/users/${username}/updaterole`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newRole })
            });
            if (response.status === 401 || response.status === 403) {
                alert("Session expired or unauthorized for update. Please log in again as admin.");
                localStorage.clear(); window.location.href = '../index.html'; return;
            }
            const data = await response.json();
            if (response.ok) {
                alert(data.message); // Or use a more integrated notification system
                loadAndDisplayUsers(); // Refresh the list
            } else {
                throw new Error(data.message || 'Failed to update role.');
            }
        } catch (error) {
            console.error('Error updating user role:', error);
            alert(`Error updating role: ${error.message}`);
        }
    }

    // --- Item Management Logic ---
    function setItemFormMessage(message, type) {
        if(!itemFormMessage) return;
        itemFormMessage.textContent = message;
        itemFormMessage.className = 'message-area modern-message';
        if(type) itemFormMessage.classList.add(type);
        setTimeout(() => { if(itemFormMessage) itemFormMessage.textContent = ''; itemFormMessage.className = 'message-area modern-message'; }, 4000);
    }

    function openItemForm(mode = 'add', item = null) {
        if (!itemForm) return;
        itemFormMode.value = mode;
        itemForm.reset(); // Always reset first
        if (mode === 'edit' && item) {
            if(itemFormTitle) itemFormTitle.innerHTML = '<i class="fas fa-edit"></i> Edit'; // Corrected way to set HTML with icon
            itemFormEditId.value = item.item_id;
            if(itemIdInput) { itemIdInput.value = item.item_id; itemIdInput.readOnly = true; }
            if(itemNameInput) itemNameInput.value = item.name;
            if(itemDescriptionInput) itemDescriptionInput.value = item.description || '';
            if(itemTypeSelect) itemTypeSelect.value = item.type;
            // Ensure effects and data are pretty-printed JSON for textarea
            if(itemEffectsTextarea) itemEffectsTextarea.value = item.effects ? JSON.stringify(item.effects, null, 2) : '{}';
            if(itemValueInput) itemValueInput.value = item.value || 0;
            if(itemImageUrlInput) itemImageUrlInput.value = item.image_url || '';
            if(itemStackableCheckbox) itemStackableCheckbox.checked = !!item.stackable;
            if(itemDataTextarea) itemDataTextarea.value = item.data ? JSON.stringify(item.data, null, 2) : '{}';
        } else {
            if(itemFormTitle) itemFormTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New';
            if(itemIdInput) itemIdInput.readOnly = false;
            if(itemFormEditId) itemFormEditId.value = '';
            if(itemEffectsTextarea) itemEffectsTextarea.value = '{}'; // Default to empty JSON object string
            if(itemDataTextarea) itemDataTextarea.value = '{}';    // Default to empty JSON object string
        }
        itemForm.style.display = 'block';
        if(showAddItemFormBtn) showAddItemFormBtn.style.display = 'none'; // Hide Add button when form is open
        setItemFormMessage('');
    }

    async function loadAndDisplayItems() {
        if (!itemListContainer) return;
        itemListContainer.innerHTML = '<p>Loading items...</p>';
        const token = localStorage.getItem('sessionToken');
        if (!token) { itemListContainer.innerHTML = '<p>Admin token not found.</p>'; return; }
        try {
            const response = await fetch('/api/admin/items', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch items');
            const items = await response.json();
            if (items && items.length > 0) {
                const table = document.createElement('table');
                table.innerHTML = `<thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Value</th><th>Effects (JSON)</th><th>Stackable</th><th>Actions</th></tr></thead><tbody></tbody>`;
                const tbody = table.querySelector('tbody');
                items.forEach(item => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = item.item_id;
                    row.insertCell().textContent = item.name;
                    row.insertCell().textContent = item.type;
                    row.insertCell().textContent = item.value;
                    row.insertCell().textContent = item.effects ? JSON.stringify(item.effects) : '-none-';
                    row.insertCell().textContent = item.stackable ? 'Yes' : 'No';
                    const actionsCell = row.insertCell();
                    actionsCell.innerHTML = 
                        `<button class="action-button edit-item-btn" data-itemid="${item.item_id}">Edit</button>
                         <button class="action-button delete-item-btn" data-itemid="${item.item_id}">Delete</button>`;
                });
                itemListContainer.innerHTML = ''; itemListContainer.appendChild(table);
            } else { itemListContainer.innerHTML = '<p>No game items found. Add some!</p>'; }
        } catch (error) { console.error('Error loading items:', error); itemListContainer.innerHTML = `<p>Error: ${error.message}</p>`; }
        if (showAddItemFormBtn) showAddItemFormBtn.style.display = 'inline-block'; // Ensure add button is visible after loading
        if (itemForm && itemForm.style.display === 'block') itemForm.style.display = 'none'; // Hide form after loading list
    }

    async function saveItemHandler(event) {
        event.preventDefault();
        if (!itemForm) return;
        const token = localStorage.getItem('sessionToken');
        if (!token) { setItemFormMessage('Admin session error.', 'error'); return; }
        let effectsObj, itemDataObj;
        try {
            effectsObj = itemEffectsTextarea.value.trim() ? JSON.parse(itemEffectsTextarea.value) : {}; // Default to object
            itemDataObj = itemDataTextarea.value.trim() ? JSON.parse(itemDataTextarea.value) : {};   // Default to object
        } catch (e) { setItemFormMessage('Invalid JSON in Effects or Other Data.', 'error'); return; }

        const itemPayload = {
            item_id: itemIdInput.value.trim(), name: itemNameInput.value.trim(),
            description: itemDescriptionInput.value.trim(), type: itemTypeSelect.value,
            effects: effectsObj, value: parseInt(itemValueInput.value) || 0,
            image_url: itemImageUrlInput.value.trim() || null,
            stackable: itemStackableCheckbox.checked ? 1 : 0, data: itemDataObj
        };
        if (!itemPayload.item_id || !itemPayload.name || !itemPayload.type) { setItemFormMessage('ID, Name, Type required.', 'error'); return; }
        const mode = itemFormMode.value;
        const url = mode === 'edit' ? `/api/admin/items/${itemFormEditId.value}` : '/api/admin/items';
        const method = mode === 'edit' ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(itemPayload) });
            const result = await response.json();
            if (response.ok) {
                setItemFormMessage(result.message, 'success'); itemForm.style.display = 'none'; if(showAddItemFormBtn) showAddItemFormBtn.style.display = 'inline-block'; loadAndDisplayItems();
            } else { setItemFormMessage(result.message || 'Failed to save item.', 'error'); }
        } catch (error) { console.error('Error saving item:', error); setItemFormMessage('Network error.', 'error'); }
    }

    async function fetchFullItemDataForEdit(itemId) {
        const token = localStorage.getItem('sessionToken');
        if (!token) {
            alert('Admin session error. Please re-login.');
            localStorage.clear(); window.location.href = '../index.html'; // More robust redirect
            return null;
        }
        try {
            const response = await fetch(`/api/admin/items/${itemId}`, { // Use new dedicated endpoint
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.status === 401 || response.status === 403) {
                alert("Session expired or unauthorized. Please log in again as admin.");
                localStorage.clear(); window.location.href = '../index.html'; return null;
            }
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || `Failed to fetch item ${itemId}.`);
            }
            const itemToEdit = await response.json();
            if (!itemToEdit) {
                throw new Error ('Item not found for editing after fetch.');
            }
            return itemToEdit;
        } catch (error) {
            console.error("Error fetching full item data for edit:", error);
            alert(`Could not load full details for item ${itemId}: ${error.message}`);
            return null;
        }
    }

    async function deleteItemHandler(itemId) {
        if (!confirm(`Are you sure you want to delete item ID: ${itemId}? This action cannot be undone.`)) return;
        const token = localStorage.getItem('sessionToken');
        if (!token) { alert('Admin session error.'); return; }
        try {
            const response = await fetch(`/api/admin/items/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message); loadAndDisplayItems();
            } else { alert(result.message || 'Failed to delete item.'); }
        } catch (error) { console.error('Error deleting item:', error); alert('Network error deleting item.'); }
    }

    // --- NPC Management Logic ---
    function setNpcFormMessage(message, type) {
        if(!npcFormMessage) return;
        npcFormMessage.textContent = message;
        npcFormMessage.className = 'message-area modern-message';
        if(type) npcFormMessage.classList.add(type);
        setTimeout(() => { if(npcFormMessage) npcFormMessage.textContent = ''; npcFormMessage.className = 'message-area modern-message'; }, 4000);
    }

    function openNpcForm(mode = 'add', npc = null) {
        if (!npcForm) return;
        npcFormMode.value = mode;
        npcForm.reset(); 
        if (mode === 'edit' && npc) {
            if(npcFormTitle) npcFormTitle.innerHTML = '<i class="fas fa-user-edit"></i> Edit NPC';
            npcFormEditId.value = npc.npc_id;
            if(npcIdInput) { npcIdInput.value = npc.npc_id; npcIdInput.readOnly = true; }
            if(npcNameInput) npcNameInput.value = npc.name;
            if(npcDescriptionInput) npcDescriptionInput.value = npc.description || '';
            if(npcDialogueTextarea) npcDialogueTextarea.value = npc.dialogue || '';
            if(npcAvatarUrlInput) npcAvatarUrlInput.value = npc.avatar_url || '';
            if(npcLocationIdInput) npcLocationIdInput.value = npc.location_id || '';
        } else {
            if(npcFormTitle) npcFormTitle.innerHTML = '<i class="fas fa-user-plus"></i> Add New NPC';
            if(npcIdInput) npcIdInput.readOnly = false;
            if(npcFormEditId) npcFormEditId.value = '';
        }
        npcForm.style.display = 'block';
        if(showAddNpcFormBtn) showAddNpcFormBtn.style.display = 'none';
        setNpcFormMessage('');
    }

    async function loadAndDisplayNpcs() {
        if (!npcListContainer) return;
        npcListContainer.innerHTML = '<p>Loading NPCs...</p>';
        const token = localStorage.getItem('sessionToken');
        if (!token) { npcListContainer.innerHTML = '<p>Admin token not found.</p>'; return; }
        try {
            const response = await fetch('/api/admin/npcs', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch NPCs');
            const npcs = await response.json();
            if (npcs && npcs.length > 0) {
                const table = document.createElement('table');
                table.innerHTML = `<thead><tr><th>ID</th><th>Name</th><th>Description</th><th>Dialogue Snippet</th><th>Actions</th></tr></thead><tbody></tbody>`;
                const tbody = table.querySelector('tbody');
                npcs.forEach(npc => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = npc.npc_id;
                    row.insertCell().textContent = npc.name;
                    row.insertCell().textContent = npc.description ? npc.description.substring(0, 50) + (npc.description.length > 50 ? '...' : '') : '-none-';
                    row.insertCell().textContent = npc.dialogue ? npc.dialogue.substring(0, 50) + (npc.dialogue.length > 50 ? '...' : '') : '-none-';
                    const actionsCell = row.insertCell();
                    actionsCell.innerHTML = 
                        `<button class="action-button edit-npc-btn" data-npcid="${npc.npc_id}">Edit</button>
                         <button class="action-button delete-npc-btn danger-action" data-npcid="${npc.npc_id}">Delete</button>`;
                });
                npcListContainer.innerHTML = ''; npcListContainer.appendChild(table);
            } else { npcListContainer.innerHTML = '<p>No NPCs found. Add some!</p>'; }
        } catch (error) { console.error('Error loading NPCs:', error); npcListContainer.innerHTML = `<p>Error: ${error.message}</p>`; }
        if (showAddNpcFormBtn) showAddNpcFormBtn.style.display = 'inline-block';
        if (npcForm && npcForm.style.display === 'block') npcForm.style.display = 'none';
    }

    async function saveNpcHandler(event) {
        event.preventDefault();
        if (!npcForm) return;
        const token = localStorage.getItem('sessionToken');
        if (!token) { setNpcFormMessage('Admin session error.', 'error'); return; }

        const npcPayload = {
            npc_id: npcIdInput.value.trim(),
            name: npcNameInput.value.trim(),
            description: npcDescriptionInput.value.trim(),
            dialogue: npcDialogueTextarea.value.trim(),
            avatar_url: npcAvatarUrlInput.value.trim() || null,
            location_id: npcLocationIdInput.value.trim() || null,
        };

        if (!npcPayload.npc_id || !npcPayload.name) {
            setNpcFormMessage('NPC ID and Name are required.', 'error'); return;
        }

        const mode = npcFormMode.value;
        const url = mode === 'edit' ? `/api/admin/npcs/${npcFormEditId.value}` : '/api/admin/npcs';
        const method = mode === 'edit' ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(npcPayload)
            });
            const result = await response.json();
            if (response.ok) {
                setNpcFormMessage(result.message, 'success');
                npcForm.style.display = 'none';
                if(showAddNpcFormBtn) showAddNpcFormBtn.style.display = 'inline-block';
                loadAndDisplayNpcs();
            } else { setNpcFormMessage(result.message || 'Failed to save NPC.', 'error'); }
        } catch (error) { console.error('Error saving NPC:', error); setNpcFormMessage('Network error saving NPC.', 'error'); }
    }

    async function fetchFullNpcDataForEdit(npcId) {
        const token = localStorage.getItem('sessionToken');
        if (!token) { alert('Admin session error.'); return null; }
        try {
            const response = await fetch(`/api/admin/npcs/${npcId}`, { 
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch NPC details');
            return await response.json();
        } catch (error) { console.error("Error fetching NPC for edit:", error); alert("Could not load NPC details."); return null; }
    }

    async function deleteNpcHandler(npcId) {
        if (!confirm(`Are you sure you want to PERMANENTLY DELETE NPC ID: ${npcId}?`)) return;
        const token = localStorage.getItem('sessionToken');
        if (!token) { alert('Admin session error.'); return; }
        try {
            const response = await fetch(`/api/admin/npcs/${npcId}`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (response.ok) { alert(result.message); loadAndDisplayNpcs(); }
            else { alert(result.message || 'Failed to delete NPC.'); }
        } catch (error) { console.error('Error deleting NPC:', error); alert('Network error.'); }
    }

    // --- Quest Management Logic ---
    function setQuestFormMessage(message, type) {
        if(!questFormMessage) return;
        questFormMessage.textContent = message;
        questFormMessage.className = 'message-area modern-message';
        if(type) questFormMessage.classList.add(type);
        setTimeout(() => { if(questFormMessage) questFormMessage.textContent = ''; questFormMessage.className = 'message-area modern-message'; }, 4000);
    }

    async function openQuestForm(mode = 'add', quest = null) {
        if (!questForm) return;
        questFormMode.value = mode;
        questForm.reset();
        if (mode === 'edit' && quest) {
            if(questFormTitle) questFormTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Quest';
            questFormEditId.value = quest.quest_id;
            if(questIdInput) { questIdInput.value = quest.quest_id; questIdInput.readOnly = true; }
            if(questTitleInput) questTitleInput.value = quest.title;
            if(questDescriptionTextarea) questDescriptionTextarea.value = quest.description || '';
            if(questObjectivesTextarea) questObjectivesTextarea.value = quest.objectives_summary || '';
            if(questPrerequisitesTextarea) questPrerequisitesTextarea.value = quest.prerequisites ? JSON.stringify(quest.prerequisites, null, 2) : '{}';
            if(questRewardsTextarea) questRewardsTextarea.value = quest.rewards ? JSON.stringify(quest.rewards, null, 2) : '{}';
            if(questStartNpcInput) questStartNpcInput.value = quest.start_npc_id || '';
            if(questEndNpcInput) questEndNpcInput.value = quest.end_npc_id || '';
            if(questIsRepeatableCheckbox) questIsRepeatableCheckbox.checked = !!quest.is_repeatable;
        } else {
            if(questFormTitle) questFormTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Quest';
            if(questIdInput) questIdInput.readOnly = false;
            if(questFormEditId) questFormEditId.value = '';
            if(questPrerequisitesTextarea) questPrerequisitesTextarea.value = '{}';
            if(questRewardsTextarea) questRewardsTextarea.value = '{}';
        }
        questForm.style.display = 'block';
        if(showAddQuestFormBtn) showAddQuestFormBtn.style.display = 'none';
        setQuestFormMessage('');
    }

    async function loadAndDisplayQuests() {
        if (!questListContainer) return;
        questListContainer.innerHTML = '<p>Loading quests...</p>';
        const token = localStorage.getItem('sessionToken');
        if (!token) { questListContainer.innerHTML = '<p>Admin token not found.</p>'; return; }
        try {
            const response = await fetch('/api/admin/quests', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch quests');
            const quests = await response.json();
            if (quests && quests.length > 0) {
                const table = document.createElement('table');
                table.innerHTML = `<thead><tr><th>ID</th><th>Title</th><th>Objectives</th><th>Start NPC</th><th>End NPC</th><th>Repeatable</th><th>Actions</th></tr></thead><tbody></tbody>`;
                const tbody = table.querySelector('tbody');
                quests.forEach(q => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = q.quest_id;
                    row.insertCell().textContent = q.title;
                    row.insertCell().textContent = q.objectives_summary ? q.objectives_summary.substring(0, 50) + (q.objectives_summary.length > 50 ? '...':'') : '-none-';
                    row.insertCell().textContent = q.start_npc_id || '-none-';
                    row.insertCell().textContent = q.end_npc_id || '-none-';
                    row.insertCell().textContent = q.is_repeatable ? 'Yes' : 'No';
                    const actionsCell = row.insertCell();
                    actionsCell.innerHTML = 
                        `<button class="action-button edit-quest-btn" data-questid="${q.quest_id}">Edit</button>
                         <button class="action-button delete-quest-btn danger-action" data-questid="${q.quest_id}">Delete</button>`;
                });
                questListContainer.innerHTML = ''; questListContainer.appendChild(table);
            } else { questListContainer.innerHTML = '<p>No quests found. Add some!</p>'; }
        } catch (error) { console.error('Error loading quests:', error); questListContainer.innerHTML = `<p>Error: ${error.message}</p>`; }
        if (showAddQuestFormBtn) showAddQuestFormBtn.style.display = 'inline-block';
        if (questForm && questForm.style.display === 'block') questForm.style.display = 'none';
    }

    async function saveQuestHandler(event) {
        event.preventDefault();
        if (!questForm) return;
        const token = localStorage.getItem('sessionToken');
        if (!token) { setQuestFormMessage('Admin session error.', 'error'); return; }
        let prereqObj, rewardsObj;
        try {
            prereqObj = questPrerequisitesTextarea.value.trim() ? JSON.parse(questPrerequisitesTextarea.value) : null;
            rewardsObj = questRewardsTextarea.value.trim() ? JSON.parse(questRewardsTextarea.value) : {};
        } catch (e) { setQuestFormMessage('Invalid JSON in Prerequisites or Rewards.', 'error'); return; }

        const questPayload = {
            quest_id: questIdInput.value.trim(), title: questTitleInput.value.trim(),
            description: questDescriptionTextarea.value.trim(), objectives_summary: questObjectivesTextarea.value.trim(),
            prerequisites: prereqObj, rewards: rewardsObj,
            start_npc_id: questStartNpcInput.value.trim() || null,
            end_npc_id: questEndNpcInput.value.trim() || null,
            is_repeatable: questIsRepeatableCheckbox.checked ? 1 : 0
        };
        if (!questPayload.quest_id || !questPayload.title) { setQuestFormMessage('Quest ID and Title are required.', 'error'); return; }
        const mode = questFormMode.value;
        const url = mode === 'edit' ? `/api/admin/quests/${questFormEditId.value}` : '/api/admin/quests';
        const method = mode === 'edit' ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(questPayload) });
            const result = await response.json();
            if (response.ok) {
                setQuestFormMessage(result.message, 'success'); questForm.style.display = 'none'; 
                if(showAddQuestFormBtn) showAddQuestFormBtn.style.display = 'inline-block'; loadAndDisplayQuests();
            } else { setQuestFormMessage(result.message || 'Failed to save quest.', 'error'); }
        } catch (error) { console.error('Error saving quest:', error); setQuestFormMessage('Network error saving quest.', 'error'); }
    }

    async function fetchFullQuestDataForEdit(questId) {
        const token = localStorage.getItem('sessionToken');
        if (!token) { alert('Admin session error.'); return null; }
        try {
            const response = await fetch(`/api/admin/quests/${questId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch quest details');
            return await response.json();
        } catch (error) { console.error("Error fetching quest for edit:", error); alert("Could not load quest details."); return null; }
    }

    async function deleteQuestHandler(questId) {
        if (!confirm(`Are you sure you want to DELETE Quest ID: ${questId}?`)) return;
        const token = localStorage.getItem('sessionToken');
        if (!token) { alert('Admin session error.'); return; }
        try {
            const response = await fetch(`/api/admin/quests/${questId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            if (response.ok) { alert(result.message); loadAndDisplayQuests(); }
            else { alert(result.message || 'Failed to delete quest.'); }
        } catch (error) { console.error('Error deleting quest:', error); alert('Network error.'); }
    }

    function setupVisualEditor() {
        if (!pageSelector || !visualEditorCanvas) return;
        visualEditorCanvas.src = pageSelector.value;
        pageSelector.addEventListener('change', (event) => { visualEditorCanvas.src = event.target.value; console.log(`Visual Editor: Switched to ${event.target.value}`); });
        mockToolbarBtns.forEach(btn => { btn.addEventListener('click', () => { alert(`Mock Button '${btn.title}'`); console.log(`Mock Button '${btn.title}'`); }); });
        if(visualEditorUndoBtn) visualEditorUndoBtn.addEventListener('click', () => { alert('Mock Undo'); console.log('Mock Undo'); });
        if(visualEditorSaveBtn) visualEditorSaveBtn.addEventListener('click', () => { alert('Mock Save'); console.log('Mock Save'); });
    }

    function setEditUserMessage(message, type) { if(!editUserMessage) return; editUserMessage.textContent = message; editUserMessage.className = 'message-area modern-message'; if(type) editUserMessage.classList.add(type); setTimeout(() => { if(editUserMessage) editUserMessage.textContent = ''; editUserMessage.className='message-area modern-message';}, 3000);}

    async function openEditUserForm(username) {
        const token = localStorage.getItem('sessionToken'); if (!token) { alert('Admin session error.'); return; }
        try {
            // Fetch the specific user's current data for accuracy in the form
            // This requires a GET /api/admin/users/:username endpoint or similar. For now, we assume `getAllUsers` has enough.
            // Let's enhance this to fetch specific user data if an endpoint existed or find from cached `allUsers` if available.
            // For this iteration, we'll simulate by trying to find in a hypothetical cached list or use placeholder values.
            // A better approach is GET /api/admin/users/:username
            const response = await fetch(`/api/game/playerdata/${username}`, { headers: { 'Authorization': `Bearer ${token}` }});
            if(!response.ok) throw new Error('Failed to fetch user details for editing.');
            const userData = await response.json();

            if (!editUserForm || !userData) return;
            editUserUsernameTitle.textContent = userData.username;
            editUserOriginalUsernameInput.value = userData.username;
            editUserMoneyInput.value = userData.money;
            editUserLevelInput.value = userData.level;
            editUserStrengthInput.value = userData.strength;
            editUserAgilityInput.value = userData.agility;
            editUserRankInput.value = userData.rank;
            editUserAvatarInput.value = userData.avatar_url;
            editUserForm.style.display = 'block';
            setEditUserMessage('');
        } catch (error) {
            console.error("Error opening edit user form:", error);
            alert("Could not load user details for editing.");
        }
    }

    async function saveUserDetailsHandler(event) {
        event.preventDefault();
        const token = localStorage.getItem('sessionToken'); if (!token) { setEditUserMessage('Admin session error.', 'error'); return; }
        const originalUsername = editUserOriginalUsernameInput.value;
        const userDetailsPayload = {
            money: parseInt(editUserMoneyInput.value),
            level: parseInt(editUserLevelInput.value),
            strength: parseInt(editUserStrengthInput.value),
            agility: parseInt(editUserAgilityInput.value),
            rank: editUserRankInput.value.trim(),
            avatar_url: editUserAvatarInput.value.trim()
        };
        try {
            const response = await fetch(`/api/admin/users/${originalUsername}/updatedetails`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(userDetailsPayload)
            });
            const result = await response.json();
            if (response.ok) {
                setEditUserMessage(result.message, 'success'); editUserForm.style.display = 'none'; loadAndDisplayUsers();
            } else { setEditUserMessage(result.message || 'Failed to update details.', 'error'); }
        } catch (e) { console.error('Error saving user details:', e); setEditUserMessage('Network error.', 'error');}
    }
    
    async function userActionHandler(username, action) {
        const token = localStorage.getItem('sessionToken'); if (!token) { alert('Admin session error.'); return; }
        let url = ''; let method = 'POST'; let body = null; let confirmMsg = '';
        switch(action) {
            case 'ban': url = `/api/admin/users/${username}/ban`; confirmMsg = `Ban ${username}?`; break;
            case 'unban': url = `/api/admin/users/${username}/unban`; confirmMsg = `Unban ${username}?`; break;
            case 'mute': 
                const duration = prompt("Mute ${username} for how many hours? (Leave blank for indefinite)", "24");
                if (duration === null) return; // User cancelled prompt
                url = `/api/admin/users/${username}/mute`; 
                body = duration.trim() !== '' ? { durationHours: parseInt(duration) } : {};
                confirmMsg = `Mute ${username}` + (duration.trim() !=='' ? ` for ${duration} hours?` : ' indefinitely?'); 
                break;
            case 'unmute': url = `/api/admin/users/${username}/unmute`; confirmMsg = `Unmute ${username}?`; break;
            case 'delete': url = `/api/admin/users/${username}`; method = 'DELETE'; confirmMsg = `DELETE USER ${username}?! This is permanent!`; break;
            default: console.error('Unknown user action:', action); return;
        }
        if (!confirm(confirmMsg)) return;
        try {
            const fetchOptions = { method: method, headers: { 'Authorization': `Bearer ${token}` } };
            if (body) { fetchOptions.headers['Content-Type'] = 'application/json'; fetchOptions.body = JSON.stringify(body); }
            const response = await fetch(url, fetchOptions);
            const result = await response.json();
            if (response.ok) { alert(result.message); loadAndDisplayUsers(); }
            else { alert(result.message || `Failed to ${action} user.`); }
        } catch(e){ console.error(`Error ${action} user:`, e); alert('Network error.');}
    }

    // --- Game Settings Logic ---
    function setGameSettingsFormMessage(message, type) {
        if(!gameSettingsFormMessage) return;
        gameSettingsFormMessage.textContent = message;
        gameSettingsFormMessage.className = 'message-area modern-message'; 
        if(type) gameSettingsFormMessage.classList.add(type);
        setTimeout(() => { if(gameSettingsFormMessage) gameSettingsFormMessage.textContent = ''; gameSettingsFormMessage.className = 'message-area modern-message'; }, 4000);
    }

    async function loadAndDisplayGameSettings() {
        if (!gameSettingsFieldsContainer) return;
        gameSettingsFieldsContainer.innerHTML = '<p>Loading game settings...</p>';
        const token = localStorage.getItem('sessionToken');
        if (!token) { gameSettingsFieldsContainer.innerHTML = '<p>Admin token not found.</p>'; return; }

        try {
            const response = await fetch('/api/admin/gameconfigs', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch game settings');
            const configs = await response.json();
            
            gameSettingsFieldsContainer.innerHTML = ''; // Clear loading message
            if (configs && configs.length > 0) {
                configs.forEach(config => {
                    const groupDiv = document.createElement('div');
                    groupDiv.classList.add('form-group'); // Use this class if you have specific form-group styling

                    const label = document.createElement('label');
                    label.htmlFor = `config-${config.config_key}`;
                    label.textContent = `${config.description || config.config_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:`;
                    
                    const input = document.createElement('input');
                    input.type = (typeof config.config_value === 'boolean') ? 'checkbox' : (typeof config.config_value === 'number' ? 'number' : 'text');
                    input.id = `config-${config.config_key}`;
                    input.name = config.config_key;
                    if (input.type === 'checkbox') {
                        input.checked = !!config.config_value;
                    } else {
                        input.value = config.config_value;
                    }
                    if (input.type === 'number') {
                        if (config.config_key.includes('CHANCE') || config.config_key.includes('RATE')) {
                            input.step = "0.01"; // For rates/chances
                        }
                    }

                    groupDiv.appendChild(label);
                    if (input.type === 'checkbox') { // Special layout for checkbox with label after
                        const checkboxWrapper = document.createElement('div');
                        checkboxWrapper.classList.add('checkbox-group-admin'); // Potentially new class for styling
                        checkboxWrapper.appendChild(input);
                        const labelForCheckbox = document.createElement('label');
                        labelForCheckbox.htmlFor = input.id;
                        labelForCheckbox.textContent = `Enable (Currently: ${config.config_value ? 'Yes' : 'No'})`;
                        input.addEventListener('change', (e) => { labelForCheckbox.textContent = `Enable (Currently: ${e.target.checked ? 'Yes' : 'No'})`; });
                        checkboxWrapper.appendChild(labelForCheckbox);
                        groupDiv.appendChild(checkboxWrapper);
                    } else {
                        groupDiv.appendChild(input);
                    }
                    gameSettingsFieldsContainer.appendChild(groupDiv);
                });
            } else {
                gameSettingsFieldsContainer.innerHTML = '<p>No game configurations found in the database.</p>';
            }
        } catch (error) {
            console.error('Error loading game settings:', error);
            gameSettingsFieldsContainer.innerHTML = `<p>Error: ${error.message}</p>`;
        }
    }

    async function saveGameSettingsHandler(event) {
        event.preventDefault();
        if (!gameSettingsForm || !gameSettingsFieldsContainer) return;
        const token = localStorage.getItem('sessionToken');
        if (!token) { setGameSettingsFormMessage('Admin session error.', 'error'); return; }

        const updatedConfigs = {};
        const inputs = gameSettingsFieldsContainer.querySelectorAll('input, select'); // Include select if any are used
        inputs.forEach(input => {
            const key = input.name;
            if (key) { // Ensure element has a name (is a config field)
                updatedConfigs[key] = input.type === 'checkbox' ? input.checked : input.value;
            }
        });

        if (Object.keys(updatedConfigs).length === 0) {
            setGameSettingsFormMessage('No settings to update.', 'event'); return;
        }

        try {
            const response = await fetch('/api/admin/gameconfigs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updatedConfigs)
            });
            const result = await response.json();
            if (response.ok) {
                setGameSettingsFormMessage(result.message || 'Game settings updated successfully!', 'success');
                // Optionally reload settings to reflect any server-side processing/validation if needed
                // loadAndDisplayGameSettings(); 
            } else {
                setGameSettingsFormMessage(result.message || 'Failed to update game settings.', 'error');
            }
        } catch (error) {
            console.error('Error saving game settings:', error);
            setGameSettingsFormMessage('Network error saving game settings.', 'error');
        }
    }

    // --- Location Management Logic ---
    function setLocationFormMessage(message, type) {
        if(!locationFormMessage) return;
        locationFormMessage.textContent = message;
        locationFormMessage.className = 'message-area modern-message';
        if(type) locationFormMessage.classList.add(type);
        setTimeout(() => { if(locationFormMessage) locationFormMessage.textContent = ''; locationFormMessage.className = 'message-area modern-message'; }, 4000);
    }

    async function openLocationForm(mode = 'add', loc = null) {
        if (!locationForm) return;
        locationFormMode.value = mode;
        locationForm.reset();
        if (mode === 'edit' && loc) {
            if(locationFormTitle) locationFormTitle.innerHTML = '<i class="fas fa-map-signs"></i> Edit Location';
            locationFormEditId.value = loc.location_id;
            if(locationIdInput) { locationIdInput.value = loc.location_id; locationIdInput.readOnly = true; }
            if(locationNameInput) locationNameInput.value = loc.name;
            if(locationDescriptionTextarea) locationDescriptionTextarea.value = loc.description || '';
            if(locationConnectionsTextarea) locationConnectionsTextarea.value = loc.connections ? JSON.stringify(loc.connections, null, 2) : '{}';
            if(locationImageUrlInput) locationImageUrlInput.value = loc.image_url || '';
            if(locationDataTextarea) locationDataTextarea.value = loc.data ? JSON.stringify(loc.data, null, 2) : '{}';
        } else {
            if(locationFormTitle) locationFormTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Location';
            if(locationIdInput) locationIdInput.readOnly = false;
            if(locationFormEditId) locationFormEditId.value = '';
            if(locationConnectionsTextarea) locationConnectionsTextarea.value = '{}';
            if(locationDataTextarea) locationDataTextarea.value = '{}';
        }
        locationForm.style.display = 'block';
        if(showAddLocationFormBtn) showAddLocationFormBtn.style.display = 'none';
        setLocationFormMessage('');
    }

    async function loadAndDisplayLocations() {
        if (!locationListContainer) return;
        locationListContainer.innerHTML = '<p>Loading locations...</p>';
        const token = localStorage.getItem('sessionToken');
        if (!token) { locationListContainer.innerHTML = '<p>Admin token not found.</p>'; return; }
        try {
            const response = await fetch('/api/admin/locations', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch locations');
            const locations = await response.json();
            if (locations && locations.length > 0) {
                const table = document.createElement('table');
                table.innerHTML = `<thead><tr><th>ID</th><th>Name</th><th>Description</th><th>Connections (JSON)</th><th>Actions</th></tr></thead><tbody></tbody>`;
                const tbody = table.querySelector('tbody');
                locations.forEach(loc => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = loc.location_id;
                    row.insertCell().textContent = loc.name;
                    row.insertCell().textContent = loc.description ? loc.description.substring(0, 50) + (loc.description.length > 50 ? '...':'') : '-none-';
                    row.insertCell().textContent = loc.connections ? JSON.stringify(loc.connections).substring(0,50) + '...': '-none-';
                    const actionsCell = row.insertCell();
                    actionsCell.innerHTML = 
                        `<button class="action-button edit-location-btn" data-locationid="${loc.location_id}">Edit</button>
                         <button class="action-button delete-location-btn danger-action" data-locationid="${loc.location_id}">Delete</button>`;
                });
                locationListContainer.innerHTML = ''; locationListContainer.appendChild(table);
            } else { locationListContainer.innerHTML = '<p>No locations found. Add some!</p>'; }
        } catch (error) { console.error('Error loading locations:', error); locationListContainer.innerHTML = `<p>Error: ${error.message}</p>`; }
        if (showAddLocationFormBtn) showAddLocationFormBtn.style.display = 'inline-block';
        if (locationForm && locationForm.style.display === 'block') locationForm.style.display = 'none';
    }

    async function saveLocationHandler(event) {
        event.preventDefault();
        if (!locationForm) return;
        const token = localStorage.getItem('sessionToken');
        if (!token) { setLocationFormMessage('Admin session error.', 'error'); return; }
        let connectionsObj, dataObj;
        try {
            connectionsObj = locationConnectionsTextarea.value.trim() ? JSON.parse(locationConnectionsTextarea.value) : null;
            dataObj = locationDataTextarea.value.trim() ? JSON.parse(locationDataTextarea.value) : null;
        } catch (e) { setLocationFormMessage('Invalid JSON in Connections or Other Data.', 'error'); return; }

        const locPayload = {
            location_id: locationIdInput.value.trim(), name: locationNameInput.value.trim(),
            description: locationDescriptionTextarea.value.trim(),
            connections: connectionsObj, image_url: locationImageUrlInput.value.trim() || null, data: dataObj
        };
        if (!locPayload.location_id || !locPayload.name) { setLocationFormMessage('Location ID and Name are required.', 'error'); return; }
        const mode = locationFormMode.value;
        const url = mode === 'edit' ? `/api/admin/locations/${locationFormEditId.value}` : '/api/admin/locations';
        const method = mode === 'edit' ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(locPayload) });
            const result = await response.json();
            if (response.ok) {
                setLocationFormMessage(result.message, 'success'); locationForm.style.display = 'none'; 
                if(showAddLocationFormBtn) showAddLocationFormBtn.style.display = 'inline-block'; loadAndDisplayLocations();
            } else { setLocationFormMessage(result.message || 'Failed to save location.', 'error'); }
        } catch (error) { console.error('Error saving location:', error); setLocationFormMessage('Network error saving location.', 'error'); }
    }

    async function fetchFullLocationDataForEdit(locationId) {
        const token = localStorage.getItem('sessionToken');
        if (!token) { alert('Admin session error.'); return null; }
        try {
            const response = await fetch(`/api/admin/locations/${locationId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch location details');
            return await response.json();
        } catch (error) { console.error("Error fetching location for edit:", error); alert("Could not load location details."); return null; }
    }

    async function deleteLocationHandler(locationId) {
        if (!confirm(`DELETE Location ID: ${locationId}? This might affect NPCs or Quests referencing it.`)) return;
        const token = localStorage.getItem('sessionToken');
        if (!token) { alert('Admin session error.'); return; }
        try {
            const response = await fetch(`/api/admin/locations/${locationId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            if (response.ok) { alert(result.message); loadAndDisplayLocations(); }
            else { alert(result.message || 'Failed to delete location.'); }
        } catch (error) { console.error('Error deleting location:', error); alert('Network error.'); }
    }

    // --- Admin Action Log Logic ---
    async function loadAndDisplayAdminLogs(page = 1) {
        if (!adminLogListContainer) return;
        adminLogListContainer.innerHTML = '<p>Loading admin logs...</p>';
        currentAdminLogPage = page;
        const offset = (page - 1) * adminLogsPerPage;
        const token = localStorage.getItem('sessionToken');
        if (!token) { adminLogListContainer.innerHTML = '<p>Admin token not found.</p>'; return; }

        try {
            const response = await fetch(`/api/admin/logs?limit=${adminLogsPerPage}&offset=${offset}`, { 
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch admin logs');
            const data = await response.json();
            const logs = data.logs;
            totalAdminLogs = data.total;

            if (logs && logs.length > 0) {
                const table = document.createElement('table');
                table.innerHTML = `<thead><tr><th>ID</th><th>Timestamp</th><th>Admin</th><th>Action Type</th><th>Target ID</th><th class="details-col">Details (JSON)</th></tr></thead><tbody></tbody>`;
                const tbody = table.querySelector('tbody');
                logs.forEach(log => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = log.log_id;
                    row.insertCell().textContent = new Date(log.timestamp).toLocaleString();
                    row.insertCell().textContent = log.admin_username;
                    row.insertCell().textContent = log.action_type;
                    row.insertCell().textContent = log.target_id || '-none-';
                    const detailsCell = row.insertCell();
                    detailsCell.classList.add('details-col');
                    if (log.details) {
                        const pre = document.createElement('pre');
                        pre.textContent = JSON.stringify(log.details, null, 2);
                        detailsCell.appendChild(pre);
                    } else {
                        detailsCell.textContent = '-none-';
                    }
                });
                adminLogListContainer.innerHTML = ''; 
                adminLogListContainer.appendChild(table);
            } else {
                adminLogListContainer.innerHTML = '<p>No admin actions logged yet.</p>';
            }
            updateAdminLogPagination();
        } catch (error) {
            console.error('Error loading admin logs:', error);
            adminLogListContainer.innerHTML = `<p>Error loading admin logs: ${error.message}</p>`;
        }
    }

    function updateAdminLogPagination() {
        if (!adminLogPageInfo || !adminLogPrevPageBtn || !adminLogNextPageBtn) return;
        const totalPages = Math.ceil(totalAdminLogs / adminLogsPerPage);
        adminLogPageInfo.textContent = `Page ${currentAdminLogPage} of ${totalPages > 0 ? totalPages : 1}`;
        adminLogPrevPageBtn.disabled = currentAdminLogPage <= 1;
        adminLogNextPageBtn.disabled = currentAdminLogPage >= totalPages;
    }

    // --- Bot User Management --- 
    function setBotFormMessage(message, type) {
        if (!botFormMessage) return;
        botFormMessage.textContent = message;
        botFormMessage.className = 'message-area modern-message';
        if (type) botFormMessage.classList.add(type);
        setTimeout(() => { if (botFormMessage) botFormMessage.textContent = ''; botFormMessage.className = 'message-area modern-message'; }, 4000);
    }

    function openBotForm() { // Only for adding new bots
        if (!botForm) return;
        botForm.reset();
        botForm.style.display = 'block';
        if (showAddBotFormBtn) showAddBotFormBtn.style.display = 'none';
        setBotFormMessage('');
    }

    async function loadAndDisplayBots() {
        if (!botListContainer) return;
        botListContainer.innerHTML = '<p>Loading bot users...</p>';
        const token = localStorage.getItem('sessionToken');
        if (!token) { botListContainer.innerHTML = '<p>Admin token not found.</p>'; return; }

        try {
            // Reuse /api/admin/users and filter client-side for is_bot === 1
            const response = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch users for bot list');
            let allUsers = await response.json();
            const bots = allUsers.filter(user => user.is_bot === 1);

            if (bots && bots.length > 0) {
                const table = document.createElement('table');
                table.innerHTML = `<thead><tr><th>ID</th><th>Bot Username</th><th>Level</th><th>Money</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody>`;
                const tbody = table.querySelector('tbody');
                bots.forEach(bot => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = bot.id;
                    row.insertCell().textContent = bot.username;
                    row.insertCell().textContent = bot.level;
                    row.insertCell().textContent = bot.money;
                    const statusCell = row.insertCell();
                    statusCell.textContent = bot.is_banned ? 'Banned' : (bot.is_muted ? `Muted (until ${bot.mute_until || 'N/A'})` : 'Active');
                     if(bot.is_banned) statusCell.classList.add('status-banned');
                     if(bot.is_muted && !bot.is_banned) statusCell.classList.add('status-muted');

                    const actionsCell = row.insertCell();
                    // Bots can be deleted. Other actions like ban/mute apply via the main user management.
                    actionsCell.innerHTML = `<button class="action-button delete-user-btn danger-action" data-username="${bot.username}">Delete Bot</button>`;
                });
                botListContainer.innerHTML = ''; 
                botListContainer.appendChild(table);
            } else {
                botListContainer.innerHTML = '<p>No bot users found. Create some!</p>';
            }
        } catch (error) { console.error('Error loading bots:', error); botListContainer.innerHTML = `<p>Error: ${error.message}</p>`; }
        if (showAddBotFormBtn) showAddBotFormBtn.style.display = 'inline-block';
        if (botForm && botForm.style.display === 'block') botForm.style.display = 'none';
    }

    async function saveBotHandler(event) {
        event.preventDefault();
        if (!botForm) return;
        const token = localStorage.getItem('sessionToken');
        if (!token) { setBotFormMessage('Admin session error.', 'error'); return; }

        const botPayload = {
            username: botUsernameInput.value.trim(),
            password: botPasswordInput.value, // Server will hash
            role: 'player', // Bots are players with a flag
            is_bot: 1, // Key flag
            // Optional initial stats, server can apply defaults if these are not sent or are invalid
            level: parseInt(botInitialLevelInput.value) || 1,
            money: parseInt(botInitialMoneyInput.value) || 50
        };

        if (!botPayload.username || !botPayload.password) {
            setBotFormMessage('Bot Username and Password are required.', 'error'); return; }
        if (botPayload.username.length < 3 || botPayload.password.length < 6) {
            setBotFormMessage('Username >= 3, Password >= 6 characters.', 'error'); return; }

        try {
            // Use the dedicated admin user creation endpoint
            const response = await fetch('/api/admin/users', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
                body: JSON.stringify(botPayload) 
            });
            const result = await response.json();
            if (response.ok || response.status === 201) {
                setBotFormMessage(result.message || 'Bot user created successfully!', 'success');
                botForm.reset();
                botForm.style.display = 'none';
                if(showAddBotFormBtn) showAddBotFormBtn.style.display = 'inline-block';
                loadAndDisplayBots(); // Refresh the bot list
                loadDashboardStats(); // Refresh dashboard counts
            } else {
                setBotFormMessage(result.message || 'Failed to create bot user.', 'error');
            }
        } catch (error) { console.error('Error creating bot:', error); setBotFormMessage('Network error creating bot.', 'error'); }
    }

    // --- Dungeon Management Logic ---
    function setDungeonFormMessage(message, type) { if(!dungeonFormMessage)return; dungeonFormMessage.textContent=message; dungeonFormMessage.className='message-area modern-message'; if(type)dungeonFormMessage.classList.add(type); setTimeout(()=>{if(dungeonFormMessage)dungeonFormMessage.textContent='';dungeonFormMessage.className='message-area modern-message';},4000);}
    function setLootFormMessage(message, type) { if(!lootFormMessage)return; lootFormMessage.textContent=message; lootFormMessage.className='message-area modern-message'; if(type)lootFormMessage.classList.add(type); setTimeout(()=>{if(lootFormMessage)lootFormMessage.textContent=''; lootFormMessage.className='message-area modern-message';},3000);}

    async function populateLootItemIdSelect() {
        if(!lootItemIdSelect) return;
        const token = localStorage.getItem('sessionToken');
        try {
            const response = await fetch('/api/admin/items', { headers: { 'Authorization': `Bearer ${token}` } });
            if(!response.ok) throw new Error('Failed to fetch items for loot table select');
            const items = await response.json();
            lootItemIdSelect.innerHTML = '<option value="">-- Select Item --</option>';
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.item_id;
                option.textContent = `${item.name} (${item.item_id})`;
                lootItemIdSelect.appendChild(option);
            });
        } catch (error) { console.error(error); lootItemIdSelect.innerHTML = '<option value="">Error loading items</option>'; }
    }

    async function openDungeonForm(mode = 'add', dungeon = null) {
        if (!dungeonForm) return;
        dungeonFormMode.value = mode;
        dungeonForm.reset();
        if (mode === 'edit' && dungeon) {
            if(dungeonFormTitle) dungeonFormTitle.innerHTML = '<i class="fas fa-dungeon"></i> Edit Dungeon';
            dungeonFormEditId.value = dungeon.dungeon_id;
            if(dungeonIdInput) { dungeonIdInput.value = dungeon.dungeon_id; dungeonIdInput.readOnly = true; }
            if(dungeonNameInput) dungeonNameInput.value = dungeon.name;
            if(dungeonDescriptionTextarea) dungeonDescriptionTextarea.value = dungeon.description || '';
            if(dungeonImageUrlInput) dungeonImageUrlInput.value = dungeon.image_url || '';
            if(dungeonRecLevelInput) dungeonRecLevelInput.value = dungeon.recommended_level || 1;
            if(dungeonRecStatsTextarea) dungeonRecStatsTextarea.value = dungeon.recommended_stats ? JSON.stringify(dungeon.recommended_stats, null, 2) : '{}';
            if(dungeonEncountersTextarea) dungeonEncountersTextarea.value = dungeon.encounter_sequence ? JSON.stringify(dungeon.encounter_sequence, null, 2) : '[]';
            if(dungeonLootManagerDiv) dungeonLootManagerDiv.style.display = 'block';
            if(lootManagerDungeonName) lootManagerDungeonName.textContent = dungeon.name;
            if(lootDungeonIdRef) lootDungeonIdRef.value = dungeon.dungeon_id;
            await populateLootItemIdSelect();
            loadAndDisplayDungeonLoot(dungeon.dungeon_id);
        } else {
            if(dungeonFormTitle) dungeonFormTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Dungeon';
            if(dungeonIdInput) dungeonIdInput.readOnly = false;
            if(dungeonFormEditId) dungeonFormEditId.value = '';
            if(dungeonRecStatsTextarea) dungeonRecStatsTextarea.value = '{}';
            if(dungeonEncountersTextarea) dungeonEncountersTextarea.value = '[]';
            if(dungeonLootManagerDiv) dungeonLootManagerDiv.style.display = 'none';
        }
        dungeonForm.style.display = 'block';
        if(showAddDungeonFormBtn) showAddDungeonFormBtn.style.display = 'none';
        setDungeonFormMessage('');
    }

    async function loadAndDisplayDungeons() {
        if (!dungeonListContainer) return;
        dungeonListContainer.innerHTML = '<p>Loading dungeons...</p>';
        const token = localStorage.getItem('sessionToken');
        if (!token) { dungeonListContainer.innerHTML = '<p>Admin token not found.</p>'; return; }
        try {
            const response = await fetch('/api/admin/dungeons', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch dungeons');
            const dungeons = await response.json();
            if (dungeons && dungeons.length > 0) {
                const table = document.createElement('table');
                table.innerHTML = `<thead><tr><th>ID</th><th>Name</th><th>Rec. Level</th><th>Description</th><th>Actions</th></tr></thead><tbody></tbody>`;
                const tbody = table.querySelector('tbody');
                dungeons.forEach(d => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = d.dungeon_id;
                    row.insertCell().textContent = d.name;
                    row.insertCell().textContent = d.recommended_level;
                    row.insertCell().textContent = d.description ? d.description.substring(0,70) + '...':'-';
                    const actionsCell = row.insertCell();
                    actionsCell.innerHTML = `<button class="action-button edit-dungeon-btn" data-dungeonid="${d.dungeon_id}">Edit & Loot</button> <button class="action-button delete-dungeon-btn danger-action" data-dungeonid="${d.dungeon_id}">Delete</button>`;
                });
                dungeonListContainer.innerHTML = ''; dungeonListContainer.appendChild(table);
            } else { dungeonListContainer.innerHTML = '<p>No dungeons found. Create some!</p>'; }
        } catch (e) { console.error('Error loading dungeons:', e); dungeonListContainer.innerHTML = `<p>Error: ${e.message}</p>`; }
        if(showAddDungeonFormBtn) showAddDungeonFormBtn.style.display = 'inline-block';
        if(dungeonForm && dungeonForm.style.display === 'block') dungeonForm.style.display = 'none';
        if(dungeonLootManagerDiv) dungeonLootManagerDiv.style.display = 'none';
    }

    async function saveDungeonHandler(event) {
        event.preventDefault(); if (!dungeonForm) return;
        const token = localStorage.getItem('sessionToken'); if (!token) { setDungeonFormMessage('Admin session error.', 'error'); return; }
        let recStatsObj, encountersArray;
        try {
            recStatsObj = dungeonRecStatsTextarea.value.trim() ? JSON.parse(dungeonRecStatsTextarea.value) : null;
            encountersArray = dungeonEncountersTextarea.value.trim() ? JSON.parse(dungeonEncountersTextarea.value) : [];
            if(!Array.isArray(encountersArray)) throw new Error('Encounter sequence must be an array.');
        } catch (e) { setDungeonFormMessage('Invalid JSON in Recommended Stats or Encounter Sequence.', 'error'); return; }
        const payload = {
            dungeon_id: dungeonIdInput.value.trim(), name: dungeonNameInput.value.trim(),
            description: dungeonDescriptionTextarea.value.trim(), image_url: dungeonImageUrlInput.value.trim() || null,
            recommended_level: parseInt(dungeonRecLevelInput.value) || 1,
            recommended_stats: recStatsObj, encounter_sequence: encountersArray
        };
        if (!payload.dungeon_id || !payload.name) { setDungeonFormMessage('Dungeon ID and Name required.', 'error'); return; }
        const mode=dungeonFormMode.value, url=mode==='edit'?`/api/admin/dungeons/${dungeonFormEditId.value}`:'/api/admin/dungeons', method=mode==='edit'?'PUT':'POST';
        try {
            const response = await fetch(url, {method:method, headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(payload)});
            const result = await response.json();
            if(response.ok){setDungeonFormMessage(result.message,'success');dungeonForm.style.display='none';if(showAddDungeonFormBtn)showAddDungeonFormBtn.style.display='inline-block';loadAndDisplayDungeons();}
            else{setDungeonFormMessage(result.message|| 'Failed to save dungeon.','error');}
        }catch(e){console.error('Err saving dungeon:',e);setDungeonFormMessage('Network error.','error');}
    }

    async function fetchFullDungeonDataForEdit(dungeonId) {
        const token = localStorage.getItem('sessionToken'); if (!token) { alert('Admin session error.'); return null; }
        try {
            const response = await fetch(`/api/admin/dungeons/${dungeonId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch dungeon details');
            return await response.json();
        } catch (e) { console.error("Error fetching dungeon for edit:", e); alert("Could not load dungeon details."); return null; }
    }
    async function deleteDungeonHandler(dungeonId) {
        if (!confirm(`DELETE Dungeon ID: ${dungeonId}? This will also delete its loot table!`)) return;
        const token = localStorage.getItem('sessionToken'); if (!token) { alert('Admin session error.'); return; }
        try {
            const response = await fetch(`/api/admin/dungeons/${dungeonId}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}});
            const result = await response.json();
            if(response.ok){alert(result.message);loadAndDisplayDungeons();if(dungeonLootManagerDiv)dungeonLootManagerDiv.style.display='none';}
            else{alert(result.message || 'Failed to delete dungeon.');}
        }catch(e){console.error('Err deleting dungeon:',e);alert('Network error.');}
    }

    // --- Dungeon Loot Table Logic ---
    async function loadAndDisplayDungeonLoot(dungeonId) {
        if(!dungeonLootTableContainer || !dungeonId) return;
        dungeonLootTableContainer.innerHTML = '<p>Loading loot...</p>';
        const token = localStorage.getItem('sessionToken');
        try {
            const response = await fetch(`/api/admin/dungeons/${dungeonId}/loot`, {headers:{'Authorization':`Bearer ${token}`}});
            if(!response.ok) throw new Error((await response.json()).message || 'Failed to load loot table.');
            const lootItems = await response.json();
            if(lootItems && lootItems.length > 0) {
                const table = document.createElement('table');
                table.innerHTML = `<thead><tr><th>Item ID (Name)</th><th>Rarity</th><th>Drop Chance</th><th>Qty (Min-Max)</th><th>Actions</th></tr></thead><tbody></tbody>`;
                const tbody = table.querySelector('tbody');
                lootItems.forEach(l => {
                    const r = tbody.insertRow();
                    r.insertCell().textContent = `${l.item_id} (${l.item_name || 'N/A'})`;
                    r.insertCell().textContent = l.rarity;
                    r.insertCell().textContent = (l.drop_chance * 100).toFixed(2) + '%';
                    r.insertCell().textContent = `${l.min_quantity}-${l.max_quantity}`;
                    r.insertCell().innerHTML = `<button class="action-button delete-loot-item-btn" data-lootid="${l.loot_table_id}" data-dungeonid="${dungeonId}">Remove</button>`;
                });
                dungeonLootTableContainer.innerHTML = ''; dungeonLootTableContainer.appendChild(table);
            } else { dungeonLootTableContainer.innerHTML = '<p>No loot defined for this dungeon yet.</p>'; }
        } catch(e) { console.error('Error loading loot:',e); dungeonLootTableContainer.innerHTML = `<p>Error: ${e.message}</p>`; }
    }

    async function addLootItemHandler(event) {
        event.preventDefault();
        const token = localStorage.getItem('sessionToken'); if(!token){setLootFormMessage('Session Error.','error');return;}
        const dungeonId = lootDungeonIdRef.value;
        const payload = {
            item_id: lootItemIdSelect.value,
            rarity: lootRaritySelect.value,
            drop_chance: parseFloat(lootDropChanceInput.value),
            min_quantity: parseInt(lootMinQtyInput.value),
            max_quantity: parseInt(lootMaxQtyInput.value)
        };
        if(!dungeonId || !payload.item_id || !payload.rarity || payload.drop_chance === undefined) { setLootFormMessage('Dungeon, Item, Rarity, Drop Chance required.','error');return;}
        if(payload.min_quantity > payload.max_quantity) {setLootFormMessage('Min Qty cannot exceed Max Qty.','error');return;}
        try {
            const response = await fetch(`/api/admin/dungeons/${dungeonId}/loot`, {method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(payload)});
            const result = await response.json();
            if(response.ok || response.status === 201) { setLootFormMessage(result.message,'success'); addLootItemForm.reset(); loadAndDisplayDungeonLoot(dungeonId);}
            else {setLootFormMessage(result.message||'Failed to add loot.','error');}
        } catch(e){console.error('Error add loot:',e);setLootFormMessage('Network Error.','error');}
    }

    async function deleteLootItemHandler(dungeonId, lootTableId) {
        if(!confirm(`Remove this loot entry (ID: ${lootTableId}) from dungeon ${dungeonId}?`)) return;
        const token = localStorage.getItem('sessionToken'); if(!token){alert('Session Error');return;}
        try {
            const response = await fetch(`/api/admin/dungeons/${dungeonId}/loot/${lootTableId}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}});
            const result = await response.json();
            if(response.ok){alert(result.message);loadAndDisplayDungeonLoot(dungeonId);}
            else{alert(result.message||'Failed to delete loot entry');}
        }catch(e){console.error('Error delete loot:',e);alert('Network Error');}
    }

    // --- Enemy Management Logic ---
    function setEnemyFormMessage(message, type) {
        if(!enemyFormMessage) return;
        enemyFormMessage.textContent = message;
        enemyFormMessage.className = 'message-area modern-message'; 
        if(type) enemyFormMessage.classList.add(type);
        setTimeout(() => { if(enemyFormMessage) enemyFormMessage.textContent = ''; enemyFormMessage.className = 'message-area modern-message'; }, 4000);
    }

    async function openEnemyForm(mode = 'add', enemy = null) {
        if (!enemyForm) return;
        enemyFormMode.value = mode;
        enemyForm.reset();
        if (mode === 'edit' && enemy) {
            if(enemyFormTitle) enemyFormTitle.innerHTML = '<i class="fas fa-skull-crossbones"></i> Edit Enemy';
            enemyFormEditId.value = enemy.enemy_id;
            if(enemyIdInput) { enemyIdInput.value = enemy.enemy_id; enemyIdInput.readOnly = true; }
            if(enemyNameInput) enemyNameInput.value = enemy.name;
            if(enemyDescriptionTextarea) enemyDescriptionTextarea.value = enemy.description || '';
            if(enemyAvatarUrlInput) enemyAvatarUrlInput.value = enemy.avatar_url || '';
            if(enemyHealthInput) enemyHealthInput.value = enemy.health;
            if(enemyAttackInput) enemyAttackInput.value = enemy.attack;
            if(enemyDefenseInput) enemyDefenseInput.value = enemy.defense;
            if(enemyXpRewardInput) enemyXpRewardInput.value = enemy.xp_reward;
            if(enemyMoneyMinInput) enemyMoneyMinInput.value = enemy.money_drop_min || 0;
            if(enemyMoneyMaxInput) enemyMoneyMaxInput.value = enemy.money_drop_max || 0;
            if(enemyDataTextarea) enemyDataTextarea.value = enemy.data ? JSON.stringify(enemy.data, null, 2) : '{}';
        } else {
            if(enemyFormTitle) enemyFormTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Enemy';
            if(enemyIdInput) enemyIdInput.readOnly = false;
            if(enemyFormEditId) enemyFormEditId.value = '';
            if(enemyDataTextarea) enemyDataTextarea.value = '{}';
        }
        enemyForm.style.display = 'block';
        if(showAddEnemyFormBtn) showAddEnemyFormBtn.style.display = 'none';
        setEnemyFormMessage('');
    }

    async function loadAndDisplayEnemies() {
        if (!enemyListContainer) return;
        enemyListContainer.innerHTML = '<p>Loading enemies...</p>';
        const token = localStorage.getItem('sessionToken');
        if (!token) { enemyListContainer.innerHTML = '<p>Admin token not found.</p>'; return; }
        try {
            const response = await fetch('/api/admin/enemies', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch enemies');
            const enemies = await response.json();
            if (enemies && enemies.length > 0) {
                const table = document.createElement('table');
                table.innerHTML = `<thead><tr><th>ID</th><th>Name</th><th>HP</th><th>Atk</th><th>Def</th><th>XP</th><th>Actions</th></tr></thead><tbody></tbody>`;
                const tbody = table.querySelector('tbody');
                enemies.forEach(en => {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = en.enemy_id;
                    row.insertCell().textContent = en.name;
                    row.insertCell().textContent = en.health;
                    row.insertCell().textContent = en.attack;
                    row.insertCell().textContent = en.defense;
                    row.insertCell().textContent = en.xp_reward;
                    const actionsCell = row.insertCell();
                    actionsCell.innerHTML = 
                        `<button class="action-button edit-enemy-btn" data-enemyid="${en.enemy_id}">Edit</button>
                         <button class="action-button delete-enemy-btn danger-action" data-enemyid="${en.enemy_id}">Delete</button>`;
                });
                enemyListContainer.innerHTML = ''; enemyListContainer.appendChild(table);
            } else { enemyListContainer.innerHTML = '<p>No enemies found. Create some!</p>'; }
        } catch (e) { console.error('Error loading enemies:', e); enemyListContainer.innerHTML = `<p>Error: ${e.message}</p>`; }
        if (showAddEnemyFormBtn) showAddEnemyFormBtn.style.display = 'inline-block';
        if (enemyForm && enemyForm.style.display === 'block') enemyForm.style.display = 'none';
    }

    async function saveEnemyHandler(event) {
        event.preventDefault(); if (!enemyForm) return;
        const token = localStorage.getItem('sessionToken'); if (!token) { setEnemyFormMessage('Admin session error.', 'error'); return; }
        let dataObj; try { dataObj = enemyDataTextarea.value.trim() ? JSON.parse(enemyDataTextarea.value) : null; } catch (e) { setEnemyFormMessage('Invalid JSON in Other Data.', 'error'); return; }
        const payload = {
            enemy_id: enemyIdInput.value.trim(), name: enemyNameInput.value.trim(),
            description: enemyDescriptionTextarea.value.trim(), avatar_url: enemyAvatarUrlInput.value.trim() || null,
            health: parseInt(enemyHealthInput.value), attack: parseInt(enemyAttackInput.value),
            defense: parseInt(enemyDefenseInput.value), xp_reward: parseInt(enemyXpRewardInput.value),
            money_drop_min: parseInt(enemyMoneyMinInput.value) || 0, money_drop_max: parseInt(enemyMoneyMaxInput.value) || 0,
            data: dataObj
        };
        if (!payload.enemy_id || !payload.name || payload.health === undefined || payload.attack === undefined || payload.defense === undefined || payload.xp_reward === undefined) { setEnemyFormMessage('ID, Name, HP, Atk, Def, XP are required.', 'error'); return; }
        const mode=enemyFormMode.value, url=mode==='edit'?`/api/admin/enemies/${enemyFormEditId.value}`:'/api/admin/enemies', method=mode==='edit'?'PUT':'POST';
        try {
            const response = await fetch(url, {method:method, headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(payload)});
            const result = await response.json();
            if(response.ok){setEnemyFormMessage(result.message,'success');enemyForm.style.display='none';if(showAddEnemyFormBtn)showAddEnemyFormBtn.style.display='inline-block';loadAndDisplayEnemies();}
            else{setEnemyFormMessage(result.message|| 'Failed to save enemy.','error');}
        }catch(e){console.error('Err saving enemy:',e);setEnemyFormMessage('Network error.','error');}
    }

    async function fetchFullEnemyDataForEdit(enemyId) {
        const token = localStorage.getItem('sessionToken'); if (!token) { alert('Admin session error.'); return null; }
        try {
            const response = await fetch(`/api/admin/enemies/${enemyId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch enemy details');
            return await response.json();
        } catch (e) { console.error("Error fetching enemy for edit:", e); alert("Could not load enemy details."); return null; }
    }
    async function deleteEnemyHandler(enemyId) {
        if (!confirm(`DELETE Enemy ID: ${enemyId}? This might affect dungeon encounter sequences.`)) return;
        const token = localStorage.getItem('sessionToken'); if (!token) { alert('Admin session error.'); return; }
        try {
            const response = await fetch(`/api/admin/enemies/${enemyId}`,{method:'DELETE',headers:{'Authorization':`Bearer ${token}`}});
            const result = await response.json();
            if(response.ok){alert(result.message);loadAndDisplayEnemies();}
            else{alert(result.message || 'Failed to delete enemy.');}
        }catch(e){console.error('Err deleting enemy:',e);alert('Network error.');}
    }

    function setupAdminEventListeners() {
        if(returnToGameBtn) returnToGameBtn.addEventListener('click', () => {
            window.location.href = '/game.html';
        });
        
        adminNavButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const pageId = button.dataset.page;
                navigateToAdminPage(pageId);
            });
        });
        
        if(userListContainer) userListContainer.addEventListener('click', (event) => {
            const target = event.target;
            const username = target.dataset.username;
            if (!username) return;

            if (target.classList.contains('save-role-btn')) {
                const roleSelect = target.closest('tr').querySelector('.role-select');
                if (roleSelect && confirm(`Change ${username}'s role to ${roleSelect.value}?`)) {
                    handleUpdateUserRole(username, roleSelect.value);
                }
            } else if (target.classList.contains('edit-user-details-btn')) {
                openEditUserForm(username);
            } else if (target.classList.contains('ban-user-btn')) {
                userActionHandler(username, 'ban');
            } else if (target.classList.contains('unban-user-btn')) {
                userActionHandler(username, 'unban');
            } else if (target.classList.contains('mute-user-btn')) {
                userActionHandler(username, 'mute');
            } else if (target.classList.contains('unmute-user-btn')) {
                userActionHandler(username, 'unmute');
            } else if (target.classList.contains('delete-user-btn')) {
                userActionHandler(username, 'delete');
            }
        });

        if(editUserForm) editUserForm.addEventListener('submit', saveUserDetailsHandler);
        if(cancelEditUserBtn) cancelEditUserBtn.addEventListener('click', () => { if(editUserForm) editUserForm.style.display = 'none'; });

        // Item Management Listeners
        if(showAddItemFormBtn) showAddItemFormBtn.addEventListener('click', () => openItemForm('add'));
        if(cancelItemFormBtn) cancelItemFormBtn.addEventListener('click', () => { 
            if(itemForm) itemForm.style.display = 'none'; 
            if(showAddItemFormBtn) showAddItemFormBtn.style.display = 'inline-block'; 
        });
        if(itemForm) itemForm.addEventListener('submit', saveItemHandler);

        if(itemListContainer) itemListContainer.addEventListener('click', async (event) => { // Made async for edit
            if (event.target.classList.contains('edit-item-btn')) {
                const itemId = event.target.dataset.itemid;
                const itemData = await fetchFullItemDataForEdit(itemId); // Fetch full data
                if (itemData) openItemForm('edit', itemData);
            }
            if (event.target.classList.contains('delete-item-btn')) {
                deleteItemHandler(event.target.dataset.itemid);
            }
        });

        // NPC Management Listeners
        if(showAddNpcFormBtn) showAddNpcFormBtn.addEventListener('click', () => openNpcForm('add'));
        if(cancelNpcFormBtn) cancelNpcFormBtn.addEventListener('click', () => { 
            if(npcForm) npcForm.style.display = 'none'; 
            if(showAddNpcFormBtn) showAddNpcFormBtn.style.display = 'inline-block';
        });
        if(npcForm) npcForm.addEventListener('submit', saveNpcHandler);

        if(npcListContainer) npcListContainer.addEventListener('click', async (event) => {
            if (event.target.classList.contains('edit-npc-btn')) {
                const npcId = event.target.dataset.npcid;
                const npcData = await fetchFullNpcDataForEdit(npcId);
                if (npcData) openNpcForm('edit', npcData);
            }
            if (event.target.classList.contains('delete-npc-btn')) {
                deleteNpcHandler(event.target.dataset.npcid);
            }
        });

        // Quest Management Listeners
        if(showAddQuestFormBtn) showAddQuestFormBtn.addEventListener('click', () => openQuestForm('add'));
        if(cancelQuestFormBtn) cancelQuestFormBtn.addEventListener('click', () => { 
            if(questForm) questForm.style.display = 'none'; 
            if(showAddQuestFormBtn) showAddQuestFormBtn.style.display = 'inline-block';
        });
        if(questForm) questForm.addEventListener('submit', saveQuestHandler);

        if(questListContainer) questListContainer.addEventListener('click', async (event) => {
            if (event.target.classList.contains('edit-quest-btn')) {
                const questId = event.target.dataset.questid;
                const questData = await fetchFullQuestDataForEdit(questId);
                if (questData) openQuestForm('edit', questData);
            }
            if (event.target.classList.contains('delete-quest-btn')) {
                deleteQuestHandler(event.target.dataset.questid);
            }
        });

        // Game Settings Listener
        if(gameSettingsForm) gameSettingsForm.addEventListener('submit', saveGameSettingsHandler);

        // Location Management Listeners
        if(showAddLocationFormBtn) showAddLocationFormBtn.addEventListener('click', () => openLocationForm('add'));
        if(cancelLocationFormBtn) cancelLocationFormBtn.addEventListener('click', () => { 
            if(locationForm) locationForm.style.display = 'none'; 
            if(showAddLocationFormBtn) showAddLocationFormBtn.style.display = 'inline-block';
        });
        if(locationForm) locationForm.addEventListener('submit', saveLocationHandler);

        if(locationListContainer) locationListContainer.addEventListener('click', async (event) => {
            if (event.target.classList.contains('edit-location-btn')) {
                const locationId = event.target.dataset.locationid;
                const locData = await fetchFullLocationDataForEdit(locationId);
                if (locData) openLocationForm('edit', locData);
            }
            if (event.target.classList.contains('delete-location-btn')) {
                deleteLocationHandler(event.target.dataset.locationid);
            }
        });

        // Admin Log Listeners
        if(refreshAdminLogsBtn) refreshAdminLogsBtn.addEventListener('click', () => loadAndDisplayAdminLogs(currentAdminLogPage));
        if(adminLogPrevPageBtn) adminLogPrevPageBtn.addEventListener('click', () => {
            if (currentAdminLogPage > 1) loadAndDisplayAdminLogs(currentAdminLogPage - 1);
        });
        if(adminLogNextPageBtn) adminLogNextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(totalAdminLogs / adminLogsPerPage);
            if (currentAdminLogPage < totalPages) loadAndDisplayAdminLogs(currentAdminLogPage + 1);
        });

        // Bot Management Listeners
        if(showAddBotFormBtn) showAddBotFormBtn.addEventListener('click', openBotForm);
        if(cancelBotFormBtn) cancelBotFormBtn.addEventListener('click', () => { 
            if(botForm) botForm.style.display = 'none'; 
            if(showAddBotFormBtn) showAddBotFormBtn.style.display = 'inline-block';
        });
        if(botForm) botForm.addEventListener('submit', saveBotHandler);

        // Dungeon Management Listeners
        if(showAddDungeonFormBtn) showAddDungeonFormBtn.addEventListener('click', () => openDungeonForm('add'));
        if(cancelDungeonFormBtn) cancelDungeonFormBtn.addEventListener('click', () => { if(dungeonForm)dungeonForm.style.display='none'; if(showAddDungeonFormBtn)showAddDungeonFormBtn.style.display='inline-block'; if(dungeonLootManagerDiv)dungeonLootManagerDiv.style.display='none';});
        if(dungeonForm) dungeonForm.addEventListener('submit', saveDungeonHandler);
        if(dungeonListContainer) dungeonListContainer.addEventListener('click', async (event) => {
            if (event.target.classList.contains('edit-dungeon-btn')) {
                const dungeonId = event.target.dataset.dungeonid;
                const dungeonData = await fetchFullDungeonDataForEdit(dungeonId);
                if (dungeonData) openDungeonForm('edit', dungeonData);
            }
            if (event.target.classList.contains('delete-dungeon-btn')) {
                deleteDungeonHandler(event.target.dataset.dungeonid);
            }
        });
        // Dungeon Loot Table Listeners
        if(addLootItemForm) addLootItemForm.addEventListener('submit', addLootItemHandler);
        if(dungeonLootTableContainer) dungeonLootTableContainer.addEventListener('click', (event) => {
            if(event.target.classList.contains('delete-loot-item-btn')){
                const lootId = event.target.dataset.lootid;
                const dungeonId = event.target.dataset.dungeonid; // Ensure dungeonId is on this button or get from lootDungeonIdRef
                if(lootId && dungeonId) deleteLootItemHandler(dungeonId, lootId);
            }
        });

        // Enemy Management Listeners
        if(showAddEnemyFormBtn) showAddEnemyFormBtn.addEventListener('click', () => openEnemyForm('add'));
        if(cancelEnemyFormBtn) cancelEnemyFormBtn.addEventListener('click', () => { if(enemyForm)enemyForm.style.display='none'; if(showAddEnemyFormBtn)showAddEnemyFormBtn.style.display='inline-block'; });
        if(enemyForm) enemyForm.addEventListener('submit', saveEnemyHandler);
        if(enemyListContainer) enemyListContainer.addEventListener('click', async (event) => {
            if (event.target.classList.contains('edit-enemy-btn')) {
                const enemyId = event.target.dataset.enemyid;
                const enemyData = await fetchFullEnemyDataForEdit(enemyId);
                if (enemyData) openEnemyForm('edit', enemyData);
            }
            if (event.target.classList.contains('delete-enemy-btn')) {
                deleteEnemyHandler(event.target.dataset.enemyid);
            }
        });

        // Initial setup for visual editor if its content div is visible (it won't be on first load)
        // This check is more for robustness if the default page were the editor.
        const editorContent = document.getElementById('admin-content-editor');
        if (editorContent && editorContent.style.display === 'block') {
            setupVisualEditor();
        }
    }

    // --- Initialize the Dashboard --- (Moved to the end)
    initializeAdminDashboard(); 
}); 
