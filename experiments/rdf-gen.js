const print = s => console.log(s);
const printj = s => console.log(JSON.stringify(s));
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const des_builder = require("./descriptor-builder.js");
const JSONPath = require("JSONPath");
const PathFollower = require("./path-follower.js");
const format = require("./string-template/index.js");
const N3 = require("n3");
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;

// TODO: this isn't even a thing yet!!!

async function main(args) {

    let src = {
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
    };
    //let src = JSON.parse(await fs.readFileAsync("src.json", "utf-8"));
    let x = await des_builder.build(src);

    let prefixes = { xsd: "http://www.w3.org/2001/XMLSchema#" };
    let items = [];
    let quads = [];
    let entities = x.entities;
    let e, path, item, q, subject, pred, object, datatype;
    for (let k of Object.keys(entities)) {
        item = "";
        e = entities[k];
        path = e.include[0];
        let values = JSONPath({path: path, json: src});
        for (let i in values) {
            // TODO: use rdflib
            try {
                subject = format(e.iri_template, values[i], {rejectNoMatch: true}); // TODO: implement my own formatter that accepts a jsonpath
            } catch (err) {
                //print("INFO: Entity skipped because of not fitting in the iri template " + e.iri_template);
                continue;
            }
            item += `<${subject}>`;
            if (e.type !== undefined) {
                item += ` a <${e.type}>`;
                quads.push(quad(
                    namedNode(subject),
                    namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                    namedNode(e.type)
                ));
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
                let p = s.suggested_predicates[0];
                pred = `${p.prefix_name}:${p.predicate}`;
                object = values[i][keys[j]];
                datatype = s.data_types[0];
                prefixes[p.prefix_name] = x.prefixes[p.prefix_name];
                item += `<${pred}> "${object}"`;
                let lit = literal(object);
                if (datatype !== undefined) {
                    item += `^^${datatype}`;
                    if (!lit.id.includes('"^^')) {
                        lit.id += `^^${prefixes["xsd"]}${datatype.split(":")[1]}`;
                    }
                }
                quads.push(quad(
                    namedNode(subject),
                    namedNode(pred),
                    lit
                ));
            }
            item += " .\n";
        }
        items.push(item);
    }

    const writer = N3.Writer(process.stdout, { end: false, prefixes: prefixes });
    for (let q of quads)
        writer.addQuad(q);
    writer.end();
/*
    for (let p of Object.keys(prefixes)) {
        print(`@prefix ${p}: ${prefixes[p]} .`);
    }
    print("");
    for (let i of items) {
        print(i);
    }*/

}

main(process.argv);
