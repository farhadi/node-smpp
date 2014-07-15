var q = require("q");

module.exports = {

	events : function (emitter, successEvent) {
		var deferred     = q.defer();
		var errorHandler;
		var successHandler;

		errorHandler = function (error) {
			emitter.removeListener(successEvent, successHandler);
			deferred.reject(error);
		};

		successHandler = function () {
			emitter.removeListener("error", errorHandler);
			if (arguments.length > 1) {
				deferred.resolve(Array.prototype.slice.call(arguments));
			}
			else {
				deferred.resolve(arguments[0]);
			}
		};

		emitter.once("error", errorHandler);
		emitter.once(successEvent, successHandler);
		return deferred.promise;
	},

	invoke : function (emitter, method) {
		var args         = Array.prototype.slice.call(arguments, 2);
		var deferred     = q.defer();
		var errorHandler = deferred.reject.bind(deferred);

		function successHandler (result) {
			emitter.removeListener("error", errorHandler);
			deferred.resolve(result);
		}

		emitter.once("error", errorHandler);
		emitter[method].apply(emitter, args.concat(successHandler));
		return deferred.promise;
	}

};
