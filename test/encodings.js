var assert = require('assert'),
	encodings = require('../lib/defs').encodings;
	gsmCoder = require('../lib/defs').gsmCoder;

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

	describe('GSM_TR', function() {
		var samples = {
			'@£$¥': [0, 1, 2, 3],
			' 1a=': [0x20, 0x31, 0x61, 0x3D],
			'~^€Ğ': [0x1B, 0x3D, 0x1B, 0x14, 0x04, 0x0B]
		};

		describe('#match()', function() {
			it('should return true for strings that can be encoded using GSM 03.38 Turkish Shift Table charset', function() {
				assert(gsmCoder.GSM_TR.charRegex.test(''));
				assert(gsmCoder.GSM_TR.charRegex.test('@£$¥€éùıòÇ\nĞğ\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BŞşßÉ !"#¤%&\''));
				assert(gsmCoder.GSM_TR.charRegex.test('()*+,-./0123456789:;<=>?İABCDEFGHIJKLMNOPQRSTUVWXYZ'));
				assert(gsmCoder.GSM_TR.charRegex.test('ÄÖÑÜ§çabcdefghijklmnopqrstuvwxyzäöñüà'));
				assert(gsmCoder.GSM_TR.charRegex.test('\f^{}\\[~]|ĞİŞç€ğış'));
			});

			it('should return false for strings that can not be encoded using GSM 03.38 Turkish Shift Table charset', function() {
				assert(!gsmCoder.GSM_TR.charRegex.test('`'));
				assert(!gsmCoder.GSM_TR.charRegex.test('ąęłńśż'));
				assert(!gsmCoder.GSM_TR.charRegex.test('ကြယ်တာရာ'));
			});
		});

		describe('#encode', function() {
			it('should properly encode the given string using GSM 03.38 Spanish Shift Table charset', function() {
				for(var str in samples) {
					assert.deepEqual(gsmCoder.encode(str, 0x01), new Buffer(samples[str]));
				}
			});
		});

		describe('#decode', function() {
			it('should properly decode the given buffer using GSM 03.38 Spanish Shift Table charset', function() {
				for(var str in samples) {
					assert.deepEqual(gsmCoder.decode(samples[str], 0x01), str);
				}
			});
		});
	});

	describe('GSM_ES', function() {
		var samples = {
			'@£$¥': [0, 1, 2, 3],
			' 1a=': [0x20, 0x31, 0x61, 0x3D],
			'~^€ú': [0x1B, 0x3D, 0x1B, 0x14, 0x1B, 0x65, 0x1B, 0x75]
		};

		describe('#match()', function() {
			it('should return true for strings that can be encoded using GSM 03.38 Spanish Shift Table charset', function() {
				assert(gsmCoder.GSM_ES.charRegex.test(''));
				assert(gsmCoder.GSM_ES.charRegex.test('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&\''));
				assert(gsmCoder.GSM_ES.charRegex.test('()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZ'));
				assert(gsmCoder.GSM_ES.charRegex.test('ÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'));
				assert(gsmCoder.GSM_ES.charRegex.test('ç\f^{}\\[~]|ÁÍÓÚá€íóú'));
			});

			it('should return false for strings that can not be encoded using GSM 03.38 Spanish Shift Table charset', function() {
				assert(!gsmCoder.GSM_ES.charRegex.test('`'));
				assert(!gsmCoder.GSM_ES.charRegex.test('ąęłńśż'));
				assert(!gsmCoder.GSM_ES.charRegex.test('ကြယ်တာရာ'));
			});
		});

		describe('#encode', function() {
			it('should properly encode the given string using GSM 03.38 Spanish Shift Table charset', function() {
				for(var str in samples) {
					assert.deepEqual(gsmCoder.encode(str, 0x02), new Buffer(samples[str]));
				}
			});
		});

		describe('#decode', function() {
			it('should properly decode the given buffer using GSM 03.38 Spanish Shift Table charset', function() {
				for(var str in samples) {
					assert.deepEqual(gsmCoder.decode(samples[str], 0x02), str);
				}
			});
		});
	});

	describe('GSM_PT', function() {
		var samples = {
			'@£$¥': [0, 1, 2, 3],
			' 1a=Ã': [0x20, 0x31, 0x61, 0x3D, 0x5B],
			'~^Σ': [0x1B, 0x3D, 0x1B, 0x14, 0x1B, 0x18]
		};

		describe('#match()', function() {
			it('should return true for strings that can be encoded using GSM 03.38 Portuguese Shift Table charset', function() {
				assert(gsmCoder.GSM_PT.charRegex.test(''));
				assert(gsmCoder.GSM_PT.charRegex.test('@£$¥êéúíóç\nÔô\rÁáΔ_ªÇÀ∞^\\€Ó|\x1BÂâÊÉ !"#º%&\''));
				assert(gsmCoder.GSM_PT.charRegex.test('()*+,-./0123456789:;<=>?ÍABCDEFGHIJKLMNOPQRSTUVWXYZ'));
				assert(gsmCoder.GSM_PT.charRegex.test('ÃÕÚÜ§~abcdefghijklmnopqrstuvwxyzãõ`üà'));
				assert(gsmCoder.GSM_PT.charRegex.test('êç\fÔô\rÁáΦΓ^ΩΠΨΣΘÊ{}\\[~]|ÀÍÓÚÃÕÂ€íóúãõâ'));
			});

			it('should return false for strings that can not be encoded using GSM 03.38 Portuguese Shift Table charset', function() {
				assert(!gsmCoder.GSM_PT.charRegex.test('Æ'));
				assert(!gsmCoder.GSM_PT.charRegex.test('ąęłńśż'));
				assert(!gsmCoder.GSM_PT.charRegex.test('ਸਟਾਰ'));
			});
		});

		describe('#encode', function() {
			it('should properly encode the given string using GSM 03.38 Portuguese Shift Table charset', function() {
				for(var str in samples) {
					assert.deepEqual(gsmCoder.encode(str, 0x03), new Buffer(samples[str]));
				}
			});
		});

		describe('#decode', function() {
			it('should properly decode the given buffer using GSM 03.38 Portuguese Shift Table charset', function() {
				for(var str in samples) {
					assert.deepEqual(gsmCoder.decode(samples[str], 0x03), str);
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
