const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
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

function mkdirs(api) {
    let dir = "find-catch";
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir);
    dir += "/" + api;
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir);
    return dir;
}

module.exports = class Finder {

    /**
     * The Finder's constructor
     * @param {Object} prefixes - Pointer to the prefixes
     * @param {Object} prefixes_rev - Pointer to the reversed prefixes
     */
    constructor(prefixes, prefixes_rev, api) {
        this.catched_predicates = {};
        this.prefixes = prefixes;
        this.prefixes_rev = prefixes_rev;
        this.api = api;
    }

    /**
     * A function for finding predicates for a given Json Attribute (Item).
     * @param {string} property - The property name to be found
     * @param {string} type - The type of the object containing this predicate (optional)
     * @param {string} api - The source of the data (optional)
     * @returns {Promise<Object[]>} A list of predicates.
     */
    async find(property, type, api) {
        if (property === undefined)
            return undefined;
        let p = this.catched_predicates[property];
        if (p === undefined) {
            if (api === undefined)
                api = this.api || "lov";
            let f = mkdirs(api) + "/" + property;
            if (type !== undefined) {
                f += "_" + type;
            }
            f += ".json";
            try {
                p = JSON.parse(await fs.readFileAsync(f, "utf-8"));
            } catch (err) {
                p = await APIS[api](property);
                //if (Object.keys(p).length !== 0) // write to disk if p is not empty
                // or keep them? because this means that there are no results and there's no
                // need to keep requesting everytime
                fs.writeFileAsync(f, JSON.stringify(p, null, 2), "utf-8"); // No need to await
            }
            this.catched_predicates[property] = p;
            let ns, pr;
            for (let i in p) {
                if (this.prefixes_rev[p[i].prefix] === undefined) {
                    ns = p[i].prefix_name;
                    pr = p[i].prefix;
                    this.prefixes_rev[pr] = ns;
                    this.prefixes[ns] = pr;
                }
                p[i].prefix_name = this.prefixes_rev[p[i].prefix];
                p[i].prefix = undefined;
            }
        }
        return p;
    }
};
