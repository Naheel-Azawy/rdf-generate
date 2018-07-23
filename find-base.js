const request = require("request");

module.exports = {
    /**
     * A function for requestting a result through a given URL.
     * @param {string} url
     * @returns {Promise<*>}
     * @throws {error} when the API request is rejected. //CHECK
     */
    request: (url) => {
        return new Promise((resolve, reject) => {
            request(url, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
    },
    /**
     * A function for parsing the returned result from the url into Json format.
     * @param url
     * @returns {Promise<*>}
     * @throws {error} when the API request is rejected. //CHECK
     * @throws {e} when the body fail to be parsed. //CHECK
     */
    request_json: (url) => {
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
};
