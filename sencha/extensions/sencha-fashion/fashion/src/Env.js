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
