const print = s => console.log(s);
const PathFollower = require("./path-follower.js");

// output
let out;
// the possible entities.
let entities;
// entities counter used for naming
let entities_count;
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
        prefix: "https://example.com",
        prefix_name: "e",
        predicate: prop,
        score: 0
    }],
    swoogle: require("./find-swoogle.js"),
    lov: require("./find-lov.js")
};

/**
 * A function for finding predicates for a given Json Attribute (Item).
 * @param {Object} item - An object the contains a key and a value for a Json Attribute. // TODO: Check for  writing OBJECT as a datatype here
 * @returns {Promise<*>} A list of predicates.
 */
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

/**
 * A function for finding the data type of a given Json Attribute value.
 * @param {*[]} values.
 * @returns {Promise<string[]>} a promise object that represents an array of data types of the passed Json values.
 */
async function find_data_types(values) { // TODO: improve finding the datatypes?
    // More types: https://www.w3.org/2011/rdf-wg/wiki/XSD_Datatypes
    let map = {}; // This is an object and not an array to keep it unique
    for (let v of values) {
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

/**
 * A function for determining whether a given object is an entity.
 * @param {Object} obj
 * @param {string} keys
 * @returns {Promise<boolean>} A promise object represents true if the object is an entity, false otherwise.
 */

async function is_entity(obj, keys) { // TODO: actual implementation for is_entity
    for (let key of keys) {
        key = key.toLowerCase();
        if (key === "id" || key === "identifier") {
            return true;
        }
    }
    return false;
}
/**
 * A function for adding an entity to the entities list and assigning the appropriate attributes such as include, type, and the iri.
 * @param {object} obj
 * @param {string[]} keys
 * @param {string} path
 * @param {Object} predicates
 * @returns {Promise<void>}
 */

async function entity_check(obj, keys, path, predicates) {
    if (await is_entity(obj, keys)) {
        //entities["entity_" + entities_count++] = {
        entities[path] = {
            include: [ path ],
            type: await find_entity_type(predicates, keys),
            iri_template: `https://example.com/{${keys[0]}}`
        };
    }
}
/**
 *
 * @param {Object} predicates
 * @param {string[]} obj_keys
 * @returns {Promise<string>}
 */
async function find_entity_type(predicates, obj_keys) { // TODO: actual implementation for find_object_type
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

/**
 * A Function for iterating through a json object or an array of json objects to generate the structure of the descriptor.
 * @param {*} obj
 * @param {string} key
 * @param {Object} parent_current_predicates
 * @param {*[]} datatypes_values
 * @returns {Promise<void>}
 */
async function iter(obj, key, parent_current_predicates, datatypes_values) {
    if (Array.isArray(obj)) {
        out[path_follower_inst.get_path()] = {
            node_type: "array",
            attribute: key,
            suggested_predicates: await find_predicates({key:key}),
            data_types: undefined
        };
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
        await entity_check(keys, keys_keys, path_follower_inst.get_path(), current_predicates);
        path_follower_inst.pop();
    } else if ((typeof obj === "object") && (obj !== null)) {
        let path = path_follower_inst.get_path();
        out[path] = {
            node_type: "object",
            attribute: key,
            suggested_predicates: await find_predicates({key:key}),
            data_types: undefined
        };
        let keys = Object.keys(obj);
        let val;
        let current_predicates = {};
        for (const key of keys) {
            val = obj[key];
            path_follower_inst.push(key);
            await iter(val, key, current_predicates);
            path_follower_inst.pop();
        }
        await entity_check(obj, keys, path, current_predicates);
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
            node_type: "value",
            attribute: item.key,
            suggested_predicates: p,
            data_types: await find_data_types(values)
        };
    }
}

module.exports = {
    /**
     * A Function for building the descriptor.
     * @param {*} src
     * @returns {Promise<Object>}
     */
    build: async src => {
        out = {};
        entities = {};
        entities_count = 0;
        prefixes = {};
        prefixes_rev = {};
        path_follower_inst = new PathFollower();
        await iter(src);
        return {
            prefixes: prefixes,
            struct: out,
            entities: entities
        };
    }
};

