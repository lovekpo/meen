fashion.register({
    length: function(args) {
        var list = args[0];
        if (list.type !== 'list') {
            return new fashion.Number(args.length);
        }
        return new fashion.Number(list.items.length);
    },
          
    nth: function(args) {
        var list = args[0],
            index = args[1];

        if (list.type !== 'list') {
            list = new fashion.List([list]);
        }
        
        if (index.value < 1) {
            throw 'List index ' + index + ' must be greater than or equal to 1 for \'nth\'';
        }
        if (index.type != 'number' || index.value.toFixed(0) != index.value){
            throw 'List index ' + index + ' must be an integer for \'nth\'';
        }
        if (index.value > list.items.length) {
            throw 'List index is ' + index + ' but list is only ' + list.items.length + ' item' + (list.items.length === 1 ? '' : 's') + ' long for \'nth\'';
        }
        
        return list.get(index);
    },
    
    first_value_of: function(args) {
        var list = args[0];
        if (list.type !== 'list') {
            list = new fashion.List([list]);
        }
        args.push(new fashion.Number(1));
        return this.nth(args);
    },
    
    last_value_of: function(args) {
        var list = args;
        if (list.type !== 'list') {
            list = new fashion.List(list);
        }
        args.push(new fashion.Number(list.items.length));
        return this.nth(args);
    },
    
    compact: function(args) {
        var list = args,
            items, sep = ', ';
        
        if (list.type !== 'list') {
            list = new fashion.List(list);
        }
        items = list.items;
        if (items.length == 1 && items[0].type == 'list') {
            list = args.items[0];
            items = list.items;
            sep = list.separator;
        }
        
        list = new fashion.List(null, sep);
        for(var i = 0; i < items.length; i++) {
            var item = items[i];
            if (this.unbox(item)) {
                list.add(item);
            }
        }
        return list;
    },
    
    _compass_list_size: function(args) {
        var list = args;
        
        if (list.type !== 'list') {
            list = new fashion.List(list);
        }
        return new fashion.Number(list.items.length);
    },
    
    join: function(args) {
        var list1 = args[0],
            list2 = args[1],
            separator = args[2];
        
        if (list1.type !== 'list') list1 = new fashion.List([list1]);            
        if (list2.type !== 'list') list2 = new fashion.List([list2]);
        
        if (!separator) {
            separator = list1.separator;
        }
        else if (separator.type === 'literal') {
            switch (separator.value) {
                case 'comma':
                    separator = ', ';
                break;
                case 'space':
                    separator = ' ';
                break;
                
                case 'auto':
                    separator = list1.separator;
                break;
                default:
                    throw 'Separator name must be space, comma, or auto for \'join\'';
            }
        }
        else if (separator.type === 'string') {
            separator = separator.value;
        }
        
        return new fashion.List(list1.items.concat(list2.items), separator);
    },
    
    append: function(args) {
        return this.join(args);
    },
    
    box: function(args) {
        var list = args[0],
            index = args[1];

        if (!(list instanceof fashion.List)) {
            list = new fashion.List([list]);
        }
       
        list = list.items.slice();
        if (index >= list.length) {
            switch (list.length) {
                case 1:
                    list[1] = list[2] = list[3] = list[0];
                break;
                case 2:
                    list[2] = list[0];
                    list[3] = list[1];
                break;
                case 3:
                    list[3] = list[1];
                break;
            }
        }
        return list[index-1];
    }
});