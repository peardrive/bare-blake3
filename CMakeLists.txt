cmake_minimum_required(VERSION 3.25)

find_package(cmake-bare REQUIRED PATHS node_modules/cmake-bare)

project(bare_blake3 C)

add_bare_module(bare_blake3)

target_sources(
  ${bare_blake3}
  PRIVATE
    binding.c
    neon.c
    blake3/blake3.c
    blake3/blake3_dispatch.c
    blake3/blake3_portable.c
)

# The x86 fast paths are separate assembly files that are not built here: an Intel simulator, an x86 Android
# emulator or an Intel Mac takes the portable C code (still compiled, some 30 times the plain JavaScript). arm64
# takes NEON (neon.c).
target_compile_definitions(
  ${bare_blake3}
  PRIVATE
    BLAKE3_NO_SSE2
    BLAKE3_NO_SSE41
    BLAKE3_NO_AVX2
    BLAKE3_NO_AVX512
)

target_compile_options(
  ${bare_blake3}
  PRIVATE
    -O3
)
