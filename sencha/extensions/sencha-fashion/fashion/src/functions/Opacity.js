fashion.register({
    alpha: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'alpha\'';
        }
        return fashion.Color.component(color, 'alpha');
    },
    
    opacity: function(args) {
        var color = args[0];
        return this.alpha(color);   
    },
    
    opacify: function(args) {
        var color = args[0],
            amount = args[1];
                
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'opacify\'';
        }
        if (amount.type !== 'number') {
            throw amount + ' is not a number for \'opacify\'';
        }
        if (amount.unit == '%') {
            if (amount.value !== fashion.Color.constrainPercentage(amount.value)) {
                throw 'Amount ' + amount + ' must be between 0% and 100% for \'opacify\'';
            }
            amount = new fashion.Number(amount.value / 100);
        } else if (amount.value !== fashion.Color.constrainAlpha(amount.value)) {
            throw 'Amount ' + amount + ' must be between 0 and 1 for \'opacify\'';
        }
        
        
        var rgba = color.rgba;
        rgba.a = Math.min(((rgba.a * 100) + (amount.value * 100)) / 100, 1);
        return rgba;
    },
    
    transparentize: function(args) {
        var color = args[0],
            amount = args[1];
                
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'transparentize\'';
        }
        if (amount.type !== 'number') {
            throw amount + ' is not a number for \'transparentize\'';
        }
        if (amount.unit == '%') {
            if (amount.value !== fashion.Color.constrainPercentage(amount.value)) {
                throw 'Amount ' + amount + ' must be between 0% and 100% for \'transparentize\'';
            }
            amount = new fashion.Number(amount.value / 100);
        } else if (amount.value !== fashion.Color.constrainAlpha(amount.value)) {
            throw 'Amount ' + amount + ' must be between 0 and 1 for \'transparentize\'';
        }
        
        
        var rgba = color.rgba;
        rgba.a = Math.max(((rgba.a * 100) - (amount.value * 100)) / 100, 0);
        return rgba;
    },
    
    fade_in: function(args) {
        return this.opacify(args);
    },
        
    fade_out: function(args) {
        return this.transparentize(args);
    }
});