/**
 * 通用工具函数
 */

/** URL 解码设备名称 */
export function decodeHostname(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/** 格式化速率显示：自动转换 KB/s / MB/s */
export function formatSpeed(kbPerSec: number): string {
  if (kbPerSec === 0) return '0 KB/s';
  if (kbPerSec >= 1024) {
    const mb = kbPerSec / 1024;
    return mb >= 10 ? `${Math.round(mb)} MB/s` : `${mb.toFixed(1)} MB/s`;
  }
  return `${kbPerSec} KB/s`;
}

/** 格式化 MAC 地址为标准格式 xx:xx:xx:xx:xx:xx */
export function formatMAC(mac: string): string {
  const clean = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (clean.length !== 12) return mac;
  return clean.match(/.{2}/g)!.join(':');
}

/** 判断设备类型图标 */
export function getDeviceIcon(hostname: string): string {
  const name = hostname.toLowerCase();
  if (name.includes('iphone') || name.includes('手机')) return '📱';
  if (name.includes('ipad') || name.includes('平板')) return '📺';
  if (name.includes('macbook') || name.includes('desktop') || name.includes('laptop') || name.includes('pc')) return '💻';
  if (name.includes('tv') || name.includes('电视') || name.includes('xiaomi') && (name.includes('tv') || name.includes('电视'))) return '📡';
  return '🔌';
}

/** 判断设备图标背景类型 */
export function getDeviceType(hostname: string): 'phone' | 'laptop' | 'tv' | 'tablet' | 'unknown' {
  const name = hostname.toLowerCase();
  if (name.includes('iphone') || name.includes('手机') || name.includes('android')) return 'phone';
  if (name.includes('macbook') || name.includes('desktop') || name.includes('laptop') || name.includes('pc')) return 'laptop';
  if (name.includes('ipad') || name.includes('平板')) return 'tablet';
  if (name.includes('tv') || name.includes('电视')) return 'tv';
  return 'unknown';
}

/** 获取连接类型标识 */
export function getConnectionType(wifiMode: string, phyMode: string): 'wifi5' | 'wifi24' | 'eth' | 'unknown' {
  if (phyMode?.toLowerCase().includes('11ac') || phyMode?.toLowerCase().includes('11ax') || phyMode?.toLowerCase().includes('5g') || wifiMode?.toLowerCase().includes('5g')) return 'wifi5';
  if (phyMode?.toLowerCase().includes('11n') || phyMode?.toLowerCase().includes('11g') || phyMode?.toLowerCase().includes('11b') || wifiMode?.toLowerCase().includes('2.4g')) return 'wifi24';
  if (wifiMode === '0' || phyMode === '0' || (!wifiMode && !phyMode)) return 'eth';
  return 'unknown';
}

/** URL 解码模板名称 */
export function decodeTemplateName(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}
