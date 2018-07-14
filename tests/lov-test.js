let fs = require('fs');
let request = require("request");

function request_json(url) {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) {
                reject(error);
            } else {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            }
        });
    });
}

function suggest(property) {
    return request_json("http://lov.okfn.org/dataset/lov/api/v2/term/suggest?type=property&q=" + property);
}

function find_helper(results, property) {
    var arr = [];
    let max = 0;
    for (var i = 0; i < results.length; ++i) {
        if (results[i].score > max)
            max = results[i].score;
        arr.push({
            prefix: results[i].uri[0],
            predicate: results[i].prefixedName[0],
            score: results[i].score
        });
    }
    for (let i = 0; i < arr.length; ++i) {
        if (arr[i].predicate.split(":")[1] === property) {
            arr[i].score = max + 1;
        }
    }
    return arr;
}

function find(property) {
    const URL = "http://lov.okfn.org/dataset/lov/api/v2/term/search?type=property&q=";
    return new Promise((resolve, reject) => {
        request_json(URL + property).then(
            response => {
                try {
                    let results = response.results;
                    if (results.length == 0) {
                        suggest(property.replace("_", "+")).then(
                            response => {
                                let suggestions = response.suggestions;
                                let arr = [];
                                let promises = [];
                                for (let i = 0; i < suggestions.length; ++i) {
                                    property = suggestions[i].text;
                                    promises.push(request_json(URL + property).then(
                                        response => {
                                            try {
                                                let results = response.results;
                                                results = find_helper(results, property);
                                                arr = arr.concat(results);
                                            } catch (error) {
                                                reject(error);
                                            }
                                        },
                                        error => reject(error)
                                    ));
                                }
                                Promise.all(promises).then(() => {
                                    arr.sort((a, b) => b.score - a.score);
                                    resolve(arr);
                                });
                            },
                            error => reject(error)
                        );
                    } else {
                        let arr = find_helper(results, property);
                        arr.sort((a, b) => b.score - a.score);
                        resolve(arr);
                    }
                } catch (error) {
                    reject(error);
                }
            },
            error => reject(error)
        );
    });
}

find(process.argv[process.argv.length-1]).then(s => {
    console.log(s);
}, function (err) {console.log(err);});

