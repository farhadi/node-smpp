var assert = require('assert'),
	utils = require('../lib/utils');

var version = parseFloat(process.version.replace('v', '')),
	runTest = true;
if (version < 5.10) {
	/**
	 * Buffer.alloc / Buffer.allocUnsafe / Buffer.from were added just in v5.10.0
	 * @type {boolean}
	 */
	runTest = false;
}

describe('Utils', function() {
	describe('Buffer()', function() {
		if (!runTest) {
			return;
		}

		it('Utils.Buffer() should be same as Buffer.alloc()', function() {
			assert.deepEqual(utils.Buffer(0), Buffer.alloc(0));
			assert.deepEqual(utils.Buffer(12345), Buffer.alloc(12345));
		});

		it('Utils.Buffer() should be same as Buffer.allocUnsafe()', function() {
			assert.deepEqual(utils.Buffer(0), Buffer.allocUnsafe(0));
		});

		it('Utils.Buffer() should be same as Buffer.from()', function() {
			assert.deepEqual(utils.Buffer('abcdefg'), Buffer.from('abcdefg'));
			assert.deepEqual(utils.Buffer('abcdefg', 'ascii'), Buffer.from('abcdefg', 'ascii'));
			assert.deepEqual(utils.Buffer('ąčęėįšųž', 'utf8'), Buffer.from('ąčęėįšųž', 'utf8'));
			assert.deepEqual(utils.Buffer([1, 2, 3, 5000]), Buffer.from([1, 2, 3, 5000]));
		});
	});
});
