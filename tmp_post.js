(async () => {
  const payload = { mode: 'html', html: '<html><head><title>Test</title></head><body><img src="/logo.png"><button></button></body></html>', url: null };
  try {
    const res = await fetch('http://localhost:3001/api/ux-audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    console.log('status', res.status);
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error('fetch error', e);
  }
})();
