var fashion = fashion || {};

fashion.List = function(items, separator) {
    this.items = items || [];
    this.separator = separator || ' ';
};

fashion.List.prototype.type = 'list';

fashion.List.prototype.toString = function() {
    return this.items.join(this.separator);
};

fashion.List.prototype.toBoolean = function() {
    return !!this.items.length;
};

fashion.List.prototype.clone = function() {
    return new fashion.List(this.items.slice());
};

fashion.List.prototype.add = function(item) {
    return this.items.push(item);
};

fashion.List.prototype.get = function(index) {
    return this.items[index-1] || null;
};

fashion.List.prototype.__defineGetter__('hash', function() {
    return this.toString();
});

fashion.List.prototype.__defineGetter__('value', function() {
    return {
        items: this.items,
        separator: this.separator
    };
});

fashion.List.prototype.operate = function(operation, right) {
    switch(operation) {
        case '!=':
            if(right.type === 'literal') {
                if(right.value === 'null' || right.value === 'none') {
                    return !!this.items;
                }
            }
        case '==':
            if(right.type === 'literal') {
                if(right.value === 'null' || right.value === 'none') {
                    return !!this.items;
                }
            }
    }
    return fashion.Type.operate(operation, this, right);
};
