window.TQASessionRetry = function () {
  if (document.getElementById('session-retry-dialog')) return;
  var dialog = document.createElement('dialog');
  dialog.id = 'session-retry-dialog';
  dialog.setAttribute('aria-label', 'Kết nối đang gián đoạn');
  dialog.style.cssText = 'visibility:visible;margin:auto;width:min(440px,90vw);padding:28px;border:0;border-radius:20px;line-height:1.7;color:#253047';
  dialog.innerHTML = '<h2 style="font-size:20px;margin-bottom:12px">Kết nối đang gián đoạn</h2><p>Chưa kiểm tra được phiên đăng nhập hoặc quyền truy cập. Bạn thử lại khi mạng ổn định nhé.</p><button type="button" style="margin-top:18px;padding:10px 22px;border:0;border-radius:10px;background:#5264dc;color:white;cursor:pointer">Thử lại</button>';
  dialog.addEventListener('cancel', function (event) { event.preventDefault(); });
  dialog.querySelector('button').onclick = function () { location.reload(); };
  document.body.appendChild(dialog);
  dialog.showModal();
};
