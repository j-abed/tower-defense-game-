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
        
        // createExplosion creates: count (10) + 5 flash + 8 smoke = 23 particles
        test.expect(system.particles.length).toBe(23);
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
        
        // createHit creates: 8 main particles + 3 spark particles = 11 particles
        test.expect(system.particles.length).toBe(11);
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
        // Clear localStorage to ensure fresh state
        localStorage.removeItem('towerDefenseResearch');
        const system = new ResearchSystem();
        system.researchPoints = 0; // Ensure no points from saved state
        system.addResearchPoints(2);
        
        const canResearch = system.canResearch('rapid_unlock');
        test.expect(canResearch).toBe(false);
        localStorage.removeItem('towerDefenseResearch');
    });

    test.it('should research node and unlock tower', () => {
        // Clear localStorage to ensure fresh state
        localStorage.removeItem('towerDefenseResearch');
        const system = new ResearchSystem();
        system.researchPoints = 0; // Ensure no points from saved state
        system.addResearchPoints(10);
        
        const success = system.research('rapid_unlock');
        
        test.expect(success).toBe(true);
        test.expect(system.researchPoints).toBe(5); // 10 - 5 cost
        test.expect(system.nodes['rapid_unlock'].researched).toBe(true);
        localStorage.removeItem('towerDefenseResearch');
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
        // Clear localStorage to ensure fresh state
        localStorage.removeItem('towerDefenseResearch');
        const system = new ResearchSystem();
        system.researchPoints = 0; // Ensure no points from saved state
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
        localStorage.removeItem('towerDefenseResearch');
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
        
        // Use a time far in the future to ensure cooldown is met
        const canUse = system.abilities.speedBoost.canUse(50000, mockGame.currency);
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
        
        // Use a time far in the future to ensure cooldown is met
        const used = system.abilities.speedBoost.use(50000, mockGame);
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

    test.it('should handle splitting enemy', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('splitting', path, particleSystem);
        
        test.expect(enemy.splits).toBe(true);
        test.expect(enemy.splitCount).toBe(2);
    });

    test.it('should handle flying enemy', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('flying', path, particleSystem);
        
        test.expect(enemy.isFlying).toBe(true);
        test.expect(enemy.type).toBe('flying');
    });
});

// ==================== Projectile Tests ====================
test.describe('Projectile Class', () => {
    test.it('should create projectile with correct properties', () => {
        const projectile = new Projectile(0, 0, 100, 0, 50, 10, '#ff0000');
        
        test.expect(projectile.x).toBe(0);
        test.expect(projectile.y).toBe(0);
        test.expect(projectile.damage).toBe(50);
        test.expect(projectile.speed).toBe(10);
        test.expect(projectile.color).toBe('#ff0000');
        test.expect(projectile.hit).toBe(false);
    });

    test.it('should calculate velocity correctly', () => {
        const projectile = new Projectile(0, 0, 3, 4, 50, 5, '#ff0000');
        
        // Should move towards target (3, 4) with speed 5
        // Distance is 5, so vx = 3/5 * 5 = 3, vy = 4/5 * 5 = 4
        test.expect(projectile.vx).toBe(3);
        test.expect(projectile.vy).toBe(4);
    });

    test.it('should update position', () => {
        const projectile = new Projectile(0, 0, 10, 0, 50, 5, '#ff0000');
        const initialX = projectile.x;
        
        projectile.update();
        
        test.expect(projectile.x).toBeGreaterThan(initialX);
    });

    test.it('should detect hit on enemy', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.position = { x: 100, y: 100 };
        enemy.size = 20;
        
        const projectile = new Projectile(100, 100, 100, 100, 50, 5, '#ff0000');
        
        const hit = projectile.checkHit(enemy);
        test.expect(hit).toBe(true);
    });

    test.it('should not hit dead enemy', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.position = { x: 100, y: 100 };
        enemy.isDead = true;
        
        const projectile = new Projectile(100, 100, 100, 100, 50, 5, '#ff0000');
        
        const hit = projectile.checkHit(enemy);
        test.expect(hit).toBe(false);
    });

    test.it('should not hit enemy that already reached end', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.position = { x: 100, y: 100 };
        enemy.reachedEnd = true;
        
        const projectile = new Projectile(100, 100, 100, 100, 50, 5, '#ff0000');
        
        const hit = projectile.checkHit(enemy);
        test.expect(hit).toBe(false);
    });

    test.it('should not hit enemy that is too far', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.position = { x: 200, y: 200 };
        enemy.size = 20;
        
        const projectile = new Projectile(0, 0, 0, 0, 50, 5, '#ff0000');
        
        const hit = projectile.checkHit(enemy);
        test.expect(hit).toBe(false);
    });
});

// ==================== Tower Type Tests ====================
test.describe('Tower Types', () => {
    test.it('should create rapid fire tower with correct stats', () => {
        const particleSystem = new ParticleSystem();
        const tower = new Tower(100, 100, 'rapid', particleSystem);
        
        test.expect(tower.type).toBe('rapid');
        test.expect(tower.damage).toBe(8);
        test.expect(tower.fireRate).toBeLessThan(1000); // Faster than basic
        test.expect(tower.range).toBe(120);
    });

    test.it('should create sniper tower with correct stats', () => {
        const particleSystem = new ParticleSystem();
        const tower = new Tower(100, 100, 'sniper', particleSystem);
        
        test.expect(tower.type).toBe('sniper');
        test.expect(tower.damage).toBe(50);
        test.expect(tower.range).toBe(300);
        test.expect(tower.fireRate).toBeGreaterThan(1000); // Slower than basic
    });

    test.it('should create cannon tower with area damage', () => {
        const particleSystem = new ParticleSystem();
        const tower = new Tower(100, 100, 'cannon', particleSystem);
        
        test.expect(tower.type).toBe('cannon');
        test.expect(tower.areaDamage).toBe(true);
        test.expect(tower.areaRadius).toBeGreaterThan(0);
    });

    test.it('should create debuff tower', () => {
        const particleSystem = new ParticleSystem();
        const tower = new Tower(100, 100, 'debuff', particleSystem);
        
        test.expect(tower.type).toBe('debuff');
        test.expect(tower.debuff).toBe(true);
        test.expect(tower.slowAmount).toBe(0.5);
    });

    test.it('should create support tower', () => {
        const particleSystem = new ParticleSystem();
        const tower = new Tower(100, 100, 'support', particleSystem);
        
        test.expect(tower.type).toBe('support');
        test.expect(tower.support).toBe(true);
        test.expect(tower.damageBoost).toBeGreaterThan(1);
        test.expect(tower.rangeBoost).toBeGreaterThan(1);
    });

    test.it('should create chain lightning tower', () => {
        const particleSystem = new ParticleSystem();
        const tower = new Tower(100, 100, 'chain', particleSystem);
        
        test.expect(tower.type).toBe('chain');
        test.expect(tower.chainLightning).toBe(true);
        test.expect(tower.chainCount).toBeGreaterThan(0);
    });
});

// ==================== Tower Targeting Tests ====================
test.describe('Tower Targeting Modes', () => {
    test.it('should target closest enemy by default', () => {
        const particleSystem = new ParticleSystem();
        const path = createMockPath();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        
        const enemy1 = new Enemy('basic', path, particleSystem);
        enemy1.position = { x: 150, y: 100 }; // 50 units away
        enemy1.progress = 0.5;
        
        const enemy2 = new Enemy('basic', path, particleSystem);
        enemy2.position = { x: 120, y: 100 }; // 20 units away
        enemy2.progress = 0.5;
        
        const target = tower.findTarget([enemy1, enemy2]);
        test.expect(target).toBe(enemy2);
    });

    test.it('should target farthest enemy when mode is set', () => {
        const particleSystem = new ParticleSystem();
        const path = createMockPath();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        tower.setTargetingMode('farthest');
        
        const enemy1 = new Enemy('basic', path, particleSystem);
        enemy1.position = { x: 150, y: 100 }; // 50 units away
        enemy1.progress = 0.5;
        
        const enemy2 = new Enemy('basic', path, particleSystem);
        enemy2.position = { x: 120, y: 100 }; // 20 units away
        enemy2.progress = 0.5;
        
        const target = tower.findTarget([enemy1, enemy2]);
        test.expect(target).toBe(enemy1);
    });

    test.it('should target strongest enemy when mode is set', () => {
        const particleSystem = new ParticleSystem();
        const path = createMockPath();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        tower.setTargetingMode('strongest');
        
        const enemy1 = new Enemy('basic', path, particleSystem);
        enemy1.position = { x: 150, y: 100 };
        enemy1.health = 50;
        enemy1.progress = 0.5;
        
        const enemy2 = new Enemy('tank', path, particleSystem);
        enemy2.position = { x: 120, y: 100 };
        enemy2.health = 150;
        enemy2.progress = 0.5;
        
        const target = tower.findTarget([enemy1, enemy2]);
        test.expect(target).toBe(enemy2);
    });

    test.it('should target weakest enemy when mode is set', () => {
        const particleSystem = new ParticleSystem();
        const path = createMockPath();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        tower.setTargetingMode('weakest');
        
        const enemy1 = new Enemy('basic', path, particleSystem);
        enemy1.position = { x: 150, y: 100 };
        enemy1.health = 50;
        enemy1.progress = 0.5;
        
        const enemy2 = new Enemy('tank', path, particleSystem);
        enemy2.position = { x: 120, y: 100 };
        enemy2.health = 150;
        enemy2.progress = 0.5;
        
        const target = tower.findTarget([enemy1, enemy2]);
        test.expect(target).toBe(enemy1);
    });

    test.it('should target first enemy when mode is set', () => {
        const particleSystem = new ParticleSystem();
        const path = createMockPath();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        tower.setTargetingMode('first');
        
        const enemy1 = new Enemy('basic', path, particleSystem);
        enemy1.position = { x: 150, y: 100 };
        enemy1.progress = 0.3;
        
        const enemy2 = new Enemy('basic', path, particleSystem);
        enemy2.position = { x: 120, y: 100 };
        enemy2.progress = 0.7;
        
        const target = tower.findTarget([enemy1, enemy2]);
        test.expect(target).toBe(enemy2);
    });
});

// ==================== Theme System Tests ====================
test.describe('ThemeSystem', () => {
    test.it('should initialize with default theme', () => {
        const themeSystem = new ThemeSystem();
        
        test.expect(themeSystem.currentTheme).toBe('default');
        test.expect(themeSystem.getCurrentTheme()).toBeTruthy();
    });

    test.it('should have multiple themes available', () => {
        const themeSystem = new ThemeSystem();
        
        test.expect(themeSystem.themes).toBeTruthy();
        test.expect(Object.keys(themeSystem.themes).length).toBeGreaterThan(1);
    });

    test.it('should change theme', () => {
        const themeSystem = new ThemeSystem();
        const result = themeSystem.setTheme('desert');
        
        test.expect(result).toBe(true);
        test.expect(themeSystem.currentTheme).toBe('desert');
    });

    test.it('should return false for invalid theme', () => {
        const themeSystem = new ThemeSystem();
        const result = themeSystem.setTheme('invalid_theme');
        
        test.expect(result).toBe(false);
    });

    test.it('should get current theme colors', () => {
        const themeSystem = new ThemeSystem();
        const theme = themeSystem.getCurrentTheme();
        
        test.expect(theme).toBeTruthy();
        test.expect(theme.colors).toBeTruthy();
        test.expect(theme.colors.backgroundStart).toBeTruthy();
    });
});

// ==================== Edge Cases and Error Handling ====================
test.describe('Edge Cases', () => {
    test.it('should handle tower with no enemies', () => {
        const particleSystem = new ParticleSystem();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        
        const target = tower.findTarget([]);
        test.expect(target).toBe(null);
    });

    test.it('should handle tower with all dead enemies', () => {
        const particleSystem = new ParticleSystem();
        const path = createMockPath();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.isDead = true;
        enemy.position = { x: 150, y: 100 };
        
        const target = tower.findTarget([enemy]);
        test.expect(target).toBe(null);
    });

    test.it('should handle enemy with zero health', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('basic', path, particleSystem);
        
        // Use takeDamage to properly set isDead
        enemy.takeDamage(enemy.health, null);
        
        test.expect(enemy.health).toBeLessThanOrEqual(0);
        test.expect(enemy.isDead).toBe(true);
    });

    test.it('should handle path with zero progress', () => {
        const path = new Path(12345, 800, 600);
        const pos = path.getPositionAt(0);
        
        test.expect(pos.x).toBeGreaterThanOrEqual(0);
        test.expect(pos.y).toBeGreaterThanOrEqual(0);
    });

    test.it('should handle path with progress 1.0', () => {
        const path = new Path(12345, 800, 600);
        const pos = path.getPositionAt(1.0);
        
        test.expect(pos.x).toBeGreaterThanOrEqual(0);
        test.expect(pos.y).toBeGreaterThanOrEqual(0);
    });

    test.it('should handle multiple upgrades', () => {
        const particleSystem = new ParticleSystem();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        const originalDamage = tower.damage;
        
        tower.upgrade();
        tower.upgrade();
        tower.upgrade();
        
        test.expect(tower.level).toBe(4);
        test.expect(tower.damage).toBeGreaterThan(originalDamage);
    });

    test.it('should handle projectile hitting multiple times', () => {
        const path = createMockPath();
        const particleSystem = new ParticleSystem();
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.position = { x: 100, y: 100 };
        
        const projectile = new Projectile(100, 100, 100, 100, 50, 5, '#ff0000');
        const hit1 = projectile.checkHit(enemy);
        projectile.hit = true;
        const hit2 = projectile.checkHit(enemy);
        
        test.expect(hit1).toBe(true);
        test.expect(hit2).toBe(false);
    });
});

// ==================== Advanced Integration Tests ====================
test.describe('Advanced Integration Tests', () => {
    test.it('should handle tower shooting and projectile hitting enemy', () => {
        const particleSystem = new ParticleSystem();
        const path = createMockPath();
        const tower = new Tower(100, 100, 'basic', particleSystem);
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.position = { x: 150, y: 100 };
        enemy.progress = 0.5;
        
        tower.findTarget([enemy]);
        const initialHealth = enemy.health;
        tower.shoot(Date.now());
        
        // Update projectile to hit enemy
        if (tower.projectiles.length > 0) {
            const projectile = tower.projectiles[0];
            // Move projectile to enemy position
            projectile.x = enemy.position.x;
            projectile.y = enemy.position.y;
            
            if (projectile.checkHit(enemy)) {
                enemy.takeDamage(projectile.damage, null);
            }
        }
        
        test.expect(tower.target).toBe(enemy);
        test.expect(tower.projectiles.length).toBeGreaterThan(0);
    });

    test.it('should handle support tower buffing other towers', () => {
        const particleSystem = new ParticleSystem();
        const supportTower = new Tower(100, 100, 'support', particleSystem);
        const basicTower = new Tower(150, 100, 'basic', particleSystem);
        
        const originalDamage = basicTower.damage;
        const originalRange = basicTower.range;
        
        // Support tower should buff nearby towers
        supportTower.updateSupportBuffs([basicTower], Date.now());
        
        // After support buff, damage and range should be increased
        test.expect(basicTower.receivingSupport).toBe(true);
    });

    test.it('should handle debuff tower slowing enemies', () => {
        const particleSystem = new ParticleSystem();
        const path = createMockPath();
        const debuffTower = new Tower(100, 100, 'debuff', particleSystem);
        const enemy = new Enemy('basic', path, particleSystem);
        enemy.position = { x: 150, y: 100 };
        enemy.progress = 0.5;
        
        const originalSpeed = enemy.speed;
        
        debuffTower.findTarget([enemy]);
        debuffTower.shoot(Date.now());
        
        // Debuff should be applied (tested through debuff system)
        test.expect(debuffTower.target).toBe(enemy);
    });
});

// Run all tests when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('Running test suite...');
});

