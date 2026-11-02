{
  "targets": [
    {
      "target_name": "decklink",
      "sources": ["src/decklink.cpp"],
      "defines": ["NAPI_VERSION=8"],
      "conditions": [
        ["OS=='mac'", {
          "sources": ["sdk/mac/DeckLinkAPIDispatch.cpp"],
          "include_dirs": ["sdk/mac"],
          "xcode_settings": {
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "MACOSX_DEPLOYMENT_TARGET": "11.0",
            "GCC_ENABLE_CPP_EXCEPTIONS": "NO"
          },
          "link_settings": { "libraries": ["-framework CoreFoundation"] }
        }],
        ["OS=='linux'", {
          "sources": ["sdk/linux/DeckLinkAPIDispatch.cpp"],
          "include_dirs": ["sdk/linux"],
          "cflags_cc": ["-std=c++17"],
          "libraries": ["-ldl", "-lpthread"]
        }]
      ]
    }
  ]
}
