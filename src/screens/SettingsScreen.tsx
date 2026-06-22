/**
 * 设置页面
 * 功能：路由器信息、连接设置、时间模板管理、安全设置、退出登录
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors, Toggle } from '../components/Common';

export default function SettingsScreen() {
  const { routerIp, doLogout, setRouterIp } = useAuth();

  const [showIpModal, setShowIpModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [showIntervalModal, setShowIntervalModal] = useState(false);

  const [bandwidthAlert, setBandwidthAlert] = useState(true);
  const [securePassword, setSecurePassword] = useState(true);
  const [timeoutValue, setTimeoutValue] = useState('5');
  const [intervalValue, setIntervalValue] = useState('30');
  const [ipInput, setIpInput] = useState(routerIp);

  const handleLogout = () => {
    // Web 端 Alert 不可用，使用 window.confirm；原生端使用 Alert.alert
    if (Platform.OS === 'web') {
      if (window.confirm('确定要退出登录吗？退出后需要重新输入密码。')) {
        doLogout();
      }
      return;
    }

    Alert.alert(
      '退出登录',
      '确定要退出登录吗？退出后需要重新输入密码。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: async () => {
            await doLogout();
          },
        },
      ]
    );
  };

  const handleSaveIp = async () => {
    await setRouterIp(ipInput);
    setShowIpModal(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* 头部 */}
        <View style={styles.navHeader}>
          <Text style={styles.navTitle}>设置</Text>
          <Text style={styles.navSubtitle}>NetControl Hub V1.0</Text>
        </View>

        {/* 路由器信息卡片 */}
        <View style={styles.routerCard}>
          <Text style={styles.routerIcon}>📡</Text>
          <View style={styles.routerInfo}>
            <Text style={styles.routerName}>TP-LINK WTA302</Text>
            <View style={styles.routerStatusRow}>
              <View style={styles.routerDot} />
              <Text style={styles.routerDetail}>已连接 · {routerIp}</Text>
            </View>
            <Text style={styles.routerDetail}>固件版本: 0693</Text>
          </View>
          <TouchableOpacity style={styles.switchBtn}>
            <Text style={styles.switchBtnText}>切换</Text>
          </TouchableOpacity>
        </View>

        {/* 连接设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>连接设置</Text>
          <View style={styles.settingsGroup}>
            <SettingsItem
              icon="🌐"
              iconBg="#EFF6FF"
              label="路由器地址"
              value={routerIp}
              onPress={() => setShowIpModal(true)}
            />
            <SettingsItem
              icon="🔑"
              iconBg="#F0FDF4"
              label="管理员密码"
              value="已保存"
              onPress={() => setShowPasswordModal(true)}
            />
            <SettingsItem
              icon="⏱️"
              iconBg="#FFF7ED"
              label="请求超时时间"
              value={`${timeoutValue} 秒`}
              onPress={() => setShowTimeoutModal(true)}
            />
            <SettingsItem
              icon="🔄"
              iconBg="#EFF6FF"
              label="自动刷新间隔"
              value={`${intervalValue} 秒`}
              onPress={() => setShowIntervalModal(true)}
            />
          </View>
        </View>

        {/* 时间模板管理 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>时间模板管理</Text>
          <View style={styles.settingsGroup}>
            <SettingsItem
              icon="📋"
              iconBg="#FDF4FF"
              label="查看所有模板"
              value="4 个"
              onPress={() => {}}
            />
            <SettingsItem
              icon="➕"
              iconBg="#ECFDF5"
              label="新建时间模板"
              value=""
              onPress={() => {}}
            />
          </View>
        </View>

        {/* 通知与安全 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知与安全</Text>
          <View style={styles.settingsGroup}>
            <View style={styles.settingsItem}>
              <View style={[styles.settingsIcon, { backgroundColor: '#FFF7ED' }]}>
                <Text style={styles.settingsIconText}>🔔</Text>
              </View>
              <Text style={styles.settingsLabel}>高占用带宽提醒</Text>
              <Switch
                value={bandwidthAlert}
                onValueChange={setBandwidthAlert}
                trackColor={{ false: Colors.gray300, true: Colors.success }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.settingsItem}>
              <View style={[styles.settingsIcon, { backgroundColor: '#FEF2F2' }]}>
                <Text style={styles.settingsIconText}>🛡️</Text>
              </View>
              <Text style={styles.settingsLabel}>安全存储密码</Text>
              <Switch
                value={securePassword}
                onValueChange={setSecurePassword}
                trackColor={{ false: Colors.gray300, true: Colors.success }}
                thumbColor="#fff"
              />
            </View>
            <SettingsItem
              icon="📜"
              iconBg="#F0FDF4"
              label="安全风险说明"
              value=""
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.alert(
                    '安全风险说明\n\n本应用通过局域网HTTP协议与路由器通信。所有数据（包括密码）在局域网内明文传输。请仅在您信任的私有网络中使用本应用，不要在公共Wi-Fi下使用。'
                  );
                  return;
                }
                Alert.alert(
                  '安全风险说明',
                  '本应用通过局域网HTTP协议与路由器通信。所有数据（包括密码）在局域网内明文传输。请仅在您信任的私有网络中使用本应用，不要在公共Wi-Fi下使用。',
                  [{ text: '我知道了' }]
                );
              }}
            />
          </View>
        </View>

        {/* 关于 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于</Text>
          <View style={styles.settingsGroup}>
            <SettingsItem
              icon="ℹ️"
              iconBg="#EFF6FF"
              label="版本信息"
              value="V1.0.0"
              onPress={() => {}}
            />
            <TouchableOpacity style={[styles.settingsItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
              <View style={[styles.settingsIcon, { backgroundColor: Colors.dangerLight }]}>
                <Text style={styles.settingsIconText}>🚪</Text>
              </View>
              <Text style={[styles.settingsLabel, { color: Colors.danger }]}>退出登录</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* IP 修改弹窗 */}
      <Modal visible={showIpModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>路由器地址</Text>
            <TextInput
              style={styles.modalInput}
              value={ipInput}
              onChangeText={setIpInput}
              placeholder="192.168.2.1"
              autoCapitalize="none"
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowIpModal(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveIp}>
                <Text style={styles.modalSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// 设置项子组件
function SettingsItem({
  icon,
  iconBg,
  label,
  value,
  onPress,
}: {
  icon: string;
  iconBg: string;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.settingsIcon, { backgroundColor: iconBg }]}>
        <Text style={styles.settingsIconText}>{icon}</Text>
      </View>
      <Text style={styles.settingsLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
        <Text style={styles.settingsChevron}>›</Text>
      </View>
    </TouchableOpacity>
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
  navHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
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
  // 路由器信息
  routerCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  routerIcon: {
    fontSize: 36,
  },
  routerInfo: {
    flex: 1,
  },
  routerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
  },
  routerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routerDot: {
    width: 8,
    height: 8,
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  routerDetail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  switchBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  switchBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  // 分组
  section: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  settingsGroup: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsIconText: {
    fontSize: 16,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.gray800,
  },
  settingsValue: {
    fontSize: 13,
    color: Colors.gray400,
  },
  settingsChevron: {
    fontSize: 20,
    color: Colors.gray300,
    fontWeight: '300',
  },
  // 弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 16,
  },
  modalInput: {
    height: 44,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.gray800,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 14,
    color: Colors.gray500,
  },
  modalSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
