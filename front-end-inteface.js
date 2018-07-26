
/**
 * Gives the first descriptor with no predicates based on one item from the json
 * @param {Object} jsonElement - One element from the entire data
 * @returns {Promise<Object>} - The descriptor with no predicates
 */
async function getDescriptorNoPredicates(jsonElement) {
    return null;
}

/**
 * Gives the full descriptor based on the descriptor modified by the user
 * @param {Object} baseDescriptor - the descriptor modified by the user
 * @returns {Promise<Object>} - The complete descriptor
 */
async function getDescriptor(baseDescriptor) {
    return null;
}

/**
 * Generates the final output!
 * @param {string} type - The type of the output (ttl or xml)
 * @param {Object} fullJson - The entire json file. If undefined, then it will only output the result based on the given item from getDescriptorNoPredicates() function.
 * @returns {Promise<string>} - The output!
 */
async function getOutput(type, fullJson) {
    return null;
}
