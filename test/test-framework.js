// Simple test framework for browser-based testing
class TestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
        this.currentSuite = null;
    }

    describe(suiteName, callback) {
        this.currentSuite = suiteName;
        this.tests = [];
        callback();
        this.runTests();
    }

    it(testName, testFunction) {
        this.tests.push({
            suite: this.currentSuite,
            name: testName,
            fn: testFunction
        });
    }

    async runTests() {
        const suiteResults = {
            suite: this.currentSuite,
            tests: [],
            passed: 0,
            failed: 0
        };

        for (const test of this.tests) {
            try {
                await test.fn();
                suiteResults.tests.push({ name: test.name, passed: true });
                suiteResults.passed++;
                console.log(`✓ ${test.name}`);
            } catch (error) {
                suiteResults.tests.push({ 
                    name: test.name, 
                    passed: false, 
                    error: error.message,
                    stack: error.stack 
                });
                suiteResults.failed++;
                console.error(`✗ ${test.name}: ${error.message}`);
            }
        }

        this.results.push(suiteResults);
        this.renderResults();
    }

    renderResults() {
        const container = document.getElementById('test-results');
        if (!container) return;

        container.innerHTML = '';
        
        let totalPassed = 0;
        let totalFailed = 0;

        for (const suite of this.results) {
            const suiteDiv = document.createElement('div');
            suiteDiv.className = 'test-suite';
            suiteDiv.innerHTML = `
                <h2>${suite.suite}</h2>
                <div class="test-summary">
                    Passed: ${suite.passed} | Failed: ${suite.failed}
                </div>
            `;

            const testsList = document.createElement('ul');
            testsList.className = 'test-list';
            
            for (const test of suite.tests) {
                const testItem = document.createElement('li');
                testItem.className = test.passed ? 'test-passed' : 'test-failed';
                testItem.innerHTML = `
                    ${test.passed ? '✓' : '✗'} ${test.name}
                    ${test.error ? `<div class="test-error">${test.error}</div>` : ''}
                `;
                testsList.appendChild(testItem);
            }

            suiteDiv.appendChild(testsList);
            container.appendChild(suiteDiv);

            totalPassed += suite.passed;
            totalFailed += suite.failed;
        }

        const summary = document.createElement('div');
        summary.className = 'test-summary-total';
        summary.innerHTML = `
            <h1>Test Summary</h1>
            <p>Total Passed: ${totalPassed}</p>
            <p>Total Failed: ${totalFailed}</p>
            <p>Total Tests: ${totalPassed + totalFailed}</p>
        `;
        container.insertBefore(summary, container.firstChild);
    }

    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${expected} but got ${actual}`);
                }
            },
            toEqual: (expected) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
                }
            },
            toBeGreaterThan: (expected) => {
                if (actual <= expected) {
                    throw new Error(`Expected ${actual} to be greater than ${expected}`);
                }
            },
            toBeLessThan: (expected) => {
                if (actual >= expected) {
                    throw new Error(`Expected ${actual} to be less than ${expected}`);
                }
            },
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected truthy value but got ${actual}`);
                }
            },
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected falsy value but got ${actual}`);
                }
            },
            toContain: (expected) => {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            },
            toBeInstanceOf: (expected) => {
                if (!(actual instanceof expected)) {
                    throw new Error(`Expected instance of ${expected.name} but got ${actual.constructor.name}`);
                }
            },
            toBeGreaterThanOrEqual: (expected) => {
                if (actual < expected) {
                    throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
                }
            },
            toBeLessThanOrEqual: (expected) => {
                if (actual > expected) {
                    throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
                }
            },
            toBeCloseTo: (expected, precision = 2) => {
                const diff = Math.abs(actual - expected);
                const threshold = Math.pow(10, -precision);
                if (diff > threshold) {
                    throw new Error(`Expected ${actual} to be close to ${expected} (within ${threshold})`);
                }
            },
            toThrow: (expectedError) => {
                try {
                    if (typeof actual !== 'function') {
                        throw new Error('Expected a function to test for throwing');
                    }
                    actual();
                    throw new Error(`Expected function to throw but it didn't`);
                } catch (error) {
                    if (expectedError && !error.message.includes(expectedError)) {
                        throw new Error(`Expected error to contain "${expectedError}" but got "${error.message}"`);
                    }
                }
            }
        };
    }
}

// Global test framework instance
const test = new TestFramework();

