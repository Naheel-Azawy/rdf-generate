module.exports = class PathFollower {
    constructor() {
        this.path_stack = [];
    }
    push(item) {
        this.path_stack.push(item);
    }
    pop() {
        this.path_stack.pop();
    }
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
    };
};
