const base = require("./find-base.js");

/**
 * A function for suggesting predicates from the API
 * @param {string} property
 * @returns {*} The result of the property look up request parsed into json.
 */
function suggest(property) {
    return base.request_json("https://lov.okfn.org/dataset/lov/api/v2/term/suggest?type=property&q=" + property);
}

/**
 * A function for changing the api's format to the required format and sort the result according to the associated score.
 * @param {Object[]} results
 * @param {string} property
 * @param {Object[]} classes
 * @returns {Object[]}  Array of predicates sorted by the highest score.
 */
function find_helper(results, property, classes) {
    var arr = [];
    let max = 0;
    let sp;
    for (var i = 0; i < results.length; ++i) {
        if (results[i].score > max)
            max = results[i].score;
        sp = results[i].prefixedName[0].split(":");
        arr.push({
            prefix: results[i].uri[0],
            prefix_name: sp[0],
            predicate: sp[1],
            score: results[i].score
        });
    }
    max += 1;
    for (let i = 0; i < arr.length; ++i) {
        if (arr[i].predicate === property) {
            arr[i].score += max;
        }
        if (classes) {
            let cs = classes[arr[i].prefix_name];
            if (cs) {
                arr[i].score += cs.score;
            }
        }
    }
    return arr;
}

/**
 * A function for finding classes from the API
 * @param {string} cls - The class (type) associated with this predicate
 * @returns {Promise<Object>} Classes map.
 */
async function find_class(cls) {
    const URL = "https://lov.linkeddata.es/dataset/lov/api/v2/term/search?type=class&q=";
    try {
        let responce = await base.request_json(URL + cls);
        let results = responce.results;
        let final_results = {};
        for (let i in results) {
            final_results[results[i]["vocabulary.prefix"][0]] = {
                uri: results[i].uri[0],
                prefix_name: results[i].prefixedName[0],
                score: results[i].score
            };
        }
        return final_results;
    } catch (err) {
        console.log(err);
        return err;
    }
}

/**
 * A function for finding predicates from the API for a given property.
 * @param {string} property - The property name to be found
 * @param {string} cls - The class (type) associated with this predicate
 * @returns {Promise<Object[]>} A list of predicates.
 */
async function find(property, cls) {
    const URL = "https://lov.okfn.org/dataset/lov/api/v2/term/search?type=property&q=";
    try {
        let classes;
        if (cls) {
            classes = await find_class(cls);
        }
        let response = await base.request_json(URL + property);
        let results = response.results;
        let arr;
        if (results.length === 0) {
            arr = [];
            let suggestions_res = await suggest(property.split("_").join("+"));
            let suggestions = suggestions_res.suggestions;
            for (let i = 0; i < suggestions.length; ++i) {
                property = suggestions[i].text;
                let new_response = await base.request_json(URL + property);
                let results = new_response.results;
                results = find_helper(results, property, classes);
                arr = arr.concat(results);
            }
            arr.sort((a, b) => b.score - a.score);
        } else {
            arr = find_helper(results, property, classes);
            arr.sort((a, b) => b.score - a.score);
        }
        return arr;
    } catch (err) {
        console.log(err);
        return err;
    }
}

module.exports = find;
