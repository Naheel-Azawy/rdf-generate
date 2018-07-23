const print = s => console.log(s);
const printj = s => console.log(JSON.stringify(s));
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const des_builder = require("./descriptor-builder.js");
const JSONPath = require("JSONPath");
const PathFollower = require("./path-follower.js");
const format = require("./string-template/index.js");
const $rdf = require("rdflib");

// TODO: this isn't even a thing yet!!!

function str_format(str, obj) {
    return format(str, obj, {rejectNoMatch: true}); // TODO: implement my own formatter that accepts a jsonpath
}

function get_values_from(paths, src) {
    let path = paths[0]; // TODO: check all the included paths
    return JSONPath({path: path, json: src});
}

function get_entity_or_unlabeled(src, entity_check) {
    let rdf_obj;
    if (entity_check === undefined) {
        // TODO: create an unlabeled blank node
        rdf_obj = $rdf.literal("nothing");
    } else {
        rdf_obj = $rdf.sym(str_format(
            entity_check.iri_template,
            get_values_from(entity_check.include, src)[0] // It should be only one element as it is a normal object and not an array
        ));
    }
    return rdf_obj;
}

function handle_item(src, store, prefixes, des, path, key, subject, obj) {
    let s = des.struct[path + '.' + key];
    let p = s.suggested_predicates[0];
    let pred = des.prefixes[p.prefix_name];
    if (pred.endsWith('/')) {
        pred = pred.substring(0, pred.length - 2);
    }
    pred += "#" + p.predicate;
    let rdf_subj = subject === undefined ? $rdf.bnode() : $rdf.sym(subject);
    if (s.node_type === 'array') {
        // TODO: implement if it is an array
        let content_path = path + "[*]";
        let arr = get_values_from(content_path);
        let rdf_list = [];
        for (let i in arr) {
            rdf_list.push(handle_item(src, store, prefixes, des, content_path, i, undefined, get_entity_or_unlabeled(src, des.entities[path + '.' + key])));
        }
        return [
            rdf_subj,
            $rdf.sym(pred),
            store.list(rdf_list)
        ];
    } else if (s.node_type === 'object') {
        return [
            rdf_subj,
            $rdf.sym(pred),
            get_entity_or_unlabeled(src, des.entities[path + '.' + key])
        ];
    } else {
        obj = `${obj}`; // rdflib require everything to be string
        let datatype = s.data_types[0];
        prefixes[p.prefix_name] = des.prefixes[p.prefix_name];
        return [
            rdf_subj,
            store.sym(pred),
            store.literal(obj, undefined, $rdf.sym(`${prefixes["xsd"]}${datatype.split(":")[1]}`))
        ];
    }
}

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
    let des = await des_builder.build(src);

    let store = $rdf.graph();

    let prefixes = { xsd: "http://www.w3.org/2001/XMLSchema#" };
    for (let k of Object.keys(des.entities)) {
        let e = des.entities[k];
        let path = k;
        let values = get_values_from(e.include, src);
        for (let i in values) {
            let subject;
            try {
                subject = str_format(e.iri_template, values[i]);
            } catch (err) {
                //print("INFO: Entity skipped because of not fitting in the iri template " + e.iri_template);
                continue;
            }
            if (e.type !== undefined) {
                store.add(
                    $rdf.sym(subject),
                    $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                    $rdf.sym(e.type)
                );
            }
            for (let key of Object.keys(values[i])) {
                let res = handle_item(src, store, prefixes, des, path, key, subject, values[i][key]);
                store.add(res[0], res[1], res[2]);
            }
        }
    }

    print($rdf.Serializer(store).statementsToN3(store.statementsMatching()));

}

main(process.argv);
