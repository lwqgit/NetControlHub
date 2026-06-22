/**
 * 路由器 API 服务层
 * 封装所有与 TP-LINK 路由器的 HTTP 交互
 */
import { Platform } from 'react-native';
import { decodeHostname, decodeTemplateName } from '../utils/helpers';

// —— 类型定义 ——

export interface Device {
  mac: string;
  ip: string;
  name: string;
  isOnline: boolean;
  upSpeed: number;
  downSpeed: number;
  downLimit: number;
  upLimit: number;
  limitTimeId: string;
  limitTimeName: string;
  blocked: boolean;
  wifiMode: string;
  phyMode: string;
  ssiType: string;
}

export interface TimeTemplate {
  id: string;
  name: string;
  enable: string;
  dayOfWeek: number[];  // 0=周日, 1=周一...6=周六
  startTime: string;    // HH:MM
  endTime: string;      // HH:MM
}

export interface ApiResponse {
  error_code: number;
  [key: string]: any;
}

export interface LoginResult {
  success: boolean;
  stok?: string;
  error?: string;
}

// —— 配置 ——

const DEFAULT_ROUTER_IP = '192.168.2.1';
const DEFAULT_TIMEOUT = 5000;
const PROXY_URL = 'http://localhost:3001/proxy';
const IS_WEB = Platform.OS === 'web';

let routerIp = DEFAULT_ROUTER_IP;
let stok = '';
let requestTimeout = DEFAULT_TIMEOUT;

export function setRouterIp(ip: string) {
  routerIp = ip;
}

export function getRouterIp(): string {
  return routerIp;
}

export function setStok(token: string) {
  stok = token;
}

export function getStok(): string {
  return stok;
}

export function setRequestTimeout(ms: number) {
  requestTimeout = ms;
}

export function clearStok() {
  stok = '';
}

// —— 通用请求 ——

async function apiPost<T = ApiResponse>(
  endpoint: string,
  body: Record<string, any>,
  useStok: boolean = true,
  timeout: number = requestTimeout
): Promise<T> {
  let fetchUrl: string;
  const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };

  if (IS_WEB) {
    // Web 端：通过本地代理服务器转发，绕过浏览器 CORS 限制
    // stok 可能已含 URL 编码字符（如 %21），不要再用 URLSearchParams 重复编码
    const stokPart = (useStok && stok) ? `&stok=${stok}` : '';
    fetchUrl = `${PROXY_URL}?host=${encodeURIComponent(routerIp)}${stokPart}`;
  } else {
    // 原生端（iOS/Android）：直接请求路由器，无 CORS 限制
    // stok 从路由器返回时已是 URL 编码格式，不要再 encodeURIComponent
    fetchUrl = useStok && stok
      ? `http://${routerIp}/stok=${stok}`
      : `http://${routerIp}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data: T = await response.json();
    return data;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('路由器响应超时，请检查网络连接');
    }
    // 保留原始错误信息，方便排查问题（如 Android 明文 HTTP 拦截等）
    const detail = err?.message || String(err);
    console.error(`[apiPost] 请求失败 -> ${fetchUrl}: ${detail}`);
    throw new Error(`无法连接到路由器(${detail})，请确认已连接家庭WiFi`);
  }
}

// —— 1. 登录 ——

export async function login(password: string): Promise<LoginResult> {
  try {
    const data = await apiPost('', {
      method: 'do',
      login: {
        username: 'admin',
        password: 'aP4QxK1x9TefbwK',
      },
    }, false);

    if (data.error_code === 0 && data.stok) {
      stok = data.stok;
      return { success: true, stok: data.stok };
    }
    return { success: false, error: '密码错误，请重新输入' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// —— 2. 获取设备列表 ——

/** 解析 host_info / online_host 返回的 [{ host_info_N: {...} }] 结构 */
function extractHostList(raw: any[]): any[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry: any) => Object.values(entry)[0]);
}

export async function fetchDevices(): Promise<Device[]> {
  // 并行请求：已接入设备（全量）+ 在线设备（含实时速率）
  const [allData, onlineData] = await Promise.all([
    apiPost('/stok=...', {
      hosts_info: { table: 'host_info', name: 'cap_host_num' },
      method: 'get',
    }),
    apiPost('/stok=...', {
      hosts_info: { table: 'online_host', name: 'cap_host_num' },
      method: 'get',
    }),
  ]);

  if (allData.error_code !== 0 && onlineData.error_code !== 0) {
    if (allData.error_code === -1 || onlineData.error_code === -1) throw new Error('TOKEN_EXPIRED');
    throw new Error('获取设备列表失败');
  }

  // 解析全量设备列表
  const allHostRaw: any[] = allData.hosts_info?.host_info || [];
  const allHostList = extractHostList(allHostRaw);

  // 解析在线设备列表，构建 mac → 在线数据 映射
  const onlineRaw: any[] = onlineData.hosts_info?.online_host || [];
  const onlineList = extractHostList(onlineRaw);
  const onlineMap = new Map<string, any>();
  onlineList.forEach((item: any) => {
    if (item.mac) onlineMap.set(item.mac, item);
  });

  // 合并：以全量设备为基准，在线设备覆盖实时数据
  const devices: Device[] = allHostList.map((item: any) => {
    const online = onlineMap.get(item.mac);
    const merged = online || item;
    return {
      mac: merged.mac || '',
      ip: merged.ip || '',
      name: decodeHostname(merged.hostname || '未知设备'),
      isOnline: !!online,
      upSpeed: parseInt(merged.up_speed || '0'),
      downSpeed: parseInt(merged.down_speed || '0'),
      downLimit: parseInt(merged.down_limit || '0'),
      upLimit: parseInt(merged.up_limit || '0'),
      limitTimeId: merged.limit_time || '',
      limitTimeName: merged.limit_time_name || '',
      blocked: merged.blocked === '1',
      wifiMode: merged.wifi_mode || '',
      phyMode: merged.phy_mode || '',
      ssiType: merged.ssi_type || '',
    };
  });

  return devices;
}

// —— 3. 设置设备限速 ——

export async function setDeviceSpeedLimit(
  mac: string,
  name: string,
  downLimit: number,
  upLimit: number
): Promise<boolean> {
  const data = await apiPost('/stok=...', {
    hosts_info: {
      set_flux_limit: {
        mac: mac,
        is_blocked: '0',
        name: name,
        down_limit: String(downLimit),
        up_limit: String(upLimit),
        limit_time: '',
        forbid_domain: '',
      },
    },
    method: 'do',
  });

  if (data.error_code === -1) throw new Error('TOKEN_EXPIRED');
  return data.error_code === 0;
}

// —— 4. 设置设备断网/联网 ——

export async function setDeviceBlocked(
  mac: string,
  name: string,
  blocked: boolean
): Promise<boolean> {
  const data = await apiPost('/stok=...', {
    hosts_info: {
      set_flux_limit: {
        mac: mac,
        is_blocked: blocked ? '1' : '0',
        name: name,
        down_limit: '0',
        up_limit: '0',
        limit_time: '',
        forbid_domain: '',
      },
    },
    method: 'do',
  });

  if (data.error_code === -1) throw new Error('TOKEN_EXPIRED');
  return data.error_code === 0;
}

// —— 5. 获取时间模板 ——

export async function fetchTimeTemplates(): Promise<TimeTemplate[]> {
  const data = await apiPost('/stok=...', {
    hosts_info: { table: 'limit_time' },
    method: 'get',
  });

  if (data.error_code === -1) throw new Error('TOKEN_EXPIRED');
  if (data.error_code !== 0) return [];

  const templates = data.hosts_info?.limit_time || [];
  const templateList = extractHostList(templates);
  return templateList.map((item: any) => ({
    id: item.name || '',
    name: decodeTemplateName(item.name || '未知模板'),
    enable: item.enable || '0',
    dayOfWeek: parseDayOfWeek(item.day_of_week || ''),
    startTime: formatTimeStr(item.start_time || ''),
    endTime: formatTimeStr(item.end_time || ''),
  }));
}

function parseDayOfWeek(dayStr: string): number[] {
  if (!dayStr) return [1, 2, 3, 4, 5, 6, 7]; // 默认全部
  const days: number[] = [];
  for (let i = 0; i < 7; i++) {
    if (dayStr[i] === '1') days.push(i + 1);
  }
  return days;
}

function formatTimeStr(str: string): string {
  if (!str || str.length < 4) return '00:00';
  return `${str.slice(0, 2)}:${str.slice(2, 4)}`;
}

// —— 6. 退出登录 ——

export async function logout(): Promise<boolean> {
  try {
    const data = await apiPost('/stok=...', {
      system: { logout: 'null' },
      method: 'do',
    }, true, 2000); // 短超时，避免后台挂起
    return data.error_code === 0;
  } catch {
    return false;
  }
}

// —— 7. 获取网络总速率 ——

export interface NetworkStats {
  upSpeed: number;   // KB/s
  downSpeed: number; // KB/s
}

export async function fetchNetworkStats(): Promise<NetworkStats> {
  const data = await apiPost('/stok=...', {
    network: { name: ['wan_status', 'wanv6_status'] },
    protocol: { name: ['dhcp', 'ipv6_info'] },
    method: 'get',
  });

  if (data.error_code !== 0) {
    throw new Error('获取网络速率失败');
  }

  const wan = data.network?.wan_status || {};
  return {
    upSpeed: parseInt(wan.up_speed || '0'),
    downSpeed: parseInt(wan.down_speed || '0'),
  };
}

// —— 8. 设置设备时间限制 ——

export async function setDeviceTimeLimit(
  mac: string,
  name: string,
  limitTimeId: string
): Promise<boolean> {
  const data = await apiPost('/stok=...', {
    hosts_info: {
      set_host_info: {
        mac: mac,
        is_blocked: '0',
        name: name,
        down_limit: '0',
        up_limit: '0',
        forbid_domain: '',
        limit_time: limitTimeId,
      },
    },
    method: 'do',
  });

  if (data.error_code === -1) throw new Error('TOKEN_EXPIRED');
  return data.error_code === 0;
}
