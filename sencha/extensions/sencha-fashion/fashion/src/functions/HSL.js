fashion.register({
    hsla: function(args) {
        var mapped = this.handleArgs(args, ['hue', 'saturation', 'lightness', 'alpha']),
            h = mapped.hue,
            s = mapped.saturation,
            l = mapped.lightness,
            a = mapped.alpha;

        if (args.length != 4) throw 'Wrong number of arguments (' + args.length + ' for 4) for \'hsla\'';
                    
        if (h.type != 'number') throw h + ' is not a number for \'hsla\'';
        if (s.type != 'number') throw s + ' is not a number for \'hsla\'';
        if (l.type != 'number') throw l + ' is not a number for \'hsla\'';
        if (a.type != 'number') throw a + ' is not a number for \'hsla\'';
        
        if (s.value !== fashion.Color.constrainPercentage(s.value)) throw 'Saturation ' + s + ' must be between 0% and 100% for \'hsla\'';
        if (l.value !== fashion.Color.constrainPercentage(l.value)) throw 'Lightness ' + l + ' must be between 0% and 100% for \'hsla\'';
        if (a.value !== fashion.Color.constrainAlpha(a.value)) throw 'Alpha channel ' + a + ' must be between 0 and 1 for \'hsla\'';
           
        return new fashion.Color.HSLA(h.value, s.value, l.value, a.value);
    },

    hsl: function(args) {
        if (args.length != 3) {
            throw 'Wrong number of arguments (' + args.length + ' for 3) for \'hsl\'';
        }
        args.push({alpha: new fashion.Number(1)});
        return this.hsla(args);
    },
    
    hue: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'hue\'';
        }
        return fashion.Color.component(color, 'hue');
    },
    
    saturation: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'saturation\'';
        }
        return fashion.Color.component(color, 'saturation');
    },
    
    lightness: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'lightness\'';
        }
        return fashion.Color.component(color, 'lightness');
    },
    
    adjust_hue: function(args) {
        var color = args[0],
            degrees = args[1];
        
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'adjust-hue\'';
        }
        if (degrees.type !== 'number') {
            throw degrees + ' is not a number for \'adjust-hue\'';
        }
        if (degrees.value < -360 || degrees.value > 360) {
            throw 'Amount ' + degrees + ' must be between 0deg and 360deg for \'adjust-hue\'';
        }
        return fashion.Color.adjust(color, 'hue', degrees);            
    },
        
    lighten: function(args) {
        var color = args[0],
            amount = args[1];
        
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'lighten\'';
        }
        if (amount.type !== 'number') {
            throw amount + ' is not a number for \'lighten\'';
        }
        if (amount.value !== fashion.Color.constrainPercentage(amount.value)) {
            throw 'Amount ' + amount + ' must be between 0% and 100% for \'lighten\'';
        }

        return fashion.Color.adjust(color, 'lightness', amount);
    },
    
    darken: function(args) {
        var color = args[0],
            amount = args[1];
        
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'darken\'';
        }
        if (amount.type !== 'number') {
            throw amount + ' is not a number for \'darken\'';
        }

        if (amount.value !== fashion.Color.constrainPercentage(amount.value)) {
            throw 'Amount ' + amount + ' must be between 0% and 100% for \'darken\'';
        }
        
        amount.value *= -1;
        return fashion.Color.adjust(color, 'lightness', amount);
    },
    
    saturate: function(args) {
        var color = args[0],
            amount = args[1];
        
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'saturate\'';
        }
        if (amount.type !== 'number') {
            throw amount + ' is not a number for \'saturate\'';
        }
        if (amount.value !== fashion.Color.constrainPercentage(amount.value)) {
            throw 'Amount ' + amount + ' must be between 0% and 100% for \'saturate\'';
        }
        
        return fashion.Color.adjust(color, 'saturation', amount);
    },
    
    desaturate: function(args) {
        var color = args[0],
            amount = args[1];
        
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'desaturate\'';
        }
        if (amount.type !== 'number') {
            throw amount + ' is not a number for \'desaturate\'';
        }
        if (amount.value !== fashion.Color.constrainPercentage(amount.value)) {
            throw 'Amount ' + amount + ' must be between 0% and 100% for \'desaturate\'';
        }
        
        amount.value *= -1;
        return fashion.Color.adjust(color, 'saturation', amount);
    },
    
    grayscale: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'grayscale\'';
        }
        return this.desaturate([color, new fashion.Number(100, '%')]);
    },
    
    complement: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'complement\'';
        }
        return this.adjust_hue([color, new fashion.Number(180, 'deg')]);
    },
    
    invert: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'invert\'';
        }
        color = color.rgba;
        
        return new fashion.Color.RGBA(
            255 - color.r,
            255 - color.g,
            255 - color.b,
            color.a
        );
    }
});