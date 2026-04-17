/**
 * FoodBee Mobile App
 * Navigation Structure with User & Shipper Tabs
 * @format
 */

import { Animated, StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
// @ts-ignore
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import navigationRef from './src/utils/navigationRef';
import apiClient from './src/genaral/api';
import { saveNotification } from './src/utils/notificationStore';
import { notify } from './src/utils/localNotification';
import Login from './src/pages/Login';
import OnLoading from './src/pages/OnLoading';
import Register from './src/pages/Register';
import GetStart from './src/pages/GetStart';





const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Animated Icon Component ──
function AnimatIcon({
  name_icon,
  focused,
  color,
  size,
}: {
  name_icon: string;
  focused: boolean;
  color: string;
  size: number;
}) {
  const scaleIcon = new Animated.Value(focused ? 1.2 : 1);
  React.useEffect(() => {
    Animated.spring(scaleIcon, {
      toValue: focused ? 1.2 : 1,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleIcon }] }}>
      <Ionicons name={name_icon} size={size} color={color} />
    </Animated.View>
  );
}

// ── User Tabs Navigator ──
function UserTabs() {
  useEffect(() => {
    const STATUS_NOTIF: Record<
      number,
      { title: string; desc: (o: any) => string; icon: string }
    > = {
      1: {
        title: 'Đơn hàng đã được xác nhận',
        desc: (o) => `${o.ten_quan_an} đã xác nhận đơn ${o.ma_don_hang}`,
        icon: 'checkmark-circle',
      },
      2: {
        title: 'Quán đang chuẩn bị',
        desc: (o) => `${o.ten_quan_an} đang chuẩn bị đơn ${o.ma_don_hang}`,
        icon: 'restaurant',
      },
      3: {
        title: 'Shipper đang giao hàng',
        desc: (o) => `Đơn ${o.ma_don_hang} đang trên đường đến bạn`,
        icon: 'bicycle',
      },
      4: {
        title: 'Giao hàng thành công 🎉',
        desc: (o) => `Đơn ${o.ma_don_hang} đã giao xong. Hãy đánh giá!`,
        icon: 'checkmark-done',
      },
    };

    const checkOrders = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const res = await apiClient.get('/khach-hang/don-hang/data');
        const orders: any[] = res.data?.data ?? [];
        const storedStr = await AsyncStorage.getItem('order_status_cache');
        const prev: Record<number, number> = storedStr
          ? JSON.parse(storedStr)
          : {};
        const curr: Record<number, number> = {};

        for (const o of orders) {
          const id = Number(o.id);
          const status = Number(o.tinh_trang);
          curr[id] = status;

          if (id in prev && prev[id] !== status) {
            const info = STATUS_NOTIF[status];
            if (info) {
              const desc = info.desc(o);
              notify.order(info.title, desc);
              await saveNotification({
                type: 'order',
                title: info.title,
                description: desc,
                icon: info.icon,
                badgeLabel: 'Đơn hàng',
              });
            }
          }
        }

        await AsyncStorage.setItem('order_status_cache', JSON.stringify(curr));
      } catch { }
    };

    checkOrders();
    const interval = setInterval(checkOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // createNotificationChannels();
    // requestNotificationPermission();

    const checkChatMessages = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const res = await apiClient.get('/khach-hang/chat/tin-nhan-moi');
        if (!res.data?.status) return;

        const messages: Array<{
          id: number;
          id_don_hang: number;
          noi_dung: string;
          ten_shipper?: string;
        }> = res.data.data ?? [];

        if (messages.length === 0) return;

        const cacheStr = await AsyncStorage.getItem(
          'chat_last_notified_id'
        );
        const lastNotifiedId = cacheStr ? Number(cacheStr) : 0;

        const newMsgs = messages.filter((m) => m.id > lastNotifiedId);
        if (newMsgs.length === 0) return;

        const latest = newMsgs[newMsgs.length - 1];
        const shipperName = latest.ten_shipper || 'Shipper';

        notify.chat(
          `💬 Bạn có tin nhắn từ ${shipperName}`,
          latest.noi_dung
        );
        saveNotification({
          type: 'order',
          title: `Tin nhắn từ ${shipperName}`,
          description: latest.noi_dung,
          icon: 'chatbubble-ellipses',
          badgeLabel: 'Tin nhắn',
        });

        await AsyncStorage.setItem(
          'chat_last_notified_id',
          String(latest.id)
        );
      } catch { }
    };

    checkChatMessages();
    const chatInterval = setInterval(checkChatMessages, 10000);
    return () => clearInterval(chatInterval);
  }, []);

  return null;
}

// ── Shipper Tabs Navigator ──
function ShipperTabs() {
  useEffect(() => {
    // createNotificationChannels();
    // requestNotificationPermission();

    const checkChatMessages = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const res = await apiClient.get('/shipper/chat/tin-nhan-moi');
        if (!res.data?.status) return;

        const messages: Array<{
          id: number;
          id_don_hang: number;
          noi_dung: string;
          ten_khach?: string;
        }> = res.data.data ?? [];

        if (messages.length === 0) return;

        const cacheStr = await AsyncStorage.getItem(
          'shipper_chat_last_notified_id'
        );
        const lastNotifiedId = cacheStr ? Number(cacheStr) : 0;

        const newMsgs = messages.filter((m) => m.id > lastNotifiedId);
        if (newMsgs.length === 0) return;

        const latest = newMsgs[newMsgs.length - 1];
        const customerName = latest.ten_khach || 'Khách hàng';

        notify.chat(
          `💬 Tin nhắn từ ${customerName}`,
          latest.noi_dung
        );
        saveNotification({
          type: 'order',
          title: `Tin nhắn từ ${customerName}`,
          description: latest.noi_dung,
          icon: 'chatbubble-ellipses',
          badgeLabel: 'Tin nhắn',
        });

        await AsyncStorage.setItem(
          'shipper_chat_last_notified_id',
          String(latest.id)
        );
      } catch { }
    };

    checkChatMessages();
    const chatInterval = setInterval(checkChatMessages, 10000);
    return () => clearInterval(chatInterval);
  }, []);

  return null;
}

// ── Main App Component ──
function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      if (hasLaunched === null) {
        setIsFirstTime(true);
        await AsyncStorage.setItem('hasLaunched', 'true');
      } else {
        setIsFirstTime(false);
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra lần đầu tải app:', error);
      setIsFirstTime(false);
    }
  };

  if (isFirstTime === null) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="#0F0F1A"
      />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName={isFirstTime ? 'GetStart' : 'OnLoading'}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="OnLoading" component={OnLoading} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="GetStart" component={GetStart} />
          <Stack.Screen name="MainTabs" component={UserTabs} />
          <Stack.Screen name="ShipperTabs" component={ShipperTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
