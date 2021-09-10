# message-framer

Recovers null terminated strings from a stream of bytes arriving in discrete buffers.

![Basic Case](doc/diagram1.svg)

Partial messages are buffered until their closing delimiter is processed.

![Buffered Message](doc/diagram2.svg)

## Usage

```js
const MessageFramer = require('message-framer');

let mf = new MessageFramer();
mf.on('message', buffer => {
  console.log(buffer.toString('utf8'));
});

let buffer1 = Buffer.from('ALPH', 'utf8');
let buffer2 = Buffer.from('A\0BR', 'utf8');
let buffer3 = Buffer.from('AVO\0CHARLIE\0', 'utf8');

mf.add(buffer1);  // nothing happens yet
mf.add(buffer2);  // --> 'ALPHA'
mf.add(buffer3);  // --> 'BRAVO' --> 'CHARLIE'
```

## Unit test output

```
  MessageFramer
    √ does not emit if you do not add anything
    √ emits 'message' with the preceding bytes when it gets a NUL (0) byte in a buffer
    √ does not emit if you leave unterminated junk in the buffer with no NUL
    √ does not emit the next message if a NUL never arrives
    √ handles multiple messages per buffer
    √ merges buffers
    √ emits an empty message if nothing precedes a NUL
    √ emits an empty message for every NUL
    √ ignores empty buffers
    √ just keeps on concatenating buffers of any size until it gets that NUL
    √ allows any byte in a message except NUL which is the message terminator
```

## Usage with a stream socket

```js
const MessageFramer = require('message-framer');
const net = require('net');

var server = net.createServer(socket => {
  let mf = new MessageFramer();
  socket.on('data', buffer => mf.add(buffer));
  mf.on('message', message => {
    console.log(message);
  });
});

server.listen(1337, '127.0.0.1');
```
