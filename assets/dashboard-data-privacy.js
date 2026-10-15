/* Retire only known dashboard dataset snapshots. Keep sessions, preferences and drafts. */
(function () {
  'use strict';
  var signalKey = 'tqa_dataset_signout';
  function purge() {
    ['localStorage', 'sessionStorage'].forEach(function (kind) {
      try {
        var storage = window[kind], keys = [];
        for (var i = 0; i < storage.length; i++) keys.push(storage.key(i));
        keys.forEach(function (key) {
          if (key === 'hc-data' || key === 'tqa_csat' || key === 'csat_dashboard_cache_v2' || /^tqa_my_csat2_/.test(key || '')) storage.removeItem(key);
        });
      } catch (_) { /* Storage restrictions must not prevent a fresh load. */ }
    });
    try {
      var request = indexedDB.open('csat_dashboard');
      request.onupgradeneeded = function () { request.transaction.abort(); };
      request.onsuccess = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains('kv')) { db.close(); return; }
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').delete('csat_dashboard_cache_v2');
        tx.oncomplete = tx.onerror = tx.onabort = function () { db.close(); };
      };
      request.onerror = function () {};
    } catch (_) {}
  }
  function leave() {
    purge();
    // Dispose rendered rows, in-flight requests and all in-memory datasets together.
    window.location.replace('/');
  }
  window.TQADataPrivacy = {
    purge: purge,
    signOut: function () {
      purge();
      // Explicit logout clears only this project's local session, even when the
      // remote sign-out request failed. Preserve other projects and user drafts.
      ['localStorage', 'sessionStorage'].forEach(function (kind) {
        try { window[kind].removeItem('sb-ytbcydursrpjqnaalhxc-auth-token'); } catch (_) {}
      });
      try { localStorage.setItem(signalKey, Date.now() + ':' + Math.random()); } catch (_) {}
      try {
        if (window.BroadcastChannel) {
          var channel = new BroadcastChannel(signalKey);
          channel.postMessage('signed-out');
          channel.close();
        }
      } catch (_) {}
    }
  };
  window.addEventListener('storage', function (event) {
    if (event.key === signalKey || (/^sb-.+-auth-token$/.test(event.key || '') && !event.newValue)) leave();
  });
  try {
    if (window.BroadcastChannel) {
      var listener = new BroadcastChannel(signalKey);
      listener.onmessage = function (event) { if (event.data === 'signed-out') leave(); };
    }
  } catch (_) {}
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) window.location.reload();
  });
  purge();
}());
