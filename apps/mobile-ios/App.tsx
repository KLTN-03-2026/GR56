import { Animated, View, PanResponder, Text, DeviceEventEmitter } from "react-native";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useEffect, useState } from "react";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import { NavigationContainer } from "@react-navigation/native";
import navigationRef from "./src/utils/navigationRef";
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from "./src/genaral/api";
import { notify } from "./src/utils/localNotification";
import { saveNotification } from "./src/utils/notificationStore";
import {
  createNotificationChannels,
  requestNotificationPermission,
} from "./src/utils/localNotification";
import { requestLocationPermission } from "./src/utils/location";
import { connectEcho } from "./src/config/echo";
import OnLoading from "./src/pages/OnLoading";
import Register from "./src/pages/Register";
import GetStart from "./src/pages/GetStart";
import Login from "./src/pages/Login";
import HomePage from "./src/pages/Clients/HomePage";
import Orders from "./src/pages/Clients/Orders";
import Favorites from "./src/pages/Clients/Favorites";
import Notification from "./src/pages/Clients/Notification";
import Profile from "./src/pages/Clients/Profile";
import RestaurantDetail from "./src/pages/Clients/RestaurantDetail";
import RestaurantMap from "./src/pages/Clients/RestaurantMap";
import ChatWithShop from "./src/pages/Clients/ChatWithShipper";
import ForgotPassword from "./src/pages/Clients/ForgotPassword";
import ProfileDetail from "./src/pages/Clients/ProfileDetail";
import ShipperRegister from "./src/pages/ShipperRegister";
import ShipperProfile from "./src/pages/Shipper/ShipperProfile";
import ShipperOrders from "./src/pages/Shipper/ShipperOrders";
import ShipperEarnings from "./src/pages/Shipper/ShipperEarnings";
import ShipperNotification from "./src/pages/Shipper/ShipperNotification";
import MyVouchers from "./src/pages/Clients/MyVouchers";
import AllVouchers from "./src/pages/Clients/AllVouchers";
import AddressBook from "./src/pages/Clients/AddressBook";
import AllRestaurantsSale from "./src/pages/Clients/AllRestaurantsSale";
import AllDishesOnSale from "./src/pages/Clients/AllDishesOnSale";
import ChatBot from "./src/pages/Clients/ChatBot";
import Cart from "./src/pages/Clients/Cart";
import ChatWithCustomer from "./src/pages/Shipper/ChatWithCustomer";
import ShipperProfileDetail from "./src/pages/Shipper/ShipperProfileDetail";
import ShipperChangePassword from "./src/pages/Shipper/ShipperChangePassword";
import ShipperTopUp from "./src/pages/Shipper/ShipperTopUp";
import ShipperWithdraw from "./src/pages/Shipper/ShipperWithdraw";
import ShipperBaoCaoSuCo from "./src/pages/Shipper/ShipperBaoCaoSuCo";
import ShipperWalletHistory from "./src/pages/Shipper/ShipperWalletHistory";
import FoodReview from "./src/pages/Clients/FoodReview";
import PayOSPayment from "./src/pages/Clients/PayOSPayment";
import HelpCenter from "./src/pages/Clients/HelpCenter";
import AppUpdate from "./src/pages/Clients/AppUpdate";
import LichSuGiaoDich from "./src/pages/Clients/LichSuGiaoDich";
import LichSuXu from "./src/pages/Clients/LichSuXu";
import Toast from "react-native-toast-message";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();


// ─── Wrapper: vuốt phải → về Trang chủ (có hiệu ứng lướt) ────
function SwipeToHome({ children, navigation }: { children: React.ReactNode; navigation: any }) {
  const translateX = React.useRef(new Animated.Value(0)).current;

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx > 15 && Math.abs(gs.dy) < 60,

      // Kéo theo ngón tay
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 0) {
          translateX.setValue(gs.dx);
        }
      },

      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 80 || gs.vx > 0.5) {
          // Đủ lực → slide ra ngoài rồi về Home
          Animated.timing(translateX, {
            toValue: 420,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            navigation.navigate('Home');
          });
        } else {
          // Không đủ → bounce về vị trí cũ
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Reset vị trí khi tab được focus trở lại (tránh bị lệch lần sau)
  React.useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      translateX.setValue(0);
    });
    return unsub;
  }, [navigation, translateX]);

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

function AnimatIcon({ name_icon, focused, color, size }: { name_icon: string; focused: boolean; color: string; size: number }) {
  const scaleIcon = new Animated.Value(focused ? 1.1 : 1);
  React.useEffect(() => {
    Animated.spring(scaleIcon, {
      toValue: focused ? 1.1 : 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{
      transform: [{ scale: scaleIcon }],
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    }}>
      <Ionicons name={name_icon} size={size} color={color} />
    </Animated.View>
  );
}

// Navigator cho người dùng - 5 mục
function UserTabs() {
  // ── Theo dõi thay đổi trạng thái đơn hàng mỗi 30 giây ──
  useEffect(() => {
    const STATUS_NOTIF: Record<number, { title: string; desc: (o: any) => string; icon: string }> = {
      1: { title: "Đơn hàng đã được xác nhận", desc: (o) => `${o.ten_quan_an} đã xác nhận đơn ${o.ma_don_hang}`, icon: "checkmark-circle" },
      2: { title: "Quán đang chuẩn bị", desc: (o) => `${o.ten_quan_an} đang chuẩn bị đơn ${o.ma_don_hang}`, icon: "restaurant" },
      3: { title: "Shipper đang giao hàng", desc: (o) => `Đơn ${o.ma_don_hang} đang trên đường đến bạn`, icon: "bicycle" },
      4: { title: "Giao hàng thành công 🎉", desc: (o) => `Đơn ${o.ma_don_hang} đã giao xong. Hãy đánh giá!`, icon: "checkmark-done" },
    };

    const checkOrders = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;
        const res = await apiClient.get("/khach-hang/don-hang/data-moi");
        const orders: any[] = res.data?.data ?? [];
        const storedStr = await AsyncStorage.getItem("order_status_cache");
        const prev: Record<number, number> = storedStr ? JSON.parse(storedStr) : {};
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
              await saveNotification({ type: "order", title: info.title, description: desc, icon: info.icon, badgeLabel: "Đơn hàng" });
            }
          }
        }
        await AsyncStorage.setItem("order_status_cache", JSON.stringify(curr));
      } catch { }
    };

    checkOrders();
    const interval = setInterval(checkOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Lắng nghe thông báo Real-time qua Echo (giống FE ClientLayout.jsx) ──
  useEffect(() => {
    let channel: any = null;
    let isCancelled = false;

    const setup = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem("userData");
        if (!userDataStr || isCancelled) return;
        const userData = JSON.parse(userDataStr);
        const userId = userData.id;
        if (!userId) return;

        const echo = await connectEcho();
        if (isCancelled) return;

        // Subscribe channel MỘT LẦN – giống hệt FE
        channel = echo.private(`khach-hang.${userId}`);
        console.log(`[Echo] Subscribed to khach-hang.${userId}`);

        // Handlers – tên event giống FE (có dấu chấm đầu)
        const handlers: Record<string, (data: any) => void> = {
          // ← FIX: thêm handler .don-hang.moi bị thiếu cho customer
          '.don-hang.moi': (data) => {
            const dh = data.don_hang || data || {};
            const maDH = dh.ma_don_hang || `#${dh.id}`;
            notify.order("Đơn hàng đã được tạo!", `Đơn #${maDH} đang chờ xác nhận.`);
            saveNotification({ type: "order", title: "Đơn hàng đã được tạo!", description: `Đơn #${maDH} đang chờ xác nhận.`, icon: "receipt", badgeLabel: "Đơn hàng" });
          },
          '.don-hang.da-nhan': (data) => {
            const dh = data.don_hang || data || {};
            const maDH = dh.ma_don_hang || "";
            notify.order("Shipper đã nhận đơn!", `Shipper đang trên đường đến quán lấy đơn #${maDH}.`);
            saveNotification({ type: "order", title: "Shipper đã nhận đơn!", description: `Shipper đang trên đường đến quán lấy đơn #${maDH}.`, icon: "bicycle", badgeLabel: "Đơn hàng" });
          },
          '.don-hang.dang-lam': (data) => {
            const dh = data.don_hang || data || {};
            const maDH = dh.ma_don_hang || "";
            notify.order("Quán đang nấu món!", `Đơn #${maDH} đang được chuẩn bị.`);
            saveNotification({ type: "order", title: "Quán đang nấu món!", description: `Đơn #${maDH} đang được chuẩn bị.`, icon: "restaurant", badgeLabel: "Đơn hàng" });
          },
          '.don-hang.da-xong': (data) => {
            const dh = data.don_hang || data || {};
            const maDH = dh.ma_don_hang || "";
            notify.order("Đơn đang trên đường giao!", `Shipper đang giao đơn #${maDH} đến bạn.`);
            saveNotification({ type: "order", title: "Đơn đang trên đường giao!", description: `Shipper đang giao đơn #${maDH} đến bạn.`, icon: "bicycle", badgeLabel: "Đơn hàng" });
          },
          '.don-hang.hoan-thanh': (data) => {
            const dh = data.don_hang || data || {};
            const maDH = dh.ma_don_hang || "";
            notify.order("Giao hàng thành công!", `Đơn #${maDH} đã đến tay bạn. Cảm ơn!`);
            saveNotification({ type: "order", title: "Giao hàng thành công!", description: `Đơn #${maDH} đã đến tay bạn. Cảm ơn!`, icon: "checkmark-done", badgeLabel: "Đơn hàng" });
          },
          '.don-hang.da-huy': (data) => {
            const dh = data.don_hang || data || {};
            const maDH = dh.ma_don_hang || "";
            const isAuto = (dh.ly_do || "") === "auto_cancel";
            const noiDung = isAuto
              ? `Đơn #${maDH} bị hủy tự động do không có shipper nhận.`
              : `Yêu cầu hủy đơn #${maDH} đã được duyệt.`;
            notify.order(isAuto ? "Đơn bị hủy tự động" : "Đơn hàng đã bị hủy", noiDung);
            saveNotification({ type: "order", title: isAuto ? "Đơn bị hủy tự động" : "Đơn hàng đã bị hủy", description: noiDung, icon: "close-circle", badgeLabel: "Đơn hàng" });
          },
          '.tin-nhan.moi': (data) => {
            const msg = data.tin_nhan || {};
            if (msg.loai_nguoi_gui !== "khach_hang") {
              notify.chat("Bạn có tin nhắn mới", msg.noi_dung || "Từ Shipper");
              saveNotification({ type: "order", title: "Bạn có tin nhắn mới", description: msg.noi_dung || "Từ Shipper", icon: "chatbubble-ellipses", badgeLabel: "Tin nhắn" });
            }
          },
          // PayOS thanh toán online thành công
          '.don-hang.da-thanh-toan': (data) => {
            const dh = data.don_hang || data || {};
            const maDH = dh.ma_don_hang || `#${dh.id}`;
            notify.order("💳 Thanh toán thành công!", `Đơn ${maDH} đã được thanh toán online.`);
            saveNotification({ type: "order", title: "💳 Thanh toán thành công!", description: `Đơn ${maDH} đã được thanh toán online.`, icon: "card", badgeLabel: "Đơn hàng" });
          },
        };

        // Listen tất cả events trên CÙNG một channel object – giống FE
        Object.entries(handlers).forEach(([evt, fn]) => channel.listen(evt, fn));

      } catch (err) {
        console.log("[Echo] UserTabs Echo error:", err);
      }
    };

    setup();
    return () => {
      isCancelled = true;
      if (channel) {
        try { channel.stopListening('.don-hang.moi'); } catch { }
        try { channel.stopListening('.don-hang.da-nhan'); } catch { }
        try { channel.stopListening('.don-hang.dang-lam'); } catch { }
        try { channel.stopListening('.don-hang.da-xong'); } catch { }
        try { channel.stopListening('.don-hang.hoan-thanh'); } catch { }
        try { channel.stopListening('.don-hang.da-huy'); } catch { }
        try { channel.stopListening('.tin-nhan.moi'); } catch { }
        try { channel.stopListening('.don-hang.da-thanh-toan'); } catch { }
      }
    };
  }, []);

  // ── Polling tin nhắn từ shipper (chạy ngay cả khi không mở chat) ──
  useEffect(() => {
    createNotificationChannels();
    requestNotificationPermission();

    const checkChatMessages = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        // Lấy danh sách đơn hàng đang giao để biết có cuộc trò chuyện nào
        const res = await apiClient.get("/khach-hang/don-hang/data-moi");
        const orders: any[] = res.data?.data ?? [];
        const activeOrders = orders.filter((o) => [1, 2, 3].includes(Number(o.tinh_trang)));

        let hasNewMessages = false;
        let totalUnread = 0;
        let lastOrderId = null;

        for (const order of activeOrders) {
          const idStr = String(order.id);
          try {
            const unreadRes = await apiClient.get(`/khach-hang/chat/${idStr}/chua-doc`);
            if (unreadRes.data?.status) {
              const unreadCount = Number(unreadRes.data.count) || 0;

              const cacheKey = `kh_chat_unread_${idStr}`;
              const prevStr = await AsyncStorage.getItem(cacheKey);
              const prevCount = prevStr ? Number(prevStr) : 0;

              if (unreadCount > prevCount) {
                hasNewMessages = true;
                totalUnread += (unreadCount - prevCount);
                lastOrderId = order.ma_don_hang || idStr;
              }

              await AsyncStorage.setItem(cacheKey, String(unreadCount));
            }
          } catch { }
        }

        if (hasNewMessages) {
          notify.chat(
            `💬 Bạn có ${totalUnread} tin nhắn mới`,
            lastOrderId ? `Từ đơn hàng #${lastOrderId}` : "Từ Shipper"
          );
          saveNotification({
            type: "order",
            title: `Tin nhắn mới`,
            description: `Bạn có ${totalUnread} tin nhắn chưa đọc.`,
            icon: "chatbubble-ellipses",
            badgeLabel: "Tin nhắn",
          });
        }
      } catch { }
    };

    checkChatMessages();
    const chatInterval = setInterval(checkChatMessages, 10000);
    return () => clearInterval(chatInterval);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        swipeEnabled: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: '#EAEAEC',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let name_icon = "";

          if (route.name === "Home") name_icon = focused ? "home" : "home-outline";
          else if (route.name === "Orders") name_icon = focused ? "receipt" : "receipt-outline";
          else if (route.name === "ChatBot") name_icon = focused ? "chatbubbles" : "chatbubbles-outline";
          else if (route.name === "Wishlist") name_icon = focused ? "heart" : "heart-outline";
          else if (route.name === "Profile") name_icon = focused ? "person" : "person-outline";

          return (
            <AnimatIcon
              name_icon={name_icon}
              focused={focused}
              color={color}
              size={22}
            />
          );
        },
        tabBarActiveTintColor: "#ed4d2d",
        tabBarInactiveTintColor: "#808080",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
        },
      })}
    >
      <Tab.Screen name="Home" component={HomePage} options={{ title: "Trang chủ" }} />
      <Tab.Screen name="Orders" options={{ title: "Đơn Hàng" }}>
        {({ navigation, route }: any) => <SwipeToHome navigation={navigation}><Orders navigation={navigation} route={route} /></SwipeToHome>}
      </Tab.Screen>
      <Tab.Screen name="ChatBot" options={{ title: "ChatBot" }}>
        {({ navigation, route }: any) => <SwipeToHome navigation={navigation}><ChatBot navigation={navigation} route={route} /></SwipeToHome>}
      </Tab.Screen>
      <Tab.Screen name="Wishlist" options={{ title: "Yêu thích" }}>
        {({ navigation, route }: any) => <SwipeToHome navigation={navigation}><Favorites navigation={navigation} route={route} /></SwipeToHome>}
      </Tab.Screen>
      <Tab.Screen name="Profile" options={{ title: "Tôi" }}>
        {({ navigation, route }: any) => <SwipeToHome navigation={navigation}><Profile navigation={navigation} route={route} /></SwipeToHome>}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// Navigator cho shipper - 3 mục
function ShipperTabs() {
  // ── Polling đơn hàng mới (cơ chế chính, đáng tin cậy nhất) ──
  useEffect(() => {
    createNotificationChannels();
    requestNotificationPermission();
    requestLocationPermission();

    // Mutex: tránh gọi đồng thời gây 2 thông báo cho cùng 1 đơn
    let isChecking = false;

    const checkNewOrders = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const res = await apiClient.get("/shipper/don-hang/cho-nhan");
        // API trả về list_don_hang_co_the_nhan
        const pending: any[] = res.data?.list_don_hang_co_the_nhan ?? [];

        const cachedStr = await AsyncStorage.getItem("sp_order_ids_cache");
        const cachedIds: number[] = cachedStr ? JSON.parse(cachedStr) : [];

        const currentIds = pending.map((o: any) => Number(o.id));
        const newOrders = cachedStr !== null
          ? pending.filter((o: any) => !cachedIds.includes(Number(o.id)))
          : [];

        // Cập nhật cache TRƯỚC khi notify để tránh race
        await AsyncStorage.setItem("sp_order_ids_cache", JSON.stringify(currentIds));

        if (newOrders.length > 0) {
          DeviceEventEmitter.emit('NEW_SHIPPER_ORDER');
          // Gộp tất cả đơn mới thành 1 thông báo duy nhất
          if (newOrders.length === 1) {
            const order = newOrders[0];
            const maDH = order.ma_don_hang || "";
            const tongTien = order.tong_tien || 0;
            notify.order(
              "Đơn hàng mới!",
              `Mã #${maDH} - Giá: ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(tongTien)}`
            );
          } else {
            notify.order(
              `${newOrders.length} đơn hàng mới!`,
              `Bạn có ${newOrders.length} đơn đang chờ xác nhận`
            );
          }
          // Lưu vào notification store (mỗi đơn 1 mục)
          for (const order of newOrders) {
            const maDH = order.ma_don_hang || "";
            saveNotification({
              type: "order",
              title: "Đơn hàng mới!",
              description: `Mã #${maDH} - cần người nhận`,
              icon: "cube",
              badgeLabel: "Đơn hàng",
            });
          }
        }
      } catch { }
      finally { isChecking = false; }
    };

    // Delay lần đầu 2s để tránh race với interval đầu tiên
    const initTimer = setTimeout(checkNewOrders, 2000);
    const orderInterval = setInterval(checkNewOrders, 15000);
    return () => { clearTimeout(initTimer); clearInterval(orderInterval); };
  }, []);

  // ── WebSocket: lắng nghe kênh cá nhân shipper (tin nhắn, hủy đơn) ──
  useEffect(() => {
    let channelShipper: any = null;
    let channelAll: any = null;
    let isCancelled = false;

    const setupShipperChannel = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem("userData");
        if (!userDataStr || isCancelled) return;
        const userData = JSON.parse(userDataStr);
        const userId = userData.id;
        if (!userId) return;

        const echo = await connectEcho();
        if (isCancelled) return;

        channelShipper = echo.private(`shipper.${userId}`);
        console.log(`[Echo] Subscribed to shipper.${userId}`);

        channelShipper.listen('.tin-nhan.moi', (data: any) => {
          const msg = data.tin_nhan || {};
          if (msg.loai_nguoi_gui === 'khach_hang') {
            notify.chat("Tin nhắn từ khách hàng", msg.noi_dung || "Khách hàng nhắn tin");
            saveNotification({ type: "order", title: "Tin nhắn từ khách hàng", description: msg.noi_dung || "", icon: "chatbubble-ellipses", badgeLabel: "Tin nhắn" });
          }
        });


        // Có đơn mới được broadcast đến shipper
        channelShipper.listen('.dispatch.candidate', (data: any) => {
          const order = data.order || data;
          const maDH = order?.ma_don_hang || `#${order?.id}`;
          notify.order("📦 Có đơn mới chờ nhận!", `Đơn ${maDH} - Phí ship ${order?.phi_ship ? Number(order.phi_ship).toLocaleString('vi-VN') + 'đ' : 'chưa rõ'}`);
          saveNotification({
            type: "order",
            title: "📦 Có đơn mới chờ nhận!",
            description: `Đơn ${maDH} - Phí ship ${order?.phi_ship ? Number(order.phi_ship).toLocaleString('vi-VN') + 'đ' : 'chưa rõ'}`,
            icon: "bicycle",
            badgeLabel: "Đơn hàng",
          });
          DeviceEventEmitter.emit("DISPATCH_NEW_ORDER", { order_id: order?.id });
        });

        channelShipper.listen('.don-hang.da-huy', (data: any) => {
          const dh = data.don_hang || data || {};
          const maDH = dh.ma_don_hang || "";
          notify.order("Đơn hàng đã bị hủy!", `Đơn #${maDH} đã bị admin hủy.`);
          saveNotification({ type: "order", title: "Đơn hàng đã bị hủy!", description: `Đơn #${maDH} đã bị hủy.`, icon: "close-circle", badgeLabel: "Đơn hàng" });
        });

        // Quán đang chế biến — tinh_trang = 2
        channelShipper.listen('.don-hang.dang-lam', (data: any) => {
          const dh = data.don_hang || data || {};
          const maDH = dh?.ma_don_hang || `#${dh?.id}`;
          notify.order('🍳 Quán đã nhận đơn!', `Đơn ${maDH} đang được chuẩn bị.`);
          saveNotification({
            type: 'order',
            title: 'Quán đã nhận đơn!',
            description: `Đơn ${maDH} đang được chế biến.`,
            icon: 'restaurant',
            badgeLabel: 'Đơn hàng',
          });
          DeviceEventEmitter.emit('ORDER_STATUS_CHANGED', { order_id: dh?.id, tinh_trang: 2 });
        });

        // Shipper nhận đơn — tinh_trang = 1
        channelShipper.listen('.don-hang.da-nhan', (data: any) => {
          const dh = data.don_hang || data || {};
          const maDH = dh?.ma_don_hang || `#${dh?.id}`;
          notify.order('🎉 Bạn đã nhận đơn!', `Đơn ${maDH} - Đang trên đường lấy hàng.`);
          saveNotification({
            type: 'order',
            title: 'Bạn đã nhận đơn!',
            description: `Đơn ${maDH} - Đang trên đường lấy hàng.`,
            icon: 'bicycle',
            badgeLabel: 'Đơn hàng',
          });
          DeviceEventEmitter.emit('ORDER_STATUS_CHANGED', { order_id: dh?.id, tinh_trang: 1 });
        });

        // Quán chuẩn bị xong — tinh_trang = 3
        channelShipper.listen('.don-hang.da-xong', (data: any) => {
          const dh = data.don_hang || data || {};
          const maDH = dh?.ma_don_hang || `#${dh?.id}`;
          notify.order('✅ Quán đã xong! Đến lấy hàng ngay', `Đơn ${maDH} đã sẵn sàng.`);
          saveNotification({
            type: 'order',
            title: 'Quán đã chuẩn bị xong!',
            description: `Đơn ${maDH} đã sẵn sàng để lấy.`,
            icon: 'bag-check',
            badgeLabel: 'Đơn hàng',
          });
          DeviceEventEmitter.emit('ORDER_STATUS_CHANGED', { order_id: dh?.id, tinh_trang: 3 });
        });

        // Giao hàng thành công — tinh_trang = 4
        channelShipper.listen('.don-hang.hoan-thanh', (data: any) => {
          const dh = data.don_hang || data || {};
          const maDH = dh?.ma_don_hang || `#${dh?.id}`;
          notify.order('🎉 Giao hàng thành công!', `Đơn ${maDH} đã được giao.`);
          saveNotification({
            type: 'order',
            title: 'Giao hàng thành công!',
            description: `Đơn ${maDH} đã được giao.`,
            icon: 'checkmark-done',
            badgeLabel: 'Đơn hàng',
          });
          DeviceEventEmitter.emit('ORDER_STATUS_CHANGED', { order_id: dh?.id, tinh_trang: 4 });
        });


        // ── Channel all-shippers: nhận đơn mới từ DonHangMoiEvent và DonHangDaThanhToanEvent ──
        channelAll = echo.private('all-shippers');
        console.log('[Echo] Subscribed to all-shippers');

        channelAll.listen('.don-hang.moi', (data: any) => {
          const dh = data.don_hang || data;
          const maDH = dh?.ma_don_hang || `#${dh?.id}`;
          const phiShip = dh?.phi_ship ? Number(dh.phi_ship).toLocaleString('vi-VN') + 'đ' : 'chưa rõ';
          notify.order("📦 Có đơn mới chờ nhận!", `Đơn ${maDH} - Phí ship ${phiShip}`);
          saveNotification({
            type: "order",
            title: "📦 Có đơn mới chờ nhận!",
            description: `Đơn ${maDH} - Phí ship ${phiShip}`,
            icon: "bicycle",
            badgeLabel: "Đơn hàng",
          });
          DeviceEventEmitter.emit("DISPATCH_NEW_ORDER", { order_id: dh?.id });
        });

        channelAll.listen('.don-hang.da-thanh-toan', (data: any) => {
          const dh = data.don_hang || data;
          const maDH = dh?.ma_don_hang || `#${dh?.id}`;
          notify.order("💳 Đơn đã thanh toán!", `Đơn ${maDH} đã được khách thanh toán online.`);
          saveNotification({
            type: "order",
            title: "💳 Đơn đã thanh toán!",
            description: `Đơn ${maDH} đã được khách thanh toán online.`,
            icon: "card",
            badgeLabel: "Đơn hàng",
          });
          DeviceEventEmitter.emit("DISPATCH_NEW_ORDER", { order_id: dh?.id });
        });


      } catch (err) {
        console.log("[Echo] shipper channel Echo error:", err);
      }
    };

    setupShipperChannel();
    return () => {
      isCancelled = true;
      if (channelShipper) {
        try { channelShipper.stopListening('.tin-nhan.moi'); } catch { }
        try { channelShipper.stopListening('.don-hang.da-huy'); } catch { }
        try { channelShipper.stopListening('.dispatch.candidate'); } catch { }
        try { channelShipper.stopListening('.don-hang.dang-lam'); } catch { }
        try { channelShipper.stopListening('.don-hang.da-xong'); } catch { }
        try { channelShipper.stopListening('.don-hang.da-nhan'); } catch { }
        try { channelShipper.stopListening('.don-hang.hoan-thanh'); } catch { }
      }
      if (channelAll) {
        try { channelAll.stopListening('.don-hang.moi'); } catch { }
        try { channelAll.stopListening('.don-hang.da-thanh-toan'); } catch { }
      }
    };
  }, []);

  // ── Polling trạng thái đơn đang giao (quán nhận / quán xong) ──
  useEffect(() => {
    // Cache: { [orderId]: tinh_trang }
    const STATUS_CACHE_KEY = "sp_active_order_status_cache";
    let isChecking = false;

    const checkOrderStatus = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const res = await apiClient.get("/shipper/don-hang/dang-giao-chi-tiet");
        const activeOrders: any[] = res.data?.data ?? [];
        if (activeOrders.length === 0) return;

        const cacheStr = await AsyncStorage.getItem(STATUS_CACHE_KEY);
        const prevStatus: Record<string, number> = cacheStr ? JSON.parse(cacheStr) : {};

        const newStatus: Record<string, number> = {};
        for (const order of activeOrders) {
          const id = String(order.id);
          const maDH = order.ma_don_hang || id;
          const tinh_trang = Number(order.tinh_trang);
          newStatus[id] = tinh_trang;

          // Chỉ thông báo nếu đã có cache (tránh spam khi mới mở app)
          if (!(id in prevStatus)) continue;
          const prev = prevStatus[id];

          // tinh_trang 1 → 2: quán nhận đơn, đang nấu → shipper đến quán chờ
          if (prev === 1 && tinh_trang === 2) {
            notify.order(
              "🍳 Quán đã nhận đơn!",
              `Đơn #${maDH} đang được chuẩn bị. Hãy đến quán chờ nhận hàng.`
            );
            saveNotification({
              type: "order",
              title: "Quán đã nhận đơn!",
              description: `Đơn #${maDH} đang được nấu.`,
              icon: "restaurant",
              badgeLabel: "Đơn hàng",
            });
          }
          // tinh_trang 2 → 3: quán làm xong → shipper lấy hàng và đi giao
          if (prev === 2 && tinh_trang === 3) {
            notify.order(
              "✅ Quán đã xong! Đến lấy hàng ngay",
              `Đơn #${maDH} đã sẵn sàng. Hãy đến lấy và giao cho khách.`
            );
            saveNotification({
              type: "order",
              title: "Quán đã chuẩn bị xong!",
              description: `Đơn #${maDH} đã sẵn sàng để lấy.`,
              icon: "bag-check",
              badgeLabel: "Đơn hàng",
            });
          }
        }

        // Ghi cache trạng thái hiện tại
        await AsyncStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(newStatus));
      } catch { }
      finally { isChecking = false; }
    };

    // Khởi tạo cache ngay, poll mỗi 10s
    const initTimer = setTimeout(checkOrderStatus, 3000);
    const interval = setInterval(checkOrderStatus, 10000);
    return () => { clearTimeout(initTimer); clearInterval(interval); };
  }, []);

  // ── Polling tin nhắn từ khách hàng (chạy ngay cả khi không mở chat) ──
  useEffect(() => {
    // Không gọi lại createNotificationChannels/requestPermission (order polling đã gọi rồi)
    let isChatChecking = false;

    const checkChatMessages = async () => {
      if (isChatChecking) return;
      isChatChecking = true;
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const res = await apiClient.get("/shipper/don-hang/dang-giao-chi-tiet");
        const activeOrders: any[] = res.data?.data ?? [];
        // Không có đơn đang giao → bỏ qua (tránh toast rác)
        if (activeOrders.length === 0) return;

        let hasNewMessages = false;
        let totalUnread = 0;
        let lastOrderId = null;

        for (const order of activeOrders) {
          const idStr = String(order.id);
          try {
            const unreadRes = await apiClient.get(`/shipper/chat/${idStr}/chua-doc`);
            if (unreadRes.data?.status) {
              const unreadCount = Number(unreadRes.data.count) || 0;

              const cacheKey = `sp_chat_unread_${idStr}`;
              const prevStr = await AsyncStorage.getItem(cacheKey);
              const prevCount = prevStr ? Number(prevStr) : 0;

              if (unreadCount > prevCount) {
                hasNewMessages = true;
                totalUnread += (unreadCount - prevCount);
                lastOrderId = order.ma_don_hang || idStr;
              }

              await AsyncStorage.setItem(cacheKey, String(unreadCount));
            }
          } catch { }
        }

        if (hasNewMessages) {
          notify.chat(
            `💬 Bạn có ${totalUnread} tin nhắn mới`,
            lastOrderId ? `Từ đơn hàng #${lastOrderId}` : "Từ Khách hàng"
          );
          saveNotification({
            type: "order",
            title: `Tin nhắn mới`,
            description: `Bạn có ${totalUnread} tin nhắn chưa đọc.`,
            icon: "chatbubble-ellipses",
            badgeLabel: "Tin nhắn",
          });
        }
      } catch { }
      finally { isChatChecking = false; }
    };

    // Delay 5s sau mới bắt đầu poll chat (tránh chạy ngư ời dùng vừa mở app)
    const initTimer = setTimeout(checkChatMessages, 5000);
    const chatInterval = setInterval(checkChatMessages, 10000);
    return () => { clearTimeout(initTimer); clearInterval(chatInterval); };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: '#EAEAEC',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let name_icon = "";

          if (route.name === "Orders") name_icon = focused ? "cube" : "cube-outline";
          else if (route.name === "Notifications") name_icon = focused ? "notifications" : "notifications-outline";
          else if (route.name === "Earnings") name_icon = focused ? "wallet" : "wallet-outline";
          else if (route.name === "Profile") name_icon = focused ? "person" : "person-outline";

          return (
            <AnimatIcon
              name_icon={name_icon}
              focused={focused}
              color={color}
              size={22}
            />
          );
        },
        tabBarActiveTintColor: "#ed4d2d",
        tabBarInactiveTintColor: "#808080",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
        },
      })}
    >
      <Tab.Screen name="Orders" component={ShipperOrders} options={{ title: "Đơn hàng" }} />
      <Tab.Screen name="Notifications" component={ShipperNotification} options={{ title: "Thông báo" }} />
      <Tab.Screen name="Earnings" component={ShipperEarnings} options={{ title: "Thu nhập" }} />
      <Tab.Screen name="Profile" component={ShipperProfile} options={{ title: "Hồ sơ" }} />
    </Tab.Navigator>
  );
}


const App = () => {
  // Bạn có thể lấy userRole từ Redux, Context, AsyncStorage, hoặc state
  // Ví dụ: const userRole = useSelector(state => state.user.role); // "user" hoặc "shipper"
  const [userRole, setUserRole] = React.useState<"user" | "shipper">("user");
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      if (hasLaunched === null) {
        // Lần đầu tải app
        setIsFirstTime(true);
        await AsyncStorage.setItem("hasLaunched", "true");
      } else {
        // Đã từng tải app
        setIsFirstTime(false);
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra lần đầu tải app:", error);
      setIsFirstTime(false);
    }
  };

  if (isFirstTime === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F0F1A" }}>
        <Text style={{ color: "#FFFFFF", fontSize: 18 }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName={isFirstTime ? "GetStart" : "OnLoading"}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="OnLoading" component={OnLoading} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="GetStart" component={GetStart} />
          <Stack.Screen name="RestaurantDetail" component={RestaurantDetail} />
          <Stack.Screen name="RestaurantMap" component={RestaurantMap} />
          <Stack.Screen name="ChatWithRestaurant" component={ChatWithShop} />
          <Stack.Screen name="ChatWithShipper" component={ChatWithShop} />
          <Stack.Screen name="ChatWithCustomer" component={ChatWithCustomer} />
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          <Stack.Screen name="ProfileDetail" component={ProfileDetail} />
          <Stack.Screen name="ShipperRegister" component={ShipperRegister} />
          <Stack.Screen name="MyVouchers" component={MyVouchers} />
          <Stack.Screen name="AllVouchers" component={AllVouchers} />
          <Stack.Screen name="AddressBook" component={AddressBook} />
          <Stack.Screen name="AllRestaurantsSale" component={AllRestaurantsSale} />
          <Stack.Screen name="AllDishesOnSale" component={AllDishesOnSale} />
          <Stack.Screen name="Cart" component={Cart} />
          <Stack.Screen name="ShipperProfileDetail" component={ShipperProfileDetail} />
          <Stack.Screen name="ShipperChangePassword" component={ShipperChangePassword} />
          <Stack.Screen name="ShipperTopUp" component={ShipperTopUp} />
          <Stack.Screen name="ShipperWithdraw" component={ShipperWithdraw} />
          <Stack.Screen name="FoodReview" component={FoodReview} />
          <Stack.Screen name="PayOSPayment" component={PayOSPayment} />
          <Stack.Screen name="Notification" component={Notification} />
          <Stack.Screen name="AppUpdate" component={AppUpdate} />
          <Stack.Screen name="HelpCenter" component={HelpCenter} options={{ headerShown: false }} />
          <Stack.Screen name="LichSuGiaoDich" component={LichSuGiaoDich} />
          <Stack.Screen name="LichSuXu" component={LichSuXu} />
          <Stack.Screen name="ShipperBaoCaoSuCo" component={ShipperBaoCaoSuCo} />
          <Stack.Screen name="ShipperWalletHistory" component={ShipperWalletHistory} />

          {/* Define both navigation tab roots so we can navigate manually from Login */}
          <Stack.Screen name="MainTabs" component={UserTabs} options={{ gestureEnabled: false }} />
          <Stack.Screen name="ShipperTabs" component={ShipperTabs} options={{ gestureEnabled: false }} />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </>
  );
}

export default App;