fashion.Converter = (function() {
    var nestedDocs = false,
        booleans = ['true', 'false'],
                
        nativeCssMethods = [
            'url',
            'translate3d',
            'rotate',
            'scale',
            '-webkit-gradient',
            'from',
            'skew',
            'color-stop',
            'rect',
            'calc'
        ],
        
        colors = Object.keys(fashion.Color.map),
        
        metadata = {},
        
        isArray = fashion.isArray,
    
        handleStatements = function(statements, output) {
            var statement, s;
            if (!isArray(statements)) {
                statements = [statements];
            }
            for(s = 0; s < statements.length; s++) {
                statement = statements[s];
                handleStatement(statement, output);
            }
        },
    
        handleStatement = function(statement, output) {
            if(statement){
                if(statement instanceof Array) {
                    return handleStatement({
                        type: 'List',
                        items: statement,
                        separator: ', '
                    }, output);
                } else {
                    var fn = handlers[statement.type] || handlers.Default;
                    fn(statement, output);
                    return true;
                }
            }
            return false;
        },
        
        handleInlineExpression = function(expr) {
            var output = new fashion.Output(),
                tree = fashion.Parser.parse('$foobar: ' + expr + ';');
            handleStatement(tree[0].value, output);
            return output.get().trim();
        },
        
        handleInlineExpressions = function(text) {
            var regex = /\#\{([^}]+)\}/i,
                matches = regex.exec(text);
                
            while (matches) {
                text = text.replace(matches[0], '" + unquote(' + handleInlineExpression(matches[1]) + ') + "');
                matches = regex.exec(text);
            }
            
            return text;
        },
        
        parseVariableMetaData = function(statement) {
            var property = {
                    name: statement.name,
                    description: '',
                    category: 'global'
                },
                words, matches;
                
            statement.docs.split('\n').forEach(function(line, index) {
                line = line.trim();
                while (line.charAt(0) == '*') {
                    line = line.slice(1);
                }
                line = line.trim();
                if (line.charAt(0) == '@') {
                    // Dealing with a property
                    words = line.slice(1).trim().split(' ');
                    switch (words.shift()) {
                        case 'var':
                            words.forEach(function(word) {
                                word = word.trim();
                                if (matches = /\{([\w\.]+)\}/i.exec(word)) {
                                    property.type = matches[1];
                                }
                                else if (word.charAt(0) == '$') {
                                    // ignore this for now
                                }
                                else {
                                    property.description += ' ' + word;
                                }
                            });
                            property.description += '\n';
                        break;
                        case 'min':
                            property.min = handleInlineExpression(words.join(' ').trim());
                        break;
                        case 'max':
                            property.max = handleInlineExpression(words.join(' ').trim());
                        break;
                        case 'unit':
                            property.unit = words.join('').trim();
                        break;
                        case 'increment':
                            property.increment = handleInlineExpression(words.join(' ').trim());
                        break;
                        case 'category':
                            property.category = words.join(' ').trim();
                        break;
                        case 'private':
                            property = undefined;
                        break;
                    }
                }
                else if (property) {
                    property.description += line + '\n';
                    // Dealing with a line of description for a property or just the global doc description
                }
            });
            
            if (property) {
                property.description = property.description.trim();
                if (property.description.length) {
                    property.description = property.description[0].toUpperCase() + property.description.slice(1);                
                }
                metadata.variables = metadata.variables || {};
                metadata.variables[property.name] = property;
            }
        },
        
        handleMetaData = function(statement) {
            if (!statement.docs) {
                return;
            }
            
            switch (statement.type) {
                case 'VariableAssignment':
                    if (!nestedDocs && statement['default'] !== undefined) {
                        // We have a global variable!
                        return parseVariableMetaData(statement);
                    };
                break
            }
        },
        
        escapeQuotes = function(text) {
            return text.map(function(t) { return t.replace(/\"/g, '\\\"'); });
        },

        getVariableName = function(node) {
            return node.variable || node.name || node.value || node;
        },

        encodeJsIdentifier = function(node) {
            var name = getVariableName(node);
            if(name) {
                return name.replace(/-/g, "_");
            } else {
                console.warn("Node had undefined name : {}", JSON.stringify(node, false, 4));
            }
            return name;
        },

        loadArgsArray = function(args) {
            if(args && args.items) {
                args = args.items;
            }
            if(!isArray(args)) {
                args = [args];
            }
            return args;
        },

        createDefaultScopeMap = function(args, output) {
            args = loadArgsArray(args);
            var arg, a, varName, suffix,
                defaulted = 0;

            for(a = 0; a < args.length; a++) {
                arg = args[a];
                if(arg) {
                    varName = (arg.variable || arg.name);
                    suffix = (a == args.length - 1) ? '' : ',';
                    if (arg.type !== 'Variable' || arg.variable !== undefined) {
                        output.addln('"' + varName + '": ("' + varName + '" in scope) ? scope["' + varName + '"] : ');
                        handleStatement(arg, output);
                        output.add(suffix);
                        defaulted++;
                    } else {
                        output.addln('"' + varName + '": scope["' + varName + '"]');
                        output.add(suffix);
                        defaulted++;
                    }
                }
            }
            return defaulted;
        },

        createCallScopeMap = function(args, output, defaults) {
            args = loadArgsArray(args);

            if(defaults.parameters) {
                defaults = defaults.parameters;
            }

            var arg, a, varName, suffix;

            for(a = 0; a < args.length; a++) {
                arg = args[a];
                if(arg) {
                    varName = arg.variable;

                    if(!varName) {
                        varName = defaults[a].name;
                    }

                    suffix = (a == args.length - 1) ? '' : ',';
                    output.addln('"' + varName + '": ');
                    handleStatement(arg, output);
                    output.add(suffix);
                }
            }
        },

        handlers = {

            Each: function(statement, output) {
                var arg = statement.variable,
                    name = getVariableName(arg),
                    jsName = '_' + encodeJsIdentifier(arg);

                output.addln("eachLoop(");
                handleStatement(statement.list, output);
                output.add(", function(" + jsName + "){");
                output.indent();
                output.indentln('set("' + name + '", ' + jsName + ');');
                handleStatements(statement.statements, output);
                output.unindent();
                output.unindentln("});");
            },

            For: function(statement, output) {
                var arg = statement.variable,
                    name = getVariableName(arg),
                    jsName = '_' + encodeJsIdentifier(arg);

                output.addln("forLoop(");
                handleStatement(statement.start, output);
                output.add(", ");
                handleStatement(statement.end, output);
                output.add(", ");
                output.add(!!statement.inclusive + '');
                output.add(", function(" + jsName + "){");
                output.indent();
                output.indentln('set("' + name + '", ' + jsName + ');');
                handleStatements(statement.statements, output);
                output.unindent();
                output.unindentln("});");
            },

            Function: function(statement, output) {
                var func = statement.func;
                nestedDocs = true;

                output.addln('fn("' + (func.id || func.value) + '", function(scope) {');
                output.indent();
                // load the defaults
                output.indentln("loadScope({");
                var defaulted = createDefaultScopeMap(func.args, output);
                if(!defaulted) {
                    output.erase(11);
                    output.unindent();
                } else {
                    output.unindentln("});");
                }

                // Handle all the statements within this function
                if (statement.statements.length) {
                    handleStatements(statement.statements, output);
                }
            
                output.unindentln('});');
                nestedDocs = false;
            },

            Ruleset: function(statement, output) {
                var selectors = [];
                
                // Loop over all selectors and handle inline expressions
                for(var s = 0; s < statement.selectors.length; s++) {
                    var selector = statement.selectors[s];
                    selectors.push(handleInlineExpressions(selector.replace(/"/g, '\\"')));
                }
                statement.selectors = selectors;
                nestedDocs = true;
                output.indentln('ruleset(["' + statement.selectors.join('", "') + '"], function() {');
                handleStatements(statement.statements, output);
                output.unindentln('});');
                nestedDocs = false;
            },
            
            Mixin: function(statement, output) {
                var name = statement.name;

                nestedDocs = true;
                output.addln('mixin("' + (name.id || name.value) + '", function(scope) {');

                output.indent();
                // load the defaults
                output.indentln("loadScope({");
                var defaulted = createDefaultScopeMap(name.args, output);
                if(!defaulted) {
                    output.erase(11);
                    output.unindent();
                } else {
                    output.unindentln("});");
                }
                handleStatements(statement.statements, output);

                output.unindentln('});');
                nestedDocs = false;
            },
            
            Include: function(statement, output) {
                var include = statement.include,
                    id = include.id || include.value
                    args = include.args;

                output.addln('include("' + id + '", {');
                output.indent();
                createCallScopeMap(args, output, mixinDeclarations[id]);
                output.unindentln('});');
            },
            
            Declaration: function(statement, output) {
                output.addln('declare("' + handleInlineExpressions(statement.property) + '", ');
                handleStatement(statement.value, output);

                if(statement.value.type === 'Ruleset') {
                    // remove the last ';'
                    output.erase(1);
                }
                output.add(', ' + !!statement.important + ');');
            },
            
            VariableAssignment: function(statement, output) {
                output.addln('set("' + statement.name + '", ');
                handleStatement(statement.value, output);
                if (statement['default'] !== undefined) {
                    output.add(', true');
                }
                output.add(');');
                handleMetaData(statement);
            },
            
            If: function(statement, output) {
                output.addln('if(unbox(');
                handleStatement(statement.condition, output);
                output.add(')) {');
                output.indent();           
                handleStatements(statement.statements, output);                
                output.unindentln('}');
            },
            
            Else: function(statement, output) {
                if (statement.condition) {
                    output.addln('else if(unbox(');
                    handleStatement(statement.condition, output);
                    output.add(')) {');
                    output.indent();
                }
                else {
                    output.indentln('else {');
                }                
                handleStatements(statement.statements, output);                
                output.unindentln('}');
            },
            
            Return: function(statement, output) {
                output.addln('return ');
                handleStatement(statement.expr, output);
                output.add(';');
            },
            
            BinaryExpression: function(statement, output) {
                if (statement.operator == '-' && statement.left === undefined) {
                    statement.left = {
                        type: 'Constant',
                        dataType: 'Number',
                        value: 0
                    };
                }
                
//                if (statement.left && statement.left.type == 'UnaryExpression') {
//                    statement.left.expr = statement.right;
//                    handleStatement(statement.left, output);
//                    return;
//                }
                
                var divider = ', ';
                switch (statement.operator) {
                    case '+':                    
                    case '-':                    
                    case '/':                    
                    case '*':
                    case '%':
                    case '**':
                    case '==':
                    case '!=':
                    case '>':                    
                    case '<':
                    case '>=':                    
                    case '<=':
                        output.add('operate("' + statement.operator + '", ');
                    break;
                    
                    case 'and':
                        output.add('unbox(');
                        divider = ') && unbox(';
                    break;
                    
                    case 'or':
                        output.add('unbox(');
                        divider = ') || unbox(';
                    break;
                    
                    default:
                        console.log('Unrecognized binary expression operator: ' + statement.operator);
                }
                
                handleStatement(statement.left, output);
                output.add(divider);
                handleStatement(statement.right, output);               
                output.add(')');
            },
            
            UnaryExpression: function(statement, output) {
                switch (statement.operator) {
                    case 'not':
                        output.add('not(');
                        handleStatement(statement.expr, output);
                        output.add(')');
                    break;
                    
                    default:
                        console.log('Unrecognized unary expression operator ' + statement.operator);
                }
            },
            
            Variable: function(statement, output) {
                output.add('get("' + statement.name + '")');
            },
            
            Constant: function(statement, output) {
                var value = statement.value, regex;

                value = handleInlineExpressions(value);

                switch (statement.dataType) {
                    case 'Length':
                    case 'Time':
                    case 'Angle':
                        regex = /([0-9\.\-]+)([\w]+)$/i;
                        value = value.match(regex);
                        output.add('number(' + value[1] + ', ' + '"' + value[2] + '")');
                    break;
                    
                    case 'Number':
                        var s = value + '';
                        if(s.indexOf(".") === 0) {
                            s = '0' + s;
                        }
                        value = s;
                        output.add('number(' + value + ')');
                    break;

                    case 'Percentage':
                        var s = value + '';
                        if(s.indexOf(".") === 0) {
                            s = '0' + s;
                        }
                        value = s;
                        output.add('number(' + value.replace('%', '').replace("\\", "") + ', "%")');
                    break;

                    case 'String':
                        output.add('string("' + value.replace(/[\\]/g, "\\\\") + '")');
                    break;
                                                            
                    case 'Literal':
                        if (booleans.indexOf(value.toLowerCase()) != -1) {
                            output.add('' + value + '');
                        }
                        else if (colors.indexOf(value.toLowerCase()) != -1) {
                            output.add('color("' + value + '")');
                        }
                        else if(value == 'null') {
                            output.add('fashion.Null');
                        }
                        else if(value == 'none') {
                            output.add('fashion.None');
                        }
                        else {
                            output.add('lit("' + value + '")');
                        }
                    break;
                    
                    case 'Color':
                        output.add('hex("' + value + '")');
                    break;
                    
                    default:
                        console.log(statement.dataType, value);
                        output.add('"' + value + '"');
                }
            },
            
            FunctionCall: function(statement, output) {
                var args = statement.args,
                    id = statement.id || statement.value;

                if(args.items) {
                    args = args.items;
                }

                if (nativeCssMethods.indexOf(id) !== -1) {
                    output.add('lit([');
                    output.indent();
                    output.addln('lit("' + id + '("),');
                    output.indentln('list([');
                    for(var a = 0; a < args.length; a++) {
                        var arg = args[a];
                        if(id == 'url' && a == 0) {
                            output.add('unquote(');
                            handleStatement(arg, output);
                            output.add(')');
                        } else {
                            handleStatement(arg, output);
                        }
                        if(a < (args.length - 1)) {
                            output.add(', ');
                        }
                    }
                    output.unindentln('], ", "),');
                    output.addln('lit(")")');
                    output.unindentln('].join(""))');
                }
                else if(functionDeclarations[id]) {
                    output.add('execute("' + id + '", {');
                    output.indent();
                    createCallScopeMap(statement.args, output, functionDeclarations[id]);
                    output.unindentln('})');
                }
                else {
                    output.add('execute("' + id + '", [');
                    args = loadArgsArray(statement.args);
                    output.indent();
                    for(var a = 0; a < args.length; a++) {
                        var arg = args[a];
                        output.addln('');
                        if(arg.variable) {
                            output.add('named(');
                            handleStatement(arg, output);
                            output.add(', "' + arg.variable + '")');
                        } else {
                            handleStatement(arg, output);
                        }
                        if(a < (args.length - 1)) {
                            output.add(',');
                        }
                    }
                    output.unindentln('])');
                }
            },
            
            Extend: function(statement, output) {
                output.addln('extend("' + statement.selector + '");');
            },
            
            List: function(statement, output) {
                output.add('list([');
                for(var i = 0; i < statement.items.length; i++) {
                    var item = statement.items[i];
                    handleStatement(item, output);
                    if(i < (statement.items.length - 1)) {
                        output.add(', ');
                    }
                }
                output.add('], "' + statement.separator + '")');
            },

            Warn: function(statement, output) {
                // ignore
                output.addln("console.warn(unbox(");
                handleStatement(statement.expr, output);
                output.add('));');
            },
            
            Default: function(statement, output) {
                //console.warn('Unrecognized statement type: '+  statement.type + " , " + JSON.stringify(statement, true, 4));
            }
        },

        mixinDeclarations = {},
        functionDeclarations = {},

        getFunctionCallArgs = function(func) {
            var args = loadArgsArray(func.args),
                parameters = [],
                arg, a;

            for(a = 0; a < args.length; a++) {
                arg = args[a];
                if(arg) {
                    parameters.push({
                        name: arg.variable || arg.name,
                        value: arg,
                        position: a
                    });
                }
            }

            return parameters;
        },

        preprocessor = {
            handleFunc: function(func, collection) {
                var name = func.id || func.value,
                    parameters = getFunctionCallArgs(func);

                collection[name] = {
                    parameters: parameters
                };
            },

            Mixin: function(node) {
                this.handleFunc(node.name, mixinDeclarations);
            },

            Function: function(node) {
                this.handleFunc(node.func, functionDeclarations);
            }
        },

        reset = function() {
            mixinDeclarations = {};
            functionDeclarations = {};
        };

    return {
        getMetaData: function() {
            return metadata;
        },

        convert: function(fcss) {
            var output = new fashion.Output(),
                tree;
            nestedDocs = false;
            metadata = {};
            if (typeof fcss === 'string') {
                tree = fashion.Parser.parse(fcss);
            } else {
                tree = fcss;
            }

            reset();
            fashion.Visitor.visit(tree, preprocessor);

            // console.log(JSON.stringify(tree, undefined, 4));
            handleStatements(tree, output);
            return output.get().trim();
        }
    };
})();
