var fashion;
fashion = fashion || {};

fashion.Bool = function(value) {
    this.value = !!value;
};

fashion.Bool.prototype.type = 'bool';

fashion.Bool.prototype.toString = function() {
    return this.value ? 'true' : 'false';
};

fashion.Bool.prototype.clone = function() {
    return new fashion.Bool(this.value);
};

fashion.Bool.prototype.operate = function(operation, right) {
    return fashion.Type.operate(operation, this, right);
};

fashion.Bool.prototype.__defineGetter__('hash', function() {
    return this.toString();
});

fashion.True = new fashion.Bool(true);
fashion.False = new fashion.Bool(false);