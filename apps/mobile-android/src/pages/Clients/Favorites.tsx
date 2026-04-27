import React, { useState, useCallback, useRef, memo } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Animated,
  Dimensions,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import apiClient from "../../genaral/api";
import { getImageUrl } from "../../utils/imageHelper";
import ToastMessage from "../../components/ToastMessage";

// ════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════
interface FavoriteDish {
  id: number;
  created_at: string;
  id_mon_an: number;
  ten_mon_an: string;
  hinh_anh: string | null;
  gia_ban: number;
  gia_khuyen_mai: number;
  mo_ta: string;
  tinh_trang: number;
  id_quan_an: number;
  ten_quan_an: string;
  hinh_anh_quan: string | null;
  ten_danh_muc: string | null;
}

interface Toast {
  visible: boolean;
  message: string;
  type: "success" | "error" | "info";
}

// ════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════
const { width: SW } = Dimensions.get("window");

const C = {
  PRIMARY:   "#EE4D2D",
  BG:        "#F7F8FA",
  WHITE:     "#FFFFFF",
  TEXT:      "#12192C",
  TEXT2:     "#6B7280",
  TEXT3:     "#9CA3AF",
  BORDER:    "#EAECF0",
  GREEN:     "#10B981",
  SHADOW:    "#0F172A",
};

const fmt = (price: number): string => {
  if (!price) return "0đ";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
};

const calcDiscount = (orig: number, disc: number) =>
  orig > 0 && disc < orig ? Math.round(((orig - disc) / orig) * 100) : 0;

// ════════════════════════════════════════════════════════
// Sub-Components
// ════════════════════════════════════════════════════════

interface DishCardProps {
  item: FavoriteDish;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  onAddToCart: (dish: FavoriteDish) => void;
  onViewDetail: (restaurantId: number) => void;
}

const DishCard = memo<DishCardProps>(({ item, isFavorite, onToggleFavorite, onAddToCart, onViewDetail }) => {
  const discount = calcDiscount(item.gia_ban, item.gia_khuyen_mai);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={[s.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={s.cardInner}
        onPress={() => onViewDetail(item.id_quan_an)}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        {/* Image */}
        <View style={s.imgWrap}>
          <Image
            source={{ uri: getImageUrl(item.hinh_anh) }}
            style={s.img}
          />
          {discount > 0 && (
            <View style={s.discBadge}>
              <Text style={s.discTxt}>-{discount}%</Text>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={s.body}>
          {/* Shop row */}
          <View style={s.shopRow}>
            {item.hinh_anh_quan ? (
              <Image source={{ uri: getImageUrl(item.hinh_anh_quan) }} style={s.shopAvatar} />
            ) : (
              <View style={[s.shopAvatar, s.shopAvatarPlaceholder]}>
                <Ionicons name="storefront-outline" size={12} color={C.TEXT3} />
              </View>
            )}
            <Text style={s.shopName} numberOfLines={1}>{item.ten_quan_an}</Text>
            {item.ten_danh_muc && (
              <View style={s.catPill}>
                <Text style={s.catTxt}>{item.ten_danh_muc}</Text>
              </View>
            )}
          </View>

          <Text style={s.dishName} numberOfLines={2}>{item.ten_mon_an}</Text>

          {/* Price row */}
          <View style={s.priceRow}>
            <Text style={s.salePrice}>{fmt(item.gia_khuyen_mai)}</Text>
            {item.gia_ban > item.gia_khuyen_mai && (
              <Text style={s.origPrice}>{fmt(item.gia_ban)}</Text>
            )}
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity
              style={s.viewBtn}
              onPress={() => onViewDetail(item.id_quan_an)}
            >
              <Ionicons name="storefront-outline" size={13} color={C.PRIMARY} />
              <Text style={s.viewBtnTxt}>Xem quán</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cartBtn}
              onPress={() => onAddToCart(item)}
            >
              <Ionicons name="cart-outline" size={13} color={C.WHITE} />
              <Text style={s.cartBtnTxt}>Thêm giỏ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Heart Button */}
      <TouchableOpacity
        style={s.heartBtn}
        onPress={() => onToggleFavorite(item.id_mon_an)}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      >
        <Ionicons
          name={isFavorite ? "heart" : "heart-outline"}
          size={20}
          color={isFavorite ? C.PRIMARY : C.TEXT3}
        />
      </TouchableOpacity>
    </Animated.View>
  );
});

// ════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════
const Favorites = ({ navigation }: any) => {
  const [favorites, setFavorites] = useState<FavoriteDish[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<Toast>({ visible: false, message: "", type: "success" });

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ visible: true, message, type });
  }, []);

  // ─── Load Favorites ─────────────────────────────────────
  const loadFavorites = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get("/khach-hang/yeu-thich/data");
      if (res.data?.status) {
        setFavorites(res.data.data || []);
        setFavoriteIds(new Set(res.data.ids || []));
      } else {
        setFavorites([]);
        setFavoriteIds(new Set());
      }
    } catch {
      showToast("Không thể tải danh sách yêu thích", "error");
      setFavorites([]);
      setFavoriteIds(new Set());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));

  const onRefresh = useCallback(() => { setRefreshing(true); loadFavorites(true); }, [loadFavorites]);

  // ─── Toggle Favorite ────────────────────────────────────
  const toggleFavorite = useCallback(async (dishId: number) => {
    try {
      const res = await apiClient.post("/khach-hang/yeu-thich/toggle", { id_mon_an: dishId });
      if (res.data?.status) {
        if (res.data.action === "removed") {
          setFavorites(prev => prev.filter(f => f.id_mon_an !== dishId));
          setFavoriteIds(prev => { const n = new Set(prev); n.delete(dishId); return n; });
          showToast("Đã xóa khỏi yêu thích", "info");
        } else {
          showToast(res.data.message || "Đã thêm vào yêu thích ❤️", "success");
          loadFavorites(true);
        }
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "Lỗi khi xử lý yêu thích", "error");
    }
  }, [showToast, loadFavorites]);

  // ─── Add to Cart ────────────────────────────────────────
  const handleAddToCart = useCallback(async (dish: FavoriteDish) => {
    try {
      await AsyncStorage.setItem("last_restaurant_id", dish.id_quan_an.toString());
      const res = await apiClient.post("/khach-hang/don-dat-hang/create", {
        id: dish.id_mon_an, so_luong: 1, don_gia: dish.gia_khuyen_mai, ghi_chu: "",
      });
      if (res.data?.status) showToast("Đã thêm vào giỏ hàng ✓", "success");
      else showToast(res.data?.message || "Không thể thêm vào giỏ hàng", "error");
    } catch (error: any) {
      showToast(error.response?.data?.message || "Lỗi khi thêm vào giỏ", "error");
    }
  }, [showToast]);

  // ─── View Detail ────────────────────────────────────────
  const handleViewDetail = useCallback(async (restaurantId: number) => {
    try {
      await AsyncStorage.setItem("last_restaurant_id", restaurantId.toString());
      navigation.navigate("RestaurantDetail", { id: restaurantId });
    } catch {}
  }, [navigation]);

  // ─── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.root}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={s.headerBg}>
          <SafeAreaView edges={["top"]}>
            <View style={s.headerInner}>
              <Text style={s.headerTitle}>Yêu Thích</Text>
              <View style={{ width: 36 }} />
            </View>
          </SafeAreaView>
        </View>
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color={C.PRIMARY} />
          <Text style={s.loadTxt}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  // ─── Main Render ─────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <View style={s.headerBg}>
        <SafeAreaView edges={["top"]}>
          <View style={s.headerInner}>
            <TouchableOpacity style={s.backBtn}>
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>Yêu Thích</Text>
              {favorites.length > 0 && (
                <View style={s.countBadge}>
                  <Text style={s.countTxt}>{favorites.length}</Text>
                </View>
              )}
            </View>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      </View>

      {/* ── Content ── */}
      {favorites.length === 0 ? (
        /* Empty State */
        <View style={s.emptyWrap}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="heart-outline" size={52} color={C.PRIMARY} />
          </View>
          <Text style={s.emptyTitle}>Chưa có món yêu thích</Text>
          <Text style={s.emptySub}>Hãy thêm những món ăn bạn thích{"\n"}để xem lại sau</Text>
          <TouchableOpacity style={s.exploreBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="compass-outline" size={16} color={C.WHITE} />
            <Text style={s.exploreBtnTxt}>Khám phá ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* List */
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.PRIMARY]}
              tintColor={C.PRIMARY}
            />
          }
          ListHeaderComponent={
            <Text style={s.listHeader}>
              {favorites.length} món yêu thích
            </Text>
          }
          renderItem={({ item }) => (
            <DishCard
              item={item}
              isFavorite={favoriteIds.has(item.id_mon_an)}
              onToggleFavorite={toggleFavorite}
              onAddToCart={handleAddToCart}
              onViewDetail={handleViewDetail}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* Toast */}
      {toast.visible && (
        <ToastMessage
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(p => ({ ...p, visible: false }))}
        />
      )}
    </View>
  );
};

// ════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.BG },

  /* ── Header ──────────────────────────────── */
  headerBg: {
    backgroundColor: C.PRIMARY,
    elevation: 4,
    shadowColor: C.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: "center", alignItems: "center",
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.WHITE, letterSpacing: -0.2 },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 12, paddingHorizontal: 9, paddingVertical: 2,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.4)",
  },
  countTxt: { fontSize: 12, fontWeight: "700", color: C.WHITE },

  /* ── Loading ─────────────────────────────── */
  loadWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadTxt: { fontSize: 14, color: C.TEXT3, fontWeight: "500" },

  /* ── Empty State ─────────────────────────── */
  emptyWrap: {
    flex: 1, justifyContent: "center", alignItems: "center",
    paddingHorizontal: 32, gap: 16,
  },
  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "#FEF2F2",
    justifyContent: "center", alignItems: "center",
    marginBottom: 8,
    elevation: 2,
    shadowColor: C.PRIMARY,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: C.TEXT, textAlign: "center" },
  emptySub: { fontSize: 14, color: C.TEXT3, textAlign: "center", lineHeight: 21 },
  exploreBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.PRIMARY, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
    elevation: 3, shadowColor: C.PRIMARY,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  exploreBtnTxt: { fontSize: 14, fontWeight: "800", color: C.WHITE },

  /* ── List ────────────────────────────────── */
  listContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16 },
  listHeader: { fontSize: 13, color: C.TEXT3, fontWeight: "600", marginBottom: 12 },

  /* ── Card ────────────────────────────────── */
  card: {
    backgroundColor: C.WHITE,
    borderRadius: 18,
    overflow: "hidden",
    elevation: 3,
    shadowColor: C.SHADOW,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    minHeight: 135,
  },
  cardInner: { flexDirection: "row", minHeight: 135 },

  /* Image */
  imgWrap: { width: 120, position: "relative", minHeight: 135 },
  img: { width: 120, height: "100%", resizeMode: "cover", position: "absolute", top: 0, left: 0, bottom: 0, right: 0 },
  discBadge: {
    position: "absolute", top: 8, left: 8,
    backgroundColor: C.PRIMARY, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  discTxt: { color: C.WHITE, fontSize: 10, fontWeight: "900" },

  /* Body */
  body: { flex: 1, padding: 13, paddingRight: 44, justifyContent: "flex-start", gap: 5 },
  shopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  shopAvatar: { width: 20, height: 20, borderRadius: 10, resizeMode: "cover" },
  shopAvatarPlaceholder: { backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  shopName: { fontSize: 11, color: C.TEXT2, fontWeight: "600", flex: 1 },
  catPill: {
    backgroundColor: "#FEF2F2", borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  catTxt: { fontSize: 10, color: C.PRIMARY, fontWeight: "700" },

  dishName: { fontSize: 14, fontWeight: "700", color: C.TEXT, lineHeight: 19 },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  salePrice: { fontSize: 15, fontWeight: "900", color: C.PRIMARY },
  origPrice: { fontSize: 11, color: C.TEXT3, textDecorationLine: "line-through" },

  /* Action buttons */
  actions: { flexDirection: "row", gap: 8 },
  viewBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.PRIMARY, backgroundColor: "#FFF8F7",
  },
  viewBtnTxt: { fontSize: 11, fontWeight: "700", color: C.PRIMARY },
  cartBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 7, borderRadius: 10,
    backgroundColor: C.PRIMARY,
    elevation: 2, shadowColor: C.PRIMARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  cartBtnTxt: { fontSize: 11, fontWeight: "700", color: C.WHITE },

  /* Heart button */
  heartBtn: {
    position: "absolute", top: 10, right: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.WHITE,
    justifyContent: "center", alignItems: "center",
    elevation: 3,
    shadowColor: C.SHADOW, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4,
  },
});

export default Favorites;
