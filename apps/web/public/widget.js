/* ConversionOps Lead Capture Widget — v1.0 */
(function(w, API_URL) {
  'use strict';
  var _co = w['_co'] = w['_co'] || [];
  var workspaceId = _co[0];
  if (!workspaceId) return;

  function send(data) {
    try {
      var body = JSON.stringify({
        workspaceId: workspaceId,
        source: 'WEB_FORM',
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || data.tel || '',
        message: data.message || '',
        pageUrl: w.location.href
      });
      if (!body.email && !body.phone) return;
      var xhr = new XMLHttpRequest();
      xhr.open('POST', API_URL + '/webhooks/lead', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(body);
    } catch (e) { /* fail silently */ }
  }

  function extractFormData(form) {
    var data = {};
    var fields = form.querySelectorAll('input, textarea, select');
    for (var i = 0; i < fields.length; i++) {
      var el = fields[i];
      var name = (el.name || el.id || '').toLowerCase();
      var val = el.value || '';
      if (!val) continue;
      if (/email/.test(name)) data.email = val;
      else if (/phone|tel|mobile/.test(name)) data.phone = val;
      else if (/^(first.?name|fname|firstname)$/.test(name)) data.name = (data.name ? data.name + ' ' : '') + val;
      else if (/^(last.?name|lname|lastname|surname)$/.test(name)) data.name = (data.name || '') + ' ' + val;
      else if (/^(full.?name|name)$/.test(name)) data.name = val;
      else if (/message|comment|note|inquiry/.test(name)) data.message = val;
    }
    return data;
  }

  function onSubmit(e) {
    var form = e.target || e.srcElement;
    if (!form || form.tagName !== 'FORM') return;
    var data = extractFormData(form);
    if (data.email || data.phone) send(data);
  }

  if (document.addEventListener) {
    document.addEventListener('submit', onSubmit, true);
  }
})(window, 'https://api.conversionops.in/v1');
