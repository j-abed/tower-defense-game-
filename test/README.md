# Test Suite for Tower Defense Game

This directory contains comprehensive automated tests for the Tower Defense game.

## Running Tests

### Option 1: Browser (Recommended)
1. Open `test-runner.html` in a web browser
2. Tests will run automatically and display results

### Option 2: Node.js (if you have a test runner)
You can adapt the tests to run in Node.js with a testing framework like Jest or Mocha.

## Test Coverage

### Unit Tests

#### Tower Class
- ✅ Tower creation with correct properties
- ✅ Distance calculation
- ✅ Tower upgrades
- ✅ Target finding (closest, range checking)
- ✅ DPS calculation
- ✅ Kill tracking

#### Enemy Class
- ✅ Enemy creation
- ✅ Damage handling
- ✅ Death mechanics
- ✅ Shield mechanics
- ✅ Regeneration
- ✅ Path movement
- ✅ End detection

#### Path Class
- ✅ Path generation
- ✅ Seed-based determinism
- ✅ Position calculation
- ✅ Point-on-path detection

#### Particle System
- ✅ Particle creation (explosion, hit, money)
- ✅ Particle updates and cleanup

#### Damage Number System
- ✅ Damage number creation
- ✅ Color assignment based on damage
- ✅ Update and cleanup

#### Research System
- ✅ Research point management
- ✅ Research availability checking
- ✅ Research execution and unlocks

#### Achievement System
- ✅ Achievement initialization
- ✅ Achievement unlocking
- ✅ Condition checking

#### Statistics System
- ✅ Statistics tracking
- ✅ Kill/wave recording
- ✅ Favorite tower calculation
- ✅ Save/load functionality

#### Campaign System
- ✅ Campaign level initialization
- ✅ Objective checking
- ✅ Completion detection

#### Ability System
- ✅ Ability initialization
- ✅ Ability usage checking
- ✅ Currency requirements
- ✅ Effect application

### Integration Tests
- ✅ Tower shooting enemy
- ✅ Enemy reaching end

## Test Framework

The test framework (`test-framework.js`) provides:
- `test.describe()` - Define a test suite
- `test.it()` - Define a test case
- `test.expect()` - Assertions (toBe, toEqual, toBeGreaterThan, etc.)

## Adding New Tests

To add new tests, edit `tests.js` and add new test cases:

```javascript
test.describe('New Feature', () => {
    test.it('should do something', () => {
        // Test code here
        test.expect(actual).toBe(expected);
    });
});
```

## Notes

- Tests use mock DOM elements where needed
- Some tests require game state to be properly initialized
- Integration tests may need game loop simulation
- All tests run in browser environment

