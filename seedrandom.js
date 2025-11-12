// Seeded random number generator
// Based on Mulberry32 algorithm
class SeededRandom {
    constructor(seed) {
        this.seed = seed || Date.now();
    }

    // Generate next random number between 0 and 1
    next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    // Random number between min and max (inclusive)
    random(min, max) {
        if (min === undefined && max === undefined) {
            return this.next();
        }
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return min + this.next() * (max - min);
    }

    // Random integer between min and max (inclusive)
    randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    }

    // Random element from array
    choice(array) {
        return array[this.randomInt(0, array.length - 1)];
    }
}

