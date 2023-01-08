const { Node } = require('./linked_list_node');

/**
 * Doubly linked list that keeps track of
 * the last and first element
 */
module.exports.LinkedList = class {
    constructor(iterable = []) {
        this.first = null; // head/root element
        this.last = null; // last element of the list
        this.size = 0; // total number of elements in the list

        Array.from(iterable, i => this.addLast(i));
    }

    /**
     * Alias for size
     */
    get length() {
        return this.size;
    }

    /**
     * Adds element to the begining of the list. Similar to Array.unshift
     * Runtime: O(1)
     * @param {any} value
     * @returns {Node} node
     */
    addFirst(value) {
        const newNode = new Node(value);

        newNode.next = this.first;

        if (this.first) {
            this.first.previous = newNode;
        } else {
            this.last = newNode;
        }

        this.first = newNode; // update head
        this.size++;

        return newNode;
    }

    unshift(value) {
        return this.addFirst(value);
    }

    /**
     * Adds element to the end of the list (tail). Similar to Array.push
     * Using the element last reference instead of navigating through the list,
     * we can reduce from linear to a constant runtime.
     * Runtime: O(1)
     * @param {any} value node's value
     * @returns {Node} newly created node
     */
    addLast(value) {
        const newNode = new Node(value);

        if (this.first) {
            newNode.previous = this.last;
            this.last.next = newNode;
            this.last = newNode;
        } else {
            this.first = newNode;
            this.last = newNode;
        }

        this.size++;

        return newNode;
    }

    push(value) {
        return this.addLast(value);
    }

    /**
     * Insert new element at the given position (index)
     *
     * @param {any} value new node's value
     * @param {Number} position position to insert element
     * @returns {Node} new node or 'undefined' if the index is out of bound.
     */
    add(value, position = 0) {
        if (position === 0) {
            return this.addFirst(value);
        }

        if (position === this.size) {
            return this.addLast(value);
        }
        // Adding element in the middle
        const current = this.get(position);
        if (current) {
            const newNode = new Node(value);
            newNode.previous = current.previous;
            newNode.next = current;

            current.previous.next = newNode;
            current.previous = newNode;
            this.size++;
            return newNode;
        }

        return undefined; // out of bound index
    }

    /**
     * Search by value. It finds first occurrence  of
     * the element matching the value.
     * Runtime: O(n)
     * @example: assuming a linked list with: a -> b -> c
     *  linkedList.indexOf('b') // ↪️ 1
     *  linkedList.indexOf('z') // ↪️ undefined
     * @param {any} value
     * @returns {number} return index or undefined
     */
    indexOf(value) {
        return this.find((current, position) => {
            if (current.value === value) {
                return position;
            }
            return undefined;
        });
    }

    /**
     * Search by index
     * Runtime: O(n)
     * @example: assuming a linked list with: a -> b -> c
     *  linkedList.get(1) // ↪️ 'b'
     *  linkedList.get(40) // ↪️ undefined
     * @param {Number} index position of the element
     * @returns {Node} element at the specified position in this list.
     */
    get(index = 0) {
        return this.find((current, position) => {
            if (position === index) {
                return current;
            }
            return undefined;
        });
    }

    /**
     * Iterate through the list until callback returns a truthy value
     * @example see #get and  #indexOf
     * @param {Function} callback evaluates current node and index.
     *  If any value other than undefined it's returned it will stop the search.
     * @returns {any} callback's return value or undefined
     */
    find(callback) {
        for (let current = this.first, position = 0; current; position++, current = current.next) {
            const result = callback(current, position);

            if (result !== undefined) {
                return result;
            }
        }
        return undefined; // not found
    }

    /**
     * Removes element from the start of the list (head/root).
     * Similar to Array.shift
     * Runtime: O(1)
     * @returns {any} the first element's value which was removed.
     */
    removeFirst() {
        const head = this.first;

        if (head) {
            this.first = head.next;
            if (this.first) {
                this.first.previous = null;
            } else {
                this.last = null;
            }
            this.size--;
        }
        return head && head.value;
    }

    shift() {
        return this.removeFirst();
    }

    /**
     * Removes element to the end of the list. Similar to Array.pop
     * Using the `last.previous` we can reduce the runtime from O(n) to O(1)
     * Runtime: O(1)
     * @returns {value} the last element's value which was removed
     */
    removeLast() {
        const tail = this.last;

        if (tail) {
            this.last = tail.previous;
            if (this.last) {
                this.last.next = null;
            } else {
                this.first = null;
            }
            this.size--;
        }
        return tail && tail.value;
    }

    pop() {
        return this.removeLast();
    }

    /**
     * Removes the element at the specified position in this list.
     * Runtime: O(n)
     * @param {any} position
     * @returns {any} the element's value at the specified position that was removed.
     */
    removeByPosition(position = 0) {
        const current = this.get(position);

        if (position === 0) {
            this.removeFirst();
        } else if (position === this.size - 1) {
            this.removeLast();
        } else if (current) {
            current.previous.next = current.next;
            current.next.previous = current.previous;
            this.size--;
        }

        return current && current.value;
    }

    /**
     * Removes the first occurrence of the specified elementt
     * from this list, if it is present.
     * Runtime: O(n)
     * @param {any} callbackOrIndex callback or position index to remove
     */
    remove(callbackOrIndex) {
        if (typeof callbackOrIndex !== 'function') {
            return this.removeByPosition(parseInt(callbackOrIndex, 10) || 0);
        }

        // find desired position to remove using #find
        const position = this.find((node, index) => {
            if (callbackOrIndex(node, index)) {
                return index;
            }
            return undefined;
        });

        if (position !== undefined) {
            // zero-based position.
            return this.removeByPosition(position);
        }

        return false;
    }

    /**
     * Remove element by Node
     * O(1)
     */
    removeByNode(node) {
        if (!node) {
            return null;
        }
        if (node === this.first) {
            return this.removeFirst();
        }
        if (node === this.last) {
            return this.removeLast();
        }
        node.previous.next = node.next;
        node.next.previous = node.previous;
        this.size--;

        return node.value;
    }

    /**
     * Iterate through the list yield on each node
     */
    *[Symbol.iterator]() {
        for (let node = this.first, position = 0; node; position++, node = node.next) {
            yield { node, position };
        }
    }
}
