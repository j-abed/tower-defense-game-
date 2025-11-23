# Tower Defense Game

A fun, visually appealing tower defense game built with HTML5 Canvas and vanilla JavaScript.

## Features

- **Multiple Tower Types**: Basic, Rapid Fire, Sniper, and Cannon towers, each with unique stats
- **Enemy Waves**: Progressive difficulty with different enemy types (Basic, Fast, Tank, Boss)
- **Tower Upgrades**: Upgrade your towers to increase damage, range, and fire rate
- **Sell Towers**: Sell placed towers for a 70% refund of your investment
- **Fast Forward**: Speed up gameplay (2x, 3x, 4x speed)
- **Random Map Generation**: Procedurally generated maps with seed-based randomization
- **Particle Effects**: Beautiful visual effects for explosions, hits, and money collection
- **Pathfinding**: Enemies follow a semi-random path from start to finish
- **Currency System**: Earn money by defeating enemies, spend it on towers and upgrades
- **Health System**: Protect your base - lose health when enemies reach the end
- **Range Preview**: Visual range indicator when placing towers

## How to Play

1. **Select a Tower**: Click on a tower type in the sidebar to select it
2. **Place Towers**: Click on the canvas to place towers (avoid placing on the path)
3. **Start Wave**: Click "Start Wave" to begin spawning enemies
4. **Upgrade Towers**: Click on a placed tower, then click "Upgrade Selected" to improve it
5. **Survive**: Defend your base through multiple waves of increasing difficulty

## Tower Types

- **Basic Tower** ($50): Balanced damage and range
- **Rapid Fire** ($100): Fast firing rate, lower damage
- **Sniper** ($150): High damage, long range, slow fire rate
- **Cannon** ($200): Area damage, good for groups

## Enemy Types

- **Basic**: Standard enemy with moderate health
- **Fast**: Low health but moves quickly
- **Tank**: High health, slow movement
- **Boss**: Very high health, appears in later waves

## Controls

- **Mouse Click**: Place tower or select existing tower
- **Start Wave**: Begin the next wave
- **Pause**: Pause/resume the game
- **Fast Forward**: Toggle between 2x, 3x, and 4x speed (default is 2x)
- **Upgrade Selected**: Upgrade the currently selected tower
- **Sell Tower**: Sell the selected tower for a refund
- **Map Seed**: Enter a seed number to generate a specific map, or use random seed button

## Map Generation

The game features procedurally generated maps with seed-based randomization:
- Each map is unique but deterministic (same seed = same map)
- Enter a seed number to replay a specific map
- Share seed numbers with friends to play the same map
- Maps are generated with winding paths that ensure playability

## Running the Game

### Quick Start (Recommended)

**On macOS/Linux:**
```bash
./run.sh
```
Then open http://localhost:8000 in your browser.

**On Windows:**
```bash
run.bat
```
Then open http://localhost:8000 in your browser.

### Alternative Methods

**Method 1: Direct File Open**
Simply open `index.html` directly in your web browser. No server required!

**Method 2: Python HTTP Server**
```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```
Then open http://localhost:8000 in your browser.

**Method 3: Node.js HTTP Server**
```bash
npx http-server -p 8000
```
Then open http://localhost:8000 in your browser.

**Method 4: VS Code Live Server**
If you use VS Code, install the "Live Server" extension and right-click `index.html` → "Open with Live Server"

### Requirements

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No build process or dependencies required!
- Optional: Python 3, Python 2, or Node.js for local server (only needed for some features)

Enjoy defending your base!

