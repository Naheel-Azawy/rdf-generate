const print = s => console.log(s);

// output
let out;
// the possible entities.
let entities;
// RDF prefixes; { name: prefix }
let prefixes;
// RDF prefixes (reversed); { prefix: name }
let prefixes_rev;
// RDF prefixes count
let prefixes_count;
// keeps track of the current path in the tree.
let path_stack;
// catch the structure of the entities. if the structure is the same, get the type from the catch.
let catched_types;
// predicates catch
let catched_predicates;

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

function get_path() {
    let res = "$";
    for (let i = 0; i < path_stack.length; ++i) {
        if (typeof(path_stack[i]) === "number") {
            res += '[' + path_stack[i] + ']';
        } else if (path_stack[i][0] === '[') {
            res += path_stack[i];
        } else {
            res += '.' + path_stack[i];
        }
    }
    return res;
}

async function find_predicates(item) {
    let p = catched_predicates[item.key];
    if (p === undefined) {
        p = await APIS.test(item.key);
        catched_predicates[item.key] = p;
        let ns, pr;
        for (let i in p) {
            if (prefixes_rev[p[i].prefix] === undefined) {
                ns = "ns" + prefixes_count++;
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
    let res = [];
    let v;
    for (let i in values) {
        v = values[i];
        if (typeof(v) === "boolean") {
            res.push("xsd:boolean");
        } else if (typeof(v) === "number") {
            res.push("xsd:decimal");
        } else if (!isNaN(Date.parse(v))) {
            res.push("xsd:date");
        } else if (typeof(v) === "string") {
            res.push("xsd:string");
        }
    }
    return res;
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
        path_stack.push("[*]");
        let keys = {};
        let types = {};
        for (let i in obj) {
            for (let key of Object.keys(obj[i])) {
                keys[key] = obj[i][key]; // TODO: if not all of them are of the same type. example: [ {a:1}, {a:"a"} ]
                // data_type is an array, check the type while generating the ttl, if not in the array, throw an exceptioon.
                if (types[key] === undefined)
                    types[key] = {}; // This is an object and not an array to keep it unique
                types[key][typeof(keys[key])] = keys[key]; // TODO: what if string but different types? (ie string and date)
            }
        }
        let current_predicates = {};
        for (let key of Object.keys(keys)) {
            path_stack.push(key);
            let item = { key: key, val:keys[key] };
            let p = await find_predicates(item);
            await iter(item.val, key, current_predicates, types[key]);
            current_predicates[get_path()] = p;
            path_stack.pop();
        }
        let keys_keys = Object.keys(keys);
        if (await is_entity(keys, keys_keys)) {
            entities[get_path()] = {
                type: await find_object_type(current_predicates, keys_keys)
                // TODO: whitelist and blacklist; jsonpath for nested items
            };
        }
        path_stack.pop();
    } else if ((typeof obj === "object") && (obj !== null)) {
        let path = get_path();
        let keys = Object.keys(obj);
        let val;
        let current_predicates = {};
        for (const key of keys) {
            val = obj[key];
            path_stack.push(key);
            await iter(val, key, current_predicates);
            path_stack.pop();
        }
        if (await is_entity(obj, keys)) {
            entities[path] = {
                type: await find_object_type(current_predicates, keys)
            };
        }
    } else {
        let item = {key:key, val:obj};
        let p = await find_predicates(item);
        let types;
        if (datatypes_values === undefined) {
            types = [item.val];
        } else {
            types = Object.values(datatypes_values);
        }
        res = {
            attribute: item.key,
            suggested_predicates: p,
            data_type: await find_data_types(types)
        };
        let path = get_path();
        parent_current_predicates[path] = p;
        out[path] = res;
    }
}

module.exports = {
    extract: async src => {
        out = {};
        entities = {};
        prefixes = {};
        prefixes_rev = {};
        prefixes_count = 0;
        path_stack = [];
        catched_types = {};
        catched_predicates = {};
        await iter(src);
        return {
            prefixes: prefixes,
            struct: out,
            entities: entities,
            values: src
        };
    }
};

