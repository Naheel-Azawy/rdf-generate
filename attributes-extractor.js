
const print = s => console.log(s);

function obj_at_path(obj, path) {
    let keys = path.split("/");
    for (let i = 0; i < keys.length; ++i) {
        obj = obj[keys[i]];
    }
    return obj;
}

let src_old = {
    aaaa: "a",
    bbbb: "b",
    cccc: {
        dddd: "d",
        eeee: "e",
        xxxx: [1,2,3],
        yyyy: [{a:1,c:2}, {b:2}]
    },
    ffff: "f"
};

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
        { name: "aaa", id: 1 },
        { name: "bbb", id: 2 },
    ]
};

// the possible entities.
let entities = {};
// keeps track of the current path in the tree.
let path_stack = [];
// catch the structure of the entities. if the structure is the same, get the type from the catch.
let catched_types = {};
// predicates catch
let catched_predicates = {};

const APIS = {
    swoogle: require("./find-swoogle.js"),
    lov: require("./find-lov.js")
};

function get_path() {
    return "/" + path_stack.join("/");
}

async function find_predicates(item) {
    let p = catched_predicates[item.key];
    if (p === undefined) {
        p = await APIS.swoogle(item.key);
        catched_predicates[item.key] = p;
    }
    return p;
}

async function find_data_type(item) { // TODO: improve finding the datatypes?
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

async function handle_item(item, predicates) {
    return {
        attribute: item.key,
        value: item.val,
        suggested_predicates: predicates,
        data_type: await find_data_type(item)
    };
}

async function is_entity(obj, keys) { // TODO: actual implementation for is_entity
    for (let key of keys) {
        key = key.toLowerCase();
        if (key === "id" || key == "identifier") {
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

async function iter(obj, key, parent_current_predicates) {
    if (Array.isArray(obj)) {
        let arr = [];
        for (let i = 0; i < obj.length; ++i) {
            path_stack.push(i);
            arr.push(await iter(obj[i]));
            path_stack.pop();
        }
        return arr;
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
        let res = await handle_item(item, p);
        parent_current_predicates[get_path()] = p;
        return res;
    }
}

async function main() {
    let items = await iter(src);
    let res = {
        items: items,
        entities: entities
    };
    print(JSON.stringify(res));
    //print(res);
}

main();


