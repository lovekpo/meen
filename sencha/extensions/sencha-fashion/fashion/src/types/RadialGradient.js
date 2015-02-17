var fashion;
fashion = fashion || {};

fashion.RadialGradient = function(direction, shape, stops) {
    this.direction = direction;
    this.stops = stops;
    this.shape = shape;
};

fashion.RadialGradient.prototype.type = 'radialgradient';

fashion.RadialGradient.prototype.toString = function() {
    var string = 'radial-gradient(';
    if (this.position) {
        string += (this.position + ', ');
    }
    if (this.shape) {
        string += (this.shape + ', ');
    }
    return string + this.stops + ')';
};

fashion.RadialGradient.prototype.toOriginalWebkitString = function() {
    var args = [],
        stops = this.stops.items,
        ln = stops.length,
        i;

    args.push('center 0%');
    args.push('center 100%');
    for (i = 0; i < ln; i++) {
        args.push(stops[i].toOriginalWebkitString());
    }
    return '-webkit-gradient(radial, ' + args.join(', ') + ')';
};

fashion.RadialGradient.prototype.supports = function(prefix) {
    return ['owg', 'webkit'].indexOf(prefix.toLowerCase()) !== -1;
};

fashion.RadialGradient.prototype.gradientPoints = function(position) {
    position = (position.type == 'list') ? position.clone() : new fashion.List([position]);
    console.log('gradientpoints', position);
};

fashion.RadialGradient.prototype.clone = function() {
    return new fashion.RadialGradient(this.direction, this.stops);
};

fashion.RadialGradient.prototype.__defineGetter__('hash', function() {
    return this.toString();
});
