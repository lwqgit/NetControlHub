/**
 * 设备列表页面
 * 功能：展示在线/离线设备、实时速率、统计卡片、下拉刷新
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { fetchDevices, Device, fetchNetworkStats } from '../services/api';
import {
  formatSpeed,
  formatMAC,
  getDeviceIcon,
  getDeviceType,
  getConnectionType,
} from '../utils/helpers';
import { Colors, EmptyState, Toast } from '../components/Common';

type RootStackParamList = {
  DeviceDetail: { device: Device };
  Settings: undefined;
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DevicesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { doLogout } = useAuth();

  const [devices, setDevices] = useState<Device[]>([]);
  const [networkUpSpeed, setNetworkUpSpeed] = useState(0);
  const [networkDownSpeed, setNetworkDownSpeed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'info' | 'error' | 'success' });

  const loadDevices = useCallback(async () => {
    try {
      const data = await fetchDevices();
      setDevices(data);
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        await doLogout();
        showToast('登录已过期，请重新登录', 'error');
      }
    }
  }, []);

  const loadNetworkStats = useCallback(async () => {
    try {
      const stats = await fetchNetworkStats();
      setNetworkUpSpeed(stats.upSpeed);
      setNetworkDownSpeed(stats.downSpeed);
    } catch (_err) {
      // 网络速率获取失败不影响设备列表展示
    }
  }, []);

  // 每秒轮询：设备列表 + 网络总速率
  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;
      await Promise.all([loadDevices(), loadNetworkStats()]);
      if (isMounted) {
        setLoading(false);
        setRefreshing(false);
      }
    };

    // 首次立即加载
    poll();

    const interval = setInterval(poll, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadDevices, loadNetworkStats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDevices();
    loadNetworkStats();
  };

  const showToast = (message: string, type: 'info' | 'error' | 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  };

  const onlineDevices = devices.filter(d => d.isOnline);
  const offlineDevices = devices.filter(d => !d.isOnline);
  const limitedCount = devices.filter(d => d.downLimit > 0 || d.upLimit > 0).length;
  const blockedCount = devices.filter(d => d.blocked).length;

  const getConnBadge = (device: Device) => {
    const type = getConnectionType(device.wifiMode, device.phyMode);
    switch (type) {
      case 'wifi5': return { label: '5G WiFi', style: 'green' };
      case 'wifi24': return { label: '2.4G WiFi', style: 'blue' };
      case 'eth': return { label: '有线', style: 'gray' };
      default: return null;
    }
  };

  const renderDevice = ({ item }: { item: Device }) => {
    const deviceType = getDeviceType(item.name);
    const icon = getDeviceIcon(item.name);
    const connBadge = getConnBadge(item);

    return (
      <TouchableOpacity
        style={[styles.deviceCard, !item.isOnline && styles.deviceCardOffline]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('DeviceDetail', { device: item })}
      >
        <View style={styles.deviceTop}>
          <View style={[styles.deviceIcon, getIconBgStyle(deviceType)]}>
            <Text style={styles.deviceIconText}>{icon}</Text>
          </View>
          <View style={styles.deviceInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.deviceName} numberOfLines={1}>{item.name}</Text>
            </View>
            <Text style={styles.deviceMac}>{formatMAC(item.mac)}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, item.isOnline ? styles.badgeOnline : styles.badgeOffline]}>
                <Text style={[styles.badgeText, item.isOnline ? styles.badgeTextOnline : styles.badgeTextOffline]}>
                  {item.isOnline ? '● 在线' : '○ 离线'}
                </Text>
              </View>
              {connBadge && (
                <View style={[styles.badge, getBadgeBgStyle(connBadge.style)]}>
                  <Text style={[styles.badgeText, getBadgeTextStyle(connBadge.style)]}>{connBadge.label}</Text>
                </View>
              )}
              {item.blocked && (
                <View style={[styles.badge, styles.badgeBlocked]}>
                  <Text style={[styles.badgeText, styles.badgeTextBlocked]}>🚫 已断网</Text>
                </View>
              )}
              {!item.blocked && (item.downLimit > 0 || item.upLimit > 0) && (
                <View style={[styles.badge, styles.badgeLimited]}>
                  <Text style={[styles.badgeText, styles.badgeTextLimited]}>⚡ 已限速</Text>
                </View>
              )}
              {item.limitTimeId ? (
                <View style={[styles.badge, styles.badgeTimeLimit]}>
                  <Text style={[styles.badgeText, { color: Colors.purple }]}>⏰ 限时</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>

        {item.isOnline && (
          <View style={styles.speedRow}>
            <View style={styles.speedPill}>
              <Text style={styles.speedIcon}>⬆️</Text>
              <Text style={styles.speedText}>
                <Text style={styles.speedValue}>{formatSpeed(item.upSpeed)}</Text>
              </Text>
            </View>
            <View style={styles.speedPill}>
              <Text style={styles.speedIcon}>⬇️</Text>
              <Text style={styles.speedText}>
                <Text style={styles.speedValue}>{formatSpeed(item.downSpeed)}</Text>
              </Text>
            </View>
            {(item.downLimit > 0 || item.upLimit > 0) && (
              <View style={styles.limitInfo}>
                <Text style={styles.limitTag}>
                  ↑ {formatSpeed(item.upLimit)} ↓ {formatSpeed(item.downLimit)}
                </Text>
              </View>
            )}
            {item.blocked && (
              <View style={styles.limitInfo}>
                <Text style={styles.blockedTag}>断网中</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count} 台</Text>
    </View>
  );

  if (loading && devices.length === 0) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header refreshing={refreshing} onRefresh={onRefresh} />
      <FlatList
        data={[]}
        renderItem={() => null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <View>
            {/* 统计卡片 */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>在线设备</Text>
                <Text style={[styles.statValue, { color: Colors.success }]}>{onlineDevices.length}</Text>
                <Text style={styles.statSub}>共 {devices.length} 台设备</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>已限速</Text>
                <Text style={[styles.statValue, { color: Colors.warning }]}>{limitedCount}</Text>
                <Text style={styles.statSub}>台设备</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>已断网</Text>
                <Text style={[styles.statValue, { color: Colors.danger }]}>{blockedCount}</Text>
                <Text style={styles.statSub}>台设备</Text>
              </View>
            </View>

            {/* 速率汇总 */}
            <View style={styles.speedSummary}>
              <View style={styles.speedItem}>
                <Text style={styles.speedItemIcon}>⬆️</Text>
                <Text style={styles.speedItemVal}>{formatSpeed(networkUpSpeed)}</Text>
                <Text style={styles.speedItemLbl}>总上传速率</Text>
              </View>
              <View style={styles.speedDivider} />
              <View style={styles.speedItem}>
                <Text style={styles.speedItemIcon}>⬇️</Text>
                <Text style={styles.speedItemVal}>{formatSpeed(networkDownSpeed)}</Text>
                <Text style={styles.speedItemLbl}>总下载速率</Text>
              </View>
              <View style={styles.speedDivider} />
              <View style={styles.speedItem}>
                <Text style={styles.speedItemIcon}>📡</Text>
                <Text style={styles.speedItemVal}>{devices.length}</Text>
                <Text style={styles.speedItemLbl}>接入设备</Text>
              </View>
            </View>

            {/* 设备列表 */}
            {devices.length === 0 ? (
              <EmptyState
                icon="📡"
                title="当前无设备连接"
                description="路由器已连接，但暂无终端设备接入网络"
                actionLabel="🔄 重新扫描"
                onAction={onRefresh}
              />
            ) : (
              <>
                {onlineDevices.length > 0 && (
                  <>
                    {renderSectionHeader('在线设备', onlineDevices.length)}
                    {onlineDevices.map((d, i) => (
                      <View key={d.mac || `online-${i}`} style={{ paddingHorizontal: 16 }}>{renderDevice({ item: d })}</View>
                    ))}
                  </>
                )}
                {offlineDevices.length > 0 && (
                  <>
                    <View style={{ marginTop: 8 }}>{renderSectionHeader('离线设备', offlineDevices.length)}</View>
                    {offlineDevices.map((d, i) => (
                      <View key={d.mac || `offline-${i}`} style={{ paddingHorizontal: 16 }}>{renderDevice({ item: d })}</View>
                    ))}
                  </>
                )}
              </>
            )}
            <View style={{ height: 20 }} />
          </View>
        }
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </View>
  );
}

// 头部组件
function Header({ refreshing, onRefresh }: { refreshing?: boolean; onRefresh?: () => void }) {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <View style={styles.navHeader}>
      <View style={styles.navTitleRow}>
        <View>
          <Text style={styles.navTitle}>网络设备</Text>
          <Text style={styles.navSubtitle}>上次刷新 {timeStr} · 下拉刷新</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 辅助样式函数
function getIconBgStyle(type: string) {
  switch (type) {
    case 'phone': return { backgroundColor: '#EFF6FF' };
    case 'laptop': return { backgroundColor: '#F0FDF4' };
    case 'tv': return { backgroundColor: '#FFF7ED' };
    case 'tablet': return { backgroundColor: '#FDF4FF' };
    default: return { backgroundColor: Colors.gray100 };
  }
}

function getBadgeBgStyle(style: string) {
  switch (style) {
    case 'green': return { backgroundColor: '#F0FDF4' };
    case 'blue': return { backgroundColor: '#EFF6FF' };
    default: return { backgroundColor: Colors.gray100 };
  }
}

function getBadgeTextStyle(style: string) {
  switch (style) {
    case 'green': return { color: Colors.success };
    case 'blue': return { color: Colors.primary };
    default: return { color: Colors.gray600 };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  list: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 头部
  navHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  navTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.gray900,
  },
  navSubtitle: {
    fontSize: 13,
    color: Colors.gray500,
    marginTop: 4,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    backgroundColor: Colors.gray100,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    fontSize: 18,
  },
  // 统计
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.gray500,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 2,
  },
  statSub: {
    fontSize: 11,
    color: Colors.gray400,
  },
  // 速率汇总
  speedSummary: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  speedItem: {
    alignItems: 'center',
  },
  speedItemIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  speedItemVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  speedItemLbl: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  speedDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  // 分区
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    color: Colors.gray400,
  },
  // 设备卡片
  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  deviceCardOffline: {
    opacity: 0.65,
  },
  deviceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIconText: {
    fontSize: 24,
  },
  deviceInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray900,
  },
  deviceMac: {
    fontSize: 11,
    color: Colors.gray400,
    fontFamily: 'monospace',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeOnline: { backgroundColor: Colors.successLight },
  badgeOffline: { backgroundColor: Colors.gray100 },
  badgeLimited: { backgroundColor: Colors.warningLight },
  badgeBlocked: { backgroundColor: Colors.dangerLight },
  badgeTimeLimit: { backgroundColor: Colors.purpleLight },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgeTextOnline: { color: Colors.success },
  badgeTextOffline: { color: Colors.gray500 },
  badgeTextLimited: { color: Colors.warning },
  badgeTextBlocked: { color: Colors.danger },
  chevron: {
    fontSize: 22,
    color: Colors.gray300,
    fontWeight: '300',
  },
  speedRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    alignItems: 'center',
  },
  speedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  speedIcon: {
    fontSize: 12,
  },
  speedText: {
    fontSize: 12,
    color: Colors.gray600,
  },
  speedValue: {
    fontWeight: '600',
    color: Colors.gray800,
  },
  limitInfo: {
    marginLeft: 'auto',
  },
  limitTag: {
    fontSize: 11,
    color: Colors.warning,
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '500',
  },
  blockedTag: {
    fontSize: 11,
    color: Colors.danger,
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '500',
  },
});
