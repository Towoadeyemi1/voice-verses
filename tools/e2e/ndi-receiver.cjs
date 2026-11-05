/**
 * An NDI® receiver for tests: finds a source by name and returns its next video frame's size,
 * format and average colour. Uses the NDI Runtime named by VOICE_VERSES_NDI_LIB (never committed:
 * NDI's library stays with NDI). NDI® is a registered trademark of Vizrt NDI AB.
 */
const koffi = require('koffi');

function receiver(file = process.env.VOICE_VERSES_NDI_LIB) {
  const lib = koffi.load(file);
  const Source = koffi.struct('T_NDIlib_source_t', { p_ndi_name: 'const char *', p_url_address: 'const char *' });
  const FindCreate = koffi.struct('T_NDIlib_find_create_t', { show_local_sources: 'bool', p_groups: 'const char *', p_extra_ips: 'const char *' });
  // NDI keeps the receiver's strings, so they are passed as buffers that live as long as the receiver
  const SourceRef = koffi.struct('T_NDIlib_source_ref_t', { p_ndi_name: 'void *', p_url_address: 'void *' });
  const RecvCreate = koffi.struct('T_NDIlib_recv_create_v3_t', { source_to_connect_to: SourceRef, color_format: 'int', bandwidth: 'int', allow_video_fields: 'bool', p_ndi_recv_name: 'void *' });
  const Video = koffi.struct('T_NDIlib_video_frame_v2_t', {
    xres: 'int', yres: 'int', FourCC: 'uint32_t', frame_rate_N: 'int', frame_rate_D: 'int', picture_aspect_ratio: 'float',
    frame_format_type: 'int', timecode: 'int64_t', p_data: 'void *', line_stride_in_bytes: 'int', p_metadata: 'const char *', timestamp: 'int64_t',
  });
  const f = {
    init: lib.func('bool NDIlib_initialize()'),
    findCreate: lib.func('void * NDIlib_find_create_v2(const T_NDIlib_find_create_t *)'),
    findWait: lib.func('bool NDIlib_find_wait_for_sources(void *, uint32_t)'),
    findSources: lib.func('void * NDIlib_find_get_current_sources(void *, _Out_ uint32_t *)'),
    findDestroy: lib.func('void NDIlib_find_destroy(void *)'),
    recvCreate: lib.func('void * NDIlib_recv_create_v3(const T_NDIlib_recv_create_v3_t *)'),
    capture: lib.func('int NDIlib_recv_capture_v2(void *, _Out_ T_NDIlib_video_frame_v2_t *, void *, void *, uint32_t)'),
    free: lib.func('void NDIlib_recv_free_video_v2(void *, T_NDIlib_video_frame_v2_t *)'),
    recvDestroy: lib.func('void NDIlib_recv_destroy(void *)'),
  };
  f.init();
  const finder = f.findCreate({ show_local_sources: true, p_groups: null, p_extra_ips: '127.0.0.1' });

  /** The sources seen within `ms`: [{ name, url }] */
  const sources = (ms = 3000) => {
    const end = Date.now() + ms;
    let list = [];
    while (Date.now() < end) {
      f.findWait(finder, 500);
      const count = [0];
      const ptr = f.findSources(finder, count);
      list = count[0] && ptr ? koffi.decode(ptr, koffi.array(Source, count[0])) : [];
      if (list.length) break;
    }
    return list.map((s) => ({ name: s.p_ndi_name, url: s.p_url_address }));
  };

  /** The next video frame from the source whose name includes `match`, within `ms`. */
  const frame = (match, ms = 8000) => {
    const end = Date.now() + ms;
    let source = null;
    while (!source && Date.now() < end) source = sources(1000).find((s) => s.name.includes(match));
    if (!source) return null;
    const keep = [source.name, source.url, 'Voice Verses test'].map((t) => Buffer.from(`${t}\0`, 'utf8'));
    const recv = f.recvCreate({ source_to_connect_to: { p_ndi_name: keep[0], p_url_address: keep[1] }, color_format: 0 /* BGRX_BGRA */, bandwidth: 100, allow_video_fields: false, p_ndi_recv_name: keep[2] });
    try {
      while (Date.now() < end) {
        const video = {};
        const type = f.capture(recv, video, null, null, 1000);
        if (type !== 1) continue;
        const bytes = Buffer.from(koffi.decode(video.p_data, koffi.array('uint8_t', video.line_stride_in_bytes * video.yres, 'Typed')));
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (let i = 0; i < bytes.length; i += 4 * 499) { b += bytes[i]; g += bytes[i + 1]; r += bytes[i + 2]; a += bytes[i + 3]; n++; }
        const fourcc = String.fromCharCode(video.FourCC & 255, (video.FourCC >> 8) & 255, (video.FourCC >> 16) & 255, (video.FourCC >>> 24) & 255);
        const out = { name: source.name, width: video.xres, height: video.yres, fourcc, r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), a: Math.round(a / n), bytes };
        f.free(recv, video);
        return out;
      }
      return null;
    } finally {
      f.recvDestroy(recv);
      keep.length = 0;
    }
  };
  return { sources, frame, close: () => f.findDestroy(finder) };
}

module.exports = { receiver };
