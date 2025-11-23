class Achievement {
    constructor(id, name, description, condition, reward = null) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.condition = condition; // Function that returns true when achieved
        this.reward = reward; // Optional reward (currency, research points, etc.)
        this.unlocked = false;
        this.unlockedAt = null;
    }

    check(game) {
        if (this.unlocked) return false;
        if (this.condition(game)) {
            this.unlock(game);
            return true;
        }
        return false;
    }

    unlock(game) {
        this.unlocked = true;
        this.unlockedAt = Date.now();
        
        // Apply reward
        if (this.reward) {
            if (this.reward.type === 'currency') {
                game.currency += this.reward.amount;
            } else if (this.reward.type === 'research') {
                game.researchSystem.addResearchPoints(this.reward.amount);
            }
        }
    }
}

class AchievementSystem {
    constructor() {
        this.achievements = this.initializeAchievements();
        this.loadAchievements();
    }

    initializeAchievements() {
        return [
            new Achievement(
                'first_kill',
                'First Blood',
                'Kill your first enemy',
                (game) => game.totalKills >= 1,
                { type: 'currency', amount: 50 }
            ),
            new Achievement(
                'wave_5',
                'Wave Warrior',
                'Survive 5 waves',
                (game) => game.wave >= 5,
                { type: 'research', amount: 5 }
            ),
            new Achievement(
                'wave_10',
                'Wave Master',
                'Survive 10 waves',
                (game) => game.wave >= 10,
                { type: 'research', amount: 10 }
            ),
            new Achievement(
                'wave_20',
                'Wave Legend',
                'Survive 20 waves',
                (game) => game.wave >= 20,
                { type: 'research', amount: 20 }
            ),
            new Achievement(
                'perfect_wave',
                'Perfect Defense',
                'Complete a wave without any leaks',
                (game) => game.perfectWaveStreak >= 1,
                { type: 'currency', amount: 100 }
            ),
            new Achievement(
                'perfect_streak_5',
                'Perfect Streak',
                'Complete 5 perfect waves in a row',
                (game) => game.perfectWaveStreak >= 5,
                { type: 'research', amount: 15 }
            ),
            new Achievement(
                'tower_master',
                'Tower Master',
                'Place 20 towers',
                (game) => {
                    let totalPlaced = 0;
                    // Count all towers ever placed (current + sold)
                    // For simplicity, we'll track this in game stats
                    return game.totalTowersPlaced >= 20;
                },
                { type: 'currency', amount: 200 }
            ),
            new Achievement(
                'kills_100',
                'Centurion',
                'Kill 100 enemies',
                (game) => game.totalKills >= 100,
                { type: 'research', amount: 5 }
            ),
            new Achievement(
                'kills_500',
                'Slayer',
                'Kill 500 enemies',
                (game) => game.totalKills >= 500,
                { type: 'research', amount: 10 }
            ),
            new Achievement(
                'kills_1000',
                'Destroyer',
                'Kill 1000 enemies',
                (game) => game.totalKills >= 1000,
                { type: 'research', amount: 20 }
            ),
            new Achievement(
                'upgrade_master',
                'Upgrade Master',
                'Upgrade a tower to level 5',
                (game) => {
                    return game.towers.some(t => t.level >= 5);
                },
                { type: 'currency', amount: 150 }
            ),
            new Achievement(
                'research_all',
                'Researcher',
                'Research all tech tree nodes',
                (game) => {
                    return Object.values(game.researchSystem.nodes).every(n => n.researched);
                },
                { type: 'currency', amount: 500 }
            ),
            new Achievement(
                'nightmare_victory',
                'Nightmare Survivor',
                'Survive 10 waves on Nightmare difficulty',
                (game) => {
                    return game.difficulty === 'nightmare' && game.wave >= 10;
                },
                { type: 'research', amount: 25 }
            )
        ];
    }

    update(game) {
        for (const achievement of this.achievements) {
            if (achievement.check(game)) {
                this.showAchievementNotification(achievement);
                this.saveAchievements();
            }
        }
    }

    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div style="font-weight: bold; font-size: 1.2em; margin-bottom: 5px;">Achievement Unlocked!</div>
            <div style="font-size: 1.1em; color: #f39c12;">${achievement.name}</div>
            <div style="font-size: 0.9em; color: #bdc3c7;">${achievement.description}</div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 1em;
            z-index: 2000;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            animation: slideInRight 0.5s ease-out, fadeOut 0.5s ease-in 2.5s;
            pointer-events: none;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    saveAchievements() {
        try {
            const data = {
                achievements: {}
            };
            for (const achievement of this.achievements) {
                data.achievements[achievement.id] = {
                    unlocked: achievement.unlocked,
                    unlockedAt: achievement.unlockedAt
                };
            }
            localStorage.setItem('towerDefenseAchievements', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving achievements:', e);
        }
    }

    loadAchievements() {
        try {
            const saved = localStorage.getItem('towerDefenseAchievements');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.achievements) {
                    for (const achievement of this.achievements) {
                        if (data.achievements[achievement.id]) {
                            achievement.unlocked = data.achievements[achievement.id].unlocked;
                            achievement.unlockedAt = data.achievements[achievement.id].unlockedAt;
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error loading achievements:', e);
        }
    }

    getUnlockedCount() {
        return this.achievements.filter(a => a.unlocked).length;
    }

    getTotalCount() {
        return this.achievements.length;
    }
}

