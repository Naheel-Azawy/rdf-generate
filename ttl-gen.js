const print = s => console.log(s);
const printj = s => console.log(JSON.stringify(s));
const Promise = require("bluebird");
const extractor = require("./extractor.js");
const JSONPath = require("JSONPath");
const PathFollower = require("./path-follower.js");
const format = require("string-template");
const fs = Promise.promisifyAll(require("fs"));

// TODO: this isn't even a thing yet!!!

async function main(args) {

    /*let src = {
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
    };*/
    let src = JSON.parse(await fs.readFileAsync("src.json", "utf-8"));
    let x = await extractor.extract(src);

    let prefixes = {};
    let items = [];
    let e = x.entities;
    for (let path of Object.keys(e)) {
        e[path].iri = "http://example.com/{id}"; // TODO: just for testing
        let values = JSONPath({path: path, json: x.values});
        for (let i in values) {
            // TODO: use rdflib
            let item = `<${format(e[path].iri, values[i])}> `;
            if (e[path].type !== undefined) {
                item += ` a <${e[path].type}>`;
            }
            let keys = Object.keys(values[i]);
            keys = keys.filter((value, index, array) => { // ignoring non preemptive types for simplicity. TODO: implement nesting
                let v = values[i][keys[index]];
                return !((typeof v === "object") && (v !== null));
            });
            for (let j in keys) {
                if (j !== keys.length - 1) {
                    item += " ;\n\t";
                }
                let s = x.struct[path + '.' + keys[j]];
                let p = s.suggested_predicates[0]; // TODO: 1st one, just for testing
                let t = s.data_types[0]; // TODO: 1st one, just for testing. Checking for datatypes should be here and not in the extractor. UPDATE: nope, keep it there. user will pick only one
                prefixes[p.prefix_name] = x.prefixes[p.prefix_name];
                item += `<${p.prefix_name}:${p.predicate}> "${values[i][keys[j]]}"^^${t}`;
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
