const print = s => console.log(s);
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
            { name: "zzz", id: "a" }
        ]
    })));
}

main(process.argv);
