
const print = s => console.log(s);

function obj_at(obj, path) {
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
    followers: [
        { name: "aaa", id: 1 },
        { name: "bbb", id: 2 },
    ]
};

const APIS = {
    swoogle: require("./find-swoogle.js"),
    lov: require("./find-lov.js")
};

async function find_predicates(item) {
    return [];//await APIS.swoogle(item.key);
}

async function find_data_type(item) { // TODO: improve finding the datatypes
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

async function handle_item(item) {
    return {
        attribute: item.key,
        value: item.val,
        suggested_predicates: await find_predicates(item),
        data_type: await find_data_type(item)
    };
}

async function is_entity(obj) { // TODO: improve is_entity logic
    let res = false;
    for (let key of Object.keys(obj)) {
        key = key.toLowerCase();
        if (key === "id" || key == "identifier") {
            res = true;
            break;
        }
    }
    return res;
}

let entities = [];
let path_stack = [];

async function iter(obj, key) {
    if (Array.isArray(obj)) {
        let arr = [];
        for (let i = 0; i < obj.length; ++i) {
            path_stack.push(i);
            arr.push(await iter(obj[i]));
            path_stack.pop();
        }
        return arr;
    } else if ((typeof obj === "object") && (obj !== null)) {
        let o = {};
        let val;
        for (const key of Object.keys(obj)) {
            val = obj[key];
            path_stack.push(key);
            o[key] = await iter(val, key);
            path_stack.pop();
        }
        // TODO: catch the structure of the entities. if the structure is the same, get the type from the catch
        if (await is_entity(obj)) {
            entities.push({
                path: path_stack.join("/"), // FIXME: entities paths are empty
                type: "TODO: find the type"
            });
        }
        return o;
    } else {
        return await handle_item({key:key, val:obj});
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


