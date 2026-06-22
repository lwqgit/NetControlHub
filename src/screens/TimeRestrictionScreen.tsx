/**
 * 上网时间限制页面
 * 功能：加载时间模板列表、选择模板并应用到设备
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
import { useAuth } from '../context/AuthContext';
import { fetchTimeTemplates, setDeviceTimeLimit, TimeTemplate, Device } from '../services/api';
import { Colors, Toast } from '../components/Common';

type RouteParams = {
  TimeRestriction: { device: Device };
};

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export default function TimeRestrictionScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'TimeRestriction'>>();
  const { doLogout } = useAuth();
  const device = route.params.device;

  const [templates, setTemplates] = useState<TimeTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>(device.limitTimeId || '');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'info' | 'error' | 'success' });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await fetchTimeTemplates();
      setTemplates(data);
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        await doLogout();
      } else {
        showToast('获取时间模板失败', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'info' | 'error' | 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  };

  const selectedTemplate = templates.find(t => t.id === selectedId);
  const isNoLimit = selectedId === '';

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const success = await setDeviceTimeLimit(device.mac, device.name, selectedId);
      if (success) {
        showToast(isNoLimit ? '已取消时间限制' : '时间限制已生效', 'success');
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        showToast('设置失败，请重试', 'error');
      }
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        await doLogout();
      } else {
        showToast(err.message || '操作失败', 'error');
      }
    } finally {
      setApplying(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* 头部 */}
        <View style={styles.header}>
          <View style={styles.headerNav}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>上网时间限制</Text>
          </View>
          <View style={styles.headerDevice}>
            <Text style={styles.headerDeviceIcon}>📱</Text>
            <View>
              <Text style={styles.headerDeviceLabel}>正在设置</Text>
              <Text style={styles.headerDeviceName}>{device.name}</Text>
            </View>
          </View>
        </View>

        {/* 模板列表 */}
        <View style={styles.templateList}>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.purple} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* 不受限制选项 */}
              <TouchableOpacity
                style={[styles.templateCard, styles.noLimitCard, isNoLimit && styles.templateCardSelected]}
                onPress={() => handleSelect('')}
                activeOpacity={0.8}
              >
                <View style={styles.templateTop}>
                  <View style={styles.templateNameRow}>
                    <Text style={styles.templateIcon}>✅</Text>
                    <Text style={styles.templateName}>不受限制</Text>
                  </View>
                  {isNoLimit ? (
                    <View style={[styles.selectedIcon, styles.selectedIconGreen]}>
                      <Text style={styles.selectedIconCheck}>✓</Text>
                    </View>
                  ) : (
                    <View style={styles.radioCircle} />
                  )}
                </View>
                <Text style={styles.noLimitDesc}>设备可随时自由上网</Text>
              </TouchableOpacity>

              {/* 模板卡片 */}
              {templates.map((template, i) => {
                const isSelected = template.id === selectedId;
                return (
                  <TouchableOpacity
                    key={template.id || `tpl-${i}`}
                    style={[styles.templateCard, isSelected && styles.templateCardSelected]}
                    onPress={() => handleSelect(template.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.templateTop}>
                      <View style={styles.templateNameRow}>
                        <Text style={styles.templateIcon}>🌙</Text>
                        <Text style={styles.templateName}>{template.name}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.selectedIcon}>
                          <Text style={styles.selectedIconCheck}>✓</Text>
                        </View>
                      ) : (
                        <View style={styles.radioCircle} />
                      )}
                    </View>
                    <View style={styles.templateDays}>
                      {WEEKDAYS.map((day, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dayPill,
                            !template.dayOfWeek.includes(i + 1) && styles.dayPillInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayPillText,
                              !template.dayOfWeek.includes(i + 1) && styles.dayPillTextInactive,
                            ]}
                          >
                            {day}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.templateTime}>
                      <Text style={styles.templateTimeLabel}>禁止上网时段：</Text>
                      <Text style={styles.templateTimeRange}>
                        {template.startTime} - {template.endTime}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>

        {/* 确认提示 */}
        {selectedId !== undefined && (
          <View style={[styles.confirmBanner, isNoLimit ? styles.confirmBannerGreen : null]}>
            <Text style={styles.confirmIcon}>{isNoLimit ? '✅' : '⚠️'}</Text>
            <Text style={[styles.confirmText, isNoLimit ? { color: Colors.success } : null]}>
              {isNoLimit
                ? '设备将不受任何时段限制，可随时自由上网。'
                : `该设备上网时间将受「${selectedTemplate?.name || ''}」限制，在指定时段内自动断网。`}
            </Text>
          </View>
        )}

        {/* 确认按钮 */}
        <TouchableOpacity
          style={[styles.applyBtn, applying && { opacity: 0.7 }]}
          onPress={handleApply}
          disabled={applying}
          activeOpacity={0.8}
        >
          {applying ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.applyBtnText}>
              {isNoLimit ? '确认取消限制' : '确认应用此时段规则'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

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
    backgroundColor: Colors.purple,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
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
  headerDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerDeviceIcon: {
    fontSize: 28,
  },
  headerDeviceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  headerDeviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  // 模板列表
  templateList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  templateCardSelected: {
    borderColor: Colors.purple,
    backgroundColor: '#FAF5FF',
  },
  noLimitCard: {
    borderColor: 'transparent',
  },
  templateTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  templateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateIcon: {
    fontSize: 18,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray800,
  },
  selectedIcon: {
    width: 22,
    height: 22,
    backgroundColor: Colors.purple,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIconGreen: {
    backgroundColor: Colors.success,
  },
  selectedIconCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.gray300,
  },
  templateDays: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  dayPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.primaryLight,
  },
  dayPillInactive: {
    backgroundColor: Colors.gray100,
  },
  dayPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
  },
  dayPillTextInactive: {
    color: Colors.gray400,
  },
  templateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  templateTimeLabel: {
    fontSize: 12,
    color: Colors.gray500,
  },
  templateTimeRange: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray700,
    backgroundColor: Colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  noLimitDesc: {
    fontSize: 12,
    color: Colors.gray400,
  },
  // 确认提示
  confirmBanner: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  confirmBannerGreen: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  confirmIcon: {
    fontSize: 20,
    marginTop: 1,
  },
  confirmText: {
    fontSize: 13,
    color: '#5B21B6',
    lineHeight: 20,
    flex: 1,
  },
  // 确认按钮
  applyBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    height: 44,
    backgroundColor: Colors.purple,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
