class CampaignLevel {
    constructor(id, name, description, seed, objectives, rewards) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.seed = seed;
        this.objectives = objectives; // Array of objective objects
        this.rewards = rewards; // Rewards for completion
        this.completed = false;
        this.bestScore = 0;
    }

    checkObjectives(game) {
        const results = [];
        for (const objective of this.objectives) {
            const result = {
                id: objective.id,
                description: objective.description,
                completed: false,
                progress: 0,
                target: objective.target
            };

            switch (objective.type) {
                case 'survive_waves':
                    result.progress = game.wave;
                    result.completed = game.wave >= objective.target;
                    break;
                case 'no_leaks':
                    result.completed = game.waveLeaks === 0 && game.wave > 0;
                    result.progress = game.waveLeaks;
                    break;
                case 'perfect_waves':
                    result.progress = game.perfectWaveStreak;
                    result.completed = game.perfectWaveStreak >= objective.target;
                    break;
                case 'tower_limit':
                    result.progress = game.towers.length;
                    result.completed = game.towers.length <= objective.target;
                    break;
                case 'kill_count':
                    result.progress = game.totalKills;
                    result.completed = game.totalKills >= objective.target;
                    break;
            }
            results.push(result);
        }
        return results;
    }

    isCompleted(game) {
        const objectives = this.checkObjectives(game);
        return objectives.every(obj => obj.completed);
    }
}

class CampaignSystem {
    constructor() {
        this.levels = this.initializeCampaign();
        this.currentLevel = 0;
        this.campaignMode = false;
        this.loadCampaign();
    }

    initializeCampaign() {
        return [
            new CampaignLevel(
                1,
                'Tutorial',
                'Learn the basics - survive 3 waves',
                12345,
                [
                    { id: 'survive_3', type: 'survive_waves', target: 3, description: 'Survive 3 waves' }
                ],
                { research: 5, currency: 100 }
            ),
            new CampaignLevel(
                2,
                'Perfect Defense',
                'Complete a wave without any leaks',
                54321,
                [
                    { id: 'perfect_1', type: 'no_leaks', target: 0, description: 'Complete a wave with no leaks' }
                ],
                { research: 10, currency: 150 }
            ),
            new CampaignLevel(
                3,
                'Tower Master',
                'Survive 5 waves with limited towers',
                98765,
                [
                    { id: 'survive_5', type: 'survive_waves', target: 5, description: 'Survive 5 waves' },
                    { id: 'tower_limit', type: 'tower_limit', target: 5, description: 'Use no more than 5 towers' }
                ],
                { research: 15, currency: 200 }
            ),
            new CampaignLevel(
                4,
                'Killing Spree',
                'Kill 100 enemies',
                11111,
                [
                    { id: 'kill_100', type: 'kill_count', target: 100, description: 'Kill 100 enemies' }
                ],
                { research: 20, currency: 250 }
            ),
            new CampaignLevel(
                5,
                'Perfect Streak',
                'Complete 3 perfect waves in a row',
                22222,
                [
                    { id: 'perfect_streak', type: 'perfect_waves', target: 3, description: 'Complete 3 perfect waves in a row' }
                ],
                { research: 25, currency: 300 }
            ),
            new CampaignLevel(
                6,
                'Endurance',
                'Survive 10 waves',
                33333,
                [
                    { id: 'survive_10', type: 'survive_waves', target: 10, description: 'Survive 10 waves' }
                ],
                { research: 30, currency: 400 }
            )
        ];
    }

    startCampaign(levelIndex) {
        if (levelIndex >= 0 && levelIndex < this.levels.length) {
            this.currentLevel = levelIndex;
            this.campaignMode = true;
            return this.levels[levelIndex];
        }
        return null;
    }

    endCampaign(game) {
        const level = this.levels[this.currentLevel];
        if (level && level.isCompleted(game)) {
            level.completed = true;
            const score = game.wave * 100 + game.totalKills * 10 + game.currency;
            if (score > level.bestScore) {
                level.bestScore = score;
            }
            
            // Apply rewards
            if (level.rewards.research) {
                game.researchSystem.addResearchPoints(level.rewards.research);
            }
            if (level.rewards.currency) {
                game.currency += level.rewards.currency;
            }
            
            this.saveCampaign();
            return true;
        }
        return false;
    }

    saveCampaign() {
        try {
            const data = {
                currentLevel: this.currentLevel,
                levels: this.levels.map(level => ({
                    id: level.id,
                    completed: level.completed,
                    bestScore: level.bestScore
                }))
            };
            localStorage.setItem('towerDefenseCampaign', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving campaign:', e);
        }
    }

    loadCampaign() {
        try {
            const saved = localStorage.getItem('towerDefenseCampaign');
            if (saved) {
                const data = JSON.parse(saved);
                this.currentLevel = data.currentLevel || 0;
                if (data.levels) {
                    for (const savedLevel of data.levels) {
                        const level = this.levels.find(l => l.id === savedLevel.id);
                        if (level) {
                            level.completed = savedLevel.completed;
                            level.bestScore = savedLevel.bestScore || 0;
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error loading campaign:', e);
        }
    }

    getNextUnlockedLevel() {
        for (let i = 0; i < this.levels.length; i++) {
            if (i === 0 || (i > 0 && this.levels[i - 1].completed)) {
                return i;
            }
        }
        return this.levels.length - 1;
    }
}

