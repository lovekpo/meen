var fashion = fashion || {};
fashion.Visitor = fashion.Visitor || (function(){

    var isArray = fashion.isArray;

    return {

        visitEach: function(node, handlers){
            this.visit(node.variable, handlers);
            this.visit(node.list, handlers);
            this.visit(node.statements, handlers);
        },

        visitFor: function(node, handlers){
            this.visit(node.variable, handlers);
            this.visit(node.start, handlers);
            this.visit(node.end, handlers);
            this.visit(node.statements, handlers);
        },

        visitFunction: function(node, handlers){
            this.visit(node.func, handlers);
            this.visit(node.statements, handlers);
        },

        visitRuleset: function(node, handlers){
            this.visit(node.selectors, handlers);
            this.visit(node.statements, handlers);
        },

        visitMixin: function(node, handlers){
            this.visit(node.name, handlers);
            this.visit(node.statements, handlers);
        },

        visitInclude: function(node, handlers){
            this.visit(node.include, handlers);
        },

        visitDeclaration: function(node, handlers){
            this.visit(node.property, handlers);
            this.visit(node.value, handlers);
        },

        visitVariableAssignment: function(node, handlers){
            this.visit(node.value, handlers);
        },

        visitIf: function(node, handlers){
            this.visit(node.condition, handlers);
            this.visit(node.statements, handlers);
        },

        visitElse: function(node, handlers){
            this.visit(node.condition, handlers);
            this.visit(node.statements, handlers);
        },

        visitReturn: function(node, handlers){
            this.visit(node.expr, handlers);
        },

        visitBinaryExpression: function(node, handlers){
            this.visit(node.left, handlers);
            this.visit(node.right, handlers);
        },

        visitUnaryExpression: function(node, handlers){
            this.visit(node.expr, handlers);
        },

        visitVariable: function(node, handlers){
            // no child nodes to descend
        },

        visitConstant: function(node, handlers){
            // no child nodes to descend
        },

        visitFunctionCall: function(node, handlers){
            this.visit(node.args, handlers);
        },

        visitExtend: function(node, handlers){
            // no child nodes to descend
        },

        visitList: function(node, handlers){
            this.visit(node.items, handlers);
        },

        visitWarn: function(node, handlers){
            // no child nodes to descend
        },

        visit: function(tree, handlers) {
            var item, i, type, handler, visitor, descend;
            if(!isArray(tree)) {
                tree = [tree];
            }
            for(i = 0; i < tree.length; i++) {
                item = tree[i];
                if(item) {
                    type = item.type || 'Default';
                    visitor = this['visit' + type];
                    handler = handlers[type];
                    descend = true;
                    if(handler) {
                        if(handler.call(handlers, item) === false) {
                            descend = false;
                        }
                    }
                    if(descend && visitor) {
                        visitor.call(this, item, handlers);
                    }
                }
            }
        }
    };

})();