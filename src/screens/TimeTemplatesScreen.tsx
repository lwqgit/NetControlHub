/**
 * 时段模板总览页面
 * 功能：查看所有时间模板及其详细信息
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { fetchTimeTemplates, TimeTemplate } from '../services/api';
import { Colors, EmptyState } from '../components/Common';

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export default function TimeTemplatesScreen() {
  const { doLogout } = useAuth();

  const [templates, setTemplates] = useState<TimeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTemplates = async () => {
    try {
      const data = await fetchTimeTemplates();
      setTemplates(data);
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        await doLogout();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTemplates();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>时段模板</Text>
        <Text style={styles.headerSubtitle}>管理上网时间规则</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purple} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.purple} style={{ marginTop: 60 }} />
        ) : templates.length === 0 ? (
          <EmptyState
            icon="📋"
            title="暂无时间模板"
            description="请在路由器管理后台创建时段模板"
            actionLabel="🔄 刷新"
            onAction={onRefresh}
          />
        ) : (
          templates.map((template, i) => (
            <View key={template.id || `tpl-${i}`} style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <Text style={styles.templateIcon}>🌙</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateStatus}>
                    {template.enable === '1' ? '● 已启用' : '○ 未启用'}
                  </Text>
                </View>
              </View>
              <View style={styles.templateDays}>
                {WEEKDAYS.map((day, i) => (
                  <View
                    key={i}
                    style={[styles.dayPill, !template.dayOfWeek.includes(i + 1) && styles.dayPillInactive]}
                  >
                    <Text style={[styles.dayPillText, !template.dayOfWeek.includes(i + 1) && styles.dayPillTextInactive]}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.templateTime}>
                <Text style={styles.timeLabel}>禁止上网：</Text>
                <Text style={styles.timeRange}>{template.startTime} - {template.endTime}</Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.gray900,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.gray500,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  templateIcon: {
    fontSize: 22,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray800,
  },
  templateStatus: {
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 2,
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
  timeLabel: {
    fontSize: 12,
    color: Colors.gray500,
  },
  timeRange: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray700,
    backgroundColor: Colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
});
