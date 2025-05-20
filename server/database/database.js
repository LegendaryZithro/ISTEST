const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Define the path to the database file
const dbPath = path.resolve(__dirname, 'pbbg.sqlite');

// Connect to SQLite database. The file will be created if it doesn't exist.
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        // If DB fails to open, we probably can't do much else, so maybe exit or throw
    } else {
        console.log('Connected to the SQLite database.');
        initializeDbAndEnsureAdmin();
    }
});

// Function to initialize database schema
function initializeDbAndEnsureAdmin() {
    db.serialize(() => {
        // Create Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'player',
                avatar_url TEXT DEFAULT 'https://via.placeholder.com/150/1a1a1a/d4ac6e?text=Avatar',
                level INTEGER DEFAULT 1,
                money INTEGER DEFAULT 100,
                energy INTEGER DEFAULT 100,
                max_energy INTEGER DEFAULT 100,
                nerve INTEGER DEFAULT 10,
                max_nerve INTEGER DEFAULT 10,
                strength INTEGER DEFAULT 1,
                agility INTEGER DEFAULT 1,
                rank TEXT DEFAULT 'Neophyte',
                inventory TEXT DEFAULT '[]', -- Storing as JSON string for player's specific items (id, quantity)
                xp INTEGER DEFAULT 0, -- Added for experience points
                is_banned INTEGER DEFAULT 0,
                is_muted INTEGER DEFAULT 0,
                mute_until DATETIME DEFAULT NULL,
                is_bot INTEGER DEFAULT 0,           -- New field for bot flag
                last_login DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error("Error creating/altering users table", err.message);
            else {
                console.log("Users table schema checked/updated.");
                // Add new columns if they don't exist (for existing databases)
                addColumnIfNotExists('users', 'is_banned', 'INTEGER DEFAULT 0');
                addColumnIfNotExists('users', 'is_muted', 'INTEGER DEFAULT 0');
                addColumnIfNotExists('users', 'mute_until', 'DATETIME DEFAULT NULL');
                addColumnIfNotExists('users', 'is_bot', 'INTEGER DEFAULT 0'); // Add is_bot if not exists
                addColumnIfNotExists('users', 'xp', 'INTEGER DEFAULT 0'); // Add xp if not exists
            }
        });

        // Create Game Items table (Master List of all possible items)
        db.run(`
            CREATE TABLE IF NOT EXISTS game_items (
                item_id TEXT PRIMARY KEY NOT NULL, -- e.g., "sword_01", "potion_heal_minor"
                name TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL, -- e.g., "weapon", "armor", "consumable", "collectible", "currency"
                effects TEXT,       -- JSON string, e.g., {"attack": 5, "defense": 2} or {"heal": 20}
                value INTEGER DEFAULT 0,  -- Gold value for buying/selling
                image_url TEXT,     -- Optional path to an item image
                stackable INTEGER DEFAULT 0, -- 0 for false, 1 for true
                data TEXT           -- Any other custom JSON data for the item
            )
        `, (err) => {
            if (err) console.error("Error creating game_items table", err.message);
            else {
                console.log("Game_items table checked/created.");
                db.get("SELECT COUNT(*) as count FROM game_items", (err, row) => {
                    if (err) { console.error("Error checking game_items count:", err.message); return; }
                    if (row && row.count === 0) {
                        seedDefaultItems();
                    }
                });
            }
        });

        // Create NPCs table
        db.run(`
            CREATE TABLE IF NOT EXISTS npcs (
                npc_id TEXT PRIMARY KEY NOT NULL,      -- e.g., "guard_elara", "merchant_borin"
                name TEXT NOT NULL,                  -- e.g., "Elara the Guard", "Borin Stonebeard"
                description TEXT,                    -- Short description or flavor text
                dialogue TEXT,                       -- Simple initial dialogue or greeting string
                avatar_url TEXT,                     -- Optional URL for an NPC image
                location_id TEXT,                    -- Placeholder for future location system, can be NULL
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error("Error creating npcs table", err.message);
            } else {
                console.log("NPCs table checked/created.");
                // Optionally seed a default NPC if the table is new
                db.get("SELECT COUNT(*) as count FROM npcs", (errCount, row) => {
                    if (errCount) { console.error("Error checking npcs count:", errCount.message); return; }
                    if (row && row.count === 0) {
                        seedDefaultNpcs();
                    }
                });
            }
        });

        // Create Game Quests table
        db.run(`
            CREATE TABLE IF NOT EXISTS game_quests (
                quest_id TEXT PRIMARY KEY NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                objectives_summary TEXT, -- Simple text summary of objectives
                prerequisites TEXT,      -- JSON string: {"level_required": 5, "quest_required": "other_quest_id"}
                rewards TEXT,            -- JSON string: {"xp": 100, "money": 50, "item_ids": ["item_id1", "item_id2"]}
                start_npc_id TEXT,       -- Optional FK to npcs.npc_id
                end_npc_id TEXT,         -- Optional FK to npcs.npc_id
                is_repeatable INTEGER DEFAULT 0, -- 0 for false, 1 for true
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (start_npc_id) REFERENCES npcs(npc_id) ON DELETE SET NULL,
                FOREIGN KEY (end_npc_id) REFERENCES npcs(npc_id) ON DELETE SET NULL
            )
        `, (err) => {
            if (err) {
                console.error("Error creating game_quests table", err.message);
            } else {
                console.log("Game_quests table checked/created.");
                db.get("SELECT COUNT(*) as count FROM game_quests", (errCount, row) => {
                    if (errCount) { console.error("Error checking game_quests count:", errCount.message); return; }
                    if (row && row.count === 0) {
                        seedDefaultQuests();
                    }
                });
            }
        });

        // Create Game Config table
        db.run(`
            CREATE TABLE IF NOT EXISTS game_config (
                config_key TEXT PRIMARY KEY NOT NULL,
                config_value TEXT, -- Store all values as text, parse in application logic
                description TEXT,    -- Optional description of the setting
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error("Error creating game_config table", err.message);
            } else {
                console.log("Game_config table checked/created.");
                db.get("SELECT COUNT(*) as count FROM game_config", (errCount, row) => {
                    if (errCount) { console.error("Error checking game_config count:", errCount.message); return; }
                    if (row && row.count === 0) {
                        seedDefaultGameConfigs();
                    }
                });
            }
        });

        // Create Game Locations table
        db.run(`
            CREATE TABLE IF NOT EXISTS game_locations (
                location_id TEXT PRIMARY KEY NOT NULL, -- e.g., "town_square", "old_cellar"
                name TEXT NOT NULL,                 -- e.g., "Town Square", "Old Cellar"
                description TEXT,                   -- Flavor text for the location
                connections TEXT,                   -- JSON string, e.g., {"north": "market_district", "south": "town_gate"}
                image_url TEXT,                     -- Optional URL for a background or map snippet for the location
                data TEXT,                          -- JSON string for other custom properties (e.g., {"is_safe_zone": true})
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error("Error creating game_locations table", err.message);
            } else {
                console.log("Game_locations table checked/created.");
                db.get("SELECT COUNT(*) as count FROM game_locations", (errCount, row) => {
                    if (errCount) { console.error("Error checking game_locations count:", errCount.message); return; }
                    if (row && row.count === 0) {
                        seedDefaultLocations();
                    }
                });
            }
        });

        // Create Admin Actions Log table
        db.run(`
            CREATE TABLE IF NOT EXISTS admin_actions_log (
                log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_username TEXT NOT NULL,
                action_type TEXT NOT NULL,      -- e.g., "USER_ROLE_UPDATE", "ITEM_CREATE", "NPC_DELETE"
                target_id TEXT,                 -- Optional: username, item_id, npc_id, quest_id, location_id, config_key
                details TEXT,                   -- JSON string for old_value, new_value, or other parameters
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error("Error creating admin_actions_log table", err.message);
            else console.log("Admin_actions_log table checked/created.");
        });

        // Create Chat Messages table
        db.run(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                message_id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL DEFAULT 'global',
                user_id INTEGER NOT NULL,
                username TEXT NOT NULL,
                message_content TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error("Error creating chat_messages table:", err.message);
            else console.log("Chat_messages table checked/created.");
        });
        db.run("CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages (timestamp DESC)", e=>e&&console.error("idx_chat_timestamp err", e.message));
        db.run("CREATE INDEX IF NOT EXISTS idx_chat_channel_timestamp ON chat_messages (channel, timestamp DESC)", e=>e&&console.error("idx_chat_channel_timestamp err", e.message));

        // Create Game Dungeons table
        db.run(`
            CREATE TABLE IF NOT EXISTS game_dungeons (
                dungeon_id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                image_url TEXT,                             -- For a banner or entrance image
                recommended_level INTEGER DEFAULT 1,
                recommended_stats TEXT,                     -- JSON: {"strength": 20, "agility": 15}
                encounter_sequence TEXT,                -- JSON: [{"type": "mob", "npc_id": "goblin_warrior", "count": 3}, {"type": "boss", "npc_id": "goblin_king"}]
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error("Error creating game_dungeons table:", err.message);
            else {
                console.log("Game_dungeons table checked/created.");
                db.get("SELECT COUNT(*) as count FROM game_dungeons", (e,r) => { if(e)return; if(r && r.count === 0) seedDefaultDungeons(); });
            }
        });

        // Create Dungeon Loot Tables
        db.run(`
            CREATE TABLE IF NOT EXISTS dungeon_loot_tables (
                loot_table_id INTEGER PRIMARY KEY AUTOINCREMENT,
                dungeon_id TEXT NOT NULL,
                item_id TEXT NOT NULL,          -- FK to game_items.item_id
                rarity TEXT NOT NULL DEFAULT 'common', -- e.g., common, uncommon, rare, legendary, mythical
                drop_chance REAL NOT NULL DEFAULT 0.1, -- Probability (0.0 to 1.0)
                min_quantity INTEGER DEFAULT 1,
                max_quantity INTEGER DEFAULT 1,
                FOREIGN KEY (dungeon_id) REFERENCES game_dungeons(dungeon_id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES game_items(item_id) ON DELETE CASCADE 
            )
        `, (err) => {
            if (err) console.error("Error creating dungeon_loot_tables table:", err.message);
            else console.log("Dungeon_loot_tables table checked/created.");
        });
        db.run("CREATE INDEX IF NOT EXISTS idx_dungeon_loot_dungeon_id ON dungeon_loot_tables (dungeon_id)");

        // Create Game Enemies table
        db.run(`
            CREATE TABLE IF NOT EXISTS game_enemies (
                enemy_id TEXT PRIMARY KEY NOT NULL, -- e.g., "goblin_grunt", "forest_spider"
                name TEXT NOT NULL,
                description TEXT,
                avatar_url TEXT, -- Optional image for the enemy
                health INTEGER NOT NULL DEFAULT 10,
                attack INTEGER NOT NULL DEFAULT 2,
                defense INTEGER NOT NULL DEFAULT 0,
                xp_reward INTEGER DEFAULT 5,
                money_drop_min INTEGER DEFAULT 0,
                money_drop_max INTEGER DEFAULT 5,
                -- loot_table_id TEXT, -- Optional: for specific loot table different from dungeon's general loot
                data TEXT,            -- JSON for other attributes like resistances, abilities, etc.
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error("Error creating game_enemies table:", err.message);
            else {
                console.log("Game_enemies table checked/created.");
                db.get("SELECT COUNT(*) as count FROM game_enemies", (e,r) => { 
                    if(e) { console.error("Error checking game_enemies count:", e.message); return; }
                    if(r && r.count === 0) seedDefaultEnemies(); 
                });
            }
        });

        // Call ensureZithroIsAdmin after table creation attempts are queued.
        // It has its own error handling for fetching Zithro.
        ensureZithroIsAdmin(); 

    });
}

// Helper function to add a column to a table if it doesn't already exist
function addColumnIfNotExists(tableName, columnName, columnDefinition) {
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
        if (err) {
            console.error(`Error fetching table info for ${tableName}:`, err.message);
            return;
        }
        const columnExists = columns.some(col => col.name === columnName);
        if (!columnExists) {
            db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`, (alterErr) => {
                if (alterErr) {
                    console.error(`Error adding column ${columnName} to ${tableName}:`, alterErr.message);
                } else {
                    console.log(`Column ${columnName} added to ${tableName} table.`);
                }
            });
        }
    });
}

function seedDefaultItems() {
    const items = [
        { item_id: 'sword_001', name: 'Rusty Sword', description: 'An old, dull sword.', type: 'weapon', effects: JSON.stringify({ attack: 3 }), value: 10, stackable: 0 },
        { item_id: 'potion_heal_01', name: 'Minor Healing Potion', description: 'Restores a small amount of health.', type: 'consumable', effects: JSON.stringify({ heal: 25 }), value: 15, stackable: 1 },
        { item_id: 'trinket_01', name: 'Cheap Trinket', description: 'A small, valueless trinket.', type: 'collectible', effects: JSON.stringify({}), value: 1, stackable: 0 },
        { item_id: 'lockpick_01', name: 'Lockpick', description: 'A simple lockpick for sticky situations.', type: 'tool', effects: JSON.stringify({ bonus_pickpocket: 0.15 }), value: 50, stackable: 1 }
    ];
    const stmt = db.prepare("INSERT OR IGNORE INTO game_items (item_id, name, description, type, effects, value, stackable) VALUES (?, ?, ?, ?, ?, ?, ?)");
    items.forEach(item => { stmt.run(item.item_id, item.name, item.description, item.type, item.effects, item.value, item.stackable, (errRun) => { if(errRun) console.error("Error seeding item:", item.name, errRun.message); }); });
    stmt.finalize((errFinalize) => { if(errFinalize) console.error("Error finalizing seed items stmt:", errFinalize.message); else console.log("Default items seeding attempted."); });
}

function seedDefaultNpcs() {
    const npcs = [
        {
            npc_id: "town_guard_01",
            name: "Guard Marcus",
            description: "A stern-looking guard, always vigilant.",
            dialogue: "Halt! State your business. The shadows are not kind to the unwary.",
            avatar_url: "https://via.placeholder.com/100/333333/FFFFFF?text=Guard"
        },
        {
            npc_id: "shady_merchant_01",
            name: "Silas 'Quickfingers'",
            description: "A merchant who seems to procure items through... unconventional means.",
            dialogue: "Psst, interested in something... special? I have wares others dare not stock.",
            avatar_url: "https://via.placeholder.com/100/554433/FFFFFF?text=Merchant"
        }
    ];

    const stmt = db.prepare("INSERT OR IGNORE INTO npcs (npc_id, name, description, dialogue, avatar_url) VALUES (?, ?, ?, ?, ?)");
    npcs.forEach(npc => {
        stmt.run(npc.npc_id, npc.name, npc.description, npc.dialogue, npc.avatar_url, (errRun) => {
            if(errRun) console.error("Error seeding NPC:", npc.name, errRun.message);
        });
    });
    stmt.finalize((errFinalize) => {
        if(errFinalize) console.error("Error finalizing seed NPCs stmt:", errFinalize.message);
        else console.log("Default NPCs seeded if table was empty.");
    });
}

function seedDefaultQuests() {
    const quests = [
        {
            quest_id: "tutorial_kill_rats",
            title: "Rat Extermination",
            description: "The old cellar is infested with giant rats! Clear them out.",
            objectives_summary: "Defeat 5 Giant Rats in the Old Cellar.",
            prerequisites: JSON.stringify({ level_required: 1 }),
            rewards: JSON.stringify({ xp: 50, money: 25, item_ids: ["potion_heal_01"] }),
            start_npc_id: "town_guard_01", // Assuming Guard Marcus gives this quest
            end_npc_id: "town_guard_01"
        },
        {
            quest_id: "fetch_herb",
            title: "Herbal Remedy",
            description: "The village healer needs a rare Moonpetal herb from the Whispering Woods.",
            objectives_summary: "Retrieve 1 Moonpetal Herb.",
            prerequisites: JSON.stringify({ level_required: 3 }),
            rewards: JSON.stringify({ xp: 120, money: 75 }),
            start_npc_id: "shady_merchant_01", // Silas might know about this...
            end_npc_id: "shady_merchant_01"
        }
    ];
    const stmt = db.prepare("INSERT OR IGNORE INTO game_quests (quest_id, title, description, objectives_summary, prerequisites, rewards, start_npc_id, end_npc_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    quests.forEach(q => {
        stmt.run(q.quest_id, q.title, q.description, q.objectives_summary, q.prerequisites, q.rewards, q.start_npc_id, q.end_npc_id, (errRun) => {
            if(errRun) console.error("Error seeding quest:", q.title, errRun.message);
        });
    });
    stmt.finalize((errFinalize) => {
        if(errFinalize) console.error("Error finalizing seed quests stmt:", errFinalize.message);
        else console.log("Default quests seeded if table was empty.");
    });
}

function seedDefaultGameConfigs() {
    const configs = [
        { key: 'ENERGY_REGEN_RATE', value: '1', description: 'Energy points regenerated per tick.' },
        { key: 'NERVE_REGEN_RATE', value: '1', description: 'Nerve points regenerated per tick.' },
        { key: 'TICK_INTERVAL', value: '1000', description: 'Game loop tick interval in milliseconds.' },
        { key: 'RANDOM_EVENT_CHANCE', value: '0.01', description: 'Chance (0.0 to 1.0) of a random event per tick.' },
        { key: 'DEFAULT_PLAYER_MONEY', value: '100', description: 'Starting money for new players.' },
        { key: 'DEFAULT_PLAYER_ENERGY', value: '100', description: 'Starting energy for new players.' },
        { key: 'DEFAULT_PLAYER_NERVE', value: '10', description: 'Starting nerve for new players.' },
        // Add more for crime success rates, experience points, etc. as needed
        { key: 'CRIME_SHOPLIFT_SUCCESS', value: '0.90', description: 'Base success rate for shoplifting.' },
        { key: 'CRIME_SHOPLIFT_MIN_REWARD', value: '5', description: 'Min money from shoplifting.' },
        { key: 'CRIME_SHOPLIFT_MAX_REWARD', value: '20', description: 'Max money from shoplifting.' }
    ];

    const stmt = db.prepare("INSERT OR IGNORE INTO game_config (config_key, config_value, description, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)");
    configs.forEach(conf => {
        stmt.run(conf.key, conf.value, conf.description, (errRun) => {
            if(errRun) console.error("Error seeding game_config:", conf.key, errRun.message);
        });
    });
    stmt.finalize((errFinalize) => {
        if(errFinalize) console.error("Error finalizing seed game_config stmt:", errFinalize.message);
        else console.log("Default game configurations seeded if table was empty.");
    });
}

function seedDefaultLocations() {
    const locations = [
        {
            location_id: "town_square_01",
            name: "Whispering Gulch Town Square",
            description: "The dusty, central hub of a forgotten frontier town. A weathered fountain stands silent in its center.",
            connections: JSON.stringify({
                "north": { "to_location_id": "general_store_01", "description": "Path to the General Store" },
                "east": { "to_location_id": "saloon_01", "description": "Entrance to the Thirsty Prospector Saloon" }
            }),
            image_url: "https://via.placeholder.com/800x400/705030/FFFFFF?text=Town+Square",
            data: JSON.stringify({ "is_safe_zone": true, "ambient_sound": "town_square_ambience.ogg" })
        },
        {
            location_id: "general_store_01",
            name: "Dusty Barrel General Store",
            description: "Shelves stocked with provisions, tools, and whispered rumors. Run by Silas 'Quickfingers'.",
            connections: JSON.stringify({
                "south": { "to_location_id": "town_square_01", "description": "Back to the Town Square" }
            }),
            image_url: "https://via.placeholder.com/800x400/8B4513/FFFFFF?text=General+Store",
            data: JSON.stringify({ "is_shop": true, "npc_ids": ["shady_merchant_01"] })
        }
    ];

    const stmt = db.prepare("INSERT OR IGNORE INTO game_locations (location_id, name, description, connections, image_url, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
    locations.forEach(loc => {
        stmt.run(loc.location_id, loc.name, loc.description, loc.connections, loc.image_url, loc.data, (errRun) => {
            if(errRun) console.error("Error seeding location:", loc.name, errRun.message);
        });
    });
    stmt.finalize((errFinalize) => {
        if(errFinalize) console.error("Error finalizing seed locations stmt:", errFinalize.message);
        else console.log("Default locations seeded if table was empty.");
    });
}

function seedDefaultDungeons() {
    const dungeons = [
        {
            dungeon_id: "limely_forest_01",
            name: "Limely Forest",
            description: "A surprisingly verdant forest, rumored to be haunted by mischievous sprites and an overgrown beast.",
            image_url: "https://via.placeholder.com/800x300/228B22/FFFFFF?text=Limely+Forest",
            recommended_level: 1,
            recommended_stats: JSON.stringify({ strength: 5, agility: 5 }),
            encounter_sequence: JSON.stringify([
                { type: "mob", enemy_id: "forest_sprite", count: 3, description: "A clearing reveals several flitting sprites." },
                { type: "mob", enemy_id: "angry_badger", count: 2, description: "The path is blocked by angry badgers!" },
                { type: "boss", enemy_id: "overgrown_golem", description: "A massive, moss-covered golem lumbers into view!" }
            ])
        }
    ];
    const dungeonStmt = db.prepare("INSERT OR IGNORE INTO game_dungeons (dungeon_id, name, description, image_url, recommended_level, recommended_stats, encounter_sequence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
    dungeons.forEach(d => {
        dungeonStmt.run(d.dungeon_id, d.name, d.description, d.image_url, d.recommended_level, d.recommended_stats, d.encounter_sequence, (err) => {
            if(err) console.error("Error seeding dungeon:", d.name, err.message);
            else { // Seed loot for this dungeon
                if (d.dungeon_id === "limely_forest_01") {
                    const loot = [
                        { dungeon_id: "limely_forest_01", item_id: "trinket_01", rarity: "common", drop_chance: 0.5, min_q: 1, max_q: 2 },
                        { dungeon_id: "limely_forest_01", item_id: "potion_heal_01", rarity: "uncommon", drop_chance: 0.2, min_q: 1, max_q: 1 },
                        // No rare/legendary/mythical for this beginner dungeon yet
                    ];
                    const lootStmt = db.prepare("INSERT INTO dungeon_loot_tables (dungeon_id, item_id, rarity, drop_chance, min_quantity, max_quantity) VALUES (?, ?, ?, ?, ?, ?)");
                    loot.forEach(l => lootStmt.run(l.dungeon_id, l.item_id, l.rarity, l.drop_chance, l.min_q, l.max_q, e => e && console.error("Loot seed err:", e.message)));
                    lootStmt.finalize(e => e && console.error("Loot stmt finalize err:", e.message));
                }
            }
        });
    });
    dungeonStmt.finalize((err) => {
        if(err) console.error("Error finalizing seed dungeons stmt:", err.message);
        else console.log("Default dungeons and their loot seeded if table was empty.");
    });
}

function seedDefaultEnemies() {
    const enemies = [
        {
            enemy_id: "forest_sprite", name: "Forest Sprite", description: "A small, mischievous nature spirit.",
            health: 15, attack: 3, defense: 1, xp_reward: 5, money_drop_min: 0, money_drop_max: 2,
            avatar_url: "https://via.placeholder.com/80/90EE90/000000?text=Sprite"
        },
        {
            enemy_id: "angry_badger", name: "Angry Badger", description: "Surprisingly ferocious for its size.",
            health: 25, attack: 5, defense: 2, xp_reward: 10, money_drop_min: 1, money_drop_max: 5,
            avatar_url: "https://via.placeholder.com/80/A0522D/FFFFFF?text=Badger"
        },
        {
            enemy_id: "overgrown_golem", name: "Overgrown Golem", description: "An ancient stone sentinel animated by forest magic.",
            health: 100, attack: 10, defense: 5, xp_reward: 50, money_drop_min: 10, money_drop_max: 25,
            avatar_url: "https://via.placeholder.com/100/556B2F/FFFFFF?text=Golem"
        }
    ];
    const stmt = db.prepare("INSERT OR IGNORE INTO game_enemies (enemy_id, name, description, health, attack, defense, xp_reward, money_drop_min, money_drop_max, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    enemies.forEach(en => {
        stmt.run(en.enemy_id, en.name, en.description, en.health, en.attack, en.defense, en.xp_reward, en.money_drop_min, en.money_drop_max, en.avatar_url, (err) => {
            if(err) console.error("Error seeding enemy:", en.name, err.message);
        });
    });
    stmt.finalize(err => {
        if(err) console.error("Error finalizing seed enemies stmt:", err.message);
        else console.log("Default enemies seeded.");
    });
}

function ensureZithroIsAdmin() {
    const adminUsername = 'Zithro';
    db.get("SELECT role, money, level, is_banned, is_muted, is_bot, xp FROM users WHERE LOWER(username) = LOWER(?)", [adminUsername], (err, row) => {
        if (err) { console.error("Error fetching Zithro for admin check:", err.message); return; }
        if (row) { 
            let updates = []; const params = [];
            if (row.role !== 'admin') { updates.push("role = ?"); params.push('admin'); console.log(`Updating Zithro role.`); }
            if (row.money === 100 && row.level === 1) { 
                updates.push("money = ?", "energy = ?", "max_energy = ?", "nerve = ?", "max_nerve = ?", "strength = ?", "agility = ?", "xp = ?");
                params.push(100000,1000,1000,100,100,50,50, 0); console.log(`Boosting Zithro stats.`);
            }
            if (row.is_banned !== 0) { updates.push("is_banned = ?"); params.push(0); }
            if (row.is_muted !== 0) { updates.push("is_muted = ?"); params.push(0); }
            if (row.mute_until !== null) { updates.push("mute_until = ?"); params.push(null); }
            if (row.is_bot !== 0) { updates.push("is_bot = ?"); params.push(0); } // Ensure Zithro is not a bot by this script

            if (updates.length > 0) {
                let updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE LOWER(username) = LOWER(?)`;
                params.push(adminUsername);
                db.run(updateQuery, params, function(errUpdate) { 
                    if (errUpdate) console.error("Error updating Zithro:", errUpdate.message);
                    else if (this.changes > 0) console.log("Zithro account successfully configured as admin.");
                    else console.log("Zithro already admin or no update needed."); 
                });
            } else { console.log("Zithro already admin and configured. No update performed."); }
        } else { console.log("Zithro account not found. Will be created as admin upon registration."); }
    });
}

// Export the database connection and any utility functions if needed later by other modules
// For now, server.js will directly use this 'db' instance for queries.
// Or, wrap DB operations in promises for cleaner async/await in server.js

// If this script is run directly (e.g., npm run init-db), it will just initialize.
if (require.main === module) {
    // This allows running `node server/database/database.js` or `npm run init-db` to ensure tables are created.
    // The db connection is already established above, and initializeDb() is called.
    // We might need to close it if this is run as a one-off script.
    // For now, server.js will require this and db will stay open while server runs.
    console.log('Database initialization and admin check script run.');
}

module.exports = db; // Export the db instance for use in server.js 
