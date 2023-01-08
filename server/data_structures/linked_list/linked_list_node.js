/**
 * Node with reference to next and previous element
 */
module.exports.Node = class {
    constructor(value) {
        this.value = value;
        this.next = null;
        this.previous = null;
    }
}
