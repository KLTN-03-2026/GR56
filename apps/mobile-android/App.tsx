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
import ShipperSupport from "./src/pages/Shipper/ShipperSupport";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AnimatIcon({ name_icon, focused, color, size }: { name_icon: string; focused: boolean; color: string; size: number }) {
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
      } catch {}
    };

    checkOrders();
    const interval = setInterval(checkOrders, 30000);
    return () => clearInterval(interval);
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
        const res = await apiClient.get("/khach-hang/chat/tin-nhan-moi");
        if (!res.data?.status) return;

        const messages: Array<{ id: number; id_don_hang: number; noi_dung: string; ten_shipper?: string }>
          = res.data.data ?? [];

        if (messages.length === 0) return;

        // Đọc cache id tin nhắn cuối đã thông báo
        const cacheStr = await AsyncStorage.getItem("chat_last_notified_id");
        const lastNotifiedId = cacheStr ? Number(cacheStr) : 0;

        const newMsgs = messages.filter(m => m.id > lastNotifiedId);
        if (newMsgs.length === 0) return;

        const latest = newMsgs[newMsgs.length - 1];
        const shipperName = latest.ten_shipper || "Shipper";

        notify.chat(
          `💬 Bạn có tin nhắn từ ${shipperName}`,
          latest.noi_dung
        );
        saveNotification({
          type: "chat",
          title: `Tin nhắn từ ${shipperName}`,
          description: latest.noi_dung,
          icon: "chatbubble-ellipses",
          badgeLabel: "Tin nhắn",
          id_don_hang: latest.id_don_hang,
          sender_name: shipperName,
        });

        await AsyncStorage.setItem("chat_last_notified_id", String(latest.id));
      } catch {}
    };

    checkChatMessages();
    const chatInterval = setInterval(checkChatMessages, 10000);
    return () => clearInterval(chatInterval);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let name_icon = "";

          if (route.name === "Home") name_icon = focused ? "home" : "home-outline";
          else if (route.name === "Orders") name_icon = focused ? "clipboard-sharp" : "clipboard-outline";
          else if (route.name === "ChatBot") name_icon = focused ? "chatbubbles-sharp" : "chatbubbles-outline";
          else if (route.name === "Wishlist") name_icon = focused ? "heart" : "heart-outline";
          else if (route.name === "Profile") name_icon = focused ? "person-circle-sharp" : "person-circle-outline";

          return (
            <AnimatIcon
              name_icon={name_icon}
              focused={focused}
              color={color}
              size={size}
            />
          );
        },
        tabBarActiveTintColor: "black",
        tabBarInactiveTintColor: "gray",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "bold",
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
  // ── Polling tin nhắn từ khách hàng (chạy ngay cả khi không mở chat) ──
  useEffect(() => {
    createNotificationChannels();
    requestNotificationPermission();

    const checkChatMessages = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const res = await apiClient.get("/shipper/chat/tin-nhan-moi");
        if (!res.data?.status) return;

        const messages: Array<{ id: number; id_don_hang: number; noi_dung: string; ten_khach?: string }>
          = res.data.data ?? [];

        if (messages.length === 0) return;

        const cacheStr = await AsyncStorage.getItem("shipper_chat_last_notified_id");
        const lastNotifiedId = cacheStr ? Number(cacheStr) : 0;

        const newMsgs = messages.filter(m => m.id > lastNotifiedId);
        if (newMsgs.length === 0) return;

        const latest = newMsgs[newMsgs.length - 1];
        const customerName = latest.ten_khach || "Khách hàng";

        notify.chat(
          `💬 Tin nhắn từ ${customerName}`,
          latest.noi_dung
        );
        saveNotification({
          type: "chat",
          title: `Tin nhắn từ ${customerName}`,
          description: latest.noi_dung,
          icon: "chatbubble-ellipses",
          badgeLabel: "Tin nhắn",
          id_don_hang: latest.id_don_hang,
          sender_name: customerName,
        });

        await AsyncStorage.setItem("shipper_chat_last_notified_id", String(latest.id));
      } catch {}
    };

    checkChatMessages();
    const chatInterval = setInterval(checkChatMessages, 10000);
    return () => clearInterval(chatInterval);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let name_icon = "";

          if (route.name === "Orders") name_icon = focused ? "bag-handle" : "bag-handle-outline";
          else if (route.name === "Earnings") name_icon = focused ? "wallet" : "wallet-outline";
          else if (route.name === "Profile") name_icon = focused ? "person-circle-sharp" : "people-outline";

          return (
            <AnimatIcon
              name_icon={name_icon}
              focused={focused}
              color={color}
              size={size}
            />
          );
        },
        tabBarActiveTintColor: "black",
        tabBarInactiveTintColor: "gray",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "bold",
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
          <Stack.Screen name="ShipperSupport" component={ShipperSupport} />
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