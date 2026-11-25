// The NEON code is only for arm64 (every iPhone, every current Android phone, Apple silicon). Elsewhere this
// file is empty and blake3_dispatch.c takes the portable code.
#if defined(__aarch64__) || defined(_M_ARM64)
#include "blake3/blake3_neon.c"
#endif
