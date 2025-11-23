class Ability {
    constructor(name, cost, cooldown, duration, effect) {
        this.name = name;
        this.cost = cost;
        this.cooldown = cooldown; // in milliseconds
        this.duration = duration; // in milliseconds
        this.effect = effect;
        this.lastUsed = 0;
        this.active = false;
        this.activeUntil = 0;
    }

    canUse(currentTime, currency) {
        return currency >= this.cost && 
               (currentTime - this.lastUsed) >= this.cooldown &&
               !this.active;
    }

    use(currentTime, game) {
        if (!this.canUse(currentTime, game.currency)) {
            return false;
        }

        game.currency -= this.cost;
        this.lastUsed = currentTime;
        this.active = true;
        this.activeUntil = currentTime + this.duration;
        
        this.effect(game, currentTime);
        return true;
    }

    update(currentTime, game) {
        if (this.active && currentTime >= this.activeUntil) {
            this.active = false;
            // Cleanup effect if needed
            if (this.effect.cleanup) {
                this.effect.cleanup(game);
            }
        }
    }
}

class AbilitySystem {
    constructor() {
        this.abilities = {
            speedBoost: new Ability(
                'Speed Boost',
                100,
                30000, // 30 second cooldown
                10000, // 10 second duration
                {
                    apply: (game, currentTime) => {
                        game.abilitySpeedBoost = 2.0; // 2x fire rate
                        game.abilitySpeedBoostEnd = currentTime + 10000;
                    },
                    cleanup: (game) => {
                        game.abilitySpeedBoost = 1.0;
                    }
                }
            ),
            freezeWave: new Ability(
                'Freeze Wave',
                150,
                45000, // 45 second cooldown
                5000, // 5 second duration
                {
                    apply: (game, currentTime) => {
                        game.abilityFreezeWave = true;
                        game.abilityFreezeWaveEnd = currentTime + 5000;
                        // Slow all enemies
                        for (const enemy of game.enemies) {
                            if (!enemy.isDead && !enemy.reachedEnd) {
                                if (!enemy.freezeOriginalSpeed) {
                                    enemy.freezeOriginalSpeed = enemy.speed;
                                }
                                enemy.speed *= 0.1; // 90% slow
                            }
                        }
                    },
                    cleanup: (game) => {
                        game.abilityFreezeWave = false;
                        // Restore enemy speeds
                        for (const enemy of game.enemies) {
                            if (enemy.freezeOriginalSpeed) {
                                enemy.speed = enemy.freezeOriginalSpeed;
                                enemy.freezeOriginalSpeed = null;
                            }
                        }
                    }
                }
            ),
            airstrike: new Ability(
                'Airstrike',
                200,
                60000, // 60 second cooldown
                0, // Instant
                {
                    apply: (game, currentTime) => {
                        // Player will click to target airstrike
                        game.airstrikeActive = true;
                    }
                }
            ),
            shield: new Ability(
                'Shield',
                250,
                90000, // 90 second cooldown
                8000, // 8 second duration
                {
                    apply: (game, currentTime) => {
                        game.abilityShield = true;
                        game.abilityShieldEnd = currentTime + 8000;
                    },
                    cleanup: (game) => {
                        game.abilityShield = false;
                    }
                }
            )
        };
    }

    update(currentTime, game) {
        for (const ability of Object.values(this.abilities)) {
            ability.update(currentTime, game);
        }

        // Update speed boost
        if (game.abilitySpeedBoost && currentTime >= game.abilitySpeedBoostEnd) {
            game.abilitySpeedBoost = 1.0;
        }

        // Update freeze wave
        if (game.abilityFreezeWave && currentTime >= game.abilityFreezeWaveEnd) {
            this.abilities.freezeWave.effect.cleanup(game);
        }

        // Update shield
        if (game.abilityShield && currentTime >= game.abilityShieldEnd) {
            game.abilityShield = false;
        }
    }

    useAbility(abilityName, currentTime, game) {
        const ability = this.abilities[abilityName];
        if (ability) {
            return ability.use(currentTime, game);
        }
        return false;
    }

    getAbility(abilityName) {
        return this.abilities[abilityName];
    }
}

