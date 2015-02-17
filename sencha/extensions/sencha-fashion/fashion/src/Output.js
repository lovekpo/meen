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
};