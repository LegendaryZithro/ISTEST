const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // <-- Import jsonwebtoken
const db = require('./database/database.js'); // Our SQLite setup
// const SECRET_KEY = 'YOUR_VERY_SECRET_KEY_HERE_REPLACE_ME'; // For JWT

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes (useful for development)
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// --- Authentication Middleware ---
const SECRET_KEY = 'YOUR_VERY_SECRET_KEY_REPLACE_ME_IN_PRODUCTION'; 

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (token == null) {
        console.log('Auth: No token provided');
        return res.status(401).json({ message: "Unauthorized: No token provided." });
    }

    jwt.verify(token, SECRET_KEY, (err, userPayload) => {
        if (err) {
            console.log('Auth: Token verification failed', err.message);
            return res.status(403).json({ message: "Forbidden: Invalid or expired token." });
        }
        req.user = userPayload; // Add user payload (e.g., { id, username, role }) to request object
        console.log('Auth: Token verified for user:', req.user.username, 'Role:', req.user.role);
        next();
    });
};

const authorizeAdmin = (req, res, next) => {
    // Assumes authenticateToken has run and set req.user
    if (req.user && req.user.role === 'admin') {
        console.log('Auth: Admin role authorized for:', req.user.username);
        next();
    } else {
        console.log('Auth: Admin role denied for:', req.user ? req.user.username : 'unknown user');
        res.status(403).json({ message: "Forbidden: Requires admin role." });
    }
};

// --- Helper function for Admin Action Logging ---
function logAdminAction(adminUsername, actionType, targetId = null, details = null) {
    const detailsString = details ? JSON.stringify(details) : null;
    const stmt = `INSERT INTO admin_actions_log (admin_username, action_type, target_id, details, timestamp) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    db.run(stmt, [adminUsername, actionType, targetId, detailsString], (err) => {
        if (err) {
            console.error("Failed to log admin action:", err.message, { adminUsername, actionType, targetId, details });
        } else {
            console.log(`Admin Action Logged: ${adminUsername} - ${actionType}` + (targetId ? ` on ${targetId}` : ''));
        }
    });
}

// --- API Routes ---

// Registration Endpoint - standard registration always creates non-bots
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });
    if (username.length < 3 || password.length < 6) return res.status(400).json({ message: 'Username >= 3, password >= 6.' });

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) { console.error("DB error checking username:", err.message); return res.status(500).json({ message: 'Server error.' }); }
        if (row) { return res.status(409).json({ message: 'Username already exists.' }); }

        bcrypt.hash(password, 10, (err, hash) => {
            if (err) { console.error("Password hashing error:", err.message); return res.status(500).json({ message: 'Server error.' }); }

            let userData = {
                role: 'player',
                money: 100, energy: 100, maxEnergy: 100, nerve: 10, maxNerve: 10,
                strength: 1, agility: 1, rank: 'Neophyte',
                avatarUrl: 'https://via.placeholder.com/150/1a1a1a/d4ac6e?text=Avatar',
                inventory: '[]',
                is_bot: 0, // Standard registrations are not bots
                xp: 0 // Standard registrations start with 0 XP
            };

            if (username.toLowerCase() === 'zithro') {
                userData.role = 'admin'; userData.money = 100000; userData.energy = 1000; userData.maxEnergy = 1000;
                userData.nerve = 100; userData.maxNerve = 100; userData.strength = 50; userData.agility = 50;
                userData.is_bot = 0; // Zithro is an admin, not a bot
                userData.xp = 0; // Zithro starts with 0 XP as well, or set as needed
            }

            const insertStmt = `INSERT INTO users 
                (username, password_hash, role, money, energy, max_energy, nerve, max_nerve, 
                 strength, agility, inventory, rank, avatar_url, is_bot, xp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; // 15 placeholders now
            
            db.run(insertStmt, 
                [username, hash, 
                 userData.role, userData.money, userData.energy, userData.maxEnergy, 
                 userData.nerve, userData.maxNerve, userData.strength, userData.agility, 
                 userData.inventory, userData.rank, userData.avatarUrl, userData.is_bot, userData.xp],
                function(err) {
                    if (err) { console.error("DB error inserting user:", err.message); return res.status(500).json({ message: 'Server error.' }); }
                    res.status(201).json({ message: 'User registered!', userId: this.lastID, username: username, role: userData.role });
                }
            );
        });
    });
});

// Login Endpoint
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error("DB error during login:", err.message);
            return res.status(500).json({ message: 'Server error during login.' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // Unauthorized
        }

        if (user.is_banned) { // Check for ban status
            return res.status(403).json({ message: 'This account has been banned.' });
        }

        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err) {
                console.error("Password comparison error:", err.message);
                return res.status(500).json({ message: 'Server error during login.' });
            }
            if (isMatch) {
                // Update last_login timestamp
                db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

                // Don't send password_hash to client!
                const userPayloadForToken = { id: user.id, username: user.username, role: user.role };
                const accessToken = jwt.sign(userPayloadForToken, SECRET_KEY, { expiresIn: '1h' }); // Token expires in 1 hour
                
                const { password_hash, ...userDataToSend } = user;
                res.json({ 
                    message: 'Login successful!', 
                    user: userDataToSend, 
                    token: accessToken // Send token to client
                });
            } else {
                res.status(401).json({ message: 'Invalid credentials.' });
            }
        });
    });
});

// --- Game Data Endpoints (Protected by authenticateToken) ---

// GET Player Data (e.g., for re-sync or if localStorage is empty)
// For now, not using authenticateToken, relying on client sending username if needed or assuming context
app.get('/api/game/playerdata/:username', authenticateToken, (req, res) => {
    const requestedUsername = req.params.username;
    // Ensure the authenticated user is requesting their own data, or is an admin
    if (req.user.username !== requestedUsername && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: You can only fetch your own data." });
    }
    db.get('SELECT * FROM users WHERE username = ?', [requestedUsername], (err, user) => {
        if (err) {
            console.error("DB error fetching player data:", err.message);
            return res.status(500).json({ message: 'Server error fetching player data.' });
        }
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const { password_hash, ...userDataToSend } = user;
        res.json(userDataToSend);
    });
});

// POST Save Player Data
app.post('/api/game/saveplayerdata', authenticateToken, (req, res) => {
    const playerDataFromClient = req.body;
    // Ensure the authenticated user is saving their own data
    if (req.user.username !== playerDataFromClient.username) {
        return res.status(403).json({ message: "Forbidden: Cannot save data for another user." });
    }
    if (!playerDataFromClient || !playerDataFromClient.username) {
        return res.status(400).json({ message: "Invalid player data provided." });
    }

    const { username, level, money, energy, max_energy, nerve, max_nerve, strength, agility, rank, inventory, avatar_url, role, xp /* other fields you might save */ } = playerDataFromClient;

    // Ensure inventory is a JSON string for SQLite
    const inventoryString = (typeof inventory === 'string') ? inventory : JSON.stringify(inventory || []);

    const stmt = `UPDATE users SET 
                    level = ?, money = ?, energy = ?, max_energy = ?, 
                    nerve = ?, max_nerve = ?, strength = ?, agility = ?, 
                    rank = ?, inventory = ?, avatar_url = ?, role = ?, xp = ? 
                  WHERE username = ?`;
    db.run(stmt, [
        level, money, energy, max_energy, 
        nerve, max_nerve, strength, agility, 
        rank, inventoryString, avatar_url, role, xp,
        username
    ], function(err) {
        if (err) {
            console.error("DB error saving player data:", err.message);
            return res.status(500).json({ message: 'Server error.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: "User not found for save." });
        }
        res.json({ message: 'Player data saved successfully.' });
    });
});

app.get('/api/admin/users', [authenticateToken, authorizeAdmin], (req, res) => {
    db.all("SELECT id, username, role, level, money, is_banned, is_muted, mute_until, is_bot FROM users ORDER BY username", [], (err, rows) => {
        if (err) {
            console.error("DB error fetching all users:", err.message);
            return res.status(500).json({ message: "Server error." });
        }
        res.json(rows);
    });
});

app.post('/api/admin/users/:username/updaterole', [authenticateToken, authorizeAdmin], (req, res) => {
    const { username } = req.params;
    const { newRole } = req.body;
    if (!newRole || !['player', 'admin', 'moderator'].includes(newRole)) {
        return res.status(400).json({ message: "Invalid role." });
    }
    if (username.toLowerCase() === 'zithro' && newRole !== 'admin') {
        return res.status(403).json({ message: "Cannot change Zithro's role from admin." });
    }
    
    db.run("UPDATE users SET role = ? WHERE username = ?", [newRole, username], function(err) {
        if (err) {
            console.error("DB error updating role:", err.message);
            return res.status(500).json({ message: "Server error." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: `User '${username}' not found.` });
        }
        res.json({ message: `User '${username}' role updated to '${newRole}'.` });
    });
});

// New Admin User Management Endpoints
app.put('/api/admin/users/:username/updatedetails', [authenticateToken, authorizeAdmin], (req, res) => {
    const { username } = req.params;
    const { money, level, strength, agility, rank, avatar_url } = req.body; // Only allow updating these specific fields for now

    // Basic validation (can be more extensive)
    if (money === undefined && level === undefined && strength === undefined && agility === undefined && rank === undefined && avatar_url === undefined) {
        return res.status(400).json({ message: 'No valid fields provided for update.' });
    }

    const fieldsToUpdate = [];
    const params = [];

    if (money !== undefined) { fieldsToUpdate.push('money = ?'); params.push(parseInt(money) || 0); }
    if (level !== undefined) { fieldsToUpdate.push('level = ?'); params.push(parseInt(level) || 1); }
    if (strength !== undefined) { fieldsToUpdate.push('strength = ?'); params.push(parseInt(strength) || 0); }
    if (agility !== undefined) { fieldsToUpdate.push('agility = ?'); params.push(parseInt(agility) || 0); }
    if (rank !== undefined) { fieldsToUpdate.push('rank = ?'); params.push(rank); }
    if (avatar_url !== undefined) { fieldsToUpdate.push('avatar_url = ?'); params.push(avatar_url); }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: 'No updatable fields provided.' });
    }

    params.push(username);
    const stmt = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE username = ?`;

    db.run(stmt, params, function(err) {
        if (err) { console.error("DB error updating user details:", err.message); return res.status(500).json({ message: 'Server error.'}); }
        if (this.changes === 0) return res.status(404).json({ message: `User '${username}' not found.` });
        res.json({ message: `User '${username}' details updated.`});
    });
});

app.post('/api/admin/users/:username/ban', [authenticateToken, authorizeAdmin], (req, res) => {
    const { username } = req.params;
    if (username.toLowerCase() === 'zithro') return res.status(403).json({ message: "Cannot ban primary admin."}) ;
    db.run("UPDATE users SET is_banned = 1 WHERE username = ?", [username], function(err) {
        if (err) { console.error("DB error banning user:", err.message); return res.status(500).json({ message: 'Server error.'}); }
        if (this.changes === 0) return res.status(404).json({ message: `User '${username}' not found.` });
        res.json({ message: `User '${username}' has been banned.`});
    });
});

app.post('/api/admin/users/:username/unban', [authenticateToken, authorizeAdmin], (req, res) => {
    const { username } = req.params;
    db.run("UPDATE users SET is_banned = 0 WHERE username = ?", [username], function(err) {
        if (err) { console.error("DB error unbanning user:", err.message); return res.status(500).json({ message: 'Server error.'}); }
        if (this.changes === 0) return res.status(404).json({ message: `User '${username}' not found.` });
        res.json({ message: `User '${username}' has been unbanned.`});
    });
});

app.post('/api/admin/users/:username/mute', [authenticateToken, authorizeAdmin], (req, res) => {
    const { username } = req.params;
    const { durationHours } = req.body; // Optional: duration in hours
    let muteUntil = null;
    if (durationHours && !isNaN(parseInt(durationHours))) {
        muteUntil = new Date(Date.now() + parseInt(durationHours) * 60 * 60 * 1000).toISOString();
    }
    // For indefinite mute, client can just not send duration, or server sets a very far future date.
    // Here, if no duration, it's an indefinite mute (is_muted=1, mute_until=NULL)
    // If duration is specified, is_muted will still be 1, but mute_until will have a value.
    db.run("UPDATE users SET is_muted = 1, mute_until = ? WHERE username = ?", [muteUntil, username], function(err) {
        if (err) { console.error("DB error muting user:", err.message); return res.status(500).json({ message: 'Server error.'}); }
        if (this.changes === 0) return res.status(404).json({ message: `User '${username}' not found.` });
        res.json({ message: `User '${username}' has been muted` + (muteUntil ? ` until ${muteUntil}` : '.') });
    });
});

app.post('/api/admin/users/:username/unmute', [authenticateToken, authorizeAdmin], (req, res) => {
    const { username } = req.params;
    db.run("UPDATE users SET is_muted = 0, mute_until = NULL WHERE username = ?", [username], function(err) {
        if (err) { console.error("DB error unmuting user:", err.message); return res.status(500).json({ message: 'Server error.'}); }
        if (this.changes === 0) return res.status(404).json({ message: `User '${username}' not found.` });
        res.json({ message: `User '${username}' has been unmuted.`});
    });
});

app.delete('/api/admin/users/:username', [authenticateToken, authorizeAdmin], (req, res) => {
    const { username } = req.params;
    if (username.toLowerCase() === 'zithro') return res.status(403).json({ message: "Cannot delete primary admin."}) ;
    db.run("DELETE FROM users WHERE username = ?", [username], function(err) {
        if (err) { console.error("DB error deleting user:", err.message); return res.status(500).json({ message: 'Server error.'}); }
        if (this.changes === 0) return res.status(404).json({ message: `User '${username}' not found.` });
        res.json({ message: `User '${username}' has been deleted.`});
    });
});

// Item Management API Endpoints
// GET all game items
app.get('/api/admin/items', [authenticateToken, authorizeAdmin], (req, res) => {
    db.all("SELECT * FROM game_items ORDER BY name", [], (err, items) => {
        if (err) {
            console.error("DB error fetching game items:", err.message);
            return res.status(500).json({ message: "Server error fetching items." });
        }
        res.json(items.map(item => ({
            ...item,
            effects: item.effects ? JSON.parse(item.effects) : {},
            data: item.data ? JSON.parse(item.data) : {}
        })));
    });
});

// GET a single game item by ID
app.get('/api/admin/items/:itemId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { itemId } = req.params;
    db.get("SELECT * FROM game_items WHERE item_id = ?", [itemId], (err, item) => {
        if (err) {
            console.error(`DB error fetching item ${itemId}:`, err.message);
            return res.status(500).json({ message: "Server error fetching item details." });
        }
        if (!item) {
            return res.status(404).json({ message: `Item with ID '${itemId}' not found.` });
        }
        // Parse JSON fields before sending
        const itemToSend = {
            ...item,
            effects: item.effects ? JSON.parse(item.effects) : {},
            data: item.data ? JSON.parse(item.data) : {}
        };
        res.json(itemToSend);
    });
});

// POST a new game item
app.post('/api/admin/items', [authenticateToken, authorizeAdmin], (req, res) => {
    const { item_id, name, description, type, effects, value, image_url, stackable, data } = req.body;

    if (!item_id || !name || !type) {
        return res.status(400).json({ message: "Item ID, Name, and Type are required." });
    }

    // Validate effects and data can be stringified if they are objects
    let effectsString, dataString;
    try {
        effectsString = effects ? JSON.stringify(effects) : null;
        dataString = data ? JSON.stringify(data) : null;
    } catch (e) {
        return res.status(400).json({ message: "Invalid JSON format for effects or data." });
    }

    const stmt = `INSERT INTO game_items (item_id, name, description, type, effects, value, image_url, stackable, data) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(stmt, [item_id, name, description, type, effectsString, value || 0, image_url, stackable ? 1 : 0, dataString], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed: game_items.item_id')) {
                return res.status(409).json({ message: `Item ID '${item_id}' already exists.` });
            }
            console.error("DB error adding item:", err.message);
            return res.status(500).json({ message: "Server error adding item." });
        }
        res.status(201).json({ message: "Item added successfully.", itemId: item_id });
    });
});

// PUT update an existing game item
app.put('/api/admin/items/:itemId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { itemId } = req.params;
    const { name, description, type, effects, value, image_url, stackable, data } = req.body;

    if (!name || !type) { // item_id is from param, not body for update usually
        return res.status(400).json({ message: "Name and Type are required for update." });
    }
    
    let effectsString, dataString;
    try {
        effectsString = effects ? JSON.stringify(effects) : null;
        dataString = data ? JSON.stringify(data) : null;
    } catch (e) {
        return res.status(400).json({ message: "Invalid JSON format for effects or data." });
    }

    const stmt = `UPDATE game_items SET 
                    name = ?, description = ?, type = ?, effects = ?, 
                    value = ?, image_url = ?, stackable = ?, data = ? 
                  WHERE item_id = ?`;
    db.run(stmt, [name, description, type, effectsString, value || 0, image_url, stackable ? 1 : 0, dataString, itemId], function(err) {
        if (err) {
            console.error("DB error updating item:", err.message);
            return res.status(500).json({ message: "Server error updating item." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: `Item with ID '${itemId}' not found.` });
        }
        res.json({ message: `Item '${itemId}' updated successfully.` });
    });
});

// DELETE a game item
app.delete('/api/admin/items/:itemId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { itemId } = req.params;
    db.run("DELETE FROM game_items WHERE item_id = ?", [itemId], function(err) {
        if (err) {
            console.error("DB error deleting item:", err.message);
            return res.status(500).json({ message: "Server error deleting item." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: `Item with ID '${itemId}' not found.` });
        }
        // TODO: Consider implications for player inventories that might contain this item_id.
        res.json({ message: `Item '${itemId}' deleted successfully.` });
    });
});

// --- NPC Management API Endpoints ---

// GET all NPCs
app.get('/api/admin/npcs', [authenticateToken, authorizeAdmin], (req, res) => {
    db.all("SELECT * FROM npcs ORDER BY name", [], (err, npcs) => {
        if (err) {
            console.error("DB error fetching NPCs:", err.message);
            return res.status(500).json({ message: "Server error fetching NPCs." });
        }
        res.json(npcs);
    });
});

// GET a single NPC by ID
app.get('/api/admin/npcs/:npcId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { npcId } = req.params;
    db.get("SELECT * FROM npcs WHERE npc_id = ?", [npcId], (err, npc) => {
        if (err) {
            console.error(`DB error fetching NPC ${npcId}:`, err.message);
            return res.status(500).json({ message: "Server error fetching NPC details." });
        }
        if (!npc) {
            return res.status(404).json({ message: `NPC with ID '${npcId}' not found.` });
        }
        res.json(npc);
    });
});

// POST a new NPC
app.post('/api/admin/npcs', [authenticateToken, authorizeAdmin], (req, res) => {
    const { npc_id, name, description, dialogue, avatar_url, location_id } = req.body;
    if (!npc_id || !name) {
        return res.status(400).json({ message: "NPC ID and Name are required." });
    }
    // Add created_at and updated_at timestamps
    const currentTime = new Date().toISOString();
    const stmt = `INSERT INTO npcs (npc_id, name, description, dialogue, avatar_url, location_id, created_at, updated_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(stmt, [npc_id, name, description, dialogue, avatar_url, location_id, currentTime, currentTime], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed: npcs.npc_id')) {
                return res.status(409).json({ message: `NPC ID '${npc_id}' already exists.` });
            }
            console.error("DB error adding NPC:", err.message);
            return res.status(500).json({ message: "Server error adding NPC." });
        }
        res.status(201).json({ message: "NPC added successfully.", npcId: this.lastID }); // lastID is rowid, use npc_id for consistency
    });
});

// PUT update an existing NPC
app.put('/api/admin/npcs/:npcId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { npcId } = req.params;
    const { name, description, dialogue, avatar_url, location_id } = req.body;
    if (!name) { // npc_id from param
        return res.status(400).json({ message: "Name is required for update." });
    }
    const currentTime = new Date().toISOString();
    const stmt = `UPDATE npcs SET 
                    name = ?, description = ?, dialogue = ?, avatar_url = ?, location_id = ?, updated_at = ? 
                  WHERE npc_id = ?`;
    db.run(stmt, [name, description, dialogue, avatar_url, location_id, currentTime, npcId], function(err) {
        if (err) {
            console.error("DB error updating NPC:", err.message);
            return res.status(500).json({ message: "Server error updating NPC." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: `NPC with ID '${npcId}' not found.` });
        }
        res.json({ message: `NPC '${npcId}' updated successfully.` });
    });
});

// DELETE an NPC
app.delete('/api/admin/npcs/:npcId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { npcId } = req.params;
    db.run("DELETE FROM npcs WHERE npc_id = ?", [npcId], function(err) {
        if (err) {
            console.error("DB error deleting NPC:", err.message);
            return res.status(500).json({ message: "Server error deleting NPC." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: `NPC with ID '${npcId}' not found.` });
        }
        res.json({ message: `NPC '${npcId}' deleted successfully.` });
    });
});

// --- Quest Management API Endpoints ---

// GET all quests
app.get('/api/admin/quests', [authenticateToken, authorizeAdmin], (req, res) => {
    db.all("SELECT * FROM game_quests ORDER BY title", [], (err, quests) => {
        if (err) {
            console.error("DB error fetching quests:", err.message);
            return res.status(500).json({ message: "Server error fetching quests." });
        }
        // Parse JSON fields before sending
        res.json(quests.map(q => ({
            ...q,
            prerequisites: q.prerequisites ? JSON.parse(q.prerequisites) : {},
            rewards: q.rewards ? JSON.parse(q.rewards) : {}
        })));
    });
});

// GET a single quest by ID
app.get('/api/admin/quests/:questId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { questId } = req.params;
    db.get("SELECT * FROM game_quests WHERE quest_id = ?", [questId], (err, quest) => {
        if (err) {
            console.error(`DB error fetching quest ${questId}:`, err.message);
            return res.status(500).json({ message: "Server error fetching quest details." });
        }
        if (!quest) {
            return res.status(404).json({ message: `Quest with ID '${questId}' not found.` });
        }
        const questToSend = {
            ...quest,
            prerequisites: quest.prerequisites ? JSON.parse(quest.prerequisites) : {},
            rewards: quest.rewards ? JSON.parse(quest.rewards) : {}
        };
        res.json(questToSend);
    });
});

// POST a new quest
app.post('/api/admin/quests', [authenticateToken, authorizeAdmin], (req, res) => {
    const { quest_id, title, description, objectives_summary, prerequisites, rewards, start_npc_id, end_npc_id, is_repeatable } = req.body;
    if (!quest_id || !title) {
        return res.status(400).json({ message: "Quest ID and Title are required." });
    }
    let prereqString, rewardsString;
    try {
        prereqString = prerequisites ? JSON.stringify(prerequisites) : null;
        rewardsString = rewards ? JSON.stringify(rewards) : null;
    } catch (e) { return res.status(400).json({ message: "Invalid JSON for prerequisites or rewards." }); }
    
    const currentTime = new Date().toISOString();
    const stmt = `INSERT INTO game_quests (quest_id, title, description, objectives_summary, prerequisites, rewards, start_npc_id, end_npc_id, is_repeatable, created_at, updated_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(stmt, [quest_id, title, description, objectives_summary, prereqString, rewardsString, start_npc_id, end_npc_id, is_repeatable ? 1 : 0, currentTime, currentTime], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed: game_quests.quest_id')) {
                return res.status(409).json({ message: `Quest ID '${quest_id}' already exists.` });
            }
            console.error("DB error adding quest:", err.message);
            return res.status(500).json({ message: "Server error adding quest." });
        }
        res.status(201).json({ message: "Quest added successfully.", questId: quest_id });
    });
});

// PUT update an existing quest
app.put('/api/admin/quests/:questId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { questId } = req.params;
    const { title, description, objectives_summary, prerequisites, rewards, start_npc_id, end_npc_id, is_repeatable } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required for update." });

    let prereqString, rewardsString;
    try {
        prereqString = prerequisites ? JSON.stringify(prerequisites) : null;
        rewardsString = rewards ? JSON.stringify(rewards) : null;
    } catch (e) { return res.status(400).json({ message: "Invalid JSON for prerequisites or rewards."}); }

    const currentTime = new Date().toISOString();
    const stmt = `UPDATE game_quests SET title = ?, description = ?, objectives_summary = ?, prerequisites = ?, rewards = ?, 
                  start_npc_id = ?, end_npc_id = ?, is_repeatable = ?, updated_at = ? WHERE quest_id = ?`;
    db.run(stmt, [title, description, objectives_summary, prereqString, rewardsString, start_npc_id, end_npc_id, is_repeatable ? 1 : 0, currentTime, questId], function(err) {
        if (err) { console.error("DB error updating quest:", err.message); return res.status(500).json({ message: "Server error updating quest." }); }
        if (this.changes === 0) return res.status(404).json({ message: `Quest '${questId}' not found.` });
        res.json({ message: `Quest '${questId}' updated successfully.` });
    });
});

// DELETE a quest
app.delete('/api/admin/quests/:questId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { questId } = req.params;
    db.run("DELETE FROM game_quests WHERE quest_id = ?", [questId], function(err) {
        if (err) { console.error("DB error deleting quest:", err.message); return res.status(500).json({ message: "Server error deleting quest." }); }
        if (this.changes === 0) return res.status(404).json({ message: `Quest '${questId}' not found.`});
        res.json({ message: `Quest '${questId}' deleted successfully.` });
    });
});

// --- Game Configuration API Endpoints ---

// GET all game configurations (for admin panel)
app.get('/api/admin/gameconfigs', [authenticateToken, authorizeAdmin], (req, res) => {
    db.all("SELECT config_key, config_value, description FROM game_config ORDER BY config_key", [], (err, configs) => {
        if (err) {
            console.error("DB error fetching game_configs:", err.message);
            return res.status(500).json({ message: "Server error fetching game configurations." });
        }
        // Attempt to parse values that might be numbers or booleans for richer client-side handling
        const parsedConfigs = configs.map(c => {
            let value = c.config_value;
            try {
                // Check if it looks like a number string (int or float)
                if (/^[-+]?(\d*\.)?\d+$/.test(value)) {
                    value = parseFloat(value);
                } else if (value === 'true' || value === 'false') {
                    value = (value === 'true');
                }
                // If not number or boolean, it remains a string
            } catch (e) { /* Ignore parsing errors, keep as string */ }
            return { ...c, config_value: value }; 
        });
        res.json(parsedConfigs);
    });
});

// PUT update game configurations (expects an object where keys are config_key and values are new config_value)
app.put('/api/admin/gameconfigs', [authenticateToken, authorizeAdmin], (req, res) => {
    const configsToUpdate = req.body; // e.g., { "ENERGY_REGEN_RATE": "2", "DEFAULT_PLAYER_MONEY": "150" }
    if (typeof configsToUpdate !== 'object' || configsToUpdate === null) {
        return res.status(400).json({ message: "Invalid configuration data format. Expected an object." });
    }

    const promises = Object.entries(configsToUpdate).map(([key, value]) => {
        return new Promise((resolve, reject) => {
            // All values are stored as TEXT in DB, client will parse them.
            const stmt = "UPDATE game_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?";
            db.run(stmt, [String(value), key], function(err) {
                if (err) {
                    console.error(`DB error updating config_key ${key}:`, err.message);
                    reject(err); // Propagate error to Promise.all
                } else if (this.changes === 0) {
                    // Optionally, treat non-existent key as an error or silently ignore
                    console.warn(`Config key '${key}' not found, no update performed.`);
                    resolve({ key, status: 'not_found' });
                } else {
                    resolve({ key, status: 'updated' });
                }
            });
        });
    });

    Promise.all(promises)
        .then(results => {
            res.json({ message: "Game configurations updated successfully.", results });
        })
        .catch(error => {
            // This catch might not be hit if individual db.run errors are not re-thrown/rejected correctly
            // However, individual rejections within the map will cause Promise.all to reject.
            res.status(500).json({ message: "An error occurred while updating some configurations." });
        });
});

// GET all game configurations (for the game client - public or semi-public)
app.get('/api/game/config', (req, res) => { // No authenticateToken for broad client access initially
    db.all("SELECT config_key, config_value FROM game_config", [], (err, configs) => {
        if (err) {
            console.error("DB error fetching game_configs for client:", err.message);
            return res.status(500).json({ message: "Server error fetching game configurations." });
        }
        // Convert to a simple key-value object for the client and parse values
        const configMap = {};
        configs.forEach(c => {
            let value = c.config_value;
            try {
                if (/^[-+]?(\d*\.)?\d+$/.test(value)) { value = parseFloat(value); }
                else if (value === 'true' || value === 'false') { value = (value === 'true'); }
            } catch (e) { /* ignore */ }
            configMap[c.config_key] = value;
        });
        res.json(configMap);
    });
});

// --- Location Management API Endpoints ---

// GET all locations
app.get('/api/admin/locations', [authenticateToken, authorizeAdmin], (req, res) => {
    db.all("SELECT * FROM game_locations ORDER BY name", [], (err, locations) => {
        if (err) {
            console.error("DB error fetching locations:", err.message);
            return res.status(500).json({ message: "Server error fetching locations." });
        }
        res.json(locations.map(loc => ({
            ...loc,
            connections: loc.connections ? JSON.parse(loc.connections) : {},
            data: loc.data ? JSON.parse(loc.data) : {}
        })));
    });
});

// GET a single location by ID
app.get('/api/admin/locations/:locationId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { locationId } = req.params;
    db.get("SELECT * FROM game_locations WHERE location_id = ?", [locationId], (err, loc) => {
        if (err) {
            console.error(`DB error fetching location ${locationId}:`, err.message);
            return res.status(500).json({ message: "Server error fetching location details." });
        }
        if (!loc) {
            return res.status(404).json({ message: `Location with ID '${locationId}' not found.` });
        }
        res.json({
            ...loc,
            connections: loc.connections ? JSON.parse(loc.connections) : {},
            data: loc.data ? JSON.parse(loc.data) : {}
        });
    });
});

// POST a new location
app.post('/api/admin/locations', [authenticateToken, authorizeAdmin], (req, res) => {
    const { location_id, name, description, connections, image_url, data } = req.body;
    if (!location_id || !name) {
        return res.status(400).json({ message: "Location ID and Name are required." });
    }
    let connectionsString, dataString;
    try {
        connectionsString = connections ? JSON.stringify(connections) : null;
        dataString = data ? JSON.stringify(data) : null;
    } catch (e) { return res.status(400).json({ message: "Invalid JSON for connections or data." }); }

    const currentTime = new Date().toISOString();
    const stmt = `INSERT INTO game_locations (location_id, name, description, connections, image_url, data, created_at, updated_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(stmt, [location_id, name, description, connectionsString, image_url, dataString, currentTime, currentTime], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed: game_locations.location_id')) {
                return res.status(409).json({ message: `Location ID '${location_id}' already exists.` });
            }
            console.error("DB error adding location:", err.message);
            return res.status(500).json({ message: "Server error adding location." });
        }
        res.status(201).json({ message: "Location added successfully.", locationId: location_id });
    });
});

// PUT update an existing location
app.put('/api/admin/locations/:locationId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { locationId } = req.params;
    const { name, description, connections, image_url, data } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required for update." });

    let connectionsString, dataString;
    try {
        connectionsString = connections ? JSON.stringify(connections) : null;
        dataString = data ? JSON.stringify(data) : null;
    } catch (e) { return res.status(400).json({ message: "Invalid JSON for connections or data." }); }

    const currentTime = new Date().toISOString();
    const stmt = `UPDATE game_locations SET name = ?, description = ?, connections = ?, image_url = ?, data = ?, updated_at = ? 
                  WHERE location_id = ?`;
    db.run(stmt, [name, description, connectionsString, image_url, dataString, currentTime, locationId], function(err) {
        if (err) { console.error("DB error updating location:", err.message); return res.status(500).json({ message: "Server error updating location." }); }
        if (this.changes === 0) return res.status(404).json({ message: `Location '${locationId}' not found.` });
        res.json({ message: `Location '${locationId}' updated successfully.` });
    });
});

// DELETE a location
app.delete('/api/admin/locations/:locationId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { locationId } = req.params;
    db.run("DELETE FROM game_locations WHERE location_id = ?", [locationId], function(err) {
        if (err) { console.error("DB error deleting location:", err.message); return res.status(500).json({ message: "Server error deleting location." }); }
        if (this.changes === 0) return res.status(404).json({ message: `Location '${locationId}' not found.`});
        res.json({ message: `Location '${locationId}' deleted successfully.` });
    });
});

// --- Admin Action Log Endpoint ---
app.get('/api/admin/logs', [authenticateToken, authorizeAdmin], (req, res) => {
    // Optional: Add query params for pagination/filtering e.g., ?limit=50&offset=0&admin=Zithro
    const limit = parseInt(req.query.limit) || 100; // Default to 100 recent logs
    const offset = parseInt(req.query.offset) || 0;

    db.all("SELECT * FROM admin_actions_log ORDER BY timestamp DESC LIMIT ? OFFSET ?", [limit, offset], (err, logs) => {
        if (err) {
            console.error("DB error fetching admin logs:", err.message);
            return res.status(500).json({ message: "Server error fetching admin logs." });
        }
        // Parse 'details' JSON string back to object for client display
        const parsedLogs = logs.map(log => ({
            ...log,
            details: log.details ? JSON.parse(log.details) : null
        })); 
        // Also get total count for pagination
        db.get("SELECT COUNT(*) as total FROM admin_actions_log", (err, countRow) => {
            if(err) return res.status(500).json({ message: "Server error fetching log count." });
            res.json({ logs: parsedLogs, total: countRow ? countRow.total : 0 });
        });
    });
});

// --- Chat API Endpoints ---

// POST a new chat message
app.post('/api/chat/messages', authenticateToken, (req, res) => {
    const { channel, message_content } = req.body;
    const { id: userId, username } = req.user; // From JWT payload

    if (!channel || !message_content || message_content.trim() === '') {
        return res.status(400).json({ message: "Channel and message content are required." });
    }
    if (message_content.length > 500) { // Basic length validation
        return res.status(400).json({ message: "Message is too long (max 500 characters)." });
    }

    // Check if user is muted
    db.get("SELECT is_muted, mute_until FROM users WHERE id = ?", [userId], (err, userStatus) => {
        if (err) {
            console.error("DB error checking mute status:", err.message);
            return res.status(500).json({ message: "Server error checking mute status." });
        }
        if (userStatus && userStatus.is_muted) {
            if (userStatus.mute_until === null || new Date(userStatus.mute_until) > new Date()) {
                return res.status(403).json({ message: "You are currently muted." + (userStatus.mute_until ? ` Mute expires at ${new Date(userStatus.mute_until).toLocaleString()}` : '') });
            } else {
                // Mute expired, unmute the user automatically
                db.run("UPDATE users SET is_muted = 0, mute_until = NULL WHERE id = ?", [userId]);
            }
        }

        const stmt = `INSERT INTO chat_messages (channel, user_id, username, message_content, timestamp) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
        db.run(stmt, [channel, userId, username, message_content.trim()], function(err) {
            if (err) {
                console.error("DB error posting chat message:", err.message);
                return res.status(500).json({ message: "Server error posting message." });
            }
            const newMessage = {
                message_id: this.lastID,
                channel: channel,
                user_id: userId,
                username: username,
                message_content: message_content.trim(),
                timestamp: new Date().toISOString() // Approximate, DB timestamp is more accurate
            };
            // TODO: In a real-time app, broadcast this message via WebSockets here.
            res.status(201).json(newMessage);
        });
    });
});

// GET chat messages for a channel (with pagination and auto-deletion of old messages)
app.get('/api/chat/messages/:channel', authenticateToken, (req, res) => {
    const { channel } = req.params;
    const limit = parseInt(req.query.limit) || 50; // Default to 50 messages
    const offset = parseInt(req.query.offset) || 0; // For pagination

    // Auto-delete messages older than 30 days (simple approach)
    // For high-traffic, a separate scheduled job is better.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    db.run("DELETE FROM chat_messages WHERE timestamp < ?", [thirtyDaysAgo], (err) => {
        if (err) console.error("Error deleting old chat messages:", err.message);
        else console.log("Old chat messages cleanup executed.");
    });

    const query = `SELECT * FROM chat_messages WHERE channel = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    db.all(query, [channel, limit, offset], (err, messages) => {
        if (err) {
            console.error("DB error fetching chat messages:", err.message);
            return res.status(500).json({ message: "Server error fetching messages." });
        }
        // Messages are fetched DESC, so reverse for chronological display on client if needed
        res.json(messages.reverse()); 
    });
});

// --- Dungeon Management API Endpoints ---
// GET all dungeons
app.get('/api/admin/dungeons', [authenticateToken, authorizeAdmin], (req, res) => {
    db.all("SELECT * FROM game_dungeons ORDER BY recommended_level, name", [], (err, dungeons) => {
        if (err) { console.error("DB err:", err.message); return res.status(500).json({ message: "Server error." }); }
        res.json(dungeons.map(d => ({...d, recommended_stats: JSON.parse(d.recommended_stats || '{}'), encounter_sequence: JSON.parse(d.encounter_sequence || '[]')})));
    });
});

// GET a single dungeon
app.get('/api/admin/dungeons/:dungeonId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { dungeonId } = req.params;
    db.get("SELECT * FROM game_dungeons WHERE dungeon_id = ?", [dungeonId], (err, dungeon) => {
        if (err) { console.error("DB err:", err.message); return res.status(500).json({ message: "Server error." }); }
        if (!dungeon) return res.status(404).json({ message: "Dungeon not found." });
        res.json({...dungeon, recommended_stats: JSON.parse(dungeon.recommended_stats || '{}'), encounter_sequence: JSON.parse(dungeon.encounter_sequence || '[]')});
    });
});

// POST a new dungeon
app.post('/api/admin/dungeons', [authenticateToken, authorizeAdmin], (req, res) => {
    const { dungeon_id, name, description, image_url, recommended_level, recommended_stats, encounter_sequence } = req.body;
    if (!dungeon_id || !name) return res.status(400).json({ message: "Dungeon ID and Name required." });
    let statsStr, encountersStr;
    try { statsStr = recommended_stats ? JSON.stringify(recommended_stats) : null; encountersStr = encounter_sequence ? JSON.stringify(encounter_sequence) : null; } 
    catch (e) { return res.status(400).json({ message: "Invalid JSON for stats or encounters."}); }
    const stmt = `INSERT INTO game_dungeons (dungeon_id, name, description, image_url, recommended_level, recommended_stats, encounter_sequence, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    db.run(stmt, [dungeon_id, name, description, image_url, recommended_level || 1, statsStr, encountersStr], function(err) {
        if (err) { if(err.message.includes('UNIQUE')) return res.status(409).json({message:'Dungeon ID exists.'}); console.error("DB err:",err.message); return res.status(500).json({message:'Server err.'});}
        logAdminAction(req.user.username, 'DUNGEON_CREATE', dungeon_id, req.body);
        res.status(201).json({ message: "Dungeon created.", dungeonId: dungeon_id });
    });
});

// PUT update a dungeon
app.put('/api/admin/dungeons/:dungeonId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { dungeonId } = req.params;
    const { name, description, image_url, recommended_level, recommended_stats, encounter_sequence } = req.body;
    if (!name) return res.status(400).json({ message: "Name required." });
    let statsStr, encountersStr; try { statsStr = recommended_stats?JSON.stringify(recommended_stats):null; encountersStr = encounter_sequence?JSON.stringify(encounter_sequence):null;} catch(e){return res.status(400).json({message:"Invalid JSON"});}
    const stmt = `UPDATE game_dungeons SET name=?, description=?, image_url=?, recommended_level=?, recommended_stats=?, encounter_sequence=?, updated_at=CURRENT_TIMESTAMP WHERE dungeon_id=?`;
    db.run(stmt, [name, description, image_url, recommended_level || 1, statsStr, encountersStr, dungeonId], function(err){
        if(err){console.error("DB err:",err.message); return res.status(500).json({message:'Server err.'});}
        if(this.changes === 0) return res.status(404).json({message:'Dungeon not found.'});
        logAdminAction(req.user.username, 'DUNGEON_UPDATE', dungeonId, req.body);
        res.json({ message: `Dungeon ${dungeonId} updated.` });
    });
});

// DELETE a dungeon
app.delete('/api/admin/dungeons/:dungeonId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { dungeonId } = req.params;
    // Also deletes associated loot table entries due to ON DELETE CASCADE
    db.run("DELETE FROM game_dungeons WHERE dungeon_id = ?", [dungeonId], function(err) {
        if(err){console.error("DB err:",err.message); return res.status(500).json({message:'Server err.'});}
        if(this.changes === 0) return res.status(404).json({message:'Dungeon not found.'});
        logAdminAction(req.user.username, 'DUNGEON_DELETE', dungeonId);
        res.json({ message: `Dungeon ${dungeonId} deleted.` });
    });
});

// --- Dungeon Loot Table API Endpoints ---
// GET loot for a specific dungeon
app.get('/api/admin/dungeons/:dungeonId/loot', [authenticateToken, authorizeAdmin], (req, res) => {
    const { dungeonId } = req.params;
    db.all("SELECT dl.*, gi.name as item_name FROM dungeon_loot_tables dl JOIN game_items gi ON dl.item_id = gi.item_id WHERE dl.dungeon_id = ? ORDER BY dl.rarity, gi.name", [dungeonId], (err, loot) => {
        if(err){console.error("DB err:",err.message); return res.status(500).json({message:'Server err.'});}
        res.json(loot);
    });
});

// POST add an item to a dungeon's loot table
app.post('/api/admin/dungeons/:dungeonId/loot', [authenticateToken, authorizeAdmin], (req, res) => {
    const { dungeonId } = req.params;
    const { item_id, rarity, drop_chance, min_quantity, max_quantity } = req.body;
    if(!item_id || !rarity || drop_chance === undefined) return res.status(400).json({message:"Item ID, rarity, drop chance required."} );
    const stmt = `INSERT INTO dungeon_loot_tables (dungeon_id, item_id, rarity, drop_chance, min_quantity, max_quantity) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(stmt, [dungeonId, item_id, rarity, parseFloat(drop_chance) || 0.1, parseInt(min_quantity)||1, parseInt(max_quantity)||1], function(err){
        if(err){console.error("DB err:",err.message); return res.status(500).json({message:'Server err.'});}
        logAdminAction(req.user.username, 'DUNGEON_LOOT_ADD', dungeonId, { item_id, rarity });
        res.status(201).json({message: `Item ${item_id} added to ${dungeonId} loot table.`, lootTableId: this.lastID });
    });
});

// PUT update a loot table entry
app.put('/api/admin/dungeons/:dungeonId/loot/:lootTableId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { dungeonId, lootTableId } = req.params;
    const { item_id, rarity, drop_chance, min_quantity, max_quantity } = req.body;
    if(!item_id || !rarity || drop_chance === undefined) return res.status(400).json({message:"Item ID, rarity, drop chance required."} );
    const stmt = `UPDATE dungeon_loot_tables SET item_id=?, rarity=?, drop_chance=?, min_quantity=?, max_quantity=? WHERE loot_table_id=? AND dungeon_id=?`;
    db.run(stmt, [item_id, rarity, parseFloat(drop_chance)||0.1, parseInt(min_quantity)||1, parseInt(max_quantity)||1, lootTableId, dungeonId], function(err){
        if(err){console.error("DB err:",err.message); return res.status(500).json({message:'Server err.'});}
        if(this.changes === 0) return res.status(404).json({message:'Loot entry not found.'});
        logAdminAction(req.user.username, 'DUNGEON_LOOT_UPDATE', dungeonId, { lootTableId, item_id });
        res.json({message: `Loot entry ${lootTableId} updated.`});
    });
});

// DELETE a loot table entry
app.delete('/api/admin/dungeons/:dungeonId/loot/:lootTableId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { dungeonId, lootTableId } = req.params;
    db.run("DELETE FROM dungeon_loot_tables WHERE loot_table_id = ? AND dungeon_id = ?", [lootTableId, dungeonId], function(err){
        if(err){console.error("DB err:",err.message); return res.status(500).json({message:'Server err.'});}
        if(this.changes === 0) return res.status(404).json({message:'Loot entry not found.'});
        logAdminAction(req.user.username, 'DUNGEON_LOOT_DELETE', dungeonId, { lootTableId });
        res.json({message:`Loot entry ${lootTableId} deleted.`});
    });
});

// --- New Game Client API Endpoints for Dungeons ---

// GET available dungeons for players
app.get('/api/game/dungeons', authenticateToken, (req, res) => {
    // Future: Could filter by player level (req.user.level) or location_id if player location is tracked
    db.all("SELECT dungeon_id, name, description, image_url, recommended_level, recommended_stats FROM game_dungeons ORDER BY recommended_level ASC, name ASC", [], (err, dungeons) => {
        if (err) {
            console.error("DB error fetching dungeons for game client:", err.message);
            return res.status(500).json({ message: "Server error fetching available dungeons." });
        }
        res.json(dungeons.map(d => ({
            ...d,
            recommended_stats: d.recommended_stats ? JSON.parse(d.recommended_stats) : {}
            // encounter_sequence is not sent to client list to save data, client will get it when entering dungeon
        })));
    });
});

// GET loot preview for a specific dungeon (simplified)
app.get('/api/game/dungeons/:dungeonId/loot-preview', authenticateToken, (req, res) => {
    const { dungeonId } = req.params;
    // Fetch limited loot info, e.g., just item names grouped by rarity, or top N rarest items.
    // For simplicity, fetch all and let client process, but ideally server summarizes.
    const query = `
        SELECT dl.rarity, gi.name as item_name 
        FROM dungeon_loot_tables dl 
        JOIN game_items gi ON dl.item_id = gi.item_id 
        WHERE dl.dungeon_id = ? 
        ORDER BY 
            CASE dl.rarity 
                WHEN 'mythical' THEN 1 WHEN 'legendary' THEN 2 WHEN 'rare' THEN 3 
                WHEN 'uncommon' THEN 4 WHEN 'common' THEN 5 ELSE 6 END, 
            gi.name ASC
    `;
    db.all(query, [dungeonId], (err, loot) => {
        if (err) {
            console.error("DB error fetching loot preview for dungeon:", dungeonId, err.message);
            return res.status(500).json({ message: "Server error fetching loot preview." });
        }
        // Group by rarity for client display
        const lootByRarity = loot.reduce((acc, current) => {
            const rarity = current.rarity;
            if (!acc[rarity]) acc[rarity] = [];
            acc[rarity].push(current.item_name);
            return acc;
        }, {});
        res.json(lootByRarity);
    });
});

// TODO: Endpoint for starting a dungeon run /api/game/dungeons/:dungeonId/enter (POST)
// This would return the full dungeon details including encounter_sequence and perhaps create a dungeon instance ID.

// TODO: Endpoint for submitting dungeon run results /api/game/dungeons/complete (POST)
// Body would contain dungeon_id, xp_gained, money_gained, items_looted ([{item_id, quantity}])
// Server would validate and update player data.

// --- Game Enemy Management API Endpoints ---
// GET all enemies
app.get('/api/admin/enemies', [authenticateToken, authorizeAdmin], (req, res) => {
    db.all("SELECT * FROM game_enemies ORDER BY name", [], (err, enemies) => {
        if (err) { console.error("DB error fetching enemies:", err.message); return res.status(500).json({ message: "Server error." }); }
        res.json(enemies.map(en => ({...en, data: en.data ? JSON.parse(en.data) : {} })));
    });
});

// GET a single enemy
app.get('/api/admin/enemies/:enemyId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { enemyId } = req.params;
    db.get("SELECT * FROM game_enemies WHERE enemy_id = ?", [enemyId], (err, enemy) => {
        if (err) { console.error("DB err:", err.message); return res.status(500).json({ message: "Server error." }); }
        if (!enemy) return res.status(404).json({ message: "Enemy not found." });
        res.json({...enemy, data: enemy.data ? JSON.parse(enemy.data) : {} });
    });
});

// POST a new enemy
app.post('/api/admin/enemies', [authenticateToken, authorizeAdmin], (req, res) => {
    const { enemy_id, name, description, avatar_url, health, attack, defense, xp_reward, money_drop_min, money_drop_max, data } = req.body;
    if (!enemy_id || !name || health === undefined || attack === undefined || defense === undefined || xp_reward === undefined) {
        return res.status(400).json({ message: "Enemy ID, Name, Health, Attack, Defense, XP Reward are required." });
    }
    let dataString; try { dataString = data ? JSON.stringify(data) : null; } catch (e) { return res.status(400).json({ message: "Invalid JSON for data."}); }
    const stmt = `INSERT INTO game_enemies (enemy_id, name, description, avatar_url, health, attack, defense, xp_reward, money_drop_min, money_drop_max, data, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    db.run(stmt, [enemy_id, name, description, avatar_url, parseInt(health), parseInt(attack), parseInt(defense), parseInt(xp_reward), parseInt(money_drop_min) || 0, parseInt(money_drop_max) || 0, dataString], function(err) {
        if (err) { if(err.message.includes('UNIQUE')) return res.status(409).json({message:'Enemy ID exists.'}); console.error("DB err:",err.message); return res.status(500).json({message:'Server err.'});}
        logAdminAction(req.user.username, 'ENEMY_CREATE', enemy_id, req.body);
        res.status(201).json({ message: "Enemy created.", enemyId: enemy_id });
    });
});

// PUT update an enemy
app.put('/api/admin/enemies/:enemyId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { enemyId } = req.params;
    const { name, description, avatar_url, health, attack, defense, xp_reward, money_drop_min, money_drop_max, data } = req.body;
    if (!name || health === undefined || attack === undefined || defense === undefined || xp_reward === undefined) return res.status(400).json({ message: "Name, Health, Attack, Defense, XP Reward required." });
    let dataString; try { dataString = data?JSON.stringify(data):null; } catch(e){return res.status(400).json({message:"Invalid JSON for data"});}
    const stmt = `UPDATE game_enemies SET name=?, description=?, avatar_url=?, health=?, attack=?, defense=?, xp_reward=?, money_drop_min=?, money_drop_max=?, data=?, updated_at=CURRENT_TIMESTAMP WHERE enemy_id=?`;
    db.run(stmt, [name, description, avatar_url, parseInt(health), parseInt(attack), parseInt(defense), parseInt(xp_reward), parseInt(money_drop_min)||0, parseInt(money_drop_max)||0, dataString, enemyId], function(err){
        if(err){console.error("DB err:",err.message); return res.status(500).json({message:'Server err.'});}
        if(this.changes === 0) return res.status(404).json({message:'Enemy not found.'});
        logAdminAction(req.user.username, 'ENEMY_UPDATE', enemyId, req.body);
        res.json({ message: `Enemy ${enemyId} updated.` });
    });
});

// DELETE an enemy
app.delete('/api/admin/enemies/:enemyId', [authenticateToken, authorizeAdmin], (req, res) => {
    const { enemyId } = req.params;
    // Consider implications: what if this enemy is part of a dungeon's encounter_sequence?
    db.run("DELETE FROM game_enemies WHERE enemy_id = ?", [enemyId], function(err) {
        if(err){console.error("DB err:",err.message); return res.status(500).json({message:'Server err.'});}
        if(this.changes === 0) return res.status(404).json({message:'Enemy not found.'});
        logAdminAction(req.user.username, 'ENEMY_DELETE', enemyId);
        res.json({ message: `Enemy ${enemyId} deleted.` });
    });
});

// --- Dungeon Gameplay API Endpoints ---

// GET /api/game/dungeons/:dungeonId/enter
app.get('/api/game/dungeons/:dungeonId/enter', authenticateToken, (req, res) => {
    const { dungeonId } = req.params;
    const { id: userId, username: playerUsername } = req.user;

    db.get("SELECT * FROM game_dungeons WHERE dungeon_id = ?", [dungeonId], async (err, dungeon) => {
        if (err) {
            console.error(`DB error fetching dungeon ${dungeonId} for entry by ${playerUsername}:`, err.message);
            return res.status(500).json({ message: "Server error preparing dungeon." });
        }
        if (!dungeon) {
            return res.status(404).json({ message: "Dungeon not found." });
        }

        try {
            const encounterSequence = JSON.parse(dungeon.encounter_sequence || '[]');
            const populatedEncounterSequence = [];

            for (const encounter of encounterSequence) {
                if (encounter.type === "mob" || encounter.type === "boss") {
                    const enemyDetails = await new Promise((resolve, reject) => {
                        db.get("SELECT * FROM game_enemies WHERE enemy_id = ?", [encounter.enemy_id], (enemyErr, enemy) => {
                            if (enemyErr) {
                                console.error(`Error fetching enemy ${encounter.enemy_id} for dungeon ${dungeonId}:`, enemyErr.message);
                                return reject(new Error(`Could not load enemy details for ${encounter.enemy_id}.`));
                            }
                            if (!enemy) {
                                return reject(new Error(`Enemy ${encounter.enemy_id} not found in database.`));
                            }
                            // Parse 'data' if it exists
                            const enemyData = enemy.data ? JSON.parse(enemy.data) : {};
                            resolve({...enemy, data: enemyData});
                        });
                    });
                    // Create multiple instances if count > 1 for mobs
                    const enemiesInEncounter = [];
                    const count = encounter.type === "mob" ? (encounter.count || 1) : 1; // Bosses are unique
                    for (let i = 0; i < count; i++) {
                         // Give each enemy instance a unique ID for client-side tracking during combat
                        enemiesInEncounter.push({ ...enemyDetails, instance_id: `${enemyDetails.enemy_id}_${i}` });
                    }
                    populatedEncounterSequence.push({ ...encounter, enemies: enemiesInEncounter });
                } else {
                    populatedEncounterSequence.push(encounter); // Pass through other encounter types
                }
            }
            
            const dungeonDataForClient = {
                ...dungeon,
                recommended_stats: JSON.parse(dungeon.recommended_stats || '{}'),
                encounter_sequence: populatedEncounterSequence
            };
            // TODO: Potentially log dungeon entry for player analytics or to create a "dungeon run instance"
            console.log(`Player ${playerUsername} (ID: ${userId}) is entering dungeon: ${dungeon.name}`);
            res.json(dungeonDataForClient);

        } catch (parseOrFetchError) {
            console.error(`Error processing dungeon ${dungeonId} for entry by ${playerUsername}:`, parseOrFetchError.message);
            return res.status(500).json({ message: `Error preparing dungeon: ${parseOrFetchError.message}` });
        }
    });
});

// POST /api/game/dungeons/complete
app.post('/api/game/dungeons/complete', authenticateToken, (req, res) => {
    const { dungeonId, encountersDefeated } = req.body; // encountersDefeated might contain list of enemies for XP/money calculation
    const { id: userId, username: playerUsername } = req.user;

    if (!dungeonId) return res.status(400).json({ message: "Dungeon ID is required." });

    // 1. Fetch player's current data (especially inventory, stats)
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, player) => {
        if (err || !player) {
            console.error(`Error fetching player ${playerUsername} for dungeon completion:`, err ? err.message : "Player not found");
            return res.status(err ? 500 : 404).json({ message: "Player data not found." });
        }

        // 2. Calculate Rewards (XP, Money)
        // For now, let's assume `encountersDefeated` is an array of enemy objects (or just their IDs and counts)
        // that were part of the dungeon run and actually defeated by the player.
        // This requires the client to send which enemies from which encounters were actually defeated.
        // OR, simpler for now: server just assumes ALL enemies in the dungeon's original sequence were defeated.
        
        let totalXpAwarded = 0;
        let totalMoneyAwarded = 0;
        const awardedItems = [];

        // Fetch the original dungeon encounter sequence to calculate total possible XP/money from enemies
        db.get("SELECT encounter_sequence FROM game_dungeons WHERE dungeon_id = ?", [dungeonId], async (dungeonErr, dungeonInfo) => {
            if (dungeonErr || !dungeonInfo) {
                console.error(`Error fetching dungeon info for rewards calc: ${dungeonId}`, dungeonErr ? dungeonErr.message : "Dungeon not found");
                return res.status(500).json({ message: "Could not calculate rewards due to server error." });
            }

            try {
                const encounterSequence = JSON.parse(dungeonInfo.encounter_sequence || '[]');
                for (const encounter of encounterSequence) {
                    if (encounter.enemy_id) { // Check if it's an enemy encounter
                        const enemyData = await new Promise((resolve, reject) => {
                            db.get("SELECT xp_reward, money_drop_min, money_drop_max FROM game_enemies WHERE enemy_id = ?", [encounter.enemy_id], (eErr, eData) => {
                                if (eErr || !eData) reject(new Error(`Enemy ${encounter.enemy_id} not found for reward calc.`));
                                else resolve(eData);
                            });
                        });
                        const count = encounter.count || 1;
                        totalXpAwarded += (enemyData.xp_reward || 0) * count;
                        for (let i=0; i<count; i++) { // Roll money for each enemy instance
                             totalMoneyAwarded += Math.floor(Math.random() * ((enemyData.money_drop_max || 0) - (enemyData.money_drop_min || 0) + 1)) + (enemyData.money_drop_min || 0);
                        }
                    }
                }
            } catch (calcError) {
                 console.error(`Error calculating base XP/Money for dungeon ${dungeonId}:`, calcError.message);
                 // Continue, but XP/Money from enemies might be 0
            }

            // 3. Calculate Loot
            db.all("SELECT item_id, drop_chance, min_quantity, max_quantity FROM dungeon_loot_tables WHERE dungeon_id = ?", [dungeonId], (lootErr, lootTable) => {
                if (lootErr) {
                    console.error(`Error fetching loot table for dungeon ${dungeonId}:`, lootErr.message);
                    // Proceed without loot if table fetch fails, or return error
                } else if (lootTable) {
                    lootTable.forEach(lootEntry => {
                        if (Math.random() < lootEntry.drop_chance) {
                            const quantity = Math.floor(Math.random() * (lootEntry.max_quantity - lootEntry.min_quantity + 1)) + lootEntry.min_quantity;
                            awardedItems.push({ item_id: lootEntry.item_id, quantity: quantity });
                        }
                    });
                }

                // 4. Update Player Data
                let currentInventory = JSON.parse(player.inventory || '[]');
                awardedItems.forEach(newItem => {
                    const existingItemIndex = currentInventory.findIndex(invItem => invItem.item_id === newItem.item_id);
                    if (existingItemIndex > -1) {
                        // Check if item is stackable from game_items master list (important!)
                        // For now, assume all found items are stackable if they exist. A proper check is needed.
                        currentInventory[existingItemIndex].quantity += newItem.quantity;
                    } else {
                        currentInventory.push(newItem);
                    }
                });

                const newXp = (player.xp || 0) + totalXpAwarded; // Assuming 'xp' column exists
                const newMoney = player.money + totalMoneyAwarded;
                // TODO: Add level up logic based on newXp if 'xp' and 'xp_to_next_level' columns exist

                const updateStmt = `UPDATE users SET money = ?, xp = ?, inventory = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?`;
                db.run(updateStmt, [newMoney, newXp, JSON.stringify(currentInventory), userId], function(updateErr) {
                    if (updateErr) {
                        console.error(`Error updating player ${playerUsername} after dungeon ${dungeonId}:`, updateErr.message);
                        return res.status(500).json({ message: "Error saving player progression." });
                    }
                    console.log(`Player ${playerUsername} completed dungeon ${dungeonId}. XP: +${totalXpAwarded}, Money: +${totalMoneyAwarded}, Items: ${awardedItems.length}`);
                    res.json({
                        message: `Dungeon ${dungeonId} completed!`,
                        xp_awarded: totalXpAwarded,
                        money_awarded: totalMoneyAwarded,
                        items_awarded: awardedItems,
                        // Send back updated totals for client to refresh UI immediately
                        new_total_xp: newXp,
                        new_total_money: newMoney,
                        new_inventory: currentInventory
                    });
                });
            });
        });
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
