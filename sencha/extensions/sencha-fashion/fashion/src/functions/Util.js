/*
 * Copyright (c) 2012-2014. Sencha Inc.
 */

fashion.register(function(){
    return {
        map_create: function(){
            return {};
        },

        map_put: function(args) {
            var map = args[0],
                key = this.unbox(args[1]),
                value = args[2];
            map[key] = value;
        },

        map_get: function(args) {
            var map = args[0],
                key = this.unbox(args[1]);
            return map[key] || new fashion.String('');
        },

        parsebox: function(args) {
            var list = args[0],
                num = this.unbox(args[1]),
                ret, size, actual = [], i;

            if(list.type === 'list') {
                list = list.items;
            }

            if(!this.isArray(list)) {
                list = [list];
            }

            size = list.length;

            for(i = 0; i < size; i++) {
                actual.push(list[i]);
            }

            if(num >= size) {
                if(size === 1) {
                    actual.push(list[0]);
                    actual.push(list[0]);
                    actual.push(list[0]);
                } else if(size === 2) {
                    actual.push(list[0]);
                    actual.push(list[1]);
                } else if(size === 3) {
                    actual.push(list[1]);
                }
            }

            ret = actual[num-1];
            return ret;
        },

        is_null: function(args) {
            var value = args[0];

            switch(value.type) {
                case 'bool':
                case 'rgba':
                case 'hsla':
                    return false;
                case 'string':
                case 'literal':
                    value = value.value;
                    return value == 'null' || value == 'none';
                default:
                    if(value.type) {
                        value = value.value;
                    }
                    return value == 'null' || value == 'none' || value == null || typeof value === 'undefined';
            }

            return false;
        },

        file_join: function(args) {
            var value1 = this.unbox(args[0]),
                value2 = this.unbox(args[1]),
                joined;

            joined = value1 ? value1 + '/' + value2 : value2;
            return new fashion.String(joined);
        },

        theme_image_exists: function(args) {
            var directory = args[0].value,
                path = args[1].value,
                fullPath = fashion.Env.join(directory, path);

            if(fashion.Env.isBrowser) {
                return true;
            }
            return fashion.Env.exists(fullPath);
        }
    };
}());