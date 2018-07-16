const print = s => console.log(s);

/*let find = require("./find-swoogle.js");
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
}, err =>console.log(err));*/

const extractor = require("./extractor.js");

async function main(args) {
    print(JSON.stringify(await extractor.extract({
        id: 0,
        name: "naheel",
        age: 21,
        birthday: "1997-03-28",
        working: true,
        test: {
            id: 3,
            name: "nnnnnn",
            age: 91
        },
        followers: [
            { name: "aaa", id: 1, thing: {a: 'a'} },
            { name: "bbb", id: 2 },
            { name: "aaa", id: 3, thing: {a: 'a'} },
        ]
    })));
}

main(process.argv);
