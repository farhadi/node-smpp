var assert = require('assert'),
    encodings = require('../lib/defs').encodings;

describe('encodings', function() {
	describe('ASCII', function() {
		var ASCII = encodings.ASCII;
		var samples = {
			'@£$¥': [0, 1, 2, 3],
			' 1a=': [0x20, 0x31, 0x61, 0x3D],
			'~^€': [0x1B, 0x3D, 0x1B, 0x14, 0x1B, 0x65]
		};

		describe('#match()', function() {
			it('should return true for strings that can be encoded using GSM 03.38 ASCII charset', function() {
				assert(ASCII.match(''));
				assert(ASCII.match('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&\''));
				assert(ASCII.match('()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZ'));
				assert(ASCII.match('ÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'));
				assert(ASCII.match('\f^{}\\[~]|€'));
			});

			it('should return false for strings that can not be encoded using GSM 03.38 ASCII charset', function() {
				assert(!ASCII.match('`'));
				assert(!ASCII.match('ÁáçÚUÓO'));
				assert(!ASCII.match('تست'));
			});
		});

		describe('#encode', function() {
			it('should properly encode the given string using GSM 03.38 ASCII charset', function() {
				for(var str in samples) {
					assert.deepEqual(ASCII.encode(str), new Buffer(samples[str]));
				}
			});
		});

		describe('#decode', function() {
			it('should properly decode the given buffer using GSM 03.38 ASCII charset', function() {
				for(var str in samples) {
					assert.deepEqual(ASCII.decode(samples[str]), str);
				}
			});
		});
	});

	describe('LATIN1', function() {
		var LATIN1 = encodings.LATIN1;
		var samples = {
			'@$`Á': [0x40, 0x24, 0x60, 0xC1],
			'áçÚ': [0xE1, 0xE7, 0xDA],
			'UÓO': [0x55, 0xD3, 0x4F]
		};

		describe('#match()', function() {
			it('should return true for strings that can be encoded using LATIN1 charset', function() {
				assert(LATIN1.match('`ÁáçÚUÓO'));
			});

			it('should return false for strings that can not be encoded using LATIN1 charset', function() {
				assert(!LATIN1.match('تست'));
				assert(!LATIN1.match('۱۲۳۴۵۶۷۸۹۰'));
				assert(!LATIN1.match('ʹʺʻʼʽ`'));
			});
		});

		describe('#encode', function() {
			it('should properly encode the given string using LATIN1 charset', function() {
				for(var str in samples) {
					assert.deepEqual(LATIN1.encode(str), new Buffer(samples[str]));
				}
			});
		});

		describe('#decode', function() {
			it('should properly decode the given buffer using LATIN1 charset', function() {
				for(var str in samples) {
					assert.deepEqual(LATIN1.decode(samples[str]), str);
				}
			});
		});
	});

	describe('UCS2', function() {
		var UCS2 = encodings.UCS2;
		var samples = {
			' 1a': [0x00, 0x20, 0x00, 0x31, 0x00, 0x61],
			'۱۲۳': [0x06, 0xF1, 0x06, 0xF2, 0x06, 0xF3]
		};

		describe('#match()', function() {
			it('should always return true', function() {
				assert(UCS2.match(''));
				assert(UCS2.match('`ÁáçÚUÓO'));
				assert(UCS2.match('تست'));
				assert(UCS2.match('۱۲۳۴۵۶۷۸۹۰'));
				assert(UCS2.match('ʹʺʻʼʽ`'));
			});
		});

		describe('#encode', function() {
			it('should properly encode the given string using UCS2 charset', function() {
				for(var str in samples) {
					assert.deepEqual(UCS2.encode(str), new Buffer(samples[str]));
				}
			});
		});

		describe('#decode', function() {
			it('should properly decode the given buffer using UCS2 charset', function() {
				for(var str in samples) {
					assert.deepEqual(UCS2.decode(samples[str]), str);
				}
			});
		});
	});

	describe('#detect()', function() {
		it('should return proper encoding for the given string', function() {
			assert.equal(encodings.detect(''), 'ASCII');
			assert.equal(encodings.detect('ÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà(){}[]'), 'ASCII');
			assert.equal(encodings.detect('`ÁáçÚUÓO'), 'LATIN1');
			assert.equal(encodings.detect('«©®µ¶±»'), 'LATIN1');
			assert.equal(encodings.detect('ʹʺʻʼʽ`'), 'UCS2');
			assert.equal(encodings.detect('تست'), 'UCS2');
			assert.equal(encodings.detect('۱۲۳۴۵۶۷۸۹۰'), 'UCS2');
		});
	});
});
