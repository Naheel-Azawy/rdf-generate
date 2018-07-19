const print = s => console.log(s);
const PathFollower = require("./path-follower.js");

// output
let out;
// the possible entities.
let entities;
// RDF prefixes; { name: prefix }
let prefixes;
// RDF prefixes (reversed); { prefix: name }
let prefixes_rev;
// keeps track of the current path in the tree.
let path_follower_inst;
// catch the structure of the entities. if the structure is the same, get the type from the catch.
let catched_types = {};
// predicates catch
let catched_predicates = {};

const APIS = {
    test: prop => [{
        prefix: "http://example.com",
        prefix_name: "e",
        predicate: prop,
        score: 0
    }],
    swoogle: require("./find-swoogle.js"),
    lov: require("./find-lov.js")
};

async function find_predicates(item) {
    let p = catched_predicates[item.key];
    if (p === undefined) {
        p = await APIS.test(item.key);
        catched_predicates[item.key] = p;
        let ns, pr;
        for (let i in p) {
            if (prefixes_rev[p[i].prefix] === undefined) {
                ns = p[i].prefix_name;
                pr = p[i].prefix;
                prefixes_rev[pr] = ns;
                prefixes[ns] = pr;
            }
            p[i].prefix_name = prefixes_rev[p[i].prefix];
            p[i].prefix = undefined;
        }
    }
    return p;
}

async function find_data_types(values) { // TODO: improve finding the datatypes?
    // More types: https://www.w3.org/2011/rdf-wg/wiki/XSD_Datatypes
    let map = {}; // This is an object and not an array to keep it unique
    let v;
    for (let i in values) {
        v = values[i];
        if (typeof(v) === "boolean") {
            map["xsd:boolean"] = 0;
        } else if (typeof(v) === "number") {
            map["xsd:decimal"] = 0;
        } else if (!isNaN(Date.parse(v))) {
            map["xsd:date"] = 0;
        } else if (typeof(v) === "string") {
            map["xsd:string"] = 0;
        }
    }
    return Object.keys(map);
}

async function is_entity(obj, keys) { // TODO: actual implementation for is_entity
    for (let key of keys) {
        key = key.toLowerCase();
        if (key === "id" || key === "identifier") {
            return true;
        }
    }
    return false;
}

async function find_object_type(predicates, obj_keys) { // TODO: actual implementation for find_object_type
    let catch_key = obj_keys.sort().join();
    let res = catched_types[catch_key];
    if (res === undefined) {
        let keys = Object.keys(predicates);
        let p, arr;
        for (const key of keys) {
            arr = predicates[key];
            for (let i = 0; i < arr.length; ++i) {
                p = arr[i].predicate.toLowerCase();
                if (p === "age") {
                    res = "http://schema.org/Person";
                    break;
                } else if (p === "name") {
                    res = "http://schema.org/Thing";
                    break;
                }
            }
        }
        catched_types[catch_key] = res;
    }
    return res;
}

async function iter(obj, key, parent_current_predicates, datatypes_values) {
    if (Array.isArray(obj)) {
        path_follower_inst.push("[*]");
        let keys = {};
        let values = {}; // stores the values for every key. Important for finding the types.
        for (let i in obj) {
            for (let key of Object.keys(obj[i])) {
                keys[key] = obj[i][key];
                if (values[key] === undefined)
                    values[key] = [];
                values[key].push(keys[key]);
            }
        }
        let current_predicates = {};
        for (let key of Object.keys(keys)) {
            path_follower_inst.push(key);
            let item = { key: key, val:keys[key] };
            let p = await find_predicates(item);
            await iter(item.val, key, current_predicates, values[key]);
            current_predicates[path_follower_inst.get_path()] = p;
            path_follower_inst.pop();
        }
        let keys_keys = Object.keys(keys);
        if (await is_entity(keys, keys_keys)) {
            entities[path_follower_inst.get_path()] = {
                type: await find_object_type(current_predicates, keys_keys)
                // TODO: whitelist and blacklist; jsonpath for nested items
            };
        }
        path_follower_inst.pop();
    } else if ((typeof obj === "object") && (obj !== null)) {
        let path = path_follower_inst.get_path();
        let keys = Object.keys(obj);
        let val;
        let current_predicates = {};
        for (const key of keys) {
            val = obj[key];
            path_follower_inst.push(key);
            await iter(val, key, current_predicates);
            path_follower_inst.pop();
        }
        if (await is_entity(obj, keys)) {
            entities[path] = {
                type: await find_object_type(current_predicates, keys)
            };
        }
    } else {
        let path = path_follower_inst.get_path();
        let item = {key:key, val:obj};
        let p = await find_predicates(item);
        let values;
        if (datatypes_values === undefined) {
            values = [item.val];
        } else {
            values = datatypes_values;
        }
        if (parent_current_predicates !== undefined) {
            parent_current_predicates[path] = p;
        }
        out[path] = {
            attribute: item.key,
            suggested_predicates: p,
            data_types: await find_data_types(values)
        };
    }
}

module.exports = {
    extract: async src => {
        out = {};
        entities = {};
        prefixes = {};
        prefixes_rev = {};
        path_follower_inst = new PathFollower();
        await iter(src);
        return {
            prefixes: prefixes,
            struct: out,
            entities: entities,
            values: src
        };
    }
};

