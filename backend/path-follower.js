module.exports = class PathFollower {
    /**
     *  A class constructor for creating a stack to save the path for a given attribute in a json object.
     */
    constructor() {
        this.path_stack = [];
    }

    /**
     * A function for adding an item to the path stack.
     * @param {string | number} item
     */
    push(item) {
        this.path_stack.push(item);
    }

    /**
     * A function for returning the last item added to the stack.
     */
    pop() {
        return this.path_stack.pop();
    }

    /**
     * A funtion for creating and formatting the path.
     * @returns {string} A full formatted path.
     */
    get_path() {
        let res = "$";
        for (let i = 0; i < this.path_stack.length; ++i) {
            if (typeof(this.path_stack[i]) === "number") {
                res += '[' + this.path_stack[i] + ']';
            } else if (this.path_stack[i][0] === '[') {
                res += this.path_stack[i];
            } else {
                res += '.' + this.path_stack[i];
            }
        }
        return res;
    }

    /**
     * A funtion for creating and formatting the path of the parent.
     * @returns {string} A full formatted path of the parent.
     */
    parent() {
        if (!this.path_stack || this.path_stack.length === 0 || this.path_stack.length === 1) {
            return undefined;
        }
        let t = this.pop();
        let res = this.get_path();
        this.push(t);
        return res;
    }
};
