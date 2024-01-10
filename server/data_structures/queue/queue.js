const { LinkedList } = require('../linked_list/linked_list');

/**
 * Data structure where we add and remove elements in a first-in, first-out (FIFO) fashion
 */
module.exports.Queue = class {
    constructor() {
        this.items = new LinkedList();
        this._priorityPosition = -1;
    }

    /**
     * Size of the queue
     */
    get size() {
        return this.items.size;
    }

    /**
     * Add element to the queue
     * Runtime: O(1)
     * @param {any} item
     * @returns {number} index of the item
     */
    enqueue(item) {
        this.items.addLast(item);
        return this.size - 1;
    }

    /**
     * Add element to the priority queue
     * Runtime: O(1)
     * @param {any} item
     * @return {number} index of the item
     */
    priorityEnqueue(item) {
        this._priorityPosition++;
        this.items.add(item, this._priorityPosition);
        return this._priorityPosition;
    }

    /**
     * Remove element from the queue
     * Runtime: O(1)
     * @returns {any} removed value.
     */
    dequeue() {
        let ret = this.items.removeFirst();
        if (this._priorityPosition >= 0) {
            this._priorityPosition--;
        }
        return ret;
    }

    /**
     * Return true if is empty false otherwise true
     */
    isEmpty() {
        return !this.items.size;
    }

    // Aliases
    add(...args) {
        return this.enqueue(...args);
    }

    remove(...args) {
        return this.dequeue(...args);
    }
}
