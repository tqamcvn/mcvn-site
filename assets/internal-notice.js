window.TQAInternalNotice = async function (sb) {
  var version = 'internal-20261019-v1';
  var result = await sb.auth.getUser();
  var user = result.data && result.data.user;
  if (result.error || !user || (user.user_metadata || {}).internal_notice_seen === version) return;
  var dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', 'Thông báo cập nhật website');
  dialog.style.cssText = 'margin:auto;width:min(520px,90vw);border:0;border-radius:20px;padding:28px;line-height:1.7;color:#253047;box-shadow:0 20px 80px #0004';
  dialog.innerHTML = '<h2 style="font-size:21px;margin-bottom:16px">Thông báo cập nhật website</h2><p>Hiện web đã remove all CSAT/ data IH, chuyển web về nội bộ và tính năng đang được phát triển theo hướng nội bộ. Nhờ người dùng đợi thêm</p><p style="margin-top:12px">Nếu có idea gì có thể note feedback ở tab feedback</p><p role="status" style="color:#b42318;margin-top:12px"></p><button type="button" style="margin-top:20px;padding:10px 24px;border:0;border-radius:10px;background:#5264dc;color:white;cursor:pointer">Đã hiểu</button>';
  dialog.addEventListener('cancel', function (event) { event.preventDefault(); });
  var button = dialog.querySelector('button');
  button.onclick = async function () {
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
