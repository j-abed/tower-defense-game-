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
        let direction = 1; // 1 = right, -1 = left (but we always move right overall)
        
        // Generate intermediate waypoints
        for (let i = 0; i < numSegments - 1; i++) {
            const progress = (i + 1) / numSegments;
            const targetX = progress * width;
            
            // Determine if we should go up or down
            const verticalDirection = this.rng.choice([-1, 1]);
            const verticalDistance = this.rng.random(minSegmentLength, maxSegmentLength);
            
            // Calculate next waypoint
            let nextX = targetX + this.rng.random(-50, 50);
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
        }
        
        // End point - always on right edge
        const endY = this.rng.random(0.1, 0.9) * height;
        waypoints.push({ x: width, y: endY });
        
        // Smooth the path a bit - add intermediate points for smoother curves
        const smoothedWaypoints = [waypoints[0]];
        for (let i = 1; i < waypoints.length; i++) {
            const prev = waypoints[i - 1];
            const curr = waypoints[i];
            const distance = Math.sqrt(
                Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
            );
            
            // If segment is too long, add a midpoint
            if (distance > maxSegmentLength * 1.5) {
                smoothedWaypoints.push({
                    x: (prev.x + curr.x) / 2,
                    y: (prev.y + curr.y) / 2
                });
            }
            smoothedWaypoints.push(curr);
        }
        
        return smoothedWaypoints;
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
    render(ctx, canvasWidth, canvasHeight) {
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
        const pathGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        pathGradient.addColorStop(0, '#34495e');
        pathGradient.addColorStop(0.5, '#2c3e50');
        pathGradient.addColorStop(1, '#34495e');
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
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
        for (let i = 1; i < this.waypoints.length; i++) {
            ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.stroke();
        
        // Draw path center highlight
        ctx.strokeStyle = '#bdc3c7';
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
}

