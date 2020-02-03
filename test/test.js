const { expect } = require('chai');

let x = [...[1]];

const MessageFramer = require('../lib');

// You provide an array of arrays.  Each array lists the bytes of a buffer.
// This function creates a buffer from each array and adds that buffer to the MessageFramer.
// Every emitted message is added to an array, and that array is returned.
function exerciseRaw(arrays) {
  let mf = new MessageFramer();
  let results = [];
  mf.on('message', (buffer) => {
    results.push(buffer);
  });

  for (let array of arrays) {
    mf.add(Buffer.from(array));
  }
  return results;
}

// This is a shorthand test that makes the results easier to describe. Emitted message buffers
// are converted utf8 strings enclosed in '[]', then concatenated into a single result string.
function exercise(arrays) {
  return exerciseRaw(arrays).map(buffer => `[${buffer.toString('utf8')}]`).join('');
}

describe('MessageFramer', function () {
  it('does not emit if you do not add anything', function () {
    expect(exercise([
    ])).equals('');
  });

  it('emits \'message\' with the preceding bytes when it gets a NUL (0) byte in a buffer', function () {
    expect(exercise([
      [65, 66, 67, 0]
    ])).equals('[ABC]');
  });

  it('does not emit if you leave unterminated junk in the buffer with no NUL', function () {
    expect(exercise([
      [65, 66, 67]
    ])).equals('');
  });

  it('does not emit the next message if a NUL never arrives', function () {
    expect(exercise([
      [65, 66, 67, 0, 68, 69, 70]
    ])).equals('[ABC]');
  });

  it('handles multiple messages per buffer', function () {
    expect(exercise([
      [65, 66, 67, 0, 68, 69, 70, 0]
    ])).equals('[ABC][DEF]');
  });

  it('merges buffers', function () {
    expect(exercise([
      [65, 66, 67],
      [68, 69, 70, 0]
    ])).equals('[ABCDEF]');
  });

  it('emits an empty message if nothing precedes a NUL', function () {
    expect(exercise([
      [0]
    ])).equals('[]');
  });

  it('emits an empty message for every NUL', function () {
    expect(exercise([
      [0, 0, 0]
    ])).equals('[][][]');
  });

  it('ignores empty buffers', function () {
    expect(exercise([
      [65, 66, 67],
      [],
      [68, 69, 70, 0],
    ])).equals('[ABCDEF]');
  });

  it('just keeps on concatenating buffers of any size until it gets that NUL', function () {
    expect(exercise([
      [65, 66, 67],
      [68, 69, 70, 71, 72, 73],
      [],
      [74],
      [75, 76],
      [77, 78, 79, 80, 0]
    ])).equals('[ABCDEFGHIJKLMNOP]');
  });

  it('allows any byte in a message except NUL which is the message terminator', function () {
    // The test buffer is all bytes twice:
    // = [ 0, 1, 2, ..., 254, 255, 0, 1, 2, ..., 245, 255 ]
    let inputBuffer = [...Array(512).keys()].map(x => x % 0x100)

    // There should be two messages above.  An empty one and one that looks like the second output buffer described below:

    // The second output buffer should be every byte from 1 ... 255 except the NUL
    let outputBuffer = [...Array(255).keys()].map(x => x + 1);
    // = [1, 2, ..., 254, 255 ]

    expect(exerciseRaw([
      inputBuffer
    ])).deep.equals([
      Buffer.from([]), // the empty message buffer
      Buffer.from(outputBuffer) // the output message buffer
    ]);
  });

});

describe('internally, MessageFramer', function () {
  it ('handles NUL at beginning of buffer', function () {
    expect(exercise([
      [0, 65, 66],
      [0, 67, 68],
      [0, 69, 70]
    ])).equals('[][AB][CD]');
  });

  it ('handles NUL at end of buffer', function () {
    expect(exercise([
      [65, 66, 0],
      [67, 68, 0],
      [69, 70, 0]
    ])).equals('[AB][CD][EF]');
  });

  it ('handles NUL in middle of buffer', function () {
    expect(exercise([
      [65, 0, 66],
      [67, 0, 68],
      [69, 0, 70]
    ])).equals('[A][BC][DE]');
  });

  it ('handles NUL at beginning and end of buffer', function () {
    expect(exercise([
      [0, 65, 66, 0],
      [0, 67, 68, 0],
      [0, 69, 70, 0]
    ])).equals('[][AB][][CD][][EF]');
  });

  it ('handles NULs throughout the buffer', function () {
    expect(exercise([
      [0, 65, 0, 66, 0],
      [0, 67, 0, 68, 0],
      [0, 69, 0, 70, 0]
    ])).equals('[][A][B][][C][D][][E][F]');
  });

  it ('handles multiple empty messages in a row', function () {
    expect(exercise([
      [65, 66, 0, 0, 0, 67, 68],
      [69, 70, 0, 0, 0, 71, 72],
    ])).equals('[AB][][][CDEF][][]');
  });

  it ('handles the case where the NUL in its own buffer', function () {
    expect(exercise([
      [72, 69, 76, 76, 79],
      [0],
    ])).equals('[HELLO]');
  });

  it('handles multiple empty buffers throughout', function () {
    expect(exercise([
      [],
      [65, 66, 67],
      [],
      [],
      [68, 69, 70, 0],
      []
    ])).equals('[ABCDEF]');
  });


});

