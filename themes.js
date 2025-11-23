class Theme {
    constructor(name, colors) {
        this.name = name;
        this.colors = colors;
    }

    applyToBackground(ctx, width, height) {
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, this.colors.backgroundStart);
        gradient.addColorStop(1, this.colors.backgroundEnd);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
}

class ThemeSystem {
    constructor() {
        this.themes = {
            default: new Theme("Default", {
                backgroundStart: "#1a252f",
                backgroundEnd: "#1a252f",
                grid: "#1e2a35",
                path: "#95a5a6",
                pathBackground: "#34495e"
            }),
            desert: new Theme("Desert", {
                backgroundStart: "#d4a574",
                backgroundEnd: "#c49464",
                grid: "#b88454",
                path: "#8b6914",
                pathBackground: "#a08244"
            }),
            snow: new Theme("Snow", {
                backgroundStart: "#e8f4f8",
                backgroundEnd: "#d0e8f0",
                grid: "#b8dce8",
                path: "#708090",
                pathBackground: "#a0b8c8"
            }),
            space: new Theme("Space", {
                backgroundStart: "#0a0a1a",
                backgroundEnd: "#1a1a2e",
                grid: "#16213e",
                path: "#0f3460",
                pathBackground: "#533483"
            }),
            forest: new Theme("Forest", {
                backgroundStart: "#2d5016",
                backgroundEnd: "#1a3009",
                grid: "#3d6026",
                path: "#8b6914",
                pathBackground: "#5a7a3a"
            })
        };
        this.currentTheme = "default";
        this.load();
    }

    setTheme(name) {
        if (this.themes[name]) {
            this.currentTheme = name;
            this.save();
            return true;
        }
        return false;
    }

    getCurrentTheme() {
        return this.themes[this.currentTheme] || this.themes.default;
    }

    save() {
        try {
            localStorage.setItem("towerDefenseTheme", this.currentTheme);
        } catch (e) {
            console.error("Error saving theme:", e);
        }
    }

    load() {
        try {
            const saved = localStorage.getItem("towerDefenseTheme");
            if (saved && this.themes[saved]) {
                this.currentTheme = saved;
            }
        } catch (e) {
            console.error("Error loading theme:", e);
        }
    }
}
