import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../../genaral/api";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

const PRIMARY_COLOR = "#EE4D2D";
const BACKGROUND_COLOR = "#F5F6F8";
const TEXT_DARK = "#1E293B";
const TEXT_MUTED = "#64748B";

export default function ShipperWalletHistory({ navigation }: any) {
  const [tab, setTab] = useState("vi"); // "vi" or "rut"
  const [wallet, setWallet] = useState<any>({});
  const [giaoDich, setGiaoDich] = useState<any[]>([]);
  const [lichSuRut, setLichSuRut] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [idShipper, setIdShipper] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    fetchUserData();
  }, []);

  // Reset page when tab changes or data reloads
  useEffect(() => {
    setPage(1);
  }, [tab, giaoDich, lichSuRut]);

  const fetchUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem("userData");
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setIdShipper(userData.id);
        fetchData(userData.id);
      }
    } catch (e) {
      console.log(e);
      setLoading(false);
    }
  };

  const fetchData = async (id: string) => {
    try {
      setLoading(true);
      await Promise.all([
        fetchGiaoDich(id),
        fetchLichSuRut(id),
      ]);
    } catch (e) {
      console.log("Lỗi fetch data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchGiaoDich = async (id: string) => {
    try {
      const res = await apiClient.get(`/wallet/chi-tiet?loai_vi=shipper&id_chu_vi=${id}`);
      if (res.data?.status) {
        setWallet(res.data.data.vi || {});
        setGiaoDich(res.data.data.giao_dich || []);
      }
    } catch (e) {
      console.log("Error fetching giao dich:", e);
    }
  };

  const fetchLichSuRut = async (id: string) => {
    try {
      const res = await apiClient.get(`/wallet/lich-su-rut?loai_vi=shipper&id_chu_vi=${id}`);
      if (res.data?.data) {
        setLichSuRut(res.data.data);
      }
      if (res.data?.vi) {
        setWallet(res.data.vi);
      }
    } catch (e) {
      console.log("Error fetching lich su rut:", e);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (idShipper) {
      fetchData(idShipper);
    } else {
      setRefreshing(false);
    }
  };

  const formatMoney = (v: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(v || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const labelTrangThai = (ts: string) => {
    const labels: any = {
      cho_duyet: "Chờ duyệt",
      da_duyet: "Đã duyệt",
      da_chuyen: "Hoàn tất",
      tu_choi: "Từ chối",
    };
    return labels[ts] || ts;
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {/* HEADER SECTION */}
      <View style={styles.headerBackground}>
        <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="arrow-back-outline" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Lịch sử Nạp/Rút Tiền</Text>
            <View style={styles.iconBtn} />
          </View>
        </SafeAreaView>
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "vi" && styles.tabBtnActive]}
          onPress={() => setTab("vi")}
        >
          <Text style={[styles.tabText, tab === "vi" && styles.tabTextActive]}>Lịch sử ví</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "rut" && styles.tabBtnActive]}
          onPress={() => setTab("rut")}
        >
          <Text style={[styles.tabText, tab === "rut" && styles.tabTextActive]}>Lịch sử rút</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <FlatList
          data={tab === "vi" ? giaoDich.slice(0, page * ITEMS_PER_PAGE) : lichSuRut.slice(0, page * ITEMS_PER_PAGE)}
          keyExtractor={(item, index) => `${tab}_${item.id || index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: hp("5%"), paddingTop: hp("2%"), paddingHorizontal: wp("5%") }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={() => {
            const total = tab === "vi" ? giaoDich.length : lichSuRut.length;
            if (page * ITEMS_PER_PAGE < total) {
              setPage(page + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name={tab === "vi" ? "receipt-outline" : "cash-outline"} size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                {tab === "vi" ? "Chưa có giao dịch nào" : "Chưa có yêu cầu rút tiền"}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            if (tab === "vi") {
              const gd = item;
              return (
                <View style={styles.itemCard}>
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: gd.loai_giao_dich === "credit" ? "#DCFCE7" : "#FFEDD5",
                      },
                    ]}
                  >
                    <Ionicons
                      name={gd.loai_giao_dich === "credit" ? "arrow-down" : "arrow-up"}
                      size={20}
                      color={gd.loai_giao_dich === "credit" ? "#16A34A" : "#EA580C"}
                    />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {gd.mo_ta || "Giao dịch"}
                    </Text>
                    <Text style={styles.itemDate}>{formatDate(gd.created_at)}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text
                      style={[
                        styles.itemAmount,
                        { color: gd.loai_giao_dich === "credit" ? "#16A34A" : "#EA580C" },
                      ]}
                    >
                      {gd.loai_giao_dich === "credit" ? "+" : "-"}
                      {formatMoney(gd.so_tien)}
                    </Text>
                    <Text style={styles.itemBalance}>SD: {formatMoney(gd.so_du_sau)}</Text>
                  </View>
                </View>
              );
            } else {
              const rut = item;
              return (
                <View style={styles.itemCard}>
                  <View style={[styles.iconWrap, { backgroundColor: "#DBEAFE" }]}>
                    <Ionicons name="business" size={20} color="#2563EB" />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>Yêu cầu rút tiền</Text>
                    {rut.bank_account && (
                      <Text style={styles.itemDate}>
                        {rut.bank_account.ten_ngan_hang} (****
                        {String(rut.bank_account.so_tai_khoan).slice(-4)})
                      </Text>
                    )}
                    <View style={styles.statusBadgeWrap}>
                      <Text
                        style={[
                          styles.statusBadge,
                          rut.trang_thai === "cho_duyet"
                            ? styles.statusPending
                            : rut.trang_thai === "da_chuyen"
                            ? styles.statusSuccess
                            : styles.statusError,
                        ]}
                      >
                        {labelTrangThai(rut.trang_thai)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={[styles.itemAmount, { color: "#EA580C" }]}>
                      {formatMoney(rut.so_tien_rut)}
                    </Text>
                    <Text style={styles.itemDate}>{formatDate(rut.created_at)}</Text>
                  </View>
                </View>
              );
            }
          }}
          ListFooterComponent={
            page * ITEMS_PER_PAGE < (tab === "vi" ? giaoDich.length : lichSuRut.length) ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
              </View>
            ) : null
          }
        />
      )}
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  headerBackground: {
    backgroundColor: PRIMARY_COLOR,
    paddingBottom: hp("2%"),
  },
  headerSafeArea: {
    paddingTop: Platform.OS === "android" ? hp("4%") : 0,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp("4%"),
    marginTop: hp("1%"),
  },
  headerTitle: {
    color: "#FFF",
    fontSize: wp("4.5%"),
    fontWeight: "700",
  },
  iconBtn: {
    padding: 4,
    minWidth: 40,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginHorizontal: wp("5%"),
    marginTop: hp("2%"),
    borderRadius: wp("3%"),
    padding: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: hp("1.2%"),
    alignItems: "center",
    borderRadius: wp("2.5%"),
  },
  tabBtnActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: wp("3.5%"),
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  tabTextActive: {
    color: "#FFF",
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: TEXT_MUTED,
    fontSize: wp("3.5%"),
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: hp("10%"),
  },
  emptyText: {
    marginTop: 10,
    fontSize: wp("4%"),
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  listContainer: {
    marginHorizontal: wp("5%"),
    marginTop: hp("2%"),
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: wp("4%"),
    padding: wp("4%"),
    marginBottom: hp("1.5%"),
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  iconWrap: {
    width: wp("12%"),
    height: wp("12%"),
    borderRadius: wp("6%"),
    justifyContent: "center",
    alignItems: "center",
    marginRight: wp("3%"),
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 2,
  },
  itemDate: {
    fontSize: wp("3%"),
    color: TEXT_MUTED,
    marginTop: 2,
  },
  itemRight: {
    alignItems: "flex-end",
  },
  itemAmount: {
    fontSize: wp("4%"),
    fontWeight: "700",
  },
  itemBalance: {
    fontSize: wp("2.8%"),
    color: TEXT_MUTED,
    marginTop: 4,
  },
  statusBadgeWrap: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  statusBadge: {
    fontSize: wp("2.5%"),
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusPending: {
    color: "#EA580C",
    borderColor: "#FFEDD5",
    backgroundColor: "#FFF7ED",
  },
  statusSuccess: {
    color: "#16A34A",
    borderColor: "#DCFCE7",
    backgroundColor: "#F0FDF4",
  },
  statusError: {
    color: "#DC2626",
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
  },
});
