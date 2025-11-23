class Enemy {
    constructor(type, path, particleSystem, difficultyMultipliers = null) {
        this.path = path;
        this.particleSystem = particleSystem;
        this.progress = 0;
        this.difficultyMultipliers = difficultyMultipliers || { enemyHealth: 1.0 };
        
        // Enemy type configurations
        const types = {
            basic: {
                health: 50,
                maxHealth: 50,
                speed: 0.0005,
                reward: 10,
                color: '#3498db',
                size: 20,
                name: 'Basic'
            },
            fast: {
                health: 30,
                maxHealth: 30,
                speed: 0.0008,
                reward: 15,
                color: '#e74c3c',
                size: 18,
                name: 'Fast'
            },
            tank: {
                health: 150,
                maxHealth: 150,
                speed: 0.00035,
                reward: 25,
                color: '#95a5a6',
                size: 28,
                name: 'Tank'
            },
            boss: {
                health: 500,
                maxHealth: 500,
                speed: 0.00025,
                reward: 100,
                color: '#8e44ad',
                size: 35,
                name: 'Boss'
            },
            flying: {
                health: 40,
                maxHealth: 40,
                speed: 0.0007,
                reward: 20,
                color: '#16a085',
                size: 18,
                name: 'Flying',
                isFlying: true
            },
            shielded: {
                health: 80,
                maxHealth: 80,
                speed: 0.0004,
                reward: 30,
                color: '#3498db',
                size: 22,
                name: 'Shielded',
                hasShield: true,
                shieldHealth: 30
            },
            regenerating: {
                health: 100,
                maxHealth: 100,
                speed: 0.00045,
                reward: 25,
                color: '#27ae60',
                size: 24,
                name: 'Regenerating',
                regenerates: true,
                regenRate: 0.5 // health per update
            },
            splitting: {
                health: 60,
                maxHealth: 60,
                speed: 0.0005,
                reward: 15,
                color: '#e67e22',
                size: 20,
                name: 'Splitting',
                splits: true,
                splitCount: 2
            }
        };

        const config = types[type] || types.basic;
        this.type = type;
        const healthMultiplier = this.difficultyMultipliers.enemyHealth || 1.0;
        this.health = Math.floor(config.health * healthMultiplier);
        this.maxHealth = this.health;
        this.speed = config.speed;
        this.reward = config.reward;
        this.color = config.color;
        this.size = config.size;
        this.name = config.name;
        
        // Special properties
        this.isFlying = config.isFlying || false;
        this.hasShield = config.hasShield || false;
        this.shieldHealth = config.shieldHealth || 0;
        this.maxShieldHealth = this.shieldHealth;
        this.regenerates = config.regenerates || false;
        this.regenRate = config.regenRate || 0;
        this.splits = config.splits || false;
        this.splitCount = config.splitCount || 2;
        
        this.position = path.getPositionAt(0);
        this.angle = 0;
        this.isDead = false;
        this.reachedEnd = false;
        this.regenTimer = 0;
        this.debuffed = false;
        this.debuffEndTime = 0;
        this.originalSpeed = this.speed;
        this.deathAnimation = false;
        this.deathAnimationTime = 0;
        this.deathAnimationDuration = 20; // frames
    }

    takeDamage(damage, damageNumberSystem = null) {
        let actualDamage = damage;
        
        // Shield absorbs damage first
        if (this.hasShield && this.shieldHealth > 0) {
            const shieldDamage = Math.min(damage, this.shieldHealth);
            this.shieldHealth -= shieldDamage;
            actualDamage = damage - shieldDamage;
            
            // Shield break effect
            if (this.shieldHealth <= 0) {
                this.particleSystem.createExplosion(this.position.x, this.position.y, '#3498db', 10);
            }
        }
        
        // Apply remaining damage to health
        if (actualDamage > 0) {
            const healthDamage = Math.min(actualDamage, this.health);
            this.health -= actualDamage;
            
            // Create damage number
            if (damageNumberSystem) {
                damageNumberSystem.createDamageNumber(
                    this.position.x + (Math.random() - 0.5) * 20,
                    this.position.y - this.size - 10,
                    healthDamage,
                    this.color
                );
            }
        }
        
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            this.deathAnimation = true;
            this.deathAnimationTime = 0;
            this.particleSystem.createExplosion(this.position.x, this.position.y, this.color, 30);
            this.particleSystem.createMoneyEffect(this.position.x, this.position.y);
        } else {
            this.particleSystem.createHit(this.position.x, this.position.y, this.color);
        }
    }

    update() {
        if (this.deathAnimation) {
            this.deathAnimationTime++;
            return;
        }
        if (this.isDead || this.reachedEnd) return;

        this.progress += this.speed;
        
        if (this.progress >= 1) {
            this.progress = 1;
            this.reachedEnd = true;
        }

        const newPos = this.path.getPositionAt(this.progress);
        
        // Calculate angle for rotation
        if (this.progress > 0.01) {
            const prevPos = this.path.getPositionAt(this.progress - 0.01);
            const dx = newPos.x - prevPos.x;
            const dy = newPos.y - prevPos.y;
            this.angle = Math.atan2(dy, dx);
        }
        
        this.position = newPos;

        // Regeneration
        if (this.regenerates && this.health < this.maxHealth && this.health > 0) {
            this.regenTimer++;
            if (this.regenTimer >= 30) { // Regenerate every 30 frames
                this.health = Math.min(this.maxHealth, this.health + this.regenRate);
                this.regenTimer = 0;
            }
        }

        // Note: Debuff expiration is handled in game.js update loop with currentTime
    }

    render(ctx) {
        if (this.isDead && this.deathAnimation) {
            // Death animation - fade out and scale down
            this.deathAnimationTime++;
            const progress = this.deathAnimationTime / this.deathAnimationDuration;
            if (progress >= 1) {
                this.deathAnimation = false;
                return;
            }
            
            ctx.save();
            ctx.globalAlpha = 1 - progress;
            ctx.translate(this.position.x, this.position.y);
            ctx.scale(1 - progress * 0.5, 1 - progress * 0.5);
            this.renderEnemyBody(ctx);
            ctx.restore();
            return;
        }
        
        if (this.isDead) return;

        // Draw shadow
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(
            this.position.x + 2, 
            this.position.y + this.size + 2, 
            this.size * 0.8, 
            this.size * 0.3, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.angle);
        this.renderEnemyBody(ctx);
        ctx.restore();

        // Draw shield if active
        if (this.hasShield && this.shieldHealth > 0) {
            ctx.save();
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw regeneration glow
        if (this.regenerates && this.health < this.maxHealth) {
            ctx.save();
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.4;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Draw debuff effect
        if (this.debuffed) {
            ctx.save();
            ctx.strokeStyle = '#8e44ad';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Draw wings for flying enemies
        if (this.isFlying) {
            ctx.save();
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.6;
            // Left wing
            ctx.beginPath();
            ctx.ellipse(-this.size * 0.8, -this.size * 0.3, this.size * 0.4, this.size * 0.2, -0.5, 0, Math.PI * 2);
            ctx.fill();
            // Right wing
            ctx.beginPath();
            ctx.ellipse(-this.size * 0.8, this.size * 0.3, this.size * 0.4, this.size * 0.2, 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();

        // Draw health bar
        this.renderHealthBar(ctx);
        
        // Draw shield bar if applicable
        if (this.hasShield) {
            this.renderShieldBar(ctx);
        }
    }

    lightenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.min(255, ((num >> 16) & 0xFF) + ((255 - ((num >> 16) & 0xFF)) * amount));
        const g = Math.min(255, ((num >> 8) & 0xFF) + ((255 - ((num >> 8) & 0xFF)) * amount));
        const b = Math.min(255, (num & 0xFF) + ((255 - (num & 0xFF)) * amount));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }

    renderHealthBar(ctx) {
        const barWidth = this.size * 2;
        const barHeight = 8;
        const barX = this.position.x - barWidth / 2;
        const barY = this.position.y - this.size - 20;

        // Background with border and shadow
        ctx.save();
        ctx.shadowBlur = 3;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.fillStyle = 'rgba(44, 62, 80, 0.95)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
        ctx.restore();

        // Health with animated gradient
        const healthPercent = this.health / this.maxHealth;
        const healthWidth = barWidth * healthPercent;
        
        if (healthWidth > 0) {
            // Animated health bar based on health percentage
            let color1, color2, color3, color4;
            if (healthPercent > 0.7) {
                color1 = '#2ecc71';
                color2 = '#27ae60';
                color3 = '#2ecc71';
                color4 = '#27ae60';
            } else if (healthPercent > 0.4) {
                color1 = '#f1c40f';
                color2 = '#f39c12';
                color3 = '#f1c40f';
                color4 = '#f39c12';
            } else {
                color1 = '#e74c3c';
                color2 = '#c0392b';
                color3 = '#e74c3c';
                color4 = '#c0392b';
            }
            
            const healthGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
            healthGradient.addColorStop(0, color1);
            healthGradient.addColorStop(0.5, color2);
            healthGradient.addColorStop(0.5, color3);
            healthGradient.addColorStop(1, color4);
            
            ctx.fillStyle = healthGradient;
            ctx.fillRect(barX, barY, healthWidth, barHeight);
            
            // Health bar highlight with animation
            const time = Date.now() / 1000;
            const pulse = Math.sin(time * 3) * 0.1 + 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.fillRect(barX, barY, healthWidth, barHeight * 0.5);
            
            // Health bar border highlight
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, healthWidth, barHeight);
        }
    }

    darkenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, ((num >> 16) & 0xFF) * (1 - amount));
        const g = Math.max(0, ((num >> 8) & 0xFF) * (1 - amount));
        const b = Math.max(0, (num & 0xFF) * (1 - amount));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }

    getDistanceTo(x, y) {
        const dx = this.position.x - x;
        const dy = this.position.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    renderEnemyBody(ctx) {
        // Draw enemy body with enhanced gradient
        const gradient = ctx.createRadialGradient(
            -this.size * 0.3, -this.size * 0.3, 0,
            0, 0, this.size
        );
        gradient.addColorStop(0, this.lightenColor(this.color, 0.2));
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, this.darkenColor(this.color, 0.4));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.2, -this.size * 0.2, this.size * 0.4, this.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw border with glow
        ctx.save();
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();

        // Draw direction indicator with gradient
        const eyeGradient = ctx.createRadialGradient(this.size * 0.6, 0, 0, this.size * 0.6, 0, this.size * 0.3);
        eyeGradient.addColorStop(0, '#ffffff');
        eyeGradient.addColorStop(1, '#bdc3c7');
        ctx.fillStyle = eyeGradient;
        ctx.beginPath();
        ctx.arc(this.size * 0.6, 0, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye pupil
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(this.size * 0.6, 0, this.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

    renderShieldBar(ctx) {
        if (!this.hasShield || this.shieldHealth <= 0) return;

        const barWidth = this.size * 2;
        const barHeight = 5;
        const barX = this.position.x - barWidth / 2;
        const barY = this.position.y - this.size - 30;

        // Background
        ctx.fillStyle = 'rgba(44, 62, 80, 0.9)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

        // Shield
        const shieldPercent = this.shieldHealth / this.maxShieldHealth;
        const shieldWidth = barWidth * shieldPercent;
        
        if (shieldWidth > 0) {
            ctx.fillStyle = '#3498db';
            ctx.fillRect(barX, barY, shieldWidth, barHeight);
        }
    }

    shouldSplit() {
        return this.splits && this.isDead;
    }
}

