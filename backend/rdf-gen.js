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

function nullify(obj) {
    for (let k of Object.keys(obj)) {
        if ((typeof obj[k] === "object") && (obj[k] !== null)) {
            obj[k] = nullify(obj[k]);
        } else {
            obj[k] = null;
        }
    }
    return obj;
}

function get_values_from_paths_helper(obj, path) {
    if (path.length === 0) {
        return obj;
    }
    path.shift();
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; ++i) {
            obj[i] = get_values_from_paths_helper(obj[i], path);
        }
    } else if ((typeof obj === "object") && (obj !== null)) {
        for (let k of Object.keys(obj)) {
            obj[k] = get_values_from_paths_helper(obj[k], path);
        }
    }
    return obj;
}

let sss = {
    aaa: 123,
    test: [
        {id: 0, name: "aaa"},
        {id: 1, name: "bbb", aaa: {i:1,y:[{i:0, j:1}]}},
        {id: 2, name: "ccc"},
        {id: 3, name: "ddd", aaa: {i:2, j:943, k: {l:5}}}
    ]
};
let aaa = ["id", "name", "aaa"];
let bbb = "$.test[*]";

function get_values_from_paths(base, paths, src) {
    // This is just for testing
    let res = JSONPath({path: base, json: src});
    if (paths.includes("*")) {
        return res;
    }
    for (let i in res) {
        for (let k of Object.keys(res[i])) {
            if (!paths.includes(k)) {
                res[i][k] = undefined;
            }
        }
    }
    return res;

    let arr = []; // the final result
    for (let path of paths) {
        if (base) {
            path = `${base}.${path}`;
        }
        path = path.split('.');
        let k = path.pop();
        path = path.join('.');
        let res = JSONPath({path: path, json: src});
        // checking the parent if it contains this element
        let p_parent = path.split('.');
        let k_parent = p_parent.pop();
        p_parent = p_parent.join('.');
        p_parent = JSONPath({path: p_parent, json: src});
        let availability_array = [];
        for (let i in p_parent) {
            if (p_parent[i][k_parent]) {
                availability_array.push(i);
            }
        }
        // adding the results to 'arr'
        for (let i in res) {
            let j = availability_array[i] || i;
            if (!arr[j]) {
                arr[j] = {};
            }
            if (k === "*") {
                arr[j] = {...arr[j], ...res[i]};
            } else {
                arr[j][k] = res[i][k];
            }
        }
    }
    // removing garbage
    for (let i = 0; i < arr.length; ++i) {
        if (!arr[i]) { // removing undefined items
            arr.splice(i, 1);
        } else { // removing items with keys of undefined values. e.g. : { aaa: undefined }
            let keys = Object.keys(arr[i]);
            let all_undefined = true;
            for (let k of keys) {
                if (arr[i][k]) {
                    all_undefined = false;
                }
            }
            if (all_undefined) {
                arr.splice(i, 1);
            }
        }
    }
    return arr;
}

function get_entity_or_unlabeled(src, entity_check, path) {
    let rdf_obj;
    if (entity_check === undefined) {
        // TODO: create an unlabeled blank node
        rdf_obj = $rdf.literal("nothing");
    } else {
        rdf_obj = $rdf.sym(str_format(
            entity_check.iri_template,
            get_values_from_paths(path, entity_check.include, src)[0] // It should be only one element as it is a normal object and not an array
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
        let arr = JSONPath({path: content_path, json: src});
        let rdf_list = [];
        for (let i in arr) {
            for (let k of Object.keys(arr[i])) {
                rdf_list.push(handle_item(src, store, prefixes, des, content_path, k, undefined, get_entity_or_unlabeled(src, des.entities[path + '.' + key], k)));
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
            get_entity_or_unlabeled(src, des.entities[path + '.' + key], path + '.' + key)
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

/**
 * The main function here that will generate the output.
 * @param {Object} args - Options to this function: { returned_value: (DES or OUT), in_obj: OBJ, init_base_obj: OBJ, in: FILE, out_descriptor: FILE, out_rdf: FILE, init_base: FILE, no_pred: BOOL, format: FORMAT, api: API }
 * @returns {Promise<void>}
 */
async function run(args) {

    //printj(args.in_obj);

    let sp = args.in ? args.in.split("/") : undefined;
    sp = sp ? sp[sp.length - 1].split(".") : undefined;
    let fname = sp ? sp[0] : undefined;
    let fext = sp ? sp[1] : undefined;

    let src;
    switch (fext) {
    case undefined:
    case "json":
        src = args.in_obj || JSON.parse(await fs.readFileAsync(args.in, "utf-8"));
        break;
    default:
        throw `Unsupported file extension '${fext}'`;
        return undefined;
    }

    let init = args.init_base_obj || (args.init_base ? JSON.parse(await fs.readFileAsync(args.init_base, "utf-8")) : undefined);
    let des = await des_builder.build(src, args.api, init, args.no_pred);

    if (args.out_descriptor || args.returned_value === "DES") {
        let des_str = JSON.stringify(des, null, 2);
        if (args.out_descriptor)
            fs.writeFileAsync(args.out_descriptor, des_str);
        return des_str;
    }

    if (args.out_rdf || args.returned_value === "OUT") {
        let store = $rdf.graph();
        let prefixes = { xsd: "http://www.w3.org/2001/XMLSchema#" };
        for (let k of Object.keys(des.entities)) {
            let e = des.entities[k];
            let path = k;
            let values = get_values_from_paths(k, e.include, src);
            //print(values);
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
        if (args.out_rdf)
            fs.writeFileAsync(args.out_rdf, out);
        return out;
    }

    return undefined;
}

async function main(args) {

    printj(get_values_from_paths(bbb, aaa, sss));
    return;

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

    run(args);

}

main(require('minimist')(process.argv.slice(2)));

module.exports = run;
