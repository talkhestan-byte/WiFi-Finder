
import { registerPlugin } from '@capacitor/core';

const WifiScanner = registerPlugin('WifiScanner');

const scanBtn = document.getElementById('scanBtn');
const statusBox = document.getElementById('status');
const networkList = document.getElementById('networkList');

const countBox = document.getElementById('count');
const totalCount = document.getElementById('totalCount');
const strongCount = document.getElementById('strongCount');

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function signalLevel(rssi) {
  if (rssi >= -50) return 'عالی';
  if (rssi >= -60) return 'قوی';
  if (rssi >= -70) return 'متوسط';
  if (rssi >= -80) return 'ضعیف';
  return 'بسیار ضعیف';
}

function signalPercent(rssi) {
  return Math.max(0, Math.min(100, (rssi + 100) * 2));
}

function renderNetworks(networks) {
  networks.sort((a, b) => b.level - a.level);

  totalCount.textContent = networks.length;
  countBox.textContent = `${networks.length} شبکه`;

  strongCount.textContent =
    networks.filter(n => n.level >= -60).length;

  if (!networks.length) {
    networkList.innerHTML = `
      <div class="empty">
        شبکه‌ای پیدا نشد.<br>
        وای‌فای و موقعیت مکانی گوشی را بررسی کنید.
      </div>
    `;
    return;
  }

  networkList.innerHTML = networks.map((network, index) => {
    const name = network.ssid || 'شبکه بدون نام';
    const level = Number(network.level) || -100;
    const percent = signalPercent(level);

    return `
      <article class="network-card">

        <div class="network-top">
          <div class="network-name">
            ${index + 1}. ${escapeHTML(name)}
          </div>

          <div class="signal">
            ${level} dBm
          </div>
        </div>

        <div class="signal-bar">
          <div class="signal-fill"
            style="width:${percent}%"></div>
        </div>

        <div class="network-details">

          <div class="detail">
            <small>قدرت سیگنال</small>
            <strong>${signalLevel(level)}</strong>
          </div>

          <div class="detail">
            <small>فرکانس</small>
            <strong>${network.frequency} MHz</strong>
          </div>

          <div class="detail">
            <small>کانال</small>
            <strong>${network.channel || 'نامشخص'}</strong>
          </div>

          <div class="detail">
            <small>امنیت</small>
            <strong>${escapeHTML(network.security)}</strong>
          </div>

          <div class="detail" style="grid-column:1/-1">
            <small>BSSID</small>
            <strong>${escapeHTML(network.bssid)}</strong>
          </div>

        </div>
      </article>
    `;
  }).join('');
}

scanBtn.addEventListener('click', async () => {
  scanBtn.disabled = true;
  scanBtn.textContent = 'در حال اسکن...';
  statusBox.textContent = 'در حال بررسی شبکه‌های اطراف';

  try {
    const result = await WifiScanner.scan();

    renderNetworks(result.networks || []);

    statusBox.textContent =
      result.message || 'اسکن با موفقیت انجام شد';

  } catch (error) {
    statusBox.textContent =
      error.message || 'خطا در شناسایی شبکه‌ها';

    networkList.innerHTML = `
      <div class="empty">
        ${escapeHTML(error.message || 'اسکن انجام نشد')}
      </div>
    `;
  } finally {
    scanBtn.disabled = false;
    scanBtn.innerHTML = '<span>⌕</span> شروع اسکن';
  }
});
