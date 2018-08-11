const print = s => console.log(s);
const printj = s => console.log(JSON.stringify(s, null, 2));
const printmj = s => console.log(JSON.stringify(s));
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const JSONPath = require("JSONPath");

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


printj(get_values_from_paths(bbb, aaa, sss));
