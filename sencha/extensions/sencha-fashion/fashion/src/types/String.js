var fashion;
fashion = fashion || {};

fashion.String = function(value) {
    this.value = value;
};

fashion.String.prototype.type = 'string';

fashion.String.prototype.toString = function() {
    return '"' + this.value.replace(/"/g,'\\"') + '"';
};

fashion.String.prototype.toBoolean = function() {
    return this.value.length;
};

fashion.String.prototype.clone = function() {
    return new fashion.String(this.value);
};

fashion.String.prototype.operate = function(operation, right) {
    var norm, value;
    if(right.type === 'number') {
        if((norm = fashion.Number.prototype.tryNormalize(this))) {
            return norm.operate(operation, right);
        };
    }

    switch(right.type) {
        case 'list':
            value = right.toString();
            break;
        default:
            value = right.value;
            break;
    }

    switch (operation) {
        case '+':
            return new fashion.String(this.value + value);
        case '/':
            return new fashion.String([this.value, value].join('/'));
    }
    return fashion.Type.operate(operation, this, right);
};

fashion.String.prototype.__defineGetter__('hash', function() {
    return this.value;
});
