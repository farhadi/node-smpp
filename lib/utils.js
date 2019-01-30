function Utils() {
	/**
	 * Porting to the Buffer.from() / Buffer.alloc() API
	 *
	 * @link https://nodejs.org/en/docs/guides/buffer-constructor-deprecation/
	 *
	 * @param string|integer value
	 * @param string|undefined encoding
	 * @returns Buffer
	 */
	this.Buffer = function (value, encoding) {
		var buf;
		if (typeof value === 'number') {
			if (value == 0) {
				buf = Buffer.concat([]);
			} else {
				if (process.version.indexOf('v0.10.') === 0) {
					if (Buffer.alloc) {
						buf = Buffer.alloc(value);
					} else {
						buf = new Buffer(value);
						buf.fill(0);
					}
				} else {
					buf = Buffer.alloc ? Buffer.alloc(value) : new Buffer(value).fill(0);
				}
			}
		} else {
			if (typeof encoding == 'undefined') {
				encoding = 'utf8';
			}
			if (Buffer.from && Buffer.from !== Uint8Array.from) {
				buf = Buffer.from(value, encoding);
			} else {
				buf = new Buffer(value, encoding);
			}
		}
		return buf;
	}
};

module.exports = new Utils();
