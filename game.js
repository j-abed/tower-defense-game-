class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particleSystem = new ParticleSystem();
        this.damageNumberSystem = new DamageNumberSystem();
        this.abilitySystem = new AbilitySystem();
        this.researchSystem = new ResearchSystem();
        this.achievementSystem = new AchievementSystem();
        this.statistics = new Statistics();
        this.campaignSystem = new CampaignSystem();
        this.mapSeed = null; // Will be set on first load
        this.dynamicDifficultyAdjustment = 1.0; // For dynamic difficulty
        this.totalTowersPlaced = 0; // Track total towers placed for achievements
        this.currentWaveKills = 0;
        this.currentWaveCurrency = 0;
        this.abilitySpeedBoost = 1.0;
        this.abilityFreezeWave = false;
        this.abilityShield = false;
        this.airstrikeActive = false;
        this.path = null; // Will be initialized in setupCanvas
        this.theme = 'default'; // default, desert, snow, space, forest
        this.waveTransitionTimer = 0;
        this.waveTransitionActive = false;
        this.towers = [];
        this.enemies = [];
        this.selectedTower = null;
        this.selectedTowerType = 'basic';
        this.currency = this.getStartingCurrency();
        this.health = 100;
        this.wave = 0;
        this.waveInProgress = false;
        this.paused = false;
        this.gameOver = false;
        this.lastTime = 0;
        this.enemiesSpawned = 0;
        this.enemiesInWave = 0;
        this.spawnTimer = 0;
        this.spawnDelay = 500; // milliseconds between enemy spawns (reduced for faster gameplay)
        this.gameSpeed = 3; // Fast forward multiplier (default 3x speed)
        this.totalKills = 0; // Track total kills for high score
        this.highScores = this.loadHighScores();
        this.difficulty = 'normal'; // Easy, Normal, Hard, Nightmare
        this.perfectWaveStreak = 0; // Consecutive perfect waves
        this.waveLeaks = 0; // Enemies that reached end this wave

        this.setupCanvas();
        this.setupMinimap();
        this.setupEventListeners();
        this.updateWavePreview();
        this.updateHighScoreDisplay();
        this.updateResearchUI();
        this.gameLoop();
    }

    setupMinimap() {
        this.minimap = document.getElementById('minimap');
        if (this.minimap) {
            this.minimapCtx = this.minimap.getContext('2d');
            this.minimap.width = 200;
            this.minimap.height = 150;
        }
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Ensure canvas has valid dimensions
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            this.canvas.width = 800;
            this.canvas.height = 600;
        }
        
        // Initialize or regenerate path with current seed
        if (!this.mapSeed) {
            this.mapSeed = Date.now();
        }
        
        try {
            this.path = new Path(this.mapSeed, this.canvas.width, this.canvas.height);
            this.updateSeedDisplay();
        } catch (error) {
            console.error('Error initializing path:', error);
            // Fallback to default path
            this.path = new Path(this.mapSeed || 12345, Math.max(this.canvas.width, 800), Math.max(this.canvas.height, 600));
        }

        window.addEventListener('resize', () => {
            const newWidth = container.clientWidth || 800;
            const newHeight = container.clientHeight || 600;
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            if (this.path && newWidth > 0 && newHeight > 0) {
                this.path.setCanvasSize(newWidth, newHeight);
            }
        });
    }

    regenerateMap(seed = null) {
        // Clear towers and enemies when regenerating
        this.towers = [];
        this.enemies = [];
        this.selectedTower = null;
        document.getElementById('upgrade-btn').disabled = true;
        document.getElementById('sell-btn').disabled = true;
        
        // Set new seed
        if (seed !== null) {
            this.mapSeed = seed;
        } else if (this.mapSeed === null) {
            this.mapSeed = Date.now();
        }
        
        // Regenerate path
        this.path = new Path(this.mapSeed, this.canvas.width, this.canvas.height);
        this.updateSeedDisplay();
    }

    updateSeedDisplay() {
        const seedDisplay = document.getElementById('current-seed');
        if (seedDisplay) {
            seedDisplay.textContent = this.mapSeed;
        }
        const seedInput = document.getElementById('seed-input');
        if (seedInput) {
            seedInput.value = '';
        }
    }

    setupEventListeners() {
        // Tower selection buttons
        document.querySelectorAll('.tower-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const towerType = btn.dataset.tower;
                const unlockedTowers = this.researchSystem.getUnlockedTowers();
                if (!unlockedTowers.includes(towerType)) {
                    alert('This tower is locked! Research it in the Tech Tree first.');
                    return;
                }
                document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedTowerType = towerType;
                this.selectedTower = null;
            });
        });

        // Update tower button visibility based on research
        this.updateTowerButtons();

        // Canvas click - place tower or select tower or airstrike
        this.canvas.addEventListener('click', (e) => {
            if (this.gameOver || this.paused) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check for airstrike
            if (this.airstrikeActive) {
                this.executeAirstrike(x, y);
                this.airstrikeActive = false;
                return;
            }

            // Check if clicking on existing tower
            let clickedTower = null;
            for (const tower of this.towers) {
                if (tower.containsPoint(x, y)) {
                    clickedTower = tower;
                    break;
                }
            }

            if (clickedTower) {
                this.selectedTower = clickedTower;
                document.getElementById('upgrade-btn').disabled = false;
                document.getElementById('sell-btn').disabled = false;
                this.updateTowerStats();
            } else {
                // Try to place new tower
                this.placeTower(x, y);
                this.selectedTower = null;
                document.getElementById('upgrade-btn').disabled = true;
                document.getElementById('sell-btn').disabled = true;
                this.hideTowerStats();
            }
        });

        // Canvas mouse move - show range indicator
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
            this.mouseY = e.clientY - this.canvas.getBoundingClientRect().top;
        });

        // Control buttons
        document.getElementById('start-btn').addEventListener('click', () => {
            if (!this.waveInProgress && !this.gameOver) {
                this.startWave();
            }
        });

        document.getElementById('pause-btn').addEventListener('click', () => {
            this.paused = !this.paused;
            document.getElementById('pause-btn').textContent = this.paused ? 'Resume' : 'Pause';
        });

        document.getElementById('upgrade-btn').addEventListener('click', () => {
            if (this.selectedTower) {
                this.upgradeTower(this.selectedTower);
            }
        });

        document.getElementById('sell-btn').addEventListener('click', () => {
            if (this.selectedTower) {
                this.sellTower(this.selectedTower);
            }
        });

        document.getElementById('fastforward-btn').addEventListener('click', () => {
            this.toggleFastForward();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restart();
        });

        // Map generation controls
        const randomSeedBtn = document.getElementById('random-seed-btn');
        const regenerateBtn = document.getElementById('regenerate-btn');
        const seedInput = document.getElementById('seed-input');
        
        if (randomSeedBtn) {
            randomSeedBtn.addEventListener('click', () => {
                const randomSeed = Date.now() + Math.floor(Math.random() * 1000000);
                if (seedInput) {
                    seedInput.value = randomSeed;
                }
                this.regenerateMap(randomSeed);
            });
        }

        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', () => {
                if (seedInput) {
                    const seedValue = seedInput.value.trim();
                    if (seedValue) {
                        const seed = parseInt(seedValue);
                        if (!isNaN(seed)) {
                            this.regenerateMap(seed);
                        } else {
                            alert('Please enter a valid number for the seed');
                        }
                    } else {
                        // Generate new random seed
                        this.regenerateMap();
                    }
                } else {
                    this.regenerateMap();
                }
            });
        }

        // Allow Enter key to regenerate
        if (seedInput) {
            seedInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && regenerateBtn) {
                    regenerateBtn.click();
                }
            });
        }

        // Difficulty selection
        const difficultySelect = document.getElementById('difficulty-select');
        if (difficultySelect) {
            difficultySelect.value = this.difficulty;
            difficultySelect.addEventListener('change', (e) => {
                this.setDifficulty(e.target.value);
                this.updateDifficultyDescription();
            });
            this.updateDifficultyDescription();
        }

        // Theme selection
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = this.theme;
            themeSelect.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }

        // Ability buttons
        document.getElementById('ability-speed').addEventListener('click', () => {
            this.abilitySystem.useAbility('speedBoost', this.lastTime, this);
            this.updateAbilitiesUI();
        });
        document.getElementById('ability-freeze').addEventListener('click', () => {
            this.abilitySystem.useAbility('freezeWave', this.lastTime, this);
            this.updateAbilitiesUI();
        });
        document.getElementById('ability-airstrike').addEventListener('click', () => {
            this.abilitySystem.useAbility('airstrike', this.lastTime, this);
            this.updateAbilitiesUI();
        });
        document.getElementById('ability-shield').addEventListener('click', () => {
            this.abilitySystem.useAbility('shield', this.lastTime, this);
            this.updateAbilitiesUI();
        });

        // Research panel
        document.getElementById('research-btn').addEventListener('click', () => {
            this.showResearchPanel();
        });
        document.getElementById('close-research-btn').addEventListener('click', () => {
            this.hideResearchPanel();
        });

        // Achievements panel
        document.getElementById('achievements-btn').addEventListener('click', () => {
            this.showAchievementsPanel();
        });
        document.getElementById('close-achievements-btn').addEventListener('click', () => {
            this.hideAchievementsPanel();
        });

        // Statistics panel
        const statsBtn = document.getElementById('statistics-btn');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => {
                this.showStatisticsPanel();
            });
        }
        const closeStatsBtn = document.getElementById('close-statistics-btn');
        if (closeStatsBtn) {
            closeStatsBtn.addEventListener('click', () => {
                this.hideStatisticsPanel();
            });
        }

        // Campaign panel
        const campaignBtn = document.getElementById('campaign-btn');
        if (campaignBtn) {
            campaignBtn.addEventListener('click', () => {
                this.showCampaignPanel();
            });
        }
        const closeCampaignBtn = document.getElementById('close-campaign-btn');
        if (closeCampaignBtn) {
            closeCampaignBtn.addEventListener('click', () => {
                this.hideCampaignPanel();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Tower selection (1-4)
            if (e.key >= '1' && e.key <= '4') {
                const towerIndex = parseInt(e.key) - 1;
                const towerTypes = ['basic', 'rapid', 'sniper', 'cannon'];
                if (towerTypes[towerIndex]) {
                    const btn = document.getElementById(`tower-${towerTypes[towerIndex]}`);
                    if (btn) {
                        btn.click();
                    }
                }
            }
            // Space for pause/resume
            else if (e.key === ' ') {
                e.preventDefault();
                const pauseBtn = document.getElementById('pause-btn');
                if (pauseBtn) pauseBtn.click();
            }
            // Enter for start wave
            else if (e.key === 'Enter') {
                e.preventDefault();
                const startBtn = document.getElementById('start-btn');
                if (startBtn && !startBtn.disabled) {
                    startBtn.click();
                }
            }
            // U for upgrade
            else if (e.key === 'u' || e.key === 'U') {
                e.preventDefault();
                const upgradeBtn = document.getElementById('upgrade-btn');
                if (upgradeBtn && !upgradeBtn.disabled) {
                    upgradeBtn.click();
                }
            }
            // S for sell
            else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                const sellBtn = document.getElementById('sell-btn');
                if (sellBtn && !sellBtn.disabled) {
                    sellBtn.click();
                }
            }
        });
    }

    placeTower(x, y) {
        // Check if position is valid (not on path, not too close to other towers)
        if (this.path.isPointOnPath(x, y, 50)) {
            return; // Too close to path
        }

        for (const tower of this.towers) {
            if (tower.getDistanceTo(x, y) < 60) {
                return; // Too close to another tower
            }
        }

        // Check if player has enough currency
        const towerConfigs = {
            basic: { cost: 50 },
            rapid: { cost: 100 },
            sniper: { cost: 150 },
            cannon: { cost: 200 },
            debuff: { cost: 175 },
            support: { cost: 150 },
            chain: { cost: 225 }
        };

        const cost = towerConfigs[this.selectedTowerType]?.cost || 50;
        if (this.currency < cost) {
            return; // Not enough currency
        }

        const tower = new Tower(x, y, this.selectedTowerType, this.particleSystem, this.damageNumberSystem, this);
        this.towers.push(tower);
        this.currency -= cost;
        this.totalTowersPlaced++;
        this.statistics.recordTowerPlaced(this.selectedTowerType, cost);
        this.updateUI();
        this.achievementSystem.update(this);
    }

    upgradeTower(tower) {
        const cost = tower.getUpgradeCost();
        if (this.currency >= cost) {
            this.currency -= cost;
            tower.upgrade();
            this.statistics.recordUpgrade(cost);
            this.updateTowerStats();
            this.updateUI();
        }
    }

    sellTower(tower) {
        // Calculate refund (70% of total investment)
        const totalInvestment = tower.cost + tower.totalUpgradeCost;
        const refund = Math.floor(totalInvestment * 0.7);
        this.currency += refund;
        
        // Remove tower
        const index = this.towers.indexOf(tower);
        if (index > -1) {
            this.towers.splice(index, 1);
        }
        
        // Create sell effect
        this.particleSystem.createMoneyEffect(tower.x, tower.y);
        
        this.statistics.recordTowerSold(refund);
        this.selectedTower = null;
        document.getElementById('upgrade-btn').disabled = true;
        document.getElementById('sell-btn').disabled = true;
        this.hideTowerStats();
        this.updateUI();
    }

    toggleFastForward() {
        const speeds = [3, 4, 5];
        const currentIndex = speeds.indexOf(this.gameSpeed);
        this.gameSpeed = speeds[(currentIndex + 1) % speeds.length];
        const btn = document.getElementById('fastforward-btn');
        btn.textContent = `Fast Forward (${this.gameSpeed}x)`;
        btn.classList.toggle('active', this.gameSpeed > 3);
    }

    calculateWaveComposition(waveNumber) {
        const baseEnemies = 10;
        const waveMultiplier = Math.floor(waveNumber / 3) + 1;
        const totalEnemies = baseEnemies + (waveNumber * 2) + (waveMultiplier * 5);
        
        const composition = {
            basic: 0,
            fast: 0,
            tank: 0,
            boss: 0,
            flying: 0,
            shielded: 0,
            regenerating: 0,
            splitting: 0
        };

        // Simulate spawn logic to get composition
        for (let i = 0; i < totalEnemies; i++) {
            const rand = Math.random();
            if (waveNumber >= 10 && rand < 0.05) {
                composition.boss++;
            } else if (waveNumber >= 7 && rand < 0.08) {
                composition.splitting++;
            } else if (waveNumber >= 5 && rand < 0.1) {
                composition.regenerating++;
            } else if (waveNumber >= 4 && rand < 0.12) {
                composition.shielded++;
            } else if (waveNumber >= 3 && rand < 0.15) {
                composition.flying++;
            } else if (waveNumber >= 3 && rand < 0.3) {
                composition.tank++;
            } else if (waveNumber >= 2 && rand < 0.5) {
                composition.fast++;
            } else {
                composition.basic++;
            }
        }

        return composition;
    }

    updateWavePreview() {
        const nextWave = this.wave + 1;
        const composition = this.calculateWaveComposition(nextWave);
        
        const previewPanel = document.getElementById('wave-preview');
        if (previewPanel) {
            document.getElementById('wave-preview-number').textContent = nextWave;
            document.getElementById('wave-preview-basic').textContent = composition.basic;
            document.getElementById('wave-preview-fast').textContent = composition.fast;
            document.getElementById('wave-preview-tank').textContent = composition.tank;
            document.getElementById('wave-preview-boss').textContent = composition.boss;
            document.getElementById('wave-preview-flying').textContent = composition.flying;
            document.getElementById('wave-preview-shielded').textContent = composition.shielded;
            document.getElementById('wave-preview-regenerating').textContent = composition.regenerating;
            document.getElementById('wave-preview-splitting').textContent = composition.splitting;
            document.getElementById('wave-preview-total').textContent = 
                composition.basic + composition.fast + composition.tank + composition.boss +
                composition.flying + composition.shielded + composition.regenerating + composition.splitting;
        }
    }

    startWave() {
        this.wave++;
        this.waveInProgress = true;
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        this.waveLeaks = 0; // Reset leaks for new wave
        this.currentWaveKills = 0;
        this.currentWaveCurrency = 0;

        // Calculate enemies for this wave
        const baseEnemies = 10;
        const waveMultiplier = Math.floor(this.wave / 3) + 1;
        this.enemiesInWave = baseEnemies + (this.wave * 2) + (waveMultiplier * 5);

        document.getElementById('start-btn').disabled = true;
        const countdownItem = document.getElementById('wave-countdown-item');
        if (countdownItem) countdownItem.style.display = 'flex';
        this.updateWavePreview();
        this.updateUI();
    }

    findKillerTower(enemy) {
        // Find the closest tower to the enemy (simplified kill attribution)
        let closestTower = null;
        let closestDistance = Infinity;
        for (const tower of this.towers) {
            const distance = tower.getDistanceTo(enemy.position.x, enemy.position.y);
            if (distance < tower.range && distance < closestDistance) {
                closestDistance = distance;
                closestTower = tower;
            }
        }
        return closestTower;
    }

    getTowerTypeForKill(enemy) {
        const tower = this.findKillerTower(enemy);
        return tower ? tower.type : 'unknown';
    }

    getThemeColors() {
        const themes = {
            default: {
                background: '#1a252f',
                path: '#34495e',
                grid: '#1e2a35'
            },
            desert: {
                background: '#d4a574',
                path: '#c49464',
                grid: '#b88454'
            },
            snow: {
                background: '#e8f4f8',
                path: '#d0e8f0',
                grid: '#b8dce8'
            },
            space: {
                background: '#0a0a1a',
                path: '#1a1a2e',
                grid: '#0f0f1f'
            },
            forest: {
                background: '#2d5016',
                path: '#3d6026',
                grid: '#1d4016'
            }
        };
        return themes[this.theme] || themes.default;
    }

    setTheme(theme) {
        if (['default', 'desert', 'snow', 'space', 'forest'].includes(theme)) {
            this.theme = theme;
        }
    }

    startWaveTransition() {
        this.waveTransitionActive = true;
        this.waveTransitionTimer = 60; // 1 second at 60fps
    }

    renderWaveTransition() {
        if (this.waveTransitionTimer > 0) {
            const progress = 1 - (this.waveTransitionTimer / 60);
            const alpha = Math.sin(progress * Math.PI) * 0.5;
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Wave number text
            this.ctx.globalAlpha = alpha * 2;
            this.ctx.fillStyle = '#667eea';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`Wave ${this.wave} Complete!`, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.restore();
            
            this.waveTransitionTimer--;
        } else {
            this.waveTransitionActive = false;
        }
    }

    spawnEnemy(currentTime) {
        if (!this.waveInProgress || this.gameOver) return;
        if (this.enemiesSpawned >= this.enemiesInWave) {
            // Check if all enemies are dead or reached end
            if (this.enemies.every(e => e.isDead || e.reachedEnd)) {
                this.waveInProgress = false;
                document.getElementById('start-btn').disabled = false;
                const countdownItem = document.getElementById('wave-countdown-item');
                if (countdownItem) countdownItem.style.display = 'none';
                this.startWaveTransition();
                this.processWaveRewards();
                this.updateWavePreview();
            }
            return;
        }

        if (currentTime - this.spawnTimer >= this.spawnDelay) {
            // Determine enemy type based on wave
            let enemyType = 'basic';
            const rand = Math.random();
            
            if (this.wave >= 10 && rand < 0.05) {
                enemyType = 'boss';
            } else if (this.wave >= 7 && rand < 0.08) {
                enemyType = 'splitting';
            } else if (this.wave >= 5 && rand < 0.1) {
                enemyType = 'regenerating';
            } else if (this.wave >= 4 && rand < 0.12) {
                enemyType = 'shielded';
            } else if (this.wave >= 3 && rand < 0.15) {
                enemyType = 'flying';
            } else if (this.wave >= 3 && rand < 0.3) {
                enemyType = 'tank';
            } else if (this.wave >= 2 && rand < 0.5) {
                enemyType = 'fast';
            }

            const multipliers = this.getDifficultyMultipliers();
            const enemy = new Enemy(enemyType, this.path, this.particleSystem, multipliers);
            this.enemies.push(enemy);
            this.enemiesSpawned++;
            this.spawnTimer = currentTime;
        }
    }

    update(currentTime) {
        if (this.paused || this.gameOver) return;

        // Apply game speed multiplier
        const updateCount = this.gameSpeed;
        for (let u = 0; u < updateCount; u++) {
            // Spawn enemies
            this.spawnEnemy(currentTime);

            // Update enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                enemy.update();

                // Update debuff expiration
                if (enemy.debuffed && enemy.debuffEndTime > 0 && currentTime > enemy.debuffEndTime) {
                    enemy.debuffed = false;
                    if (enemy.originalSpeed) {
                        enemy.speed = enemy.originalSpeed;
                    }
                    enemy.debuffEndTime = 0;
                }

                if (enemy.reachedEnd && !enemy.isDead) {
                    // Shield ability prevents damage
                    if (!this.abilityShield) {
                    this.health -= 10;
                    }
                    this.waveLeaks++;
                    this.enemies.splice(i, 1);
                    if (this.health <= 0) {
                        this.health = 0;
                        this.endGame(false);
                    }
                } else if (enemy.isDead) {
                    const multipliers = this.getDifficultyMultipliers();
                    const economyMultiplier = this.researchSystem.getUpgradeMultiplier('economy');
                    const reward = Math.floor(enemy.reward * multipliers.enemyReward * economyMultiplier);
                    this.currency += reward;
                    this.totalKills++;
                    this.currentWaveKills++;
                    this.currentWaveCurrency += reward;
                    
                    // Find which tower killed this enemy (simplified - use closest tower)
                    const killerTower = this.findKillerTower(enemy);
                    this.statistics.recordKill(killerTower ? killerTower.type : 'unknown', enemy.type);
                    this.statistics.recordCurrencyEarned(reward);
                    
                    // Handle splitting enemies
                    if (enemy.splits && enemy.shouldSplit()) {
                        for (let j = 0; j < enemy.splitCount; j++) {
                            const splitEnemy = new Enemy('basic', this.path, this.particleSystem, multipliers);
                            splitEnemy.progress = enemy.progress;
                            splitEnemy.position = { ...enemy.position };
                            splitEnemy.health = Math.floor(enemy.maxHealth / enemy.splitCount);
                            splitEnemy.maxHealth = splitEnemy.health;
                            splitEnemy.size = enemy.size * 0.7;
                            splitEnemy.reward = Math.floor(enemy.reward / enemy.splitCount);
                            this.enemies.push(splitEnemy);
                        }
                    }
                    
                    this.enemies.splice(i, 1);
                }
            }

            // Update towers
            for (const tower of this.towers) {
                tower.update(this.enemies, currentTime, this.towers);
            }

            // Update particles
            this.particleSystem.update();

            // Update damage numbers
            this.damageNumberSystem.update();

            // Update abilities
            this.abilitySystem.update(currentTime, this);

            // Update achievements
            this.achievementSystem.update(this);

            // Update dynamic difficulty
            this.updateDynamicDifficulty();

            // Update campaign objectives if in campaign mode
            if (this.campaignSystem.campaignMode) {
                const level = this.campaignSystem.levels[this.campaignSystem.currentLevel];
                if (level && level.isCompleted(this)) {
                    // Level completed - could show notification
                }
            }
        }

        this.updateUI();
    }

    render() {
        // Clear canvas with theme-based background
        const themeColors = this.getThemeColors();
        this.ctx.fillStyle = themeColors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background grid
        this.drawGrid();

        // Draw path with theme
        this.path.render(this.ctx, this.canvas.width, this.canvas.height, this.theme);
        
        // Draw wave transition effect
        if (this.waveTransitionActive) {
            this.renderWaveTransition();
        }

        // Draw towers
        for (const tower of this.towers) {
            const showRange = this.selectedTower === tower;
            tower.render(this.ctx, showRange);
        }

        // Draw tower placement preview
        if (this.mouseX && this.mouseY && !this.gameOver) {
            this.drawTowerPreview(this.mouseX, this.mouseY);
        }

        // Draw enemies
        for (const enemy of this.enemies) {
            enemy.render(this.ctx);
        }

        // Draw particles
        this.particleSystem.render(this.ctx);

        // Draw damage numbers
        this.damageNumberSystem.render(this.ctx);

        // Draw minimap
        this.renderMinimap();
    }

    renderMinimap() {
        if (!this.minimap || !this.minimapCtx || !this.path) return;

        const ctx = this.minimapCtx;
        const scaleX = this.minimap.width / this.canvas.width;
        const scaleY = this.minimap.height / this.canvas.height;

        // Clear
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(0, 0, this.minimap.width, this.minimap.height);

        // Draw path
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (this.path.waypoints.length > 0) {
            ctx.moveTo(this.path.waypoints[0].x * scaleX, this.path.waypoints[0].y * scaleY);
            for (let i = 1; i < this.path.waypoints.length; i++) {
                ctx.lineTo(this.path.waypoints[i].x * scaleX, this.path.waypoints[i].y * scaleY);
            }
        }
        ctx.stroke();

        // Draw towers
        ctx.fillStyle = '#3498db';
        for (const tower of this.towers) {
            ctx.beginPath();
            ctx.arc(tower.x * scaleX, tower.y * scaleY, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw enemies
        for (const enemy of this.enemies) {
            if (enemy.isDead || enemy.reachedEnd) continue;
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.position.x * scaleX, enemy.position.y * scaleY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawGrid() {
        const themeColors = this.getThemeColors();
        this.ctx.strokeStyle = themeColors.grid;
        this.ctx.lineWidth = 0.5;
        const gridSize = 50;

        // Subtle grid pattern
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        // Add subtle radial gradient overlay for depth
        const overlayGradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) * 0.7
        );
        overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        this.ctx.fillStyle = overlayGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawTowerPreview(x, y) {
        const towerConfigs = {
            basic: { cost: 50, color: '#3498db', range: 150 },
            rapid: { cost: 100, color: '#e74c3c', range: 120 },
            sniper: { cost: 150, color: '#9b59b6', range: 300 },
            cannon: { cost: 200, color: '#f39c12', range: 180 },
            debuff: { cost: 175, color: '#8e44ad', range: 200 },
            support: { cost: 150, color: '#2ecc71', range: 250 },
            chain: { cost: 225, color: '#1abc9c', range: 160 }
        };

        const config = towerConfigs[this.selectedTowerType];
        if (!config) return;

        // Check if position is valid
        const onPath = this.path.isPointOnPath(x, y, 50);
        const tooClose = this.towers.some(t => t.getDistanceTo(x, y) < 60);
        const notEnoughMoney = this.currency < config.cost;
        const valid = !onPath && !tooClose && !notEnoughMoney;

        // Shake effect for invalid placement
        let shakeX = 0;
        let shakeY = 0;
        if (!valid) {
            const shakeAmount = 3;
            shakeX = (Math.random() - 0.5) * shakeAmount;
            shakeY = (Math.random() - 0.5) * shakeAmount;
        }

        // Draw range indicator
        this.ctx.save();
        // Outer glow
        this.ctx.globalAlpha = valid ? 0.1 : 0.05;
        this.ctx.fillStyle = valid ? config.color : '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(x + shakeX, y + shakeY, config.range + 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Main range circle
        this.ctx.globalAlpha = valid ? 0.2 : 0.1;
        this.ctx.fillStyle = valid ? config.color : '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(x + shakeX, y + shakeY, config.range, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Range border with pulse effect for invalid
        this.ctx.globalAlpha = valid ? 0.4 : 0.6;
        this.ctx.strokeStyle = valid ? config.color : '#e74c3c';
        this.ctx.lineWidth = valid ? 2 : 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.restore();

        // Draw tower preview
        this.ctx.save();
        this.ctx.globalAlpha = valid ? 0.7 : 0.5;
        this.ctx.fillStyle = valid ? config.color : '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(x + shakeX, y + shakeY, 25, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Tower border with red flash for invalid
        this.ctx.strokeStyle = valid ? '#ecf0f1' : '#ffffff';
        this.ctx.lineWidth = valid ? 2 : 3;
        this.ctx.stroke();
        this.ctx.restore();

        // Draw cost text
        this.ctx.save();
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const costText = `$${config.cost}`;
        const costY = y + shakeY + 40;
        
        // Background for text
        const textWidth = this.ctx.measureText(costText).width;
        this.ctx.fillStyle = valid ? 'rgba(0, 0, 0, 0.7)' : 'rgba(231, 76, 60, 0.8)';
        this.ctx.fillRect(x + shakeX - textWidth / 2 - 5, costY - 10, textWidth + 10, 20);
        
        // Text
        this.ctx.fillStyle = valid ? (this.currency >= config.cost ? '#2ecc71' : '#f39c12') : '#ffffff';
        this.ctx.fillText(costText, x + shakeX, costY);
        this.ctx.restore();

        // Draw invalid reason text
        if (!valid) {
            this.ctx.save();
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#e74c3c';
            let reason = '';
            if (onPath) reason = 'Too close to path';
            else if (tooClose) reason = 'Too close to tower';
            else if (notEnoughMoney) reason = 'Not enough money';
            
            if (reason) {
                const reasonY = costY + 20;
                const reasonWidth = this.ctx.measureText(reason).width;
                this.ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
                this.ctx.fillRect(x + shakeX - reasonWidth / 2 - 5, reasonY - 8, reasonWidth + 10, 16);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillText(reason, x + shakeX, reasonY);
            }
            this.ctx.restore();
        }
    }

    updateUI() {
        document.getElementById('health-value').textContent = this.health;
        document.getElementById('currency-value').textContent = this.currency;
        document.getElementById('wave-value').textContent = this.wave;
        
        const aliveEnemies = this.enemies.filter(e => !e.isDead && !e.reachedEnd).length;
        document.getElementById('enemies-left-value').textContent = aliveEnemies;
        
        // Update wave progress bar
        this.updateWaveProgress();
        
        // Update countdown timer if wave is in progress
        this.updateWaveCountdown();
        
        this.updateWavePreview();
    }

    updateWaveProgress() {
        const progressBar = document.getElementById('wave-progress-bar');
        const progressFill = document.getElementById('wave-progress-fill');
        if (progressBar && progressFill && this.waveInProgress) {
            const progress = this.enemiesSpawned / this.enemiesInWave;
            progressFill.style.width = `${progress * 100}%`;
        } else if (progressFill) {
            progressFill.style.width = '0%';
        }
    }

    updateWaveCountdown() {
        const countdownEl = document.getElementById('wave-countdown');
        if (countdownEl && this.waveInProgress) {
            const remaining = this.enemiesInWave - this.enemiesSpawned;
            countdownEl.textContent = remaining > 0 ? `Next: ${remaining}` : 'Final Wave';
        } else if (countdownEl) {
            countdownEl.textContent = '';
        }
    }

    updateTowerStats() {
        if (!this.selectedTower) {
            this.hideTowerStats();
            return;
        }

        const stats = this.selectedTower.getStats();
        const panel = document.getElementById('tower-info-panel');
        if (panel) {
            panel.style.display = 'block';
            document.getElementById('tower-stat-name').textContent = stats.name;
            document.getElementById('tower-stat-level').textContent = stats.level;
            document.getElementById('tower-stat-damage').textContent = stats.damage;
            document.getElementById('tower-stat-range').textContent = stats.range;
            document.getElementById('tower-stat-firerate').textContent = (stats.fireRate / 1000).toFixed(2) + 's';
            document.getElementById('tower-stat-dps').textContent = stats.dps;
            document.getElementById('tower-stat-kills').textContent = stats.kills;
            document.getElementById('tower-stat-upgrade').textContent = '$' + stats.upgradeCost;
            
            // Update targeting mode selector
            const targetingSelect = document.getElementById('tower-targeting-select');
            if (targetingSelect) {
                targetingSelect.value = stats.targetingMode;
                // Remove old listener and add new one
                const newSelect = targetingSelect.cloneNode(true);
                targetingSelect.parentNode.replaceChild(newSelect, targetingSelect);
                newSelect.addEventListener('change', (e) => {
                    if (this.selectedTower) {
                        this.selectedTower.setTargetingMode(e.target.value);
                    }
                });
            }
        }
    }

    hideTowerStats() {
        const panel = document.getElementById('tower-info-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    endGame(victory) {
        this.gameOver = true;
        const overlay = document.getElementById('game-over-overlay');
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');
        
        // Calculate score
        const finalWave = victory ? this.wave : this.wave - 1;
        const score = finalWave * 100 + this.totalKills * 10 + this.currency;
        
        // Check for new high score
        const isNewHighScore = this.checkHighScore(finalWave, this.totalKills, score);
        
        // Check campaign completion
        let campaignCompleted = false;
        if (this.campaignSystem.campaignMode) {
            campaignCompleted = this.campaignSystem.endCampaign(this);
        }
        
        overlay.classList.remove('hidden');
        if (victory || campaignCompleted) {
            title.textContent = campaignCompleted ? 'Campaign Level Complete!' : 'Victory!';
            title.style.color = '#2ecc71';
            let msg = `You survived ${finalWave} waves!`;
            msg += `\nKills: ${this.totalKills}`;
            msg += `\nScore: ${score}`;
            if (campaignCompleted) {
                const level = this.campaignSystem.levels[this.campaignSystem.currentLevel];
                msg += `\n\nCampaign Rewards:`;
                if (level.rewards.research) msg += `\n+${level.rewards.research} Research Points`;
                if (level.rewards.currency) msg += `\n+$${level.rewards.currency}`;
            }
            if (isNewHighScore) {
                msg += `\n\n🎉 NEW HIGH SCORE! 🎉`;
            }
            message.textContent = msg;
        } else {
            title.textContent = 'Game Over';
            title.style.color = '#e74c3c';
            let msg = `You survived ${finalWave} waves!`;
            msg += `\nKills: ${this.totalKills}`;
            msg += `\nScore: ${score}`;
            if (isNewHighScore) {
                msg += `\n\n🎉 NEW HIGH SCORE! 🎉`;
            }
            message.textContent = msg;
        }
        
        // Save high scores
        this.saveHighScores();
        this.updateHighScoreDisplay();
        this.statistics.saveStatistics();
    }

    loadHighScores() {
        try {
            const saved = localStorage.getItem('towerDefenseHighScores');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading high scores:', e);
        }
        return {
            highestWave: 0,
            totalKills: 0,
            bestScore: 0,
            bestScorePerSeed: {}
        };
    }

    saveHighScores() {
        try {
            const finalWave = this.gameOver ? (this.wave - (this.health <= 0 ? 1 : 0)) : this.wave;
            const score = finalWave * 100 + this.totalKills * 10 + this.currency;
            
            // Update high scores
            if (finalWave > this.highScores.highestWave) {
                this.highScores.highestWave = finalWave;
            }
            if (this.totalKills > this.highScores.totalKills) {
                this.highScores.totalKills = this.totalKills;
            }
            if (score > this.highScores.bestScore) {
                this.highScores.bestScore = score;
            }
            
            // Per-seed high score
            if (this.mapSeed) {
                if (!this.highScores.bestScorePerSeed[this.mapSeed] || 
                    score > this.highScores.bestScorePerSeed[this.mapSeed]) {
                    this.highScores.bestScorePerSeed[this.mapSeed] = score;
                }
            }
            
            localStorage.setItem('towerDefenseHighScores', JSON.stringify(this.highScores));
        } catch (e) {
            console.error('Error saving high scores:', e);
        }
    }

    checkHighScore(wave, kills, score) {
        return wave > this.highScores.highestWave || 
               kills > this.highScores.totalKills || 
               score > this.highScores.bestScore;
    }

    updateHighScoreDisplay() {
        const highWaveEl = document.getElementById('high-score-wave');
        const highKillsEl = document.getElementById('high-score-kills');
        const highScoreEl = document.getElementById('high-score-score');
        
        if (highWaveEl) highWaveEl.textContent = this.highScores.highestWave;
        if (highKillsEl) highKillsEl.textContent = this.highScores.totalKills;
        if (highScoreEl) highScoreEl.textContent = this.highScores.bestScore;
    }

    getDifficultyMultipliers() {
        const baseMultipliers = {
            easy: {
                currency: 1.5,
                enemyHealth: 0.7,
                enemyReward: 1.2,
                spawnRate: 0.8
            },
            normal: {
                currency: 1.0,
                enemyHealth: 1.0,
                enemyReward: 1.0,
                spawnRate: 1.0
            },
            hard: {
                currency: 0.7,
                enemyHealth: 1.5,
                enemyReward: 0.8,
                spawnRate: 1.2
            },
            nightmare: {
                currency: 0.5,
                enemyHealth: 2.0,
                enemyReward: 0.6,
                spawnRate: 1.5
            }
        };
        
        const base = baseMultipliers[this.difficulty] || baseMultipliers.normal;
        
        // Apply dynamic difficulty adjustment
        return {
            currency: base.currency * this.dynamicDifficultyAdjustment,
            enemyHealth: base.enemyHealth / this.dynamicDifficultyAdjustment,
            enemyReward: base.enemyReward * this.dynamicDifficultyAdjustment,
            spawnRate: base.spawnRate / this.dynamicDifficultyAdjustment
        };
    }

    updateDynamicDifficulty() {
        // Adjust difficulty based on player performance
        // If player is doing well (perfect waves, high health), increase difficulty slightly
        // If player is struggling (low health, many leaks), decrease difficulty slightly
        
        const healthPercent = this.health / 100;
        const recentPerformance = this.perfectWaveStreak;
        
        // Adjust based on health and performance
        if (healthPercent > 0.8 && recentPerformance >= 2) {
            // Player doing well - increase difficulty
            this.dynamicDifficultyAdjustment = Math.min(1.2, this.dynamicDifficultyAdjustment + 0.01);
        } else if (healthPercent < 0.3 || this.waveLeaks > 5) {
            // Player struggling - decrease difficulty
            this.dynamicDifficultyAdjustment = Math.max(0.8, this.dynamicDifficultyAdjustment - 0.01);
        } else {
            // Gradually return to normal
            if (this.dynamicDifficultyAdjustment > 1.0) {
                this.dynamicDifficultyAdjustment = Math.max(1.0, this.dynamicDifficultyAdjustment - 0.005);
            } else if (this.dynamicDifficultyAdjustment < 1.0) {
                this.dynamicDifficultyAdjustment = Math.min(1.0, this.dynamicDifficultyAdjustment + 0.005);
            }
        }
    }

    getStartingCurrency() {
        const baseCurrency = 500;
        return Math.floor(baseCurrency * this.getDifficultyMultipliers().currency);
    }

    setDifficulty(difficulty) {
        if (['easy', 'normal', 'hard', 'nightmare'].includes(difficulty)) {
            this.difficulty = difficulty;
            // Update currency display if game hasn't started
            if (this.wave === 0 && !this.waveInProgress) {
                this.currency = this.getStartingCurrency();
                this.updateUI();
            }
        }
    }

    updateDifficultyDescription() {
        const descriptions = {
            easy: 'More currency, weaker enemies, higher rewards. Great for beginners!',
            normal: 'Standard difficulty with balanced gameplay.',
            hard: 'Less currency, stronger enemies, lower rewards. For experienced players!',
            nightmare: 'Extreme challenge! Very limited resources and powerful enemies.'
        };
        const descEl = document.getElementById('difficulty-description');
        if (descEl) {
            descEl.textContent = descriptions[this.difficulty] || descriptions.normal;
        }
    }

    processWaveRewards() {
        const isPerfectWave = this.waveLeaks === 0;
        let rewardText = '';
        let bonusCurrency = 0;

        if (isPerfectWave) {
            this.perfectWaveStreak++;
            // Base perfect wave bonus
            bonusCurrency = 50 + (this.wave * 5);
            
            // Streak multiplier
            if (this.perfectWaveStreak > 1) {
                const streakBonus = Math.floor(bonusCurrency * (this.perfectWaveStreak - 1) * 0.2);
                bonusCurrency += streakBonus;
                rewardText = `Perfect Wave! +$${bonusCurrency} (${this.perfectWaveStreak}x streak)`;
            } else {
                rewardText = `Perfect Wave! +$${bonusCurrency}`;
            }
        } else {
            this.perfectWaveStreak = 0;
            // Small completion bonus even with leaks
            bonusCurrency = Math.max(0, 20 - (this.waveLeaks * 5));
            if (bonusCurrency > 0) {
                rewardText = `Wave Complete! +$${bonusCurrency} (${this.waveLeaks} leaks)`;
            } else {
                rewardText = `Wave Complete (${this.waveLeaks} leaks - no bonus)`;
            }
        }

        this.currency += bonusCurrency;
        this.currentWaveCurrency += bonusCurrency;

        // Record wave statistics
        this.statistics.recordWave(this.wave, isPerfectWave, this.waveLeaks, this.currentWaveKills, this.currentWaveCurrency);
        this.currentWaveKills = 0;
        this.currentWaveCurrency = 0;

        // Award research points
        const researchPoints = Math.max(1, Math.floor(this.wave / 2));
        this.researchSystem.addResearchPoints(researchPoints);

        // Show reward notification
        this.showWaveReward(rewardText, bonusCurrency, isPerfectWave);
        this.updateUI();
        this.updateResearchUI();
        this.statistics.saveStatistics();
    }

    showWaveReward(text, amount, isPerfect) {
        // Create temporary notification element
        const notification = document.createElement('div');
        notification.className = 'wave-reward-notification';
        notification.textContent = text;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${isPerfect ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)' : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'};
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 1.5em;
            font-weight: bold;
            z-index: 2000;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            animation: fadeInOut 2s ease-in-out;
            pointer-events: none;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    executeAirstrike(x, y) {
        const airstrikeRadius = 150;
        const airstrikeDamage = 200;
        let hitCount = 0;

        for (const enemy of this.enemies) {
            if (enemy.isDead || enemy.reachedEnd) continue;
            const distance = Math.sqrt(
                Math.pow(enemy.position.x - x, 2) + 
                Math.pow(enemy.position.y - y, 2)
            );
            if (distance < airstrikeRadius) {
                enemy.takeDamage(airstrikeDamage, this.damageNumberSystem);
                hitCount++;
            }
        }

        // Visual effect
        this.particleSystem.createExplosion(x, y, '#f39c12', 50);
        this.damageNumberSystem.createDamageNumber(x, y, airstrikeDamage, '#f39c12');
    }

    updateAbilitiesUI() {
        const abilities = ['speed', 'freeze', 'airstrike', 'shield'];
        const abilityNames = ['speedBoost', 'freezeWave', 'airstrike', 'shield'];
        
        for (let i = 0; i < abilities.length; i++) {
            const btn = document.getElementById(`ability-${abilities[i]}`);
            const ability = this.abilitySystem.getAbility(abilityNames[i]);
            if (btn && ability) {
                const canUse = ability.canUse(this.lastTime, this.currency);
                btn.disabled = !canUse;
                btn.style.opacity = canUse ? '1' : '0.5';
                
                // Show cooldown
                if (ability.lastUsed > 0) {
                    const cooldownRemaining = Math.max(0, ability.cooldown - (this.lastTime - ability.lastUsed));
                    if (cooldownRemaining > 0) {
                        btn.title = `${ability.name} - Cooldown: ${Math.ceil(cooldownRemaining / 1000)}s`;
                    } else {
                        btn.title = `${ability.name} - $${ability.cost}`;
                    }
                }
            }
        }
    }

    updateTowerButtons() {
        const unlockedTowers = this.researchSystem.getUnlockedTowers();
        document.querySelectorAll('.tower-btn').forEach(btn => {
            const towerType = btn.dataset.tower;
            if (!unlockedTowers.includes(towerType)) {
                btn.style.opacity = '0.5';
                btn.title = (btn.title || '') + ' (Locked - Research to unlock)';
            } else {
                btn.style.opacity = '1';
            }
        });
    }

    updateResearchUI() {
        const researchPointsEl = document.getElementById('research-points');
        if (researchPointsEl) {
            researchPointsEl.textContent = this.researchSystem.researchPoints;
        }
    }

    showResearchPanel() {
        const panel = document.getElementById('research-panel');
        if (panel) {
            panel.style.display = 'block';
            this.renderResearchTree();
        }
    }

    hideResearchPanel() {
        const panel = document.getElementById('research-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    renderResearchTree() {
        const content = document.getElementById('research-content');
        if (!content) return;

        content.innerHTML = '';

        const nodes = this.researchSystem.nodes;
        for (const [id, node] of Object.entries(nodes)) {
            const nodeDiv = document.createElement('div');
            nodeDiv.className = `research-node ${node.researched ? 'researched' : ''}`;
            nodeDiv.style.cssText = `
                background: ${node.researched ? '#27ae60' : '#34495e'};
                border: 2px solid ${node.researched ? '#2ecc71' : '#667eea'};
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 10px;
                opacity: ${this.researchSystem.canResearch(id) ? '1' : '0.6'};
            `;

            const canResearch = this.researchSystem.canResearch(id);
            const hasPoints = this.researchSystem.researchPoints >= node.cost;

            nodeDiv.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">${node.name}</div>
                <div style="font-size: 0.85em; color: #bdc3c7; margin-bottom: 5px;">${node.description}</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #f39c12;">Cost: ${node.cost} RP</span>
                    ${!node.researched ? `
                        <button class="research-btn" data-node="${id}" 
                                ${canResearch ? '' : 'disabled'}
                                style="background: ${canResearch ? '#667eea' : '#7f8c8d'}; 
                                       border: none; color: white; padding: 5px 10px; 
                                       border-radius: 5px; cursor: ${canResearch ? 'pointer' : 'not-allowed'};">
                            Research
                        </button>
                    ` : '<span style="color: #2ecc71;">✓ Researched</span>'}
                </div>
            `;

            const researchBtn = nodeDiv.querySelector('.research-btn');
            if (researchBtn) {
                researchBtn.addEventListener('click', () => {
                    if (this.researchSystem.research(id)) {
                        this.updateTowerButtons();
                        this.renderResearchTree();
                        this.updateResearchUI();
                        // Apply upgrades to existing towers
                        this.applyResearchUpgrades();
                    }
                });
            }

            content.appendChild(nodeDiv);
        }
    }

    applyResearchUpgrades() {
        // Recalculate tower stats with research multipliers
        for (const tower of this.towers) {
            const damageMultiplier = this.researchSystem.getUpgradeMultiplier('damage');
            const rangeMultiplier = this.researchSystem.getUpgradeMultiplier('range');
            const fireRateMultiplier = this.researchSystem.getUpgradeMultiplier('fireRate');
            
            // Get base stats from config
            const types = {
                basic: { damage: 15, range: 150, fireRate: 1000 },
                rapid: { damage: 8, range: 120, fireRate: 300 },
                sniper: { damage: 50, range: 300, fireRate: 2000 },
                cannon: { damage: 40, range: 180, fireRate: 1500 },
                debuff: { damage: 5, range: 200, fireRate: 2000 },
                support: { damage: 0, range: 250, fireRate: 0 },
                chain: { damage: 25, range: 160, fireRate: 1200 }
            };
            const baseConfig = types[tower.type] || types.basic;
            
            // Apply multipliers (only if not already applied)
            tower.damage = Math.floor(baseConfig.damage * damageMultiplier * Math.pow(1.5, tower.level - 1));
            tower.range = Math.floor(baseConfig.range * rangeMultiplier * Math.pow(1.2, tower.level - 1));
            tower.fireRate = Math.floor(baseConfig.fireRate * fireRateMultiplier * Math.pow(0.9, tower.level - 1));
        }
    }

    showAchievementsPanel() {
        const panel = document.getElementById('achievements-panel');
        if (panel) {
            panel.style.display = 'block';
            this.renderAchievements();
        }
    }

    hideAchievementsPanel() {
        const panel = document.getElementById('achievements-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    renderAchievements() {
        const content = document.getElementById('achievements-content');
        if (!content) return;

        content.innerHTML = '';

        const unlockedCount = this.achievementSystem.getUnlockedCount();
        const totalCount = this.achievementSystem.getTotalCount();

        const header = document.createElement('div');
        header.style.cssText = 'margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #34495e;';
        header.innerHTML = `<div style="font-size: 1.1em; color: #ecf0f1;">Progress: ${unlockedCount} / ${totalCount}</div>`;
        content.appendChild(header);

        for (const achievement of this.achievementSystem.achievements) {
            const achievementDiv = document.createElement('div');
            achievementDiv.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
            achievementDiv.style.cssText = `
                background: ${achievement.unlocked ? '#27ae60' : '#34495e'};
                border: 2px solid ${achievement.unlocked ? '#2ecc71' : '#667eea'};
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 10px;
            `;

            achievementDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 1.5em;">${achievement.unlocked ? '✓' : '○'}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 5px;">${achievement.name}</div>
                        <div style="font-size: 0.85em; color: #bdc3c7;">${achievement.description}</div>
                        ${achievement.unlocked && achievement.unlockedAt ? 
                            `<div style="font-size: 0.75em; color: #95a5a6; margin-top: 5px;">
                                Unlocked: ${new Date(achievement.unlockedAt).toLocaleDateString()}
                            </div>` : ''}
                    </div>
                </div>
            `;

            content.appendChild(achievementDiv);
        }
    }

    showStatisticsPanel() {
        const panel = document.getElementById('statistics-panel');
        if (panel) {
            panel.style.display = 'block';
            this.renderStatistics();
        }
    }

    hideStatisticsPanel() {
        const panel = document.getElementById('statistics-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    renderStatistics() {
        const content = document.getElementById('statistics-content');
        if (!content) return;

        const stats = this.statistics.getStats();
        const playTimeHours = Math.floor(stats.totalPlayTime / 3600000);
        const playTimeMinutes = Math.floor((stats.totalPlayTime % 3600000) / 60000);

        content.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="color: #ecf0f1; margin-bottom: 10px; border-bottom: 2px solid #34495e; padding-bottom: 5px;">Combat Stats</h3>
                <div class="stat-item"><span class="stat-label">Total Kills:</span><span class="stat-value">${stats.totalKills}</span></div>
                <div class="stat-item"><span class="stat-label">Total Waves:</span><span class="stat-value">${stats.totalWaves}</span></div>
                <div class="stat-item"><span class="stat-label">Perfect Waves:</span><span class="stat-value">${stats.perfectWaves} (${stats.perfectWavePercentage}%)</span></div>
                <div class="stat-item"><span class="stat-label">Total Damage:</span><span class="stat-value">${stats.totalDamageDealt.toLocaleString()}</span></div>
                <div class="stat-item"><span class="stat-label">Avg Kills/Wave:</span><span class="stat-value">${stats.averageKillsPerWave}</span></div>
            </div>
            <div style="margin-bottom: 15px;">
                <h3 style="color: #ecf0f1; margin-bottom: 10px; border-bottom: 2px solid #34495e; padding-bottom: 5px;">Economy Stats</h3>
                <div class="stat-item"><span class="stat-label">Currency Earned:</span><span class="stat-value">$${stats.totalCurrencyEarned.toLocaleString()}</span></div>
                <div class="stat-item"><span class="stat-label">Currency Spent:</span><span class="stat-value">$${stats.totalCurrencySpent.toLocaleString()}</span></div>
                <div class="stat-item"><span class="stat-label">Net Profit:</span><span class="stat-value">$${(stats.totalCurrencyEarned - stats.totalCurrencySpent).toLocaleString()}</span></div>
                <div class="stat-item"><span class="stat-label">Efficiency:</span><span class="stat-value">${stats.efficiency} kills/$100</span></div>
            </div>
            <div style="margin-bottom: 15px;">
                <h3 style="color: #ecf0f1; margin-bottom: 10px; border-bottom: 2px solid #34495e; padding-bottom: 5px;">Tower Stats</h3>
                <div class="stat-item"><span class="stat-label">Towers Placed:</span><span class="stat-value">${stats.totalTowersPlaced}</span></div>
                <div class="stat-item"><span class="stat-label">Towers Sold:</span><span class="stat-value">${stats.totalTowersSold}</span></div>
                <div class="stat-item"><span class="stat-label">Upgrades:</span><span class="stat-value">${stats.totalUpgrades}</span></div>
                <div class="stat-item"><span class="stat-label">Favorite Tower:</span><span class="stat-value">${stats.favoriteTower}</span></div>
            </div>
            <div style="margin-bottom: 15px;">
                <h3 style="color: #ecf0f1; margin-bottom: 10px; border-bottom: 2px solid #34495e; padding-bottom: 5px;">Enemy Stats</h3>
                <div class="stat-item"><span class="stat-label">Most Killed:</span><span class="stat-value">${stats.mostKilledEnemy}</span></div>
            </div>
            <div style="margin-bottom: 15px;">
                <h3 style="color: #ecf0f1; margin-bottom: 10px; border-bottom: 2px solid #34495e; padding-bottom: 5px;">Time Stats</h3>
                <div class="stat-item"><span class="stat-label">Play Time:</span><span class="stat-value">${playTimeHours}h ${playTimeMinutes}m</span></div>
            </div>
        `;
    }

    restart() {
        this.towers = [];
        this.enemies = [];
        this.selectedTower = null;
        this.currency = this.getStartingCurrency();
        this.health = 100;
        this.wave = 0;
        this.waveInProgress = false;
        this.paused = false;
        this.gameOver = false;
        this.enemiesSpawned = 0;
        this.enemiesInWave = 0;
        this.totalKills = 0;
        this.perfectWaveStreak = 0;
        this.waveLeaks = 0;
        this.totalTowersPlaced = 0;
        this.currentWaveKills = 0;
        this.currentWaveCurrency = 0;
        this.dynamicDifficultyAdjustment = 1.0;
        this.campaignSystem.campaignMode = false;
        this.statistics.updatePlayTime();
        
        // Regenerate map with same seed
        this.regenerateMap(this.mapSeed);
        
        document.getElementById('game-over-overlay').classList.add('hidden');
        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').textContent = 'Pause';
        document.getElementById('upgrade-btn').disabled = true;
        document.getElementById('sell-btn').disabled = true;
        this.gameSpeed = 3;
        document.getElementById('fastforward-btn').textContent = 'Fast Forward (3x)';
        document.getElementById('fastforward-btn').classList.remove('active');
        
        this.updateUI();
    }

    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(currentTime);
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    try {
        new Game();
    } catch (error) {
        console.error('Error initializing game:', error);
        alert('Error loading game. Please refresh the page.');
    }
});

