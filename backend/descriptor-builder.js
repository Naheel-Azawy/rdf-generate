const print = s => console.log(s);
const PathFollower = require("./path-follower.js");
const Finder = require("./find.js");

class Builder {

    /**
     * The constructor of the Builder class
     * @param {string} api - The API used to find the predicates
     * @param {Object} init - Initial descriptor used as a base for the generated descriptor
     * @param {boolean} no_pred - Prevent finding the predicates
     */
    constructor(api, init, no_pred) {
        // initial descriptor used as a base for the generated descriptor
        this.init = init;
        // allows adding predicates suggestions or not
        this.no_pred = no_pred;
        // output
        this.out = {};
        // the possible entities.
        this.entities = {};
        // RDF prefixes; { name: prefix }
        this.prefixes = {};
        // RDF prefixes (reversed); { prefix: name }
        this.prefixes_rev = {};
        // keeps track of the current path in the tree.
        this.path_follower_inst = new PathFollower();
        // Finds predicates from different places
        this.finder_inst = new Finder(this.prefixes, this.prefixes_rev, api);
        // cache the structure of the entities. if the structure is the same, get the type from the cache.
        this.cached_types = {};
    }

    /**
     * A function for finding the data type of a given Json Attribute value.
     * @param {*[]} values - Values of different types to determine the types
     * @returns {Promise<string[]>} a promise object that represents an array of data types of the passed Json values.
     */
    async find_data_types(values) { // TODO: improve finding the datatypes?
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
     * @param {Object} obj - The object to be checked
     * @param {string} keys - The keys of that object
     * @returns {Promise<boolean>} A promise object represents true if the object is an entity, false otherwise.
     */
    async is_entity(obj, keys) { // TODO: actual implementation for is_entity
        for (let key of keys) {
            key = key.toLowerCase();
            if (key === "id" || key === "identifier") {
                return true;
            }
        }
        return false;
    }

    /**
     *
     * @param {Object} predicates - Predicates associated with the object
     * @param {string[]} obj_keys - Keys of the object
     * @returns {Promise<string>} The type
     */
    async find_entity_type(predicates, obj_keys) { // TODO: actual implementation for find_object_type
        if (this.no_pred) return undefined;
        let cache_key = obj_keys.sort().join();
        let res = this.cached_types[cache_key];
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
            this.cached_types[cache_key] = res;
        }
        return res;
    }

    /**
     * A function for adding an entity to the entities map and assigning the appropriate attributes such as include, type, and the iri. It also uses the values from the 'init' object if available.
     * @param {object} obj - The object to be checked
     * @param {string[]} keys - The keys of that object
     * @param {string} path - Path of that object
     * @param {Object} predicates - Predicates associated with that object
     * @returns {Promise<void>}
     */
    async entity_check(obj, keys, path, predicates) {
        let i, i_inc, i_type, i_tmp;
        if (this.init && this.init.entities && (i = this.init.entities[path])) {
            i_inc = i.include;
            i_type = i.type;
            i_tmp = i.iri_template;
        }
        if (this.init && this.init.entities && !i) { // if init file provided and entity is not there
            return; // do not add it regardless
        }
        if (await this.is_entity(obj, keys)) {
            this.entities[path] = {
                include: i_inc || [ "*" ],
                type: i_type || await this.find_entity_type(predicates, keys),
                iri_template: i_tmp || `https://example.com/{${keys[0]}}`
            };
        }
    }

    /**
     * Gets the type of the parent node
     * @returns {string} The type
     */
    parent_type() {
        let e = this.init;
        if (!e) return undefined;
        e = e.entities;
        if (!e) return undefined;
        let t = this.path_follower_inst.parent();
        if (!t) return undefined;
        t = e[t];
        if (!t) return undefined;
        return t.type;
    }

    /**
     * A Function for iterating through an object or an array of objects to generate the structure of the descriptor. The result ends up in 'this.out'.
     * @param {*} obj - The object to be iterated
     * @param {string} key - The key of this object from the parent node (undefined for the root node)
     * @param {Object} parent_current_predicates - Reference to the predicates object from the parent node
     * @param {*[]} datatypes_values - Values of different types to determine the types of leafs in the object tree.
     * @returns {Promise<void>}
     */
    async iter(obj, key, parent_current_predicates, datatypes_values) {
        let path = this.path_follower_inst.get_path();
        let init, init_p, init_dt;
        if (this.init && this.init.struct && (init = this.init.struct[path])) {
            // node_type and attribute should not be considered here as they should not be changed
            init_p = init.suggested_predicates;
            init_dt = init.data_types;
        }
        if (Array.isArray(obj)) {
            let preds;
            if (!this.no_pred) {
                preds = init_p || await this.finder_inst.find(key, this.parent_type());
            }
            this.out[path] = {
                node_type: "array",
                attribute: key,
                suggested_predicates: preds,
                data_types: undefined // init_dt is ignored here
            };
            this.path_follower_inst.push("[*]");
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
                this.path_follower_inst.push(key);
                let item = { key: key, val:keys[key] };
                let p;
                if (!this.no_pred) {
                    p = await this.finder_inst.find(item.key, this.parent_type());
                }
                await this.iter(item.val, key, current_predicates, values[key]);
                current_predicates[this.path_follower_inst.get_path()] = p;
                this.path_follower_inst.pop();
            }
            let keys_keys = Object.keys(keys);
            await this.entity_check(keys, keys_keys, this.path_follower_inst.get_path(), current_predicates);
            this.path_follower_inst.pop();
        } else if ((typeof obj === "object") && (obj !== null)) {
            let preds;
            if (!this.no_pred) {
                preds = init_p || await this.finder_inst.find(key, this.parent_type());
            }
            this.out[path] = {
                node_type: "object",
                attribute: key,
                suggested_predicates: preds,
                data_types: undefined // init_dt is ignored here
            };
            let keys = Object.keys(obj);
            let val;
            let current_predicates = {};
            for (const key of keys) {
                val = obj[key];
                this.path_follower_inst.push(key);
                await this.iter(val, key, current_predicates);
                this.path_follower_inst.pop();
            }
            await this.entity_check(obj, keys, path, current_predicates);
        } else {
            let p;
            if (!this.no_pred) {
                p = init_p || await this.finder_inst.find(key, this.parent_type());
            }
            let dt = init_dt;
            if (!dt) {
                let values;
                if (datatypes_values === undefined) {
                    values = [obj];
                } else {
                    values = datatypes_values;
                }
                if (parent_current_predicates !== undefined) {
                    parent_current_predicates[path] = p;
                }
                dt = await this.find_data_types(values);
            }
            this.out[path] = {
                node_type: "value",
                attribute: key,
                suggested_predicates: p,
                data_types: dt
            };
        }
    }

    /**
     * Generate the descriptor
     * @param {Object} src - The source object
     * @returns {Object} The descriptor file
     */
    async build(src) {
        await this.iter(src);
        if (this.init && this.init.prefixes)
            this.prefixes = {...this.prefixes, ...this.init.prefixes};
        return {
            prefixes: this.prefixes,
            struct: this.out,
            entities: this.entities
        };
    }
}

module.exports = {
    /**
     * A Function for building the descriptor.
     * @param {*} src - The source object
     * @param {string} api - The API used to find the predicates
     * @param {Object} init - Initial descriptor used as a base for the generated descriptor
     * @param {boolean} no_pred - Prevent finding the predicates
     * @returns {Promise<Object>} The descriptor!
     */
    build: async (src, api, init, no_pred) => new Builder(api, init, no_pred).build(src)
};

