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

