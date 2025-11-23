class Projectile {
    constructor(x, y, targetX, targetY, damage, speed, color) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.speed = speed;
        this.color = color;
        this.size = 5;
        this.hit = false;
        
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / distance) * speed;
        this.vy = (dy / distance) * speed;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    render(ctx) {
        ctx.save();
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 2, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    checkHit(enemy) {
        if (this.hit || !enemy || enemy.isDead || enemy.reachedEnd) return false;
        const distance = Math.sqrt(
            Math.pow(this.x - enemy.position.x, 2) + 
            Math.pow(this.y - enemy.position.y, 2)
        );
        return distance < enemy.size + this.size;
    }
}

class Tower {
    constructor(x, y, type, particleSystem, damageNumberSystem = null, game = null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.particleSystem = particleSystem;
        this.damageNumberSystem = damageNumberSystem;
        this.game = game;
        this.projectiles = [];
        this.lastShotTime = 0;
        this.target = null;
        this.level = 1;
        this.totalUpgradeCost = 0; // Track total spent on upgrades
        this.kills = 0; // Track total kills
        this.totalDamage = 0; // Track total damage dealt
        
        // Tower type configurations
        const types = {
            basic: {
                damage: 15,
                range: 150,
                fireRate: 1000, // milliseconds
                cost: 50,
                color: '#3498db',
                upgradeCost: 30,
                name: 'Basic Tower'
            },
            rapid: {
                damage: 8,
                range: 120,
                fireRate: 300,
                cost: 100,
                color: '#e74c3c',
                upgradeCost: 50,
                name: 'Rapid Fire'
            },
            sniper: {
                damage: 50,
                range: 300,
                fireRate: 2000,
                cost: 150,
                color: '#9b59b6',
                upgradeCost: 75,
                name: 'Sniper'
            },
            cannon: {
                damage: 40,
                range: 180,
                fireRate: 1500,
                cost: 200,
                color: '#f39c12',
                upgradeCost: 100,
                name: 'Cannon',
                areaDamage: true,
                areaRadius: 60
            },
            debuff: {
                damage: 5,
                range: 200,
                fireRate: 2000,
                cost: 175,
                color: '#8e44ad',
                upgradeCost: 90,
                name: 'Debuff Tower',
                debuff: true,
                slowAmount: 0.5, // 50% speed reduction
                debuffDuration: 3000 // 3 seconds
            },
            support: {
                damage: 0,
                range: 250,
                fireRate: 0,
                cost: 150,
                color: '#2ecc71',
                upgradeCost: 80,
                name: 'Support Tower',
                support: true,
                damageBoost: 1.3, // 30% damage boost
                rangeBoost: 1.2 // 20% range boost
            },
            chain: {
                damage: 25,
                range: 160,
                fireRate: 1200,
                cost: 225,
                color: '#1abc9c',
                upgradeCost: 110,
                name: 'Chain Lightning',
                chainLightning: true,
                chainCount: 3,
                chainRange: 100
            }
        };

        const config = types[type] || types.basic;
        // Apply research upgrades if game reference exists
        const damageMultiplier = this.game?.researchSystem?.getUpgradeMultiplier('damage') || 1.0;
        const rangeMultiplier = this.game?.researchSystem?.getUpgradeMultiplier('range') || 1.0;
        const fireRateMultiplier = this.game?.researchSystem?.getUpgradeMultiplier('fireRate') || 1.0;
        
        this.damage = Math.floor(config.damage * damageMultiplier);
        this.range = Math.floor(config.range * rangeMultiplier);
        this.fireRate = Math.floor(config.fireRate * fireRateMultiplier);
        this.cost = config.cost;
        this.color = config.color;
        this.upgradeCost = config.upgradeCost;
        this.name = config.name;
        this.areaDamage = config.areaDamage || false;
        this.areaRadius = config.areaRadius || 0;
        this.debuff = config.debuff || false;
        this.slowAmount = config.slowAmount || 0.5;
        this.debuffDuration = config.debuffDuration || 3000;
        this.support = config.support || false;
        this.damageBoost = config.damageBoost || 1.3;
        this.rangeBoost = config.rangeBoost || 1.2;
        this.chainLightning = config.chainLightning || false;
        this.chainCount = config.chainCount || 3;
        this.chainRange = config.chainRange || 100;
        this.size = 25;
        this.targetingMode = 'closest'; // closest, farthest, strongest, weakest, first
        this.buffedTowers = []; // Towers receiving support buffs
        this.debuffedEnemies = new Map(); // Track debuffed enemies
        this.receivingSupport = false;
        this.supportDamageMultiplier = 1.0;
        this.supportRangeMultiplier = 1.0;
        this.currentAngle = 0; // For smooth rotation
        this.upgradeAnimation = 0; // For upgrade visual effect
    }

    findTarget(enemies) {
        const validEnemies = enemies.filter(e => !e.isDead && !e.reachedEnd);
        if (validEnemies.length === 0) {
            this.target = null;
            return null;
        }

        // Apply support range boost
        const actualRange = this.range * (this.supportRangeMultiplier || 1.0);

        // Filter enemies in range
        const enemiesInRange = validEnemies.filter(enemy => {
            const distance = this.getDistanceTo(enemy.position.x, enemy.position.y);
            return distance <= actualRange;
        });

        if (enemiesInRange.length === 0) {
            this.target = null;
            return null;
        }

        let selectedEnemy = null;

        switch (this.targetingMode) {
            case 'closest':
                selectedEnemy = enemiesInRange.reduce((closest, enemy) => {
                    const dist1 = this.getDistanceTo(closest.position.x, closest.position.y);
                    const dist2 = this.getDistanceTo(enemy.position.x, enemy.position.y);
                    return dist2 < dist1 ? enemy : closest;
                });
                break;

            case 'farthest':
                selectedEnemy = enemiesInRange.reduce((farthest, enemy) => {
                    const dist1 = this.getDistanceTo(farthest.position.x, farthest.position.y);
                    const dist2 = this.getDistanceTo(enemy.position.x, enemy.position.y);
                    return dist2 > dist1 ? enemy : farthest;
                });
                break;

            case 'strongest':
                selectedEnemy = enemiesInRange.reduce((strongest, enemy) => {
                    return enemy.health > strongest.health ? enemy : strongest;
                });
                break;

            case 'weakest':
                selectedEnemy = enemiesInRange.reduce((weakest, enemy) => {
                    return enemy.health < weakest.health ? enemy : weakest;
                });
                break;

            case 'first':
                selectedEnemy = enemiesInRange.reduce((first, enemy) => {
                    return enemy.progress > first.progress ? enemy : first;
                });
                break;

            default:
                // Default to closest
                selectedEnemy = enemiesInRange.reduce((closest, enemy) => {
                    const dist1 = this.getDistanceTo(closest.position.x, closest.position.y);
                    const dist2 = this.getDistanceTo(enemy.position.x, enemy.position.y);
                    return dist2 < dist1 ? enemy : closest;
                });
        }

        this.target = selectedEnemy;
        return selectedEnemy;
    }

    setTargetingMode(mode) {
        const validModes = ['closest', 'farthest', 'strongest', 'weakest', 'first'];
        if (validModes.includes(mode)) {
            this.targetingMode = mode;
        }
    }

    shoot(currentTime) {
        if (this.support) return; // Support towers don't shoot
        
        if (!this.target || this.target.isDead || this.target.reachedEnd) {
            this.target = null;
            return;
        }

        // Apply ability speed boost
        const speedMultiplier = this.game?.abilitySpeedBoost || 1.0;
        const effectiveFireRate = this.fireRate / speedMultiplier;

        if (currentTime - this.lastShotTime >= effectiveFireRate) {
            // Apply support damage boost
            const actualDamage = this.damage * (this.supportDamageMultiplier || 1.0);
            const actualRange = this.range * (this.supportRangeMultiplier || 1.0);
            
            const projectile = new Projectile(
                this.x,
                this.y,
                this.target.position.x,
                this.target.position.y,
                actualDamage,
                8,
                this.color
            );
            this.projectiles.push(projectile);
            this.lastShotTime = currentTime;
        }
    }

    update(enemies, currentTime, towers = []) {
        // Update upgrade animation
        if (this.upgradeAnimation > 0) {
            this.upgradeAnimation--;
        }

        // Support towers don't shoot, they buff nearby towers
        if (this.support) {
            this.updateSupportBuffs(towers, currentTime);
            return;
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update();

            // Check for hits
            if (this.areaDamage) {
                // Area damage - hit all enemies in radius
                let hitSomething = false;
                for (const enemy of enemies) {
                    if (enemy.isDead || enemy.reachedEnd) continue;
                    const distance = Math.sqrt(
                        Math.pow(projectile.x - enemy.position.x, 2) + 
                        Math.pow(projectile.y - enemy.position.y, 2)
                    );
                    if (distance < this.areaRadius) {
                        enemy.takeDamage(projectile.damage, this.damageNumberSystem);
                        hitSomething = true;
                    }
                }
                if (hitSomething) {
                    // Track damage and kills for area damage
                    let killedEnemies = 0;
                    for (const enemy of enemies) {
                        if (enemy.isDead && !enemy.reachedEnd) {
                            const distance = Math.sqrt(
                                Math.pow(projectile.x - enemy.position.x, 2) + 
                                Math.pow(projectile.y - enemy.position.y, 2)
                            );
                            if (distance < this.areaRadius) {
                                killedEnemies++;
                            }
                        }
                    }
                    this.kills += killedEnemies;
                    this.totalDamage += projectile.damage * (hitSomething ? 1 : 0);
                    this.particleSystem.createExplosion(projectile.x, projectile.y, this.color, 20);
                    this.projectiles.splice(i, 1);
                }
            } else if (this.chainLightning) {
                // Chain lightning - damage chains between enemies
                if (this.target && !this.target.isDead && !this.target.reachedEnd) {
                    if (projectile.checkHit(this.target)) {
                        this.applyChainLightning(this.target, enemies, projectile.damage, currentTime);
                        this.particleSystem.createExplosion(projectile.x, projectile.y, this.color, 15);
                        this.projectiles.splice(i, 1);
                    }
                } else {
                    this.projectiles.splice(i, 1);
                }
            } else if (this.debuff) {
                // Debuff tower - applies slow effect
                if (this.target && !this.target.isDead && !this.target.reachedEnd) {
                    if (projectile.checkHit(this.target)) {
                        this.target.takeDamage(projectile.damage, this.damageNumberSystem);
                        this.applyDebuff(this.target, currentTime);
                        this.totalDamage += projectile.damage;
                        this.particleSystem.createHit(projectile.x, projectile.y, this.color);
                        this.projectiles.splice(i, 1);
                        if (this.target.isDead) {
                            this.kills++;
                        }
                    }
                } else {
                    this.projectiles.splice(i, 1);
                }
            } else {
                // Single target damage
                if (this.target && !this.target.isDead && !this.target.reachedEnd) {
                    if (projectile.checkHit(this.target)) {
                        const wasAlive = !this.target.isDead;
                        this.target.takeDamage(projectile.damage, this.damageNumberSystem);
                        this.totalDamage += projectile.damage;
                        this.particleSystem.createHit(projectile.x, projectile.y, this.color);
                        this.projectiles.splice(i, 1);
                        // Check if enemy died from this hit
                        if (wasAlive && this.target.isDead) {
                            this.kills++;
                        }
                    }
                } else {
                    // Target is invalid, remove projectile
                    this.projectiles.splice(i, 1);
                }
            }

            // Remove projectiles that are too far
            const distance = Math.sqrt(
                Math.pow(projectile.x - this.x, 2) + 
                Math.pow(projectile.y - this.y, 2)
            );
            if (distance > this.range * 2) {
                this.projectiles.splice(i, 1);
            }
        }

        // Find target and shoot
        this.findTarget(enemies);
        this.shoot(currentTime);
    }

    applyDebuff(enemy, currentTime) {
        if (!enemy) return;
        enemy.debuffed = true;
        enemy.debuffEndTime = currentTime + this.debuffDuration;
        if (!enemy.originalSpeed) {
            enemy.originalSpeed = enemy.speed;
        }
        enemy.speed = enemy.originalSpeed * (1 - this.slowAmount);
    }

    applyChainLightning(firstTarget, enemies, damage, currentTime) {
        const hitEnemies = [firstTarget];
        let currentTarget = firstTarget;
        let remainingChains = this.chainCount;

        while (remainingChains > 0) {
            let nextTarget = null;
            let closestDistance = this.chainRange;

            for (const enemy of enemies) {
                if (enemy.isDead || enemy.reachedEnd || hitEnemies.includes(enemy)) continue;
                
                const distance = Math.sqrt(
                    Math.pow(currentTarget.position.x - enemy.position.x, 2) + 
                    Math.pow(currentTarget.position.y - enemy.position.y, 2)
                );
                
                if (distance < closestDistance && distance < this.chainRange) {
                    closestDistance = distance;
                    nextTarget = enemy;
                }
            }

            if (nextTarget) {
                hitEnemies.push(nextTarget);
                nextTarget.takeDamage(damage * 0.7, this.damageNumberSystem); // Chain damage reduces
                this.totalDamage += damage * 0.7;
                if (nextTarget.isDead) {
                    this.kills++;
                }
                currentTarget = nextTarget;
                remainingChains--;
            } else {
                break; // No more targets in range
            }
        }

        // Visual effect for chain
        for (let i = 0; i < hitEnemies.length - 1; i++) {
            const from = hitEnemies[i];
            const to = hitEnemies[i + 1];
            this.particleSystem.createChainEffect(
                from.position.x, from.position.y,
                to.position.x, to.position.y,
                this.color
            );
        }
    }

    updateSupportBuffs(towers, currentTime) {
        this.buffedTowers = [];
        for (const tower of towers) {
            if (tower === this || tower.support) continue;
            const distance = this.getDistanceTo(tower.x, tower.y);
            if (distance <= this.range) {
                tower.receivingSupport = true;
                tower.supportDamageMultiplier = this.damageBoost;
                tower.supportRangeMultiplier = this.rangeBoost;
                this.buffedTowers.push(tower);
            } else if (tower.receivingSupport) {
                tower.receivingSupport = false;
                tower.supportDamageMultiplier = 1.0;
                tower.supportRangeMultiplier = 1.0;
            }
        }
    }

    upgrade() {
        const currentUpgradeCost = this.getUpgradeCost();
        this.totalUpgradeCost += currentUpgradeCost;
        this.level++;
        this.damage = Math.floor(this.damage * 1.5);
        this.range = Math.floor(this.range * 1.2);
        this.fireRate = Math.max(100, this.fireRate * 0.9);
        this.upgradeCost = Math.floor(this.upgradeCost * 1.5);
        this.upgradeAnimation = 30; // Start upgrade animation
    }

    getUpgradeCost() {
        return this.upgradeCost;
    }

    render(ctx, showRange = false) {
        // Draw range indicator if selected
        if (showRange) {
            ctx.save();
            const actualRange = this.range * (this.supportRangeMultiplier || 1.0);
            // Outer glow
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, actualRange + 10, 0, Math.PI * 2);
            ctx.fill();
            // Main range circle
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, actualRange, 0, Math.PI * 2);
            ctx.fill();
            // Border
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Draw support aura
        if (this.support) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw support buff indicator
        if (this.receivingSupport) {
            ctx.save();
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Draw shadow
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + 2, this.y + this.size + 2, this.size * 0.8, this.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw tower base with enhanced gradient
        const baseGradient = ctx.createRadialGradient(
            this.x - this.size * 0.3, this.y - this.size * 0.3, 0,
            this.x, this.y, this.size
        );
        baseGradient.addColorStop(0, this.lightenColor(this.color, 0.3));
        baseGradient.addColorStop(0.5, this.color);
        baseGradient.addColorStop(1, this.darkenColor(this.color, 0.5));
        
        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw inner highlight
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw tower border with glow
        ctx.save();
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // Draw tower top (cannon/barrel) with better graphics and smooth rotation
        if (this.target && !this.target.isDead) {
            const targetAngle = Math.atan2(
                this.target.position.y - this.y,
                this.target.position.x - this.x
            );
            
            // Smooth rotation interpolation
            if (!this.currentAngle) this.currentAngle = 0;
            let angleDiff = targetAngle - this.currentAngle;
            // Normalize angle difference
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            this.currentAngle += angleDiff * 0.3; // Smooth interpolation
            
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.currentAngle);
            
            // Barrel shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(this.size * 0.3 + 1, -this.size * 0.3 + 1, this.size * 0.8, this.size * 0.6);
            
            // Barrel gradient
            const barrelGradient = ctx.createLinearGradient(0, -this.size * 0.3, this.size * 1.1, -this.size * 0.3);
            barrelGradient.addColorStop(0, '#bdc3c7');
            barrelGradient.addColorStop(0.5, '#ecf0f1');
            barrelGradient.addColorStop(1, '#95a5a6');
            ctx.fillStyle = barrelGradient;
            ctx.fillRect(this.size * 0.3, -this.size * 0.3, this.size * 0.8, this.size * 0.6);
            
            // Barrel border
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.size * 0.3, -this.size * 0.3, this.size * 0.8, this.size * 0.6);
            
            ctx.restore();
        } else {
            // Default barrel position when no target
            ctx.save();
            ctx.translate(this.x, this.y);
            const barrelGradient = ctx.createLinearGradient(0, -this.size * 0.3, this.size * 1.1, -this.size * 0.3);
            barrelGradient.addColorStop(0, '#bdc3c7');
            barrelGradient.addColorStop(0.5, '#ecf0f1');
            barrelGradient.addColorStop(1, '#95a5a6');
            ctx.fillStyle = barrelGradient;
            ctx.fillRect(this.size * 0.3, -this.size * 0.3, this.size * 0.8, this.size * 0.6);
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.size * 0.3, -this.size * 0.3, this.size * 0.8, this.size * 0.6);
            ctx.restore();
        }

        // Draw level indicator with background
        ctx.save();
        ctx.fillStyle = 'rgba(44, 62, 80, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y + this.size * 0.7, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.level, this.x, this.y + this.size * 0.7);
        ctx.restore();

        // Draw upgrade animation
        if (this.upgradeAnimation > 0) {
            ctx.save();
            const alpha = this.upgradeAnimation / 30;
            const scale = 1 + (1 - alpha) * 0.3;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#f39c12';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * scale, 0, Math.PI * 2);
            ctx.stroke();
            
            // Particle effect
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                const dist = this.size * scale;
                const x = this.x + Math.cos(angle) * dist;
                const y = this.y + Math.sin(angle) * dist;
                ctx.fillStyle = '#f39c12';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Draw projectiles
        for (const projectile of this.projectiles) {
            projectile.render(ctx);
        }
    }

    lightenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.min(255, ((num >> 16) & 0xFF) + ((255 - ((num >> 16) & 0xFF)) * amount));
        const g = Math.min(255, ((num >> 8) & 0xFF) + ((255 - ((num >> 8) & 0xFF)) * amount));
        const b = Math.min(255, (num & 0xFF) + ((255 - (num & 0xFF)) * amount));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }

    getDistanceTo(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    darkenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, ((num >> 16) & 0xFF) * (1 - amount));
        const g = Math.max(0, ((num >> 8) & 0xFF) * (1 - amount));
        const b = Math.max(0, (num & 0xFF) * (1 - amount));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }

    containsPoint(x, y) {
        const distance = Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2));
        return distance <= this.size;
    }

    getDPS() {
        // Calculate DPS based on damage and fire rate
        const shotsPerSecond = 1000 / this.fireRate;
        return (this.damage * shotsPerSecond).toFixed(1);
    }

    getStats() {
        return {
            name: this.name,
            level: this.level,
            damage: this.damage,
            range: this.range,
            fireRate: this.fireRate,
            dps: this.getDPS(),
            kills: this.kills,
            totalDamage: this.totalDamage,
            upgradeCost: this.getUpgradeCost(),
            targetingMode: this.targetingMode
        };
    }
}

