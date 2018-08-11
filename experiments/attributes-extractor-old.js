// Object.getOwnPropertyNames(obj)

let src = {
    aaaa: "a",
    bbbb: "b",
    cccc: {
        dddd: "d",
        eeee: "e",
        xxxx: [1,2,3], // FIXME!!!
        yyyy: [{a:1,c:2}, {b:2}]
    },
    ffff: "f"
};

let tst = {
    aaaa: {
        attribute: "aaaa",
        suggested_predicates: ["..."],
        data_type: ["..."],
        parent: undefined,
        is_entity: false
    }
};

function handle_obj(obj) {
    return {new: obj};
}

const print = s => console.log(s);

function iter(obj) {
    if (Array.isArray(obj)) {
        let arr = [];
        for (let i = 0; i < obj.length; ++i) {
            arr.push(iter(obj[i]));
        }
        return arr;
    } else if ((typeof obj === "object") && (obj !== null)) {
        
    } else {
        return handle_obj(obj);
    }
}

let res = iter([1,2,3]);

print(res);
//print(JSON.stringify(out));

let out = {};
let out_node = out;

function iter_old(obj, arr) {
    Object.entries(obj).forEach(([key, val]) => {
        if (Array.isArray(val)) {
            let parent = out_node;
            out_node[key] = [];
            out_node = out_node[key];
            for (let i = 0; i < val.length; ++i) {
                iter(val[i], out_node);
            }
            out_node = parent;
        } else if ((typeof val === "object") && (val !== null)) {
            let parent = out_node;
            out_node[key] = {};
            out_node = out_node[key];
            iter(val);
            out_node = parent;
        } else {
            if (arr !== undefined) {
                out_node.push(obj);
            } else
            out_node[key] = handle_obj(val);
        }
    });
}

//iter(src, (key, val, parent) => print(parent + ": " + key + " " + val));

