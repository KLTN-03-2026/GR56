import Echo from "laravel-echo";
import Pusher from "pusher-js/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Cấu hình Laravel Reverb ──────────────────────────────
const REVERB_HOST = "192.168.1.196";
const REVERB_PORT = 8080;
const REVERB_APP_KEY = "local-key-12345";
const API_BASE = `http://${REVERB_HOST}:8000`;

export const createEcho = async (): Promise<Echo> => {
  const token = await AsyncStorage.getItem("token");

  (global as any).Pusher = Pusher;

  const echo = new Echo({
    broadcaster: "reverb",
    key: REVERB_APP_KEY,
    wsHost: REVERB_HOST,
    wsPort: REVERB_PORT,
    forceTLS: false,
    enabledTransports: ["ws"],
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
