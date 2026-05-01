import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  StatusBar,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import DeliveryMapModal from "../../components/DeliveryMapModal";
import FloatingChatBubble from "../../components/FloatingChatBubble";
import ChatWithCustomer from "./ChatWithCustomer";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { launchCamera } from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";
import apiClient from "../../genaral/api";
import { sendLocalNotification } from "../../utils/localNotification";
import { requestLocationPermission } from "../../utils/location";
import InlineDeliveryMap from "../../components/InlineDeliveryMap";

// ════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════
const PRIMARY      = "#EE4D2D";
const PRIMARY_DARK = "#C62828";
const BG           = "#F5F6F8";
const SURFACE      = "#FFFFFF";
const TEXT_DARK    = "#1E293B";
const TEXT_MUTED   = "#64748B";
const TEXT_LIGHT   = "#94A3B8";
const BORDER       = "#E2E8F0";

// ── Status config (theo tinh_trang từ server) ───────────
const STATUS_CONFIG: Record<number, { label: string; color: string; bg: string; icon: string }> = {
  0: { label: "Chờ nhận",        color: "#F59E0B", bg: "#FFFBEB", icon: "time-outline" },
  1: { label: "Đã nhận",         color: "#3B82F6", bg: "#EFF6FF", icon: "bag-check-outline" },
  2: { label: "Quán đang làm",   color: "#F97316", bg: "#FFF7ED", icon: "restaurant-outline" },
  3: { label: "Đang giao",       color: "#8B5CF6", bg: "#F5F3FF", icon: "bicycle-outline" },
  4: { label: "Đã giao",         color: "#10B981", bg: "#ECFDF5", icon: "checkmark-circle-outline" },
};

// ── Tabs ────────────────────────────────────────────────
const TABS = [
  { key: "nhan_don",  label: "Nhận đơn",  icon: "time" },
  { key: "dang_giao", label: "Đang giao", icon: "bicycle" },
  { key: "lich_su",   label: "Lịch sử",   icon: "checkmark-circle" },
] as const;

// ── Types ────────────────────────────────────────────────
interface OrderItem {
  ten_mon_an: string;
  so_luong: number;
  don_gia: number;
}

interface Order {
  id: number;
  ma_don_hang: string;
  tinh_trang: number;       // 0=chờ nhận, 1=đã nhận, 2=đang giao, 3=đã giao, 
  activeTab: "nhan_don" | "dang_giao" | "lich_su";
  is_thanh_toan: number;
  phuong_thuc_thanh_toan: number; // 1=tiền mặt, 2=chuyển khoản
  ten_quan_an: string;
  hinh_anh: string | null;
  dia_chi_quan: string;
  ten_nguoi_nhan: string;
  sdt_nguoi_nhan?: string;
  avatar: string | null;
  dia_chi_khach: string;
  ten_quan_huyen: string;
  ten_tinh_thanh: string;
  toa_do_x?: number | null;  // longitude địa chỉ khách
  toa_do_y?: number | null;  // latitude địa chỉ khách
  tong_tien: number;
  phi_ship: number;
  tien_hang?: number;
  gio_tao_don?: string;
  created_at: string;
  items?: OrderItem[];
}

// ════════════════════════════════════════════════════════
// Custom Confirm Modal
// ════════════════════════════════════════════════════════
interface ModalConfig {
  visible: boolean;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  infoOnly?: boolean;
}

const MODAL_HIDDEN: ModalConfig = {
  visible: false,
  icon: "",
  iconColor: "",
  iconBg: "",
  title: "",
  message: "",
  confirmLabel: "",
  confirmColor: "",
  onConfirm: () => {},
};

const CustomModal = ({ config, onDismiss }: { config: ModalConfig; onDismiss: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (config.visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [config.visible]);

  return (
    <Modal
      transparent
      visible={config.visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View style={[mStyles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View style={[mStyles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Icon */}
          <View style={[mStyles.iconWrap, { backgroundColor: config.iconBg }]}>
            <Ionicons name={config.icon as any} size={36} color={config.iconColor} />
          </View>

          {/* Text */}
          <Text style={mStyles.title}>{config.title}</Text>
          <Text style={mStyles.message}>{config.message}</Text>

          {/* Buttons */}
          {config.infoOnly ? (
            <TouchableOpacity
              style={[mStyles.btn, { flex: 0, width: "100%", backgroundColor: config.confirmColor }]}
              onPress={() => { config.onConfirm(); onDismiss(); }}
              activeOpacity={0.85}
            >
              <Text style={mStyles.btnText}>{config.confirmLabel}</Text>
            </TouchableOpacity>
          ) : (
            <View style={mStyles.btnRow}>
              <TouchableOpacity
                style={[mStyles.btn, mStyles.btnCancel]}
                onPress={() => { config.onCancel?.(); onDismiss(); }}
                activeOpacity={0.8}
              >
                <Text style={mStyles.btnCancelText}>{config.cancelLabel ?? "Huỷ"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mStyles.btn, { backgroundColor: config.confirmColor }]}
                onPress={() => { config.onConfirm(); onDismiss(); }}
                activeOpacity={0.85}
              >
                <Text style={mStyles.btnText}>{config.confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const mStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("8%"),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: wp("6%"),
    paddingVertical: hp("3%"),
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp("2%"),
  },
  title: {
    fontSize: wp("4.8%"),
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: hp("1%"),
    letterSpacing: 0.2,
  },
  message: {
    fontSize: wp("3.5%"),
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: hp("2.5%"),
  },
  btnRow: {
    flexDirection: "row",
    gap: wp("3%"),
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: hp("1.6%"),
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancel: {
    backgroundColor: "#F1F5F9",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: wp("3.8%"),
    fontWeight: "700",
  },
  btnCancelText: {
    color: "#64748B",
    fontSize: wp("3.8%"),
    fontWeight: "600",
  },
});

// ════════════════════════════════════════════════════════
// Countdown Timer Component (5 minutes)
// ════════════════════════════════════════════════════════
const TOTAL_SECONDS = 5 * 60; // 300 giây

const CountdownTimer = ({ onExpire }: { onExpire: () => void }) => {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  // Chạy thanh progress animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: TOTAL_SECONDS * 1000,
      useNativeDriver: false,
    }).start();
  }, []);

  // Đếm ngược mỗi giây
  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Pulse khi còn < 60s
  useEffect(() => {
    if (secondsLeft === 60) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 400, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [secondsLeft === 60]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft <= 60;
  const timerColor = isUrgent ? "#EF4444" : "#F59E0B";

  return (
    <Animated.View style={[styles.countdownWrap, { transform: [{ scale: pulseAnim }] }]}>
      {/* Label + time */}
      <View style={styles.countdownTop}>
        <Ionicons name="timer-outline" size={15} color={timerColor} />
        <Text style={[styles.countdownLabel, { color: timerColor }]}>
          {isUrgent ? "⚠️ Sắp hết thời gian!" : "Thời gian xác nhận"}
        </Text>
        <Text style={[styles.countdownValue, { color: timerColor }]}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.countdownTrack}>
        <Animated.View
          style={[
            styles.countdownFill,
            {
              backgroundColor: timerColor,
              width: progressAnim.interpolate({
                inputRange:  [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      <Text style={styles.countdownHint}>
        Không xác nhận trong {mins > 0 ? `${mins} phút ${secs}s` : `${secs}s`} → chuyển shipper khác
      </Text>
    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════
// Order Detail Modal-like Card
// ════════════════════════════════════════════════════════
const OrderDetailPanel = ({
  order,
  onClose,
  onAcceptOrder,
  onCompleteDelivery,
  navigation,
}: {
  order: Order;
  onClose: () => void;
  onAcceptOrder: (id: number) => void;
  onCompleteDelivery: (id: number) => void;
  navigation: any;
}) => {
  const cfg = STATUS_CONFIG[order.tinh_trang] ?? STATUS_CONFIG[0];
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [localItems, setLocalItems] = useState<OrderItem[]>(order.items ?? []);
  const [showMap, setShowMap] = useState(false);
  const [shipperGPS, setShipperGPS] = useState<[number, number] | null>(null);
  const insets = useSafeAreaInsets();

  // Lấy GPS thiết bị để hiển thị vị trí shipper trên map
  useEffect(() => {
    if (order.activeTab !== "dang_giao") return;
    let cancelled = false;
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted || cancelled) return;
      Geolocation.getCurrentPosition(
        (pos) => {
          if (!cancelled) setShipperGPS([pos.coords.longitude, pos.coords.latitude]);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    })();
    return () => { cancelled = true; };
  }, [order.activeTab, order.id]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 16,
      bounciness: 4,
    }).start();
    // Fetch items
    apiClient.post("/shipper/don-hang/chi-tiet-mon-an", { id: order.id })
      .then((res) => {
        const items = res.data?.data ?? [];
        if (items.length > 0) setLocalItems(items);
      })
      .catch(() => {});
  }, []);

  const formatMoney = (v: number) => v.toLocaleString("vi-VN") + "đ";
  const deliveryAddr = [order.dia_chi_khach, order.ten_quan_huyen, order.ten_tinh_thanh]
    .filter(Boolean).join(", ");
  const payLabel = order.phuong_thuc_thanh_toan === 1 ? "💵 Tiền mặt" : "💳 Chuyển khoản";

  return (
    <Animated.View style={[styles.detailPanel, { transform: [{ translateY: slideAnim }] }]}>
      {/* Panel Header */}
      <View style={styles.detailHeader}>
        <View>
          <Text style={styles.detailTitle}>#{order.ma_don_hang}</Text>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={TEXT_MUTED} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Restaurant → Customer */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Hành trình giao</Text>
          <View style={styles.addressRow}>
            <View style={[styles.addressDot, { backgroundColor: "#F59E0B" }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Lấy hàng tại quán</Text>
              <Text style={styles.addressText}>{order.ten_quan_an}</Text>
              <Text style={[styles.addressText, { fontSize: wp("3%"), color: TEXT_MUTED }]}>
                {order.dia_chi_quan}
              </Text>
            </View>
          </View>
          <View style={styles.addressDotLine} />
          <View style={styles.addressRow}>
            <View style={[styles.addressDot, { backgroundColor: PRIMARY }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Giao đến</Text>
              <Text style={styles.addressText}>{order.ten_nguoi_nhan}</Text>
              <Text style={[styles.addressText, { fontSize: wp("3%"), color: TEXT_MUTED }]}>
                {deliveryAddr}
              </Text>
            </View>
          </View>
        </View>

        {/* Recipient Detail */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Chi tiết người nhận</Text>
          <View style={styles.recipientCard}>
            <View style={styles.recipientAvatar}>
              <Text style={styles.recipientAvatarText}>
                {order.ten_nguoi_nhan?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipientName}>{order.ten_nguoi_nhan}</Text>
              {order.sdt_nguoi_nhan ? (
                <View style={styles.recipientPhoneRow}>
                  {/* @ts-ignore */}
                  <Ionicons name="call-outline" size={14} color={PRIMARY} />
                  <Text style={styles.recipientPhone}>{order.sdt_nguoi_nhan}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.recipientAddressBox}>
            {/* @ts-ignore */}
            <Ionicons name="location-outline" size={16} color={PRIMARY} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recipientAddressLabel}>Địa chỉ giao hàng</Text>
              <Text style={styles.recipientAddressText}>{deliveryAddr}</Text>
            </View>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Thanh toán</Text>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Tổng đơn hàng</Text>
            <Text style={styles.payValue}>{formatMoney(order.tong_tien)}</Text>
          </View>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Phí ship</Text>
            <Text style={styles.payValue}>{formatMoney(order.phi_ship)}</Text>
          </View>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Hình thức</Text>
            <Text style={styles.payValue}>{payLabel}</Text>
          </View>
          <View style={[styles.payRow, styles.payRowEarning]}>
            <Text style={styles.earningLabel}>Thu nhập của bạn</Text>
            <Text style={styles.earningValue}>{formatMoney(order.phi_ship)}</Text>
          </View>
        </View>

        {/* Items */}
        {localItems.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Món ăn</Text>
            {localItems.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={styles.itemQtyBadge}>
                  <Text style={styles.itemQtyText}>{item.so_luong}x</Text>
                </View>
                <Text style={styles.itemName} numberOfLines={1}>{item.ten_mon_an}</Text>
                <Text style={styles.itemPrice}>
                  {(item.don_gia * item.so_luong).toLocaleString("vi-VN")}đ
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Time */}
        <View style={[styles.detailSection, { borderBottomWidth: 0, paddingBottom: hp("1%") }]}>
          <View style={styles.timeChip}>
            <Ionicons name="time-outline" size={14} color={TEXT_MUTED} />
            <Text style={styles.timeChipText}>
              {order.gio_tao_don
                ? `Đặt lúc ${order.gio_tao_don}`
                : `Đặt: ${new Date(order.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
              }
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Nút hành động cố định dưới panel ── */}
      {order.activeTab === "nhan_don" && (
        <View style={[styles.detailActions, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: PRIMARY }]}
            onPress={() => onAcceptOrder(order.id)}
            activeOpacity={0.85}
          >
            <Ionicons name="bag-check-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Nhận đơn này</Text>
          </TouchableOpacity>
        </View>
      )}

      {order.activeTab === "dang_giao" && (
        <View style={[styles.detailActions, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
          {/* Nút xem bản đồ */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#3B82F6", marginBottom: 8 }]}
            onPress={() => setShowMap(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="map-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Xem bản đồ giao hàng</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#8B5CF6", marginBottom: 8 }]}
            onPress={() => {
              onClose();
              navigation.navigate("ChatWithCustomer", {
                id_don_hang: order.id,
                name: order.ten_nguoi_nhan,
                avatar: order.avatar,
                ma_don_hang: order.ma_don_hang,
                dia_chi: order.dia_chi_khach,
              });
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Nhắn tin với khách hàng</Text>
          </TouchableOpacity>
          {/* tinh_trang 1: Đã nhận — đi lấy hàng tại quán */}
          {order.tinh_trang === 1 && (
            <View style={[styles.actionBtn, { backgroundColor: "#F1F5F9" }]}>
              <Ionicons name="bag-check-outline" size={20} color={TEXT_MUTED} />
              <Text style={[styles.actionBtnText, { color: TEXT_MUTED }]}>
                Đang đến lấy hàng tại quán...
              </Text>
            </View>
          )}
          {/* tinh_trang 2: Quán đang làm — chờ tại quán */}
          {order.tinh_trang === 2 && (
            <View style={[styles.actionBtn, { backgroundColor: "#FFF7ED" }]}>
              <Ionicons name="restaurant-outline" size={20} color="#F97316" />
              <Text style={[styles.actionBtnText, { color: "#F97316" }]}>
                Quán đang chuẩn bị món...
              </Text>
            </View>
          )}
          {/* tinh_trang 3: Đang giao — nhấn hoàn thành khi đã giao xong */}
          {order.tinh_trang === 3 && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
              onPress={() => onCompleteDelivery(order.id)}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-done-outline" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Hoàn thành giao hàng</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Modal bản đồ fullscreen — chỉ mount khi showMap=true để tránh nested Modal phá touch */}
      {order.activeTab === "dang_giao" && showMap && (() => {
        const custCoord: [number, number] | null =
          order.toa_do_x && order.toa_do_y
            ? [Number(order.toa_do_x), Number(order.toa_do_y)]
            : null;
        const mapMode =
          order.tinh_trang === 3 ? "shipper_to_customer"
          : order.tinh_trang === 1 ? "three_point"
          : "dual_address";
        return (
          <Modal visible={true} animationType="slide" statusBarTranslucent onRequestClose={() => setShowMap(false)}>
            <View style={{ flex: 1, backgroundColor: "#1E293B" }}>
              <View style={{ backgroundColor: "#3B82F6", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: wp("4%"), paddingTop: hp("5%"), paddingBottom: hp("1.5%") }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="navigate" size={20} color="#FFF" />
                  <Text style={{ color: "#FFF", fontSize: wp("4.2%"), fontWeight: "700" }}>Bản đồ giao hàng</Text>
                </View>
                <TouchableOpacity onPress={() => setShowMap(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" }}>
                  <Ionicons name="close" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
              <InlineDeliveryMap
                mode={mapMode}
                destAddress={order.dia_chi_quan}
                destName={order.ten_quan_an}
                shipperCoord={shipperGPS}
                shipperName="Vị trí của bạn"
                secondAddress={deliveryAddr}
                secondName={order.ten_nguoi_nhan}
                secondCoord={custCoord}
                height={hp("85%")}
              />
            </View>
          </Modal>
        );
      })()}

    </Animated.View>
  );
};

// ════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════
const ShipperOrders = ({ navigation }: any) => {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders]       = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders]     = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<string>("nhan_don");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [todayEarning, setTodayEarning] = useState(0);
  const [todayDelivered, setTodayDelivered] = useState(0);
  const [modalCfg, setModalCfg] = useState<ModalConfig>(MODAL_HIDDEN);
  const dismissModal = () => setModalCfg(MODAL_HIDDEN);

  // Lưu IDs đơn "Nhận đơn" của lần fetch trước để phát hiện đơn mới
  const prevAvailableIdsRef = useRef<Set<number> | null>(null);

  // ── Chụp ảnh xác nhận giao hàng ──
  const [photoModal, setPhotoModal] = useState<{ visible: boolean; orderId: number | null }>({
    visible: false, orderId: null,
  });
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);

  const filteredOrders =
    activeTab === "nhan_don"  ? availableOrders :
    activeTab === "dang_giao" ? activeOrders :
    historyOrders;

  const countByTab = (key: string) =>
    key === "nhan_don"  ? availableOrders.length :
    key === "dang_giao" ? activeOrders.length :
    historyOrders.length;

  // Helper: địa chỉ đầy đủ
  const fullAddress = (o: any) =>
    [o.dia_chi_khach, o.ten_quan_huyen, o.ten_tinh_thanh]
      .filter(Boolean)
      .join(", ");

  useEffect(() => {
    const earned = historyOrders
      .filter((o) => o.tinh_trang === 4)
      .reduce((sum, o) => sum + (o.phi_ship ?? 0), 0);
    setTodayEarning(earned);
    setTodayDelivered(historyOrders.filter((o) => o.tinh_trang === 4).length);
  }, [historyOrders]);

  const fetchOrders = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        apiClient.get("/shipper/don-hang/data"),
        apiClient.get("/shipper/don-hang/data-dang-giao"),
      ]);

      // Tab Nhận đơn — tinh_trang=0, chưa có shipper
      if (r1.data?.list_don_hang_co_the_nhan) {
        const newOrders: Order[] = r1.data.list_don_hang_co_the_nhan.map((o: any): Order => ({
          ...o,
          tinh_trang: 0,
          activeTab: "nhan_don",
        }));

        // Phát hiện đơn mới → gửi thông báo (bỏ qua lần fetch đầu tiên)
        if (prevAvailableIdsRef.current !== null) {
          const addedOrders = newOrders.filter((o) => !prevAvailableIdsRef.current!.has(o.id));
          for (const o of addedOrders) {
            sendLocalNotification({
              title: "📦 Đơn hàng mới!",
              description: `Đơn #${o.ma_don_hang} từ ${o.ten_quan_an} — phí ship: ${o.phi_ship.toLocaleString("vi-VN")}đ`,
              type: "order",
            }).catch(() => {});
          }
        }
        prevAvailableIdsRef.current = new Set(newOrders.map((o) => o.id));

        setAvailableOrders(newOrders);
      }

      // Tab Đang giao — tinh_trang 1 hoặc 2
      if (r2.data?.data) {
        setActiveOrders(
          r2.data.data.map((o: any): Order => ({
            ...o,
            activeTab: "dang_giao",
          }))
        );
      }

      // Tab Lịch sử — tinh_trang 3 hoặc 4
      if (r2.data?.list_don_hang_hoan_thanh) {
        setHistoryOrders(
          r2.data.list_don_hang_hoan_thanh.map((o: any): Order => ({
            ...o,
            activeTab: "lich_su",
          }))
        );
      }
    } catch {
      // giữ state rỗng, user có thể kéo xuống refresh
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ── Gửi vị trí shipper lên server liên tục ──────────
  useEffect(() => {
    let watchId: number | null = null;

    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) return;

      watchId = Geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          // Tìm đơn đang giao trong cả activeOrders (tinh_trang 1,2) và historyOrders (tinh_trang 3)
          // vì server có thể phân loại tinh_trang 3 vào list khác nhau
          const deliveringOrder =
            activeOrders.find((o) => o.tinh_trang >= 1 && o.tinh_trang <= 3) ??
            historyOrders.find((o) => o.tinh_trang === 3);

          if (deliveringOrder) {
            // Gửi GPS kèm id_don_hang → backend broadcast qua WebSocket cho khách theo dõi
            apiClient.post("/shipper/cap-nhat-vi-tri", {
              lat,
              lng,
              id_don_hang: deliveringOrder.id,
            }).catch(() => {});
          }
          // Nếu không có đơn nào đang giao → không gửi GPS (tiết kiệm pin & băng thông)
        },
        () => {},
        {
          enableHighAccuracy: true,
          distanceFilter: 10, // chỉ gửi khi di chuyển >= 10m
          interval: 5000,
          fastestInterval: 3000,
        }
      );
    })();

    return () => {
      if (watchId !== null) Geolocation.clearWatch(watchId);
    };
  }, [activeOrders, historyOrders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
  };

  // Nhận đơn → POST /shipper/don-hang/nhan-don
  const handleAcceptOrder = (id: number) => {
    setModalCfg({
      visible: true,
      icon: "bag-check",
      iconColor: PRIMARY,
      iconBg: "#FFF0ED",
      title: "Nhận đơn hàng này?",
      message: "Bạn sẽ chịu trách nhiệm giao đơn hàng này. Xác nhận để tiếp tục!",
      confirmLabel: "Nhận đơn",
      confirmColor: PRIMARY,
      cancelLabel: "Thôi, để sau",
      onConfirm: async () => {
        try {
          const res = await apiClient.post("/shipper/don-hang/nhan-don", { id });
          if (res.data?.status === 1) {
            setSelectedOrder(null);
            await fetchOrders();
            setModalCfg({
              visible: true,
              icon: "checkmark-circle",
              iconColor: "#10B981",
              iconBg: "#ECFDF5",
              title: "Đã nhận đơn!",
              message: res.data.message ?? "Đơn hàng được chuyển sang mục Đang giao.",
              confirmLabel: "OK",
              confirmColor: "#10B981",
              infoOnly: true,
              onConfirm: () => setActiveTab("dang_giao"),
            });
          } else {
            const msg: string = res.data?.message ?? "";
            const isInsufficientBalance =
              res.data?.can_nop_tien === true ||
              msg.includes("số dư") ||
              msg.includes("so du") ||
              msg.includes("không đủ") ||
              msg.includes("khong du") ||
              res.data?.error_type === "insufficient_balance";
            if (isInsufficientBalance) {
              setModalCfg({
                visible: true,
                icon: "wallet-outline",
                iconColor: "#EF4444",
                iconBg: "#FEF2F2",
                title: "Số dư không đủ!",
                message: msg || "Số dư tài khoản của bạn không đủ để đặt cọc cho đơn này. Vui lòng nạp thêm để tiếp tục nhận đơn.",
                confirmLabel: "Đã hiểu",
                confirmColor: "#EF4444",
                infoOnly: true,
                onConfirm: () => {},
              });
            } else {
              setModalCfg({
                visible: true,
                icon: "warning",
                iconColor: "#F59E0B",
                iconBg: "#FFFBEB",
                title: "Không thể nhận",
                message: msg || "Đơn hàng đã có người nhận rồi.",
                confirmLabel: "Hiểu rồi",
                confirmColor: "#F59E0B",
                infoOnly: true,
                onConfirm: () => fetchOrders(),
              });
            }
          }
        } catch {
          setModalCfg({
            visible: true,
            icon: "alert-circle",
            iconColor: "#EF4444",
            iconBg: "#FEF2F2",
            title: "Lỗi kết nối",
            message: "Không thể nhận đơn lúc này. Vui lòng thử lại.",
            confirmLabel: "OK",
            confirmColor: "#EF4444",
            infoOnly: true,
            onConfirm: () => {},
          });
        }
      },
    });
  };

  // Hoàn thành giao hàng → yêu cầu chụp ảnh xác nhận trước
  const handleCompleteDelivery = (id: number) => {
    setCapturedPhoto(null);
    setPhotoModal({ visible: true, orderId: id });
  };

  const handleTakePhoto = () => {
    launchCamera(
      { mediaType: "photo", quality: 0.7, saveToPhotos: false, cameraType: "back" },
      (res) => {
        if (res.didCancel || res.errorCode) return;
        const uri = res.assets?.[0]?.uri;
        if (uri) setCapturedPhoto(uri);
      }
    );
  };

  const handleSubmitDelivery = async () => {
    if (!capturedPhoto || !photoModal.orderId) return;
    setSubmittingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("id", String(photoModal.orderId));
      formData.append("anh_giao_hang", {
        uri: capturedPhoto,
        type: "image/jpeg",
        name: `delivery_${photoModal.orderId}_${Date.now()}.jpg`,
      } as any);

      await apiClient.post("/shipper/don-hang/hoan-thanh", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPhotoModal({ visible: false, orderId: null });
      setCapturedPhoto(null);
      setSelectedOrder(null);
      await fetchOrders();
      setActiveTab("lich_su");
    } catch {
      setModalCfg({
        visible: true,
        icon: "alert-circle",
        iconColor: "#EF4444",
        iconBg: "#FEF2F2",
        title: "Lỗi",
        message: "Không thể hoàn thành đơn. Vui lòng thử lại.",
        confirmLabel: "OK",
        confirmColor: "#EF4444",
        infoOnly: true,
        onConfirm: () => {},
      });
    } finally {
      setSubmittingPhoto(false);
    }
  };

  // ── Render Tab ──────────────────────────────────────────────────
  const renderTab = (tab: typeof TABS[number]) => {
    const isActive = activeTab === tab.key;
    const tabTinh: Record<string, number> = { nhan_don: 0, dang_giao: 2, lich_su: 3 };
    const cfg = STATUS_CONFIG[tabTinh[tab.key] ?? 0];
    const count = countByTab(tab.key);
    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tab, isActive && { borderBottomColor: PRIMARY, borderBottomWidth: 2 }]}
        onPress={() => setActiveTab(tab.key)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={tab.icon as any}
          size={16}
          color={isActive ? PRIMARY : TEXT_LIGHT}
        />
        <Text style={[styles.tabText, isActive && { color: PRIMARY, fontWeight: "700" }]}>
          {tab.label}
        </Text>
        {count > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: isActive ? PRIMARY : cfg.color }]}>
            <Text style={styles.tabBadgeText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Render Order Card ────────────────────────────────────
  const renderOrderCard = ({ item }: { item: Order }) => {
    const cfg = STATUS_CONFIG[item.tinh_trang] ?? STATUS_CONFIG[0];
    const deliveryAddr = [item.dia_chi_khach, item.ten_quan_huyen]
      .filter(Boolean).join(", ");
    const timeStr = item.gio_tao_don ||
      new Date(item.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedOrder(item)}
        activeOpacity={0.88}
      >
        {/* Left accent */}
        <View style={[styles.cardAccent, { backgroundColor: cfg.color }]} />

        <View style={styles.cardBody}>
          {/* Top row */}
          <View style={styles.cardTopRow}>
            <Text style={styles.cardOrderId}>#{item.ma_don_hang}</Text>
            <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={11} color={cfg.color} />
              <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          {/* Restaurant */}
          <View style={styles.cardRow}>
            <Ionicons name="storefront-outline" size={16} color={TEXT_MUTED} />
            <Text style={styles.cardRowText} numberOfLines={1}>{item.ten_quan_an}</Text>
            <Text style={styles.cardTime}>{timeStr}</Text>
          </View>

          {/* Destination */}
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={16} color={PRIMARY} />
            <Text style={styles.cardRowText} numberOfLines={1}>
              {item.ten_nguoi_nhan} • {deliveryAddr}
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.cardEarningChip}>
              <Ionicons name="wallet-outline" size={13} color={PRIMARY} />
              <Text style={styles.cardEarningText}>+{item.phi_ship.toLocaleString("vi-VN")}đ</Text>
            </View>
            <Text style={styles.cardTotal}>{item.tong_tien.toLocaleString("vi-VN")}đ</Text>
            {item.phuong_thuc_thanh_toan === 1 ? (
              <View style={styles.cashBadge}>
                <Text style={styles.cashBadgeText}>Tiền mặt</Text>
              </View>
            ) : (
              <View style={[styles.cashBadge, { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" }]}>
                <Text style={[styles.cashBadgeText, { color: "#3B82F6" }]}>CK</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={TEXT_LIGHT} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render Empty ─────────────────────────────────────────
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="receipt-outline" size={44} color={PRIMARY} />
      </View>
      <Text style={styles.emptyTitle}>Không có đơn hàng</Text>
      <Text style={styles.emptyDesc}>
        Các đơn hàng mới sẽ xuất hiện ở đây. Kéo xuống để làm mới.
      </Text>
    </View>
  );

  // ════════════════════════════════════════════════════════
  // Main Render
  // ════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <View style={styles.headerBg}>
        <SafeAreaView edges={["top"]} style={styles.headerSafe}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerGreeting}>Đơn hàng hôm nay</Text>
              <Text style={styles.headerDate}>
                {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}
              </Text>
            </View>
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleRefresh}>
              <Ionicons name="refresh-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{todayDelivered}</Text>
              <Text style={styles.statLabel}>Đã giao</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{countByTab("dang_giao")}</Text>
              <Text style={styles.statLabel}>Đang giao</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{todayEarning.toLocaleString("vi-VN")}đ</Text>
              <Text style={styles.statLabel}>Thu nhập</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        <View style={styles.tabBarContent}>
          {TABS.map(renderTab)}
        </View>
      </View>

      {/* ── Orders List ── */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrderCard}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.listContent,
          filteredOrders.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      />

      {/* ── Order Detail Panel ── */}
      <Modal
        transparent
        visible={!!selectedOrder}
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayBackdrop}
            onPress={() => setSelectedOrder(null)}
            activeOpacity={1}
          />
          {selectedOrder && (
            <OrderDetailPanel
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              onAcceptOrder={handleAcceptOrder}
              onCompleteDelivery={handleCompleteDelivery}
              navigation={navigation}
            />
          )}
        </View>
      </Modal>

      {/* ── Custom Modal ── */}
      <CustomModal config={modalCfg} onDismiss={dismissModal} />

      {/* ── Modal chụp ảnh xác nhận giao hàng ── */}
      <Modal
        visible={photoModal.visible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => { if (!submittingPhoto) { setPhotoModal({ visible: false, orderId: null }); setCapturedPhoto(null); } }}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalBox}>
            {/* Header */}
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Xác nhận giao hàng</Text>
              <TouchableOpacity
                onPress={() => { setPhotoModal({ visible: false, orderId: null }); setCapturedPhoto(null); }}
                disabled={submittingPhoto}
              >
                <Ionicons name="close" size={24} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            <Text style={styles.photoModalDesc}>
              Chụp ảnh bàn giao hàng cho khách hoặc ảnh đặt hàng tại cửa để xác nhận giao thành công.
            </Text>

            {/* Vùng ảnh */}
            <TouchableOpacity style={styles.photoBox} onPress={handleTakePhoto} activeOpacity={0.8}>
              {capturedPhoto ? (
                <Image source={{ uri: capturedPhoto }} style={styles.photoPreview} resizeMode="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={48} color="#94A3B8" />
                  <Text style={styles.photoPlaceholderText}>Nhấn để chụp ảnh</Text>
                </View>
              )}
            </TouchableOpacity>

            {capturedPhoto && (
              <TouchableOpacity style={styles.retakeBtn} onPress={handleTakePhoto}>
                <Ionicons name="refresh-outline" size={16} color={PRIMARY} />
                <Text style={styles.retakeBtnText}>Chụp lại</Text>
              </TouchableOpacity>
            )}

            {/* Nút hoàn thành */}
            <TouchableOpacity
              style={[styles.confirmDeliveryBtn, (!capturedPhoto || submittingPhoto) && { opacity: 0.5 }]}
              onPress={handleSubmitDelivery}
              disabled={!capturedPhoto || submittingPhoto}
              activeOpacity={0.85}
            >
              {submittingPhoto ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-outline" size={20} color="#FFF" />
                  <Text style={styles.confirmDeliveryBtnText}>Hoàn tất giao hàng</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Floating Chat Bubble ── */}
      <FloatingChatBubble navigation={navigation} orders={activeOrders} />
    </View>
  );
};

// ════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header ──
  headerBg: {
    backgroundColor: PRIMARY,
  },
  headerSafe: {
    paddingTop: Platform.OS === "android" ? hp("1.5%") : 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("5%"),
    paddingTop: hp("1.5%"),
    paddingBottom: hp("1%"),
  },
  headerGreeting: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  headerDate: {
    fontSize: wp("3.2%"),
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
    textTransform: "capitalize",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: wp("5%"),
    marginBottom: hp("1.8%"),
    borderRadius: 12,
    paddingVertical: hp("1.2%"),
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: wp("3.8%"), fontWeight: "800", color: "#FFF" },
  statLabel: { fontSize: wp("2.8%"), color: "rgba(255,255,255,0.75)", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.3)" },

  // ── Tab Bar ──
  tabBar: {
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 4,
  },
  tabBarContent: {
    flexDirection: "row",
    paddingHorizontal: wp("2%"),
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("2%"),
    paddingVertical: hp("1.4%"),
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: wp("3.2%"),
    fontWeight: "600",
    color: TEXT_LIGHT,
  },
  tabBadge: {
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },

  // ── List ──
  listContent: {
    paddingHorizontal: wp("4%"),
    paddingTop: hp("1.5%"),
    paddingBottom: hp("3%"),
  },

  // ── Card ──
  card: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderRadius: 16,
    marginBottom: hp("1.2%"),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardAccent: {
    width: 4,
    borderRadius: 2,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: wp("3.5%"),
    paddingVertical: hp("1.4%"),
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp("0.8%"),
  },
  cardOrderId: {
    fontSize: wp("4%"),
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: 0.3,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: hp("0.5%"),
  },
  cardRowText: {
    flex: 1,
    fontSize: wp("3.3%"),
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  cardTime: {
    fontSize: wp("3%"),
    color: TEXT_LIGHT,
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp("0.8%"),
    gap: 8,
  },
  cardEarningChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0ED",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  cardEarningText: {
    fontSize: wp("3%"),
    color: PRIMARY,
    fontWeight: "700",
  },
  cardTotal: {
    flex: 1,
    fontSize: wp("3.5%"),
    color: TEXT_DARK,
    fontWeight: "700",
    textAlign: "right",
  },
  cashBadge: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cashBadgeText: {
    fontSize: 10,
    color: "#B45309",
    fontWeight: "700",
  },

  // ── Recipient ──
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: hp("1.2%"),
  },
  recipientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  recipientAvatarText: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "800",
  },
  recipientName: {
    fontSize: wp("4.2%"),
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 4,
  },
  recipientPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  recipientPhone: {
    fontSize: wp("3.5%"),
    color: PRIMARY,
    fontWeight: "600",
  },
  recipientAddressBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: BG,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  recipientAddressLabel: {
    fontSize: wp("2.9%"),
    color: TEXT_LIGHT,
    fontWeight: "600",
    marginBottom: 3,
  },
  recipientAddressText: {
    fontSize: wp("3.5%"),
    color: TEXT_DARK,
    lineHeight: 20,
    fontWeight: "500",
  },

  // Status pill
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Empty State ──
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp("10%"),
    paddingTop: hp("5%"),
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFF0ED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp("2%"),
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  emptyTitle: {
    fontSize: wp("4.5%"),
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: hp("1%"),
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: wp("3.3%"),
    color: TEXT_LIGHT,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Detail Panel / Overlay ──
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  detailPanel: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: hp("88%"),
    paddingHorizontal: wp("5%"),
    paddingBottom: hp("2%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: hp("2%"),
    paddingBottom: hp("1.5%"),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  detailTitle: {
    fontSize: wp("5%"),
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 6,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
  },

  // Detail sections
  detailSection: {
    paddingVertical: hp("1.5%"),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  detailSectionTitle: {
    fontSize: wp("3.2%"),
    fontWeight: "700",
    color: TEXT_LIGHT,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: hp("1%"),
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: hp("0.6%"),
  },
  detailRowText: {
    fontSize: wp("3.8%"),
    color: TEXT_DARK,
    fontWeight: "500",
  },

  // Address
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: hp("0.5%"),
  },
  addressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  addressDotLine: {
    width: 2,
    height: hp("2%"),
    backgroundColor: BORDER,
    marginLeft: 4,
    marginVertical: 2,
  },
  addressLabel: {
    fontSize: wp("2.9%"),
    color: TEXT_LIGHT,
    fontWeight: "600",
    marginBottom: 2,
  },
  addressText: {
    fontSize: wp("3.5%"),
    color: TEXT_DARK,
    fontWeight: "500",
    lineHeight: 19,
  },

  // Items
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("0.8%"),
    gap: 8,
  },
  itemQtyBadge: {
    backgroundColor: BG,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  itemQtyText: { fontSize: 11, fontWeight: "700", color: TEXT_DARK },
  itemName: { flex: 1, fontSize: wp("3.4%"), color: TEXT_DARK, fontWeight: "500" },
  itemPrice: { fontSize: wp("3.4%"), color: TEXT_MUTED, fontWeight: "600" },

  // Payment
  payRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: hp("0.6%"),
  },
  payLabel: { fontSize: wp("3.5%"), color: TEXT_MUTED },
  payValue: { fontSize: wp("3.5%"), color: TEXT_DARK, fontWeight: "600" },
  payRowEarning: {
    marginTop: hp("0.6%"),
    paddingTop: hp("0.8%"),
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  earningLabel: { fontSize: wp("3.8%"), fontWeight: "700", color: TEXT_DARK },
  earningValue: { fontSize: wp("4%"), fontWeight: "800", color: PRIMARY },

  // Note
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    padding: 10,
  },
  noteText: { flex: 1, fontSize: wp("3.3%"), color: TEXT_MUTED, lineHeight: 18 },

  // Time chips
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeChipText: { fontSize: wp("3%"), color: TEXT_MUTED, fontWeight: "500" },

  // Actions
  detailActions: {
    marginTop: hp("2%"),
    gap: hp("1%"),
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: hp("1.7%"),
    gap: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionBtnText: {
    color: "#FFF",
    fontSize: wp("4%"),
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // ── Countdown ──
  countdownWrap: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: wp("3.5%"),
    marginTop: hp("1%"),
    marginBottom: hp("0.5%"),
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  countdownTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: hp("0.8%"),
  },
  countdownLabel: {
    flex: 1,
    fontSize: wp("3.2%"),
    fontWeight: "700",
  },
  countdownValue: {
    fontSize: wp("4.5%"),
    fontWeight: "900",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  countdownTrack: {
    height: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: hp("0.6%"),
  },
  countdownFill: {
    height: "100%",
    borderRadius: 3,
  },
  countdownHint: {
    fontSize: wp("2.8%"),
    color: TEXT_MUTED,
    fontWeight: "500",
  },

  // ── Photo confirmation modal ──
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  photoModalBox: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: wp("5%"),
    paddingTop: hp("2.5%"),
    paddingBottom: hp("5%"),
  },
  photoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp("1%"),
  },
  photoModalTitle: {
    fontSize: wp("4.8%"),
    fontWeight: "800",
    color: TEXT_DARK,
  },
  photoModalDesc: {
    fontSize: wp("3.4%"),
    color: TEXT_MUTED,
    lineHeight: 20,
    marginBottom: hp("2%"),
  },
  photoBox: {
    width: "100%",
    height: hp("28%"),
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: BORDER,
    borderStyle: "dashed",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  photoPlaceholderText: {
    fontSize: wp("3.8%"),
    color: TEXT_LIGHT,
    fontWeight: "600",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: hp("1.2%"),
  },
  retakeBtnText: {
    fontSize: wp("3.5%"),
    color: PRIMARY,
    fontWeight: "600",
  },
  confirmDeliveryBtn: {
    marginTop: hp("2%"),
    backgroundColor: "#10B981",
    borderRadius: 14,
    paddingVertical: hp("1.8%"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmDeliveryBtnText: {
    color: "#FFF",
    fontSize: wp("4%"),
    fontWeight: "700",
  },
});

export default ShipperOrders;
