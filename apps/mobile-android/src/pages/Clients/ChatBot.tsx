import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { API_CHATBOT_URL } from "../../genaral/api";

// ════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════
const CHAT_HISTORY_KEY = "@chatbot_history";
const SESSION_TOKEN_KEY = "@chatbot_session_token";

const formatMessageText = (text: string | undefined) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|<strong>.*?<\/strong>|<em>.*?<\/em>|<br\/>|<br>)/g);
  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={index} style={{ fontWeight: 'bold' }}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <Text key={index} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
    }
    if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
      return <Text key={index} style={{ fontWeight: 'bold' }}>{part.slice(8, -9)}</Text>;
    }
    if (part.startsWith('<em>') && part.endsWith('</em>')) {
      return <Text key={index} style={{ fontStyle: 'italic' }}>{part.slice(4, -5)}</Text>;
    }
    if (part === '<br/>' || part === '<br>') {
      return <Text key={index}>{"\n"}</Text>;
    }
    return <Text key={index}>{part}</Text>;
  });
};

const COLORS = {
  PRIMARY: "#EE4D2D",
  SECONDARY: "#f5f5f5",
  TEXT_DARK: "#333333",
  TEXT_LIGHT: "#999999",
  USER_MESSAGE: "#EE4D2D",
  BOT_MESSAGE: "#f5f5f5",
  BORDER: "#e0e0e0",
  SUCCESS: "#10b981",
  WARNING: "#f59e0b",
};

interface PaymentInfo {
  ma_don_hang: string;
  tong_tien: number | string;
  qr_code?: string;
  checkout_url?: string;
  message?: string;
}

interface RestaurantItem {
  id: number;
  name: string;
  image: string;
  address: string;
  rating?: number;
  so_mon?: number;
  min_price?: number;
  max_price?: number;
  open_time?: string;
  close_time?: string;
}

interface FoodItem {
  id: number;
  id_quan_an: number;
  title: string;
  description: string;
  price: number;
  sale_price?: number;
  original_price?: number;
  discount_percent?: number;
  is_on_sale: boolean;
  hinh_anh: string;
  restaurant: string;
  address: string;
  category: string;
  slug: string;
  rating?: number;
  so_danh_gia?: number;
}

interface Message {
  id: string;
  type: "user" | "bot";
  text?: string;
  quickReplies?: string[];
  foods?: FoodItem[];
  restaurants?: RestaurantItem[];
  payment?: PaymentInfo;
  time: string;
}

interface ChatBotProps {
  navigation: any;
}

const INITIAL_MESSAGE: Message = {
  id: "1",
  type: "bot",
  text: "Xin chào! 👋 Tôi là FoodBee Bot, sẵn sàng giúp bạn. Bạn cần hỗ trợ gì?",
  quickReplies: [
    "Làm cách nào để đặt hàng?",
    "Về chính sách giao hàng",
    "Mã giảm giá",
    "Liên hệ hỗ trợ",
  ],
  time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
};

// ════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════
const ChatBot: React.FC<ChatBotProps> = ({ navigation }) => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) {
      const animateDot = (dot: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true, delay }),
            Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.delay(600)
          ])
        ).start();
      };
      animateDot(dot1, 0);
      animateDot(dot2, 150);
      animateDot(dot3, 300);
    } else {
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    }
  }, [isLoading]);

  // Load lịch sử khi mở màn hình
  useEffect(() => {
    AsyncStorage.getItem(CHAT_HISTORY_KEY).then((raw) => {
      if (raw) {
        try {
          const saved: Message[] = JSON.parse(raw);
          if (saved.length > 0) setMessages(saved);
        } catch (_) { }
      }
    });
    AsyncStorage.getItem(SESSION_TOKEN_KEY).then(async (token) => {
      if (token) {
        setSessionToken(token);
        // Start BE session using stored token (resume) or create new
        try {
          const apiBase = "https://be.foodbee.io.vn";
          const rawUser = await AsyncStorage.getItem('userData');
          const khId = rawUser ? (() => { try { const p = JSON.parse(rawUser); return p?.id ?? null; } catch { return null; } })() : null;
          const res = await fetch(`${apiBase}/api/chatbot/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ id_khach_hang: khId, session_token: token }),
          });
          const data = await res.json();
          if (data?.status && data?.session_id) {
            // Save BE session_id for later use
            await AsyncStorage.setItem('@chatbot_be_session_id', String(data.session_id));
          }
        } catch (_) { }
      } else {
        // No token → create new BE session
        try {
          const apiBase = "https://be.foodbee.io.vn";
          const rawUser = await AsyncStorage.getItem('userData');
          const khId = rawUser ? (() => { try { const p = JSON.parse(rawUser); return p?.id ?? null; } catch { return null; } })() : null;
          const res = await fetch(`${apiBase}/api/chatbot/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ id_khach_hang: khId }),
          });
          const data = await res.json();
          if (data?.status && data?.session_token) {
            const newToken = data.session_token;
            setSessionToken(newToken);
            await AsyncStorage.setItem(SESSION_TOKEN_KEY, newToken);
            await AsyncStorage.setItem('@chatbot_be_session_id', String(data.session_id ?? ''));
          }
        } catch (_) { }
      }
    });
  }, []);

  // Lưu lịch sử mỗi khi messages thay đổi
  useEffect(() => {
    AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages)).catch(() => { });
  }, [messages]);

  const scrollToBottom = (animated = true) => {
    scrollViewRef.current?.scrollToEnd({ animated });
  };

  const handleSendMessage = async (text: string = inputText) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: text.trim(),
      time: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    // Thử các endpoint phổ biến theo thứ tự
    const CANDIDATE_ENDPOINTS = [
      "/chat",
      "/api/chat",
      "/api/chatbot",
      "/api/message",
      "/message",
      "/ask",
      "/predict",
      "/query",
      "/webhook",
    ];

    try {
      // Lần đầu: log root để xem server trả gì
      try {
        const rootRes = await fetch(`${API_CHATBOT_URL}/`, { method: "GET" });
        const rootText = await rootRes.text();
        console.log("🔍 [ChatBot] ROOT (GET /) STATUS →", rootRes.status);
        console.log("🔍 [ChatBot] ROOT (GET /) BODY →", rootText.substring(0, 500));
      } catch (rootErr) {
        console.log("🔍 [ChatBot] ROOT fetch failed:", rootErr);
      }

      // Chuẩn bị thông tin khách hàng và lịch sử
      const rawUserData = await AsyncStorage.getItem('userData');
      let user_context = { is_logged_in: false, khach_hang_id: null };
      if (rawUserData) {
        try {
          const parsed = JSON.parse(rawUserData);
          if (parsed && parsed.id) {
            user_context = { is_logged_in: true, khach_hang_id: parsed.id };
          }
        } catch (e) { }
      }

      // Lấy lịch sử (giới hạn 10 tin nhắn gần nhất)
      const history = messages.slice(-10).map((m) => ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.text || ""
      }));

      const requestBody = {
        message: text.trim(),
        history: history,
        user_context: user_context,
        session_token: sessionToken || null,
      };
      let response: Response | null = null;
      let usedEndpoint = "";

      // Thử từng endpoint, dừng khi được 2xx hoặc không phải 404
      for (const ep of CANDIDATE_ENDPOINTS) {
        console.log(`📤 [ChatBot] THỬ ENDPOINT → ${API_CHATBOT_URL}${ep}`);
        const res = await fetch(`${API_CHATBOT_URL}${ep}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(requestBody),
        });
        console.log(`📥 [ChatBot] ${ep} → STATUS ${res.status}`);
        if (res.status !== 404) {
          response = res;
          usedEndpoint = ep;
          console.log(`✅ [ChatBot] ENDPOINT HỢP LỆ → ${ep}`);
          break;
        }
      }

      if (!response) {
        console.error("❌ [ChatBot] Tất cả endpoint đều 404. Kiểm tra lại Python server.");
        throw new Error("Không tìm thấy endpoint hợp lệ trên server.");
      }

      console.log("📥 [ChatBot] USED ENDPOINT →", usedEndpoint);
      console.log("📥 [ChatBot] STATUS →", response.status, response.statusText);
      console.log("📥 [ChatBot] HEADERS →", JSON.stringify(Object.fromEntries(response.headers.entries())));

      const rawText = await response.text();
      console.log("📥 [ChatBot] RAW RESPONSE →", rawText);

      let data: any = null;
      try {
        data = JSON.parse(rawText);
        console.log("📥 [ChatBot] PARSED JSON →", JSON.stringify(data, null, 2));
        if (data?.session_token && data.session_token !== sessionToken) {
          setSessionToken(data.session_token);
          AsyncStorage.setItem(SESSION_TOKEN_KEY, data.session_token).catch(() => { });
        }
      } catch (parseErr) {
        console.warn("⚠️ [ChatBot] Response không phải JSON:", rawText);
      }

      // Thử lấy text từ các key phổ biến của Python chatbot
      let botText =
        data?.response ??
        data?.reply ??
        data?.message ??
        data?.answer ??
        data?.text ??
        (typeof data === "string" ? data : null) ??
        rawText;

      // ── Extract foods ──────────────────────────────────────────
      let foods: FoodItem[] | undefined;
      if (data?.foods && Array.isArray(data.foods) && data.foods.length > 0) {
        foods = data.foods.map((f: any) => ({
          id: f.id,
          id_quan_an: f.id_quan_an,
          title: f.title || f.ten_mon_an || '',
          description: f.description || f.mo_ta || '',
          price: f.price || f.gia_ban || 0,
          sale_price: f.sale_price || f.gia_khuyen_mai || undefined,
          original_price: f.original_price || f.gia_ban || undefined,
          discount_percent: f.discount_percent ||
            (f.sale_price && f.price ? Math.round((1 - f.sale_price / f.price) * 100) : undefined),
          is_on_sale: !!(f.sale_price && f.sale_price < f.price),
          hinh_anh: f.hinh_anh || f.image || '',
          restaurant: f.restaurant || f.ten_quan_an || '',
          address: f.address || f.dia_chi || '',
          category: f.category || f.ten_danh_muc || '',
          slug: f.slug || '',
          rating: f.rating || 0,
          so_danh_gia: f.so_danh_gia || 0,
        }));
      }

      // ── Extract restaurants ───────────────────────────────────
      let restaurants: RestaurantItem[] | undefined;
      if (data?.restaurants && Array.isArray(data.restaurants) && data.restaurants.length > 0) {
        restaurants = data.restaurants.map((r: any) => ({
          id: r.id || r.id_quan_an || 0,
          name: r.name || r.ten_quan_an || '',
          image: r.image || r.hinh_anh || '',
          address: r.address || r.dia_chi || '',
          rating: r.rating || 0,
          so_mon: r.so_mon || 0,
          min_price: r.min_price || 0,
          max_price: r.max_price || 0,
          open_time: r.open_time || '',
          close_time: r.close_time || '',
        }));
      }

      // ── Extract payment ──────────────────────────────────────
      let payment: PaymentInfo | undefined = undefined;
      if (typeof botText === "string") {
        const paymentIdx = botText.indexOf('__PAYMENT__');
        if (paymentIdx !== -1) {
          try {
            const paymentJson = botText.substring(paymentIdx + '__PAYMENT__'.length);
            payment = JSON.parse(paymentJson);
            botText = botText.substring(0, paymentIdx);
          } catch (e) {
            console.error("Lỗi parse payment JSON:", e);
          }
        }
      }

      // ── Quick replies + options ───────────────────────────────
      let quickReplies: string[] | undefined =
        data?.quick_replies ?? data?.suggestions ?? data?.options ?? undefined;

      if (data?.options_step === 'select_size' && data?.size_options) {
        quickReplies = data.size_options.map((s: any, i: number) => String(i + 1));
      } else if (data?.options_step === 'select_topping' && data?.topping_options) {
        quickReplies = data.topping_options.map((t: any, i: number) => String(i + 1));
        quickReplies.push("Xong");
      }

      if (data?.buttons && Array.isArray(data.buttons)) {
        const btnTexts = data.buttons.map((b: any) => b.message || b.text);
        quickReplies = quickReplies ? [...quickReplies, ...btnTexts] : btnTexts;
      }

      // ── Send user message to BE for analytics ────────────────
      try {
        const beSessionId = await AsyncStorage.getItem('@chatbot_be_session_id');
        if (beSessionId && beSessionId !== 'null' && beSessionId !== '') {
          const apiBase = "https://be.foodbee.io.vn";
          await fetch(`${apiBase}/api/chatbot/session/${beSessionId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              role: 'user',
              content: text.trim(),
              meta: { intent: 'unknown', response_type: 'text' },
            }),
          }).catch(() => { });
        }
      } catch (_) { }

      // ── Send bot response to BE for analytics ────────────────
      try {
        const beSessionId = await AsyncStorage.getItem('@chatbot_be_session_id');
        if (beSessionId && beSessionId !== 'null' && beSessionId !== '') {
          const apiBase = "https://be.foodbee.io.vn";
          let intent = 'unknown';
          let responseType = 'text';
          if (foods && foods.length > 0) { intent = 'search_food'; responseType = 'recommendation'; }
          else if (restaurants && restaurants.length > 0) { intent = 'search_restaurant'; responseType = 'recommendation'; }
          else if (payment) { intent = 'order_placed'; responseType = 'order'; }
          else if (data?.buttons && data.buttons.length > 0) { intent = 'confirm_action'; responseType = 'text'; }

          await fetch(`${apiBase}/api/chatbot/session/${beSessionId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              role: 'assistant',
              content: typeof botText === 'string' ? botText.substring(0, 255) : String(botText ?? '').substring(0, 255),
              meta: { intent, response_type: responseType, entities: {} },
            }),
          }).catch(() => { });
        }
      } catch (_) { }

      console.log("✅ [ChatBot] BOT TEXT →", botText);
      console.log("✅ [ChatBot] FOODS →", JSON.stringify(foods ?? []));

      // ── Compose bot message ────────────────────────────────
      const botMessage: Message = {
        id: Date.now().toString(),
        type: "bot",
        text: (foods || restaurants || payment) ? (botText !== rawText ? String(botText) : undefined) : String(botText),
        quickReplies,
        foods,
        restaurants,
        payment,
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      console.log("✅ [ChatBot] BOT MESSAGE →", { hasFoods: !!foods, foodsCount: foods?.length });
      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.error("❌ [ChatBot] ERROR →", error?.message ?? error);
      const errMessage: Message = {
        id: Date.now().toString(),
        type: "bot",
        text: "Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau! 🔌",
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  const renderMessage = (item: Message) => {
    const isUser = item.type === "user";

    return (
      <View
        key={item.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.botMessageContainer,
        ]}
      >
        {!isUser && (
          <View style={[styles.botAvatar, { backgroundColor: "transparent" }]}>
            <Image source={require("../../assets/images/logoFood.png")} style={{ width: 28, height: 28, borderRadius: 14 }} />
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.botBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.botText,
            ]}
          >
            {isUser ? item.text : formatMessageText(item.text)}
          </Text>
          <Text style={styles.messageTime}>{item.time}</Text>
        </View>

        {isUser && (
          <View style={styles.userAvatar}>
            <Ionicons name="person-circle" size={24} color={COLORS.PRIMARY} />
          </View>
        )}
      </View>
    );
  };

  const renderFoodCards = (message: Message) => {
    if (!message.foods || message.foods.length === 0 || message.type === "user") return null;
    return (
      <View style={styles.foodCardsContainer}>
        <Text style={styles.foodCardsTitle}>🍜 Gợi ý cho bạn</Text>
        <ScrollView
          key={`foods-${message.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.foodScrollView}
          contentContainerStyle={styles.foodScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {message.foods.map((food) => (
            <TouchableOpacity
              key={food.id}
              style={styles.foodCard}
              activeOpacity={0.85}
              onPress={() =>
                handleSendMessage(`tôi muốn đặt món: ${food.title}`)
              }
            >
              <Image
                source={{ uri: food.hinh_anh }}
                style={styles.foodImage}
                resizeMode="cover"
              />
              {food.is_on_sale && food.discount_percent != null && (
                <View style={styles.foodBadge}>
                  <Text style={styles.foodBadgeText}>
                    -{Math.round(food.discount_percent)}%
                  </Text>
                </View>
              )}
              <View style={styles.foodInfo}>
                <Text style={styles.foodTitle} numberOfLines={2}>{food.title}</Text>
                <Text style={styles.foodRestaurant} numberOfLines={1}>
                  🍴 {food.restaurant}
                </Text>
                {food.address ? (
                  <Text style={styles.foodAddress} numberOfLines={1}>
                    📍 {food.address}
                  </Text>
                ) : null}
                <View style={styles.foodPriceRow}>
                  {food.is_on_sale && food.sale_price != null ? (
                    <>
                      <Text style={styles.foodSalePrice}>
                        {food.sale_price.toLocaleString("vi-VN")}đ
                      </Text>
                      <Text style={styles.foodOriginalPrice}>
                        {food.price.toLocaleString("vi-VN")}đ
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.foodSalePrice}>
                      {food.price.toLocaleString("vi-VN")}đ
                    </Text>
                  )}
                </View>
                {food.rating ? (
                  <View style={styles.foodRatingRow}>
                    <Text style={styles.foodRating}>⭐ {food.rating}/5</Text>
                    {food.so_danh_gia ? (
                      <Text style={styles.foodRatingCount}>({food.so_danh_gia})</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderRestaurantCards = (message: Message) => {
    if (!message.restaurants || message.restaurants.length === 0 || message.type === "user") return null;
    return (
      <View style={styles.foodCardsContainer}>
        <Text style={styles.foodCardsTitle}>🏪 Gợi ý {message.restaurants.length} quán ngon</Text>
        <ScrollView
          key={`rests-${message.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.foodScrollView}
          contentContainerStyle={styles.foodScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {message.restaurants.map((rest) => (
            <TouchableOpacity
              key={rest.id}
              style={styles.foodCard}
              activeOpacity={0.85}
              onPress={() =>
                handleSendMessage(`chọn quán: ${rest.name}`)
              }
            >
              <Image
                source={{ uri: rest.image }}
                style={styles.foodImage}
                resizeMode="cover"
              />
              <View style={styles.foodInfo}>
                <Text style={styles.foodTitle} numberOfLines={2}>{rest.name}</Text>
                {rest.address ? (
                  <Text style={styles.foodAddress} numberOfLines={1}>📍 {rest.address}</Text>
                ) : null}
                {rest.rating || rest.so_mon ? (
                  <View style={styles.foodRatingRow}>
                    {rest.rating ? <Text style={styles.foodRating}>⭐ {rest.rating}/5</Text> : null}
                    {rest.so_mon ? <Text style={styles.foodRatingCount}>🍽️ {rest.so_mon} món</Text> : null}
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderPaymentCard = (message: Message) => {
    if (!message.payment || message.type === "user") return null;
    const { ma_don_hang, tong_tien, qr_code, checkout_url, message: paymentMsg } = message.payment;
    return (
      <View style={{ marginHorizontal: wp("4%"), marginVertical: hp("1%"), padding: 15, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: COLORS.BORDER, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
        <Text style={{ fontSize: 16, fontWeight: "bold", color: COLORS.TEXT_DARK, marginBottom: 5 }}>💳 Thanh toán đơn hàng</Text>
        {ma_don_hang ? <Text style={{ fontSize: 13, color: COLORS.TEXT_LIGHT, marginBottom: 2 }}>Mã ĐH: {ma_don_hang}</Text> : null}
        {tong_tien ? <Text style={{ fontSize: 18, fontWeight: "bold", color: COLORS.PRIMARY, marginBottom: 10 }}>{Number(tong_tien).toLocaleString("vi-VN")}đ</Text> : null}
        {qr_code ? (
          <Image source={{ uri: qr_code }} style={{ width: 160, height: 160, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 10 }} resizeMode="contain" />
        ) : null}
        {paymentMsg ? <Text style={{ fontSize: 12, color: COLORS.WARNING, textAlign: "center", marginBottom: 10 }}>{paymentMsg}</Text> : null}
        {checkout_url ? (
          <TouchableOpacity
            style={{ backgroundColor: COLORS.PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
            onPress={() => {
              Linking.openURL(checkout_url).catch(() => console.log("Cannot open url"));
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>Thanh toán qua PayOS</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderQuickReply = (message: Message) => {
    if (!message.quickReplies || message.type === "user") return null;

    return (
      <View key={`quick-${message.id}`} style={styles.quickRepliesContainer}>
        {message.quickReplies.map((reply, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickReplyButton}
            onPress={() => handleSendMessage(reply)}
            activeOpacity={0.7}
          >
            <Text style={styles.quickReplyText}>{reply}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.botStatusContainer}>
            <Image source={require("../../assets/images/logoFood.png")} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />
            <View style={styles.botStatusDot} />
            <Text style={styles.headerTitle}>FoodBee Bot</Text>
          </View>
          <Text style={styles.headerSubtitle}>Online - Luôn sẵn sàng</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => {
              setMessages([INITIAL_MESSAGE]);
              setSessionToken("");
              AsyncStorage.removeItem(CHAT_HISTORY_KEY);
              AsyncStorage.removeItem(SESSION_TOKEN_KEY);
            }}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="trash-outline" size={22} color={COLORS.TEXT_LIGHT} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Notification", { botChat: true })
            }
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="information-circle-outline" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollToBottom()}
          onLayout={() => scrollToBottom(false)}
        >
          {messages.map((message) => (
            <View key={message.id}>
              {renderMessage(message)}
              {renderPaymentCard(message)}
              {renderRestaurantCards(message)}
              {renderFoodCards(message)}
              {renderQuickReply(message)}
            </View>
          ))}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={[styles.botAvatar, { backgroundColor: "transparent" }]}>
                <Image source={require("../../assets/images/logoFood.png")} style={{ width: 28, height: 28, borderRadius: 14 }} />
              </View>
              <View style={styles.typingBubble}>
                <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
                <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
                <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Nhập câu hỏi của bạn..."
                placeholderTextColor={COLORS.TEXT_LIGHT}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) &&
                styles.sendButtonDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              activeOpacity={0.7}
            >
              <Ionicons
                name="send"
                size={20}
                color={!inputText.trim() || isLoading ? COLORS.TEXT_LIGHT : "#FFF"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("2%"),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },

  headerContent: {
    flex: 1,
    marginLeft: wp("3%"),
  },

  botStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  botStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.SUCCESS,
    marginRight: 6,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.TEXT_DARK,
  },

  headerSubtitle: {
    fontSize: 12,
    color: COLORS.TEXT_LIGHT,
  },

  // Messages Container
  messagesContainer: {
    flex: 1,
  },

  messagesContent: {
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("2%"),
  },

  // Message
  messageContainer: {
    marginVertical: hp("1%"),
    flexDirection: "row",
    alignItems: "flex-end",
  },

  userMessageContainer: {
    justifyContent: "flex-end",
  },

  botMessageContainer: {
    justifyContent: "flex-start",
  },

  messageBubble: {
    maxWidth: wp("75%"),
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("1.5%"),
    borderRadius: 12,
  },

  userBubble: {
    backgroundColor: COLORS.PRIMARY,
    borderBottomRightRadius: 0,
  },

  botBubble: {
    backgroundColor: COLORS.BOT_MESSAGE,
    borderBottomLeftRadius: 0,
  },

  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },

  userText: {
    color: "#FFFFFF",
  },

  botText: {
    color: COLORS.TEXT_DARK,
  },

  messageTime: {
    fontSize: 11,
    color: COLORS.TEXT_LIGHT,
    marginTop: 6,
  },

  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 8,
  },

  userAvatar: {
    marginLeft: 8,
    marginBottom: 8,
  },

  // Quick Replies
  quickRepliesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: hp("1%"),
    gap: 8,
  },

  quickReplyButton: {
    backgroundColor: COLORS.BOT_MESSAGE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("1%"),
    borderRadius: 20,
    marginBottom: 6,
  },

  quickReplyText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: "500",
  },

  // Loading
  loadingContainer: {
    marginVertical: hp("1%"),
    flexDirection: "row",
    alignItems: "flex-end",
  },

  typingBubble: {
    backgroundColor: COLORS.BOT_MESSAGE,
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("1.5%"),
    borderRadius: 12,
    borderBottomLeftRadius: 0,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    alignItems: "center",
  },

  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.TEXT_LIGHT,
  },

  // Input
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.5%"),
    backgroundColor: "#FFFFFF",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },

  // Food Cards
  foodScrollView: {
    marginLeft: 36,
    marginBottom: hp("1%"),
  },

  foodCardsContainer: {
    marginLeft: 36,
    marginBottom: hp("1%"),
  },

  foodCardsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
    marginLeft: 4,
  },

  foodScrollContent: {
    paddingRight: wp("4%"),
    gap: 10,
  },

  foodCard: {
    width: wp("44%"),
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  foodImage: {
    width: "100%",
    height: hp("13%"),
  },

  foodBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  foodBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },

  foodInfo: {
    padding: 8,
  },

  foodTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.TEXT_DARK,
    marginBottom: 3,
  },

  foodRestaurant: {
    fontSize: 11,
    color: COLORS.TEXT_LIGHT,
    marginBottom: 5,
  },

  foodPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  foodSalePrice: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.PRIMARY,
  },

  foodOriginalPrice: {
    fontSize: 11,
    color: COLORS.TEXT_LIGHT,
    textDecorationLine: "line-through",
  },

  foodAddress: {
    fontSize: 11,
    color: COLORS.TEXT_LIGHT,
    marginBottom: 4,
  },

  foodRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  foodRating: {
    fontSize: 11,
    color: COLORS.WARNING,
    fontWeight: "600",
  },

  foodRatingCount: {
    fontSize: 10,
    color: COLORS.TEXT_LIGHT,
    marginLeft: 2,
  },

  textInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 24,
    paddingHorizontal: wp("4%"),
    justifyContent: "center",
    maxHeight: 120,
  },

  textInput: {
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    paddingVertical: hp("1.2%"),
    textAlignVertical: "center",
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },

  sendButtonDisabled: {
    backgroundColor: COLORS.SECONDARY,
  },
});

export default ChatBot;
