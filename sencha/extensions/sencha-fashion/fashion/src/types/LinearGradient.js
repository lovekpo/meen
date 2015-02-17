var fashion;
fashion = fashion || {};

fashion.LinearGradient = function(direction, stops) {
    this.direction = direction;
    this.stops = stops;
};

fashion.LinearGradient.prototype.type = 'lineargradient';

fashion.LinearGradient.prototype.toString = function() {
    var string = 'linear-gradient(';
    if (this.position) {
        string += (this.position + ', ');
    }
    return string + this.stops + ')';
};

fashion.LinearGradient.prototype.toOriginalWebkitString = function() {
    // args = []
    // args << grad_point(position_or_angle || Sass::Script::String.new("top"))
    // args << linear_end_position(position_or_angle, color_stops)
    // args << grad_color_stops(color_stops)
    // args.each{|a| a.options = options}
    // Sass::Script::String.new("-webkit-gradient(linear, #{args.join(', ')})")
    //this.gradientPoints(this.position);    
    var args = [],
        stops = this.stops.items,
        ln = stops.length,
        i;

    args.push('top');
    args.push('bottom');    
    for (i = 0; i < ln; i++) {
        args.push(stops[i].toOriginalWebkitString());
    }
    return '-webkit-gradient(linear, ' + args.join(', ') + ')';
};

fashion.LinearGradient.prototype.supports = function(prefix) {
    return ['owg', 'webkit'].indexOf(prefix.toLowerCase()) !== -1;
};

fashion.LinearGradient.prototype.gradientPoints = function(position) {
    position = (position.type == 'list') ? position.clone() : new fashion.List([position]);
    console.log('gradientpoints', position);
};

fashion.LinearGradient.prototype.clone = function() {
    return new fashion.LinearGradient(this.direction, this.stops);
};

fashion.LinearGradient.prototype.__defineGetter__('hash', function() {
    return this.toString();
});
fashion.LinearGradient.prototype.__defineGetter__('value', function() {
    return {
        stops: this.stops,
        direction: this.direction
    };
});

fashion.LinearGradient.prototype.operate = function(operation, right) {
    switch(operation) {
        case "!=":
            if(right.type == 'literal' && (right.value == 'null' || right.value == 'none')) {
                return true;
            }
        case "==":
            if(right.type == 'literal' && (right.value == 'null' || right.value == 'none')) {
                return false;
            }
    }
    return fashion.Type.operate(operation, this, right);
};
