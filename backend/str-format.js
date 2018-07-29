const JSONPath = require("JSONPath");

/**
 * Formats a string template based on a given object
 * @param {string} tmp The given  template
 * @param {Object} obj The object associated with the template
 * @returns {string} The formatted string
 */
module.exports = (tmp, obj) => {
    let reg = /{(.*?)}/g;
    let match;
    let val;
    while ((match = reg.exec(tmp)) != null) {
        val = JSONPath({path: match[1], json: obj});
        if (val === undefined) {
            throw `Required key ${match[0]} not found in the template '${tmp}'`;
        }
        tmp = tmp.substring(0, match.index) + val +
            tmp.substring(match.index + match[0].length, tmp.length);
    }
    return tmp;
};

/* Example usage
console.log(module.exports("aaaaaaaaa {test.c[1].a} bbbbbbbbbb {name} cccccc", {
    id: 123,
    name: "AA",
    test: {
        a: 1,
        b: 'b',
        c: [
            { a: 'aaaa', b: 'bbbbb'},
            { a: 'cccc', b: 'ddddd'}
        ]
    },
    age: 999
}));
*/
