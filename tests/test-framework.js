// Simple browser-based test framework

class TestRunner {
    constructor() {
        this.suites = [];
        this.currentSuite = null;
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            suites: []
        };
    }

    describe(name, fn) {
        this.currentSuite = {
            name: name,
            tests: [],
            beforeEach: null,
            afterEach: null
        };
        this.suites.push(this.currentSuite);
        fn();
        this.currentSuite = null;
    }

    beforeEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach = fn;
        }
    }

    afterEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterEach = fn;
        }
    }

    it(name, fn) {
        if (this.currentSuite) {
            this.currentSuite.tests.push({ name, fn });
        }
    }

    async run() {
        console.log('🧪 Running tests...\n');
        this.results = { passed: 0, failed: 0, total: 0, suites: [] };

        for (const suite of this.suites) {
            const suiteResult = {
                name: suite.name,
                tests: [],
                passed: 0,
                failed: 0
            };

            console.log(`\n📦 ${suite.name}`);

            for (const test of suite.tests) {
                this.results.total++;

                try {
                    if (suite.beforeEach) {
                        await suite.beforeEach();
                    }

                    await test.fn();

                    if (suite.afterEach) {
                        await suite.afterEach();
                    }

                    this.results.passed++;
                    suiteResult.passed++;
                    suiteResult.tests.push({ name: test.name, passed: true });
                    console.log(`  ✅ ${test.name}`);
                } catch (error) {
                    this.results.failed++;
                    suiteResult.failed++;
                    suiteResult.tests.push({ name: test.name, passed: false, error: error.message });
                    console.log(`  ❌ ${test.name}`);
                    console.error(`     Error: ${error.message}`);
                }
            }

            this.results.suites.push(suiteResult);
        }

        this.printSummary();
        return this.results;
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log(`📊 Test Results: ${this.results.passed}/${this.results.total} passed`);

        if (this.results.failed > 0) {
            console.log(`❌ ${this.results.failed} test(s) failed`);
        } else {
            console.log('✅ All tests passed!');
        }
        console.log('='.repeat(50));
    }
}

// Assertion library
const assert = {
    equal(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, but got ${actual}`);
        }
    },

    strictEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected} (===), but got ${actual}`);
        }
    },

    deepEqual(actual, expected, message = '') {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
    },

    notEqual(actual, expected, message = '') {
        if (actual === expected) {
            throw new Error(message || `Expected value to not equal ${expected}`);
        }
    },

    ok(value, message = '') {
        if (!value) {
            throw new Error(message || `Expected truthy value, but got ${value}`);
        }
    },

    notOk(value, message = '') {
        if (value) {
            throw new Error(message || `Expected falsy value, but got ${value}`);
        }
    },

    throws(fn, message = '') {
        let threw = false;
        try {
            fn();
        } catch (e) {
            threw = true;
        }
        if (!threw) {
            throw new Error(message || 'Expected function to throw an error');
        }
    },

    approximately(actual, expected, tolerance, message = '') {
        if (Math.abs(actual - expected) > tolerance) {
            throw new Error(message || `Expected ${actual} to be within ${tolerance} of ${expected}`);
        }
    },

    isArray(value, message = '') {
        if (!Array.isArray(value)) {
            throw new Error(message || `Expected an array, but got ${typeof value}`);
        }
    },

    isObject(value, message = '') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error(message || `Expected an object, but got ${typeof value}`);
        }
    },

    isFunction(value, message = '') {
        if (typeof value !== 'function') {
            throw new Error(message || `Expected a function, but got ${typeof value}`);
        }
    },

    isNumber(value, message = '') {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error(message || `Expected a number, but got ${typeof value}`);
        }
    },

    isString(value, message = '') {
        if (typeof value !== 'string') {
            throw new Error(message || `Expected a string, but got ${typeof value}`);
        }
    },

    includes(array, item, message = '') {
        if (!array.includes(item)) {
            throw new Error(message || `Expected array to include ${item}`);
        }
    },

    hasProperty(obj, prop, message = '') {
        if (!(prop in obj)) {
            throw new Error(message || `Expected object to have property "${prop}"`);
        }
    },

    greaterThan(actual, expected, message = '') {
        if (actual <= expected) {
            throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
        }
    },

    lessThan(actual, expected, message = '') {
        if (actual >= expected) {
            throw new Error(message || `Expected ${actual} to be less than ${expected}`);
        }
    },

    between(actual, min, max, message = '') {
        if (actual < min || actual > max) {
            throw new Error(message || `Expected ${actual} to be between ${min} and ${max}`);
        }
    }
};

// Global test runner instance
const testRunner = new TestRunner();
const describe = testRunner.describe.bind(testRunner);
const it = testRunner.it.bind(testRunner);
const beforeEach = testRunner.beforeEach.bind(testRunner);
const afterEach = testRunner.afterEach.bind(testRunner);

// Export for use
window.TestRunner = TestRunner;
window.testRunner = testRunner;
window.assert = assert;
window.describe = describe;
window.it = it;
window.beforeEach = beforeEach;
window.afterEach = afterEach;
