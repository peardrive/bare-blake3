// A STAND-IN FOR hash-wasm, as far as pearcore uses it: createBLAKE3(), whose answer is used as
//   h.init(); h.update(bytes); h.digest('binary')          (pearcore src/utils/crypto.utils.js, hash())
// one whole input at a time.
//
// Why: an iPhone app's JavaScript runs without a compiler and without WebAssembly, so hash-wasm never loads there
// and pearcore falls back to BLAKE3 in plain JavaScript, about 2 MB a second (PearDrive, 2026-11-22: a 2 GB video
// took 17 minutes to prepare). With this package in hash-wasm's place it takes about 5 seconds on an iPhone.
//
// Three steps, the first that works is used:
//   1. the compiled routine of this package (wherever its add-on was built and linked: iPhone, the simulators, Mac,
//      Android);
//   2. hash-wasm itself, in WebAssembly (where the platform has it: Android, desktops);
//   3. neither: createBLAKE3() refuses, and pearcore keeps its own plain JavaScript routine, as before.
// Each is checked against BLAKE3's published digests before it is trusted, so a fault ends in a refusal, never in
// a wrong fingerprint.
//
// What is in use is left at globalThis.__bareBlake3 = { routine: 'compiled' | 'wasm' | 'plain', version, mbps, why }
// for the app to write in its log (also at globalThis.__peardriveHash, the name PearDrive's engine reads).

const EMPTY = 'af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262' // BLAKE3 of nothing (published)
// the published test input is the bytes 0, 1, 2 ... 250, 0, 1 ...; its digest for 1025 bytes
const V1025 = 'd00278ae47eb27b34faecf67b4fe263f82d5412916c1ffd97c8cb7fb814b8444'
const SELF = Symbol.for('bare-blake3/stand-in')

const hex = (u) => { let s = ''; for (let i = 0; i < u.length; i++) s += (u[i] < 16 ? '0' : '') + u[i].toString(16); return s }
const say = (o) => { try { globalThis.__bareBlake3 = o; globalThis.__peardriveHash = o } catch {} }
// for this package's own tests only: { skip: ['compiled' | 'wasm'] }
const testing = () => (globalThis.__bareBlake3Test && globalThis.__bareBlake3Test.skip) || []

// a one-shot hasher in hash-wasm's shape around a function bytes -> digest
function shaped (fn) {
  let held = null
  return {
    init () { held = null; return this },
    update (bytes) { held = bytes; return this },
    digest () { const out = fn(held || new Uint8Array(0)); held = null; return out }
  }
}

// checked before it is trusted: nothing, the published 1025 bytes, and the same bytes as a view that does not start
// at the beginning of its buffer (pearcore hands pieces of larger buffers)
function proven (fn, what) {
  const big = new Uint8Array(1025 + 7)
  for (let i = 0; i < 1025; i++) big[i + 7] = i % 251
  if (hex(fn(new Uint8Array(0))) !== EMPTY) throw new Error(`${what} gave a wrong digest for no bytes`)
  if (hex(fn(big.subarray(7))) !== V1025) throw new Error(`${what} gave a wrong digest for the published 1025 bytes`)
}

// how fast, on 256 KiB pieces (the size a file is hashed in): about 20 ms of work
function speed (fn) {
  const piece = new Uint8Array(262144)
  const t0 = Date.now(); let n = 0
  do { fn(piece); n++ } while (Date.now() - t0 < 20 && n < 400)
  return Math.round((n * 0.25 * 1000) / Math.max(1, Date.now() - t0))
}

let answer = null
export function createBLAKE3 () {
  if (!answer) answer = choose()
  return answer.then((pick) => shaped(pick))
}
createBLAKE3[SELF] = true

async function choose () {
  const why = []
  if (!testing().includes('compiled')) {
    try {
      const mod = await import('./index.js')
      const native = (mod.default && mod.default.hash) || mod.hash
      if (typeof native !== 'function') throw new Error('the add-on offers no hash()')
      proven(native, 'the compiled BLAKE3')
      say({ routine: 'compiled', version: (mod.default && mod.default.version) || mod.version || '', mbps: speed(native) })
      return native
    } catch (e) { why.push(`compiled: ${String((e && e.message) || e).slice(0, 160)}`) }
  }
  if (!testing().includes('wasm')) {
    try {
      if (typeof WebAssembly === 'undefined') throw new Error('this platform has no WebAssembly')
      const mod = await import('hash-wasm-wasm')
      const create = (mod.default && mod.default.createBLAKE3) || mod.createBLAKE3
      if (typeof create !== 'function' || create[SELF]) throw new Error('the WebAssembly hash-wasm is not installed beside this package')
      const h = await create()
      const fn = (bytes) => { h.init(); h.update(bytes); return h.digest('binary') }
      proven(fn, 'hash-wasm in WebAssembly')
      say({ routine: 'wasm', mbps: speed(fn) })
      return fn
    } catch (e) { why.push(`wasm: ${String((e && e.message) || e).slice(0, 160)}`) }
  }
  say({ routine: 'plain', why: why.join('; ') })
  answer = null // asked again later, the same answer is worked out again
  throw new Error(`bare-blake3: no fast BLAKE3 here (${why.join('; ')})`)
}
