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
