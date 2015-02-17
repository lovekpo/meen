var fashion = fashion || {};

fashion.Number = function(value, unit) {
    this.value = value;
    this.unit = unit;
};

fashion.Number.prototype.type = 'number';

fashion.Number.prototype.toString = function() {
    var value = this.value,
        unit = this.unit;
        
    if (unit === 'px') {
        value = value.toFixed(0);
    }
    return value + (unit || '');
};

fashion.Number.prototype.toBoolean = function() {
    return this.unit ? true : !!this.value;
};

fashion.Number.prototype.clone = function() {
    return new fashion.Number(this.value, this.unit);
};

fashion.Number.prototype.__defineGetter__('hash', function() {
    return this.value;
});

fashion.Number.prototype.operate = function(operation, right) {
    var value = this.value,
        unit = this.unit,
        rtype = right.type,
        rightUnit = right.unit;

    if (rtype == 'rgba' || rtype == 'hsla') {
        return right.operate(operation, this);
    }

    if (operation == '+' && (right.type == 'string' || right.type == 'literal')) {
        return fashion.Type.operate(operation, this, right);
    }
    
    if ((operation == '-' || operation == '+') && unit != '%' && right.unit == '%') {
        right.value = value * (right.value / 100);
    } 
    else {
        var tryNorm = this.tryNormalize(right);
        if(!tryNorm) {
            if(rtype == 'string') {
                return new fashion.String(this.toString()).operate(operation, right);
            } else if(rtype == 'literal') {
                return new fashion.Literal(this.toString()).operate(operation, right);
            } else {
                throw 'Could not normalize ' + this + ' with ' + right;
            }
        } else {
            right = tryNorm;
        }
    }

    if(unit == 'px' && !rightUnit) {
        rightUnit = 'px';
    }

    if(unit && unit != rightUnit) {
        return new fashion.Literal([
            this.toString(),
            operation,
            right.toString()
        ].join(' '));
    }

    switch (operation) {
        case '-':
            return new fashion.Number(value - right.value, unit || right.unit);
        case '+':
            return new fashion.Number(value + right.value, unit || right.unit);
        case '/':
            // If you for example divide 100px by 25px, the end number should be 4 without a unit
            // However if you divide 100px by 4, the result should be 25px
            return new fashion.Number(value / right.value, (unit == right.unit) ? null : (unit || right.unit));
        case '*':
            return new fashion.Number(value * right.value, unit || right.unit);
        case '%':
            return new fashion.Number(value % right.value, unit || right.unit);
        case '**':
            return new fashion.Number(Math.pow(value, right.value), unit || right.unit);
        default:
            return fashion.Type.operate(operation, this, right);
    }
};

fashion.Number.prototype.tryNormalize = function(other) {
    var value = other.value,
        unit = other.unit,
        type = other.type;
        
    if (type == 'number') {
        switch (this.unit) {
            case 'mm':
                switch (unit) {
                    case 'in':
                        return new fashion.Number(value * 25.4, 'mm');
                    case 'cm':
                        return new fashion.Number(value * 2.54, 'mm');
                }            
            case 'cm':
                switch (unit) {
                    case 'in':
                        return new fashion.Number(value * 2.54, 'cm');
                    case 'mm':
                        return new fashion.Number(value / 10, 'cm');
                }            
            case 'in':
                switch (unit) {
                    case 'mm':
                        return new fashion.Number(value / 25.4, 'in');
                    case 'cm':
                        return new fashion.Number(value / 2.54, 'in');
                }            
            case 'ms':
                switch (unit) {
                    case 's':
                        return new fashion.Number(value * 1000, 'ms');
                }            
            case 's':
                switch (unit) {
                    case 'ms':
                        return new fashion.Number(value / 1000, 's');
                }            
            case 'Hz':
                switch (unit) {
                    case 'kHz':
                        return new fashion.Number(value * 1000, 'Hz');
                }            
            case 'kHz':
                switch (unit) {
                    case 'Hz':
                        return new fashion.Number(value / 1000, 'kHz');
                }            
            default:
                return new fashion.Number(value, unit);
        }        
    }
    else if(type == 'string' || type == 'literal') {
        return this.tryParse(value);
    }
    else if (typeof other == 'string') {
        return this.tryParse(other);
    }
    
    return undefined;
};

fashion.Number.prototype.tryParse = function(value) {
    if (value == 'null' || value == 'none') {
        value = 0;
    } else {
        value = parseFloat(value);
    }
    if (!isNaN(value)) {
        return new fashion.Number(value, this.unit);
    }
    return undefined;
}

fashion.Number.prototype.normalize = function(other) {
    var norm = fashion.Number.prototype.tryNormalize(other);
    if(typeof norm === 'undefined') {
        throw 'Could not normalize ' + this + ' with ' + other;
    }
    return norm;
}

fashion.Number.prototype.comparable = function(other) {
    var unit1 = this.unit,
        unit2 = other.unit,
        type = other.type;
    
    if (type !== 'number') {
        return false;
    }
    
    return (
        (unit1 === unit2) ||
        (unit1 === 'mm' && (unit2 === 'in' || unit2 === 'cm')) ||
        (unit1 === 'cm' && (unit2 === 'in' || unit2 === 'mm')) ||
        (unit1 === 'in' && (unit2 === 'mm' || unit2 === 'cm')) ||
        (unit1 === 'ms' && unit2 === 's') ||
        (unit1 === 's' && unit2 === 'ms') ||
        (unit1 === 'Hz' && unit2 === 'kHz') ||
        (unit1 === 'kHz' && unit2 === 'Hz')
    );
};
