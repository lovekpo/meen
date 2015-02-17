//@require Fashion.js
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
