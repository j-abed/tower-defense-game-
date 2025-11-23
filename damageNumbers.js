class DamageNumber {
    constructor(x, y, damage, color = '#ffffff') {
        this.x = x;
        this.y = y;
        this.damage = Math.floor(damage);
        this.color = color;
        this.life = 60; // frames
        this.maxLife = 60;
        this.vy = -2; // upward velocity
        this.vx = (Math.random() - 0.5) * 1; // slight horizontal drift
        this.size = 16 + Math.min(damage / 10, 8); // size based on damage
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy *= 0.98; // slow down
        this.vx *= 0.98;
        this.life--;
    }

    render(ctx) {
        if (this.life <= 0) return;

        const alpha = this.life / this.maxLife;
        const scale = 0.8 + (alpha * 0.2); // slight scale animation

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${this.size * scale}px Arial`;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw text with outline
        ctx.strokeText(this.damage.toString(), this.x, this.y);
        ctx.fillText(this.damage.toString(), this.x, this.y);
        
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

class DamageNumberSystem {
    constructor() {
        this.numbers = [];
    }

    createDamageNumber(x, y, damage, color = '#ffffff') {
        // Determine color based on damage amount
        if (!color || color === '#ffffff') {
            if (damage >= 50) {
                color = '#e74c3c'; // Red for high damage
            } else if (damage >= 25) {
                color = '#f39c12'; // Orange for medium-high damage
            } else if (damage >= 15) {
                color = '#f1c40f'; // Yellow for medium damage
            } else {
                color = '#3498db'; // Blue for low damage
            }
        }
        
        this.numbers.push(new DamageNumber(x, y, damage, color));
    }

    update() {
        for (let i = this.numbers.length - 1; i >= 0; i--) {
            this.numbers[i].update();
            if (this.numbers[i].isDead()) {
                this.numbers.splice(i, 1);
            }
        }
    }

    render(ctx) {
        for (const number of this.numbers) {
            number.render(ctx);
        }
    }
}

