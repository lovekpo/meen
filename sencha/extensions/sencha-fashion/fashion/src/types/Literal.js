var fashion;
fashion = fashion || {};

fashion.Literal = function(value) {
    this.value = value;
};

fashion.Literal.prototype.type = 'literal';

fashion.Literal.prototype.toString = function() {
    return this.value;
};

fashion.Literal.prototype.toBoolean = function() {
    return this.value.length;
};

fashion.Literal.prototype.clone = function() {
    return new fashion.Literal(this.value);
};

fashion.Literal.prototype.operate = function(operation, right) {
    var norm;
    if(right.type === 'number') {
        if((norm = fashion.Number.prototype.tryNormalize(this))) {
            return norm.operate(operation, right);
        };
    }

    switch (operation) {
        case '+':
            switch (right.type) {
                case 'string':
                    return new fashion.String(this.value + right.value);
                case 'literal':
                    return new fashion.Literal(this.value + right.value);
            }
            return new fashion.Literal(this.value + right.toString());
        case '/':
            return new fashion.Literal(this.value + "/" + right.value);
    }    
    return fashion.Type.operate(operation, this, right);
};

fashion.Literal.prototype.__defineGetter__('hash', function() {
    return this.value;
});

fashion.Null = new fashion.Literal('null');
fashion.None = new fashion.Literal('none');