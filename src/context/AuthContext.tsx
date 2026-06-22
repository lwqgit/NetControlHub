/**
 * 认证上下文 —— 管理登录状态、Token 和密码安全存储
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { login, logout, clearStok, setStok } from '../services/api';

// SecureStore 在 Web 端不可用，降级为 AsyncStorage
const IS_NATIVE = Platform.OS !== 'web';

const secureGet = async (key: string): Promise<string | null> => {
  if (IS_NATIVE) return SecureStore.getItemAsync(key);
  return AsyncStorage.getItem(key);
};

const secureSet = async (key: string, value: string): Promise<void> => {
  if (IS_NATIVE) await SecureStore.setItemAsync(key, value);
  else await AsyncStorage.setItem(key, value);
};

const secureDelete = async (key: string): Promise<void> => {
  if (IS_NATIVE) await SecureStore.deleteItemAsync(key);
  else await AsyncStorage.removeItem(key);
};

interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  routerIp: string;
  savedPassword: string;
  rememberPassword: boolean;
}

interface AuthContextType extends AuthState {
  doLogin: (password: string) => Promise<{ success: boolean; error?: string }>;
  doLogout: () => Promise<void>;
  setRouterIp: (ip: string) => Promise<void>;
  setRememberPassword: (remember: boolean) => Promise<void>;
  setSavedPassword: (password: string) => Promise<void>;
  checkStoredCredentials: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const STORAGE_KEYS = {
  ROUTER_IP: '@netcontrol_router_ip',
  REMEMBER_PW: '@netcontrol_remember_pw',
  STOK: 'netcontrol_stok',       // SecureStore 不允许 @ 前缀
  PASSWORD: 'netcontrol_password', // SecureStore 不允许 @ 前缀
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [routerIp, setRouterIpState] = useState('192.168.2.1');
  const [savedPassword, setSavedPasswordState] = useState('');
  const [rememberPassword, setRememberPasswordState] = useState(false);

  // 初始化时加载存储的凭据
  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const [storedIp, storedRemember, storedToken, storedPassword] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ROUTER_IP),
        AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_PW),
        secureGet(STORAGE_KEYS.STOK),
        secureGet(STORAGE_KEYS.PASSWORD),
      ]);

      if (storedIp) setRouterIpState(storedIp);
      const remember = storedRemember === 'true';
      setRememberPasswordState(remember);

      if (storedToken) {
        setStok(storedToken);
        setIsLoggedIn(true);
        if (remember && storedPassword) {
          setSavedPasswordState(storedPassword);
        }
      } else if (remember && storedPassword) {
        setSavedPasswordState(storedPassword);
      }
    } catch (e) {
      // 静默处理
    } finally {
      setIsLoading(false);
    }
  };

  const checkStoredCredentials = useCallback(async (): Promise<boolean> => {
    try {
      const storedToken = await secureGet(STORAGE_KEYS.STOK);
      if (storedToken) {
        setStok(storedToken);
        setIsLoggedIn(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const doLogin = async (password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await login(password);

    if (result.success && result.stok) {
      setStok(result.stok);
      setIsLoggedIn(true);

      try {
        await secureSet(STORAGE_KEYS.STOK, result.stok);
        if (rememberPassword) {
          await secureSet(STORAGE_KEYS.PASSWORD, password);
          setSavedPasswordState(password);
        } else {
          await secureDelete(STORAGE_KEYS.PASSWORD);
          setSavedPasswordState('');
        }
      } catch (e) {
        // 静默处理
      }
    }

    return result;
  };

  const doLogout = async () => {
    // 先清除本地状态立即退出，路由器退出请求放后台（不阻塞 UI）
    clearStok();
    setIsLoggedIn(false);
    try {
      await secureDelete(STORAGE_KEYS.STOK);
    } catch (e) {
      // 静默处理
    }
    // 后台通知路由器退出（无需等待）
    logout().catch(() => {});
  };

  const setRouterIp = async (ip: string) => {
    setRouterIpState(ip);
    await AsyncStorage.setItem(STORAGE_KEYS.ROUTER_IP, ip);
  };

  const setRememberPasswordFn = async (remember: boolean) => {
    setRememberPasswordState(remember);
    await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_PW, String(remember));
    if (!remember) {
      await secureDelete(STORAGE_KEYS.PASSWORD);
      setSavedPasswordState('');
    }
  };

  const setSavedPasswordFn = async (password: string) => {
    setSavedPasswordState(password);
    if (rememberPassword) {
      try {
        await secureSet(STORAGE_KEYS.PASSWORD, password);
      } catch (e) {
        // 静默处理
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        routerIp,
        savedPassword,
        rememberPassword,
        doLogin,
        doLogout,
        setRouterIp,
        setRememberPassword: setRememberPasswordFn,
        setSavedPassword: setSavedPasswordFn,
        checkStoredCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
