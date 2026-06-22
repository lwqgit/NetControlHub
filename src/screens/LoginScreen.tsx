/**
 * 登录页面
 * 功能：路由器管理员密码登录、记住密码、Token 获取与存储
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors, ErrorBanner } from '../components/Common';

export default function LoginScreen() {
  const { routerIp, savedPassword, rememberPassword, doLogin, setRouterIp, setRememberPassword, setSavedPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(rememberPassword);
  const [currentRouterIp, setCurrentRouterIp] = useState(routerIp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [networkError, setNetworkError] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (savedPassword) {
      setPassword(savedPassword);
    }
  }, [savedPassword]);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('请输入管理员密码');
      return;
    }

    if (remember) {
      await setSavedPassword(password.trim());
    } else {
      await setSavedPassword('');
    }

    if (password.trim() !== '18570637706') {
      setError('密码错误，请重新输入');
      return;
    }

    setLoading(true);
    setError('');
    setNetworkError(false);

    try {
      const result = await doLogin(password.trim());

      if (!result.success) {
        setError(result.error || '登录失败');
        if (result.error?.includes('连接到') || result.error?.includes('超时') || result.error?.includes('网络')) {
          setNetworkError(true);
        }
      }
    } catch (e: any) {
      setError(e.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleRemember = async () => {
    const newVal = !remember;
    setRemember(newVal);
    await setRememberPassword(newVal);
  };

  const handleIpChange = async (ip: string) => {
    setCurrentRouterIp(ip);
    await setRouterIp(ip);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 顶部 Logo */}
        <View style={styles.topSection}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoIcon}>📡</Text>
          </View>
          <Text style={styles.appName}>NetControl Hub</Text>
          <Text style={styles.tagline}>智能网络管理，触手可及</Text>
        </View>

        {/* 登录卡片 */}
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>登录路由器</Text>
          <Text style={styles.loginSubtitle}>
            连接至 {currentRouterIp} · TP-LINK
          </Text>

          {error ? <ErrorBanner message={error} /> : null}

          {/* 路由器地址 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>路由器地址</Text>
            <TextInput
              style={styles.input}
              value={currentRouterIp}
              onChangeText={handleIpChange}
              placeholder="192.168.2.1"
              placeholderTextColor={Colors.gray400}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          {/* 管理员密码 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>管理员密码</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, error ? styles.inputError : null]}
                value={password}
                onChangeText={setPassword}
                placeholder="请输入路由器密码"
                placeholderTextColor={Colors.gray400}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 记住密码 */}
          <View style={styles.rememberRow}>
            <TouchableOpacity style={styles.checkboxRow} onPress={toggleRemember}>
              <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                {remember && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>记住密码</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.helpLink}>如何找到密码?</Text>
            </TouchableOpacity>
          </View>

          {/* 登录按钮 */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.lockIcon}>🔒</Text>
                <Text style={styles.loginButtonText}>登录</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Web 端代理提示 */}
          {Platform.OS === 'web' && (
            <View style={styles.proxyNote}>
              <Text style={styles.proxyIcon}>🌐</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.proxyTitle}>Web 端代理模式</Text>
                <Text style={styles.proxyText}>
                  请先在终端运行 <Text style={styles.codeText}>npm run proxy</Text> 启动代理服务器，
                  然后通过浏览器打开本页面即可绕过 CORS 限制。
                </Text>
              </View>
            </View>
          )}

          {/* 安全提示 */}
          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>🛡️</Text>
            <Text style={styles.securityText}>
              请注意：所有请求通过局域网内HTTP传输，请仅在可信私有网络中使用本应用。
            </Text>
          </View>

          {/* 网络不可达提示 */}
          {networkError && (
            <View style={styles.networkErrorBox}>
              <Text style={styles.networkErrorIcon}>📶</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.networkErrorTitle}>无法连接到路由器</Text>
                <Text style={styles.networkErrorDesc}>请确认已连接至家庭/办公室WiFi</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 30,
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  logoWrap: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoIcon: {
    fontSize: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  loginCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 60,
    elevation: 10,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray800,
    marginBottom: 6,
  },
  loginSubtitle: {
    fontSize: 13,
    color: Colors.gray500,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray600,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.gray800,
    backgroundColor: Colors.gray50,
  },
  inputError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },
  passwordWrap: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 13,
    color: Colors.gray600,
  },
  helpLink: {
    fontSize: 12,
    color: Colors.primary,
  },
  lockIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  loginButton: {
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
    gap: 8,
  },
  securityIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  securityText: {
    fontSize: 11,
    color: Colors.gray600,
    lineHeight: 16,
    flex: 1,
  },
  networkErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
    gap: 8,
  },
  networkErrorIcon: {
    fontSize: 16,
  },
  networkErrorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray700,
  },
  networkErrorDesc: {
    fontSize: 11,
    color: Colors.gray500,
    marginTop: 2,
  },
  proxyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  proxyIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  proxyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  proxyText: {
    fontSize: 11,
    color: Colors.gray600,
    lineHeight: 16,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: Colors.gray100,
    color: Colors.primary,
    fontWeight: '600',
  },
});
