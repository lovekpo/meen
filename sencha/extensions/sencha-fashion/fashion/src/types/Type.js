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
