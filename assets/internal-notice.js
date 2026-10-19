window.TQAInternalNotice = async function (sb) {
  var version = 'internal-20261019-v1';
  var result = await sb.auth.getUser();
  var user = result.data && result.data.user;
  var preview = ['127.0.0.1', 'localhost'].includes(location.hostname) && new URLSearchParams(location.search).get('preview') === 'internal-notice';
  if (result.error || !user || (!preview && (user.user_metadata || {}).internal_notice_seen === version)) return;
  var dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', 'Web đang thay đổi một chút');
  dialog.className = 'tqa-internal-notice';
  dialog.style.cssText = 'margin:auto;width:min(520px,90vw);border:0;border-radius:20px;padding:28px;line-height:1.7;color:#253047;box-shadow:0 20px 80px #0004';
  dialog.innerHTML = '<style>.tqa-internal-notice::backdrop{background:rgba(28,35,58,.4);backdrop-filter:blur(4px)}.tqa-notice-mascot{width:96px;height:96px;margin:0 auto 18px;display:grid;place-items:center;border-radius:30px;background:#edf7ef;font-size:54px;animation:tqa-sprout-sway 2.8s ease-in-out infinite;transform-origin:50% 90%}.tqa-notice-tag{text-align:center;font-size:12px;color:#647768;margin-bottom:12px;letter-spacing:.3px}@keyframes tqa-sprout-sway{0%,100%{transform:rotate(-7deg) translateY(0)}50%{transform:rotate(7deg) translateY(-5px)}}@media(prefers-reduced-motion:reduce){.tqa-notice-mascot{animation:none}}</style><div class="tqa-notice-mascot" aria-hidden="true">🌱</div><div class="tqa-notice-tag">Đang chăm chút mỗi ngày ✨</div><h2 style="font-size:22px;margin-bottom:16px;text-align:center">Web đang thay đổi một chút</h2><p>Các nội dung CSAT và dữ liệu IH đã được gỡ khỏi web. Sắp tới, web sẽ tập trung vào các tiện ích phục vụ công việc nội bộ. Một số tính năng vẫn đang được phát triển, mong mọi người chờ thêm nhé.</p><p style="margin-top:14px">💬 Nếu có ý tưởng hay muốn góp ý để web hữu ích hơn, mọi người cứ để lại ở tab <strong>Feedback</strong> nha. Cảm ơn mọi người!</p><p role="status" style="color:#b42318;margin-top:12px"></p><button type="button" style="display:block;width:100%;margin-top:20px;padding:12px 24px;border:0;border-radius:12px;background:#5264dc;color:white;font:inherit;font-weight:600;cursor:pointer">Mình hiểu rồi 💚</button>';
  dialog.addEventListener('cancel', function (event) { event.preventDefault(); });
  var button = dialog.querySelector('button');
  button.onclick = async function () {
    if (preview) { dialog.close(); dialog.remove(); return; }
    button.disabled = true;
    try {
      var saved = await sb.auth.updateUser({ data: { internal_notice_seen: version } });
      if (saved.error) throw saved.error;
      dialog.close(); dialog.remove();
    } catch (_) {
      dialog.querySelector('[role="status"]').textContent = 'Chưa lưu được xác nhận. Bạn thử lại nhé.';
      button.disabled = false;
    }
  };
  document.body.appendChild(dialog); dialog.showModal();
};
