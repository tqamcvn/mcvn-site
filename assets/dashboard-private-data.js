/* Private snapshot transport. The RPC is responsible for authorization. */
(function () {
  'use strict';
  var originalFetch = window.fetch.bind(window);
  var origin = 'https://ytbcydursrpjqnaalhxc.supabase.co';
  var anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0YmN5ZHVyc3JwanFuYWFsaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwOTY1NjAsImV4cCI6MjEwMTY3MjU2MH0.Xuyiz-gRxochNWbHky_diYbQAnHtEfCODKUxO4cUjuo';
  var datasets = new Set(['headcount', 'newbie', 'csatteamcall', 'chat-log-part-time', 'treatment-monthly', 'csat-agent', 'cs-performance']);
  var clientPromise;
  function client() {
    if (!clientPromise) clientPromise = new Promise(function (resolve, reject) {
      var started = Date.now();
      function ready() {
        if (window.supabase && window.supabase.createClient) {
          try { resolve(window.supabase.createClient(origin, anonKey)); } catch (error) { reject(error); }
        } else if (Date.now() - started >= 5000) reject(new Error('Dịch vụ đăng nhập chưa sẵn sàng.'));
        else setTimeout(ready, 25);
      }
      ready();
    }).catch(function (error) { clientPromise = undefined; throw error; });
    return clientPromise;
  }
  window.fetch = function (input, init) {
    var request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
    var url;
    try { url = new URL(request ? request.url : input, window.location.href); }
    catch (_) { return originalFetch(input, init); }
    var method = String((init && init.method) || (request && request.method) || 'GET').toUpperCase();
    var match = /^\/([^/]+)\/data\.json$/.exec(url.pathname);
    if (url.origin !== window.location.origin || method !== 'GET' || !match || !datasets.has(match[1])) return originalFetch(input, init);
    var external = init && init.signal !== undefined ? init.signal : request && request.signal;
    return (async function () {
      var controller = new AbortController();
      var abort = function () { controller.abort(external.reason); };
      if (external) {
        if (external.aborted) abort();
        else external.addEventListener('abort', abort, { once: true });
      }
      var timer = setTimeout(function () { controller.abort(new DOMException('Snapshot request timed out', 'TimeoutError')); }, 15000);
      var onAbort;
      var aborted = new Promise(function (_, reject) {
        onAbort = function () { reject(controller.signal.reason || new DOMException('Aborted', 'AbortError')); };
        if (controller.signal.aborted) onAbort();
        else controller.signal.addEventListener('abort', onAbort, { once: true });
      });
      try {
        return await Promise.race([aborted, (async function () {
          if (controller.signal.aborted) throw controller.signal.reason;
          var sb = await client();
          if (controller.signal.aborted) throw controller.signal.reason;
          var result = await sb.auth.getSession();
          if (controller.signal.aborted) throw controller.signal.reason;
          var token = result && result.data && result.data.session && result.data.session.access_token;
          if (result.error || !token) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
          return originalFetch(origin + '/rest/v1/rpc/dashboard_get_snapshot', {
            method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
            headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: 'Bearer ' + token },
            body: JSON.stringify({ dataset: match[1] }), signal: controller.signal
          });
        })()]);
      } finally {
        clearTimeout(timer);
        controller.signal.removeEventListener('abort', onAbort);
        if (external) external.removeEventListener('abort', abort);
      }
    })();
  };
})();
