var fashion = fashion || {};
fashion.Transform = fashion.Transform || (function(){

    var isArray = fashion.isArray;

    return {

        transformEach: function(node, handlers){
            node.variable = this.transform(node.variable, handlers);
            node.list = this.transform(node.list, handlers);
            node.statements = this.transform(node.statements, handlers);
        },

        transformFor: function(node, handlers){
            node.variable = this.transform(node.variable, handlers);
            node.start = this.transform(node.start, handlers);
            node.end = this.transform(node.end, handlers);
            node.statements = this.transform(node.statements, handlers);
        },

        transformFunction: function(node, handlers){
            node.func = this.transform(node.func, handlers);
            node.statements = this.transform(node.statements, handlers);
        },

        transformRuleset: function(node, handlers){
            node.selectors = this.transform(node.selectors, handlers);
            node.handlers = this.transform(node.statements, handlers);
        },

        transformMixin: function(node, handlers){
            node.name = this.transform(node.name, handlers);
            node.statements = this.transform(node.statements, handlers);
        },

        transformInclude: function(node, handlers){
            node.include = this.transform(node.include, handlers);
        },

        transformDeclaration: function(node, handlers){
            node.property = this.transform(node.property, handlers);
            node.value = this.transform(node.value, handlers);
        },

        transformVariableAssignment: function(node, handlers){
            node.value = this.transform(node.value, handlers);
        },

        transformIf: function(node, handlers){
            node.condition = this.transform(node.condition, handlers);
            node.statements = this.transform(node.statements, handlers);
        },

        transformElse: function(node, handlers){
            node.condition = this.transform(node.condition, handlers);
            node.statements = this.transform(node.statements, handlers);
        },

        transformReturn: function(node, handlers){
            node.expr = this.transform(node.expr, handlers);
        },

        transformBinaryExpression: function(node, handlers){
            node.left = this.transform(node.left, handlers);
            node.right = this.transform(node.right, handlers);
        },

        transformUnaryExpression: function(node, handlers){
            node.expr = this.transform(node.expr, handlers);
        },

        transformVariable: function(node, handlers){
            // no child nodes to descend
        },

        transformConstant: function(node, handlers){
            // no child nodes to descend
        },

        transformFunctionCall: function(node, handlers){
            node.args = this.transform(node.args, handlers);
        },

        transformExtend: function(node, handlers){
            // no child nodes to descend
        },

        transformList: function(node, handlers){
            node.items = this.transform(node.items, handlers);
        },

        transformWarn: function(node, handlers){
            // no child nodes to descend
        },

        transform: function(tree, handlers) {
            var transformedItems = [],
                wasArray = isArray(tree),
                item, i, type, handler, transformer, transformed;

            if(!isArray(tree)) {
                tree = [tree];
            }

            for(i = 0; i < tree.length; i++) {
                item = tree[i];
                transformed = item;
                if(item) {
                    type = item.type || 'Default';
                    transformer = this['transform' + type];
                    handler = handlers[type];

                    if(handler) {
                        transformed = handler.call(handlers, item);
                    } else if (item.clone) {
                        transformed = item.clone();
                        this.transform(item, handlers);
                    }

                    if(typeof transformed === 'undefined') {
                        continue;
                    }
                }
                if(!isArray(transformed)) {
                    transformed = [transformed]
                }
                transformedItems.push.apply(transformedItems, transformed);
            }
            if(transformedItems.length == 1 && !wasArray) {
                transformedItems = transformedItems[0];
            }
            return transformedItems;
        }
    };
})();