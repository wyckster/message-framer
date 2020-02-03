const EventEmitter = require('events');

class MessageFramer extends EventEmitter {
  constructor() {
    super();
    this.accumulator = [];
  }

  add(buffer) {
    let index;
    while ((index = buffer.indexOf(0)) >= 0) {
      this.accumulator.push(buffer.slice(0, index));
      this.emit('message', Buffer.concat(this.accumulator));
      this.accumulator = [];
      buffer = buffer.slice(index + 1);
    }
    this.accumulator.push(buffer);
  }
}

module.exports = MessageFramer;