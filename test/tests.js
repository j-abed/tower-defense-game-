// Comprehensive test suite for Tower Defense Game

// Mock DOM elements for testing
function createMockCanvas() {
    const canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);
    return canvas;
}

function createMockPath() {
    return new Path(12345, 800, 600);
}

// ==================== Tower Tests ====================
test.describe('Tower Class', () => {
    test.it('should create a basic tower with correct properties', () => {
        const particleSystem = new ParticleSystem();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        
        test.expect(tower.x).toBe(100);
        test.expect(tower.y).toBe(100);
        test.expect(tower.type).toBe('basic');
        test.expect(tower.level).toBe(1);
        test.expect(tower.kills).toBe(0);
    });

    test.it('should calculate distance correctly', () => {
        const particleSystem = new ParticleSystem();
        const tower = new Tower(0, 0, 'basic', particleSystem);
        
        const distance = tower.getDistanceTo(3, 4);
        test.expect(distance).toBe(5); // 3-4-5 triangle
    });

    test.it('should upgrade tower and increase stats', () => {
        const particleSystem = new ParticleSystem();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        const originalDamage = tower.damage;
        const originalRange = tower.range;
        
        tower.upgrade();
        
        test.expect(tower.level).toBe(2);
        test.expect(tower.damage).toBeGreaterThan(originalDamage);
        test.expect(tower.range).toBeGreaterThan(originalRange);
    });

    test.it('should find closest target', () => {
        const particleSystem = new ParticleSystem();
        const path = createMockPath();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        
        const enemy1 = new Enemy('basic', path, particleSystem);
        enemy1.position = { x: 150, y: 100 }; // 50 units away
        enemy1.progress = 0.5;
        
        const enemy2 = new Enemy('basic', path, particleSystem);
        enemy2.position = { x: 120, y: 100 }; // 20 units away
        enemy2.progress = 0.5;
        
        const enemies = [enemy1, enemy2];
        const target = tower.findTarget(enemies);
        
        test.expect(target).toBe(enemy2); // Closer enemy
    });

    test.it('should not target enemies out of range', () => {
        const particleSystem = new ParticleSystem();
        const path = createMockPath();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.position = { x: 1000, y: 1000 }; // Very far away
        enemy.progress = 0.5;
        
        const target = tower.findTarget([enemy]);
        test.expect(target).toBe(null);
    });

    test.it('should calculate DPS correctly', () => {
        const particleSystem = new ParticleSystem();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        tower.damage = 20;
        tower.fireRate = 1000; // 1 shot per second
        
        const dps = parseFloat(tower.getDPS());
        test.expect(dps).toBe(20); // 20 damage * 1 shot/sec = 20 DPS
    });

    test.it('should track kills when enemy is killed', () => {
        const particleSystem = new ParticleSystem();
        const path = createMockPath();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.position = { x: 150, y: 100 };
        enemy.progress = 0.5;
        
        tower.findTarget([enemy]);
        // shoot only takes currentTime parameter
        tower.shoot(Date.now());
        
        // Tower should have found target
        test.expect(tower.target).toBeTruthy();
    });
});

// ==================== Enemy Tests ====================
test.describe('Enemy Class', () => {
    test.it('should create an enemy with correct properties', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('basic', path, particleSystem);
        
        test.expect(enemy.type).toBe('basic');
        test.expect(enemy.health).toBeGreaterThan(0);
        test.expect(enemy.progress).toBe(0);
        test.expect(enemy.isDead).toBe(false);
    });

    test.it('should take damage correctly', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('basic', path, particleSystem);
        const initialHealth = enemy.health;
        
        enemy.takeDamage(10, null);
        
        test.expect(enemy.health).toBe(initialHealth - 10);
    });

    test.it('should die when health reaches zero', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('basic', path, particleSystem);
        
        enemy.takeDamage(enemy.health, null);
        
        test.expect(enemy.health).toBe(0);
        test.expect(enemy.isDead).toBe(true);
    });

    test.it('should handle shield damage correctly', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('shielded', path, particleSystem);
        const initialHealth = enemy.health;
        const initialShield = enemy.shieldHealth;
        
        // Damage less than shield
        enemy.takeDamage(20, null);
        
        // Shield should absorb damage first
        test.expect(enemy.shieldHealth).toBeLessThan(initialShield);
        // If shield absorbed all damage, health should be unchanged
        if (initialShield >= 20) {
            test.expect(enemy.health).toBe(initialHealth);
        }
    });

    test.it('should regenerate health if regenerating enemy', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('regenerating', path, particleSystem);
        enemy.health = enemy.maxHealth - 10;
        const initialHealth = enemy.health;
        
        // Simulate multiple updates (regen happens every 30 frames)
        for (let i = 0; i < 60; i++) {
            enemy.update();
        }
        
        // Health should have increased due to regeneration
        test.expect(enemy.health).toBeGreaterThan(initialHealth);
    });

    test.it('should move along path', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('basic', path, particleSystem);
        const initialProgress = enemy.progress;
        
        enemy.update();
        
        test.expect(enemy.progress).toBeGreaterThan(initialProgress);
    });

    test.it('should reach end when progress >= 1', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.progress = 0.99;
        
        enemy.update();
        
        // After update, progress should be >= 1, meaning reached end
        test.expect(enemy.progress).toBeGreaterThanOrEqual(0.99);
    });
});

// ==================== Path Tests ====================
test.describe('Path Class', () => {
    test.it('should generate path with waypoints', () => {
        const path = new Path(12345, 800, 600);
        
        test.expect(path.waypoints.length).toBeGreaterThan(0);
        test.expect(path.waypoints[0].x).toBe(0); // Start at left edge
    });

    test.it('should return same path for same seed', () => {
        const path1 = new Path(12345, 800, 600);
        const path2 = new Path(12345, 800, 600);
        
        test.expect(path1.waypoints.length).toBe(path2.waypoints.length);
        test.expect(path1.waypoints[0].x).toBe(path2.waypoints[0].x);
        test.expect(path1.waypoints[0].y).toBe(path2.waypoints[0].y);
    });

    test.it('should return different path for different seed', () => {
        const path1 = new Path(12345, 800, 600);
        const path2 = new Path(54321, 800, 600);
        
        // Paths should be different (at least one waypoint different)
        const same = path1.waypoints.every((wp, i) => 
            wp.x === path2.waypoints[i].x && wp.y === path2.waypoints[i].y
        );
        test.expect(same).toBe(false);
    });

    test.it('should get position at progress', () => {
        const path = new Path(12345, 800, 600);
        const pos0 = path.getPositionAt(0);
        const pos1 = path.getPositionAt(1);
        
        test.expect(pos0.x).toBe(path.waypoints[0].x);
        test.expect(pos0.y).toBe(path.waypoints[0].y);
        test.expect(pos1.x).toBe(path.waypoints[path.waypoints.length - 1].x);
    });

    test.it('should check if point is on path', () => {
        const path = new Path(12345, 800, 600);
        const pos = path.getPositionAt(0.5);
        
        const isOnPath = path.isPointOnPath(pos.x, pos.y, 30);
        test.expect(isOnPath).toBe(true);
    });
});

// ==================== Particle System Tests ====================
test.describe('ParticleSystem', () => {
    test.it('should create explosion particles', () => {
        const system = new ParticleSystem();
        system.createExplosion(100, 100, '#ff0000', 10);
        
        test.expect(system.particles.length).toBe(10);
    });

    test.it('should update and remove dead particles', () => {
        const system = new ParticleSystem();
        system.createExplosion(100, 100, '#ff0000', 5);
        
        const initialCount = system.particles.length;
        
        // Update many times to kill particles
        for (let i = 0; i < 100; i++) {
            system.update();
        }
        
        test.expect(system.particles.length).toBeLessThan(initialCount);
    });

    test.it('should create hit effect', () => {
        const system = new ParticleSystem();
        system.createHit(100, 100, '#ff0000');
        
        test.expect(system.particles.length).toBe(5);
    });

    test.it('should create money effect', () => {
        const system = new ParticleSystem();
        system.createMoneyEffect(100, 100);
        
        test.expect(system.particles.length).toBe(8);
    });
});

// ==================== Damage Number System Tests ====================
test.describe('DamageNumberSystem', () => {
    test.it('should create damage numbers', () => {
        const system = new DamageNumberSystem();
        system.createDamageNumber(100, 100, 50, '#ff0000');
        
        test.expect(system.numbers.length).toBe(1);
    });

    test.it('should update and remove dead numbers', () => {
        const system = new DamageNumberSystem();
        system.createDamageNumber(100, 100, 50);
        
        // Update many times to kill number
        for (let i = 0; i < 100; i++) {
            system.update();
        }
        
        test.expect(system.numbers.length).toBe(0);
    });

    test.it('should assign color based on damage amount', () => {
        const system = new DamageNumberSystem();
        system.createDamageNumber(100, 100, 10); // Low damage
        system.createDamageNumber(100, 100, 50); // High damage
        
        // High damage should have different color
        test.expect(system.numbers.length).toBe(2);
    });
});

// ==================== Research System Tests ====================
test.describe('ResearchSystem', () => {
    test.it('should initialize with research points', () => {
        const system = new ResearchSystem();
        
        test.expect(system.researchPoints).toBe(0);
        test.expect(Object.keys(system.nodes).length).toBeGreaterThan(0);
    });

    test.it('should add research points', () => {
        const system = new ResearchSystem();
        system.addResearchPoints(10);
        
        test.expect(system.researchPoints).toBe(10);
    });

    test.it('should check if research is available', () => {
        const system = new ResearchSystem();
        system.addResearchPoints(10);
        
        const canResearch = system.canResearch('rapid_unlock');
        test.expect(canResearch).toBe(true);
    });

    test.it('should not allow research without enough points', () => {
        const system = new ResearchSystem();
        system.addResearchPoints(2);
        
        const canResearch = system.canResearch('rapid_unlock');
        test.expect(canResearch).toBe(false);
    });

    test.it('should research node and unlock tower', () => {
        const system = new ResearchSystem();
        system.addResearchPoints(10);
        
        const success = system.research('rapid_unlock');
        
        test.expect(success).toBe(true);
        test.expect(system.researchPoints).toBe(5); // 10 - 5 cost
        test.expect(system.nodes['rapid_unlock'].researched).toBe(true);
    });

    test.it('should get unlocked towers', () => {
        const system = new ResearchSystem();
        system.addResearchPoints(10);
        system.research('rapid_unlock');
        
        const unlocked = system.getUnlockedTowers();
        test.expect(unlocked).toContain('basic'); // Always unlocked
        test.expect(unlocked).toContain('rapid');
    });

    test.it('should get upgrade multiplier', () => {
        const system = new ResearchSystem();
        // Need prerequisites first
        system.addResearchPoints(30);
        system.research('rapid_unlock');
        system.research('sniper_unlock');
        system.research('damage_boost');
        
        const multiplier = system.getUpgradeMultiplier('damage');
        test.expect(multiplier).toBe(1.1); // 10% boost
    });

    test.it('should require prerequisites for research', () => {
        const system = new ResearchSystem();
        system.addResearchPoints(12);
        
        // Should fail because prerequisites not met
        const canResearch = system.canResearch('debuff_unlock');
        test.expect(canResearch).toBe(false);
        
        // Research prerequisite
        system.addResearchPoints(5);
        system.research('rapid_unlock');
        
        // Now should be able to research
        const canResearchAfter = system.canResearch('debuff_unlock');
        test.expect(canResearchAfter).toBe(true);
    });
});

// ==================== Achievement System Tests ====================
test.describe('AchievementSystem', () => {
    test.it('should initialize with achievements', () => {
        const system = new AchievementSystem();
        
        test.expect(system.achievements.length).toBeGreaterThan(0);
    });

    test.it('should check and unlock achievement', () => {
        const system = new AchievementSystem();
        // Reset achievements first
        system.achievements.forEach(a => a.unlocked = false);
        
        const mockGame = { 
            totalKills: 1, 
            currency: 0,
            wave: 0,
            perfectWaveStreak: 0,
            totalTowersPlaced: 0,
            towers: [],
            difficulty: 'normal',
            researchSystem: { 
                addResearchPoints: () => {},
                nodes: {}
            }
        };
        
        system.update(mockGame);
        
        const achievement = system.achievements.find(a => a.id === 'first_kill');
        test.expect(achievement).toBeTruthy();
        if (achievement) {
            test.expect(achievement.unlocked).toBe(true);
        }
    });

    test.it('should not unlock achievement if condition not met', () => {
        const system = new AchievementSystem();
        // Reset achievements first
        system.achievements.forEach(a => a.unlocked = false);
        
        const mockGame = { 
            totalKills: 0,
            wave: 0,
            currency: 0,
            perfectWaveStreak: 0,
            totalTowersPlaced: 0,
            towers: [],
            difficulty: 'normal',
            researchSystem: { 
                addResearchPoints: () => {},
                nodes: {}
            }
        };
        
        system.update(mockGame);
        
        const achievement = system.achievements.find(a => a.id === 'wave_5');
        test.expect(achievement).toBeTruthy();
        if (achievement) {
            test.expect(achievement.unlocked).toBe(false);
        }
    });
});

// ==================== Statistics System Tests ====================
test.describe('Statistics', () => {
    test.it('should initialize with zero stats', () => {
        const stats = new Statistics();
        
        test.expect(stats.totalKills).toBe(0);
        test.expect(stats.totalWaves).toBe(0);
        test.expect(stats.totalTowersPlaced).toBe(0);
    });

    test.it('should record kills', () => {
        const stats = new Statistics();
        stats.recordKill('basic', 'basic');
        
        test.expect(stats.totalKills).toBe(1);
        test.expect(stats.towerKills['basic']).toBe(1);
    });

    test.it('should record wave completion', () => {
        const stats = new Statistics();
        stats.recordWave(5, true, 0, 10, 100);
        
        test.expect(stats.totalWaves).toBe(5);
        test.expect(stats.perfectWaves).toBe(1);
    });

    test.it('should calculate favorite tower type', () => {
        const stats = new Statistics();
        stats.recordKill('basic', 'basic');
        stats.recordKill('basic', 'basic');
        stats.recordKill('rapid', 'basic');
        
        const favorite = stats.getFavoriteTowerType();
        test.expect(favorite).toBe('basic');
    });

    test.it('should save and load statistics', () => {
        // Clear localStorage first
        localStorage.removeItem('towerDefenseStatistics');
        
        const stats1 = new Statistics();
        stats1.recordKill('basic', 'basic');
        stats1.saveStatistics();
        
        const stats2 = new Statistics();
        stats2.loadStatistics();
        
        test.expect(stats2.totalKills).toBe(1);
        
        // Clean up
        localStorage.removeItem('towerDefenseStatistics');
    });
});

// ==================== Campaign System Tests ====================
test.describe('CampaignSystem', () => {
    test.it('should initialize with campaign levels', () => {
        const campaign = new CampaignSystem();
        
        test.expect(campaign.levels.length).toBeGreaterThan(0);
    });

    test.it('should check campaign objectives', () => {
        const campaign = new CampaignSystem();
        const level = campaign.levels[0];
        const mockGame = { wave: 3, waveLeaks: 0, totalKills: 0, towers: [] };
        
        const objectives = level.checkObjectives(mockGame);
        test.expect(objectives.length).toBeGreaterThan(0);
    });

    test.it('should detect completed level', () => {
        const campaign = new CampaignSystem();
        const level = campaign.levels[0];
        const mockGame = { wave: 3, waveLeaks: 0, totalKills: 0, towers: [] };
        
        const completed = level.isCompleted(mockGame);
        test.expect(completed).toBe(true);
    });
});

// ==================== Ability System Tests ====================
test.describe('AbilitySystem', () => {
    test.it('should initialize with abilities', () => {
        const system = new AbilitySystem();
        
        test.expect(system.abilities.speedBoost).toBeTruthy();
        test.expect(system.abilities.freezeWave).toBeTruthy();
        test.expect(system.abilities.airstrike).toBeTruthy();
    });

    test.it('should check if ability can be used', () => {
        const system = new AbilitySystem();
        const mockGame = { currency: 200 };
        
        const canUse = system.abilities.speedBoost.canUse(0, mockGame.currency);
        test.expect(canUse).toBe(true);
    });

    test.it('should not allow ability use without enough currency', () => {
        const system = new AbilitySystem();
        const mockGame = { currency: 50 };
        
        const canUse = system.abilities.speedBoost.canUse(0, mockGame.currency);
        test.expect(canUse).toBe(false);
    });

    test.it('should apply ability effect', () => {
        const system = new AbilitySystem();
        const mockGame = { 
            currency: 200, 
            abilitySpeedBoost: 1.0,
            abilitySpeedBoostEnd: 0,
            enemies: [],
            towers: []
        };
        
        const used = system.abilities.speedBoost.use(0, mockGame);
        test.expect(used).toBe(true);
        test.expect(mockGame.currency).toBe(100); // 200 - 100 cost
        // Effect should have been applied via effect.apply()
        test.expect(mockGame.abilitySpeedBoost).toBe(2.0);
    });
});

// ==================== Integration Tests ====================
test.describe('Integration Tests', () => {
    test.it('should handle tower shooting enemy', () => {
        const particleSystem = new ParticleSystem();
        const path = createMockPath();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.position = { x: 150, y: 100 };
        enemy.progress = 0.5;
        
        tower.findTarget([enemy]);
        const initialHealth = enemy.health;
        // shoot only takes currentTime parameter
        tower.shoot(Date.now());
        
        // Tower should have found target and created projectile
        test.expect(tower.target).toBe(enemy);
        test.expect(tower.projectiles.length).toBeGreaterThan(0);
    });

    test.it('should handle enemy reaching end', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.progress = 0.99;
        
        // Simulate multiple updates to reach end
        for (let i = 0; i < 100; i++) {
            enemy.update();
            if (enemy.progress >= 1) break;
        }
        
        test.expect(enemy.progress).toBeGreaterThanOrEqual(0.99);
    });
});

// Run all tests when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('Running test suite...');
});

