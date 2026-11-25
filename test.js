// Run with Bare: `bare test.js`. Checks the digest against BLAKE3's own published vectors and, when
// @noble/hashes can be found, against it for many lengths; then says how fast it is on this machine.
const { hash, version } = require('./index.js')
const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('')

let failed = 0
const check = (name, got, want) => { if (got !== want) { failed++; console.log('FAIL ' + name + '\n  got  ' + got + '\n  want ' + want) } }

// from the BLAKE3 reference test vectors: the input is the bytes 0, 1, 2 ... 250, 0, 1 ... of the given length
const input = (n) => { const b = new Uint8Array(n); for (let i = 0; i < n; i++) b[i] = i % 251; return b }
const vectors = {
  0: 'af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262',
  1: '2d3adedff11b61f14c886e35afa036736dcd87a74d27b5c1510225d0f592e213',
  1024: '42214739f095a406f3fc83deb889744ac00df831c10daa55189b5d121c855af7',
  1025: 'd00278ae47eb27b34faecf67b4fe263f82d5412916c1ffd97c8cb7fb814b8444',
  65536: null,
}
for (const [n, want] of Object.entries(vectors)) if (want) check('vector of ' + n + ' bytes', hex(hash(input(Number(n)))), want)

let noble = null
for (const p of ['@noble/hashes/blake3.js']) { try { noble = require(p).blake3; break } catch {} }
if (noble) {
  const lens = [0, 1, 2, 63, 64, 65, 1023, 1024, 1025, 2048, 4097, 65535, 65536, 65537, 262143, 262144, 262145, 1048576 + 7]
  for (const n of lens) check('against @noble/hashes at ' + n + ' bytes', hex(hash(input(n))), hex(noble(input(n))))
  console.log('compared with @noble/hashes at ' + lens.length + ' lengths')
} else console.log('@noble/hashes not found here: only the published vectors were checked')

// a view into the middle of a larger buffer hashes the view, not the buffer
const big = input(4096)
check('a view', hex(hash(big.subarray(100, 1124))), hex(hash(Uint8Array.from(big.subarray(100, 1124)))))
let threw = false; try { hash('abc') } catch { threw = true }
if (!threw) { failed++; console.log('FAIL a string was taken') }

const piece = input(262144)
const speed = (fn, ms) => { const t0 = Date.now(); let n = 0; while (Date.now() - t0 < ms) { fn(piece); n++ } return (n * piece.length / 1048576) / ((Date.now() - t0) / 1000) }
console.log('BLAKE3 ' + version + ' compiled: ' + speed(hash, 1000).toFixed(0) + ' MB a second in 256 KiB pieces')
if (noble) console.log('@noble/hashes in JavaScript here: ' + speed(noble, 1500).toFixed(1) + ' MB a second')
console.log(failed ? failed + ' FAILED' : 'all the same')
if (failed) Bare.exit(1)
