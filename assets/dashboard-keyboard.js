// Support Enter and Space on dashboard controls rendered as non-native elements.
(function () {
  'use strict';
  function enhance(root) {
    root.querySelectorAll('div[onclick], span[onclick], th[onclick], td[onclick]').forEach(function (control) {
      if (control.tagName === 'TH' || control.tagName === 'TD') {
        // Keep table semantics; native buttons handle their own keys.
        if (control.querySelector('button, a, input, select, textarea')) return;
        var button = document.createElement('button');
        button.type = 'button';
        button.style.cssText = 'font:inherit;color:inherit;background:transparent;border:0;padding:0;cursor:pointer;text-align:inherit';
        // Cell labels can contain block divs; button content must be phrasing content.
        control.querySelectorAll('div').forEach(function (block) {
          var label = document.createElement('span');
          Array.from(block.attributes).forEach(function (attribute) {
            label.setAttribute(attribute.name, attribute.value);
          });
          label.style.display = 'block';
          while (block.firstChild) label.appendChild(block.firstChild);
          block.replaceWith(label);
        });
        while (control.firstChild) button.appendChild(control.firstChild);
        control.appendChild(button);
        return;
      }
      if (!control.hasAttribute('tabindex')) control.setAttribute('tabindex', '0');
      if (!control.hasAttribute('role')) control.setAttribute('role', 'button');
      control.setAttribute('data-keyboard-action', '');
    });
  }
  function init() {
    enhance(document);
    document.addEventListener('keydown', function (event) {
      if (event.defaultPrevented || (event.key !== 'Enter' && event.key !== ' ')) return;
      var control = event.target.closest('[data-keyboard-action]');
      if (!control || event.target !== control || control.getAttribute('aria-disabled') === 'true') return;
      event.preventDefault();
      if (!event.repeat) control.click();
    });
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          // Include the added node itself as well as any nested controls.
          if (node.parentElement) enhance(node.parentElement);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
