var fashion = fashion || (function(){
    var _proto = function(){};

    return {
        /**
         * Use this to register new "native" methods to the fashion runtime. This is an alias for fashion.Runtime.register.
         * @param {Object} methods An object containing methods you want to add to the runtime of fashion.
         */
        register: function(methods) {
            fashion.Runtime.register(methods);
        },

        isArray: Array.isArray,

        chain: function(Parent) {
            _proto.prototype = Parent;
            var chained = new _proto();
            _proto.prototype = null;
            return chained;
        }
    };
})();
var fashion = fashion || {};
(function () {
    function isAlpha(ch) {
        return (ch >= 'a' && ch <= 'z') ||
            (ch >= 'A' && ch <= 'Z');
    }

    function isDigit(ch) {
        return (ch >= '0') && (ch <= '9');
    }

    // http://en.wikipedia.org/wiki/Latin-1
    function isNameChar(ch) {
        var c = ch.charCodeAt(0);
        return (ch >= 'a' && ch <= 'z') ||
            (ch >= 'A' && ch <= 'Z') ||
            (ch >= '0' && ch <= '9') ||
            (ch === '-') || (ch === '_') ||
            (c >= 192 && c <= 255 && c !== 215 && c !== 247);
    }

    function isHexDigit(ch) {
        return (ch >= '0' && ch <= '9') ||
            (ch >= 'a' && ch <= 'f') ||
            (ch >= 'A' && ch <= 'F');
    }

    // px, pt, pc, cm, mm, in, em
    function isLength(unit) {
        var ch1 = unit.charAt(0).toLowerCase(),
            ch2 = unit.charAt(1).toLowerCase();

        if (ch1 === 'p') {
            return (ch2 === 'x' || ch2 === 't' || ch2 === 'c');
        }
        if (ch2 === 'm') {
            return (ch1 === 'c' || ch1 === 'm' || ch1 === 'e');
        }
        return (ch1 === 'i' && ch2 === 'n');
    }

    // s, ms
    function isTime(unit) {
        if (unit.length === 1) {
            return unit === 's';
        } else if (unit.length === 2) {
            return unit === 'ms';
        }
        return false;
    }

    // deg, rad
    function isAngle(unit) {
        var ch = unit.charAt(0);
        if (ch === 'd' || ch === 'D') {
            return unit.toLowerCase() === 'deg';
        }
        if (ch === 'r' || ch === 'R') {
            return unit.toLowerCase() === 'rad';
        }
        return false;
    }

    function Scanner(style) {

        // The list of SASS directives.  Everything else beginning with "@" will be assumed
        // to be a css @-rule, an treated as an identifier. e.g. @font-face
        // TODO: since we do not currently support @media nested in css rules as per the
        // SASS spec, "@media" has been excluded from this regex so that @media will be
        // treated as a normal identifier with no special processing for now.
        this.directives = {
            "@charset": true,
            "@import": true,
            "@extend": true,
            "@debug": true,
            "@warn": true,
            "@if": true,
            "@else": true,
            "@for": true,
            "@each": true,
            "@while": true,
            "@mixin": true,
            "@include": true,
            "@function": true,
            "@return": true
        };

        // Get the next token and return it.
        // Loosely based on http://www.w3.org/TR/CSS2/grammar.html#scanner
        // TODO: nonascii, badcomments, escape
        this.next = function () {
            var style = this.style,
                length = style.length,
                ch, ch2, ch3, start, str, level, negate, charOffset, value;

            // Go past white space, block comment, and single-line comment
            while (true) {

                ch = style.charAt(this.index);

                // Skip white space or any other control characters
                while (this.index < length && (ch <= ' ' || ch >= 128)) {
                    if (ch === '\n') {
                        this.lineNumber += 1;
                        this.start = this.index;
                    }
                    this.index += 1;
                    ch = style.charAt(this.index);
                }

                ch2 = style.charAt(this.index + 1);

                // Block comment
                if (ch === '/' && ch2 === '*') {
                    this.index += 1;
                    start = this.index+1;
                    while (this.index < length) {
                        ch = style.charAt(this.index);
                        ch2 = style.charAt(this.index + 1);
                        if (ch === '\n') {
                            this.lineNumber += 1;
                            this.start = this.index;
                        }
                        if (ch === '*' && ch2 === '/') {
                            this.index += 2;
                            break;
                        }
                        this.index += 1;
                    }
                    this.docs = style.substring(start, this.index-2);
                    continue;
                }

                // Single-line comment
                if (ch === '/' && ch2 === '/') {
                    this.index += 1;
                    while (this.index < length) {
                        ch = style.charAt(this.index);
                        if (ch === '\r' || ch === '\n') {
                            break;
                        }
                        this.index += 1;
                    }
                    continue;
                }

                break;
            }

            start = this.index;
            if (start >= length) {
                return undefined;
            }

            ch = style.charAt(this.index);
            ch2 = style.charAt(this.index + 1);
            ch3 = style.charAt(this.index + 2);

            // Identifier
            if (
                (isNameChar(ch) && !isDigit(ch) && ch !== '-') ||
                (ch === '-' && isNameChar(ch2) && !isDigit(ch2)) ||
                (ch === '#' && ch2 === '{')
            ) {
                level = 0;
                this.index += 1;
                if (ch === '#' && ch2 === '{') {
                    level += 1;
                    this.index += 1;
                }
                while (this.index < length) {
                    ch = style.charAt(this.index);
                    ch2 = style.charAt(this.index + 1);
                    if (isNameChar(ch)) {
                        this.index += 1;
                        continue;
                    }
                    if (ch == ">") {
                        this.index += 1;
                        level += 1;
                        continue;
                    }
                    if (ch === '#' && ch2 === '{') {
                        level += 1;
                        this.index += 2;
                        continue;
                    }
                    if (level > 0) {
                        this.index += 1;
                        if (ch === '}') {
                            level -= 1;
                        }
                        continue;
                    }
                    break;
                }

                str = style.substring(start, this.index).toLowerCase();
                if (str === 'or' || str === 'and' || str === 'not') {
                    return {
                        type: 'operator',
                        isOperator: true,
                        value: str,
                        lineNumber: this.lineNumber
                    };
                }

                return {
                    type: 'ident',
                    value: style.substring(start, this.index),
                    lineNumber: this.lineNumber
                };
            }

            // String
            if ((ch === '\'' || ch === '"') ||
                (ch === '\\' && (ch2 === "'" || ch2 === '"'))) { // quotes may be escaped
                charOffset = (ch === '\\') ? 2 : 1;
                // quotes may be escaped. 
                this.index += charOffset;
                start = this.index;
                while (this.index < length) {
                    ch = style.charAt(this.index);
                    this.index ++;
                    if (ch === style.charAt(start - charOffset) &&
                        (charOffset !== 2 || ch2 === style.charAt(start - 1))) {
                        if (charOffset === 2) {
                            this.index ++;
                        }
                        break;
                    }
                }
                return {
                    type: 'string',
                    value: style.substring(start, this.index - charOffset),
                    lineNumber: this.lineNumber
                };
            }

            // Number
            if (isDigit(ch) || (ch === '.' && isDigit(ch2)) || (ch === '-' && isDigit(ch2)) || (ch === '-' && ch2 === '.' && isDigit(ch3))) {
                if (ch === '-') {
                    this.index += 1;
                }
                this.index += 1;
                
                while (this.index < length) {
                    ch = style.charAt(this.index);
                    if (ch < '0' || ch > '9') {
                        break;
                    }
                    this.index += 1;
                }

                if (ch === '\\') {
                    this.index += 1;
                    ch = style.charAt(this.index);
                }

                if (ch === '.') {
                    this.index += 1;
                    while (this.index < length) {
                        ch = style.charAt(this.index);
                        if (ch < '0' || ch > '9') {
                            break;
                        }
                        this.index += 1;
                    }
                }

                // Percentage
                if (ch === '%') {
                    this.index += 1;
                    return {
                        type: 'percentage',
                        value: style.substring(start, this.index),
                        start: start,
                        end: this.index,
                        lineNumber: this.lineNumber
                    };
                }

                // Length
                if (ch !== ' ') {
                    if (isLength(style.substr(this.index, 2))) {
                        this.index += 2;
                        return {
                            type: 'length',
                            value: style.substring(start, this.index),
                            lineNumber: this.lineNumber
                        };
                    }
                    if (isTime(style.substr(this.index, 1))) {
                        this.index += 1;
                        return {
                            type: 'time',
                            value: style.substring(start, this.index),
                            lineNumber: this.lineNumber
                        };
                    }
                    if (isTime(style.substr(this.index, 2))) {
                        this.index += 2;
                        return {
                            type: 'time',
                            value: style.substring(start, this.index),
                            lineNumber: this.lineNumber
                        };
                    }
                    if (isAngle(style.substr(this.index, 3))) {
                        this.index += 3;
                        return {
                            type: 'angle',
                            value: style.substring(start, this.index),
                            lineNumber: this.lineNumber
                        };
                    }
                }

                return {
                    type: 'number',
                    value: style.substring(start, this.index),
                    lineNumber: this.lineNumber
                };
            }

            // Class
            if (ch === '.') {
                level = 0;
                this.index += 1;
                ch = style.charAt(this.index);
                if (ch === '{') {
                    level += 1;
                    this.index += 1;
                }
                while (this.index < length) {
                    ch = style.charAt(this.index);
                    ch2 = style.charAt(this.index + 1);
                    if (isNameChar(ch)) {
                        this.index += 1;
                        continue;
                    }
                    if (ch === '#' && ch2 === '{') {
                        level += 1;
                        this.index += 2;
                        continue;
                    }
                    if (level > 0) {
                        this.index += 1;
                        if (ch === '}') {
                            level -= 1;
                        }
                        continue;
                    }
                    break;
                }

                return {
 //                   id: ".",
                    type: 'class',
                    value: style.substring(start, this.index),
                    lineNumber: this.lineNumber
                };
            }

            // Hash
            if (ch === '#') {
                level = 0;
                this.index += 1;
                ch = style.charAt(this.index);
                if (ch === '{') {
                    level += 1;
                    this.index += 1;
                }
                while (this.index < length) {
                    ch = style.charAt(this.index);
                    ch2 = style.charAt(this.index + 1);
                    if (isNameChar(ch)) {
                        this.index += 1;
                        continue;
                    }
                    if (ch === '#' && ch2 === '{') {
                        level += 1;
                        this.index += 2;
                        continue;
                    }
                    if (level > 0) {
                        this.index += 1;
                        if (ch === '}') {
                            level -= 1;
                        }
                        continue;
                    }
                    break;
                }

                return {
 //                   id: '#',
                    type: 'hash',
                    value: style.substring(start, this.index),
                    lineNumber: this.lineNumber
                };
            }

            // Variable
            if (ch === '$' || (ch === '-' && ch2 === '$')) {
                if (ch === '-') {
                    negate = true;
                    start += 1;
                    this.index += 1;
                }
                
                this.index += 1;
                var id = style.charAt(this.index);
                while (this.index < length) {
                    ch = style.charAt(this.index);
                    if (isNameChar(ch)) {
                        this.index += 1;
                    } else {
                        break;
                    }
                }
                return {
 //                   id: id,
                    type: 'variable',
                    value: style.substring(start, this.index),
                    negate: negate,
                    lineNumber: this.lineNumber
                };
            }

            // Directive, e.g. @import
            if (ch === '@') {
                this.index += 1;
                while (this.index < length) {
                    ch = style.charAt(this.index);
                    if (!isAlpha(ch) && ch !== '-') {
                        break;
                    }
                    this.index += 1;
                }
                value = style.substring(start, this.index);
                return {
                    // If the value is not a SASS directive, then treat it as an identifier
                    // This prevents a parsing error on CSS @-rules like @font-face
 //                   id: "@",
                    type: this.directives[value] ? 'directive' : 'ident',
                    value: value,
                    lineNumber: this.lineNumber
                };
            }

            // Fallback to single-character or two-character operator
            this.index += 1;
            str = ch;
            if (ch === '=' && ch2 === '=') {
                str = '==';
                this.index += 1;
            }
            if (ch === '!' && ch2 === '=') {
                str = '!=';
                this.index += 1;
            }
            if (ch === '<' && ch2 === '=') {
                str = '<=';
                this.index += 1;
            }
            if (ch === '>' && ch2 === '=') {
                str = '>=';
                this.index += 1;
            }
            return {
                type: 'operator',
                isOperator: true,
                value: str,
                lineNumber: this.lineNumber
            };

        };

        this.flushDocs = function() {
            var docs = this.docs;
            this.docs = null;
            return docs || null;
        }
        // Lookahead the next token (without consuming it).
        this.peek = function (i) {
            var start = this.index,
                lineNo = this.lineNumber,
                token;

            i = i || 1;
            while (i > 0) {
                token = this.next();
                i -= 1;
            }
            this.index = start;
            this.lineNumber = lineNo;

            return token;
        };

        // Check if the next token matches the expected operator.
        // If not, throw an exception.
        this.expect = function (op) {
            var lineNo = this.lineNumber - 1,
                token = this.next(),
                fileName = fashion.currentFile || "sass-content",
                message = [
                    'Expected \'',
                    op,
                    '\' but saw \'' ,
                    token ? token.value : '(null token)',
                    '\'',
                    ' => ',
                    fileName,
                    ':',
                    lineNo,
                    ':',
                        this.index - this.start
                ].join('');

            if (!token) {
                console.error(message);
                throw message;
            }

            if (!token.isOperator || token.value !== op) {
                console.error(message);
                throw message;
            }
        };

        this.style = style;
        this.index = 0;
        this.lineNumber = (style.length) ? 1 : 0;

        return this;
    }

    // Tokenize the entire style and return the array of tokens.
    // If lexical analysis fails, an exception is thrown.
    fashion.Tokenizer = fashion.Tokenizer || {};
    fashion.Tokenizer.tokenize = function (style) {
        var scanner = new Scanner(style),
            token, tokens = [];

        while (true) {
            token = scanner.next();
            if (typeof token === 'undefined') {
                break;
            }
            tokens.push(token);
        }

        return tokens;
    };

    function Parser(scanner) {

        this.scanner = scanner;

        // Constant ::= Number |
        //              String |
        //              Length |
        //              Time |
        //              Angle |
        //              Percentage |
        //              Color;
        this.parseConstant = function () {
            var t = scanner.peek();

            if (t && t.isOperator) {
                return undefined;
            }

            if (t.type === 'number') {
                t = scanner.next();
                return {
                    type: 'Constant',
                    value: t.value,
                    dataType: 'Number',
                    lineNumber: t.lineNumber,
                    docs: scanner.flushDocs()
                };
            }

            if (t.type === 'string') {
                t = scanner.next();
                return {
                    type: 'Constant',
                    value: t.value,
                    dataType: 'String',
                    lineNumber: t.lineNumber,
                    docs: scanner.flushDocs()
                };
            }

            if (t.type === 'length') {
                t = scanner.next();
                return {
                    type: 'Constant',
                    value: t.value,
                    dataType: 'Length',
                    lineNumber: t.lineNumber,
                    docs: scanner.flushDocs()
                };
            }

            if (t.type === 'time') {
                t = scanner.next();
                return {
                    type: 'Constant',
                    value: t.value,
                    dataType: 'Time',
                    lineNumber: t.lineNumber,
                    docs: scanner.flushDocs()
                };
            }

            if (t.type === 'angle') {
                t = scanner.next();
                return {
                    type: 'Constant',
                    value: t.value,
                    dataType: 'Angle',
                    lineNumber: t.lineNumber,
                    docs: scanner.flushDocs()
                };
            }

            if (t.type === 'percentage') {
                t = scanner.next();
                return {
                    type: 'Constant',
                    value: t.value,
                    dataType: 'Percentage',
                    lineNumber: t.lineNumber,
                    docs: scanner.flushDocs()
                };
            }

            if (t.type === 'hash') {
                t = scanner.next();
                return {
                    type: 'Constant',
                    value: t.value,
                    dataType: 'Color',
                    lineNumber: t.lineNumber,
                    docs: scanner.flushDocs()
                };
            }

            return undefined;
        };


        return this;
    }

    // Parse the style and return the corresponding syntax tree.
    // If syntax analysis fails, an exception is thrown.
    fashion.Parser = fashion.Parser || {};
    fashion.Parser.parse = function (style) {
        var keywords = {
                "no-repeat": true
            },
            scanner = new Scanner(style),

            // Constant ::= Number |
            //              String |
            //              Length |
            //              Time |
            //              Angle |
            //              Percentage |
            //              Color;
            parseConstant = function () {
                var t = scanner.peek();

                if (t && t.isOperator) {
                    return undefined;
                }

                if (t.type === 'number') {
                    t = scanner.next();
                    return {
                        type: 'Constant',
                        value: t.value,
                        dataType: 'Number',
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }

                if (t.type === 'string') {
                    t = scanner.next();
                    return {
                        type: 'Constant',
                        value: t.value,
                        dataType: 'String',
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }

                if (t.type === 'length') {
                    t = scanner.next();
                    return {
                        type: 'Constant',
                        value: t.value,
                        dataType: 'Length',
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }

                if (t.type === 'time') {
                    t = scanner.next();
                    return {
                        type: 'Constant',
                        value: t.value,
                        dataType: 'Time',
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }

                if (t.type === 'angle') {
                    t = scanner.next();
                    return {
                        type: 'Constant',
                        value: t.value,
                        dataType: 'Angle',
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }

                if (t.type === 'percentage') {
                    t = scanner.next();
                    return {
                        type: 'Constant',
                        value: t.value,
                        dataType: 'Percentage',
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }

                if (t.type === 'hash') {
                    t = scanner.next();
                    return {
                        type: 'Constant',
                        value: t.value,
                        dataType: 'Color',
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }

                return undefined;
            },

            // Stylesheet ::= Statement*
            parseStylesheet = function () {
                var stat, statements = [];

                while (true) {
                    stat = parseStatement();
                    if (typeof stat === 'undefined') {
                        break;
                    }
                    scanner.flushDocs();
                    statements.push(stat);
                }

                return statements;
            },

            // Statement ::= Documentation |
            //               VariableAssignment |
            //               Directive |
            //               Directive ';' |
            //               Ruleset
            parseStatement = function () {
                var t = scanner.peek(), stat;
                if (typeof t === 'undefined') {
                    return undefined;
                }
                if (t.type === 'variable') {
                    return parseVariableAssignment();
                }
                if (t.type === 'directive' && t.value[1] !== '-') {
                    stat = parseDirective();
                    t = scanner.peek();
                    if (t && t.isOperator && t.value === ';') {
                        scanner.next();
                    }
                    return stat;
                }
                return parseRuleset();
            },

            // Directive ::= Charset |
            //               Debug |
            //               Each |
            //               For |
            //               Function |
            //               If |
            //               Else |
            //               Extend |
            //               Mixin |
            //               Import |
            //               Include |
            //               While |
            //               Return
            parseDirective = function () {
                var t = scanner.peek();

                if (t.value === '@charset') {
                    return parseCharset();
                }
                if (t.value === '@debug') {
                    return parseDebug();
                }
                if (t.value === '@each') {
                    return parseEach();
                }
                if (t.value === '@for') {
                    return parseFor();
                }
                if (t.value === '@function') {
                    return parseFunction();
                }
                if (t.value === '@if') {
                    return parseIf();
                }
                if (t.value === '@else') {
                    return parseElse();
                }
                if (t.value === '@extend') {
                    return parseExtend();
                }
                if (t.value === '@import') {
                    return parseImport();
                }
                if (t.value === '@mixin') {
                    return parseMixin();
                }
                if (t.value === '@include') {
                    return parseInclude();
                }
                if (t.value === '@return') {
                    return parseReturn();
                }
                if (t.value === '@while') {
                    return parseWhile();
                }
                if (t.value === '@warn') {
                    return parseWarn();
                }

                throw {
                    lineNumber: scanner.lineNumber,
                    message: 'Unknown directive ' + t.value
                };
            },

            // Function ::= '@function' FunctionCall '{' ScopedStatement* '}'
            parseFunction = function () {
                var t, func, statements;

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@function') {
                    func = parseFunctionCall();
                    statements = parseBlock().statements;

                    return {
                        type: 'Function',
                        func: func,
                        statements: statements,
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }
                return undefined;
            },

            // Charset ::= '@charset' String
            parseCharset = function () {
                var t, charset;

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@charset') {
                    t = scanner.next();
                    if (t && t.type === 'string') {
                        charset = t.value;
                        return {
                            type: 'Charset',
                            include: charset,
                            lineNumber: t.lineNumber,
                            docs: scanner.flushDocs()
                        };
                    }
                    throw {
                        lineNumber: scanner.lineNumber(),
                        message: 'Expected a string after @charset'
                    };
                }
                return undefined;
            },

            // Debug ::= '@debug' Expression
            parseDebug = function () {
                var t, expr;

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@debug') {
                    expr = parseExpression();
                    if (typeof expr !== 'undefined') {
                        return {
                            type: 'Debug',
                            expr: expr,
                            lineNumber: t.lineNumber,
                            docs: scanner.flushDocs()
                        };
                    }
                    throw {
                        lineNumber: scanner.lineNumber(),
                        message: 'Expected an expression after @debug'
                    };
                }
                return undefined;
            },

            // Warn ::= '@warn' Expression
            parseWarn = function () {
                var t, expr;

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@warn') {
                    expr = parseExpression();
                    if (typeof expr !== 'undefined') {
                        return {
                            type: 'Warn',
                            expr: expr,
                            lineNumber: t.lineNumber,
                            docs: scanner.flushDocs()
                        };
                    }
                    throw {
                        lineNumber: scanner.lineNumber(),
                        message: 'Expected an expression after @debug'
                    };
                }
                return undefined;
            },

            // Each ::= '@each' Variable 'in' Sequence '{' ScopedStatement* '}'
            parseEach = function () {
                var t, id, seq, statements = [], stat;

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@each') {

                    t = scanner.next();
                    if (typeof t === 'undefined' || t.type !== 'variable') {
                        throw {
                            lineNumber: scanner.lineNumber(),
                            message: 'Expected variable name after @each'
                        };
                    }
                    id = t.value;

                    t = scanner.next();
                    if (typeof t === 'undefined' || t.type !== 'ident' || t.value !== 'in') {
                        throw {
                            lineNumber: scanner.lineNumber(),
                            message: 'Expected "in" after variable in @each'
                        };
                    }

                    seq = parseSequence();
                    if(seq.items) {
                        seq = seq.items;
                    }
                    if (typeof seq === 'undefined') {
                        throw {
                            lineNumber: scanner.lineNumber(),
                            message: 'Expected value sequence after "in" in @each'
                        };
                    }

                    scanner.expect('{');
                    while (true) {
                        t = scanner.peek();
                        if (t && t.isOperator && t.value === '}') {
                            break;
                        }
                        stat = parseScopedStatement();
                        if (typeof stat === 'undefined') {
                            break;
                        }
                        statements.push(stat);
                    }
                    scanner.expect('}');

                    return {
                        type: 'Each',
                        variable: id,
                        list: seq,
                        statements: statements,
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }

                return undefined;
            },

            // For ::= '@for' Variable 'from' Expression 'to' Expression '{' ScopedStatement* '}' |
            //         '@for' Variable 'from' Expression 'through' Expression '{' ScopedStatement* '}' |
            parseFor = function () {
                var t, id, start, end, inclusive, statements = [];

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@for') {

                    t = scanner.next();
                    if (typeof t === 'undefined' || t.type !== 'variable') {
                        throw {
                            lineNumber: scanner.lineNumber,
                            message: 'Expected variable name after @for'
                        };
                    }
                    id = t.value;

                    t = scanner.next();
                    if (typeof t === 'undefined' || t.type !== 'ident' || t.value !== 'from') {
                        throw {
                            lineNumber: scanner.lineNumber,
                            message: 'Expected "from" after variable in @for'
                        };
                    }

                    start = parseExpression();
                    if (typeof start === 'undefined') {
                        throw {
                            lineNumber: scanner.lineNumber,
                            message: 'Expected an expression after "from" in @for'
                        };
                    }

                    t = scanner.next();
                    if (typeof t === 'undefined' || t.type !== 'ident' ||
                        (t.value !== 'to' && t.value !== 'through')) {
                        throw {
                            lineNumber: scanner.lineNumber,
                            message: 'Expected "to" or "through" in @for'
                        };
                    }
                    inclusive = t.value === 'through';

                    end = parseExpression();
                    if (typeof start === 'undefined') {
                        throw {
                            lineNumber: scanner.lineNumber,
                            message: 'Expected a terminating expression in @for'
                        };
                    }

                    scanner.expect('{');
                    while (true) {
                        t = scanner.peek();
                        if (t && t.isOperator && t.value === '}') {
                            break;
                        }
                        stat = parseScopedStatement();
                        if (typeof stat === 'undefined') {
                            break;
                        }
                        statements.push(stat);
                    }
                    scanner.expect('}');

                    return {
                        type: 'For',
                        variable: id,
                        start: start,
                        end: end,
                        inclusive: inclusive,
                        statements: statements,
                        docs: scanner.flushDocs()
                    };
                }

                return undefined;
            },

           // While ::= '@while' Expression '{' ScopedStatement* '}'
            parseWhile = function () {
                var t, condition, stat, statements = [];

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@while') {
                    condition = parseExpression();

                    scanner.expect('{');
                    while (true) {
                        t = scanner.peek();
                        if (t && t.isOperator && t.value === '}') {
                            break;
                        }
                        stat = parseScopedStatement();
                        if (typeof stat === 'undefined') {
                            break;
                        }
                        statements.push(stat);
                    }
                    scanner.expect('}');

                    return {
                        type: 'While',
                        condition: condition,
                        statements: statements,
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }
                return undefined;
            },

            // If ::= '@if' Expression '{' ScopedStatement* '}'
            parseIf = function () {
                var t, condition, stat, statements = [];

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@if') {
                    condition = parseSequence();

                    scanner.expect('{');
                    while (true) {
                        t = scanner.peek();
                        if (t && t.isOperator && t.value === '}') {
                            break;
                        }
                        stat = parseScopedStatement();
                        if (typeof stat === 'undefined') {
                            break;
                        }
                        statements.push(stat);
                    }
                    scanner.expect('}');

                    return {
                        type: 'If',
                        condition: condition,
                        statements: statements,
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }
                return undefined;
            },

            // Else ::= '@else' Expression '{' ScopedStatement* '}' |
            //          '@else' If
            parseElse = function () {
                var t, condition, stat, statements = [];

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@else') {
                    t = scanner.peek();
                    if (t.type === 'ident' && t.value === 'if') {
                        scanner.next();
                        condition = parseExpression();
                    }

                    scanner.expect('{');
                    while (true) {
                        t = scanner.peek();
                        if (t && t.isOperator && t.value === '}') {
                            break;
                        }
                        stat = parseScopedStatement();
                        statements.push(stat);
                    }
                    scanner.expect('}');

                    return {
                        type: 'Else',
                        condition: condition,
                        statements: statements,
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }
                return undefined;
            },

            // Extend ::= '@extend' Selector
            parseExtend = function () {
                var t, selector;

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@extend') {
                    selector = parseSelector();
                    if (typeof selector !== 'undefined') {
                        return {
                            type: 'Extend',
                            selector: selector,
                            lineNumber: t.lineNumber,
                            docs: scanner.flushDocs()
                        };
                    } else {
                        throw {
                            lineNumber: scanner.lineNumber,
                            message: 'Expecting attribute name'
                        };
                    }
                }
            },

            // Import ::= '@import' Argument
            parseImport = function () {
                var t=scanner.next(), expr;

                if (t && t.type === 'directive' && t.value === '@import') {
                    t = scanner.peek();
                    if (t.type === 'string') {
                        scanner.next();
                        return {
                            type: 'Import',
                            source: t.value,
                            lineNumber: t.lineNumber,
                            docs: scanner.flushDocs()
                        };
                    } else {
                        expr = parseSequence();
                        return {
                            type: "Import",
                            source: expr,
                            lineNumber: t.lineNumber,
                            docs: scanner.flushDocs()
                        }
                    }
                }

                return undefined;
            },

            // Mixin ::= '@mixin' FunctionCall '{' ScopedStatements* '}'
            parseMixin = function () {
                var t, stat, mixin;

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@mixin') {

                    mixin = {
                        type: 'Mixin',
                        name: parseFunctionCall(),
                        statements: [],
                        docs: scanner.flushDocs()
                    };

                    mixin.statements = parseBlock().statements;

                    t = scanner.peek();
                    if (t && t.isOperator && t.value === ';') {
                        scanner.next();
                    }
                }
                return mixin;
            },

            // Include ::= '@include' Identifier
            parseInclude = function () {
                var t, inc, block;

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@include') {
                    inc = parseFunctionCall();
                    if(scanner.peek().value == '{') {
                        block = parseBlock();
                    }
                    return {
                        type: 'Include',
                        include: inc,
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs(),
                        block: block
                    };
                }
                return undefined;
            },

            parseBlock = function() {
                var t, stat, statements = [];

                scanner.expect('{');
                while (true) {
                    t = scanner.peek();
                    if (typeof t === 'undefined') {
                        break;
                    }
                    if (t && t.isOperator && t.value === '}') {
                        break;
                    }
                    stat = parseScopedStatement();
                    statements.push(stat);
                }
                scanner.expect('}');
                return {
                    type: 'Block',
                    statements: statements,
                    docs: scanner.flushDocs()
                };
            },

            // Return ::= '@return' Identifier
            parseReturn = function () {
                var t, expr;

                t = scanner.next();
                if (t && t.type === 'directive' && t.value === '@return') {
                    expr = parseSequence();
                    return {
                        type: 'Return',
                        expr: expr,
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }
                return undefined;
            },

            // VariableAssignment ::= VariableName ':' Expression ';' |
            //                        VariableName ':' Expression !default ';'
            parseVariableAssignment = function () {
                var t, assignment;

                t = scanner.next();
                assignment = {
                    type: 'VariableAssignment',
                    name: t.value,
                    docs: scanner.flushDocs()
                };
                
                scanner.expect(':');
                assignment.value = parseValue();
                t = scanner.peek();
                if (t && t.isOperator && t.value === '!') {
                    t = scanner.next();
                    t = scanner.next();
                    if (t.value === 'default') {
                        assignment['default'] = false;
                    }
                }

                t = scanner.peek();
                if(t && t.value === ';') {
                    scanner.expect(';');
                }

                return assignment;
            },

            // Ruleset ::= Selectors '{' ScopedStatement* '}'
            parseRuleset = function () {
                var t, selectors, stat, statements;

                t = scanner.peek();
                selectors = parseSelectors();
                statements = parseBlock().statements;

                return {
                    type: 'Ruleset',
                    selectors: selectors,
                    statements: statements,
                    lineNumber: t.lineNumber,
                    docs: scanner.flushDocs()
                };
            },

            // Selectors ::= Selector |
            //               Selectors ',' Selector
            parseSelectors = function () {
                var t, selector, selectors = [];

                while (true) {
                    selector = parseSelector();
                    if (typeof selector === 'undefined') {
                        break;
                    }
                    selectors.push(selector);
                    t = scanner.peek();
                    if (typeof t === 'undefined') {
                        break;
                    }
                    if (t.type !== 'operator' || t.value !== ',') {
                        break;
                    }
                    scanner.next();
                }

                return selectors;
            },

            // Attempt to parse the incoming tokens as if they form a selector.
            // Returns the token right after the parse can't move anymore.
            tryParseSelectors = function () {
                var lineNo = scanner.lineNumber,
                    index = scanner.index,
                    token;

                try {
                    parseSelectors();
                } catch (e) {
                }
                token = scanner.peek();
                scanner.lineNumber = lineNo;
                scanner.index = index;

                return token;
            },

            // Selector ::= Class |
            //              Hash |
            //              '-' Selector |
            //              ':' Selector |
            //              '[' Identifier ']' |
            //              '[' Identifier '=' String ']' |
            //              '[' Identifier '=' Identifier ']' |
            //              '*'
            parseSelector = function () {
                var t, ch, ch2, selector = '';


                while (true) {
                    t = scanner.peek();
                    if (typeof t === 'undefined') {
                        return undefined;
                    }
                    t = scanner.next();
                    selector += t.value;
                    if (t.type === 'hash' && t.value.length === 1) {
                        continue;
                    }
                    if (t.value === '-') {
                        continue;
                    }
                    t = scanner.peek();
                    if (typeof t === 'undefined') {
                        break;
                    }
                    if (t.isOperator) {
                        if (t.value === ';' || t.value === '}' || t.value === '{' || t.value === ',') {
                            break;
                        }
                        if (t.value === '-' || t.value === ':') {
                            if (scanner.style.charAt(scanner.index) !== t.value) {
                                break;
                            }
                            ch = scanner.style.charAt(scanner.index + 1);
                            if (t.value === ':' && !isAlpha(ch) && (ch !== ':')) {
                                ch2 = scanner.style.charAt(scanner.index + 2);
                                if(ch != '#' || ch2 != '{') {
                                    break;
                                }
                            }
                            selector += scanner.next().value;
                            continue;
                        }
                        if (t.value === '[') {
                            selector += scanner.next().value;
                            t = scanner.peek();
                            if (t.type !== 'ident') {
                                throw {
                                    lineNumber: scanner.lineNumber,
                                    message: 'Expecting attribute name'
                                };
                            }
                            selector += scanner.next().value;
                            t = scanner.peek();
                            if (t && t.isOperator && t.value === ']') {
                                selector += scanner.next().value;
                                t = scanner.peek();
                                if (t && t.isOperator && t.value === ':') {
                                    continue;
                                }
                                break;
                            }
                            if (t && t.isOperator && t.value === '=') {
                                selector += scanner.next().value;
                                t = scanner.peek();
                                if (t.type !== 'ident' && t.type !== 'string') {
                                    throw {
                                        lineNumber: scanner.lineNumber,
                                        message: 'Expecting a string or identifier in the selector attribute value'
                                    };
                                }
                                selector += '"';
                                selector += scanner.next().value;
                                selector += '"';
                                scanner.expect(']');
                                selector += ']';
                                t = scanner.peek();
                                if (t && t.isOperator && t.value === ':') {
                                    continue;
                                }
                                break;
                            }
                            continue;
                        }
                    }
                    ch = scanner.style.charAt(scanner.index);
                    if (ch <= ' ') {
                        selector += ' ';
                    }
                }


                return selector;
            },

            // ScopedStatement ::= Ruleset |
            //                     Declaration |
            //                     VariableAssignment |
            //                     Directive
            parseScopedStatement = function () {
                var t = scanner.peek(), stat;


                if (t.type === 'hash' || t.type === 'class') {
                    return parseRuleset();
                }
                if (t && t.isOperator && (t.value === '&' || t.value === '>')) {
                    return parseRuleset();
                }
                if (t.type === 'variable') {
                    return parseVariableAssignment();
                }
                if (t.type === 'directive') {
                    stat = parseDirective();
                    t = scanner.peek();
                    if (t && t.isOperator && t.value === ';') {
                        scanner.next();
                    }
                    return stat;
                }

                // Handle things like '-webkit-foobar: value'
                if (t && t.isOperator && t.value === '-') {
                    return parseDeclaration();
                }

                // This could be Declaration or Ruleset
                if (t.type === 'ident' ||
                    t.type === 'number' ||
                    t.type === 'percentage' ||
                    (t.isOperator && t.value === '*'))
                {
                    t = tryParseSelectors();
                    if (t && t.isOperator && t.value === '{') {
                       //system.print('tryParse: treat as selector');
                        return parseRuleset();
                    }
                    return parseDeclaration();
                }

                return undefined;
            },

            // Declaration ::= Identifier ':' Value |
            //                 Identifier ':' Value '!important'
            parseDeclaration = function () {
                var decl = {}, t, pos;

                decl.type = 'Declaration';
                decl.property = '';
                decl.docs = scanner.flushDocs();
                t = scanner.next();
                if (t && t.isOperator && (t.value === '*' || t.value === '-')) {
                    decl.property = t.value;
                    t = scanner.next();

                    // special case for property name like '-#{prefix}-box-shadow'
                    if (t && t.type === 'hash') {
                        t.type = 'ident';
                    }
                }
                if (t && t.type === 'ident') {
                    decl.property += t.value;
                    scanner.expect(':');

                    //special hack for IE
                    if (decl.property === 'filter' || decl.property === '-ms-filter' || decl.property === '_filter') {
                        decl.value = parseFilterValue();
                    }
                    else {
                        decl.value = parseValue();
                    }
                    t = scanner.peek();
                    if (typeof t !== 'undefined') {
                        if (t.isOperator && t.value === '!') {
                            scanner.next();
                            t = scanner.next();
                            if (t.type === 'ident' && t.value === 'important') {
                                decl.important = true;
                            }
                        }
                    }
                    t = scanner.peek();
                    if (typeof t !== 'undefined') {
                        if (t.isOperator && t.value === ';') {
                            scanner.next();
                        }
                    }

                    return decl;
                } else {
                    var message = [
                        'Property declaration: expected identifier but saw ',
                        JSON.stringify(t),
                        ' instead : ',
                        scanner.lineNumber,
                        ":",
                        scanner.index - scanner.start
                    ].join('');
                    console.error(message);
                    throw {
                        lineNumber: scanner.lineNumber,
                        message: message
                    };
                }
            },

            // Value ::= Sequence |
            //           Value Sequence
            parseValue = function () {
                var t, stat, statements = [];

                t = scanner.peek();
                if (t.isOperator && t.value == '{') {
                    scanner.next();
                    while((stat = parseScopedStatement()) != null) {
                        statements.push(stat);
                    }
                    scanner.expect('}');
                    return {
                        type: "Ruleset",
                        statements: statements,
                        selectors: [],
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }

                return parseSequence();
            },

            // Value ::= Sequence |
            //           Value Sequence            
            parseFilterValue = function() {
                var t, args, value = [], pos;
                
                while (true) {
                    t = scanner.peek();
                    if(t.value == ',') {
                        scanner.next();
                        continue;
                    }

                    if (typeof t === 'undefined') {
                        break;
                    }

                    if (t.type == 'ident' && (t.value == 'progid' || t.value == 'chroma')) {
                        pos = scanner.index;
                        while(true) {
                            t = scanner.next();
                            if (t && t.isOperator && t.value === ')') {
                                break;
                            }
                        }
                        value.push({
                            type: 'Constant',
                            value: style.substring(pos, scanner.index).trim(),
                            dataType: 'Literal',
                            lineNumber: t.lineNumber,
                            docs: scanner.flushDocs()
                        });
                        continue;
                    }
                    
                    if (t.isOperator) {
                        if (t.value === ';' || t.value === '{' || t.value === '!' || t.value === '}') {
                            break;
                        }
                    }

                    args = parseSequence();
                    if(args.items) {
                        args = args.items;
                    } else {
                        args = [args];
                    }
                    value.push(args);
                }

                if (value.length === 0) {
                    return null;
                }

                // Simplify if there is only one value in the array
                while (value.length === 1) {
                    value = value[0];
                }

                return value;
            },

            // Expression ::= Relational |
            //                Identifier '=' Relational
            parseExpression = function () {
                var id, t = scanner.peek();
                if (t.type === 'ident') {
                    t = scanner.peek(2);
                    if (t && t.isOperator && t.value === '=') {
                        id = scanner.next().value;
                        scanner.expect('=');
                        return {
                            type: 'Assignment',
                            id: id,
                            expr: parseRelational(),
                            lineNumber: t.lineNumber,
                            docs: scanner.flushDocs()
                        };
                    }
                }
                return parseDisjunction();
            },

            // Disjunction ::= Conjunction |
            //                 Disjunction 'or' Conjunction
            parseDisjunction = function () {
                var factor, or, t;

                or = parseConjunction();
                factor = or;
                while (true) {
                    t = scanner.peek();
                    if (t && t.isOperator && t.value === 'or') {
                        t = scanner.next();
                        or = parseConjunction();
                        if (typeof or === 'undefined') {
                            break;
                        }
                        factor = {
                            type: 'BinaryExpression',
                            operator: 'or',
                            left: factor,
                            right: or,
                            docs: scanner.flushDocs()
                        };
                    } else {
                        break;
                    }
                }
                return factor;
            },

            // Conjunction ::= LogicalAnd |
            //                 Conjunction 'and' LogicalAnd
            parseConjunction = function () {
                var or, and, t;

                and = parseComplement();
                or = and;
                while (true) {
                    t = scanner.peek();
                    if (t && t.isOperator && t.value === 'and') {
                        t = scanner.next();
                        and = parseComplement();
                        if (typeof and === 'undefined') {
                            break;
                        }
                        or = {
                            type: 'BinaryExpression',
                            operator: 'and',
                            left: or,
                            right: and,
                            docs: scanner.flushDocs()
                        };
                    } else {
                        break;
                    }
                }
                return or;
            },

            // Complement ::= Primary |
            //                'not' Primary
            parseComplement = function () {
                var node, subnode, t;

                t = scanner.peek();
                if (t && t.isOperator && t.value === 'not') {
                    scanner.next();
                    return {
                        type: 'UnaryExpression',
                        operator: 'not',
                        expr: parseRelational(),
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }

                return parseRelational();
            },
            
            // Relational ::= Additive |
            //                Relational '==' Additive |
            //                Relational '!=' Additive |
            //                Relational '<' Additive |
            //                Relational '>' Additive |
            //                Relational '<=' Comparison |
            //                Relational '>=' Comparison
            parseRelational = function () {
                var cmp, expr, t;

                cmp = parseAdditive();
                expr = cmp;

                while (true) {
                    t = scanner.peek();
                    if (t && t.isOperator && (t.value === '==' || t.value === '!=' || 
                                                 t.value === '<' || t.value === '<=' ||
                                                 t.value === '>' || t.value === '>=')) {
                        t = scanner.next();
                        cmp = parseAdditive();
                        if (typeof cmp === 'undefined') {
                            break;
                        }
                        expr = {
                            type: 'BinaryExpression',
                            operator: t.value,
                            left: expr,
                            right: cmp,
                            docs: scanner.flushDocs()
                        };
                    } else {
                        break;
                    }
                }

                return expr;
            },

            // Additive ::= Multiplicative |
            //              Additive '+' Multiplicative |
            //              Additive '-' Multiplicative
            parseAdditive = function () {
                var term, cmp, t;

                term = parseMultiplicative();
                cmp = term;

                while (true) {
                    t = scanner.peek();
                    if (t && t.isOperator && (t.value === '+' || t.value === '-')) {
                        t = scanner.next();
                        term = parseMultiplicative();
                        if (typeof term === 'undefined') {
                            break;
                        }
                        cmp = {
                            type: 'BinaryExpression',
                            operator: t.value,
                            left: cmp,
                            right: term,
                            docs: scanner.flushDocs()
                        };
                    } else {
                        break;
                    }
                }

                return cmp;
            },

            // Multiplicative ::= Disjunction |
            //                    Multiplicative '*' Disjunction |
            //                    Multiplicative '/' Disjunction
            parseMultiplicative = function () {
                var term, factor, t;

                factor = parsePrimary();
                term = factor;
                while (true) {
                    t = scanner.peek();
                    if (t && t.isOperator && (t.value === '*' || t.value === '/')) {
                        t = scanner.next();
                        factor = parsePrimary();
                        if (typeof factor === 'undefined') {
                            break;
                        }
                        term = {
                            type: 'BinaryExpression',
                            operator: t.value,
                            left: term,
                            right: factor,
                            docs: scanner.flushDocs()
                        };
                    } else {
                        break;
                    }
                }

                return term;
            },

            // Primary ::= '(' Value ')' |
            //             FunctionCall |
            //             Variable |
            //             Constant
            parsePrimary = function () {
                var t, expr;

                t = scanner.peek();
                if (typeof t === 'undefined') {
                    return undefined;
                }
                if (t && t.isOperator && t.value === '(') {
                    t = scanner.next();
                    expr = parseSequence();
                    scanner.expect(')');
                    return expr;
                }

                if (t.type === 'ident') {
                    if (keywords[t.value]) {
                        scanner.next();
                        return {
                            type: 'Constant',
                            value: t.value,
                            dataType: 'Literal',
                            lineNumber: t.lineNumber,
                            docs: scanner.flushDocs()
                        };
                    } else {
                        return parseFunctionCall();
                    }
                }

                if (t.type === 'variable') {
                    t = scanner.next();
                    if (t.negate) {
                        return {
                            type: 'BinaryExpression',
                            operator: '-',
                            right: {
                                type: 'Variable',
                                name: t.value,
                                lineNumber: t.lineNumber,
                                docs: scanner.flushDocs()
                            },
                            docs: scanner.flushDocs()
                        };
                    }
                    return {
                        type: 'Variable',
                        name: t.value,
                        lineNumber: t.lineNumber,
                        docs: scanner.flushDocs()
                    };
                }

                t =  parseConstant();
                return t;
            },

            // FunctionCall ::= Identifier '(' Arguments ')' |
            //                  Identifier '(' ')' |
            //                  Literal
            parseFunctionCall = function () {
                var t = scanner.next(),
                    id = t.value,
                    start, end, ch = '',
                    args = [];

                t = scanner.peek();
                if (typeof t !== 'undefined') {
                    if (t.isOperator && t.value === '(') {
                        scanner.next();
                        t = scanner.peek();
                        if (id === 'url' && t && t.type !== 'string') {
                            // unquoted URL, e.g. url(http://foo.bar.com/baz.png)
                            // just consume everything until we get to ')'
                            start = scanner.index;
                            end = start;
                            while (true) {
                                ch = scanner.style.charAt(end);
                                end += 1;
                                if(ch === '(') {
                                    // if we detect an open paren, this is probably
                                    // a function call of some sort, so bail and defer
                                    // to parseArguments
                                    end = start;
                                    break;
                                }
                                if (typeof ch === 'undefined' || ch === ')') {
                                    break;
                                }
                            }
                            if(end != start) {
                                scanner.index = end;
                                args.push({
                                    type: 'Constant',
                                    value: scanner.style.substring(start, end - 1),
                                    dataType: 'String'
                                });
                                return {
                                    type: 'FunctionCall',
                                    id: id,
                                    args: args,
                                    lineNumber: t.lineNumber,
                                    docs: scanner.flushDocs()
                                };
                            }
                        }
                        if (t && (t.type !== 'operator' || t.value !== ')')) {
                            args = parseArguments();
                        }
                        t = scanner.peek();
                        scanner.expect(')');
                        return {
                            type: 'FunctionCall',
                            id: id,
                            args: args,
                            lineNumber: t.lineNumber,
                            docs: scanner.flushDocs()
                        };
                    }
                }

                return {
                    type: 'Constant',
                    value: id,
                    dataType: 'Literal',
                    lineNumber: t.lineNumber,
                    docs: scanner.flushDocs()
                };
            },

            // Sequence ::= Expression |
            //              Sequence ',' Expression
            parseSequence = function () {
                var args = [], arg, t;
                while (true) {
                    arg = parseTuple();
                    if (typeof arg === 'undefined') {
                        break;
                    }
                    args.push(arg);
                    t = scanner.peek();
                    if (typeof t === 'undefined') {
                        break;
                    }
                    if (t.type !== 'operator' || t.value !== ',') {
                        break;
                    }
                    scanner.next();
                }

                if(args.length == 1) {
                    args = args[0];
                } else {
                    args = {
                        type: 'List',
                        items: args,
                        separator: ', ',
                        docs: scanner.flushDocs()
                    }
                }
                return args;
            },

            parseTuple = function () {
                var exprs = [], expr, t;
                while (true) {
                    t = scanner.peek();
                    if (typeof t === 'undefined') {
                        break;
                    }
//                    if (t.type === 'operator') {
//                        // unary operators and parenthetical expressions are allowed
//                        if(t.value !== '(' && t.value !== 'not' && t.value !== '-') {
//                            break;
//                        }
//                    }
                    expr = parseExpression();
                    if (typeof expr === 'undefined') {
                        break;
                    }
                    exprs.push(expr);
                }

                if (exprs.length == 1) {
                    return exprs[0];
                }

                return {
                    type: 'List',
                    items: exprs,
                    separator: ' '
                };
            },

            // Arguments ::= Argument |
            //               Arguments ',' Argument
            parseArguments = function () {
                var args = [], arg, t;
                while (true) {
                    arg = parseArgument();
                    if (typeof arg === 'undefined') {
                        break;
                    }
                    args.push(arg);
                    t = scanner.peek();
                    if (typeof t === 'undefined') {
                        break;
                    }
                    if (t.type !== 'operator' || t.value !== ',') {
                        break;
                    }
                    scanner.next();
                }

                return {
                    type: 'List',
                    items: args,
                    separator: ', ',
                    docs: scanner.flushDocs()
                };
            },

            // Argument ::= Expression |
            //              Variable ':' Expression
            parseArgument = function () {
                var arg = [], expr, t;
                while (true) {
                    t = scanner.peek();
                    if (typeof t === 'undefined') {
                        break;
                    }
                    if (t.type === 'variable') {
                        t = scanner.peek(2);
                        if (t && t.isOperator && t.value === ':') {
                            t = scanner.next();
                            scanner.next();
                            expr = parseExpression();
                            if (expr) {
                                expr.variable = t.value;
                            }
                            arg.push(expr);
                            continue;
                        }
                    }
                    expr = parseExpression();
                    if (typeof expr === 'undefined') {
                        break;
                    }
                    arg.push(expr);
                }

                if(arg.length == 1) {
                    return arg[0];
                }

                return {
                    type: 'List',
                    items: arg,
                    separator: ' '
                };
            };

        return parseStylesheet();
    };
}());

fashion.Output = function() {
    var indentation = '',
        output = '';
        
    return {
        reset: function() {
            indentation = '';
            output = '';
        },        
        
        add: function(text) {
            output += text;
        },
        
        indent: function() {
            indentation += '    ';
        },
    
        unindent: function() {
            indentation = indentation.substr(0, indentation.length - 4);
        },
    
        addln: function(ln) {
            output += ('\n' + indentation + ln);
        },
    
        indentln: function(ln) {
            this.addln(ln);
            this.indent();
        },
    
        unindentln: function(ln) {
            this.unindent();
            this.addln(ln);
        },        
        
        erase: function(offset) {
            output = output.substr(0, output.length - offset);
        },
        
        get: function() {
            return output;
        },
        
        print: function() {
            console.log(output);
        }
    };
};fashion.CSS = function() {
    var css = [];
        
    return {
        reset: function() {
            css = [];
        },
        
        addRuleset: function(ruleset) {
            css.push(ruleset);
        },
        
        getText: function() {
            var output = new fashion.Output(),
                ruleset, r, declaration, d;

            for(r = 0; r < css.length; r++) {
                ruleset = css[r];
                output.indentln(ruleset.selectors.join(',\n') + ' {');
                for(d = 0; d < ruleset.declarations.length; d++) {
                    declaration = ruleset.declarations[d];
                    var line = declaration.property + ': ' + declaration.value;
                    if(declaration.important) {
                        line = line + " !important";
                    }
                    output.addln(line + ';');
                }
                output.unindentln('}');
            }
            return output.get().trim();
        },
        
        getSpecificity: (function() {
            var ids = /#[^#^\.^\s]+/g,
                classes = /\.[^#^\.^\s]+/g,
                names = /(:?^|\s)[A-Za-z0-9]+/g,
                pseudoClasses = /:[A-Za-z0-9\-]+/g,
                pseudoElements = /::[A-Za-z0-9\-]/g,
                attributes = /\[[^\]]+\]+/g;

            function getSelectorSpecificity(selector) {
                var idsMatch = selector.match(ids),
                    idsCount = idsMatch && idsMatch.length || 0,
                    classesMatch = selector.match(classes),
                    classesCount = classesMatch && classesMatch.length || 0,
                    namesMatch = selector.match(names),
                    namesCount = namesMatch && namesMatch.length || 0,
                    pseudoClassesMatch = selector.match(pseudoClasses),
                    pseudoClassesCount = pseudoClassesMatch && pseudoClassesMatch.length || 0,
                    pseudoElementsMatch = selector.match(pseudoElements),
                    pseudoElementsCount = pseudoElementsMatch && pseudoElementsMatch.length || 0,
                    attributesMatch = selector.match(attributes),
                    attributesCount = attributesMatch && attributesMatch.length || 0;
                
                return [idsCount, attributesCount + pseudoClassesCount, namesCount + pseudoElementsCount];
            }
            
            return function(selector) {
                var split = selector.split(','),
                    i = 0, l = split.length,
                    spec, maxSpec;
                
                for (; i < l; ++i) {
                    spec = getSelectorSpecificity(split[i]);
                    if (!maxSpec) {
                        maxSpec = spec;
                    } else if(
                                maxSpec[0] < spec[0]
                            || (maxSpec[0] == spec[0] && maxSpec[1] < spec[1])
                            || (maxSpec[0] == spec[0] && maxSpec[1] == spec[1] && maxSpec[2] < spec[2])
                              ) {
                        maxSpec = spec;
                    }
                }
                
                return maxSpec;
            };
        })(),
        
        parseGradient: (function () {
            var uid = 0;
            return function(item) {
                var len, stops = {}, gradient = {}, stop, i;
                
                gradient.angle = item.direction && item.direction.value || 0;
                
                len = item.stops.items.length;
                for(i = 0; i < len; i++) {
                    stop = item.stops.items[i];
                    stops[(i / (len -1) * 100) >> 0] = {
                        color: String(stop)
                    };
                }

                gradient.id = ++uid;
                gradient.angle = gradient.angle || 0;
                gradient.stops = stops;
                return gradient;
            };
            
        })(),
        
        getJSON: function() {
            var me = this,
                spec = this.getSpecificity,
                ans = css.map(function(ruleset) {
                    var style = {}, joinedSelectors;
                    for(var n = 0; n < ruleset.declarations.length; n++) {
                        var dec = ruleset.declarations[n];
                        var val = String(dec.value), len;
                        if (dec.value.type == 'Number' && !dec.value.unit) {
                            val = dec.value.value;
                        }
                        //Change what's returned
                        switch(dec.property) {
                            case 'rotate':
                                val = val.trim().split(/\s+/);
                                if (val.length > 1) {
                                    val = {
                                        x: +val[0],
                                        y: +val[1],
                                        degrees: +val[2]
                                    };
                                } else {
                                    val = {
                                        degrees: +val[0]
                                    };
                                }
                                break;

                            case 'translate':
                                val = val.trim().split(/\s+/);
                                if (val.length > 1) {
                                    val = {
                                        x: +val[0],
                                        y: +val[1]
                                    };
                                } else {
                                    val = {
                                        x: +val[0],
                                        y: +val[0]
                                    };
                                }
                                break;

                            case 'contrast':
                                val = dec.value;
                                break;

                            case 'spacing':
                            case 'padding':
                            case 'stroke-width':
                            case 'opacity':
                            case 'lineWidth':
                            case 'radius':
                            case 'size':
                                val = +val;
                                break;

                            //parse gradients
                            case 'colors':
                                if (dec.value.type == 'list') {
                                    len = dec.value.items.length;
                                    val = dec.value.items.map(function(item, i) {
                                        //is gradient
                                        if (item.type == 'lineargradient') {
                                            return me.parseGradient(item);
                                        } else {
                                            return String(item);
                                        }
                                    });
                                } else {
                                    //is gradient
                                    if (dec.value.type == 'lineargradient') {
                                        val = me.parseGradient(dec.value);
                                    }
                                }
                                break;
                            default:
                                //is gradient
                                if (dec.value.type == 'lineargradient') {
                                    val = me.parseGradient(dec.value);
                                }
                                break;
                        }
                        style[dec.property] = val;
                    }

                    joinedSelectors = ruleset.selectors.join(' ');
                    
                    return {
                        selector: joinedSelectors,
                        style: style,
                        specificity: spec(joinedSelectors)
                    };
                });
            
            return ans;
        },
        
        getRulesets: function() {
            return css;
        },
        
        extend: function(extend) {
            for(var c = 0; c < css.length; c++) {
                var ruleset = css[c];
                for(var s = 0; s < ruleset.selectors.length; s++) {
                    var selector = ruleset.selectors[s];
                    var parts = [],
                        selectors = [],
                        index = false,
                        selParts = selector.split(' ');

                    for(var p = 0; p < selParts.length; p++) {
                        var part = selParts[p]
                        if (part.indexOf(extend.extend) === 0) {
                            parts.push('{placeholder}');
                            index = p;
                        }
                        else {
                            parts.push(part);
                        }
                    }

                    if (index !== false) {
                        for(var i = 0; i < extend.selectors.length; i++) {
                            var inner = extend.selectors[i];
                            parts[index] = inner;
                            selectors.push(parts.join(' '));
                        }
                        ruleset.selectors = ruleset.selectors.concat(selectors);
                    }
                }
            }
        }
    };
};
var fashion;
fashion = fashion || {};

fashion.Color = function(r, g, b, a) {
    return new fashion.Color.RGBA(r, g, b, a);
};


fashion.Color.units = {
    lightness: '%',
    saturation: '%',
    hue: 'deg'
};
fashion.Color.types = {
    red: 'rgba',
    blue: 'rgba',
    green: 'rgba',
    alpha: 'rgba',
    hue: 'hsla',
    saturation: 'hsla',
    lightness: 'hsla'
};
fashion.Color.comps = {
    red: 'r',
    green: 'g',
    blue: 'b',
    alpha: 'a',
    hue: 'h',
    saturation: 's',
    lightness: 'l'
};


fashion.Color.component = function(color, component) {
    var unit = fashion.Color.units[component],
        type = fashion.Color.types[component],
        prop = fashion.Color.comps[component];
    return new fashion.Number(color[type][prop], unit);
};
fashion.Color.adjust = function(color, component, amount) {
    var hsl = color.hsla.clone(),
        prop = fashion.Color.comps[component],
        value = amount.value;
        
//    if (component === 'saturation' && hsl.s === 0)  {
//        return color.clone();
//    }
//
    hsl[prop] += value;
    
    hsl.h = fashion.Color.constrainDegrees(hsl.h);
    hsl.s = fashion.Color.constrainPercentage(hsl.s);
    hsl.l = fashion.Color.constrainPercentage(hsl.l);
    
    return hsl.rgba;
};


fashion.Color.constrainChannel = function(channel) {
    return Math.max(0, Math.min(channel, 255));
};
fashion.Color.constrainPercentage = function(per) {
    return Math.max(0, Math.min(per, 100));
};
fashion.Color.constrainDegrees = function(deg) {
    deg = deg % 360;
    return (deg < 0) ? (360 + deg) : deg;
};
fashion.Color.constrainAlpha = function(alpha) {
    if (alpha === undefined) {
        return 1;
    }
    return Math.max(0, Math.min(alpha, 1));
};


fashion.Color.RGBA = function(r, g, b, a) {
    a = (a !== undefined) ? a : 1;
        
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
        
    this.rgba = this;
};
fashion.Color.HSLA = function(h, s, l, a) {
    h = fashion.Color.constrainDegrees(h);
    a = (a !== undefined) ? a : 1;

    this.h = h;
    this.s = s;
    this.l = l;
    this.a = a;
    
    this.hsla = this;
};


fashion.Color.RGBA.prototype.type = 'rgba';
fashion.Color.HSLA.prototype.type = 'hsla';


fashion.Color.RGBA.prototype.operate = function(operation, right) {
    var type = right.type,
        value = right.value,
        unit = right.unit;
        
    switch (operation) {
        case '+':
            switch (type) {
                case 'number':
                    switch (unit) {
                        case '%': 
                            return this.hsla.adjustLightness(value).rgba;
                        case 'deg':
                            return this.hsla.adjustHue(value).rgba;
                        default: 
                            return this.add(value, value, value, 1);
                    }
                case 'rgba':
                    return this.add(right.r, right.g, right.b, right.a);
                case 'hsla':
                    return this.hsla.add(right.h, right.s, right.l);
            }
        break;
        case '-':
            switch (type) {
                case 'number':
                    switch (unit) {
                        case '%': 
                            return this.hsla.adjustLightness(-value).rgba;
                        case 'deg': 
                            return this.hsla.adjustHue(-value).rgba;
                        default: 
                            return this.subtract(value, value, value);
                    }
                case 'rgba':
                    return this.subtract(right.r, right.g, right.b);
                case 'hsla':
                    return this.hsla.subtract(right.h, right.s, right.l);
            }
        break;
        case '*':
            switch (type) {
                case 'number':
                    return this.multiply(value);
            }
        break;
        case '/':
            switch (type) {
                case 'number':
                    return this.divide(value);
            }
        break;

        default:
            return fashion.Type.operate(operation, this, right);
        break;
    }
};
fashion.Color.HSLA.prototype.operate = function(operation, right) {
  return this.rgba.operate(operation, right).hsla;
};


fashion.Color.RGBA.prototype.clone = function() {
    return new fashion.Color.RGBA(this.r, this.g, this.b, this.a);
};
fashion.Color.HSLA.prototype.clone = function() {
    return new fashion.Color.HSLA(this.h, this.s, this.l, this.a);
};


fashion.Color.RGBA.prototype.__defineGetter__('hsla', function() {
  return fashion.Color.HSLA.fromRGBA(this);
});
fashion.Color.HSLA.prototype.__defineGetter__('rgba', function() {
  return fashion.Color.RGBA.fromHSLA(this);
});


fashion.Color.RGBA.prototype.__defineGetter__('hash', function(){
    return this.toString();
});
fashion.Color.HSLA.prototype.__defineGetter__('hash', function(){
    return this.rgba.toString();
});

fashion.Color.RGBA.prototype.__defineGetter__('value', function(){
    return {
        r: this.r,
        g: this.g,
        b: this.b,
        a: this.a
    };
});
fashion.Color.HSLA.prototype.__defineGetter__('value', function(){
    return {
        h: this.h,
        s: this.s,
        l: this.l,
        a: this.a
    }
});

fashion.Color.RGBA.prototype.toString = function() {
    var me = this,
        round = Math.round,
        floor = Math.floor,
        r = round(me.r), 
        g = round(me.g), 
        b = round(me.b),
        a = me.a;
    
    // If there is no transparancy we will use hex value
    if (a == 1) {
        r = r.toString(16);
        g = g.toString(16);
        b = b.toString(16);
        
        r = (r.length == 1) ? '0' + r : r;
        g = (g.length == 1) ? '0' + g : g;
        b = (b.length == 1) ? '0' + b : b;
        
        return ['#', r, g, b].join('');
    }
    // Else use rgba
    else {
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
    }
};
fashion.Color.HSLA.prototype.toString = function() {
    return this.rgba.toString();
};

fashion.Color.RGBA.fromHex = function(value) {
    if (value.charAt(0) == '#') {
        value = value.slice(1);
    }
    
    if (value.length == 3) {
        value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
    }
    
    var r = parseInt(value.substring(0,2), 16),
        g = parseInt(value.substring(2,4), 16),
        b = parseInt(value.substring(4,6), 16);
    
    return new fashion.Color.RGBA(r, g, b);
};

fashion.Color.RGBA.prototype.add = function(r, g, b, a) {
    return new fashion.Color.RGBA(
        this.r + r, 
        this.g + g, 
        this.b + b, 
        this.a * a
    );
};
fashion.Color.HSLA.prototype.add = function(h, s, l, a) {
    return new fashion.Color.HSLA(
        fashion.Color.constrainDegrees(this.h + h),
        fashion.Color.constrainPercentage(this.s + s), 
        fashion.Color.constrainPercentage(this.l + l), 
        fashion.Color.constrainAlpha(this.a * a)
    );
};


fashion.Color.RGBA.prototype.subtract = function(r, g, b) {
    return new fashion.Color.RGBA(
        this.r - r, 
        this.g - g, 
        this.b - b, 
        this.a
    );
};


fashion.Color.HSLA.prototype.subtract = function(h, s, l) {
    return this.add(-h, -s, -l);
};


fashion.Color.RGBA.prototype.multiply = function(number) {
    return new fashion.Color.RGBA(
        this.r * number, 
        this.g * number, 
        this.b * number, 
        this.a
    );
};


fashion.Color.RGBA.prototype.divide = function(number) {
    return new fashion.Color.RGBA(
        this.r / number, 
        this.g / number, 
        this.b / number, 
        this.a
    );
};


fashion.Color.HSLA.prototype.adjustLightness = function(percent) {
    this.l = fashion.Color.constrainPercentage(this.l + percent);
    return this;
};
fashion.Color.HSLA.prototype.adjustHue = function(deg) {
    this.h = fashion.Color.constrainDegrees(this.h + deg);
    return this;
};


fashion.Color.RGBA.fromHSLA = function(hsla) {
    if(hsla.type == 'rgba') {
        return hsla.clone();
    }

    var h = hsla.h / 360,
        s = hsla.s / 100,
        l = hsla.l / 100,
        a = hsla.a;

    var m2 = (l <= 0.5) ? (l * (s + 1)) : (l + s - l * s),
        m1 = l * 2 - m2;

    function hue(h) {
        if (h < 0) ++h;
        if (h > 1) --h;
        if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
        if (h * 2 < 1) return m2;
        if (h * 3 < 2) return m1 + (m2 - m1) * (2/3 - h) * 6;
        return m1;
    }
        
    var r = fashion.Color.constrainChannel(hue(h + 1/3) * 0xff),
        g = fashion.Color.constrainChannel(hue(h) * 0xff),
        b = fashion.Color.constrainChannel(hue(h - 1/3) * 0xff);

    return new fashion.Color.RGBA(r, g, b, a);
};
fashion.Color.HSLA.fromRGBA = function(rgba) {
    if(rgba.type == 'hsla') {
        return rgba.clone();
    }
    var r = rgba.r / 255,
        g = rgba.g / 255,
        b = rgba.b / 255,
        a = rgba.a,
        max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        delta = max - min,
        h = 0,
        s = 0,
        l = 0.5 * (max + min);

    // min==max means achromatic (hue is undefined)
    if (min != max) {
        s = (l < 0.5) ? delta / (max + min) : delta / (2 - max - min);
        if (r == max) {
            h = 60 * (g - b) / delta;
        } else if (g == max) {
            h = 120 + 60 * (b - r) / delta;
        } else {
            h = 240 + 60 * (r - g) / delta;
        }
        if (h < 0) {
            h += 360;
        }
        if (h >= 360) {
            h -= 360;
        }
    }
    return new fashion.Color.HSLA(
        fashion.Color.constrainDegrees(h), 
        fashion.Color.constrainPercentage(s*100), 
        fashion.Color.constrainPercentage(l*100), 
        a
    );    
};

fashion.Color.map = {
    aliceblue:              [240, 248, 255],
    antiquewhite:           [250, 235, 215],
    aqua:                   [0, 255, 255],
    aquamarine:             [127, 255, 212],
    azure:                  [240, 255, 255],
    beige:                  [245, 245, 220],
    bisque:                 [255, 228, 196],
    black:                  [0, 0, 0],
    blanchedalmond:         [255, 235, 205],
    blue:                   [0, 0, 255],
    blueviolet:             [138, 43, 226],
    brown:                  [165, 42, 42],
    burlywood:              [222, 184, 135],
    cadetblue:              [95, 158, 160],
    chartreuse:             [127, 255, 0],
    chocolate:              [210, 105, 30],
    coral:                  [255, 127, 80],
    cornflowerblue:         [100, 149, 237],
    cornsilk:               [255, 248, 220],
    crimson:                [220, 20, 60],
    cyan:                   [0, 255, 255],
    darkblue:               [0, 0, 139],
    darkcyan:               [0, 139, 139],
    darkgoldenrod:          [184, 132, 11],
    darkgray:               [169, 169, 169],
    darkgreen:              [0, 100, 0],
    darkgrey:               [169, 169, 169],
    darkkhaki:              [189, 183, 107],
    darkmagenta:            [139, 0, 139],
    darkolivegreen:         [85, 107, 47],
    darkorange:             [255, 140, 0],
    darkorchid:             [153, 50, 204],
    darkred:                [139, 0, 0],
    darksalmon:             [233, 150, 122],
    darkseagreen:           [143, 188, 143],
    darkslateblue:          [72, 61, 139],
    darkslategray:          [47, 79, 79],
    darkslategrey:          [47, 79, 79],
    darkturquoise:          [0, 206, 209],
    darkviolet:             [148, 0, 211],
    deeppink:               [255, 20, 147],
    deepskyblue:            [0, 191, 255],
    dimgray:                [105, 105, 105],
    dimgrey:                [105, 105, 105],
    dodgerblue:             [30, 144, 255],
    firebrick:              [178, 34, 34],
    floralwhite:            [255, 255, 240],
    forestgreen:            [34, 139, 34],
    fuchsia:                [255, 0, 255],
    gainsboro:              [220, 220, 220],
    ghostwhite:             [248, 248, 255],
    gold:                   [255, 215, 0],
    goldenrod:              [218, 165, 32],
    gray:                   [128, 128, 128],
    green:                  [0, 128, 0],
    greenyellow:            [173, 255, 47],
    grey:                   [128, 128, 128],
    honeydew:               [240, 255, 240],
    hotpink:                [255, 105, 180],
    indianred:              [205, 92, 92],
    indigo:                 [75, 0, 130],
    ivory:                  [255, 255, 240],
    khaki:                  [240, 230, 140],
    lavender:               [230, 230, 250],
    lavenderblush:          [255, 240, 245],
    lawngreen:              [124, 252, 0],
    lemonchiffon:           [255, 250, 205],
    lightblue:              [173, 216, 230],
    lightcoral:             [240, 128, 128],
    lightcyan:              [224, 255, 255],
    lightgoldenrodyellow:   [250, 250, 210],
    lightgray:              [211, 211, 211],
    lightgreen:             [144, 238, 144],
    lightgrey:              [211, 211, 211],
    lightpink:              [255, 182, 193],
    lightsalmon:            [255, 160, 122],
    lightseagreen:          [32, 178, 170],
    lightskyblue:           [135, 206, 250],
    lightslategray:         [119, 136, 153],
    lightslategrey:         [119, 136, 153],
    lightsteelblue:         [176, 196, 222],
    lightyellow:            [255, 255, 224],
    lime:                   [0, 255, 0],
    limegreen:              [50, 205, 50],
    linen:                  [250, 240, 230],
    magenta:                [255, 0, 255],
    maroon:                 [128, 0, 0],
    mediumaquamarine:       [102, 205, 170],
    mediumblue:             [0, 0, 205],
    mediumorchid:           [186, 85, 211],
    mediumpurple:           [147, 112, 219],
    mediumseagreen:         [60, 179, 113],
    mediumslateblue:        [123, 104, 238],
    mediumspringgreen:      [0, 250, 154],
    mediumturquoise:        [72, 209, 204],
    mediumvioletred:        [199, 21, 133],
    midnightblue:           [25, 25, 112],
    mintcream:              [245, 255, 250],
    mistyrose:              [255, 228, 225],
    moccasin:               [255, 228, 181],
    navajowhite:            [255, 222, 173],
    navy:                   [0, 0, 128],
    oldlace:                [253, 245, 230],
    olive:                  [128, 128, 0],
    olivedrab:              [107, 142, 35],
    orange:                 [255, 165, 0],
    orangered:              [255, 69, 0],
    orchid:                 [218, 112, 214],
    palegoldenrod:          [238, 232, 170],
    palegreen:              [152, 251, 152],
    paleturquoise:          [175, 238, 238],
    palevioletred:          [219, 112, 147],
    papayawhip:             [255, 239, 213],
    peachpuff:              [255, 218, 185],
    peru:                   [205, 133, 63],
    pink:                   [255, 192, 203],
    plum:                   [221, 160, 203],
    powderblue:             [176, 224, 230],
    purple:                 [128, 0, 128],
    red:                    [255, 0, 0],
    rosybrown:              [188, 143, 143],
    royalblue:              [65, 105, 225],
    saddlebrown:            [139, 69, 19],
    salmon:                 [250, 128, 114],
    sandybrown:             [244, 164, 96],
    seagreen:               [46, 139, 87],
    seashell:               [255, 245, 238],
    sienna:                 [160, 82, 45],
    silver:                 [192, 192, 192],
    skyblue:                [135, 206, 235],
    slateblue:              [106, 90, 205],
    slategray:              [119, 128, 144],
    slategrey:              [119, 128, 144],
    snow:                   [255, 255, 250],
    springgreen:            [0, 255, 127],
    steelblue:              [70, 130, 180],
    tan:                    [210, 180, 140],
    teal:                   [0, 128, 128],
    thistle:                [216, 191, 216],
    tomato:                 [255, 99, 71],
    turquoise:              [64, 224, 208],
    violet:                 [238, 130, 238],
    wheat:                  [245, 222, 179],
    white:                  [255, 255, 255],
    whitesmoke:             [245, 245, 245],
    yellow:                 [255, 255, 0],
    yellowgreen:            [154, 205, 5],
    transparent:            [0, 0, 0, 0]
};
var fashion = fashion || {};

fashion.Number = function(value, unit) {
    this.value = value;
    this.unit = unit;
};

fashion.Number.prototype.type = 'number';

fashion.Number.prototype.toString = function() {
    var value = this.value,
        unit = this.unit;
        
    if (unit === 'px') {
        value = value.toFixed(0);
    }
    return value + (unit || '');
};

fashion.Number.prototype.toBoolean = function() {
    return this.unit ? true : !!this.value;
};

fashion.Number.prototype.clone = function() {
    return new fashion.Number(this.value, this.unit);
};

fashion.Number.prototype.__defineGetter__('hash', function() {
    return this.value;
});

fashion.Number.prototype.operate = function(operation, right) {
    var value = this.value,
        unit = this.unit,
        rtype = right.type,
        rightUnit = right.unit;

    if (rtype == 'rgba' || rtype == 'hsla') {
        return right.operate(operation, this);
    }

    if (operation == '+' && (right.type == 'string' || right.type == 'literal')) {
        return fashion.Type.operate(operation, this, right);
    }
    
    if ((operation == '-' || operation == '+') && unit != '%' && right.unit == '%') {
        right.value = value * (right.value / 100);
    } 
    else {
        var tryNorm = this.tryNormalize(right);
        if(!tryNorm) {
            if(rtype == 'string') {
                return new fashion.String(this.toString()).operate(operation, right);
            } else if(rtype == 'literal') {
                return new fashion.Literal(this.toString()).operate(operation, right);
            } else {
                throw 'Could not normalize ' + this + ' with ' + right;
            }
        } else {
            right = tryNorm;
        }
    }

    if(unit == 'px' && !rightUnit) {
        rightUnit = 'px';
    }

    if(unit && unit != rightUnit) {
        return new fashion.Literal([
            this.toString(),
            operation,
            right.toString()
        ].join(' '));
    }

    switch (operation) {
        case '-':
            return new fashion.Number(value - right.value, unit || right.unit);
        case '+':
            return new fashion.Number(value + right.value, unit || right.unit);
        case '/':
            // If you for example divide 100px by 25px, the end number should be 4 without a unit
            // However if you divide 100px by 4, the result should be 25px
            return new fashion.Number(value / right.value, (unit == right.unit) ? null : (unit || right.unit));
        case '*':
            return new fashion.Number(value * right.value, unit || right.unit);
        case '%':
            return new fashion.Number(value % right.value, unit || right.unit);
        case '**':
            return new fashion.Number(Math.pow(value, right.value), unit || right.unit);
        default:
            return fashion.Type.operate(operation, this, right);
    }
};

fashion.Number.prototype.tryNormalize = function(other) {
    var value = other.value,
        unit = other.unit,
        type = other.type;
        
    if (type == 'number') {
        switch (this.unit) {
            case 'mm':
                switch (unit) {
                    case 'in':
                        return new fashion.Number(value * 25.4, 'mm');
                    case 'cm':
                        return new fashion.Number(value * 2.54, 'mm');
                }            
            case 'cm':
                switch (unit) {
                    case 'in':
                        return new fashion.Number(value * 2.54, 'cm');
                    case 'mm':
                        return new fashion.Number(value / 10, 'cm');
                }            
            case 'in':
                switch (unit) {
                    case 'mm':
                        return new fashion.Number(value / 25.4, 'in');
                    case 'cm':
                        return new fashion.Number(value / 2.54, 'in');
                }            
            case 'ms':
                switch (unit) {
                    case 's':
                        return new fashion.Number(value * 1000, 'ms');
                }            
            case 's':
                switch (unit) {
                    case 'ms':
                        return new fashion.Number(value / 1000, 's');
                }            
            case 'Hz':
                switch (unit) {
                    case 'kHz':
                        return new fashion.Number(value * 1000, 'Hz');
                }            
            case 'kHz':
                switch (unit) {
                    case 'Hz':
                        return new fashion.Number(value / 1000, 'kHz');
                }            
            default:
                return new fashion.Number(value, unit);
        }        
    }
    else if(type == 'string' || type == 'literal') {
        return this.tryParse(value);
    }
    else if (typeof other == 'string') {
        return this.tryParse(other);
    }
    
    return undefined;
};

fashion.Number.prototype.tryParse = function(value) {
    if (value == 'null' || value == 'none') {
        value = 0;
    } else {
        value = parseFloat(value);
    }
    if (!isNaN(value)) {
        return new fashion.Number(value, this.unit);
    }
    return undefined;
}

fashion.Number.prototype.normalize = function(other) {
    var norm = fashion.Number.prototype.tryNormalize(other);
    if(typeof norm === 'undefined') {
        throw 'Could not normalize ' + this + ' with ' + other;
    }
    return norm;
}

fashion.Number.prototype.comparable = function(other) {
    var unit1 = this.unit,
        unit2 = other.unit,
        type = other.type;
    
    if (type !== 'number') {
        return false;
    }
    
    return (
        (unit1 === unit2) ||
        (unit1 === 'mm' && (unit2 === 'in' || unit2 === 'cm')) ||
        (unit1 === 'cm' && (unit2 === 'in' || unit2 === 'mm')) ||
        (unit1 === 'in' && (unit2 === 'mm' || unit2 === 'cm')) ||
        (unit1 === 'ms' && unit2 === 's') ||
        (unit1 === 's' && unit2 === 'ms') ||
        (unit1 === 'Hz' && unit2 === 'kHz') ||
        (unit1 === 'kHz' && unit2 === 'Hz')
    );
};
var fashion = fashion || {};

fashion.List = function(items, separator) {
    this.items = items || [];
    this.separator = separator || ' ';
};

fashion.List.prototype.type = 'list';

fashion.List.prototype.toString = function() {
    return this.items.join(this.separator);
};

fashion.List.prototype.toBoolean = function() {
    return !!this.items.length;
};

fashion.List.prototype.clone = function() {
    return new fashion.List(this.items.slice());
};

fashion.List.prototype.add = function(item) {
    return this.items.push(item);
};

fashion.List.prototype.get = function(index) {
    return this.items[index-1] || null;
};

fashion.List.prototype.__defineGetter__('hash', function() {
    return this.toString();
});

fashion.List.prototype.__defineGetter__('value', function() {
    return {
        items: this.items,
        separator: this.separator
    };
});

fashion.List.prototype.operate = function(operation, right) {
    switch(operation) {
        case '!=':
            if(right.type === 'literal') {
                if(right.value === 'null' || right.value === 'none') {
                    return !!this.items;
                }
            }
        case '==':
            if(right.type === 'literal') {
                if(right.value === 'null' || right.value === 'none') {
                    return !!this.items;
                }
            }
    }
    return fashion.Type.operate(operation, this, right);
};
var fashion;
fashion = fashion || {};

fashion.Type = {};

fashion.Type.operate = function(operation, left, right) {
    switch (operation) {
        case '==':
            return left.hash == right.hash;
        case '!=':
            return left.hash != right.hash;
        case '>=':
            return left.hash >= right.hash;
        case '<=':
            return left.hash <= right.hash;
        case '>':
            return left.hash > right.hash;
        case '<':
            return left.hash < right.hash;
        case '+':
            return left.hash + right.hash;
    }

    throw [
        'Error: unknown operation ',
        operation,
        ' for comparing : ',
        left.toString(),
        ' and ',
        right.toString()
    ].join('');
};
var fashion;
fashion = fashion || {};

fashion.String = function(value) {
    this.value = value;
};

fashion.String.prototype.type = 'string';

fashion.String.prototype.toString = function() {
    return '"' + this.value.replace(/"/g,'\\"') + '"';
};

fashion.String.prototype.toBoolean = function() {
    return this.value.length;
};

fashion.String.prototype.clone = function() {
    return new fashion.String(this.value);
};

fashion.String.prototype.operate = function(operation, right) {
    var norm, value;
    if(right.type === 'number') {
        if((norm = fashion.Number.prototype.tryNormalize(this))) {
            return norm.operate(operation, right);
        };
    }

    switch(right.type) {
        case 'list':
            value = right.toString();
            break;
        default:
            value = right.value;
            break;
    }

    switch (operation) {
        case '+':
            return new fashion.String(this.value + value);
        case '/':
            return new fashion.String([this.value, value].join('/'));
    }
    return fashion.Type.operate(operation, this, right);
};

fashion.String.prototype.__defineGetter__('hash', function() {
    return this.value;
});
var fashion;
fashion = fashion || {};

fashion.Literal = function(value) {
    this.value = value;
};

fashion.Literal.prototype.type = 'literal';

fashion.Literal.prototype.toString = function() {
    return this.value;
};

fashion.Literal.prototype.toBoolean = function() {
    return this.value.length;
};

fashion.Literal.prototype.clone = function() {
    return new fashion.Literal(this.value);
};

fashion.Literal.prototype.operate = function(operation, right) {
    var norm;
    if(right.type === 'number') {
        if((norm = fashion.Number.prototype.tryNormalize(this))) {
            return norm.operate(operation, right);
        };
    }

    switch (operation) {
        case '+':
            switch (right.type) {
                case 'string':
                    return new fashion.String(this.value + right.value);
                case 'literal':
                    return new fashion.Literal(this.value + right.value);
            }
            return new fashion.Literal(this.value + right.toString());
        case '/':
            return new fashion.Literal(this.value + "/" + right.value);
    }    
    return fashion.Type.operate(operation, this, right);
};

fashion.Literal.prototype.__defineGetter__('hash', function() {
    return this.value;
});

fashion.Null = new fashion.Literal('null');
fashion.None = new fashion.Literal('none');var fashion;
fashion = fashion || {};

fashion.Bool = function(value) {
    this.value = !!value;
};

fashion.Bool.prototype.type = 'bool';

fashion.Bool.prototype.toString = function() {
    return this.value ? 'true' : 'false';
};

fashion.Bool.prototype.clone = function() {
    return new fashion.Bool(this.value);
};

fashion.Bool.prototype.operate = function(operation, right) {
    return fashion.Type.operate(operation, this, right);
};

fashion.Bool.prototype.__defineGetter__('hash', function() {
    return this.toString();
});

fashion.True = new fashion.Bool(true);
fashion.False = new fashion.Bool(false);var fashion;
fashion = fashion || {};

fashion.ColorStop = function(color, stop) {
    this.color = color;
    this.stop = stop;
};

fashion.ColorStop.prototype.type = 'colorstop';

fashion.ColorStop.prototype.toString = function() {
    var string = this.color.toString(),
        stop = this.stop;
        
    if (stop) {
        stop = stop.clone();
        string += ' ';
        if (!stop.unit) {
            stop.value *= 100;
            stop.unit = '%';
        }        
        string += stop.toString();
    }
    
    return string;
};

fashion.ColorStop.prototype.toOriginalWebkitString = function() {
    var string = '',
        stop = this.stop;
        
    if (!stop) {
        stop = new fashion.Number(0, '%');
    }
    
    stop = stop.clone();
    if (!stop.unit) {
        stop.value *= 100;
        stop.unit = '%';
    }
    
    return 'color-stop(' + stop.toString() + ', ' + this.color.toString() + ')';
};

fashion.ColorStop.prototype.clone = function() {
    return new fashion.ColorStop(this.color, this.stop);
};

fashion.ColorStop.prototype.__defineGetter__('hash', function() {
    return this.toString();
});
fashion.ColorStop.prototype.__defineGetter__('value', function() {
    return {
        stop: this.stop,
        color: this.color
    };
});
var fashion;
fashion = fashion || {};

fashion.LinearGradient = function(direction, stops) {
    this.direction = direction;
    this.stops = stops;
};

fashion.LinearGradient.prototype.type = 'lineargradient';

fashion.LinearGradient.prototype.toString = function() {
    var string = 'linear-gradient(';
    if (this.position) {
        string += (this.position + ', ');
    }
    return string + this.stops + ')';
};

fashion.LinearGradient.prototype.toOriginalWebkitString = function() {
    // args = []
    // args << grad_point(position_or_angle || Sass::Script::String.new("top"))
    // args << linear_end_position(position_or_angle, color_stops)
    // args << grad_color_stops(color_stops)
    // args.each{|a| a.options = options}
    // Sass::Script::String.new("-webkit-gradient(linear, #{args.join(', ')})")
    //this.gradientPoints(this.position);    
    var args = [],
        stops = this.stops.items,
        ln = stops.length,
        i;

    args.push('top');
    args.push('bottom');    
    for (i = 0; i < ln; i++) {
        args.push(stops[i].toOriginalWebkitString());
    }
    return '-webkit-gradient(linear, ' + args.join(', ') + ')';
};

fashion.LinearGradient.prototype.supports = function(prefix) {
    return ['owg', 'webkit'].indexOf(prefix.toLowerCase()) !== -1;
};

fashion.LinearGradient.prototype.gradientPoints = function(position) {
    position = (position.type == 'list') ? position.clone() : new fashion.List([position]);
    console.log('gradientpoints', position);
};

fashion.LinearGradient.prototype.clone = function() {
    return new fashion.LinearGradient(this.direction, this.stops);
};

fashion.LinearGradient.prototype.__defineGetter__('hash', function() {
    return this.toString();
});
fashion.LinearGradient.prototype.__defineGetter__('value', function() {
    return {
        stops: this.stops,
        direction: this.direction
    };
});

fashion.LinearGradient.prototype.operate = function(operation, right) {
    switch(operation) {
        case "!=":
            if(right.type == 'literal' && (right.value == 'null' || right.value == 'none')) {
                return true;
            }
        case "==":
            if(right.type == 'literal' && (right.value == 'null' || right.value == 'none')) {
                return false;
            }
    }
    return fashion.Type.operate(operation, this, right);
};
var fashion;
fashion = fashion || {};

fashion.RadialGradient = function(direction, shape, stops) {
    this.direction = direction;
    this.stops = stops;
    this.shape = shape;
};

fashion.RadialGradient.prototype.type = 'radialgradient';

fashion.RadialGradient.prototype.toString = function() {
    var string = 'radial-gradient(';
    if (this.position) {
        string += (this.position + ', ');
    }
    if (this.shape) {
        string += (this.shape + ', ');
    }
    return string + this.stops + ')';
};

fashion.RadialGradient.prototype.toOriginalWebkitString = function() {
    var args = [],
        stops = this.stops.items,
        ln = stops.length,
        i;

    args.push('center 0%');
    args.push('center 100%');
    for (i = 0; i < ln; i++) {
        args.push(stops[i].toOriginalWebkitString());
    }
    return '-webkit-gradient(radial, ' + args.join(', ') + ')';
};

fashion.RadialGradient.prototype.supports = function(prefix) {
    return ['owg', 'webkit'].indexOf(prefix.toLowerCase()) !== -1;
};

fashion.RadialGradient.prototype.gradientPoints = function(position) {
    position = (position.type == 'list') ? position.clone() : new fashion.List([position]);
    console.log('gradientpoints', position);
};

fashion.RadialGradient.prototype.clone = function() {
    return new fashion.RadialGradient(this.direction, this.stops);
};

fashion.RadialGradient.prototype.__defineGetter__('hash', function() {
    return this.toString();
});
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
})();var fashion = fashion || {};
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

})();fashion.Converter = (function() {
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
var fashion = fashion || {};

fashion.Env = fashion.Env || (function(){
    var isBrowser = false,
        isRhino = !(typeof importPackage == 'undefined'),
        isNode = false,
        canSetPrototype = (function(){
            var a = {x: 42},
                b = {y: 42};
            try{
                b.__proto__ = a;
                return b.y == b.x;
            } catch(e) {
                return false;
            }
        })();

    return {
        isBrowser: isBrowser,
        isRhino: isRhino,
        isNode: isNode,
        canSetPrototype: canSetPrototype,

        downloadFile: function(path) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', path, false);
            xhr.send(null);
            if(xhr.status != 200) {
                throw 'failed to read file "' + path + '" : ' + xhr.status;
            }
            return xhr.responseText;
        },

        readFile: function(file) {
            if(fashion.Env.isBrowser) {
                return fashion.Env.downloadFile(file)
            }
            return readFile(file);
        },

        exists: function(path) {
            try {
                if(isRhino) {
                    return new java.io.File(path).exists();
                } else {
                    fashion.Env.readFile(path);
                    return true;
                }
            } catch (e) {
                return false;
            }
        },

        join: function(dir, subpath) {
            return dir + "/" + subpath;
        }
    };
})();
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
})();fashion.register({
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
});fashion.register({
    hsla: function(args) {
        var mapped = this.handleArgs(args, ['hue', 'saturation', 'lightness', 'alpha']),
            h = mapped.hue,
            s = mapped.saturation,
            l = mapped.lightness,
            a = mapped.alpha;

        if (args.length != 4) throw 'Wrong number of arguments (' + args.length + ' for 4) for \'hsla\'';
                    
        if (h.type != 'number') throw h + ' is not a number for \'hsla\'';
        if (s.type != 'number') throw s + ' is not a number for \'hsla\'';
        if (l.type != 'number') throw l + ' is not a number for \'hsla\'';
        if (a.type != 'number') throw a + ' is not a number for \'hsla\'';
        
        if (s.value !== fashion.Color.constrainPercentage(s.value)) throw 'Saturation ' + s + ' must be between 0% and 100% for \'hsla\'';
        if (l.value !== fashion.Color.constrainPercentage(l.value)) throw 'Lightness ' + l + ' must be between 0% and 100% for \'hsla\'';
        if (a.value !== fashion.Color.constrainAlpha(a.value)) throw 'Alpha channel ' + a + ' must be between 0 and 1 for \'hsla\'';
           
        return new fashion.Color.HSLA(h.value, s.value, l.value, a.value);
    },

    hsl: function(args) {
        if (args.length != 3) {
            throw 'Wrong number of arguments (' + args.length + ' for 3) for \'hsl\'';
        }
        args.push({alpha: new fashion.Number(1)});
        return this.hsla(args);
    },
    
    hue: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'hue\'';
        }
        return fashion.Color.component(color, 'hue');
    },
    
    saturation: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'saturation\'';
        }
        return fashion.Color.component(color, 'saturation');
    },
    
    lightness: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'lightness\'';
        }
        return fashion.Color.component(color, 'lightness');
    },
    
    adjust_hue: function(args) {
        var color = args[0],
            degrees = args[1];
        
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'adjust-hue\'';
        }
        if (degrees.type !== 'number') {
            throw degrees + ' is not a number for \'adjust-hue\'';
        }
        if (degrees.value < -360 || degrees.value > 360) {
            throw 'Amount ' + degrees + ' must be between 0deg and 360deg for \'adjust-hue\'';
        }
        return fashion.Color.adjust(color, 'hue', degrees);            
    },
        
    lighten: function(args) {
        var color = args[0],
            amount = args[1];
        
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'lighten\'';
        }
        if (amount.type !== 'number') {
            throw amount + ' is not a number for \'lighten\'';
        }
        if (amount.value !== fashion.Color.constrainPercentage(amount.value)) {
            throw 'Amount ' + amount + ' must be between 0% and 100% for \'lighten\'';
        }

        return fashion.Color.adjust(color, 'lightness', amount);
    },
    
    darken: function(args) {
        var color = args[0],
            amount = args[1];
        
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'darken\'';
        }
        if (amount.type !== 'number') {
            throw amount + ' is not a number for \'darken\'';
        }

        if (amount.value !== fashion.Color.constrainPercentage(amount.value)) {
            throw 'Amount ' + amount + ' must be between 0% and 100% for \'darken\'';
        }
        
        amount.value *= -1;
        return fashion.Color.adjust(color, 'lightness', amount);
    },
    
    saturate: function(args) {
        var color = args[0],
            amount = args[1];
        
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'saturate\'';
        }
        if (amount.type !== 'number') {
            throw amount + ' is not a number for \'saturate\'';
        }
        if (amount.value !== fashion.Color.constrainPercentage(amount.value)) {
            throw 'Amount ' + amount + ' must be between 0% and 100% for \'saturate\'';
        }
        
        return fashion.Color.adjust(color, 'saturation', amount);
    },
    
    desaturate: function(args) {
        var color = args[0],
            amount = args[1];
        
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'desaturate\'';
        }
        if (amount.type !== 'number') {
            throw amount + ' is not a number for \'desaturate\'';
        }
        if (amount.value !== fashion.Color.constrainPercentage(amount.value)) {
            throw 'Amount ' + amount + ' must be between 0% and 100% for \'desaturate\'';
        }
        
        amount.value *= -1;
        return fashion.Color.adjust(color, 'saturation', amount);
    },
    
    grayscale: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'grayscale\'';
        }
        return this.desaturate([color, new fashion.Number(100, '%')]);
    },
    
    complement: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'complement\'';
        }
        return this.adjust_hue([color, new fashion.Number(180, 'deg')]);
    },
    
    invert: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'invert\'';
        }
        color = color.rgba;
        
        return new fashion.Color.RGBA(
            255 - color.r,
            255 - color.g,
            255 - color.b,
            color.a
        );
    }
});fashion.register({
    type_of: function(args) {
        var value = args[0];
        if (value === true || value === false) {
            return new fashion.Literal('bool');
        }
        if (value.type == 'hsla' || value.type == 'rgba') {
            return new fashion.Literal('color');
        }            
        if (value.type == 'literal' || value.type == 'string') {
            return new fashion.Literal('string');
        }
        return new fashion.Literal(value.type);
    },
    
    unit: function(args) {
        var number = args[0];
        if (number.type != 'number') throw number + ' is not a number for \'unit\'';
        return new fashion.String(number.unit || '');
    },
    
    unitless: function(args) {
        var number = args[0];
        if (number.type != 'number') throw number + ' is not a number for \'unitless\'';
        return new fashion.Bool(!number.unit);
    },
    
    comparable: function(args) {
        var number1 = args[0],
            number2 = args[1];
        if (number1.type != 'number') throw number1 + ' is not a number for \'comparable\'';
        if (number2.type != 'number') throw number2 + ' is not a number for \'comparable\'';        
        return new fashion.Bool(!!number1.comparable(number2));
    }
});fashion.register({
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
});fashion.register(function() {
    return {
        __if: function (args) {
            var expression = this.unbox(args[0]),
                val1 = args[1],
                val2 = args[2];

            return expression ? val1 : val2;
        },

        theme_image: function (args) {
            var theme = args[0],
                file = args[1];
            return new fashion.Literal('url("resources/images/' + theme.value + '/' + file.value + '")');
        },

        prefixed: function (args) {
            var prefix = args[0];
            // TODO remove - once we implement dashes in literals
            args = Array.prototype.slice.call(arguments, 1);

            var ln = args.length, i, arg;
            for (i = 0; i < ln; i++) {
                arg = args[i];
                if (arg.supports && arg.supports(prefix.value)) {
                    return new fashion.Bool(true);
                }
            }
            return new fashion.Bool(false);
        },

        _owg: function (args) {
            var value = args[0];
            if (value.type == 'list') {
                value = value.get(1);
            }
            return new fashion.Literal(value.toOriginalWebkitString());
        },

        _webkit: function (args) {
            var value = args[0];
            if (value.type == 'list') {
                value = value.get(1);
            }
            return new fashion.Literal('-webkit-' + value.toString());
        },

        _o: function (args) {
            var value = args[0];
            if (value.type == 'list') {
                value = value.get(1);
            }
            return new fashion.Literal('-o-' + value.toString());
        },

        _moz: function (args) {
            var value = args[0];
            if (value.type == 'list') {
                value = value.get(1);
            }
            return new fashion.Literal('-moz-' + value.toString());
        }
    };
}());fashion.register({
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
});fashion.register({
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
});fashion.register({
    rgba: function(args) {
        var mapped, color, a, r, g, b;
        if (args.length == 2) {
            mapped = this.handleArgs(args, ['color', 'alpha']);
            color = mapped.color;
            a = mapped.alpha;
            
            if (color.type !== 'rgba' && color.type !== 'hsla') throw color + ' is not a color for \'rgba\'';
            
            color = color.rgba;
            r = new fashion.Number(color.r);
            g = new fashion.Number(color.g);
            b = new fashion.Number(color.b);
        }
        else {
            if (args.length != 4) throw 'Wrong number of arguments (' + args.length + ' for 4) for \'rgba\'';
            mapped = this.handleArgs(args, ['red', 'green', 'blue', 'alpha']);
            r = mapped.red;
            g = mapped.green;
            b = mapped.blue;
            a = mapped.alpha;
        }
                    
        if (r.type != 'number') throw r + ' is not a number for \'rgba\'';
        if (g.type != 'number') throw g + ' is not a number for \'rgba\'';
        if (b.type != 'number') throw b + ' is not a number for \'rgba\'';
        if (a.type != 'number') throw a + ' is not a number for \'rgba\'';
        
        if (r.unit == '%') {
            if (r.value !== fashion.Color.constrainPercentage(r.value)) throw 'Color value ' + r + ' must be between 0% and 100% inclusive for \'rgba\'';
            r = new fashion.Number(r.value / 100 * 255);
        } else if (r.value !== fashion.Color.constrainChannel(r.value)) throw 'Color value ' + r + ' must be between 0 and 255 inclusive for \'rgba\'';
        if (g.unit == '%') {
            if (g.value !== fashion.Color.constrainPercentage(g.value)) throw 'Color value ' + g + ' must be between 0% and 100% inclusive for \'rgba\'';
            g = new fashion.Number(g.value / 100 * 255);
        } else if (g.value !== fashion.Color.constrainChannel(g.value)) throw 'Color value ' + g + ' must be between 0 and 255 inclusive for \'rgba\'';
        if (b.unit == '%') {
            if (b.value !== fashion.Color.constrainPercentage(b.value)) throw 'Color value ' + b + ' must be between 0% and 100% inclusive for \'rgba\'';
            b = new fashion.Number(b.value / 100 * 255);
        } else if (b.value !== fashion.Color.constrainChannel(b.value)) throw 'Color value ' + b + ' must be between 0 and 255 inclusive for \'rgba\'';
        if (a.unit == '%') {
            if (a.value !== fashion.Color.constrainPercentage(a.value)) throw 'Alpha channel ' + a + ' must be between 0% and 100% inclusive for \'rgba\'';
            a = new fashion.Number(a.value / 100);
        } else if (a.value !== fashion.Color.constrainAlpha(a.value)) throw 'Alpha channel ' + a + ' must be between 0 and 1 inclusive for \'rgba\'';
                               
        return new fashion.Color.RGBA(r.value, g.value, b.value, a.value);
    },
    
    rgb: function(args) {
        if (args.length != 3) {
            throw 'Wrong number of arguments (' + args.length + ' for 3) for \'rgb\'';
        }
        args.push({alpha: new fashion.Number(1)});
        return this.rgba(args);
    },
    
    red: function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'red\'';
        }
        return fashion.Color.component(color, 'red');
    },
    
    green:  function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'green\'';
        }
        return fashion.Color.component(color, 'green');
    },
    
    blue:  function(args) {
        var color = args[0];
        if (color.type !== 'hsla' && color.type !== 'rgba') {
            throw color + ' is not a color for \'blue\'';
        }
        return fashion.Color.component(color, 'blue');
    },
    
    mix: function(args) {
        var color1 = args[0],
            color2 = args[1],
            weight = args[2];

        weight = (weight !== undefined) ? weight : new fashion.Number(50, '%');
        
        if (color1.type !== 'hsla' && color1.type !== 'rgba') {
            throw 'arg 1 ' + color1 + ' is not a color for \'mix\'';
        }
        if (color2.type !== 'hsla' && color2.type !== 'rgba') {
            throw 'arg 2 ' + color2 + ' is not a color for \'mix\'';
        }
        if (weight.type !== 'number') {
            throw weight + ' is not a number for \'mix\'';
        }
        if (weight.value !== fashion.Color.constrainPercentage(weight.value)) {
            throw 'Weight ' + weight + ' must be between 0% and 100% for \'mix\'';
        }
        
        color1 = color1.rgba;
        color2 = color2.rgba;
        
        weight = weight.value / 100;
        
        var factor = (weight * 2) - 1,
            alpha = color1.a - color2.a,
            weight1 = (((factor * alpha == -1) ? factor : (factor + alpha)/(1 + factor * alpha)) + 1) / 2,
            weight2 = 1 - weight1;

        return new fashion.Color.RGBA(
            (weight1 * color1.r) + (weight2 * color2.r),
            (weight1 * color1.g) + (weight2 * color2.g),
            (weight1 * color1.b) + (weight2 * color2.b),
            (weight * color1.a) + ((1-weight) * color2.a)
        );
    }
});fashion.register({
    quote: function(args) {
        var string = args[0];
        if (string.type !== 'string' && string.type !== 'literal') {
            throw string + ' is not a string or literal for \'quote\'';
        }
        return new fashion.String(string.value);
    },
    
    unquote: function(args) {
        var string = args[0];
        if (string.type !== 'string' && string.type !== 'literal') {
            throw string + ' is not a string or literal for \'unquote\'';
        }
        return new fashion.Literal(string.value);
    }
});fashion.register({
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
});/*
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
}());//@require Fashion.js
//@require Parser.js
//@require Output.js
//@require CSS.js
//@require types/Color.js
//@require types/Number.js
//@require types/List.js
//@require types/Type.js
//@require types/String.js
//@require types/Literal.js
//@require types/Bool.js
//@require types/ColorStop.js
//@require types/LinearGradient.js
//@require types/RadialGradient.js
//@require Transform.js
//@require Visitor.js
//@require Converter.js
//@require Env.js
//@require Runtime.js
//@require functions/Color.js
//@require functions/HSL.js
//@require functions/Introspection.js
//@require functions/List.js
//@require functions/Misc.js
//@require functions/Number.js
//@require functions/Opacity.js
//@require functions/RGB.js
//@require functions/String.js
//@require functions/Gradients.js
//@require functions/Util.js

function fashionBuild(inputFile, outputType) {
    var imported = {},
        size = 0,
        libraryPaths = {
            compass: compassPath,
            blueprint: blueprintPath
        },
        Env = fashion.Env,
        readFile = Env.readFile,
        exists = Env.exists,
        syntax, js, css;

    /**
     * Given /path/to/master.scss and 'foo/bar/baz', returns one of these
     *   /path/to/foo/bar/baz
     *   /path/to/foo/bar/_baz
     *   /path/to/foo/bar/baz.scss
     *   /path/to/foo/bar/_baz.scss
     * (depending on which one exists)
     */
    function findFile(base, fname) {
        var path1, path2, subfile, names = [], result;

        path1 = base.split('/');
        path1.splice(-1, 1);
        path1 = path1.join('/');
        if (path1.length > 0) {
            path1 += '/';
        }

        path2 = fname.split('/');
        subfile = path2[path2.length - 1];
        path2.splice(-1, 1);
        path2 = path2.join('/') + '/';

        names[0] = path1 + path2 + subfile;
        names[1] = path1 + path2 + '_' + subfile;
        names[2] = path1 + path2 + subfile + '.scss';
        names[3] = path1 + path2 + '_' + subfile + '.scss';

        names.forEach(function (fullname) {
            if (exists(fullname)) {
                result = fullname;
            }
        });

        return result;
    }

    function parseFile(fname) {
        var content, syntax;
        console.info("Processing file : " + fname);
        content = readFile(fname);
        syntax = fashion.Parser.parse(content);
        return syntax;
    }

    function process(fname) {
        var fileNameWas = fashion.currentFile,
            separatorIndex, syntax, subfile, root, libpath;

        fashion.currentFile = fname;
        syntax = fashion.Transform.transform(parseFile(fname), {
            Import: function(stat) {
                var source = stat.source;

                subfile = findFile(fname, source);
                if (subfile === undefined) {
                    // if the file was not found, and it is a relative path, check
                    // for a library path.
                    separatorIndex = source.indexOf('/');

                    if (separatorIndex !== 0) { // not an absolute path
                        if (separatorIndex === -1) {
                            // no path separator found e.g. "@import 'compass';"
                            root = source;
                        } else {
                            // path separator found e.g. "@import 'compass/css3"
                            root = source.substring(0, separatorIndex !== -1 ? separatorIndex : source.length);
                        }
                        libpath = libraryPaths[root];
                        if (libpath) {
                            subfile = findFile(libpath, source);
                        }
                    }

                    if (subfile === undefined) {
                        console.warn('cannot resolve @import for "' + source + '"');
                        return stat;
                    }
                }

                // ignore if we already import this
                if(imported[subfile]) {
                    // return undefined to delete the node
                    // during transformation
                    return undefined;
                }

                // process the imported file and merge the result
                return process(subfile);
            }
        });
        imported[fname] = true;
        fashion.currentFile = fileNameWas;
        return syntax;
    }

    syntax = process(inputFile);
    if (!syntax) {
        return;
    }

    return fashionConvert(syntax);
};

function fashionTokenize(sass) {
    return fashion.Tokenizer.tokenize(sass);
}

function fashionParse(sass) {
    return fashion.Parser.parse(sass);
}

function fashionConvert(syntax) {
    return fashion.Converter.convert(syntax);
}

function fashionRun(js) {
    return fashion.Runtime.run(js);
}

function fashionGetCss(js) {
    return fashionRun(js).getText();
}

function fashionCompile(syntax) {
    return fashionRun(fashionConvert(syntax));
}

function fashionCompileCss(sass) {
    return fashionCompile(fashionParse(fashionTokenize(sass))).getText();
}

function jsonEncode(obj) {
    return JSON.stringify(obj, ignoreLineNumber, 4);
}
