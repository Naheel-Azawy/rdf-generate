const base = require("./find-base.js");
const $rdf = require("rdflib");

/**
 *  A function  for finding predicates from the API for a given property.
 * @param {string} property
 * @returns {Promise<*>} The result of the property look up request parsed into json.
 * @throws {err}
 */
async function find(property) {
    const URL = "http://swoogle.umbc.edu/2006/index.php?option=com_frontpage&service=search&queryType=search_swd_ontology&view=raw&searchString=";
    try {
        let response = await base.request(URL + property);
        let uri = 'https://example.org/resource.ttl';
        let store = $rdf.graph();
        $rdf.parse(response, store, uri, "application/rdf+xml");
        let stms = store.statementsMatching(undefined, undefined , undefined);
        let arr = [];
        let prefixes = {};
        let prefixes_count = 0;
        let x, xn, v;
        for (let i = 0; i < stms.length; ++i) {
            if (stms[i].predicate.value === 'http://daml.umbc.edu/ontologies/webofbelief/1.4/swoogle.owl#hasDescDef') {
                v = stms[i].object.value;
                v = v.substring(v.indexOf("<B>") + 3, v.indexOf("</B>"));
                x = stms[i].subject.value;
                if (prefixes[x] == undefined)
                    prefixes[x] = "p" + prefixes_count++;
                xn = prefixes[x];
                arr.push({
                    prefix: x,
                    prefix_name: xn,
                    predicate: v,
                    score: 0
                });
            }
        }
        return arr;
    } catch (err) {
        console.log(err);
        return err;
    }
}

module.exports = find;
