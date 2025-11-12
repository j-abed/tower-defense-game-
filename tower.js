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
        if (this.hit) return false;
        const distance = Math.sqrt(
            Math.pow(this.x - enemy.position.x, 2) + 
            Math.pow(this.y - enemy.position.y, 2)
        );
        return distance < enemy.size + this.size;
    }
}

class Tower {
    constructor(x, y, type, particleSystem) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.particleSystem = particleSystem;
        this.projectiles = [];
        this.lastShotTime = 0;
        this.target = null;
        this.level = 1;
        this.totalUpgradeCost = 0; // Track total spent on upgrades
        
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
            }
        };

        const config = types[type] || types.basic;
        this.damage = config.damage;
        this.range = config.range;
        this.fireRate = config.fireRate;
        this.cost = config.cost;
        this.color = config.color;
        this.upgradeCost = config.upgradeCost;
        this.name = config.name;
        this.areaDamage = config.areaDamage || false;
        this.areaRadius = config.areaRadius || 0;
        this.size = 25;
    }

    findTarget(enemies) {
        let closestEnemy = null;
        let closestDistance = this.range;

        for (const enemy of enemies) {
            if (enemy.isDead || enemy.reachedEnd) continue;
            
            const distance = this.getDistanceTo(enemy.position.x, enemy.position.y);
            if (distance <= this.range && distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }

        this.target = closestEnemy;
        return closestEnemy;
    }

    shoot(currentTime) {
        if (!this.target || this.target.isDead || this.target.reachedEnd) {
            this.target = null;
            return;
        }

        if (currentTime - this.lastShotTime >= this.fireRate) {
            const projectile = new Projectile(
                this.x,
                this.y,
                this.target.position.x,
                this.target.position.y,
                this.damage,
                8,
                this.color
            );
            this.projectiles.push(projectile);
            this.lastShotTime = currentTime;
        }
    }

    update(enemies, currentTime) {
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
                        enemy.takeDamage(projectile.damage);
                        hitSomething = true;
                    }
                }
                if (hitSomething) {
                    this.particleSystem.createExplosion(projectile.x, projectile.y, this.color, 20);
                    this.projectiles.splice(i, 1);
                }
            } else {
                // Single target damage
                if (projectile.checkHit(this.target)) {
                    this.target.takeDamage(projectile.damage);
                    this.particleSystem.createHit(projectile.x, projectile.y, this.color);
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

    upgrade() {
        const currentUpgradeCost = this.getUpgradeCost();
        this.totalUpgradeCost += currentUpgradeCost;
        this.level++;
        this.damage = Math.floor(this.damage * 1.5);
        this.range = Math.floor(this.range * 1.2);
        this.fireRate = Math.max(100, this.fireRate * 0.9);
        this.upgradeCost = Math.floor(this.upgradeCost * 1.5);
    }

    getUpgradeCost() {
        return this.upgradeCost;
    }

    render(ctx, showRange = false) {
        // Draw range indicator if selected
        if (showRange) {
            ctx.save();
            // Outer glow
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range + 10, 0, Math.PI * 2);
            ctx.fill();
            // Main range circle
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.fill();
            // Border
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.stroke();
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

        // Draw tower top (cannon/barrel) with better graphics
        if (this.target && !this.target.isDead) {
            const angle = Math.atan2(
                this.target.position.y - this.y,
                this.target.position.x - this.x
            );
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            
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
}

