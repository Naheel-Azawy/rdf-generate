const base = require("./find-base.js");

/**
 * A function for suggesting predicates from the API
 * @param {string} property
 * @returns {*} The result of the property look up request parsed into json.
 */
function suggest(property) {
    return base.request_json("http://lov.okfn.org/dataset/lov/api/v2/term/suggest?type=property&q=" + property);
}

/**
 * A function for changing the api's format to the required format and sort the result according to the associated score.
 * @param {Object[]} results
 * @param {string} property
 * @returns {Object[]}  Array of predicates sorted by the highest score.
 */
function find_helper(results, property) {
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
    for (let i = 0; i < arr.length; ++i) {
        if (arr[i].predicate === property) {
            arr[i].score = max + 1;
        }
    }
    return arr;
}

/**
 *  A function  for finding predicates from the API for a given property.
 * @param {string} property
 * @returns {Promise<*>} The result of the property look up request parsed into json.
 * @throws {err} //CHECK
 */
async function find(property) {
    const URL = "http://lov.okfn.org/dataset/lov/api/v2/term/search?type=property&q=";
    try {
        let response = await base.request_json(URL + property);
        let results = response.results;
        let arr;
        if (results.length === 0) {
            arr = [];
            let suggestions_res = await suggest(property.replace("_", "+"));
            let suggestions = suggestions_res.suggestions;
            for (let i = 0; i < suggestions.length; ++i) {
                property = suggestions[i].text;
                let new_response = await base.request_json(URL + property);
                let results = new_response.results;
                results = find_helper(results, property);
                arr = arr.concat(results);
            }
            arr.sort((a, b) => b.score - a.score);
        } else {
            arr = find_helper(results, property);
            arr.sort((a, b) => b.score - a.score);
        }
        return arr;
    } catch (err) {
        console.log(err);
        return err;
    }
}

module.exports = find;
