// Import AsyncStorage (dùng được)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PusherModule = require("pusher-js/dist/react-native/pusher.js");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const EchoModule = require("laravel-echo");
const Pusher = PusherModule.default || PusherModule;
const Echo = EchoModule.default || EchoModule;
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Cấu hình Laravel Reverb - GIỐNG HỆT IOS_FOODBEE ────────────────────────────────
// FE dùng: wsHost=be.foodbee.io.vn, wsPort=443, wssPort=443, forceTLS=true
const REVERB_APP_KEY = "2d2yukosred4fojaykyy";
const REVERB_HOST = "be.foodbee.io.vn";
const REVERB_PORT = 443;
const API_BASE = "https://be.foodbee.io.vn";

// ── Singleton Echo Instance ────────────────────────────────────────────
let echoInstance: Echo | null = null;

/**
 * Tạo mới instance Echo với token hiện tại.
 * Luôn force disconnect instance cũ trước khi tạo mới.
 * Dùng khi đăng nhập/đăng xuất hoặc đổi user.
 */
export const reconnectEcho = async (): Promise<Echo> => {
  // Disconnect instance cũ nếu có
  if (echoInstance) {
    try { echoInstance.disconnect(); } catch { }
    echoInstance = null;
    console.log('[Echo] Old instance disconnected');
  }
  return connectEcho();
};

export const connectEcho = async (): Promise<Echo> => {
  const token = await AsyncStorage.getItem("token");

  // Nếu đã có instance, cập nhật token và trả về
  if (echoInstance) {
    try {
      if (token && echoInstance.connector?.options?.auth?.headers) {
        echoInstance.connector.options.auth.headers.Authorization = `Bearer ${token}`;
      }
      // Update auth trong pusher config
      const pusher = (echoInstance.connector as any)?.pusher;
      if (pusher && token) {
        const config = pusher.config || pusher.options;
        if (config?.auth?.headers) {
          config.auth.headers.Authorization = `Bearer ${token}`;
        }
      }
      const state = pusher?.connection?.state;
      // Nếu bị disconnect → kết nối lại
      if (state && state !== "connected" && state !== "connecting") {
        console.log(`[Echo] State: ${state}, reconnecting...`);
        pusher?.connect();
      }
      console.log("[Echo] Reusing existing Echo instance, state:", state);
      return echoInstance;
    } catch (e) {
      console.log("[Echo] Error reusing, will recreate:", e);
      try { echoInstance.disconnect(); } catch { }
      echoInstance = null;
    }
  }

  // Debug: log what Echo/Pusher actually are
  console.log("[Echo] Pusher type:", typeof Pusher, Pusher && Pusher.toString().substring(0, 100));
  console.log("[Echo] Echo type:", typeof Echo, Echo && Echo.toString ? Echo.toString().substring(0, 100) : "N/A");

  // pusher-js export: module.Pusher = class, nên cần Pusher.Pusher
  let PusherClass: any = Pusher && (Pusher as any).Pusher ? (Pusher as any).Pusher : Pusher;
  if (PusherClass && typeof PusherClass === "object") {
    PusherClass = (PusherClass as any).default || PusherClass;
  }
  console.log("[Echo] PusherClass normalized type:", typeof PusherClass, PusherClass && PusherClass.prototype ? "has prototype" : "no prototype");

  // laravel-echo v2 là ESM module, có thể import như Module { default: class, ... }
  // hoặc import như class trực tiếp
  let EchoClass: any = Echo;
  if (EchoClass && typeof EchoClass === "object") {
    // Có thể là { default: EchoClass, __esModule: true }
    EchoClass = EchoClass.default || EchoClass;
  }
  if (EchoClass && typeof EchoClass === "object" && (EchoClass as any).__esModule) {
    EchoClass = (EchoClass as any).default || EchoClass;
  }

  console.log("[Echo] EchoClass after normalization:", typeof EchoClass, EchoClass && EchoClass.prototype ? "has prototype" : "no prototype");

  echoInstance = new EchoClass({
    broadcaster: "reverb",
    key: REVERB_APP_KEY,
    wsHost: REVERB_HOST,
    wsPort: REVERB_PORT,
    wssPort: REVERB_PORT,
    forceTLS: true,
    enableStats: false,
    enabledTransports: ["ws", "wss"],
    // Echo lấy Pusher từ options.Pusher, phải là class constructor thuần
    Pusher: PusherClass,
    authEndpoint: `${API_BASE}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  });

  const pusher = (echoInstance as any).connector?.pusher;
  if (pusher?.connection) {
    pusher.connection.bind("connected", () =>
      console.log("[Echo] ✅ WebSocket connected to Reverb")
    );
    pusher.connection.bind("error", (err: any) =>
      console.log("[Echo] ❌ WebSocket error", JSON.stringify(err))
    );
    pusher.connection.bind("disconnected", () =>
      console.log("[Echo] ⚠️ WebSocket disconnected")
    );
    pusher.connection.bind("state_change", (states: any) =>
      console.log(`[Echo] State: ${states.previous} → ${states.current}`)
    );
  }

  console.log("[Echo] New Echo (Reverb) instance created");
  return echoInstance;
};

export const getEcho = (): Echo | null => echoInstance;

export const disconnectEcho = () => {
  if (echoInstance) {
    try { echoInstance.disconnect(); } catch { }
    echoInstance = null;
    console.log("[Echo] Disconnected");
  }
};
