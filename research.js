class ResearchNode {
    constructor(id, name, description, cost, requirements = [], unlocks = null) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.cost = cost;
        this.requirements = requirements; // Array of node IDs that must be researched first
        this.unlocks = unlocks; // What this unlocks (tower type, upgrade, etc.)
        this.researched = false;
    }
}

class ResearchSystem {
    constructor() {
        this.researchPoints = 0;
        this.nodes = this.initializeNodes();
        this.loadResearch();
    }

    initializeNodes() {
        return {
            // Basic unlocks
            'rapid_unlock': new ResearchNode(
                'rapid_unlock',
                'Rapid Fire Tower',
                'Unlock the Rapid Fire tower - fast firing rate, lower damage',
                5,
                [],
                { type: 'tower', value: 'rapid' }
            ),
            'sniper_unlock': new ResearchNode(
                'sniper_unlock',
                'Sniper Tower',
                'Unlock the Sniper tower - high damage, long range',
                8,
                [],
                { type: 'tower', value: 'sniper' }
            ),
            'cannon_unlock': new ResearchNode(
                'cannon_unlock',
                'Cannon Tower',
                'Unlock the Cannon tower - area damage',
                10,
                [],
                { type: 'tower', value: 'cannon' }
            ),
            'debuff_unlock': new ResearchNode(
                'debuff_unlock',
                'Debuff Tower',
                'Unlock the Debuff tower - slows enemies',
                12,
                ['rapid_unlock'],
                { type: 'tower', value: 'debuff' }
            ),
            'support_unlock': new ResearchNode(
                'support_unlock',
                'Support Tower',
                'Unlock the Support tower - boosts nearby towers',
                12,
                ['sniper_unlock'],
                { type: 'tower', value: 'support' }
            ),
            'chain_unlock': new ResearchNode(
                'chain_unlock',
                'Chain Lightning Tower',
                'Unlock the Chain Lightning tower - damage chains between enemies',
                15,
                ['cannon_unlock'],
                { type: 'tower', value: 'chain' }
            ),
            // Upgrades
            'damage_boost': new ResearchNode(
                'damage_boost',
                'Damage Boost',
                'All towers deal 10% more damage',
                10,
                ['rapid_unlock', 'sniper_unlock'],
                { type: 'upgrade', value: 'damage', multiplier: 1.1 }
            ),
            'range_boost': new ResearchNode(
                'range_boost',
                'Range Boost',
                'All towers have 15% more range',
                10,
                ['sniper_unlock'],
                { type: 'upgrade', value: 'range', multiplier: 1.15 }
            ),
            'fire_rate_boost': new ResearchNode(
                'fire_rate_boost',
                'Fire Rate Boost',
                'All towers fire 10% faster',
                10,
                ['rapid_unlock'],
                { type: 'upgrade', value: 'fireRate', multiplier: 0.9 }
            ),
            'economy_boost': new ResearchNode(
                'economy_boost',
                'Economy Boost',
                'Earn 20% more currency from kills',
                8,
                [],
                { type: 'upgrade', value: 'economy', multiplier: 1.2 }
            )
        };
    }

    canResearch(nodeId) {
        const node = this.nodes[nodeId];
        if (!node || node.researched) return false;

        // Check if requirements are met
        for (const reqId of node.requirements) {
            if (!this.nodes[reqId] || !this.nodes[reqId].researched) {
                return false;
            }
        }

        // Check if player has enough research points
        return this.researchPoints >= node.cost;
    }

    research(nodeId) {
        if (!this.canResearch(nodeId)) {
            return false;
        }

        const node = this.nodes[nodeId];
        this.researchPoints -= node.cost;
        node.researched = true;
        this.saveResearch();
        return true;
    }

    addResearchPoints(points) {
        this.researchPoints += points;
        this.saveResearch();
    }

    getUnlockedTowers() {
        const unlocked = ['basic']; // Basic is always unlocked
        for (const node of Object.values(this.nodes)) {
            if (node.researched && node.unlocks && node.unlocks.type === 'tower') {
                unlocked.push(node.unlocks.value);
            }
        }
        return unlocked;
    }

    getUpgradeMultiplier(upgradeType) {
        let multiplier = 1.0;
        for (const node of Object.values(this.nodes)) {
            if (node.researched && node.unlocks && 
                node.unlocks.type === 'upgrade' && 
                node.unlocks.value === upgradeType) {
                multiplier *= node.unlocks.multiplier;
            }
        }
        return multiplier;
    }

    saveResearch() {
        try {
            const data = {
                researchPoints: this.researchPoints,
                researched: {}
            };
            for (const [id, node] of Object.entries(this.nodes)) {
                data.researched[id] = node.researched;
            }
            localStorage.setItem('towerDefenseResearch', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving research:', e);
        }
    }

    loadResearch() {
        try {
            const saved = localStorage.getItem('towerDefenseResearch');
            if (saved) {
                const data = JSON.parse(saved);
                this.researchPoints = data.researchPoints || 0;
                if (data.researched) {
                    for (const [id, researched] of Object.entries(data.researched)) {
                        if (this.nodes[id]) {
                            this.nodes[id].researched = researched;
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error loading research:', e);
        }
    }

    reset() {
        this.researchPoints = 0;
        for (const node of Object.values(this.nodes)) {
            node.researched = false;
        }
        this.saveResearch();
    }
}

