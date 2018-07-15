let find = require("./find-swoogle.js");

find(process.argv[process.argv.length-1]).then(s => {
    let prefixes = [];
    let predicates = [];
    for (let i = 0; i < s.length; ++i) {
        prefixes.push("PREFIX " + s[i].prefix_name + ": " + s[i].prefix);
        predicates.push(s[i].prefix_name + ":" + s[i].predicate);
    }
    console.log(prefixes);
    console.log("\n\n\n");
    console.log(predicates);
}, err =>console.log(err));

