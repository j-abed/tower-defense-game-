class Enemy {
    constructor(type, path, particleSystem) {
        this.path = path;
        this.particleSystem = particleSystem;
        this.progress = 0;
        
        // Enemy type configurations
        const types = {
            basic: {
                health: 50,
                maxHealth: 50,
                speed: 0.0003,
                reward: 10,
                color: '#3498db',
                size: 20,
                name: 'Basic'
            },
            fast: {
                health: 30,
                maxHealth: 30,
                speed: 0.0005,
                reward: 15,
                color: '#e74c3c',
                size: 18,
                name: 'Fast'
            },
            tank: {
                health: 150,
                maxHealth: 150,
                speed: 0.0002,
                reward: 25,
                color: '#95a5a6',
                size: 28,
                name: 'Tank'
            },
            boss: {
                health: 500,
                maxHealth: 500,
                speed: 0.00015,
                reward: 100,
                color: '#8e44ad',
                size: 35,
                name: 'Boss'
            }
        };

        const config = types[type] || types.basic;
        this.type = type;
        this.health = config.health;
        this.maxHealth = config.maxHealth;
        this.speed = config.speed;
        this.reward = config.reward;
        this.color = config.color;
        this.size = config.size;
        this.name = config.name;
        
        this.position = path.getPositionAt(0);
        this.angle = 0;
        this.isDead = false;
        this.reachedEnd = false;
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
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
        
        // Calculate angle for rotation
        if (this.progress > 0.01) {
            const prevPos = this.path.getPositionAt(this.progress - 0.01);
            const dx = newPos.x - prevPos.x;
            const dy = newPos.y - prevPos.y;
            this.angle = Math.atan2(dy, dx);
        }
        
        this.position = newPos;
    }

    render(ctx) {
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

        // Draw health bar
        this.renderHealthBar(ctx);
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

        // Background with border
        ctx.fillStyle = 'rgba(44, 62, 80, 0.9)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

        // Health
        const healthPercent = this.health / this.maxHealth;
        const healthWidth = barWidth * healthPercent;
        
        if (healthWidth > 0) {
            const healthGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
            healthGradient.addColorStop(0, '#e74c3c');
            healthGradient.addColorStop(0.3, '#f39c12');
            healthGradient.addColorStop(0.7, '#f1c40f');
            healthGradient.addColorStop(1, '#2ecc71');
            
            ctx.fillStyle = healthGradient;
            ctx.fillRect(barX, barY, healthWidth, barHeight);
            
            // Health bar highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(barX, barY, healthWidth, barHeight * 0.4);
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
}

