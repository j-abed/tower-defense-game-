class Path {
    constructor(seed = null, canvasWidth = 1200, canvasHeight = 600) {
        this.seed = seed;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.rng = new SeededRandom(seed);
        this.waypoints = this.generatePath();
    }

    generatePath() {
        const waypoints = [];
        const minSegmentLength = 150;
        const maxSegmentLength = 300;
        
        // Ensure we have valid canvas dimensions
        const width = Math.max(this.canvasWidth, 800);
        const height = Math.max(this.canvasHeight, 600);
        
        const numSegments = 6 + this.rng.randomInt(2, 4); // 8-10 segments total
        
        // Start point - always on left edge
        const startY = this.rng.random(0.1, 0.9) * height;
        waypoints.push({ x: 0, y: startY });
        
        let currentX = 0;
        let currentY = startY;
        
        // Generate intermediate waypoints with smoother transitions
        let lastDirection = 0; // Track last vertical movement direction
        
        for (let i = 0; i < numSegments - 1; i++) {
            const progress = (i + 1) / numSegments;
            const targetX = progress * width;
            
            // Determine vertical direction with bias to avoid sharp reversals
            let verticalDirection;
            if (lastDirection === 0) {
                // First segment - random direction
                verticalDirection = this.rng.choice([-1, 1]);
            } else {
                // Prefer continuing in same direction or slight variation
                const rand = this.rng.random();
                if (rand < 0.3) {
                    // 30% chance to reverse
                    verticalDirection = -lastDirection;
                } else if (rand < 0.7) {
                    // 40% chance to continue same direction
                    verticalDirection = lastDirection;
                } else {
                    // 30% chance for slight variation (smaller movement)
                    verticalDirection = lastDirection * 0.5;
                }
            }
            
            // Calculate distance with variation
            const baseDistance = this.rng.random(minSegmentLength, maxSegmentLength);
            const verticalDistance = baseDistance * (Math.abs(verticalDirection) || 1);
            
            // Calculate next waypoint with smoother progression
            let nextX = targetX + this.rng.random(-30, 30); // Reduced horizontal variation
            let nextY = currentY + (verticalDirection * verticalDistance);
            
            // Keep within bounds
            nextX = Math.max(0, Math.min(width, nextX));
            nextY = Math.max(height * 0.1, Math.min(height * 0.9, nextY));
            
            // Ensure we're making progress to the right
            if (nextX <= currentX) {
                nextX = currentX + minSegmentLength * 0.5;
            }
            
            waypoints.push({ x: nextX, y: nextY });
            currentX = nextX;
            currentY = nextY;
            lastDirection = verticalDirection > 0 ? 1 : (verticalDirection < 0 ? -1 : 0);
        }
        
        // End point - always on right edge
        const endY = this.rng.random(0.1, 0.9) * height;
        waypoints.push({ x: width, y: endY });
        
        // Apply Catmull-Rom spline smoothing to create smooth curves
        return this.smoothPath(waypoints);
    }

    // Smooth path using Catmull-Rom spline interpolation
    smoothPath(waypoints) {
        if (waypoints.length < 2) return waypoints;
        
        const smoothed = [waypoints[0]]; // Keep first point
        const tension = 0.5; // Controls curve tightness (0-1)
        const segmentsPerCurve = 8; // Number of points per curve segment
        
        for (let i = 0; i < waypoints.length - 1; i++) {
            const p0 = i > 0 ? waypoints[i - 1] : waypoints[i];
            const p1 = waypoints[i];
            const p2 = waypoints[i + 1];
            const p3 = i < waypoints.length - 2 ? waypoints[i + 2] : waypoints[i + 1];
            
            // Generate smooth curve points between p1 and p2
            for (let j = 1; j < segmentsPerCurve; j++) {
                const t = j / segmentsPerCurve;
                const point = this.catmullRom(p0, p1, p2, p3, t, tension);
                smoothed.push(point);
            }
        }
        
        smoothed.push(waypoints[waypoints.length - 1]); // Keep last point
        return smoothed;
    }

    // Catmull-Rom spline interpolation
    catmullRom(p0, p1, p2, p3, t, tension) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        const x = 0.5 * (
            (2 * p1.x) +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        ) * tension + (1 - tension) * (p1.x + (p2.x - p1.x) * t);
        
        const y = 0.5 * (
            (2 * p1.y) +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        ) * tension + (1 - tension) * (p1.y + (p2.y - p1.y) * t);
        
        return { x, y };
    }

    setCanvasSize(width, height) {
        const newWidth = Math.max(width, 800);
        const newHeight = Math.max(height, 600);
        if (this.canvasWidth !== newWidth || this.canvasHeight !== newHeight) {
            this.canvasWidth = newWidth;
            this.canvasHeight = newHeight;
            this.rng = new SeededRandom(this.seed);
            this.waypoints = this.generatePath();
        }
    }

    // Get the total length of the path
    getTotalLength() {
        let length = 0;
        for (let i = 0; i < this.waypoints.length - 1; i++) {
            const dx = this.waypoints[i + 1].x - this.waypoints[i].x;
            const dy = this.waypoints[i + 1].y - this.waypoints[i].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    }

    // Get position along path based on progress (0 to 1)
    getPositionAt(progress) {
        if (progress <= 0) return { ...this.waypoints[0] };
        if (progress >= 1) return { ...this.waypoints[this.waypoints.length - 1] };

        const totalLength = this.getTotalLength();
        const targetDistance = progress * totalLength;

        let currentDistance = 0;
        for (let i = 0; i < this.waypoints.length - 1; i++) {
            const p1 = this.waypoints[i];
            const p2 = this.waypoints[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);

            if (currentDistance + segmentLength >= targetDistance) {
                const segmentProgress = (targetDistance - currentDistance) / segmentLength;
                return {
                    x: p1.x + dx * segmentProgress,
                    y: p1.y + dy * segmentProgress
                };
            }

            currentDistance += segmentLength;
        }

        return { ...this.waypoints[this.waypoints.length - 1] };
    }

    // Render the path on canvas
    render(ctx, canvasWidth, canvasHeight, theme = null) {
        ctx.save();
        
        // Draw path shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 52;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.waypoints[0].x + 2, this.waypoints[0].y + 2);
        for (let i = 1; i < this.waypoints.length; i++) {
            ctx.lineTo(this.waypoints[i].x + 2, this.waypoints[i].y + 2);
        }
        ctx.stroke();
        
        // Draw path background (darker) with gradient
        const pathBgColor = theme ? theme.colors.pathBackground : '#34495e';
        const pathBgColor2 = theme ? this.darkenColor(pathBgColor, 0.1) : '#2c3e50';
        const pathGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        pathGradient.addColorStop(0, pathBgColor);
        pathGradient.addColorStop(0.5, pathBgColor2);
        pathGradient.addColorStop(1, pathBgColor);
        ctx.strokeStyle = pathGradient;
        ctx.lineWidth = 50;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
        for (let i = 1; i < this.waypoints.length; i++) {
            ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.stroke();

        // Draw path center line (lighter) with highlight
        const pathColor = theme ? theme.colors.path : '#95a5a6';
        ctx.strokeStyle = pathColor;
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
        for (let i = 1; i < this.waypoints.length; i++) {
            ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.stroke();
        
        // Draw path center highlight
        const pathHighlight = theme ? this.lightenColor(pathColor, 0.2) : '#bdc3c7';
        ctx.strokeStyle = pathHighlight;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
        for (let i = 1; i < this.waypoints.length; i++) {
            ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.stroke();

        // Draw waypoint markers
        ctx.fillStyle = '#95a5a6';
        for (let i = 0; i < this.waypoints.length; i++) {
            ctx.beginPath();
            ctx.arc(this.waypoints[i].x, this.waypoints[i].y, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw start marker with glow
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#2ecc71';
        const startGradient = ctx.createRadialGradient(
            this.waypoints[0].x, this.waypoints[0].y, 0,
            this.waypoints[0].x, this.waypoints[0].y, 15
        );
        startGradient.addColorStop(0, '#2ecc71');
        startGradient.addColorStop(1, '#27ae60');
        ctx.fillStyle = startGradient;
        ctx.beginPath();
        ctx.arc(this.waypoints[0].x, this.waypoints[0].y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('S', this.waypoints[0].x, this.waypoints[0].y);
        ctx.restore();

        // Draw end marker with glow
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#e74c3c';
        const endPoint = this.waypoints[this.waypoints.length - 1];
        const endGradient = ctx.createRadialGradient(
            endPoint.x, endPoint.y, 0,
            endPoint.x, endPoint.y, 15
        );
        endGradient.addColorStop(0, '#e74c3c');
        endGradient.addColorStop(1, '#c0392b');
        ctx.fillStyle = endGradient;
        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', endPoint.x, endPoint.y);
        ctx.restore();

        ctx.restore();
    }

    // Check if a point is on the path (for tower placement validation)
    isPointOnPath(x, y, tolerance = 40) {
        for (let i = 0; i < this.waypoints.length - 1; i++) {
            const p1 = this.waypoints[i];
            const p2 = this.waypoints[i + 1];
            
            // Calculate distance from point to line segment
            const A = x - p1.x;
            const B = y - p1.y;
            const C = p2.x - p1.x;
            const D = p2.y - p1.y;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;
            if (lenSq !== 0) param = dot / lenSq;

            let xx, yy;
            if (param < 0) {
                xx = p1.x;
                yy = p1.y;
            } else if (param > 1) {
                xx = p2.x;
                yy = p2.y;
            } else {
                xx = p1.x + param * C;
                yy = p1.y + param * D;
            }

            const dx = x - xx;
            const dy = y - yy;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= tolerance) {
                return true;
            }
        }
        return false;
    }

    darkenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, ((num >> 16) & 0xFF) * (1 - amount));
        const g = Math.max(0, ((num >> 8) & 0xFF) * (1 - amount));
        const b = Math.max(0, (num & 0xFF) * (1 - amount));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }

    lightenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.min(255, ((num >> 16) & 0xFF) + ((255 - ((num >> 16) & 0xFF)) * amount));
        const g = Math.min(255, ((num >> 8) & 0xFF) + ((255 - ((num >> 8) & 0xFF)) * amount));
        const b = Math.min(255, (num & 0xFF) + ((255 - (num & 0xFF)) * amount));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }
}

