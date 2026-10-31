// A stand-in for Ollama on port 11555 for testing AI slides: returns fixed slides.
// Point Settings → AI at http://127.0.0.1:11555 (provider Ollama, model "mock").
const http = require('http');
http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') return res.end();
    if (req.url.startsWith('/api/tags')) return res.end(JSON.stringify({ models: [{ name: 'mock' }] }));
    const r = JSON.parse(body || '{}');
    // The last request, for inspecting the prompt
    require('fs').writeFileSync(require('path').join(require('os').tmpdir(), 'mock-ollama-request.json'), body);
    const sermon = /sermon notes/i.test(r.messages?.[0]?.content ?? '');
    const slides = sermon
      ? [{ title: 'Rise and Walk', body: 'Pastor James' }, { title: 'Jesus sees the one', body: 'Jesus sees the one others pass by.', scripture: 'John 5:6' }, { title: 'Obedience brings the miracle', body: 'He rose and walked when he obeyed.', scripture: 'John 5:8' }]
      : [{ title: 'Youth Night', body: 'This Friday at 7pm in the main hall. Pizza provided.' }, { title: 'Baptism Sunday', body: '15 November. Sign up at the welcome desk.' }];
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: { role: 'assistant', content: JSON.stringify({ slides }) } }));
  });
}).listen(11555, () => console.log('mock ollama on 11555'));
