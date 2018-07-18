const print = s => console.log(s);
const printj = s => console.log(JSON.stringify(s));
const extractor = require("./extractor.js");
const JSONPath = require("JSONPath");
const PathFollower = require("./path-follower.js");
const format = require("string-template");

// TODO: this isn't even a thing yet!!!

async function main(args) {
    let x = await extractor.extract({
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
            { name: "ccc", id: 3, thing: {a: 'a'} },
            { name: "ddd", id: "a" },
            { name: "eee", id: "2018-07-18" }
        ]
    });

    let prefixes = {};
    let items = [];
    let e = x.entities;
    for (let path of Object.keys(e)) {
        e[path].iri = "http://example.com/{id}"; // TODO: just for testing
        let values = JSONPath({path: path, json: x.values});
        for (let i in values) {
            let item = `<${format(e[path].iri, values[i])}>`;
            item += ` a <${e[path].type}>`;
            let keys = Object.keys(values[i]);
            keys = keys.filter((value, index, array) => { // ignoring non preemptive types for simplicity. TODO: implement nesting
                let v = values[i][keys[index]];
                return !((typeof v === "object") && (v !== null));
            });
            for (let j in keys) {
                if (j !== keys.length - 1) {
                    item += " ;\n";
                }
                let s = x.struct[path + '.' + keys[j]];
                let p = s.suggested_predicates[0]; // TODO: 1st one, just for testing
                let t = s.data_types[0]; // TODO: 1st one, just for testing. Checking for datatypes should be here and not in the extractor.
                prefixes[p.prefix_name] = x.prefixes[p.prefix_name];
                item += `\t<${p.prefix_name}:${p.predicate}> "${values[i][keys[j]]}"^^${t}`;
            }
            item += " .\n";
            items.push(item);
        }
    }

    for (let p of Object.keys(prefixes)) {
        print(`@prefix ${p}: ${prefixes[p]} .`);
    }
    print("");
    for (let i of items) {
        print(i);
    }

}

main(process.argv);
