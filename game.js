class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particleSystem = new ParticleSystem();
        this.mapSeed = null; // Will be set on first load
        this.path = null; // Will be initialized in setupCanvas
        this.towers = [];
        this.enemies = [];
        this.selectedTower = null;
        this.selectedTowerType = 'basic';
        this.currency = 500;
        this.health = 100;
        this.wave = 0;
        this.waveInProgress = false;
        this.paused = false;
        this.gameOver = false;
        this.lastTime = 0;
        this.enemiesSpawned = 0;
        this.enemiesInWave = 0;
        this.spawnTimer = 0;
        this.spawnDelay = 1000; // milliseconds between enemy spawns
        this.gameSpeed = 2; // Fast forward multiplier (default 2x speed)

        this.setupCanvas();
        this.setupEventListeners();
        this.gameLoop();
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
                document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedTowerType = btn.dataset.tower;
                this.selectedTower = null;
            });
        });

        // Canvas click - place tower or select tower
        this.canvas.addEventListener('click', (e) => {
            if (this.gameOver || this.paused) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

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
            } else {
                // Try to place new tower
                this.placeTower(x, y);
                this.selectedTower = null;
                document.getElementById('upgrade-btn').disabled = true;
                document.getElementById('sell-btn').disabled = true;
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
            cannon: { cost: 200 }
        };

        const cost = towerConfigs[this.selectedTowerType]?.cost || 50;
        if (this.currency < cost) {
            return; // Not enough currency
        }

        const tower = new Tower(x, y, this.selectedTowerType, this.particleSystem);
        this.towers.push(tower);
        this.currency -= cost;
        this.updateUI();
    }

    upgradeTower(tower) {
        const cost = tower.getUpgradeCost();
        if (this.currency >= cost) {
            this.currency -= cost;
            tower.upgrade();
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
        
        this.selectedTower = null;
        document.getElementById('upgrade-btn').disabled = true;
        document.getElementById('sell-btn').disabled = true;
        this.updateUI();
    }

    toggleFastForward() {
        const speeds = [2, 3, 4];
        const currentIndex = speeds.indexOf(this.gameSpeed);
        this.gameSpeed = speeds[(currentIndex + 1) % speeds.length];
        const btn = document.getElementById('fastforward-btn');
        btn.textContent = `Fast Forward (${this.gameSpeed}x)`;
        btn.classList.toggle('active', this.gameSpeed > 2);
    }

    startWave() {
        this.wave++;
        this.waveInProgress = true;
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;

        // Calculate enemies for this wave
        const baseEnemies = 10;
        const waveMultiplier = Math.floor(this.wave / 3) + 1;
        this.enemiesInWave = baseEnemies + (this.wave * 2) + (waveMultiplier * 5);

        document.getElementById('start-btn').disabled = true;
    }

    spawnEnemy(currentTime) {
        if (!this.waveInProgress || this.gameOver) return;
        if (this.enemiesSpawned >= this.enemiesInWave) {
            // Check if all enemies are dead or reached end
            if (this.enemies.every(e => e.isDead || e.reachedEnd)) {
                this.waveInProgress = false;
                document.getElementById('start-btn').disabled = false;
            }
            return;
        }

        if (currentTime - this.spawnTimer >= this.spawnDelay) {
            // Determine enemy type based on wave
            let enemyType = 'basic';
            const rand = Math.random();
            
            if (this.wave >= 5 && rand < 0.1) {
                enemyType = 'boss';
            } else if (this.wave >= 3 && rand < 0.3) {
                enemyType = 'tank';
            } else if (this.wave >= 2 && rand < 0.5) {
                enemyType = 'fast';
            }

            const enemy = new Enemy(enemyType, this.path, this.particleSystem);
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

                if (enemy.reachedEnd && !enemy.isDead) {
                    this.health -= 10;
                    this.enemies.splice(i, 1);
                    if (this.health <= 0) {
                        this.health = 0;
                        this.endGame(false);
                    }
                } else if (enemy.isDead) {
                    this.currency += enemy.reward;
                    this.enemies.splice(i, 1);
                }
            }

            // Update towers
            for (const tower of this.towers) {
                tower.update(this.enemies, currentTime);
            }

            // Update particles
            this.particleSystem.update();
        }

        this.updateUI();
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#1a252f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background grid
        this.drawGrid();

        // Draw path
        this.path.render(this.ctx, this.canvas.width, this.canvas.height);

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
    }

    drawGrid() {
        this.ctx.strokeStyle = '#1e2a35';
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
            cannon: { cost: 200, color: '#f39c12', range: 180 }
        };

        const config = towerConfigs[this.selectedTowerType];
        if (!config) return;

        // Check if position is valid
        const valid = !this.path.isPointOnPath(x, y, 50) && 
                     !this.towers.some(t => t.getDistanceTo(x, y) < 60) &&
                     this.currency >= config.cost;

        // Draw range indicator
        this.ctx.save();
        // Outer glow
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = config.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, config.range + 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Main range circle
        this.ctx.globalAlpha = 0.2;
        this.ctx.fillStyle = config.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, config.range, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Range border
        this.ctx.globalAlpha = 0.4;
        this.ctx.strokeStyle = config.color;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.restore();

        // Draw tower preview
        this.ctx.save();
        this.ctx.globalAlpha = valid ? 0.7 : 0.4;
        this.ctx.fillStyle = valid ? config.color : '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 25, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Tower border
        this.ctx.strokeStyle = valid ? '#ecf0f1' : '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
    }

    updateUI() {
        document.getElementById('health-value').textContent = this.health;
        document.getElementById('currency-value').textContent = this.currency;
        document.getElementById('wave-value').textContent = this.wave;
        
        const aliveEnemies = this.enemies.filter(e => !e.isDead && !e.reachedEnd).length;
        document.getElementById('enemies-left-value').textContent = aliveEnemies;
    }

    endGame(victory) {
        this.gameOver = true;
        const overlay = document.getElementById('game-over-overlay');
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');
        
        overlay.classList.remove('hidden');
        if (victory) {
            title.textContent = 'Victory!';
            title.style.color = '#2ecc71';
            message.textContent = `You survived ${this.wave} waves!`;
        } else {
            title.textContent = 'Game Over';
            title.style.color = '#e74c3c';
            message.textContent = `You survived ${this.wave - 1} waves!`;
        }
    }

    restart() {
        this.towers = [];
        this.enemies = [];
        this.selectedTower = null;
        this.currency = 500;
        this.health = 100;
        this.wave = 0;
        this.waveInProgress = false;
        this.paused = false;
        this.gameOver = false;
        this.enemiesSpawned = 0;
        this.enemiesInWave = 0;
        
        // Regenerate map with same seed
        this.regenerateMap(this.mapSeed);
        
        document.getElementById('game-over-overlay').classList.add('hidden');
        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').textContent = 'Pause';
        document.getElementById('upgrade-btn').disabled = true;
        document.getElementById('sell-btn').disabled = true;
        this.gameSpeed = 2;
        document.getElementById('fastforward-btn').textContent = 'Fast Forward (2x)';
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

