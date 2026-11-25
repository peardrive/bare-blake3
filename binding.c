#include <assert.h>
#include <bare.h>
#include <js.h>
#include <stdint.h>
#include <string.h>

#include "blake3/blake3.h"

// hash(bytes: Uint8Array) -> ArrayBuffer of 32 bytes: plain BLAKE3, the same digest as @noble/hashes' blake3().
static js_value_t *
bare_blake3_hash(js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 1;
  js_value_t *argv[1];
  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  bool is_typedarray = false;
  if (argc >= 1) {
    err = js_is_typedarray(env, argv[0], &is_typedarray);
    assert(err == 0);
  }
  if (!is_typedarray) {
    err = js_throw_type_error(env, NULL, "bare-blake3: hash() takes a Uint8Array");
    assert(err == 0);
    return NULL;
  }

  js_typedarray_type_t type;
  void *data;
  size_t len;
  err = js_get_typedarray_info(env, argv[0], &type, &data, &len, NULL, NULL);
  assert(err == 0);
  if (type != js_uint8array && type != js_uint8clampedarray && type != js_int8array) {
    err = js_throw_type_error(env, NULL, "bare-blake3: hash() takes a Uint8Array");
    assert(err == 0);
    return NULL;
  }

  js_value_t *result;
  void *out;
  err = js_create_arraybuffer(env, BLAKE3_OUT_LEN, &out, &result);
  assert(err == 0);

  blake3_hasher hasher;
  blake3_hasher_init(&hasher);
  if (len > 0) blake3_hasher_update(&hasher, data, len);
  blake3_hasher_finalize(&hasher, (uint8_t *) out, BLAKE3_OUT_LEN);

  return result;
}

static js_value_t *
bare_blake3_exports(js_env_t *env, js_value_t *exports) {
  int err;

  js_value_t *fn;
  err = js_create_function(env, "hash", -1, bare_blake3_hash, NULL, &fn);
  assert(err == 0);
  err = js_set_named_property(env, exports, "hash", fn);
  assert(err == 0);

  js_value_t *version;
  err = js_create_string_utf8(env, (const utf8_t *) BLAKE3_VERSION_STRING, -1, &version);
  assert(err == 0);
  err = js_set_named_property(env, exports, "version", version);
  assert(err == 0);

  return exports;
}

BARE_MODULE(bare_blake3, bare_blake3_exports)
