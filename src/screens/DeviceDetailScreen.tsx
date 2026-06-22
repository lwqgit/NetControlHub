/**
 * 设备详情页面
 * 功能：实时速率、限速滑杆控制、快捷预设、断网操作、上网时间入口
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { setDeviceSpeedLimit, setDeviceBlocked, Device } from '../services/api';
import { formatSpeed, formatMAC, getDeviceIcon } from '../utils/helpers';
import { Colors, Toggle, Toast } from '../components/Common';
import Slider from '@react-native-community/slider';

type RouteParams = {
  DeviceDetail: { device: Device };
};
type RootStackParamList = {
  TimeRestriction: { device: Device };
};

export default function DeviceDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RouteParams, 'DeviceDetail'>>();
  const { doLogout } = useAuth();
  const device = route.params.device;

  const [speedLimitEnabled, setSpeedLimitEnabled] = useState(
    device.downLimit > 0 || device.upLimit > 0
  );
  const [downLimit, setDownLimit] = useState(device.downLimit || 0);
  const [upLimit, setUpLimit] = useState(device.upLimit || 0);
  const [loading, setLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'info' | 'error' | 'success' });

  const maxSpeed = 10240; // 10 MB/s

  const formatSliderVal = (val: number): string => {
    if (val === 0) return '不限速';
    if (val >= 1024) return `${(val / 1024).toFixed(1).replace('.0', '')} MB/s`;
    return `${val} KB/s`;
  };

  const showToast = (message: string, type: 'info' | 'error' | 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  };

  const handleApplySpeedLimit = async () => {
    setLoading(true);
    try {
      const success = await setDeviceSpeedLimit(
        device.mac,
        device.name,
        speedLimitEnabled ? downLimit : 0,
        speedLimitEnabled ? upLimit : 0
      );
      if (success) {
        setSuccessVisible(true);
        showToast('限速设置已生效', 'success');
        setTimeout(() => setSuccessVisible(false), 2000);
      } else {
        showToast('设置失败，请重试', 'error');
      }
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        await doLogout();
        showToast('登录已过期', 'error');
      } else {
        showToast(err.message || '操作失败', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    setBlockLoading(true);
    try {
      const newBlocked = !device.blocked;
      const success = await setDeviceBlocked(device.mac, device.name, newBlocked);
      if (success) {
        showToast(newBlocked ? '设备已断网' : '设备已恢复联网', 'success');
      } else {
        showToast('操作失败，请重试', 'error');
      }
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        await doLogout();
      } else {
        showToast(err.message || '操作失败', 'error');
      }
    } finally {
      setBlockLoading(false);
    }
  };

  const handleSpeedToggle = (val: boolean) => {
    setSpeedLimitEnabled(val);
    if (!val) {
      setDownLimit(0);
      setUpLimit(0);
    }
  };

  const setPreset = (val: number) => {
    const down = val;
    const up = val > 512 ? 512 : val;
    setDownLimit(down);
    setUpLimit(up);
  };

  const presets = [
    { label: '不限速', value: 0 },
    { label: '512 KB/s', value: 512 },
    { label: '1 MB/s', value: 1024 },
    { label: '2 MB/s', value: 2048 },
    { label: '5 MB/s', value: 5120 },
  ];

  // 速率占用百分比（模拟）
  const upPct = upLimit > 0 ? Math.min(100, Math.round((device.upSpeed / upLimit) * 100)) : 0;
  const downPct = downLimit > 0 ? Math.min(100, Math.round((device.downSpeed / downLimit) * 100)) : 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* 详情头部 */}
        <View style={styles.header}>
          <View style={styles.headerNav}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>设备详情</Text>
          </View>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>{getDeviceIcon(device.name)}</Text>
            </View>
            <View>
              <Text style={styles.heroName}>{device.name}</Text>
              <Text style={styles.heroIp}>IP: {device.ip}</Text>
              <Text style={styles.heroMac}>{formatMAC(device.mac)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* 实时速率 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>实时速率</Text>
            <View style={styles.realtimeRow}>
              <View style={styles.speedBox}>
                <Text style={styles.speedBoxIcon}>⬆️</Text>
                <Text style={styles.speedBoxVal}>{device.upSpeed}</Text>
                <Text style={styles.speedBoxUnit}>KB/s</Text>
                <Text style={styles.speedBoxLabel}>上传速率</Text>
              </View>
              <View style={styles.speedBox}>
                <Text style={styles.speedBoxIcon}>⬇️</Text>
                <Text style={styles.speedBoxVal}>{device.downSpeed >= 1024 ? (device.downSpeed / 1024).toFixed(1) : device.downSpeed}</Text>
                <Text style={styles.speedBoxUnit}>{device.downSpeed >= 1024 ? 'MB/s' : 'KB/s'}</Text>
                <Text style={styles.speedBoxLabel}>下载速率</Text>
              </View>
            </View>
            {speedLimitEnabled && (upLimit > 0 || downLimit > 0) && (
              <View style={{ marginTop: 14 }}>
                <View style={styles.barLabel}>
                  <Text style={styles.barLabelText}>上传占用</Text>
                  <Text style={[styles.barLabelPct, { color: Colors.success }]}>{upPct}%</Text>
                </View>
                <View style={styles.barWrap}>
                  <View style={[styles.barFill, styles.barUp, { width: `${upPct}%` }]} />
                </View>
                <View style={styles.barLabel}>
                  <Text style={styles.barLabelText}>下载占用</Text>
                  <Text style={[styles.barLabelPct, { color: Colors.primary }]}>{downPct}%</Text>
                </View>
                <View style={styles.barWrap}>
                  <View style={[styles.barFill, styles.barDown, { width: `${downPct}%` }]} />
                </View>
              </View>
            )}
          </View>

          {/* 限速控制 */}
          <View style={styles.card}>
            <View style={styles.controlHeader}>
              <View>
                <Text style={styles.cardTitle}>限速控制</Text>
                <Text style={styles.controlStatus}>
                  {speedLimitEnabled ? '已启用限速' : '未启用限速'}
                </Text>
              </View>
              <Toggle value={speedLimitEnabled} onToggle={handleSpeedToggle} />
            </View>

            {speedLimitEnabled && (
              <>
                {/* 下载限速 */}
                <View style={styles.sliderGroup}>
                  <View style={styles.sliderLabel}>
                    <Text style={styles.sliderLabelText}>⬇️ 下载限速</Text>
                    <Text style={styles.sliderVal}>{formatSliderVal(downLimit)}</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={maxSpeed}
                    step={256}
                    value={downLimit}
                    onValueChange={setDownLimit}
                    minimumTrackTintColor={Colors.primary}
                    maximumTrackTintColor={Colors.gray200}
                    thumbTintColor={Colors.primary}
                  />
                  <View style={styles.sliderTicks}>
                    <Text style={styles.tickText}>不限</Text>
                    <Text style={styles.tickText}>2.5M</Text>
                    <Text style={styles.tickText}>5M</Text>
                    <Text style={styles.tickText}>7.5M</Text>
                    <Text style={styles.tickText}>10M</Text>
                  </View>
                </View>

                {/* 上传限速 */}
                <View style={styles.sliderGroup}>
                  <View style={styles.sliderLabel}>
                    <Text style={styles.sliderLabelText}>⬆️ 上传限速</Text>
                    <Text style={styles.sliderVal}>{formatSliderVal(upLimit)}</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={maxSpeed}
                    step={256}
                    value={upLimit}
                    onValueChange={setUpLimit}
                    minimumTrackTintColor={Colors.success}
                    maximumTrackTintColor={Colors.gray200}
                    thumbTintColor={Colors.success}
                  />
                  <View style={styles.sliderTicks}>
                    <Text style={styles.tickText}>不限</Text>
                    <Text style={styles.tickText}>2.5M</Text>
                    <Text style={styles.tickText}>5M</Text>
                    <Text style={styles.tickText}>7.5M</Text>
                    <Text style={styles.tickText}>10M</Text>
                  </View>
                </View>

                {/* 快捷预设 */}
                <Text style={styles.presetTitle}>快捷预设</Text>
                <View style={styles.presetRow}>
                  {presets.map((p, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.presetBtn,
                        (p.value === downLimit && p.value === upLimit) ||
                        (p.value === 0 && downLimit === 0 && upLimit === 0)
                          ? styles.presetBtnActive
                          : null,
                      ]}
                      onPress={() => setPreset(p.value)}
                    >
                      <Text
                        style={[
                          styles.presetBtnText,
                          (p.value === downLimit && p.value === upLimit) ||
                          (p.value === 0 && downLimit === 0 && upLimit === 0)
                            ? styles.presetBtnTextActive
                            : null,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.applyBtn, loading && { opacity: 0.7 }]}
                  onPress={handleApplySpeedLimit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.applyBtnIcon}>✓</Text>
                      <Text style={styles.applyBtnText}>应用限速设置</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* 操作列表 */}
          <View style={styles.actionList}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('TimeRestriction', { device })}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.warningLight }]}>
                <Text style={styles.actionIconText}>⏰</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>上网时间限制</Text>
                <Text style={styles.actionDesc}>
                  当前: {device.limitTimeName || '未设置'}
                </Text>
              </View>
              <View style={styles.actionRight}>
                {device.limitTimeId ? (
                  <Text style={styles.actionValue}>生效中</Text>
                ) : null}
                <Text style={styles.actionChevron}>›</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.successLight }]}>
                <Text style={styles.actionIconText}>📝</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>修改设备备注</Text>
                <Text style={styles.actionDesc}>当前: {device.name}</Text>
              </View>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 断网按钮 */}
          <TouchableOpacity
            style={styles.blockBtn}
            onPress={handleToggleBlock}
            disabled={blockLoading}
            activeOpacity={0.8}
          >
            {blockLoading ? (
              <ActivityIndicator color={Colors.danger} size="small" />
            ) : (
              <Text style={styles.blockBtnText}>
                {device.blocked ? '🔗 恢复此设备网络' : '🚫 断开此设备网络'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>

      {/* 成功动画覆盖 */}
      {successVisible && (
        <View style={styles.successOverlay}>
          <View style={styles.successCheck}>
            <Text style={styles.successCheckIcon}>✓</Text>
          </View>
          <Text style={styles.successText}>限速设置已生效</Text>
        </View>
      )}

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // 头部
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroIcon: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconText: {
    fontSize: 36,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  heroIp: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  heroMac: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'monospace',
  },
  // 主体
  body: {
    paddingHorizontal: 16,
    marginTop: -12,
  },
  // 卡片
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  // 实时速率
  realtimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  speedBox: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  speedBoxIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  speedBoxVal: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.gray900,
  },
  speedBoxUnit: {
    fontSize: 11,
    color: Colors.gray500,
    marginBottom: 2,
  },
  speedBoxLabel: {
    fontSize: 11,
    color: Colors.gray500,
    marginTop: 4,
  },
  // 速率条
  barLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  barLabelText: {
    fontSize: 12,
    color: Colors.gray500,
  },
  barLabelPct: {
    fontSize: 12,
    fontWeight: '600',
  },
  barWrap: {
    height: 6,
    backgroundColor: Colors.gray100,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barUp: {
    backgroundColor: Colors.success,
  },
  barDown: {
    backgroundColor: Colors.primary,
  },
  // 限速控制
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  controlStatus: {
    fontSize: 12,
    color: Colors.gray400,
    marginTop: 2,
  },
  sliderGroup: {
    marginBottom: 16,
  },
  sliderLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray700,
  },
  sliderVal: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  tickText: {
    fontSize: 10,
    color: Colors.gray400,
  },
  presetTitle: {
    fontSize: 12,
    color: Colors.gray500,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: '#fff',
  },
  presetBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  presetBtnText: {
    fontSize: 12,
    color: Colors.gray600,
  },
  presetBtnTextActive: {
    color: Colors.primary,
  },
  applyBtn: {
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  applyBtnIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // 操作列表
  actionList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIconText: {
    fontSize: 18,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray800,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: Colors.gray400,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionValue: {
    fontSize: 11,
    color: Colors.warning,
  },
  actionChevron: {
    fontSize: 22,
    color: Colors.gray300,
    fontWeight: '300',
  },
  // 断网按钮
  blockBtn: {
    height: 44,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.danger,
  },
  // 成功动画
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheck: {
    width: 64,
    height: 64,
    backgroundColor: Colors.success,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successCheckIcon: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray800,
  },
});
