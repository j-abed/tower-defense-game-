# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Additional tower types
- More enemy varieties
- Sound effects
- Multiple difficulty levels
- High score system

## [0.1.0] - 2024-11-11

### Added
- **Core Game Mechanics**
  - Multiple tower types: Basic, Rapid Fire, Sniper, and Cannon towers
  - Tower upgrade system with progressive stat improvements
  - Tower selling functionality with 70% refund of investment
  - Enemy wave system with progressive difficulty
  - Four enemy types: Basic, Fast, Tank, and Boss
  - Currency system: earn money by defeating enemies
  - Health system: base takes damage when enemies reach the end
  - Game over and restart functionality

- **Map Generation**
  - Procedurally generated maps with seed-based randomization
  - Deterministic map generation (same seed = same map)
  - Map seed input and random seed generation
  - Map regeneration controls
  - Smooth path generation with waypoint system

- **Gameplay Features**
  - Fast forward system (2x, 3x, 4x speed) - default 2x
  - Pause/resume functionality
  - Wave progression system
  - Tower range indicators when selected
  - Range preview when placing towers
  - Tower placement validation (prevents placing on path or too close to other towers)

- **Visual Enhancements**
  - Particle effects system (explosions, hits, money collection)
  - Enhanced graphics with shadows, gradients, and glow effects
  - Improved tower rendering with highlights and borders
  - Enhanced enemy rendering with health bars and visual indicators
  - Improved path rendering with gradients and markers
  - Background grid system
  - Visual feedback for all game actions

- **User Interface**
  - Modern, polished UI design with gradient backgrounds
  - Game stats panel (Health, Currency, Wave, Enemies Left)
  - Tower selection panel with visual previews
  - Game controls panel
  - Map settings panel with seed controls
  - Game over overlay with restart option
  - Responsive design

- **Technical Features**
  - HTML5 Canvas rendering
  - Vanilla JavaScript (no dependencies)
  - Seeded random number generator (Mulberry32 algorithm)
  - Pathfinding system for enemy movement
  - Collision detection
  - Projectile system with area damage support
  - Game loop with requestAnimationFrame

### Changed
- Default game speed set to 2x for faster gameplay

### Fixed
- Canvas dimension validation to prevent crashes
- Path generation with invalid canvas dimensions
- Null checks for DOM elements
- Error handling for game initialization

### Technical Details
- All graphics rendered programmatically using Canvas 2D API
- No external image assets required
- Cross-browser compatible
- No build process or dependencies required

