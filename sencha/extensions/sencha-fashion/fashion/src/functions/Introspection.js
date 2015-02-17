fashion.register({
    type_of: function(args) {
        var value = args[0];
        if (value === true || value === false) {
            return new fashion.Literal('bool');
        }
        if (value.type == 'hsla' || value.type == 'rgba') {
            return new fashion.Literal('color');
        }            
        if (value.type == 'literal' || value.type == 'string') {
            return new fashion.Literal('string');
        }
        return new fashion.Literal(value.type);
    },
    
    unit: function(args) {
        var number = args[0];
        if (number.type != 'number') throw number + ' is not a number for \'unit\'';
        return new fashion.String(number.unit || '');
    },
    
    unitless: function(args) {
        var number = args[0];
        if (number.type != 'number') throw number + ' is not a number for \'unitless\'';
        return new fashion.Bool(!number.unit);
    },
    
    comparable: function(args) {
        var number1 = args[0],
            number2 = args[1];
        if (number1.type != 'number') throw number1 + ' is not a number for \'comparable\'';
        if (number2.type != 'number') throw number2 + ' is not a number for \'comparable\'';        
        return new fashion.Bool(!!number1.comparable(number2));
    }
});