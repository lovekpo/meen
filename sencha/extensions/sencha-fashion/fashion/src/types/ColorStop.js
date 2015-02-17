var fashion;
fashion = fashion || {};

fashion.ColorStop = function(color, stop) {
    this.color = color;
    this.stop = stop;
};

fashion.ColorStop.prototype.type = 'colorstop';

fashion.ColorStop.prototype.toString = function() {
    var string = this.color.toString(),
        stop = this.stop;
        
    if (stop) {
        stop = stop.clone();
        string += ' ';
        if (!stop.unit) {
            stop.value *= 100;
            stop.unit = '%';
        }        
        string += stop.toString();
    }
    
    return string;
};

fashion.ColorStop.prototype.toOriginalWebkitString = function() {
    var string = '',
        stop = this.stop;
        
    if (!stop) {
        stop = new fashion.Number(0, '%');
    }
    
    stop = stop.clone();
    if (!stop.unit) {
        stop.value *= 100;
        stop.unit = '%';
    }
    
    return 'color-stop(' + stop.toString() + ', ' + this.color.toString() + ')';
};

fashion.ColorStop.prototype.clone = function() {
    return new fashion.ColorStop(this.color, this.stop);
};

fashion.ColorStop.prototype.__defineGetter__('hash', function() {
    return this.toString();
});
fashion.ColorStop.prototype.__defineGetter__('value', function() {
    return {
        stop: this.stop,
        color: this.color
    };
});
