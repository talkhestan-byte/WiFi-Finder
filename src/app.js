
import { registerPlugin } from '@capacitor/core';

const WifiScanner = registerPlugin('WifiScanner');

const scanBtn = document.getElementById('scanBtn');
const statusBox = document.getElementById('status');
const networkList = document.getElementById('networkList');

const countBox = document.getElementById('count');
const totalCount = document.getElementById('totalCount');
const strongCount = document.getElementById('strongCount');

// فهرست آفلاین برخی شناسه‌های سازندگان تجهیزات شبکه
const vendorDatabase = {
  '50:C7:BF': 'TP-Link',
  '14:CC:20': 'TP-Link',
  '98:DA:C4': 'TP-Link',
  '60:32:B1': 'TP-Link',
  '30:B5:C2': 'TP-Link',
  'C0:06:C3': 'TP-Link',

  '00:E0:FC': 'Huawei',
  '00:18:82': 'Huawei',
  '00:25:9E': 'Huawei',
  '48:46:FB': 'Huawei',
  '78:F5:FD': 'Huawei',

  '00:19:C6': 'ZTE',
  '00:1B:D4': 'ZTE',
  '34:4B:50': 'ZTE',
  '7C:1C:F1': 'ZTE',

  '00:1A:92': 'ASUS',
  '04:92:26': 'ASUS',
  '2C:56:DC': 'ASUS',

  '00:14:6C': 'NETGEAR',
  '00:1B:2F': 'NETGEAR',
  '20:4E:7F': 'NETGEAR',

  '00:1B:11': 'D-Link',
  '1C:7E:E5': 'D-Link',
  '28:10:7B': 'D-Link',

  '64:09:80': 'Xiaomi',
  '78:11:DC': 'Xiaomi',
  '8C:BE:BE': 'Xiaomi',

  '00:1B:54': 'Cisco',
  '00:1D:7E': 'Cisco',
  '00:23:EB': 'Cisco'
};

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function getVendor(mac) {
  if (!mac || mac.length < 8) {
    return 'نامشخص';
  }

  const prefix = mac
    .toUpperCase()
    .split(':')
    .slice(0, 3)
    .join(':');

  return vendorDatabase[prefix] || 'نامشخص';
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

function formatLastSeen(seconds) {
  if (seconds === undefined || seconds === null) {
    return 'نامشخص';
  }

  if (seconds < 60) {
    return `${seconds} ثانیه قبل`;
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} دقیقه قبل`;
  }

  return `${Math.floor(seconds / 3600)} ساعت قبل`;
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

    const vendor = getVendor(network.bssid);

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
            <small>برند سازنده احتمالی</small>
            <strong>${escapeHTML(vendor)}</strong>
          </div>

          <div class="detail">
            <small>قدرت سیگنال</small>
            <strong>${signalLevel(level)}</strong>
          </div>

          <div class="detail">
            <small>باند فرکانسی</small>
            <strong>${escapeHTML(network.band)}</strong>
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
            <small>پهنای کانال</small>
            <strong>${escapeHTML(network.channelWidth)}</strong>
          </div>

          <div class="detail">
            <small>استاندارد Wi-Fi</small>
            <strong>${escapeHTML(network.wifiStandard)}</strong>
          </div>

          <div class="detail">
            <small>نوع امنیت</small>
            <strong>${escapeHTML(network.security)}</strong>
          </div>

          <div class="detail">
            <small>آخرین مشاهده</small>
            <strong>${formatLastSeen(network.lastSeenSeconds)}</strong>
          </div>

          <div class="detail">
            <small>شناسه سازنده</small>
            <strong>${escapeHTML(
              network.bssid
                ? network.bssid.split(':').slice(0, 3).join(':')
                : 'نامشخص'
            )}</strong>
          </div>

          <div class="detail" style="grid-column:1/-1">
            <small>آدرس MAC (BSSID)</small>
            <strong>${escapeHTML(network.bssid)}</strong>
          </div>

          <div class="detail" style="grid-column:1/-1">
            <small>مشخصات خام امنیتی شبکه</small>
            <strong>${escapeHTML(network.capabilities)}</strong>
          </div>

        </div>
      </article>
    `;
  }).join('');
}

scanBtn.addEventListener('click', async () => {

  scanBtn.disabled = true;
  scanBtn.textContent = 'در حال اسکن...';

  statusBox.textContent =
    'در حال بررسی شبکه‌های اطراف';

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
