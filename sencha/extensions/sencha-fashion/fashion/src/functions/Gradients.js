fashion.register({
    linear_gradient: function(args) {
        var position, stops;
        if (args[0].type != 'colorstop') {
            position = args[0];
            args = args.slice(1);
        }
//        stops = this.color_stops.call(this, args);
        
        //if (
        //    (position.type === 'list' && (position.get(1).type === 'rgba' || position.get(1).type === 'hsla')) || 
        //    position.type === 'hsla' || 
        //    position.type === 'rgba'
        //) {
        //    stops = this.color_stops.call(this, args);
        //    position = null;
        //}
        //else if (position.type == 'list' && position.get(1).type == 'colorstop') {
        //    stops = position;
        //    position = null;
        //}
        //else if (stops.type === 'hsla' || stops.type === 'rgba') {
        //    stops = this.color_stops.call(this, new fashion.List([stops]));
        //}
        //else {
        //    stops = this.color_stops.call(this, stops);
        //}

        return new fashion.LinearGradient(position, args);
    },
    
    radial_gradient: function(args) {
        var position = args[0] || {},
            shape = args[1] || {},
            stops = args[2];

        if (
            (position.type === 'list' && (position.get(1).type === 'rgba' || position.get(1).type === 'hsla')) || 
            position.type === 'hsla' || 
            position.type === 'rgba'
        ) {
            stops = this.color_stops.call(this, args);
            position = null;
        }
        else if (position.type == 'list' && position.get(1).type == 'colorstop') {
            stops = position;
            position = null;
        }
        else if (
            (shape.type === 'list' && (shape.get(1).type === 'rgba' || shape.get(1).type === 'hsla')) || 
            shape.type === 'hsla' || 
            shape.type === 'rgba'
        ) {
            stops = this.color_stops.call(this, args);
            shape = null;            
        }
        else if (shape.type == 'list' && shape.get(1).type == 'colorstop') {
            stops = shape;
            shape = null;
        }
        else if (stops.type === 'hsla' || stops.type === 'rgba') {
            stops = this.color_stops.call(this, new fashion.List([stops]));
        }
        else {
            stops = this.color_stops.call(this, stops);
        }
        
        return new fashion.RadialGradient(position, shape, stops);        
    },
    
    color_stops: function(args) {
        var mapped = this.handleArgs(args, [['stops']]),
            stops = mapped.stops.items,
            ln = stops.length,
            list = new fashion.List(null, ', '),
            i, arg;
        
        for (i = 0; i < ln; i++) {
            arg = stops[i];
            if (arg.type === 'list') {
                list.add(new fashion.ColorStop(arg.get(1), arg.get(2)));
            }
            else if (arg.type === 'rgba' || arg.type === 'hsla') {
                list.add(new fashion.ColorStop(arg));
            }
        }
        return list;
    }
});