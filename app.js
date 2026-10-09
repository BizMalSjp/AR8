const viewer = document.getElementById('mascot');
const resetButton = document.getElementById('reset');
const rotateButton = document.getElementById('rotate');
const saveButton = document.getElementById('save-image');
const arButton = document.getElementById('launch-ar');
const arHelp = document.getElementById('ar-help');
const loading = document.getElementById('loading');
const notice = document.getElementById('notice');
const staticFallback = document.getElementById('static-fallback');
let modelReady = false;
let fallbackTimer;
let arCheckTimer;
const isAndroid = /android/i.test(navigator.userAgent);
function showNotice(message) { notice.textContent = message; notice.hidden = false; }
function showStaticFallback(message) {
  clearInterval(arCheckTimer);
  viewer.hidden = true;
  staticFallback.hidden = false;
  loading.hidden = true;
  resetButton.disabled = rotateButton.disabled = saveButton.disabled = true;
  arButton.disabled = true;
  arHelp.textContent = message;
}
function syncArAvailability() {
  if (!staticFallback.hidden) { arButton.disabled = true; return; }
  const available = modelReady && viewer.canActivateAR;
  arButton.disabled = !available;
  arHelp.textContent = available
    ? '「ARで表示する」を押し、床やテーブルを映して配置してください。'
    : modelReady ? (isAndroid
      ? '床を認識するARを利用できません。ChromeとARCore対応端末・Google Play開発者サービス（AR）が必要です。Redmi 12Cなどの非対応端末では3D表示をご利用ください。'
      : '床を認識するARには対応端末・ブラウザが必要です。iPhone・iPadはSafariで開いてください。3D表示は引き続き利用できます。')
      : 'ARの対応状況を確認しています。';
}
// AR capability detection is asynchronous and can finish after the model load event.
function refreshArAvailability() {
  clearInterval(arCheckTimer);
  syncArAvailability();
  let attempts = 0;
  arCheckTimer = window.setInterval(() => {
    syncArAvailability();
    if (viewer.canActivateAR || ++attempts >= 30) clearInterval(arCheckTimer);
  }, 500);
}
viewer.addEventListener('load', () => {
  clearTimeout(fallbackTimer);
  viewer.hidden = false;
  staticFallback.hidden = true;
  modelReady = true;
  loading.hidden = true;
  resetButton.disabled = rotateButton.disabled = saveButton.disabled = false;
  refreshArAvailability();
});
viewer.addEventListener('error', event => {
  if (event.detail?.type === 'webglcontextlost') {
    modelReady = false;
    showStaticFallback('この端末では3D表示を続けられないため、画像で表示しています。');
    return;
  }
  modelReady = false;
  showStaticFallback('3Dモデルを読み込めなかったため、画像で表示しています。通信状況を確認して再読み込みしてください。');
});
viewer.addEventListener('ar-status', event => {
  if (event.detail.status === 'failed') showNotice('床認識ARを開始できませんでした。対応端末でChromeまたはSafariを使い、カメラの許可を確認してください。AndroidはGoogle Play開発者サービス（AR）も必要です。');
  if (event.detail.status === 'not-presenting') syncArAvailability();
});
resetButton.addEventListener('click', () => {
  viewer.autoRotate = false;
  rotateButton.setAttribute('aria-pressed', 'false');
  viewer.cameraOrbit = '0deg 78deg auto';
  viewer.cameraTarget = 'auto auto auto';
  viewer.fieldOfView = 'auto';
  viewer.jumpCameraToGoal();
});
rotateButton.addEventListener('click', () => {
  viewer.autoRotate = !viewer.autoRotate;
  rotateButton.setAttribute('aria-pressed', String(viewer.autoRotate));
});
arButton.addEventListener('click', async () => {
  if (!modelReady || !viewer.canActivateAR) return;
  notice.hidden = true;
  try { await viewer.activateAR(); }
  catch { showNotice('ARを開始できませんでした。SafariまたはChromeで開いてお試しください。'); }
});
saveButton.addEventListener('click', async () => {
  saveButton.disabled = true;
  try {
    const blob = await viewer.toBlob({ mimeType: 'image/png' });
    if (!blob) throw new Error('No image');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'blue-rabbit-3d.png';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch { showNotice('画像を保存できませんでした。端末のスクリーンショット機能をご利用ください。'); }
  finally { saveButton.disabled = !modelReady; }
});
window.addEventListener('pageshow', refreshArAvailability);
fallbackTimer = window.setTimeout(() => {
  if (!modelReady) showStaticFallback('3Dの読み込みに時間がかかっています。画像を表示しています。通信状況を確認して再読み込みしてください。');
}, 20000);
