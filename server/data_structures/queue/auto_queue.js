const { Queue } = require('./queue');

/**
 * Data structure where we add and remove elements in a first-in, first-out (FIFO) fashion
 */
module.exports.AutoQueue = class extends Queue {
    constructor() {
        super();
        this._pendingPromise = false;
    }

    /**
     * Add element to the queue
     * Runtime: O(1)
     * @param {function(): Promise<any>} action
     * @param {string?} name
     * @returns {Queue} instance to allow chaining.
     */
    enqueue(action, name) {
        name ??= "";

        return new Promise((resolve, reject) => {
            super.enqueue({ action, resolve, reject, name });
            this.dequeue();
        });
    }

    /**
     * Remove element from the queue by either resolving its Promise or running its fn async
     * Runtime: O(1)
     * @returns {boolean} true if queue is empty
     */
    async dequeue() {
        if (this._pendingPromise) return false;

        let item = super.dequeue();

        if (!item) return false;

        try {
            this._pendingPromise = true;

            let payload = await item.action(this);

            this._pendingPromise = false;
            item.resolve(payload);
        } catch (e) {
            this._pendingPromise = false;
            item.reject(e);
        } finally {
            this.dequeue();
        }

        return true;
    }
}
