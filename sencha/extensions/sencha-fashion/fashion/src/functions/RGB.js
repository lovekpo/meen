fashion.register({
    rgba: function(args) {
        var mapped, color, a, r, g, b;
        if (args.length == 2) {
            mapped = this.handleArgs(args, ['color', 'alpha']);
            color = mapped.color;
            a = mapped.alpha;
            
            if (color.type !== 'rgba' && color.type !== 'hsla') throw color + ' is not a color for \'rgba\'';
            
            color = color.rgba;
            r = new fashion.Number(color.r);
            g = new fashion.Number(color.g);
            b = new fashion.Number(color.b);
        }
        else {
            if (args.length != 4) throw 'Wrong number of arguments (' + args.length + ' for 4) for \'rgba\'';
            mapped = this.handleArgs(args, ['red', 'green', 'blue', 'alpha']);
            r = mapped.red;
            g = mapped.green;
            b = mapped.blue;
            a = mapped.alpha;
        }
                    
        if (r.type != 'number') throw r + ' is not a number for \'rgba\'';
        if (g.type != 'number') throw g + ' is not a number for \'rgba\'';
        if (b.type != 'number') throw b + ' is not a number for \'rgba\'';
        if (a.type != 'number') throw a + ' is not a number for \'rgba\'';
        
        if (r.unit == '%') {
            if (r.value !== fashion.Color.constrainPercentage(r.value)) throw 'Color value ' + r + ' must be between 0% and 100% inclusive for \'rgba\'';
            r = new fashion.Number(r.value / 100 * 255);
        } else if (r.value !== fashion.Color.constrainChannel(r.value)) throw 'Color value ' + r + ' must be between 0 and 255 inclusive for \'rgba\'';
        if (g.unit == '%') {
            if (g.value !== fashion.Color.constrainPercentage(g.value)) throw 'Color value ' + g + ' must be between 0% and 100% inclusive for \'rgba\'';
            g = new fashion.Number(g.value / 100 * 255);
        } else if (g.value !== fashion.Color.constrainChannel(g.value)) throw 'Color value ' + g + ' must be between 0 and 255 inclusive for \'rgba\'';
        if (b.unit == '%') {
            if (b.value !== fashion.Color.constrainPercentage(b.value)) throw 'Color value ' + b + ' must be between 0% and 100% inclusive for \'rgba\'';
            b = new fashion.Number(b.value / 100 * 255);
        } else if (b.value !== fashion.Color.constrainChannel(b.value)) throw 'Color value ' + b + ' must be between 0 and 255 inclusive for \'rgba\'';
        if (a.unit == '%') {
            if (a.value !== fashion.Color.constrainPercentage(a.value)) throw 'Alpha channel ' + a + ' must be between 0% and 100% inclusive for \'rgba\'';
            a = new fashion.Number(a.value / 100);
        } else if (a.value !== fashion.Color.constrainAlpha(a.value)) throw 'Alpha channel ' + a + ' must be between 0 and 1 inclusive for \'rgba\'';
                               
        return new fashion.Color.RGBA(r.value, g.value, b.value, a.value);
    },
    
    rgb: function(args) {
        if (args.length != 3) {
            throw 'Wrong number of arguments (' + args.length + ' for 3) for \'rgb\'';
        }
        args.push({alpha: new fashion.Number(1)});
        return this.rgba(args);
    },
    
    red: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'red\'';
        }
        return fashion.Color.component(color, 'red');
    },
    
    green:  function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'green\'';
        }
        return fashion.Color.component(color, 'green');
    },
    
    blue:  function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'blue\'';
        }
        return fashion.Color.component(color, 'blue');
    },
    
    mix: function(args) {
        var color1 = args[0],
            color2 = args[1],
            weight = args[2];

        weight = (weight !== undefined) ? weight : new fashion.Number(50, '%');
        
        if (color1.type !== 'hsla' && color1.type !== 'rgba') {
            throw 'arg 1 ' + color1 + ' is not a color for \'mix\'';
        }
        if (color2.type !== 'hsla' && color2.type !== 'rgba') {
            throw 'arg 2 ' + color2 + ' is not a color for \'mix\'';
        }
        if (weight.type !== 'number') {
            throw weight + ' is not a number for \'mix\'';
        }
        if (weight.value !== fashion.Color.constrainPercentage(weight.value)) {
            throw 'Weight ' + weight + ' must be between 0% and 100% for \'mix\'';
        }
        
        color1 = color1.rgba;
        color2 = color2.rgba;
        
        weight = weight.value / 100;
        
        var factor = (weight * 2) - 1,
            alpha = color1.a - color2.a,
            weight1 = (((factor * alpha == -1) ? factor : (factor + alpha)/(1 + factor * alpha)) + 1) / 2,
            weight2 = 1 - weight1;

        return new fashion.Color.RGBA(
            (weight1 * color1.r) + (weight2 * color2.r),
            (weight1 * color1.g) + (weight2 * color2.g),
            (weight1 * color1.b) + (weight2 * color2.b),
            (weight * color1.a) + ((1-weight) * color2.a)
        );
    }
});