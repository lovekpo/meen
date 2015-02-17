fashion.CSS = function() {
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
