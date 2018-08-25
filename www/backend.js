const FAKE_INPUT = JSON.parse(`
[
  {
    "id": 0,
    "name": "Mariam",
    "age": 21,
    "birthday": "1997-03-28",
    "working": true,
    "test": {
      "id": 3,
      "name": "nnnnnn",
      "age": 91
    },
    "followers": [
      {
        "name": "aaa",
        "id": 1,
        "thing": {
          "a": "a"
        }
      },
      {
        "name": "bbb",
        "id": 2
      },
      {
        "name": "ccc",
        "id": 3,
        "thing": {
          "a": "a"
        }
      },
      {
        "name": "ddd",
        "id": "a"
      },
      {
        "name": "eee",
        "id": "2018-07-18"
      }
    ]
  },
  {
    "id": 1,
    "name": "Naheel"
  }
]
`);

/**
 * Promissifyed version of jquery ajax
 * @param {Object} obj - The object passed to ajax function
 * @returns {Promise<Object>} Responce from ajax
 */
function promiseAjax(obj) {
    return new Promise((fulfill, reject) => {
        obj.data = { data: JSON.stringify(obj.data) };
        obj.success = fulfill;
        obj.error = (xhr, ajaxOptions, thrownError) => reject(thrownError);
        $.ajax(obj);
    });
}

/**
 * Gives the full descriptor based on the descriptor modified by the user
 * @param {Object} baseDescriptor - the descriptor modified by the user
 * @param {Object} jsonElement - One element from the entire data
 * @returns {Promise<Object>} - The complete descriptor
 */
async function getDescriptor(json, baseDescriptor) {
    return JSON.parse(await promiseAjax({
        url: "/des",
        type: "POST",
        data: { json: json, base_des: baseDescriptor },
    }));
}

/**
 * Generates the final output!
 * @param {string} type - The type of the output (ttl or xml)
 * @returns {Promise<string>} - The output!
 */
async function getOutput(json, baseDescriptor, type) {
    return (await promiseAjax({
        url: "/out",
        type: "POST",
        data: { json: json, base_des: baseDescriptor, type: type },
    })).data;
}
