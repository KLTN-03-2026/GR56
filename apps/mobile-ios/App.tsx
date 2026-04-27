import { Animated, View } from "react-native";
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
import { createEcho } from "./src/config/echo";
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
import ChatWithShop from "./src/pages/Clients/ChatWithShipper";
import ForgotPassword from "./src/pages/Clients/ForgotPassword";
import ProfileDetail from "./src/pages/Clients/ProfileDetail";
import ShipperRegister from "./src/pages/ShipperRegister";
import ShipperProfile from "./src/pages/Shipper/ShipperProfile";
import ShipperOrders from "./src/pages/Shipper/ShipperOrders";
import ShipperEarnings from "./src/pages/Shipper/ShipperEarnings";
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
import FoodReview from "./src/pages/Clients/FoodReview";
import PayOSPayment from "./src/pages/Clients/PayOSPayment";
import HelpCenter from "./src/pages/Clients/HelpCenter";
import AppUpdate from "./src/pages/Clients/AppUpdate";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
        const res = await apiClient.get("/khach-hang/don-hang/data");
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

  // ── Lắng nghe thông báo Real-time qua Echo ──
  useEffect(() => {
    let echoInstance: any = null;
    let isMounted = true;
    let currentChannel: string | null = null;

    const setupEcho = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem("userData");
        if (!userDataStr || !isMounted) return;
        const userData = JSON.parse(userDataStr);
        const userId = userData.id;
        if (!userId) return;

        const echo = await createEcho();
        if (!isMounted) return;
        echoInstance = echo;

        currentChannel = `khach-hang.${userId}`;
        console.log(`[Echo] Subscribing to ${currentChannel}`);
        
        echo.private(currentChannel)
          .notification(async (notification: any) => {
            if (!isMounted) return;
            console.log("[Echo] Received customer notification:", notification);
            
            const title = notification.title || "Thông báo mới";
            const description = notification.message || notification.description || "";
            const rawType = notification.loai || notification.type || "system";
            
            let type: any = "system";
            const lowType = String(rawType).toLowerCase();
            if (lowType === "promotion" || lowType === "sale" || lowType === "khuyen_mai") type = "promotion";
            else if (lowType === "order" || lowType === "order_cancelled" || lowType === "refund_success") type = "order";
            else if (lowType === "chat") type = "chat";

            if (type === "chat") notify.chat(title, description);
            else if (type === "promotion") notify.promotion(title, description);
            else if (type === "order") notify.order(title, description);
            else notify.system(title, description);
            
            await saveNotification({
              type: (type === "chat" ? "order" : type) as any,
              title: title,
              description: description,
              icon: type === "promotion" ? "gift" : type === "chat" ? "chatbubbles" : type === "order" ? "bag-handle" : "settings",
              badgeLabel: type === "promotion" ? "Khuyến mãi" : type === "chat" ? "Tin nhắn" : type === "order" ? "Đơn hàng" : "Hệ thống",
            });
          });
      } catch (err) {
        console.log("[Echo] Customer Echo error:", err);
      }
    };

    setupEcho();
    return () => {
      isMounted = false;
      if (echoInstance && currentChannel) {
        echoInstance.leave(currentChannel);
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
        const res = await apiClient.get("/khach-hang/don-hang/data");
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
      <Tab.Screen name="Orders" component={Orders} options={{ title: "Đơn Hàng" }} />
      <Tab.Screen name="ChatBot" component={ChatBot} options={{ title: "ChatBot" }} />
      <Tab.Screen name="Wishlist" component={Favorites} options={{ title: "Yêu thích" }} />
      <Tab.Screen name="Profile" component={Profile} options={{ title: "Tôi" }} />
    </Tab.Navigator>
  );
}

// Navigator cho shipper - 3 mục
function ShipperTabs() {
  // ── Lắng nghe thông báo Real-time qua Echo ──
  useEffect(() => {
    let echoInstance: any = null;
    let isMounted = true;
    let currentChannel: string | null = null;

    const setupEcho = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem("userData");
        if (!userDataStr || !isMounted) return;
        const userData = JSON.parse(userDataStr);
        const userId = userData.id;
        if (!userId) return;

        const echo = await createEcho();
        if (!isMounted) return;
        echoInstance = echo;

        currentChannel = `shipper.${userId}`;
        console.log(`[Echo] Subscribing to ${currentChannel}`);
        
        echo.private(currentChannel)
          .notification(async (notification: any) => {
            if (!isMounted) return;
            console.log("[Echo] Received shipper notification:", notification);
            
            const title = notification.title || "Thông báo mới";
            const description = notification.message || notification.description || "";
            const rawType = notification.loai || notification.type || "system";
            
            let type: any = "system";
            const lowType = String(rawType).toLowerCase();
            if (lowType === "chat") type = "chat";
            else if (lowType === "order") type = "order";

            if (type === "chat") notify.chat(title, description);
            else if (type === "order") notify.order(title, description);
            else notify.system(title, description);
            
            await saveNotification({
              type: (type === "chat" ? "order" : type) as any,
              title: title,
              description: description,
              icon: type === "chat" ? "chatbubbles" : type === "order" ? "cube" : "settings",
              badgeLabel: type === "chat" ? "Tin nhắn" : type === "order" ? "Đơn hàng" : "Hệ thống",
            });
          });
      } catch (err) {
        console.log("[Echo] Shipper Echo error:", err);
      }
    };

    setupEcho();
    return () => {
      isMounted = false;
      if (echoInstance && currentChannel) {
        echoInstance.leave(currentChannel);
      }
    };
  }, []);

  // ── Polling tin nhắn từ khách hàng (chạy ngay cả khi không mở chat) ──
  useEffect(() => {
    createNotificationChannels();
    requestNotificationPermission();

    const checkChatMessages = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const res = await apiClient.get("/shipper/don-hang/data-dang-giao");
        const activeOrders: any[] = res.data?.data ?? [];

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
    };

    checkChatMessages();
    const chatInterval = setInterval(checkChatMessages, 10000);
    return () => clearInterval(chatInterval);
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
    return null; // Hoặc hiển thị splash screen nếu cần
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
          <Stack.Screen name="FoodReview" component={FoodReview} />
          <Stack.Screen name="PayOSPayment" component={PayOSPayment} />
          <Stack.Screen name="Notification" component={Notification} />
          <Stack.Screen name="AppUpdate" component={AppUpdate} />
          <Stack.Screen name="HelpCenter" component={HelpCenter} options={{ headerShown: false }} />

          {/* Define both navigation tab roots so we can navigate manually from Login */}
          <Stack.Screen name="MainTabs" component={UserTabs} />
          <Stack.Screen name="ShipperTabs" component={ShipperTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default App;