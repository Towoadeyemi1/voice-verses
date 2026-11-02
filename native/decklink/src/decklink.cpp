// Sends Voice Verses outputs straight out of a Blackmagic DeckLink card's SDI
// ports, the way ProPresenter does, with no HDMI-to-SDI converter.
//
// A small Node-API addon (ABI-stable, so one build works in every Electron
// version). The Electron main process draws each output in a hidden window and
// hands every changed frame (BGRA) to display(); this converts it to 8-bit
// YUV (Rec. 709) and puts it on the port with DisplayVideoFrameSync. The card
// keeps sending the last frame until a new one arrives.
//
//   list()                         → [{ index, name, canOutput }] (null without Desktop Video)
//   open(index, modeKey)           → { handle, width, height } or { error, message }
//   display(handle, bgra, w, h)    → true, or an error string
//   close(handle)
//
// Uses the Blackmagic DeckLink SDK headers in ../sdk (redistributable, see their licence).
#define NAPI_VERSION 8
#include <node_api.h>
#include "DeckLinkAPI.h"

#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <map>
#include <string>
#include <vector>

namespace {

#ifdef __APPLE__
std::string Utf8(CFStringRef s) {
  if (!s) return "";
  CFIndex size = CFStringGetMaximumSizeForEncoding(CFStringGetLength(s), kCFStringEncodingUTF8) + 1;
  std::string out(static_cast<size_t>(size), '\0');
  if (!CFStringGetCString(s, &out[0], size, kCFStringEncodingUTF8)) return "";
  out.resize(strlen(out.c_str()));
  return out;
}
void Free(CFStringRef s) {
  if (s) CFRelease(s);
}
typedef CFStringRef DeckLinkString;
#else
std::string Utf8(const char* s) { return s ? s : ""; }
void Free(const char* s) { free(const_cast<char*>(s)); }
typedef const char* DeckLinkString;
#endif

struct Mode {
  const char* key;
  BMDDisplayMode mode;
  int width;
  int height;
};

// The formats a church switcher is likely to run at
const Mode kModes[] = {
    {"1080i5994", bmdModeHD1080i5994, 1920, 1080}, {"1080i50", bmdModeHD1080i50, 1920, 1080},
    {"1080p2997", bmdModeHD1080p2997, 1920, 1080}, {"1080p30", bmdModeHD1080p30, 1920, 1080},
    {"1080p25", bmdModeHD1080p25, 1920, 1080},     {"1080p5994", bmdModeHD1080p5994, 1920, 1080},
    {"1080p50", bmdModeHD1080p50, 1920, 1080},     {"1080p60", bmdModeHD1080p6000, 1920, 1080},
    {"720p5994", bmdModeHD720p5994, 1280, 720},    {"720p50", bmdModeHD720p50, 1280, 720},
};

struct Output {
  IDeckLink* device = nullptr;
  IDeckLinkOutput* output = nullptr;
  IDeckLinkMutableVideoFrame* frames[2] = {nullptr, nullptr};
  int next = 0;
  int width = 0;
  int height = 0;
};

std::map<int32_t, Output> outputs;
int32_t nextHandle = 1;

/** Every DeckLink device (port), in the order the driver lists them. The caller releases them. */
bool Devices(std::vector<IDeckLink*>& found) {
  IDeckLinkIterator* iterator = CreateDeckLinkIteratorInstance();
  if (!iterator) return false;  // Blackmagic Desktop Video is not installed
  IDeckLink* device = nullptr;
  while (iterator->Next(&device) == S_OK) found.push_back(device);
  iterator->Release();
  return true;
}

void ReleaseAll(std::vector<IDeckLink*>& devices) {
  for (IDeckLink* d : devices) d->Release();
  devices.clear();
}

void CloseOutput(Output& o) {
  if (o.output) {
    o.output->DisableVideoOutput();
    o.output->Release();
  }
  for (IDeckLinkMutableVideoFrame*& f : o.frames) {
    if (f) f->Release();
    f = nullptr;
  }
  if (o.device) o.device->Release();
  o.output = nullptr;
  o.device = nullptr;
}

inline uint8_t Clamp(int v) { return static_cast<uint8_t>(v < 0 ? 0 : v > 255 ? 255 : v); }

/** BGRA (8 bits each) to 8-bit 4:2:2 YUV (UYVY, Rec. 709, video range). Width must be even. */
void BgraToUyvy(const uint8_t* src, int srcStride, uint8_t* dst, int dstStride, int width, int height) {
  for (int y = 0; y < height; y++) {
    const uint8_t* s = src + static_cast<size_t>(y) * srcStride;
    uint8_t* d = dst + static_cast<size_t>(y) * dstStride;
    for (int x = 0; x < width; x += 2, s += 8, d += 4) {
      const int b0 = s[0], g0 = s[1], r0 = s[2];
      const int b1 = s[4], g1 = s[5], r1 = s[6];
      const int r = (r0 + r1) >> 1, g = (g0 + g1) >> 1, b = (b0 + b1) >> 1;
      d[0] = Clamp(((-26 * r - 87 * g + 112 * b + 128) >> 8) + 128);  // U (Cb)
      d[1] = Clamp(((47 * r0 + 157 * g0 + 16 * b0 + 128) >> 8) + 16);  // Y0
      d[2] = Clamp(((112 * r - 102 * g - 10 * b + 128) >> 8) + 128);   // V (Cr)
      d[3] = Clamp(((47 * r1 + 157 * g1 + 16 * b1 + 128) >> 8) + 16);  // Y1
    }
  }
}

// ---- Node-API helpers ---------------------------------------------------------------

napi_value Str(napi_env env, const std::string& s) {
  napi_value v;
  napi_create_string_utf8(env, s.c_str(), s.size(), &v);
  return v;
}
napi_value Int(napi_env env, int32_t n) {
  napi_value v;
  napi_create_int32(env, n, &v);
  return v;
}
napi_value Bool(napi_env env, bool b) {
  napi_value v;
  napi_get_boolean(env, b, &v);
  return v;
}
napi_value Null(napi_env env) {
  napi_value v;
  napi_get_null(env, &v);
  return v;
}
napi_value Undefined(napi_env env) {
  napi_value v;
  napi_get_undefined(env, &v);
  return v;
}
void Set(napi_env env, napi_value obj, const char* key, napi_value value) { napi_set_named_property(env, obj, key, value); }
napi_value Failure(napi_env env, const char* code, const std::string& message) {
  napi_value obj;
  napi_create_object(env, &obj);
  Set(env, obj, "error", Str(env, code));
  Set(env, obj, "message", Str(env, message));
  return obj;
}
std::string ArgString(napi_env env, napi_value v) {
  size_t len = 0;
  napi_get_value_string_utf8(env, v, nullptr, 0, &len);
  std::string s(len, '\0');
  napi_get_value_string_utf8(env, v, &s[0], len + 1, &len);
  return s;
}
int32_t ArgInt(napi_env env, napi_value v) {
  int32_t n = -1;
  napi_get_value_int32(env, v, &n);
  return n;
}

// ---- Exported functions ----------------------------------------------------------------

napi_value List(napi_env env, napi_callback_info) {
  std::vector<IDeckLink*> devices;
  if (!Devices(devices)) return Null(env);
  napi_value list;
  napi_create_array_with_length(env, devices.size(), &list);
  for (size_t i = 0; i < devices.size(); i++) {
    DeckLinkString name = nullptr;
    std::string label;
    if (devices[i]->GetDisplayName(&name) == S_OK) {
      label = Utf8(name);
      Free(name);
    }
    IDeckLinkOutput* output = nullptr;
    const bool canOutput = devices[i]->QueryInterface(IID_IDeckLinkOutput, reinterpret_cast<void**>(&output)) == S_OK;
    if (output) output->Release();
    napi_value item;
    napi_create_object(env, &item);
    Set(env, item, "index", Int(env, static_cast<int32_t>(i)));
    Set(env, item, "name", Str(env, label));
    Set(env, item, "canOutput", Bool(env, canOutput));
    napi_set_element(env, list, static_cast<uint32_t>(i), item);
  }
  ReleaseAll(devices);
  return list;
}

napi_value Open(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc < 2) return Failure(env, "args", "open(index, mode)");
  const int32_t index = ArgInt(env, argv[0]);
  const std::string key = ArgString(env, argv[1]);

  const Mode* mode = nullptr;
  for (const Mode& m : kModes)
    if (key == m.key) mode = &m;
  if (!mode) return Failure(env, "mode", "Unknown video format " + key);

  std::vector<IDeckLink*> devices;
  if (!Devices(devices)) return Failure(env, "drivers", "Blackmagic Desktop Video is not installed");
  if (index < 0 || static_cast<size_t>(index) >= devices.size()) {
    ReleaseAll(devices);
    return Failure(env, "missing", "That DeckLink port is not connected now");
  }
  Output o;
  o.device = devices[static_cast<size_t>(index)];
  o.device->AddRef();
  ReleaseAll(devices);

  if (o.device->QueryInterface(IID_IDeckLinkOutput, reinterpret_cast<void**>(&o.output)) != S_OK) {
    o.output = nullptr;
    CloseOutput(o);
    return Failure(env, "input-only", "This DeckLink port can't send video");
  }
  bool supported = false;
  if (o.output->DoesSupportVideoMode(bmdVideoConnectionUnspecified, mode->mode, bmdFormat8BitYUV, bmdNoVideoOutputConversion,
                                     bmdSupportedVideoModeDefault, nullptr, &supported) != S_OK ||
      !supported) {
    CloseOutput(o);
    return Failure(env, "format", "This DeckLink port can't send that video format");
  }
  const HRESULT enabled = o.output->EnableVideoOutput(mode->mode, bmdVideoOutputFlagDefault);
  if (enabled != S_OK) {
    // Releasing an output that was never enabled must not disable another app's use of it
    o.output->Release();
    o.output = nullptr;
    CloseOutput(o);
    if (enabled == E_ACCESSDENIED) return Failure(env, "busy", "Another app is using this DeckLink port");
    return Failure(env, "enable", "The DeckLink port would not start");
  }
  for (IDeckLinkMutableVideoFrame*& f : o.frames) {
    if (o.output->CreateVideoFrame(mode->width, mode->height, mode->width * 2, bmdFormat8BitYUV, bmdFrameFlagDefault, &f) != S_OK) {
      f = nullptr;
      CloseOutput(o);
      return Failure(env, "memory", "Could not make a video frame for the DeckLink port");
    }
    // Start black (Y 16, U/V 128)
    void* bytes = nullptr;
    if (f->GetBytes(&bytes) == S_OK && bytes) {
      uint8_t* p = static_cast<uint8_t*>(bytes);
      for (int i = 0; i < mode->width * mode->height * 2; i += 2) {
        p[i] = 128;
        p[i + 1] = 16;
      }
    }
  }
  o.width = mode->width;
  o.height = mode->height;
  o.output->DisplayVideoFrameSync(o.frames[0]);

  const int32_t handle = nextHandle++;
  outputs[handle] = o;
  napi_value result;
  napi_create_object(env, &result);
  Set(env, result, "handle", Int(env, handle));
  Set(env, result, "width", Int(env, o.width));
  Set(env, result, "height", Int(env, o.height));
  return result;
}

napi_value Display(napi_env env, napi_callback_info info) {
  size_t argc = 4;
  napi_value argv[4];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc < 4) return Str(env, "display(handle, bgra, width, height)");
  auto it = outputs.find(ArgInt(env, argv[0]));
  if (it == outputs.end()) return Str(env, "closed");
  Output& o = it->second;
  void* data = nullptr;
  size_t length = 0;
  bool isBuffer = false;
  napi_is_buffer(env, argv[1], &isBuffer);
  if (!isBuffer || napi_get_buffer_info(env, argv[1], &data, &length) != napi_ok) return Str(env, "not a buffer");
  const int32_t width = ArgInt(env, argv[2]);
  const int32_t height = ArgInt(env, argv[3]);
  if (width != o.width || height != o.height) return Str(env, "size");
  if (length < static_cast<size_t>(width) * height * 4) return Str(env, "short");

  // Two frames in turn, so the card never reads one while it is being written
  IDeckLinkMutableVideoFrame* frame = o.frames[o.next];
  o.next = 1 - o.next;
  void* bytes = nullptr;
  if (frame->GetBytes(&bytes) != S_OK || !bytes) return Str(env, "frame");
  BgraToUyvy(static_cast<const uint8_t*>(data), width * 4, static_cast<uint8_t*>(bytes), frame->GetRowBytes(), width, height);
  if (o.output->DisplayVideoFrameSync(frame) != S_OK) return Str(env, "send");
  return Bool(env, true);
}

napi_value Close(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc < 1) return Undefined(env);
  auto it = outputs.find(ArgInt(env, argv[0]));
  if (it != outputs.end()) {
    CloseOutput(it->second);
    outputs.erase(it);
  }
  return Undefined(env);
}

void Cleanup(void*) {
  for (auto& entry : outputs) CloseOutput(entry.second);
  outputs.clear();
}

napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor props[] = {
      {"list", nullptr, List, nullptr, nullptr, nullptr, napi_default, nullptr},
      {"open", nullptr, Open, nullptr, nullptr, nullptr, napi_default, nullptr},
      {"display", nullptr, Display, nullptr, nullptr, nullptr, napi_default, nullptr},
      {"close", nullptr, Close, nullptr, nullptr, nullptr, napi_default, nullptr},
  };
  napi_define_properties(env, exports, sizeof(props) / sizeof(props[0]), props);
  napi_add_env_cleanup_hook(env, Cleanup, nullptr);
  return exports;
}

}  // namespace

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
