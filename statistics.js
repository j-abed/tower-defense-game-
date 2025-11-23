class Statistics {
    constructor() {
        this.totalKills = 0;
        this.totalWaves = 0;
        this.totalTowersPlaced = 0;
        this.totalTowersSold = 0;
        this.totalUpgrades = 0;
        this.totalCurrencyEarned = 0;
        this.totalCurrencySpent = 0;
        this.totalDamageDealt = 0;
        this.perfectWaves = 0;
        this.totalPlayTime = 0; // in milliseconds
        this.sessionStartTime = Date.now();
        this.towerKills = {}; // Track kills per tower type
        this.enemyKills = {}; // Track kills per enemy type
        this.waveStats = []; // Per-wave statistics
        this.loadStatistics();
    }

    recordKill(towerType, enemyType) {
        this.totalKills++;
        this.towerKills[towerType] = (this.towerKills[towerType] || 0) + 1;
        this.enemyKills[enemyType] = (this.enemyKills[enemyType] || 0) + 1;
    }

    recordWave(waveNumber, perfect, leaks, kills, currencyEarned) {
        this.totalWaves = Math.max(this.totalWaves, waveNumber);
        if (perfect) this.perfectWaves++;
        
        this.waveStats.push({
            wave: waveNumber,
            perfect: perfect,
            leaks: leaks,
            kills: kills,
            currencyEarned: currencyEarned,
            timestamp: Date.now()
        });
    }

    recordTowerPlaced(towerType, cost) {
        this.totalTowersPlaced++;
        this.totalCurrencySpent += cost;
    }

    recordTowerSold(refund) {
        this.totalTowersSold++;
        this.totalCurrencyEarned += refund;
    }

    recordUpgrade(cost) {
        this.totalUpgrades++;
        this.totalCurrencySpent += cost;
    }

    recordCurrencyEarned(amount) {
        this.totalCurrencyEarned += amount;
    }

    recordDamage(amount) {
        this.totalDamageDealt += amount;
    }

    updatePlayTime() {
        this.totalPlayTime += Date.now() - this.sessionStartTime;
        this.sessionStartTime = Date.now();
    }

    getFavoriteTowerType() {
        if (Object.keys(this.towerKills).length === 0) return 'None';
        return Object.entries(this.towerKills)
            .sort((a, b) => b[1] - a[1])[0][0];
    }

    getMostKilledEnemyType() {
        if (Object.keys(this.enemyKills).length === 0) return 'None';
        return Object.entries(this.enemyKills)
            .sort((a, b) => b[1] - a[1])[0][0];
    }

    getAverageKillsPerWave() {
        if (this.totalWaves === 0) return 0;
        return (this.totalKills / this.totalWaves).toFixed(1);
    }

    getPerfectWavePercentage() {
        if (this.totalWaves === 0) return 0;
        return ((this.perfectWaves / this.totalWaves) * 100).toFixed(1);
    }

    getEfficiency() {
        if (this.totalCurrencySpent === 0) return 0;
        return ((this.totalKills / this.totalCurrencySpent) * 100).toFixed(2);
    }

    getStats() {
        this.updatePlayTime();
        return {
            totalKills: this.totalKills,
            totalWaves: this.totalWaves,
            totalTowersPlaced: this.totalTowersPlaced,
            totalTowersSold: this.totalTowersSold,
            totalUpgrades: this.totalUpgrades,
            totalCurrencyEarned: this.totalCurrencyEarned,
            totalCurrencySpent: this.totalCurrencySpent,
            totalDamageDealt: this.totalDamageDealt,
            perfectWaves: this.perfectWaves,
            perfectWavePercentage: this.getPerfectWavePercentage(),
            totalPlayTime: this.totalPlayTime,
            favoriteTower: this.getFavoriteTowerType(),
            mostKilledEnemy: this.getMostKilledEnemyType(),
            averageKillsPerWave: this.getAverageKillsPerWave(),
            efficiency: this.getEfficiency(),
            towerKills: { ...this.towerKills },
            enemyKills: { ...this.enemyKills }
        };
    }

    saveStatistics() {
        try {
            this.updatePlayTime();
            const data = {
                totalKills: this.totalKills,
                totalWaves: this.totalWaves,
                totalTowersPlaced: this.totalTowersPlaced,
                totalTowersSold: this.totalTowersSold,
                totalUpgrades: this.totalUpgrades,
                totalCurrencyEarned: this.totalCurrencyEarned,
                totalCurrencySpent: this.totalCurrencySpent,
                totalDamageDealt: this.totalDamageDealt,
                perfectWaves: this.perfectWaves,
                totalPlayTime: this.totalPlayTime,
                towerKills: this.towerKills,
                enemyKills: this.enemyKills,
                waveStats: this.waveStats.slice(-50) // Keep last 50 waves
            };
            localStorage.setItem('towerDefenseStatistics', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving statistics:', e);
        }
    }

    loadStatistics() {
        try {
            const saved = localStorage.getItem('towerDefenseStatistics');
            if (saved) {
                const data = JSON.parse(saved);
                this.totalKills = data.totalKills || 0;
                this.totalWaves = data.totalWaves || 0;
                this.totalTowersPlaced = data.totalTowersPlaced || 0;
                this.totalTowersSold = data.totalTowersSold || 0;
                this.totalUpgrades = data.totalUpgrades || 0;
                this.totalCurrencyEarned = data.totalCurrencyEarned || 0;
                this.totalCurrencySpent = data.totalCurrencySpent || 0;
                this.totalDamageDealt = data.totalDamageDealt || 0;
                this.perfectWaves = data.perfectWaves || 0;
                this.totalPlayTime = data.totalPlayTime || 0;
                this.towerKills = data.towerKills || {};
                this.enemyKills = data.enemyKills || {};
                this.waveStats = data.waveStats || [];
            }
        } catch (e) {
            console.error('Error loading statistics:', e);
        }
    }

    reset() {
        this.totalKills = 0;
        this.totalWaves = 0;
        this.totalTowersPlaced = 0;
        this.totalTowersSold = 0;
        this.totalUpgrades = 0;
        this.totalCurrencyEarned = 0;
        this.totalCurrencySpent = 0;
        this.totalDamageDealt = 0;
        this.perfectWaves = 0;
        this.totalPlayTime = 0;
        this.towerKills = {};
        this.enemyKills = {};
        this.waveStats = [];
        this.sessionStartTime = Date.now();
        this.saveStatistics();
    }
}

