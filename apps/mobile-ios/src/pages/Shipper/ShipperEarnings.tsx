import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../../genaral/api";

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

// ════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════
type Period = "week" | "month";

interface Transaction {
  id: number;
  ma_don_hang: string;
  dia_chi: string;      // từ join dia_chis
  phi_ship: number;     // thu nhập shipper
  tinh_trang: number;   // 4=hoàn thành
  ngay_giao: string;    // DATE_FORMAT dd/MM/YYYY (có thể null)
  created_at: string;   // ngày tạo đơn
  updated_at?: string;  // ngày hoàn thành đơn (khi tinh_trang → 4)
}

interface DayData {
  label: string;
  value: number;
  isToday?: boolean;
}

// ════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════
// Helper: chuẩn hoá ngày về dd/MM/YYYY
// - ưu tiên ngay_giao (server set khi giao xong)
// - fallback updated_at (cập nhật khi tinh_trang thay đổi → lúc hoàn thành)
// - cuối cùng mới dùng created_at (ngày đặt đơn — có thể sai ngày giao)
const getTxDate = (t: Transaction): string => {
  const raw = (t.ngay_giao && t.ngay_giao.trim())
    ? t.ngay_giao.trim()
    : (t.updated_at || t.created_at);
  // YYYY-MM-DD hoặc YYYY-MM-DD HH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.substring(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return raw;
};

const toApiDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const getLast7Days = (): Date[] => {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); days.push(d);
  }
  return days;
};

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

// ════════════════════════════════════════════════════════
// Bar Chart Component
// ════════════════════════════════════════════════════════
const BarChart = ({ data }: { data: DayData[] }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barAnims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    barAnims.forEach(a => a.setValue(0));
    const animations = data.map((d, i) =>
      Animated.timing(barAnims[i], {
        toValue: d.value / maxValue,
        duration: 600 + i * 60,
        useNativeDriver: false,
      })
    );
    Animated.stagger(60, animations).start();
  }, [data]);

  return (
    <View style={chartStyles.container}>
      {data.map((d, i) => (
        <View key={i} style={chartStyles.barCol}>
          <Text style={chartStyles.barValueText}>
            {d.value >= 1000 ? Math.floor(d.value / 1000) + "k" : d.value || ""}
          </Text>
          <View style={chartStyles.barTrack}>
            <Animated.View
              style={[
                chartStyles.bar,
                {
                  height: barAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: d.isToday ? PRIMARY : "rgba(238,77,45,0.35)",
                },
              ]}
            />
          </View>
          <Text style={[chartStyles.barLabel, d.isToday && { color: PRIMARY, fontWeight: "700" }]}>
            {d.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: wp("2%"),
    paddingTop: hp("1%"),
    height: hp("15%"),
  },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  barValueText: { fontSize: 9, color: TEXT_MUTED, fontWeight: "600", marginBottom: 3 },
  barTrack: {
    width: wp("5%"),
    height: hp("10%"),
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: { width: "100%", borderRadius: 6 },
  barLabel: { marginTop: 5, fontSize: 11, color: TEXT_LIGHT, fontWeight: "600" },
});

// ════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════
const ShipperEarnings = ({ navigation }: any) => {
  const [period, setPeriod]           = useState<Period>("week");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading]     = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const PERIODS: { key: Period; label: string }[] = [
    { key: "week",  label: "Tuần này" },
    { key: "month", label: "Tháng này" },
  ];

  const getDateRange = (p: Period) => {
    const today = new Date();
    if (p === "week") {
      const begin = new Date(today); begin.setDate(today.getDate() - 6);
      return { begin, end: today };
    }
    return { begin: new Date(today.getFullYear(), today.getMonth(), 1), end: today };
  };

  const fetchData = useCallback(async (p: Period = "week") => {
    try {
      const range = getDateRange(p);
      const res = await apiClient.post("/shipper/don-hang/thong-ke", {
        day_begin: toApiDate(range.begin),
        day_end:   toApiDate(range.end),
      });
      if (res.data?.data) setTransactions(res.data.data);
    } catch {}
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchData(period); }, []);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    setIsLoading(true);
    fetchData(p);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(period);
    setIsRefreshing(false);
  };

  // ── Computed stats ───────────────────────────────────
  const completed     = transactions.filter(t => t.tinh_trang === 4);
  // Ko có status huỷ trong backend — lấy tất cả không phải hoàn thành và có trong dữ liệu
  const canceled      = transactions.filter(t => t.tinh_trang !== 4);
  const todayDdMmYyyy = toApiDate(new Date()).split("-").reverse().join("/");
  // Dùng getTxDate để xử lý ngay_giao null
  const todayTxs      = completed.filter(t => getTxDate(t) === todayDdMmYyyy);
  const todayEarning  = todayTxs.reduce((s, t) => s + (t.phi_ship ?? 0), 0);
  const todayTrips    = todayTxs.length;
  const totalEarning  = completed.reduce((s, t) => s + (t.phi_ship ?? 0), 0);
  const totalTrips    = completed.length;
  const canceledTrips = canceled.length;

  // ── Bar chart 7 ngày gần nhất ────────────────────────
  const chartData: DayData[] = getLast7Days().map((d) => {
    const dStr = toApiDate(d).split("-").reverse().join("/");
    const val  = completed
      .filter(t => getTxDate(t) === dStr)
      .reduce((s, t) => s + (t.phi_ship ?? 0), 0);
    return { label: DAY_LABELS[d.getDay()], value: val, isToday: dStr === todayDdMmYyyy };
  });

  // ── Group by ngày ─────────────────────────────────────────
  const grouped: Record<string, Transaction[]> = {};
  transactions.forEach(t => {
    const key = getTxDate(t);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });
  const groupKeys = Object.keys(grouped);

  const formatMoney = (v: number) => v.toLocaleString("vi-VN") + "đ";

  const earningAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    earningAnim.setValue(0);
    Animated.timing(earningAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [period, transactions]);

  // ════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <View style={styles.headerBg}>
        <SafeAreaView edges={["top"]} style={styles.headerSafe}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Thu nhập</Text>
            <TouchableOpacity style={styles.headerIcon} onPress={handleRefresh}>
              {/* @ts-ignore */}
              <Ionicons name="refresh-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Period selector */}
          <View style={styles.periodSelector}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
                onPress={() => handlePeriodChange(p.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.periodBtnText, period === p.key && styles.periodBtnTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Big earning number */}
          <Animated.View style={[styles.bigEarningRow, { opacity: earningAnim }]}>
            <Text style={styles.bigEarningLabel}>Tổng thu nhập</Text>
            <Text style={styles.bigEarningValue}>{formatMoney(totalEarning)}</Text>
            <View style={styles.bigEarningMeta}>
              {/* @ts-ignore */}
              <Ionicons name="bicycle-outline" size={14} color="rgba(255,255,255,0.75)" />
              <Text style={styles.bigEarningMetaText}>{totalTrips} chuyến hoàn thành</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* ── Summary Cards ── */}
        <View style={styles.cardRow}>
          <View style={[styles.summaryCard, { flex: 1.3 }]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: "#FFF0ED" }]}>
              {/* @ts-ignore */}
              <Ionicons name="today-outline" size={20} color={PRIMARY} />
            </View>
            <Text style={styles.summaryValue}>{formatMoney(todayEarning)}</Text>
            <Text style={styles.summaryLabel}>Hôm nay</Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: "#EFF6FF" }]}>
              {/* @ts-ignore */}
              <Ionicons name="bicycle-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.summaryValue}>{todayTrips}</Text>
            <Text style={styles.summaryLabel}>Chuyến hôm nay</Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: "#FEF2F2" }]}>
              {/* @ts-ignore */}
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
            </View>
            <Text style={styles.summaryValue}>{canceledTrips}</Text>
            <Text style={styles.summaryLabel}>Đã huỷ</Text>
          </View>
        </View>

        {/* ── Bar Chart ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Doanh thu 7 ngày</Text>
            <Text style={styles.sectionSubtitle}>
              {formatMoney(chartData.reduce((s, d) => s + d.value, 0))}
            </Text>
          </View>
          <BarChart data={chartData} />
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: PRIMARY }]} />
              <Text style={styles.legendText}>Hôm nay</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "rgba(238,77,45,0.35)" }]} />
              <Text style={styles.legendText}>Các ngày khác</Text>
            </View>
          </View>
        </View>

        {/* ── Transaction History ── */}
        <View style={[styles.sectionCard, { paddingBottom: 0 }]}>
          <View style={[styles.sectionHeaderRow, { marginBottom: 0 }]}>
            <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: hp("3%"), alignItems: "center" }}>
              <Text style={{ color: TEXT_MUTED }}>Đang tải...</Text>
            </View>
          ) : groupKeys.length === 0 ? (
            <View style={{ paddingVertical: hp("3%"), alignItems: "center" }}>
              {/* @ts-ignore */}
              <Ionicons name="receipt-outline" size={36} color={TEXT_LIGHT} />
              <Text style={{ color: TEXT_LIGHT, marginTop: 8 }}>Không có dữ liệu</Text>
            </View>
          ) : (
            groupKeys.map((day) => (
              <View key={day}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{day}</Text>
                  <Text style={styles.dayTotal}>
                    +{formatMoney(
                      grouped[day]
                        .filter(t => t.tinh_trang === 4)
                        .reduce((s, t) => s + (t.phi_ship ?? 0), 0)
                    )}
                  </Text>
                </View>

                {grouped[day].map((t, i) => (
                  <View
                    key={t.id}
                    style={[styles.txRow, i === grouped[day].length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={[styles.txIcon, { backgroundColor: t.tinh_trang === 4 ? "#FFF0ED" : "#FEF2F2" }]}>
                      {/* @ts-ignore */}
                      <Ionicons
                        name={t.tinh_trang === 4 ? "checkmark-circle" : "close-circle"}
                        size={20}
                        color={t.tinh_trang === 4 ? PRIMARY : "#EF4444"}
                      />
                    </View>

                    <View style={styles.txInfo}>
                      <Text style={styles.txOrderId}>#{t.ma_don_hang}</Text>
                      <View style={styles.txAddressRow}>
                        {/* @ts-ignore */}
                        <Ionicons name="location-outline" size={11} color={TEXT_LIGHT} />
                        <Text style={styles.txAddress} numberOfLines={1}>{t.dia_chi}</Text>
                      </View>
                    </View>

                    <View style={styles.txRight}>
                      <Text style={[styles.txAmount, { color: t.tinh_trang === 3 ? PRIMARY : "#EF4444" }]}>
                        {t.tinh_trang === 4 ? "+" + formatMoney(t.phi_ship ?? 0) : "Huỷ"}
                      </Text>
                      <Text style={styles.txTime}>
                        {new Date(t.updated_at || t.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}

          <View style={{ height: hp("2%") }} />
        </View>

        <View style={{ height: hp("3%") }} />
      </ScrollView>
    </View>
  );
};

// ════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header ──
  headerBg: { backgroundColor: PRIMARY },
  headerSafe: { paddingTop: Platform.OS === "android" ? hp("1.5%") : 0 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("5%"),
    paddingTop: hp("1.5%"),
    paddingBottom: hp("0.5%"),
  },
  headerTitle: { fontSize: wp("5.5%"), fontWeight: "800", color: "#FFF", letterSpacing: 0.3 },
  headerIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },

  // Period selector
  periodSelector: {
    flexDirection: "row",
    marginHorizontal: wp("5%"),
    marginTop: hp("1%"),
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 3,
  },
  periodBtn: { flex: 1, paddingVertical: hp("0.7%"), borderRadius: 8, alignItems: "center" },
  periodBtnActive: { backgroundColor: "#FFFFFF" },
  periodBtnText: { fontSize: wp("3%"), fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  periodBtnTextActive: { color: PRIMARY_DARK, fontWeight: "800" },

  // Big earning
  bigEarningRow: { alignItems: "center", paddingVertical: hp("2.5%") },
  bigEarningLabel: {
    fontSize: wp("3.2%"), color: "rgba(255,255,255,0.75)",
    fontWeight: "600", marginBottom: hp("0.5%"),
  },
  bigEarningValue: {
    fontSize: wp("9%"), fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.5,
  },
  bigEarningMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: hp("0.5%") },
  bigEarningMetaText: { fontSize: wp("3%"), color: "rgba(255,255,255,0.75)", fontWeight: "500" },

  // Scroll
  scrollContent: { paddingHorizontal: wp("4%"), paddingTop: hp("2%") },

  // Summary Cards
  cardRow: { flexDirection: "row", gap: wp("2.5%"), marginBottom: hp("2%") },
  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: wp("3.5%"),
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: "center", alignItems: "center", marginBottom: hp("1%"),
  },
  summaryValue: { fontSize: wp("3.8%"), fontWeight: "800", color: TEXT_DARK, marginBottom: 2 },
  summaryLabel: { fontSize: wp("2.8%"), color: TEXT_LIGHT, fontWeight: "500" },

  // Section Card
  sectionCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.8%"),
    marginBottom: hp("2%"),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: hp("1%"),
  },
  sectionTitle: { fontSize: wp("4%"), fontWeight: "800", color: TEXT_DARK },
  sectionSubtitle: { fontSize: wp("3.5%"), fontWeight: "700", color: PRIMARY },

  // Chart legend
  chartLegend: { flexDirection: "row", justifyContent: "center", gap: wp("5%"), marginTop: hp("1%") },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: TEXT_MUTED, fontWeight: "500" },

  // Transaction History
  dayHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: hp("1%"), marginTop: hp("0.5%"),
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  dayLabel: {
    fontSize: wp("3.2%"), fontWeight: "700",
    color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.4,
  },
  dayTotal: { fontSize: wp("3.5%"), fontWeight: "800", color: PRIMARY },
  txRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: hp("1.2%"),
    borderBottomWidth: 1, borderBottomColor: BORDER,
    gap: wp("3%"),
  },
  txIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  txInfo: { flex: 1 },
  txOrderId: { fontSize: wp("3.5%"), fontWeight: "800", color: TEXT_DARK, marginBottom: 2 },
  txAddressRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  txAddress: { fontSize: wp("2.8%"), color: TEXT_LIGHT, flex: 1 },
  txRight: { alignItems: "flex-end", flexShrink: 0 },
  txAmount: { fontSize: wp("3.8%"), fontWeight: "800", marginBottom: 3 },
  txTime: { fontSize: wp("2.8%"), color: TEXT_LIGHT, fontWeight: "500" },
});

export default ShipperEarnings;
