class Particle {
    constructor(x, y, vx, vy, color, size, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.gravity = 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= 0.98; // Friction
        this.life--;
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Enhanced particle rendering with glow
        ctx.shadowBlur = this.size * 2;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner highlight for brighter particles
        if (this.color === '#ffffff' || this.size > 4) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    // Create explosion effect with enhanced visuals
    createExplosion(x, y, color = '#f39c12', count = 15) {
        // Main explosion particles
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 2 + Math.random() * 4;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = 4 + Math.random() * 5;
            const life = 25 + Math.random() * 25;
            
            this.particles.push(new Particle(x, y, vx, vy, color, size, life));
        }
        
        // Inner bright flash
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random();
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = 6 + Math.random() * 4;
            const life = 10 + Math.random() * 10;
            
            this.particles.push(new Particle(x, y, vx, vy, '#ffffff', size, life));
        }
        
        // Smoke effect
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 1; // Float up
            const size = 5 + Math.random() * 5;
            const life = 30 + Math.random() * 20;
            
            this.particles.push(new Particle(x, y, vx, vy, '#7f8c8d', size, life));
        }
    }

    // Create hit effect with enhanced visuals
    createHit(x, y, color = '#e74c3c') {
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 2.5;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = 3 + Math.random() * 4;
            const life = 15 + Math.random() * 15;
            
            this.particles.push(new Particle(x, y, vx, vy, color, size, life));
        }
        
        // Add spark effect
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = 1 + Math.random() * 2;
            const life = 8 + Math.random() * 8;
            
            this.particles.push(new Particle(x, y, vx, vy, '#ffffff', size, life));
        }
    }

    // Create trail effect
    createTrail(x, y, color = '#3498db') {
        const size = 2 + Math.random() * 2;
        const life = 5 + Math.random() * 5;
        this.particles.push(new Particle(x, y, 0, 0, color, size, life));
    }

    // Create money pickup effect
    createMoneyEffect(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = 1 + Math.random();
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 2; // Float upward
            const size = 3 + Math.random() * 2;
            const life = 30 + Math.random() * 20;
            
            this.particles.push(new Particle(x, y, vx, vy, '#f39c12', size, life));
        }
    }

    // Create upgrade effect
    createUpgradeEffect(x, y, color) {
        // Spiral particles
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const radius = 10 + (i * 2);
            const vx = Math.cos(angle) * 0.5;
            const vy = Math.sin(angle) * 0.5;
            const size = 4 + Math.random() * 3;
            const life = 40 + Math.random() * 20;
            
            this.particles.push(new Particle(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius,
                vx, vy, color, size, life
            ));
        }
        
        // Central burst
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = 5 + Math.random() * 4;
            const life = 30 + Math.random() * 20;
            
            this.particles.push(new Particle(x, y, vx, vy, color, size, life));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        for (const particle of this.particles) {
            particle.render(ctx);
        }
    }

    // Create chain lightning effect
    createChainEffect(x1, y1, x2, y2, color) {
        // Create particles along the chain path
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            const size = 3 + Math.random() * 2;
            const life = 5 + Math.random() * 5;
            this.particles.push(new Particle(x, y, 0, 0, color, size, life));
        }
    }
}

