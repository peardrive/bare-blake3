// The stand-in for hash-wasm picks the fastest BLAKE3 that is here and proves it on the published digests.
//   bare test-stand-in.mjs                 expect=compiled  (the add-on, built for this Mac)
//   bare test-stand-in.mjs skip=compiled   expect=wasm      (Bare on a Mac has WebAssembly)
//   node test-stand-in.mjs                 expect=wasm      (Node cannot load a Bare add-on)
//   node test-stand-in.mjs skip=wasm       expect=refused   (nothing fast: pearcore keeps its own routine)
const argv = (globalThis.Bare && globalThis.Bare.argv) || globalThis.process.argv
const arg = (k) => { const a = argv.find((x) => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : null }
const isBare = !!globalThis.Bare
const skip = (arg('skip') || '').split(',').filter(Boolean)
const expect = arg('expect') || (skip.includes('wasm') && !isBare ? 'refused' : skip.includes('compiled') || !isBare ? 'wasm' : 'compiled')
globalThis.__bareBlake3Test = { skip }
// Bare does not count a WebAssembly compile in progress as work to wait for: a short script would end before the
// answer came. An app is kept running by its engine anyway; here a timer holds the script open until it is done.
const hold = setInterval(() => {}, 1000)

let failed = 0
const check = (ok, what) => { if (!ok) { failed++; console.log('FAIL ' + what) } }
const hex = (u) => Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('')
const input = (n) => { const b = new Uint8Array(n); for (let i = 0; i < n; i++) b[i] = i % 251; return b }

const { createBLAKE3 } = await import('./hash-wasm.mjs')
let h = null
try { h = await createBLAKE3() } catch (e) { if (expect !== 'refused') check(false, 'refused: ' + e.message) }
const r = globalThis.__bareBlake3 || {}
check((h ? r.routine : 'refused') === expect, `in use: ${h ? r.routine : 'refused'}, expected ${expect}`)
if (h) {
  const { blake3 } = await import('@noble/hashes/blake3.js')
  const lens = [0, 1, 63, 64, 65, 1023, 1024, 1025, 2048, 4097, 65536, 262144, 262145, 1048576 + 7]
  for (const n of lens) {
    const got = h.init().update(input(n)).digest('binary')
    check(got instanceof Uint8Array && got.length === 32, `a 32-byte Uint8Array at ${n} bytes`)
    check(hex(got) === hex(blake3(input(n))), `the same digest as @noble/hashes at ${n} bytes`)
  }
  // a view into the middle of a larger buffer hashes the view, as pearcore hands it pieces
  const big = input(4096)
  check(hex(h.init().update(big.subarray(100, 1124)).digest('binary')) === hex(blake3(big.subarray(100, 1124))), 'a view')
  // two hashers in turn do not mix their inputs
  const h2 = await createBLAKE3()
  h.init().update(input(10)); h2.init().update(input(20))
  check(hex(h.digest('binary')) === hex(blake3(input(10))) && hex(h2.digest('binary')) === hex(blake3(input(20))), 'two hashers in turn')
}
console.log(`${isBare ? 'bare' : 'node'}${skip.length ? ' skip=' + skip : ''}: ${h ? r.routine + ', ' + r.mbps + ' MB a second' : 'refused (' + (r.why || '') + ')'}`)
clearInterval(hold)
if (failed) { console.log(failed + ' failed'); if (globalThis.Bare) Bare.exit(1); else process.exit(1) }
console.log('all the same')
