(function () {
  'use strict';
  var version = 'internal-20261019-v1';
  var key = 'tqa_login_reset_version';
  try {
    if (localStorage.getItem(key) === version) return;
    // Browser logout only: do not call Auth signOut or revoke server sessions.
    ['localStorage', 'sessionStorage'].forEach(function (kind) {
      var store = window[kind];
      ['sb-ytbcydursrpjqnaalhxc-auth-token', 'sb-ytbcydursrpjqnaalhxc-auth-token-code-verifier'].forEach(function (name) { store.removeItem(name); });
    });
    localStorage.setItem(key, version);
    localStorage.setItem('tqa_dataset_signout', Date.now() + ':internal-update');
    if (location.pathname !== '/' && location.pathname !== '/index.html') location.replace('/');
  } catch (_) { /* A browser without persistent storage cannot retain a login. */ }
}());
