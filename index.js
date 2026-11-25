// BLAKE3, compiled: the reference C code (NEON on arm64), as a Bare add-on.
//   const { hash, version } = require('bare-blake3/hash')
//   hash(bytes)  ->  the 32-byte digest as a Uint8Array, the same bytes as @noble/hashes' blake3() and hash-wasm's
const binding = require('./binding')

exports.hash = function hash (bytes) {
  return new Uint8Array(binding.hash(bytes))
}
exports.version = binding.version
