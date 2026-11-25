# bare-blake3

BLAKE3, compiled, for apps whose engine runs in [Bare](https://github.com/holepunchto/bare) (iPhone, Android, Mac),
and a stand-in for `hash-wasm` that uses it, so pearcore's hashing gets fast without a change to pearcore.

**Why.** An iPhone app's JavaScript runs without a compiler and without WebAssembly. pearcore asks `hash-wasm` for
BLAKE3, which needs WebAssembly, so on an iPhone it always fell back to plain JavaScript: about 2 MB a second. A
2 GB video took 17 minutes to prepare and every downloaded piece was checked just as slowly. With this package the
same video takes about 5 seconds (PearDrive on an iPhone, 2026-11-24: 2,288 MB a second; the file's fingerprint
was made again on a Mac with pearcore's own code and is the same in all 64 characters).

Other platforms already have WebAssembly, so this matters most on the iPhone. Elsewhere it is still faster, and it
never does worse than what was there before.

## Put it in an app (React Native with react-native-bare-kit)

Two lines, then `npm install` in both folders and `pod install`:

```jsonc
// the app's package.json (react-native-bare-kit links the add-on into the app from here)
"dependencies": { "bare-blake3": "github:peardrive/bare-blake3#v0.1.0" }

// the engine's package.json (the folder `bare pack` bundles from): this package takes hash-wasm's place
"dependencies": { "hash-wasm": "github:peardrive/bare-blake3#v0.1.0" },
"overrides":    { "hash-wasm": "$hash-wasm" }
```

To write what is in use into the engine's log at start (optional):

```js
const h = globalThis.__bareBlake3   // { routine: 'compiled' | 'wasm' | 'plain', version, mbps, why }
```

## What it does

`createBLAKE3()` (hash-wasm's name, all pearcore uses) takes the first of these that works:

1. **compiled**: this package's add-on, wherever it is linked (prebuilt for iPhone, both simulators, Mac,
   Android arm64, arm, x64 and ia32);
2. **wasm**: the real hash-wasm in WebAssembly, installed beside this package, where the platform has it;
3. **neither**: it refuses, and pearcore keeps its own plain JavaScript routine exactly as before.

Each is checked against BLAKE3's published digests before it is used, so a fault ends in a refusal, never in a
wrong fingerprint. Only `createBLAKE3` is offered: an engine that needs other hash-wasm functions should not put
this package in hash-wasm's place.

The plain interface, without the stand-in: `require('bare-blake3/hash')` gives `{ hash(bytes), version }`.

## Measured

| Where | compiled | WebAssembly | plain JavaScript |
|---|---|---|---|
| iPhone (PearDrive, 2026-11-24) | 2,288 MB/s | not available | about 2 MB/s |
| iPhone simulator on Apple silicon | about 2,000 MB/s | not available | about 20 MB/s |
| Bare on an Apple silicon Mac | about 1,700 MB/s | about 600 MB/s | about 21 MB/s |

Android builds are made but have not been run on a device yet.

## Tests and builds

```sh
npm install
npm test               # the add-on against the published vectors and @noble/hashes; the stand-in on every path
sh build.sh mac ios android   # rebuild prebuilds/ (Android needs the NDK)
```

`test-stand-in.mjs` holds itself open while it waits: Bare does not count a WebAssembly compile in progress as
work to wait for, so a short script would end before the answer came. An app is kept running by its engine.

## Licence

The BLAKE3 C code in `blake3/` is BLAKE3's own (version 1.5.4), under CC0 1.0 or Apache 2.0 (with or without the
LLVM exception); its licence files are beside it. The rest is Apache 2.0.
