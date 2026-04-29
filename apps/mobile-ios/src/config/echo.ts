import Echo from "laravel-echo";
import Pusher from "pusher-js/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

// ── Cấu hình Laravel Reverb (Production) ──────────────────────────────
const REVERB_HOST = "be.foodbee.io.vn";
const REVERB_PORT = 443;
const REVERB_APP_KEY = "2d2yukosred4fojaykyy";
const API_BASE = `https://${REVERB_HOST}`;

export const createEcho = async (): Promise<Echo> => {
  const token = await AsyncStorage.getItem("token");

  (global as any).Pusher = Pusher;

  // Xử lý lỗi Object cannot be used as a constructor do sai lệch export default
  const EchoClass = (Echo as any).default || Echo;

  const echo = new EchoClass({
    broadcaster: "reverb",
    key: REVERB_APP_KEY,
    wsHost: REVERB_HOST,
    wsPort: REVERB_PORT,
    forceTLS: true, // Chuyển sang true vì dùng HTTPS
    wssPort: REVERB_PORT,
    enabledTransports: ["ws", "wss"],
    authEndpoint: `${API_BASE}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  });

  // Debug kết nối WebSocket
  echo.connector.pusher.connection.bind("connected", () =>
    console.log("[Echo] ✅ WebSocket connected")
  );
  echo.connector.pusher.connection.bind("error", (err: any) => {
    console.log("[Echo] ❌ WebSocket error", JSON.stringify(err));
    Alert.alert("Lỗi WebSocket", "Lỗi kết nối: " + JSON.stringify(err));
  });
  echo.connector.pusher.connection.bind("disconnected", () =>
    console.log("[Echo] ⚠️ WebSocket disconnected")
  );

  echo.connector.pusher.bind_global((eventName: string, data: any) => {
    console.log(`[Pusher Global Debug] ${eventName}`, data);
    
    // Alert if subscription fails
    if (eventName === "pusher:subscription_error") {
      Alert.alert("Lỗi Subscribe Kênh", `Không thể join kênh.\nChi tiết: ${JSON.stringify(data)}`);
    }
    // Ignore other internal pusher events for the general alert
    else if (!eventName.startsWith("pusher:")) {
      Alert.alert("Global Event", `Sự kiện: ${eventName}\nData: ${JSON.stringify(data)}`);
    }
  });

  return echo;
};
