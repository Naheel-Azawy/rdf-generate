const print = s => console.log(s);
const find = require("./find-swoogle.js");

async function main(args) {
    let s = await find(args[args.length-1]);
    let prefixes = [];
    let predicates = [];
    for (let i = 0; i < s.length; ++i) {
        prefixes.push("PREFIX " + s[i].prefix_name + ": " + s[i].prefix);
        predicates.push(s[i].prefix_name + ":" + s[i].predicate);
    }
    console.log(prefixes);
    console.log(predicates);
}

main(process.argv);
