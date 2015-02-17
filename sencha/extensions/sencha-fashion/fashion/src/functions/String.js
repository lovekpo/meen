fashion.register({
    quote: function(args) {
        var string = args[0];
        if (string.type !== 'string' && string.type !== 'literal') {
            throw string + ' is not a string or literal for \'quote\'';
        }
        return new fashion.String(string.value);
    },
    
    unquote: function(args) {
        var string = args[0];
        if (string.type !== 'string' && string.type !== 'literal') {
            throw string + ' is not a string or literal for \'unquote\'';
        }
        return new fashion.Literal(string.value);
    }
});