const print = s => console.log(s);

// the possible entities.
let entities = {};
// keeps track of the current path in the tree.
let path_stack = [];
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
    }
    return p;
}

async function find_data_type(item) { // TODO: improve finding the datatypes?
    // More types: https://www.w3.org/2011/rdf-wg/wiki/XSD_Datatypes
    if (typeof(item.val) === "boolean") {
        return "xsd:boolean";
    } else if (typeof(item.val) === "number") {
        return "xsd:decimal";
    } else if (!isNaN(Date.parse(item.val))) {
        return "xsd:date";
    } else if (typeof(item.val) === "string") {
        return "xsd:string";
    } else {
        return null;
    }
}

async function handle_item(item, predicates, ignore_value) {
    let v = ignore_value ? undefined : item.val;
    return {
        path: get_path(),
        attribute: item.key,
        value: v,
        suggested_predicates: predicates,
        data_type: await find_data_type(item)
    };
}

async function handle_array(arr) {
    path_stack.push("[*]");
    let keys = {};
    for (let i in arr) {
        for (let key of Object.keys(arr[i])) {
            keys[key] = arr[i][key]; // TODO: if not all of them are of the same type. example: [ {a:1}, {a:"a"} ]
        }
    }
    let current_predicates = {};
    let struct = Object.assign({}, keys);
    for (let key of Object.keys(keys)) {
        path_stack.push(key);
        let item = { key: key, val:keys[key] };
        let p = await find_predicates(item);
        //struct[key] = await handle_item(item, p, true);
        struct[key] = await iter(item.val, key, current_predicates, true);
        current_predicates[get_path()] = p;
        path_stack.pop();
    }
    let keys_keys = Object.keys(keys);
    if (await is_entity(keys, keys_keys)) {
        entities[get_path()] = {
            type: await find_object_type(current_predicates, keys_keys)
        };
    }
    path_stack.pop();
    return {
        __type: "array",
        struct: struct,
        values: arr
    };
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

async function iter(obj, key, parent_current_predicates, ignore_value) {
    if (Array.isArray(obj)) {
        /*let arr = [];
        for (let i = 0; i < obj.length; ++i) {
            path_stack.push(i);
            arr.push(await iter(obj[i]));
            path_stack.pop();
        }
        return arr;*/
        return handle_array(obj);
    } else if ((typeof obj === "object") && (obj !== null)) {
        let path = get_path();
        let keys = Object.keys(obj);
        let o = {};
        let val;
        let current_predicates = {};
        for (const key of keys) {
            val = obj[key];
            path_stack.push(key);
            o[key] = await iter(val, key, current_predicates);
            path_stack.pop();
        }
        if (await is_entity(obj, keys)) {
            entities[path] = {
                type: await find_object_type(current_predicates, keys)
            };
        }
        return o;
    } else {
        let item = {key:key, val:obj};
        let p = await find_predicates(item);
        let res = await handle_item(item, p, ignore_value);
        parent_current_predicates[get_path()] = p;
        return res;
    }
}

module.exports = {
    extract: async src => {
        let items = await iter(src);
        return {
            items: items,
            entities: entities
        };
    }
};

