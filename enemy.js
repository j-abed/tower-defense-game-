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
        this.deathAnimation = 0; // For death animation
        this.rotationAngle = 0; // For smooth rotation
        this.recentlyDamaged = 0; // For damage flash effect
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
            this.recentlyDamaged = 10; // Flash effect duration
            
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
            this.deathAnimation = 30; // Start death animation
            this.particleSystem.createExplosion(this.position.x, this.position.y, this.color);
            this.particleSystem.createMoneyEffect(this.position.x, this.position.y);
        } else {
            this.particleSystem.createHit(this.position.x, this.position.y, this.color);
        }
    }

    update() {
        if (this.isDead || this.reachedEnd) return;

        this.progress += this.speed;
        
        if (this.progress >= 1) {
            this.progress = 1;
            this.reachedEnd = true;
        }

        const newPos = this.path.getPositionAt(this.progress);
        
        // Calculate angle for rotation with smooth interpolation
        if (this.progress > 0.01) {
            const prevPos = this.path.getPositionAt(this.progress - 0.01);
            const dx = newPos.x - prevPos.x;
            const dy = newPos.y - prevPos.y;
            const targetAngle = Math.atan2(dy, dx);
            // Smooth rotation
            let angleDiff = targetAngle - this.angle;
            // Normalize angle difference
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            this.angle += angleDiff * 0.3; // Smooth interpolation
        }
        
        this.position = newPos;

        // Update death animation
        if (this.deathAnimation > 0) {
            this.deathAnimation--;
        }

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
        if (this.isDead) {
            // Render death animation
            if (this.deathAnimation > 0) {
                const alpha = this.deathAnimation / 30;
                const scale = 1 + (1 - alpha) * 0.5;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(this.position.x, this.position.y);
                ctx.scale(scale, scale);
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size, this.size * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            return;
        }

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
        const barHeight = 7;
        const barX = this.position.x - barWidth / 2;
        const barY = this.position.y - this.size - 18;

        // Background with border and animation
        ctx.fillStyle = 'rgba(44, 62, 80, 0.9)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

        // Health
        const healthPercent = this.health / this.maxHealth;
        const healthWidth = barWidth * healthPercent;
        
        if (healthWidth > 0) {
            // Animated health bar with pulsing effect for low health
            const pulse = healthPercent < 0.3 ? Math.sin(Date.now() / 100) * 0.1 + 1 : 1;
            
            const healthGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
            if (healthPercent > 0.6) {
                healthGradient.addColorStop(0, '#2ecc71');
                healthGradient.addColorStop(1, '#27ae60');
            } else if (healthPercent > 0.3) {
                healthGradient.addColorStop(0, '#f39c12');
                healthGradient.addColorStop(1, '#e67e22');
            } else {
                healthGradient.addColorStop(0, '#e74c3c');
                healthGradient.addColorStop(1, '#c0392b');
            }
            
            ctx.fillStyle = healthGradient;
            ctx.fillRect(barX, barY, healthWidth * pulse, barHeight);
            
            // Health bar highlight with animation
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(barX, barY, healthWidth * pulse, barHeight * 0.4);
            
            // Damage flash effect (if recently damaged)
            if (this.recentlyDamaged && this.recentlyDamaged > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.recentlyDamaged / 10})`;
                ctx.fillRect(barX, barY, barWidth, barHeight);
                this.recentlyDamaged--;
            }
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

