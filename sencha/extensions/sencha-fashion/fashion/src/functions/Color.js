fashion.register({
    adjust_color: function(args) {
        var color = args[0],
            argMap = {},
            names = [
                'red',
                'green',
                'blue',
                'hue',
                'saturation',
                'lightness',
                'alpha'
            ],
            red, blue, green, hue, saturation, lightness, alpha, arg, a, name,
            adjusted = color,
            named = false;

        args = args.slice(1);

        for(a = 0; a < args.length; a++) {
            arg = args[a];
            if(arg.parameterName) {
                named = true;
                argMap[arg.parameterName] = arg;
            }
        }

        for(a = 0; a < names.length; a++) {
            name = names[a];
            arg = named ? argMap['$' + name] : args[a];
            if(arg && arg.value) {

                if(name == 'red' || name == 'blue' || name == 'green' || name == 'alpha') {
                    adjusted = adjusted.rgba;
                    adjusted[fashion.Color.comps[name]] += arg.value;
                } else {
                    adjusted = fashion.Color.adjust(adjusted, name, arg);
                }
            }
        }

        return adjusted;
    },

    scale_color: function() {},
    change_color: function() {},
    
    ie_hex_str: function(args) {
        // def ie_hex_str(color)
        //   assert_type color, :Color
        //   alpha = (color.alpha * 255).round
        //   alphastr = alpha.to_s(16).rjust(2, '0')
        //   Sass::Script::String.new("##{alphastr}#{color.send(:hex_str)[1..-1]}".upcase)
        // end
        
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'ie-hex-str\'';
        }
        throw 'Have to implement ie-hex-str';
    }
});