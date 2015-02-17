var fashion = fashion || (function(){
    var _proto = function(){};

    return {
        /**
         * Use this to register new "native" methods to the fashion runtime. This is an alias for fashion.Runtime.register.
         * @param {Object} methods An object containing methods you want to add to the runtime of fashion.
         */
        register: function(methods) {
            fashion.Runtime.register(methods);
        },

        isArray: Array.isArray,

        chain: function(Parent) {
            _proto.prototype = Parent;
            var chained = new _proto();
            _proto.prototype = null;
            return chained;
        }
    };
})();
