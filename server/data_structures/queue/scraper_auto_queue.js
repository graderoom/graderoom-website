const { AutoQueue } = require('./auto_queue');

module.exports.ScraperAutoQueue = class extends AutoQueue {
    constructor() {
        super();
        this.processors = [];
    }

    enqueue(action, processor, priority=false) {
        let index;
        if (priority) {
            index = super.priorityEnqueue(action);
        } else {
            index = super.enqueue(action);
        }
        this.processors.splice(index, 0, processor);

        for (let i = index + 1; i < this.processors.length; i++) {
            if (i === 1) {
                this.processors[i]({progress: 0, message: "Waiting in queue. You are next in line."});
                continue;
            }
            this.processors[i]({progress: 0, message: `Waiting in queue. You are number ${i} in line.`});
        }
    }

    async dequeue() {
        if (this._pendingPromise) return;
        this.processors.shift();
        for (let i = 1; i < this.processors.length; i++) {
            if (i === 1) {
                this.processors[i]({progress: 0, message: "Waiting in queue. You are next in line."});
                continue;
            }
            this.processors[i]({progress: 0, message: `Waiting in queue. You are number ${i} in line.`});
        }
        await super.dequeue();
    }
}