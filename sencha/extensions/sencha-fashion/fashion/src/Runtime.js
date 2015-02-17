fashion.Runtime = (function() {
    /**
     * The current css for this run. The printRuleset method is the only method
     * adding to the css. The css is also being reset at the beginning
     * of each run.
     * @property output
     * @type fashion.Output
     * @private
     */
    var css = new fashion.CSS();
    
    /**
     * the global scope of execution
     * @type {{}}
     */
    var _globalScope = {};

    /**
     * the currently loaded scope of execution
     * @type {{}}
     */
    var _currentScope = _globalScope;
    
    /**
     * An array containing all the rulesets
     * The first item in this array is the current root ruleset. The last item
     * is the ruleset we are currently in. When a ruleset has finished executing
     * it is popped of the end of this array.
     * @property rulesets
     * @type Array
     * @private
     */    
    var rulesets = [];
    
    /**
     * An object containing all the user defined mixins in the current run.
     * Each key represents the name of a mixin. Mixins are callable from the outside
     * after each run. Mixins create a new scope when called.
     * @property mixins
     * @type Object
     * @private
     */
    var mixins = {};

    /**
     * An object containing all the user defined functions in the current run.
     * Each key represents the name of a function. Functions create a new scope when called.
     * @property functions
     * @type Object
     * @private
     */
    var functions = {};
    
    /**
     * An array containing all the extenders
     * @property rulesets
     * @type Array
     * @private
     */    
    var extenders = [];

    /**
     * The current metadata that the user wants the runtime to update
     * @property meta
     * @type Object
     * @private
     */    
    var meta = null;
        
    /**
     * An object containing all the registered helper functions. New functions can be
     * registered using the "register" method on fashion.Runtime.
     * @property registered
     * @type Object
     * @private
     */
    var registered = {
        unbox: unbox,
        isArray: fashion.isArray,
        handleArgs: function(args, keys) {
            var scope = {}, 
                index = 0, 
                key;

            for(var a = 0; a < args.length; a++) {
                var arg = args[a];
                // Named arguments
                if (arg === true || arg === false) {
                    scope[keys[index]] = arg;
                    index++;
                }
                else if (arg.type === undefined) {
                    for (key in arg) {
                        scope[key.replace(/^\$/, '')] = arg[key];
                    }
                }
                // Required arguments
                else {
                    key = keys[index];
                    if (key instanceof Array) {
                        key = key[0];
                        scope[key] = scope[key] || new fashion.List();
                        scope[key].add(arg);
                    }
                    else {
                        scope[key] = arg;
                        index++;
                    }
                }
            }
            return scope;
        }
    };
    
    /**
     * Instantiates a fashion.String. This is called by Fashion JS generated code.
     * @sass $a: 'string';
     * @param {String} value The value for this string
     * @return {fashion.String} The newly created fashion.String instance
     * @protected
     */
    function string(value) {
        return new fashion.String(value);
    };

    /**
     * Instantiates a fashion.Literal. This is called by Fashion JS generated code.
     * @sass $a: literal;
     * @param {String} value The value for this literal
     * @return {fashion.Literal} The newly created fashion.Literal instance
     * @protected
     */        
    function lit(value) {
        return new fashion.Literal(value);
    };

    /**
     * Instantiates a fashion.List. This is called by Fashion JS generated code.
     * @sass $a: item1 item2;
     * @param {Array} items An array containing the items in the list
     * @return {fashion.List} The newly created fashion.List instance
     * @protected
     */    
    function list(items, separator) {
        return new fashion.List(items, separator);
    };

    /**
     * Instantiates a fashion.Number. This is called by Fashion JS generated code.
     * @sass $a: 1;
     * @sass $b: 30px;
     * @param {Number} value The numeric value of this Number
     * @param {String} unit The unit for this Number
     * @return {fashion.Number} The newly created fashion.Number instance
     * @protected
     */                  
    function number(value, unit) {
        return new fashion.Number(value, unit);
    };
    
    /**
     * Instantiates a fashion.Bool. This is called by Fashion JS generated code.
     * @sass $a: true;
     * @sass $b: false;
     * @param {Number} value The value for this Bool (false or true).
     * @return {fashion.Bool} The newly created fashion.Bool instance
     * @protected
     */
    function bool(value) {
        return new fashion.Bool(value);
    };
    
    /**
     * Instantiates a fashion.Color.RGBA based on an HTML4 predefined color name.
     * This is called by Fashion JS generated code.
     * @sass $a: orange;
     * @param {String} name The name of the color
     * @return {fashion.Color.RGBA} The newly created fashion.Color.RGBA instance
     * @protected
     */    
    function color(name) {
        var rgb = fashion.Color.map[name];
        return new fashion.Color.RGBA(rgb[0], rgb[1], rgb[2], rgb[3]);
    };

    /**
     * Instantiates a fashion.Color.RGBA based on a hex value.
     * @sass $a: #ff0088;
     * @param {String} value The hexadecimal color value.
     * @return {fashion.Color.RGBA} The newly created fashion.Color.RGBA instance
     * @protected
     */    
    function hex(value) {
        return fashion.Color.RGBA.fromHex(value);
    };
    

    /**
     * This function is called by the generated Fashion JS code.
     * It takes any value and returns a string with quotes around it.
     * @param {fashion.Type} value The value you want to quote
     * @protected
     */    
    function quote(value) {
        if (value.type == 'string') {
            return value;
        }
        return new fashion.String(value.toString());
    };
    
    /**
     * This function is called by the generated Fashion JS code.
     * It takes any value and returns a literal without quotes around it.
     * @param {fashion.Type} value The value you want to unquote
     * @protected
     */    
    function unquote(value) {
        if (value.type == 'literal') {
            return value;
        }
        else if (value.type == 'string') {
            return new fashion.Literal(value.value);
        }
        return new fashion.Literal(value.toString());
    };
    
    /**
     * This function is called by the generated Fashion JS code. It basically
     * opens and prints a new ruleset. Calling this function causes a new scope
     * to be created. Only root level rulesets get printed. The function passed
     * to the ruleset must contain a set of instructions. Common instructions are
     * "declare", "set" and "include".
     * @param {Array} selectors The selectors for this set of rules.
     * @param {Function} fn A function containing runtime instructions.
     * @protected
     */
    function ruleset(selectors, fn) {
        var current = _runtime.getCurrentRuleset(),
            ruleset = _runtime.openRuleset(selectors);
        
        // Execute the block function
        fn();

        // If there is no parent, meaning we are a root ruleset, then print ourselves
        // If there is a parent, we are just going to attach ourselves to that parent
        // ruleset as a nested ruleset. This way we can get nested ruleset to be printed
        // outside of the root ruleset
        if (!current) {
            _runtime.printRuleset(ruleset);         
        }
        else {
            current.nested.push(ruleset);
        }

        // Now that we are done with this ruleset, close it. This causes the scope
        // created for this ruleset to be closed.
        _runtime.closeRuleset();
    };
    
    /**
     * This function is called by the generated Fashion JS code. It declares
     * a new rule in a ruleset. This is one of the very few methods that directly
     * impact the generated CSS.
     * @param {String} property The name of the property
     * @param {Mixed} value The value for this rule. This can be any of the fashion
     * types. The value is converted to a string (it calls the toString method on it).
     * @protected
     */    
    function declare(property, value, important) {
        _runtime.getCurrentRuleset().declarations.push({
            property: property,
            value: value,
            important: important
        });
    };

    /**
     * This function is called by the generated Fashion JS code.  It iterates a
     * list variable and invokes a loop body
     */
    function eachLoop(list, body) {
        for(var i = 0; i < list.items.length; i++) {
            body(list.items[i]);
        }
    };

    /**
     * This function is called by the generated Fashion JS code.  It iterates through
     * a start / stop set of values, calling the supplied loop body with the appropriate
     * variable
     */
    function forLoop(start, stop, inclusive, body) {
        var startVar = unbox(start),
            stopVar = unbox(stop),
            itr;

        if(inclusive) {
            stopVar += 1;
        }

        for(itr = startVar; itr < stopVar; itr++) {
            body(new fashion.Number(itr));
        }
    };

    /**
     * This function is called by the generated Fashion JS code. It sets a new value
     * to a variable in the current scope. It also supports default values ($a: 1px !default).
     * @param {String/Object} name/object The name of the variable or an object containing key/values
     * @param {Mixed} value The new value for the variable. If you passed an object as the first argument
     * then this will be the isDefault flag.
     * @param {Boolean} isDefault Whether this is a default value. Defaults to false.
     * @protected
     */
    function set(key, value, isDefault) {
        var currentScope = _runtime.getCurrentScope(),
            object, current, assign = false;;
        
        if (typeof key === 'string') {
//            if (meta && meta.variables && meta.variables[key]) {
//                object = meta.variables[key];
//                if (value !== null) {
//                    if (object.type === undefined) {
//                        if (value === true || value === false) {
//                            object.type = 'boolean';
//                        }
//                        else if (value.type === 'hsla' || value.type === 'rgba') {
//                            object.type = 'color';
//                        }
//                        else {
//                            object.type = value.type;
//                        }
//                    }
//
//                    if (value.unit) {
//                        object.unit = value.unit;
//                    }
//
//                    object[isDefault ? 'default' : 'value'] = (object.type == 'boolean') ? value : value.value;
//                }
//                else {
//                    object[isDefault ? 'default' : 'value'] = null;
//                }
//
//                meta.variables[key] = object;
//            }

            if (!isDefault) {
                assign = true;
            } else {
                current = currentScope[key];
                if(typeof current === 'undefined' || current == null) {
                    assign = true;
                } else if(current.type == 'literal' && current.value === 'null') {
                    assign = true;
                } else if(current.type == 'string' && current.value === 'null') {
                    assign = true;
                }
            }

            if(assign) {
                currentScope[key] = value;
            }
        }
        else {
            isDefault = value;
            object = key;
            for (key in object) {
                set(key, object[key], value);
            }            
        }
    };
    
    /**
     * This function is called by the generated Fashion JS code. It gets a value for a variable
     * in the current scope.
     * @param {String/Object} name The name of the variable
     * @return {Mixed} The value for the requested variable int he current scope.
     * @protected
     */
    function get(name) {
        var value = _currentScope[name],
            result = (!value && value !== false) ? fashion.Null : value;
        return result;
    };
    
    /**
     * This function is called by the generated Fashion JS code. It loops over all the
     * rulesets on the page and adds the current selectors to any rulesets that match
     * the selector we are extending
     * @param {String} name The selector we are extending
     * @protected
     */
    function extend(selector) {
        extenders.push({
            selectors: _runtime.getCurrentRuleset().selectors,
            extend: selector
        });
    };

    /**
     * creates a new chained scope for the provided set of properties
     * @param obj
     */
    var loadScope = fashion.Env.canSetPrototype
        ? function(obj) {
            obj.__proto__ = _currentScope;
            _currentScope = obj;
        }
        : function(obj) {
            _currentScope = _createScope(_currentScope);
            for(var name in obj) {
                _currentScope[name] = obj[name];
            }
        };


    /**
     * This function is called by the generated Fashion JS code. It defines a new mixin in the
     * current run. These mixins will later be called by the include method.
     * @param {String} name The name of the mixin
     * @param {Mixed} value The function that gets executed when the mixin is called
     * @protected
     */
    function mixin(name, fn) {
        mixins[name.replace(/\-/g, '_')] = {
            fn: fn,
            scope: _currentScope
        };
    };

    /**
     * This function is called by the generated Fashion JS code. It calls a mixin that
     * is defined using the mixin method. A new scope will be created for the mixin,
     * and closed as soon as the mixin has finished executing.
     * @param {String} name The name of the mixin
     * @param {Array} args An array containing the arguments that are being passed to
     * the mixin. This can be a mixture of Objects and native fashion types (color, bool, number, etc).
     * An object is treated as a named argument, while a native fashion type is considered
     * to be a required argument.
     * @protected
     */
    function include(name, args) {
        var mix = mixins[name.replace(/\-/g, '_')],
            curr = _currentScope;
        _currentScope = mix.scope;
        mix.fn.call(this, args);
        _currentScope = curr;
    };
    
    /**
     * This function is called by the generated Fashion JS code. It defines a new function
     * in the current run. Whenever this function is executed we create a new scope for it.
     * Functions defined by this method are called directly from within Fashion JS by accessing
     * it through the "functions" object (e.g. functions.myFunctionName()).
     * @param {String} name The name of the function
     * @param {Array} fn The user defined function
     * @protected
     */
    function fn(name, origFn) {
        functions[name] = {
            scope: _currentScope,
            fn: origFn
        };
    };

    /**
     * This function is called by the generated Fashion JS code. It performs an operation on
     * two native fashion types. The types themselves take care of normalizing units or doing
     * general type conversion.
     * @param {String} operation The type of operation (e.g '==', '+', '/' etc)
     * @param {fashion.Type} left The left hand of the operation
     * @param {fashion.Type} right The right hand of the operation
     * @return {fashion.Type} A new native fashion type instance which is the result of the operation
     * @protected
     */    
    function operate(operation, left, right) {
        if(!left.type) {
            if(left === false || left === true) {
                left = new fashion.Bool(left);
            } else {

            }
        }
        if(!right.type) {
            if(right === false || right === true) {
                right = new fashion.Bool(right);
            } else {

            }
        }
        return left.operate(operation, right);

//        if(left === true) {
//            if(operation == '==') {
//                return !!unbox(right);
//            }
//            if(operation == '!=') {
//                return !unbox(right);
//            }
//            left = fashion.True;
//        } else if(left === false) {
//            if(operation == '==') {
//                return !unbox(right);
//            }
//            if(operation == '!=') {
//                return !!unbox(right);
//            }
//            left = fashion.False;
//        }
//
//        if(right === true) {
//            if(operation == '==') {
//                return !!unbox(left);
//            }
//            if(operation == '!=') {
//                return !unbox(left);
//            }
//            right = fashion.True;
//        } else if(right === false) {
//            if(operation == '==') {
//                return !unbox(left);
//            }
//            if(operation == '!=') {
//                return !!unbox(left);
//            }
//            right = fashion.False;
//        }
//
//        return left.operate(operation, right);
    };
    
    /**
     * This function is called by the generated Fashion JS code. It returns true if the expression
     * evaluates to false.
     * @param {String} expression The expression we are evaluating
     * @return {Boolean} True if the expression evaluates to false
     * @protected
     */    
    function not(expression) {
        return unbox(expression) == false;
    };

    /**
     * Called by generated JS code.  this function is used to unbox fashionTypes to ensure
     * that js comparisons are happening on the appropriate values
     * @param Object expression the expression
     * @returns {*}
     */
    function unbox(expression) {
        if(expression && expression.type) {
            switch(expression.type) {
                case 'literal':
                    if (expression.value == 'null') {
                        expression = null;
                    } else {
                        expression = expression.value;
                    }
                    break;
                case 'string':
                    if (expression.value == 'none' || expression.value == 'null') {
                        expression = null;
                    } else {
                        expression = expression.value;
                    }
                    break;
                case "bool":
                case "literal":
                case "number":
                    expression = expression.value;
                    break;
                case 'list':
                    expression = expression.items;
                    break;
            }
        }
        return expression;
    };

    var __nameCache = {};

    /**
     * This function is called by the generated Fashion JS code. It executes a registered helper function.
     * @param {String} name The name of the helper function.
     * @return {fashion.Type} The result of the executed helper function. Usually an instance of a fashion Type.
     * @protected
     */    
    function execute(name, args) {
        var orig = name, target;
        if(!__nameCache[orig]) {
            name = reserved[name] ? '__' + name : name;
            if(functions[name]) {
                target = functions[name];
            } else {
                name = name.replace(/\-/g, '_');
                target = registered[name];
            }
            __nameCache[orig] = target;
        } else {
            target = __nameCache[orig];
        }

        var currScope, result;

        if(target.fn) {
            currScope = _currentScope,
            _currentScope = target.scope;
            result = target.fn(args);
            _currentScope = currScope;
            return result;
        } else {
            return target.call(registered, args);
        }
    };

    var named = function(arg, name) {
        arg.parameterName = name;
        return arg;
    }

    var reserved = {
        'if': true,
        'else': true
    };
         
    /**
     * A set of helper methods for dealing with scopes and rulesets. These methods are called
     * by the internal Fashion JS methods by not directly by the generated Fashion JS code.
     * @property _runtime
     * @type Object
     */
    var _scopeProto = function(){},
        _createScope = fashion.chain,
        _runtime = {
        /**
         * Opens a new scope. All the values from the current scope are copied into the new
         * scope. This way we create a scope chain where each scope can override variables
         * without affecting the outer scopes.
         * @return {Object} The newly created scope
         * @private
         */
        openScope: function() {
            var scope = _createScope(_currentScope);
            scopes.push(scope);
            return scope;            
        },

        /**
         * Closes the current scope.
         * @return {Object} The closed scope
         * @private
         */        
        closeScope: function() {
            return scopes.pop();
        },

        /**
         * Gets the current scope.
         * @return {Object} The current scope
         * @private
         */        
        getCurrentScope: function() {
            return _currentScope;
        },

        setCurrentScope: function(scope) {
            _currentScope = scope;
        },

        /**
         * Opens a new ruleset.
         * @param {Array} selectors The selectors for this set of rules.
         * @return {Object} The newly created ruleset
         * @private
         */        
        openRuleset: function(selectors) {
            var iln = selectors.length,
                currentRuleset = _runtime.getCurrentRuleset(),
                currentSelectors = currentRuleset && currentRuleset.selectors || null,
                mergedSelectors = selectors,
                jln = currentSelectors && currentSelectors.length,
                i, j, ruleset, index;

            // If we are already in a ruleset then we have to merge the selectors
            if (jln) {
                mergedSelectors = [];
                for (i = 0; i < iln; i++) {
                    index = selectors[i].indexOf('&');
                    for (j = 0; j < jln; j++) {
                        if (index === 0) {
                            mergedSelectors.push(currentSelectors[j] + selectors[i].replace('&', ''));
                        }
                        else if (index !== -1) {
                            mergedSelectors.push(selectors[i].substr(0, index) + currentSelectors[j] + selectors[i].substr(index+1));
                        }
                        else {
                            mergedSelectors.push(currentSelectors[j] + ' ' + selectors[i]);
                        }
                    }
                }
            }
    
            ruleset = {
                declarations: [],
                selectors: mergedSelectors,
                nested: []
            };
            
            rulesets.push(ruleset);
            return ruleset;
        },
        
        /**
         * Closes the current ruleset.
         * @return {Object} The closed ruleset
         * @private
         */
        closeRuleset: function() {
            return rulesets.pop();
        },
        
        /**
         * Gets the current ruleset
         * @return {Object} The current ruleset
         * @private
         */        
        getCurrentRuleset: function() {
            return rulesets[rulesets.length-1];
        },

        /**
         * Gets the full rulesets chain
         * @return {Object} The ruleset chain
         * @private
         */        
        getCurrentRulesets: function() {
            return rulesets;
        },
        
        /**
         * Adds a ruleset to the css. If the ruleset has no declarations
         * then we won't print anything. We also loop over each nested ruleset
         * and print them afterwards.
         * @private
         */        
        printRuleset: function(ruleset) {
            if (ruleset.declarations.length) {
                css.addRuleset(ruleset);               
            }
            for(var r = 0; r < ruleset.nested.length; r++) {
                var rule = ruleset.nested[r];
                _runtime.printRuleset(rule);
            }
        },
        
        /**
         * Helper function to copy an object.
         * @param {Object} object The object you want to copy
         * @private
         * @return {Object} The copied object
         */        
        copy: function(object) {
            var copyObject = {}, key;
            for (key in object) {
                copyObject[key] = object[key];
            }
            return copyObject;
        }
    };
    
    return {
        /**
         * This function executes Fashion JS code. After the run we can call mixins
         * using the mixin method. We begin by resetting the current run, clearing
         * all the current css, the current scopes, mixins, functions and rulesets.
         * @return {String} The CSS generated by this run.
         * @public
         */
        run: function(code, metadata) {
            this.load(code);
            this.compile(code);
            return this.execute(metadata);
        },

        compile: function(code) {
            var useFnCtor = true,
                theCode, theFn;

//            code = '"use strict";\n' + code;
            if(useFnCtor) {
                this.code = code;
                theFn = new Function([
                    'string',
                    'lit',
                    'list',
                    'number',
                    'bool',
                    'color',
                    'hex',
                    'quote',
                    'unquote',
                    'ruleset',
                    'declare',
                    'eachLoop',
                    'forLoop',
                    'set',
                    'get',
                    'extend',
                    'loadScope',
                    'mixin',
                    'include',
                    'fn',
                    'operate',
                    'not',
                    'unbox',
                    'execute',
                    'fashion',
                    'named'
                ], code);
            } else {
                theCode = "theFn = function(){\n" + code + "\n};";
                this.code = theCode;
                eval(theCode);
            }

            this.fn = function(metadata){
                fashion.Runtime.reset();
                meta = metadata;

                if(fashion.Runtime.overrides) {
                    _globalScope = _createScope(fashion.Runtime.overrides);
                    _currentScope = _globalScope;
                }

                if(useFnCtor) {
                    theFn(
                        string,
                        lit,
                        list,
                        number,
                        bool,
                        color,
                        hex,
                        quote,
                        unquote,
                        ruleset,
                        declare,
                        eachLoop,
                        forLoop,
                        set,
                        get,
                        extend,
                        loadScope,
                        mixin,
                        include,
                        fn,
                        operate,
                        not,
                        unbox,
                        execute,
                        fashion,
                        named
                    );
                } else {
                    theFn.call(this);
                }
                for(var e = 0; e < extenders.length; e++) {
                    var extender = extenders[e];
                    css.extend(extender);
                }
                return css;
            };
            return this.fn;
        },

        /**
         * This function executes Fashion JS code. After the run we can call mixins
         * using the mixin method. We begin by resetting the current run, clearing
         * all the current output, the current scopes, mixins, functions and rulesets.
         * @return {String} The CSS generated by this run.
         * @public
         */
        execute: function(metadata) {
            return this.fn(metadata);
        },
        
        eval: function(expr) {
            var value;
            try {
                value = _globalScope.___tmp___.value;
                delete _globalScope.___tmp___;
            } catch(e) {};
            return value;
        },
        
        /**
         * Loads Fashion JS code into memory. After the load we can call mixins
         * using the mixin method and dynamically set variables.
         * @return {String} The CSS generated by this run.
         * @public
         */
        load: function(code) {
            this.code = code;
            this.overrides = {};
            return this;
        },        
        
        /**
         * Clears the current run. This will clear all set variables and called
         * mixins. It will also clear the current run's css.
         * @public
         */
        reset: function() {
            css.reset();
            rulesets = [];
            extenders = [];
            mixins = {};
            functions = {};
            _globalScope = {};
            _currentScope = _globalScope;
            __nameCache = {};
        },
        
        /**
         * Use this to register new "native" methods to the fashion runtime.
         * @param {Object} methods An object containing methods you want to add to the runtime of fashion.
         * @public
         */
        register: function(methods) {
            var name, method;
            for (name in methods) {
                method = methods[name];
                registered[name] = method;
            }
        },

        /**
         * Useful for determining if a helper function exists.
         * @param {String} name The name of the helper function
         * @return {Boolean} true if the helper function is registered
         * @public
         */
        isRegistered: function(name) {
            name = reserved[name] ? '__' + name : name;
            return !!registered[name];
        },
        
        // These are the methods called by the fashion UI which allow users to dynamically change
        // variables and call mixins
        set: function(variable, value) {
            this.overrides[variable] = value;
        },
        
        get: function(variable) {
            return this.overrides[variable] || _globalScope['$' + variable];
        },
        
        mixin: function(name, args) {},

        getCurrentScope: function() {
            return _currentScope;
        },

        getGlobalScope: function() {
            return _globalScope;
        }
    };
})();