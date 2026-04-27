import Echo from "laravel-echo";
import Pusher from "pusher-js/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Cấu hình Laravel Reverb (Production) ──────────────────────────────
const REVERB_HOST = "be.foodbee.io.vn";
const REVERB_PORT = 443;
const REVERB_APP_KEY = "2d2yukosred4fojaykyy";
const API_BASE = `https://${REVERB_HOST}`;

export const createEcho = async (): Promise<Echo> => {
  const token = await AsyncStorage.getItem("token");

  (global as any).Pusher = Pusher;

  const echo = new Echo({
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
  echo.connector.pusher.connection.bind("error", (err: any) =>
    console.log("[Echo] ❌ WebSocket error", JSON.stringify(err))
  );
  echo.connector.pusher.connection.bind("disconnected", () =>
    console.log("[Echo] ⚠️ WebSocket disconnected")
  );

  return echo;
};
