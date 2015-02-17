fashion.register(function() {
    return {
        __if: function (args) {
            var expression = this.unbox(args[0]),
                val1 = args[1],
                val2 = args[2];

            return expression ? val1 : val2;
        },

        theme_image: function (args) {
            var theme = args[0],
                file = args[1];
            return new fashion.Literal('url("resources/images/' + theme.value + '/' + file.value + '")');
        },

        prefixed: function (args) {
            var prefix = args[0];
            // TODO remove - once we implement dashes in literals
            args = Array.prototype.slice.call(arguments, 1);

            var ln = args.length, i, arg;
            for (i = 0; i < ln; i++) {
                arg = args[i];
                if (arg.supports && arg.supports(prefix.value)) {
                    return new fashion.Bool(true);
                }
            }
            return new fashion.Bool(false);
        },

        _owg: function (args) {
            var value = args[0];
            if (value.type == 'list') {
                value = value.get(1);
            }
            return new fashion.Literal(value.toOriginalWebkitString());
        },

        _webkit: function (args) {
            var value = args[0];
            if (value.type == 'list') {
                value = value.get(1);
            }
            return new fashion.Literal('-webkit-' + value.toString());
        },

        _o: function (args) {
            var value = args[0];
            if (value.type == 'list') {
                value = value.get(1);
            }
            return new fashion.Literal('-o-' + value.toString());
        },

        _moz: function (args) {
            var value = args[0];
            if (value.type == 'list') {
                value = value.get(1);
            }
            return new fashion.Literal('-moz-' + value.toString());
        }
    };
}());