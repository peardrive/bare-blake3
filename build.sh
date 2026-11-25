#!/bin/sh
# Builds the add-on into prebuilds/<host>/bare-blake3.bare for the hosts asked for, each in a build folder of its
# own (nothing has to be cleared between them):
#   sh build.sh mac ios android
#   mac      darwin-arm64, darwin-x64
#   ios      ios-arm64, ios-arm64-simulator, ios-x64-simulator   (react-native-bare-kit links these three)
#   android  android-arm64, android-arm, android-x64, android-ia32 (needs the Android NDK: ANDROID_HOME, or the SDK
#            in ~/Library/Android/sdk)
set -e
cd "$(dirname "$0")"
one () { # <platform> <arch> [--simulator]
  dir="build/$1-$2${3:+-simulator}"
  npx bare-make generate --platform "$1" --arch "$2" $3 --build "$dir"
  npx bare-make build --build "$dir"
  npx bare-make install --build "$dir"
}
for what in "$@"; do
  case "$what" in
    mac) one darwin arm64; one darwin x64 ;;
    ios) one ios arm64; one ios arm64 --simulator; one ios x64 --simulator ;;
    android)
      [ -n "$ANDROID_HOME" ] || ANDROID_HOME="$HOME/Library/Android/sdk"
      export ANDROID_HOME ANDROID_SDK_ROOT="$ANDROID_HOME"
      [ -n "$ANDROID_NDK_HOME" ] || ANDROID_NDK_HOME="$(ls -d "$ANDROID_HOME"/ndk/* 2>/dev/null | sort -V | tail -1)"
      export ANDROID_NDK_HOME
      one android arm64; one android arm; one android x64; one android ia32 ;;
    *) echo "build.sh: mac, ios or android, not $what" >&2; exit 2 ;;
  esac
done
ls prebuilds
