import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../../genaral/api";
import { getImageUrl } from "../../utils/imageHelper";
import { createEcho } from "../../config/echo";
import {
  createNotificationChannels,
  requestNotificationPermission,
  notify,
} from "../../utils/localNotification";
import { saveNotification } from "../../utils/notificationStore";

const { width: SCREEN_W } = Dimensions.get("window");
// Dùng màu xanh dương cho shipper → khác với cam của khách hàng
const PRIMARY = "#1A73E8";
const PRIMARY_DARK = "#1558B0";
const PRIMARY_LIGHT = "#4A90F5";

// ─── Types ────────────────────────────────────────────────

interface RawMessage {
  id: number;
  id_don_hang: number;
  id_nguoi_gui: number;
  loai_nguoi_gui: "khach_hang" | "shipper";
  noi_dung: string;
  da_doc: boolean | number;
  created_at: string;
}

interface Message {
  id: number;
  loai: "sent" | "received";
  noi_dung: string;
  created_at: string;
  da_doc: boolean | number;
}

// ─── Helpers ──────────────────────────────────────────────

const formatTime = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const formatDateSep = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  if (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
    return "Hôm nay";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth()
  )
    return "Hôm qua";
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const isSameDay = (a: string, b: string) => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getDate() === db.getDate() &&
    da.getMonth() === db.getMonth() &&
    da.getFullYear() === db.getFullYear()
  );
};

// ─── Typing Indicator ─────────────────────────────────────

const TypingIndicator = ({ avatar }: { avatar?: string }) => {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    dots.forEach((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, {
            toValue: -5,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.delay(400),
        ])
      ).start()
    );
  }, []);

  return (
    <View style={s.typingRow}>
      <Image
        source={{ uri: getImageUrl(avatar) }}
        style={s.typingAvatar}
        defaultSource={require("../../assets/images/slide1.png")}
      />
      <View style={s.typingBubble}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[s.typingDot, { transform: [{ translateY: dot }] }]}
          />
        ))}
      </View>
    </View>
  );
};

// ─── Animated Message Bubble ──────────────────────────────

const AnimatedMessage = ({
  item,
  index,
  messages,
  avatar,
}: {
  item: Message;
  index: number;
  messages: Message[];
  avatar?: string;
}) => {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 90,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isSent = item.loai === "sent";
  const prev = messages[index - 1];
  const showDate = !prev || !isSameDay(prev.created_at, item.created_at);
  const isLast = index === messages.length - 1;
  const nextMsg = messages[index + 1];
  const isLastInGroup = !nextMsg || nextMsg.loai !== item.loai;

  return (
    <>
      {showDate && (
        <View style={s.dateSep}>
          <View style={s.dateLine} />
          <View style={s.datePill}>
            <Text style={s.dateText}>{formatDateSep(item.created_at)}</Text>
          </View>
          <View style={s.dateLine} />
        </View>
      )}

      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <View style={[s.msgRow, isSent ? s.msgRowSent : s.msgRowReceived]}>
          {!isSent && (
            <View style={s.avatarSlot}>
              {isLastInGroup ? (
                <Image
                  source={{ uri: getImageUrl(avatar) }}
                  style={s.msgAvatar}
                  defaultSource={require("../../assets/images/slide1.png")}
                />
              ) : (
                <View style={s.msgAvatarGap} />
              )}
            </View>
          )}

          <View
            style={[
              s.bubbleWrapper,
              isSent
                ? { alignItems: "flex-end" }
                : { alignItems: "flex-start" },
            ]}
          >
            <View style={[s.bubble, isSent ? s.bubbleSent : s.bubbleReceived]}>
              <Text style={isSent ? s.textSent : s.textReceived}>
                {item.noi_dung}
              </Text>
            </View>

            <View
              style={[
                s.timeRow,
                isSent
                  ? { justifyContent: "flex-end" }
                  : { justifyContent: "flex-start" },
              ]}
            >
              <Text style={s.timeStamp}>{formatTime(item.created_at)}</Text>
              {isSent && isLast && (
                <Ionicons
                  name={item.da_doc ? "checkmark-done" : "checkmark"}
                  size={12}
                  color={item.da_doc ? PRIMARY : "#94A3B8"}
                  style={{ marginLeft: 3 }}
                />
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────

const ChatWithCustomer = ({ navigation, route }: any) => {
  // route.params: { id_don_hang, name, avatar, ma_don_hang?, dia_chi? }
  const {
    id_don_hang,
    name = "Khách hàng",
    avatar,
    ma_don_hang,
    dia_chi,
  } = route?.params || {};

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const loaiToiRef = useRef<string>("shipper");

  const listRef = useRef<FlatList>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIdRef = useRef(0);
  const sendScale = useRef(new Animated.Value(1)).current;
  const isFirstLoadRef = useRef(true);

  const toMessages = (raw: RawMessage[], loaiToi: string): Message[] =>
    raw.map((m) => ({
      id: m.id,
      loai: m.loai_nguoi_gui === loaiToi ? "sent" : "received",
      noi_dung: m.noi_dung,
      created_at: m.created_at,
      da_doc: m.da_doc,
    }));

  const loadMessages = useCallback(
    async () => {
      if (!id_don_hang) return;
      try {
        const res = await apiClient.get(`/shipper/chat/${id_don_hang}/tin-nhan`);
        if (res.data?.status && Array.isArray(res.data.data)) {
          const loaiToi: string = res.data.loai_toi || loaiToiRef.current;
          loaiToiRef.current = loaiToi;
          const newMsgs = toMessages(res.data.data as RawMessage[], loaiToi);
          if (newMsgs.length > 0) {
            const prevLastId = lastIdRef.current;
            // Phát hiện tin nhắn mới từ khách hàng
            if (!isFirstLoadRef.current && prevLastId > 0) {
              const newReceived = newMsgs.filter(
                (m) => m.loai === "received" && m.id > prevLastId
              );
              if (newReceived.length > 0) {
                const latest = newReceived[newReceived.length - 1];
                notify.chat(
                  `💬 Tin nhắn từ ${name}`,
                  latest.noi_dung
                );
                saveNotification({
                  type: "order",
                  title: `Tin nhắn từ ${name}`,
                  description: latest.noi_dung,
                  icon: "chatbubble-ellipses",
                  badgeLabel: "Tin nhắn",
                });
              }
            }
            isFirstLoadRef.current = false;
            lastIdRef.current = newMsgs[newMsgs.length - 1].id;
            setMessages(newMsgs);
          }
        }
      } catch {
        // retry sau 1.5s nếu lần đầu fail
        setTimeout(() => {
          apiClient.get(`/shipper/chat/${id_don_hang}/tin-nhan`)
            .then(res => {
              if (res.data?.status && Array.isArray(res.data.data)) {
                const loaiToi: string = res.data.loai_toi || loaiToiRef.current;
                loaiToiRef.current = loaiToi;
                const msgs = toMessages(res.data.data as RawMessage[], loaiToi);
                if (msgs.length > 0) {
                  isFirstLoadRef.current = false;
                  lastIdRef.current = msgs[msgs.length - 1].id;
                  setMessages(msgs);
                }
              }
            })
            .catch(() => {});
        }, 1500);
      }
    },
    [id_don_hang, name]
  );

  useEffect(() => {
    createNotificationChannels();
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    loadMessages();
    pollingRef.current = setInterval(() => loadMessages(), 5000);
    // Reload lại khi màn hình được focus (gộp vào đây để không tăng số hooks)
    const unsubFocus = navigation.addListener("focus", loadMessages);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      unsubFocus();
    };
  }, [loadMessages, navigation]);

  // WebSocket realtime
  useEffect(() => {
    if (!id_don_hang) return;
    let echoInstance: any = null;
    createEcho().then((echo) => {
      echoInstance = echo;
      echo.private(`chat.${id_don_hang}`)
        .listen(".tin-nhan.moi", () => {
          loadMessages();
        });
    }).catch(() => {});
    return () => {
      if (echoInstance) {
        // Chỉ leave channel, KHÔNG disconnect() để shipper vẫn nhận WS event
        echoInstance.leave(`chat.${id_don_hang}`);
      }
    };
  }, [id_don_hang, loadMessages]);

  const animateSend = () => {
    Animated.sequence([
      Animated.spring(sendScale, {
        toValue: 0.8,
        useNativeDriver: true,
        tension: 250,
      }),
      Animated.spring(sendScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
      }),
    ]).start();
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending || !id_don_hang) return;

    animateSend();
    const optimisticId = Date.now();
    const optimistic: Message = {
      id: optimisticId,
      loai: "sent",
      noi_dung: text,
      created_at: new Date().toISOString(),
      da_doc: false,
    };
    setInputText("");
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      const res = await apiClient.post("/shipper/chat/gui", {
        id_don_hang,
        noi_dung: text,
      });
      if (res.data?.tin_nhan?.id) {
        lastIdRef.current = res.data.tin_nhan.id;
        // Cập nhật id thật thay cho optimistic id
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId
              ? { ...m, id: res.data.tin_nhan.id }
              : m
          )
        );
      }
    } catch (err: any) {
      // Xóa optimistic message nếu gửi thất bại
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInputText(text); // Khôi phục nội dung đã gõ
      const msg =
        err?.response?.data?.message ||
        "Không thể gửi tin nhắn. Vui lòng thử lại.";
      Alert.alert("❌ Gửi thất bại", msg);
    } finally {
      setSending(false);
    }
  };

  // Quick replies phù hợp ngữ cảnh shipper → khách hàng
  const quickReplies = [
    { emoji: "🛵", label: "Đang trên đường!", text: "Tôi đang trên đường giao hàng!" },
    { emoji: "📍", label: "Gần giao rồi!", text: "Tôi đang gần đến nơi rồi ạ!" },
    { emoji: "🏠", label: "Ra lấy giúp nhé!", text: "Bạn có thể ra lấy đồ ăn giúp mình không?" },
    { emoji: "⏱️", label: "5 phút nữa!", text: "Chờ mình 5 phút nữa nhé!" },
    { emoji: "✅", label: "Đã giao xong!", text: "Mình đã giao hàng xong rồi ạ!" },
  ];

  const renderMessage = ({
    item,
    index,
  }: {
    item: Message;
    index: number;
  }) => (
    <AnimatedMessage
      item={item}
      index={index}
      messages={messages}
      avatar={avatar}
    />
  );

  return (
    <SafeAreaView style={s.safeArea} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.headerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <View style={s.avatarWrap}>
              <View style={s.avatarRing}>
                <Image
                  source={{ uri: getImageUrl(avatar) }}
                  style={s.headerAvatar}
                  defaultSource={require("../../assets/images/slide1.png")}
                />
              </View>
              <View style={s.onlineDot} />
            </View>

            <View style={s.headerMeta}>
              <Text style={s.headerName} numberOfLines={1}>
                {name}
              </Text>
              <View style={s.headerSubRow}>
                <View style={s.onlinePulse} />
                <Text style={s.headerSub}>Khách hàng · Đang hoạt động</Text>
              </View>
            </View>
          </View>

          <View style={s.headerActions}>
            <TouchableOpacity style={s.headerIconBtn} activeOpacity={0.75}>
              <Ionicons name="call-outline" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerIconBtn} activeOpacity={0.75}>
              <Ionicons name="ellipsis-vertical" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Order banner ── */}
        {ma_don_hang && (
          <View style={s.orderBanner}>
            <View style={s.orderIconCircle}>
              <Ionicons name="receipt-outline" size={17} color={PRIMARY} />
            </View>
            <View style={s.orderInfo}>
              <Text style={s.orderLabel}>Đơn hàng đang giao</Text>
              <Text style={s.orderCode}>{ma_don_hang}</Text>
            </View>
            {dia_chi ? (
              <View style={s.addressChip}>
                <Ionicons name="location-outline" size={12} color={PRIMARY} />
                <Text style={s.addressText} numberOfLines={1}>
                  {dia_chi}
                </Text>
              </View>
            ) : (
              <View style={s.bannerBadge}>
                <View style={s.badgeDot} />
                <Text style={s.bannerStatus}>Đang giao</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Messages ── */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, i) => `${item.id}_${i}`}
          renderItem={renderMessage}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          ListHeaderComponent={
            <View style={s.intro}>
              {/* Avatar ring */}
              <View style={s.introAvatarRing}>
                <Image
                  source={{ uri: getImageUrl(avatar) }}
                  style={s.introAvatar}
                  defaultSource={require("../../assets/images/slide1.png")}
                />
              </View>

              {/* Badge khách hàng */}
              <View style={s.customerBadge}>
                <Ionicons name="person-circle-outline" size={12} color={PRIMARY} />
                <Text style={s.customerBadgeText}>Khách hàng</Text>
              </View>

              <Text style={s.introName}>{name}</Text>
              <Text style={s.introRole}>Khách hàng · ShoppeFood</Text>

              {/* Order info card */}
              {ma_don_hang && (
                <View style={s.orderCard}>
                  <View style={s.orderCardRow}>
                    <Ionicons name="document-text-outline" size={15} color={PRIMARY} />
                    <Text style={s.orderCardLabel}>Mã đơn hàng</Text>
                    <Text style={s.orderCardValue}>{ma_don_hang}</Text>
                  </View>
                  {dia_chi && (
                    <View style={[s.orderCardRow, { marginTop: 6 }]}>
                      <Ionicons name="location-outline" size={15} color={PRIMARY} />
                      <Text style={s.orderCardLabel}>Địa chỉ</Text>
                      <Text style={s.orderCardValue} numberOfLines={2}>
                        {dia_chi}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={s.securityNote}>🔒 Tin nhắn được bảo mật end-to-end</Text>
            </View>
          }
          ListFooterComponent={
            isTyping ? <TypingIndicator avatar={avatar} /> : null
          }
        />

        {/* ── Quick replies ── */}
        <View style={s.quickBar}>
          <FlatList
            data={quickReplies}
            keyExtractor={(_, i) => i.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.quickList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.quickChip}
                onPress={() => setInputText(item.text)}
                activeOpacity={0.7}
              >
                <Text style={s.quickEmoji}>{item.emoji}</Text>
                <Text style={s.quickChipText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* ── Input bar ── */}
        <View style={[s.inputBar, inputFocused && s.inputBarFocused]}>
          {!inputText.trim() && (
            <>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
                <Ionicons name="add-circle" size={27} color={PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
                <Ionicons name="camera" size={22} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
                <Ionicons name="image" size={22} color="#64748B" />
              </TouchableOpacity>
            </>
          )}

          <View style={[s.inputWrap, inputFocused && s.inputWrapFocused]}>
            <TextInput
              style={s.input}
              placeholder="Nhắn tin với khách hàng..."
              placeholderTextColor="#B0BEC5"
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={s.emojiBtn} activeOpacity={0.7}>
              <Ionicons name="happy-outline" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Animated.View style={{ transform: [{ scale: sendScale }] }}>
            {inputText.trim() ? (
              <TouchableOpacity
                style={s.sendBtn}
                onPress={handleSend}
                disabled={sending}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="send"
                  size={17}
                  color="#FFF"
                  style={{ marginLeft: 2 }}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
                <Ionicons name="thumbs-up" size={26} color={PRIMARY} />
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F7FA" },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("1.3%"),
    backgroundColor: PRIMARY,
    gap: wp("2%"),
    elevation: 8,
    shadowColor: PRIMARY_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  headerBackBtn: {
    width: wp("9%"),
    height: wp("9%"),
    borderRadius: wp("4.5%"),
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2.5%"),
  },
  avatarWrap: { position: "relative" },
  avatarRing: {
    width: wp("11.5%"),
    height: wp("11.5%"),
    borderRadius: wp("5.75%"),
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.6)",
    padding: 2,
  },
  headerAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: wp("5%"),
    backgroundColor: "#C8DEFF",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: wp("3.2%"),
    height: wp("3.2%"),
    borderRadius: wp("1.6%"),
    backgroundColor: "#4ADE80",
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  headerMeta: { flex: 1 },
  headerName: {
    fontSize: wp("4.1%"),
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  headerSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  onlinePulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#4ADE80",
  },
  headerSub: {
    fontSize: wp("2.8%"),
    color: "rgba(255,255,255,0.82)",
    fontWeight: "500",
  },
  headerActions: { flexDirection: "row", gap: 6 },
  headerIconBtn: {
    width: wp("9%"),
    height: wp("9%"),
    borderRadius: wp("4.5%"),
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Order banner ──
  orderBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1%"),
    backgroundColor: "#F0F6FF",
    borderBottomWidth: 1.5,
    borderBottomColor: "#D6E8FF",
    gap: wp("3%"),
    elevation: 2,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  orderIconCircle: {
    width: wp("9.5%"),
    height: wp("9.5%"),
    borderRadius: wp("4.75%"),
    backgroundColor: "#DCF0FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#B8D9FF",
  },
  orderInfo: { flex: 1 },
  orderLabel: { fontSize: wp("2.6%"), color: "#94A3B8", fontWeight: "500" },
  orderCode: {
    fontSize: wp("3.3%"),
    color: "#1E293B",
    fontWeight: "700",
    marginTop: 1,
  },
  addressChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCF0FF",
    paddingHorizontal: wp("2%"),
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
    maxWidth: wp("28%"),
    borderWidth: 1,
    borderColor: "#B8D9FF",
  },
  addressText: {
    fontSize: wp("2.5%"),
    color: PRIMARY,
    fontWeight: "600",
    flexShrink: 1,
  },
  bannerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCF0FF",
    paddingHorizontal: wp("2.5%"),
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: "#B8D9FF",
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
  },
  bannerStatus: { fontSize: wp("2.8%"), color: PRIMARY, fontWeight: "700" },

  // ── Message list bg ──
  listContent: {
    paddingHorizontal: wp("3%"),
    paddingBottom: hp("1%"),
    backgroundColor: "#F4F7FA",
  },

  // ── Intro section ──
  intro: {
    alignItems: "center",
    paddingTop: hp("4%"),
    paddingBottom: hp("3%"),
    paddingHorizontal: wp("6%"),
  },
  introAvatarRing: {
    width: wp("26%"),
    height: wp("26%"),
    borderRadius: wp("13%"),
    borderWidth: 3.5,
    borderColor: PRIMARY,
    padding: 3,
    marginBottom: hp("1.2%"),
    elevation: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    backgroundColor: "#FFF",
  },
  introAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: wp("12%"),
    backgroundColor: "#C8DEFF",
  },
  customerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF4FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    marginBottom: hp("0.8%"),
    borderWidth: 1,
    borderColor: "#B8D9FF",
  },
  customerBadgeText: { fontSize: wp("2.7%"), color: PRIMARY, fontWeight: "700" },
  introName: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
    marginBottom: 3,
  },
  introRole: { fontSize: wp("3%"), color: "#94A3B8", fontWeight: "500" },

  // Order info card trong intro
  orderCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: wp("4%"),
    marginTop: hp("2%"),
    marginBottom: hp("1.5%"),
    elevation: 2,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#E8F0FE",
  },
  orderCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  orderCardLabel: {
    fontSize: wp("3%"),
    color: "#94A3B8",
    fontWeight: "500",
    width: wp("20%"),
  },
  orderCardValue: {
    flex: 1,
    fontSize: wp("3.1%"),
    color: "#1E293B",
    fontWeight: "700",
  },
  securityNote: { fontSize: wp("2.8%"), color: "#B0BEC5" },

  // ── Date separator ──
  dateSep: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: hp("1.5%"),
    gap: wp("2%"),
  },
  dateLine: { flex: 1, height: 1, backgroundColor: "#DDE4ED" },
  datePill: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: wp("3%"),
    paddingVertical: 4,
    borderRadius: 20,
  },
  dateText: { fontSize: wp("2.8%"), color: "#6B7280", fontWeight: "600" },

  // ── Message bubbles ──
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 3,
  },
  msgRowSent: { justifyContent: "flex-end", paddingLeft: wp("15%") },
  msgRowReceived: { justifyContent: "flex-start", paddingRight: wp("15%") },
  avatarSlot: { width: wp("9%"), marginRight: wp("1.5%") },
  msgAvatar: {
    width: wp("7.5%"),
    height: wp("7.5%"),
    borderRadius: wp("3.75%"),
    backgroundColor: "#C8DEFF",
    borderWidth: 1.5,
    borderColor: "#B8D9FF",
  },
  msgAvatarGap: { width: wp("7.5%"), height: wp("7.5%") },
  bubbleWrapper: { maxWidth: SCREEN_W * 0.68 },
  bubble: {
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.1%"),
    borderRadius: 22,
  },
  bubbleSent: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 6,
    elevation: 3,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 7,
  },
  bubbleReceived: {
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 6,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  textSent: {
    fontSize: wp("3.6%"),
    color: "#FFF",
    lineHeight: hp("2.4%"),
    fontWeight: "500",
  },
  textReceived: {
    fontSize: wp("3.6%"),
    color: "#1E293B",
    lineHeight: hp("2.4%"),
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: hp("0.5%"),
  },
  timeStamp: { fontSize: wp("2.4%"), color: "#B0BEC5" },

  // ── Typing indicator ──
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: hp("1%"),
    paddingTop: 4,
  },
  typingAvatar: {
    width: wp("7.5%"),
    height: wp("7.5%"),
    borderRadius: wp("3.75%"),
    marginRight: wp("1.5%"),
    backgroundColor: "#C8DEFF",
    borderWidth: 1.5,
    borderColor: "#B8D9FF",
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: wp("4.5%"),
    paddingVertical: hp("1.4%"),
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    gap: 5,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  typingDot: {
    width: wp("1.8%"),
    height: wp("1.8%"),
    borderRadius: wp("0.9%"),
    backgroundColor: "#CBD5E1",
  },

  // ── Quick replies ──
  quickBar: {
    backgroundColor: "#F4F7FA",
    borderTopWidth: 1,
    borderTopColor: "#EBF0F6",
  },
  quickList: {
    paddingHorizontal: wp("3%"),
    paddingTop: 7,
    paddingBottom: 6,
    gap: 7,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#B8D9FF",
    gap: 5,
    elevation: 1,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  quickEmoji: { fontSize: 14 },
  quickChipText: {
    fontSize: wp("3%"),
    color: PRIMARY,
    fontWeight: "600",
  },

  // ── Input bar ──
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp("2.5%"),
    paddingTop: hp("0.7%"),
    paddingBottom: hp("1%"),
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#EDF1F7",
    gap: wp("1.5%"),
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  inputBarFocused: {
    borderTopColor: "#B8D9FF",
  },
  iconBtn: {
    width: wp("9.5%"),
    height: wp("9.5%"),
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F7FA",
    borderRadius: 24,
    paddingHorizontal: wp("3%"),
    minHeight: hp("5.2%"),
    maxHeight: hp("12%"),
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  inputWrapFocused: {
    borderColor: "#90C2FF",
    backgroundColor: "#F5F9FF",
  },
  input: {
    flex: 1,
    fontSize: wp("3.5%"),
    color: "#1E293B",
    paddingVertical: hp("0.8%"),
    maxHeight: hp("10%"),
  },
  emojiBtn: { padding: 4 },
  sendBtn: {
    width: wp("10%"),
    height: wp("10%"),
    borderRadius: wp("5%"),
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
});

export default ChatWithCustomer;
