fashion.register({
    percentage: function(args) {
        var value = args[0];
        if (value.type != 'number' || value.unit) {
            throw value + ' is not a unitless number for \'percentage\'';
        }
        return new fashion.Number(value.value * 100, '%');
    },
    
    round: function(args) {
        var value = args[0];
        if (value.type !== 'number') {
            throw value + ' is not a number for \'round\'';
        }
        return new fashion.Number(Math.round(value.value), value.unit);
    },

    ceil: function(args) {
        var value = args[0];
        if (value.type !== 'number') {
            throw value + ' is not a number for \'ceil\'';
        }
        return new fashion.Number(Math.ceil(value.value), value.unit);
    },
    
    floor: function(args) {
        var value = args[0];
        if (value.type !== 'number') {
            throw value + ' is not a number for \'floor\'';
        }
        return new fashion.Number(Math.floor(value.value), value.unit);
    },
        
    abs: function(args) {
        var value = args[0];
        if (value.type !== 'number') {
            throw value + ' is not a number for \'abs\'';
        }
        return new fashion.Number(Math.abs(value.value), value.unit);
    },
    
    min: function(args) {
        var a = args[0],
            b = args[1];
        return fashion.Type.operate('<', a, b) ? a.clone() : b.clone();
    },
    
    max: function(args) {
        var a = args[0],
            b = args[1],
            items, len, i, max, item, gt = false;;

        if(a.type === 'list') {
            items = a.items;
            len = items.length;
            item = items[0];
            max = item;
            for(i = 1; i < len; i++) {
                item = items[i];
                if(item.value > max.value) {
                    max = item;
                }
            }
            return max.clone();
        }

        if(a && !b) {
            return a.clone();
        }

        if(b && !a) {
            return b.clone();
        }

        if('operate' in a) {
            gt = a.operate('>', b);
        } else {
            gt = fashion.Type.operate('>', a, b);
        }
        return gt ? a.clone() : b.clone();
    }
});