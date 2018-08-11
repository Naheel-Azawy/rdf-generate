const print = s => console.log(s);
const printj = s => console.log(JSON.stringify(s, null, 2));

function matchIndex(str, target) {
    let count = 0;
    for (let i in str) {
        if (str[i] === target[i]) {
            ++count;
        } else {
            break;
        }
    }
    return count;
}

let e = {
    "a.b": {},
    "a.b.c": {},
    "d.e": {}
};

let s = {
    "a.b.name": {},
    "a.b.c.id": {},
    "t.y.z": {}
};

let bases = Object.keys(e);
let base;
for (let p of Object.keys(s)) {
    if (!s[p]) continue;
    let best_match = undefined;
    let best_match_i = 0;
    let count;
    for (let b of bases) {
        let bs = b.split(".").join("");
        let ps = p.split(".").join("");
        let count = matchIndex(bs, ps);
        print(`base: ${bs}, path: ${ps}, match: ${count}`);
        if (count > best_match_i) {
            best_match_i = count;
            best_match = b;
        }
    }
    base = best_match;
    if (best_match) {
        if (!e[base].properties) e[base].properties = {};
        e[base].properties[p] = s[p];
        s[p] = undefined;
    }
}

printj(e);

/*

function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function matchIndex(base, path) {
    base = base.split(".");
    path = path.split(".");
    path.pop();
    let count = 0;
    while (path && path.length !== 0) {
        if (arraysEqual(base, path)) {
            break;
        } else {
            path.pop();
            ++count;
        }
    }
    return count;
}

function addPropertiesTable() {
    // Grouping the properties under the entities
    let e = deepClone(newDes.entities);
    let s = shallowClone(des.struct);
    let base;
    for (let p of Object.keys(s)) {
        if (!s[p]) continue;
        let best_match = undefined;
        let best_match_i = 0;
        let count;
        for (let b of Object.keys(e)) {
            let count = matchIndex(b, p);
            if (count > best_match_i) {
                best_match_i = count;
                best_match = b;
            }
        }
        base = best_match;
        if (best_match) {
            if (!e[base].properties) e[base].properties = {};
            e[base].properties[p] = s[p];
            s[p] = undefined;
        }
    }
    addTable(PROPERTIES_TABLE_TEMPLATE, PROPERTIES_HEADER_TEMPLATE, e);
}

 */



/*


  function addPropertiesTable1() {
  // Grouping the properties under the entities
  let e = deepClone(newDes.entities);
  let s = shallowClone(des.struct);
  for (let p of Object.keys(s)) {
  for (let base of Object.keys(e)) {
  if (!e[base].properties) e[base].properties = {};

  let p_base = p;
  do {
  p_base = p_base.split(".");
  p_base.pop();
  p_base = p_base.join(".");

  print(`${p_base} ${base}`);

  if (s[p] && p_base === base) {
  e[base].properties[p] = s[p];
  s[p] = undefined;
  break;
  }
  } while (p_base);

  if (Object.keys(e[base].properties).length === 0) {
  delete e[base];
  }
  }
  }
  addTable(PROPERTIES_TABLE_TEMPLATE, PROPERTIES_HEADER_TEMPLATE, e);
  }

 */
