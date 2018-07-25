const print = s => console.log(s);
const printj = s => console.log(JSON.stringify(s, null, 2));
const printmj = s => console.log(JSON.stringify(s));
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const xml2js = Promise.promisifyAll(require("xml2js"));
const des_builder = require("./descriptor-builder.js");
const JSONPath = require("JSONPath");
const PathFollower = require("./path-follower.js");
const str_format = require("./str-format.js");
const $rdf = require("rdflib");

function get_values_from_paths(paths, src) {
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
            get_values_from_paths(entity_check.include, src)[0] // It should be only one element as it is a normal object and not an array
        ));
    }
    return rdf_obj;
}

function handle_item(src, store, prefixes, des, path, key, subject, obj) {
    let content_path = path;
    if (key !== "")
        content_path += (key === "[*]" ? key : "." + key);
    let s = des.struct[content_path];
    //print(content_path); // FIXME: from src.json: 's' is undefined at '$[*].retweeted_status.extended_entities.media[*].additional_media_info'
    let p = s.suggested_predicates[0];
    if (p === undefined || p.length === 0) {
        throw `No predicates found for '${key}' at '${content_path}'`;
    }
    let pred = des.prefixes[p.prefix_name];
    if (pred.endsWith('/')) {
        pred = pred.substring(0, pred.length - 2);
    }
    pred += "#" + p.predicate;
    let rdf_subj = subject === undefined ? store.bnode() : store.sym(subject);
    if (s.node_type === 'array') {
        // TODO: implement if it is an array
        content_path += "[*]";
        let arr = get_values_from_paths([content_path], src);
        let rdf_list = [];
        for (let i in arr) {
            for (let k of Object.keys(arr[i])) {
                rdf_list.push(handle_item(src, store, prefixes, des, content_path, k, undefined, get_entity_or_unlabeled(src, des.entities[path + '.' + key])));
            }
        }
        return [
            rdf_subj,
            store.sym(pred),
            store.list([])//rdf_list)
        ];
    } else if (s.node_type === 'object') {
        return [
            rdf_subj,
            store.sym(pred),
            get_entity_or_unlabeled(src, des.entities[path + '.' + key])
        ];
    } else {
        obj = `${obj}`; // rdflib require everything to be string
        let datatype = s.data_types[0];
        let rdf_datatype = datatype === undefined ? undefined : store.sym(`${prefixes["xsd"]}${datatype.split(":")[1]}`);
        prefixes[p.prefix_name] = des.prefixes[p.prefix_name];
        return [
            rdf_subj,
            store.sym(pred),
            store.literal(obj, undefined, rdf_datatype)
        ];
    }
}

// TODO: doc: i||only one: input file, d: only gen des, x: out xml
async function main(args) {

    if (!args.in) args.in = args.i || args._[0];
    if (!args.out_descriptor) args.out_descriptor = args.d;
    if (!args.out_rdf) args.out_rdf = args.r;
    if (!args.init_base) args.init_base = args.b;
    if (!args.format) args.format = args.f;
    if (!args.format && args.out_rdf) args.format = args.out_rdf.split(".")[1] || "ttl";
    if (!args.api) args.api = args.a || "swoogle";

    if (args.help || args.h || !args.in || (!args.out_descriptor && !args.out_rdf)) {
        print(
            `Usage: node rdf-gen.js [OPTION]...
-i, --in=FILE                input file
-d, --out_descriptor=FILE    out descriptor file
-r, --out_rdf=FILE           out RDF file
-b, --init_base=FILE         initial descriptor json file used as a base for the generated descriptor
-f, --format=FORMAT          out RDF format (ttl, xml)
-a, --api=API                predicates finding API (lov, swoogle, test)
-h, --help                   display this help and exit

Example usage:
node rdf-gen.js -i simple.json -r simple-out.ttl -d simple-des.json --api swoogle
`);
        return;
    }

    let sp = args.in.split(".");
    let fname = sp[0];
    let fext = sp[1];

    let src;
    switch (fext) {
    case "json":
        src = JSON.parse(await fs.readFileAsync(args.in, "utf-8"));
        break;
    case "xml":
        src = await xml2js.parseStringAsync(args.in);
        break;
    default:
        throw `Unsupported file extension '${fext}'`;
        return;
    }

    let init = args.init_base ? JSON.parse(await fs.readFileAsync(args.init_base, "utf-8")) : undefined;
    let des = await des_builder.build(src, args.api, init);

    if (args.out_descriptor !== undefined) {
        fs.writeFileAsync(args.out_descriptor, JSON.stringify(des, null, 2));
    }

    if (args.out_rdf !== undefined) {
        let store = $rdf.graph();
        let prefixes = { xsd: "http://www.w3.org/2001/XMLSchema#" };
        for (let k of Object.keys(des.entities)) {
            let e = des.entities[k];
            let path = k;
            let values = get_values_from_paths(e.include, src);
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
                        store.sym(subject),
                        store.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                        store.sym(e.type)
                    );
                }
                for (let key of Object.keys(values[i])) {
                    let res = handle_item(src, store, prefixes, des, path, key, subject, values[i][key]);
                    store.add(res[0], res[1], res[2]);
                }
            }
        }

        let out;
        if (args.format === "xml") {
            out = $rdf.Serializer(store).statementsToXML(store.statementsMatching());
        } else {
            out = $rdf.Serializer(store).statementsToN3(store.statementsMatching());
        }
        fs.writeFileAsync(args.out_rdf, out);
    }

}

main(require('minimist')(process.argv.slice(2)));
