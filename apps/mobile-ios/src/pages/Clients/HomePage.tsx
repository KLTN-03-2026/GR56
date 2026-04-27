import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import Geolocation from "react-native-geolocation-service";
import { requestLocationPermission } from "../../utils/location";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../../genaral/api";
import { loadNotifications } from "../../utils/notificationStore";
import ToastMessage from "../../components/ToastMessage";

// ════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLORS = {
  PRIMARY: "#EE4D2D",
  PRIMARY_DARK: "#C94020",
  PRIMARY_LIGHT: "#FF6B47",
  ORANGE: "#FF8C42",
  BG: "#F7F8FA",
  WHITE: "#FFFFFF",
  TEXT_PRIMARY: "#12192C",
  TEXT_SECONDARY: "#6B7280",
  TEXT_MUTED: "#9CA3AF",
  BORDER: "#EAECF0",
  CARD_SHADOW: "#0F172A",
  SUCCESS: "#10B981",
  YELLOW: "#F59E0B",
};
const SPACING = { GUTTER: 12, PADDING: 16, GAP: 8 };
const CARD_WIDTH = (SCREEN_WIDTH - 32 - SPACING.GUTTER) / 2;
const DISH_CARD_W = 160;
const FAV_CARD_W = 170;
const API_BASE_IMAGE = "http://172.30.16.1:8000/storage";

const CATEGORY_ICONS: Record<string, string> = {
  "cơm": "restaurant-outline",
  "trà": "cafe-outline",
  "đồ ăn nhanh": "fast-food-outline",
  "healthy": "leaf-outline",
  "ăn vặt": "ice-cream-outline",
  "mỳ": "flame-outline",
  "phở": "flame-outline",
  "bánh": "pizza-outline",
  "nước": "water-outline",
  "pizza": "pizza-outline",
  "bún": "flame-outline",
  "gà": "fast-food-outline",
  "bò": "fast-food-outline",
};

// ════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════
interface Dish {
  id: number;
  ten_mon_an: string;
  gia_ban: number;
  gia_khuyen_mai: number;
  hinh_anh: string | null;
  id_quan_an: number;
  ten_quan_an: string;
}

interface Restaurant {
  id: number;
  ten_quan_an: string;
  hinh_anh: string | null;
  dia_chi: string;
  gia_min?: number;
  gia_max?: number;
}

interface Voucher {
  id: number;
  ten_voucher: string;
  ma_code: string;
  loai_giam: number;
  so_giam_gia: number;
  don_hang_toi_thieu: number;
  thoi_gian_ket_thuc: string;
  id_quan_an: number | null;
  ten_quan_an: string | null;
}

interface Category {
  id: number;
  ten_danh_muc: string;
  hinh_anh: string | null;
  slug_danh_muc: string;
}

interface HomeNavigation {
  navigate: (screen: string, params?: any) => void;
}

interface SearchState {
  query: string;
  dishes: Dish[];
  restaurants: Restaurant[];
  isLoading: boolean;
}

// ════════════════════════════════════════════════════════
// Utilities
// ════════════════════════════════════════════════════════
const formatPrice = (price: number): string =>
  price.toLocaleString("vi-VN") + "đ";

const getImageUri = (path: string | null): string | null => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_BASE_IMAGE}/${path}`;
};

const getCategoryIcon = (categoryName: string): string => {
  const nameLower = categoryName.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (nameLower.includes(key)) return icon;
  }
  return "storefront-outline";
};

const calculateDiscount = (original: number, discounted: number): number => {
  if (original <= 0 || discounted >= original) return 0;
  return Math.round(((original - discounted) / original) * 100);
};

// ════════════════════════════════════════════════════════
// Sub-Components
// ════════════════════════════════════════════════════════

/** Search Dropdown Item */
interface SearchItemProps {
  item: Dish | Restaurant;
  isDish: boolean;
  onPress: () => void;
}
const SearchItem = memo<SearchItemProps>(({ item, isDish, onPress }) => {
  const uri = getImageUri(isDish ? (item as Dish).hinh_anh : (item as Restaurant).hinh_anh);
  const name = isDish ? (item as Dish).ten_mon_an : (item as Restaurant).ten_quan_an;
  const subtitle = isDish ? (item as Dish).ten_quan_an : (item as Restaurant).dia_chi;
  const price = isDish ? (item as Dish).gia_khuyen_mai : null;

  return (
    <TouchableOpacity style={s.searchItem} onPress={onPress} activeOpacity={0.7}>
      {uri ? (
        <Image source={{ uri }} style={s.searchThumb} />
      ) : (
        <View style={[s.searchThumb, s.imgPlaceholder]}>
          <Ionicons name={isDish ? "fast-food-outline" : "storefront-outline"} size={14} color={COLORS.TEXT_MUTED} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.searchName} numberOfLines={1}>{name}</Text>
        <Text style={s.searchAddr} numberOfLines={1}>{subtitle}</Text>
      </View>
      {price != null ? (
        <Text style={s.searchPrice}>{(price / 1000).toFixed(0)}k</Text>
      ) : (
        <View style={s.searchArrow}>
          <Ionicons name="chevron-forward" size={12} color={COLORS.TEXT_MUTED} />
        </View>
      )}
    </TouchableOpacity>
  );
});

/** Dish Card - Horizontal list */
interface DishCardProps {
  dish: Dish;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (dishId: number) => void;
}
const DishCard = memo<DishCardProps>(({ dish, onPress, isFavorite = false, onToggleFavorite }) => {
  const uri = getImageUri(dish.hinh_anh);
  const discount = calculateDiscount(dish.gia_ban, dish.gia_khuyen_mai);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={s.dishCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={s.dishImgWrap}>
          {uri ? (
            <Image source={{ uri }} style={s.dishImg} />
          ) : (
            <View style={[s.dishImg, s.imgPlaceholder]}>
              <Ionicons name="fast-food-outline" size={28} color={COLORS.TEXT_MUTED} />
            </View>
          )}
          {discount > 0 && (
            <View style={s.discountBadge}>
              <Text style={s.discountBadgeTxt}>-{discount}%</Text>
            </View>
          )}
          <TouchableOpacity
            style={s.favBtnDish}
            onPress={() => onToggleFavorite?.(dish.id)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={16}
              color={isFavorite ? COLORS.PRIMARY : COLORS.WHITE}
            />
          </TouchableOpacity>
        </View>
        <View style={s.dishBody}>
          <Text style={s.dishName} numberOfLines={1}>{dish.ten_mon_an}</Text>
          <View style={s.dishShopRow}>
            <Ionicons name="storefront-outline" size={10} color={COLORS.TEXT_MUTED} />
            <Text style={s.dishShop} numberOfLines={1}>{dish.ten_quan_an}</Text>
          </View>
          <View style={s.priceRow}>
            <Text style={s.salePrice}>{formatPrice(dish.gia_khuyen_mai)}</Text>
            {discount > 0 && (
              <Text style={s.origPrice}>{formatPrice(dish.gia_ban)}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

/** Category Pill */
interface CategoryItemProps {
  category: Category;
  isAll?: boolean;
  isActive: boolean;
  onPress: () => void;
}
const CategoryItem = memo<CategoryItemProps>(({ category, isAll = false, isActive, onPress }) => {
  const uri = getImageUri(category.hinh_anh);

  return (
    <TouchableOpacity style={s.catItem} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.catBubble, isActive && s.catBubbleActive]}>
        {uri ? (
          <Image source={{ uri }} style={s.catImgInner} />
        ) : (
          <Ionicons
            name={isAll ? "apps" : getCategoryIcon(category.ten_danh_muc)}
            size={20}
            color={isActive ? COLORS.WHITE : COLORS.PRIMARY}
          />
        )}
      </View>
      <Text style={[s.catLabel, isActive && s.catLabelActive]} numberOfLines={1}>
        {category.ten_danh_muc}
      </Text>
    </TouchableOpacity>
  );
});

/** Voucher Card */
interface VoucherCardProps {
  voucher: Voucher;
}
const VoucherCard = memo<VoucherCardProps>(({ voucher }) => {
  const isPercent = voucher.loai_giam === 1;
  const discount = isPercent ? `${voucher.so_giam_gia}%` : formatPrice(voucher.so_giam_gia);
  const expiry = voucher.thoi_gian_ket_thuc?.split("T")[0] || "";
  const daysLeft = expiry
    ? Math.max(0, Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <View style={s.vCard}>
      {/* Left accent panel */}
      <View style={s.vLeft}>
        <Ionicons name="pricetag" size={16} color="rgba(255,255,255,0.7)" />
        <Text style={s.vLeftLabel}>GIẢM</Text>
        <Text style={s.vLeftAmt} adjustsFontSizeToFit numberOfLines={1}>{discount}</Text>
      </View>

      {/* Notch holes */}
      <View style={[s.vHole, { top: -9 }]} />
      <View style={[s.vHole, { bottom: -9 }]} />

      {/* Dashed divider */}
      <View style={s.vDivider} />

      {/* Right content */}
      <View style={[s.vRight, { flex: 1, overflow: "hidden" }]}>
        <Text style={s.vTitle} numberOfLines={2}>{voucher.ten_voucher}</Text>
        {voucher.don_hang_toi_thieu > 0 && (
          <View style={s.vCondRow}>
            <Ionicons name="cart-outline" size={11} color={COLORS.TEXT_MUTED} />
            <Text style={s.vCond}>Đơn từ {formatPrice(voucher.don_hang_toi_thieu)}</Text>
          </View>
        )}
        {voucher.ten_quan_an && (
          <View style={s.vCondRow}>
            <Ionicons name="storefront-outline" size={11} color={COLORS.TEXT_MUTED} />
            <Text style={s.vShop} numberOfLines={1}>{voucher.ten_quan_an}</Text>
          </View>
        )}
        <View style={s.vFooter}>
          <View style={s.vCodeBox}>
            <Text style={s.vCode} numberOfLines={1} ellipsizeMode="tail">{voucher.ma_code}</Text>
          </View>
          {daysLeft !== null && (
            <Text style={[s.vExpiry, daysLeft <= 3 && { color: COLORS.PRIMARY }]}>
              {daysLeft === 0 ? "Hết hôm nay" : `Còn ${daysLeft} ngày`}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});

/** Restaurant Card - favorites horizontal list */
interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
  isFav?: boolean;
}
const RestaurantCard = memo<RestaurantCardProps>(({ restaurant, onPress, isFav = false }) => {
  const uri = getImageUri(restaurant.hinh_anh);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={isFav ? s.favCard : s.gridCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {uri ? (
          <Image source={{ uri }} style={isFav ? s.favImg : s.gridImg} />
        ) : (
          <View style={[isFav ? s.favImg : s.gridImg, s.imgPlaceholder]}>
            <Ionicons name="storefront-outline" size={28} color={COLORS.TEXT_MUTED} />
          </View>
        )}
        {!isFav && (
          <View style={s.salePill}>
            <Ionicons name="flash" size={9} color={COLORS.WHITE} />
            <Text style={s.salePillTxt}> Sale</Text>
          </View>
        )}
        <View style={isFav ? s.favBody : s.gridBody}>
          <Text style={isFav ? s.favName : s.gridName} numberOfLines={1}>
            {restaurant.ten_quan_an}
          </Text>
          <View style={s.addrRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.TEXT_MUTED} />
            <Text style={isFav ? s.favAddr : s.gridAddr} numberOfLines={1}>
              {restaurant.dia_chi}
            </Text>
          </View>
          {isFav && restaurant.gia_min != null && restaurant.gia_max != null && restaurant.gia_min > 0 && (
            <Text style={s.favPrice}>
              {formatPrice(restaurant.gia_min)} – {formatPrice(restaurant.gia_max)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

/** Section Header */
const SectionHeader = ({
  title,
  linkLabel = "Xem tất cả",
  onPress,
}: {
  title: string;
  linkLabel?: string;
  onPress?: () => void;
}) => (
  <View style={s.secHead}>
    <Text style={s.secTitle}>{title}</Text>
    {onPress && (
      <TouchableOpacity onPress={onPress} style={s.secLinkBtn}>
        <Text style={s.secLink}>{linkLabel}</Text>
        <Ionicons name="chevron-forward" size={13} color={COLORS.PRIMARY} />
      </TouchableOpacity>
    )}
  </View>
);

// ════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════
const HomePage = ({ navigation }: { navigation: HomeNavigation }) => {
  const [location, setLocation] = useState("Đang lấy vị trí...");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [showAllSales, setShowAllSales] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userName, setUserName] = useState("bạn");
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error" | "info",
  });
  const [search, setSearch] = useState<SearchState>({
    query: "",
    dishes: [],
    restaurants: [],
    isLoading: false,
  });

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const contentSlideAnim = useRef(new Animated.Value(30)).current;

  // ─── Load tên người dùng ──────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem("userData").then(str => {
      if (!str) return;
      try {
        const d = JSON.parse(str);
        const name = d.ho_va_ten || d.ho_ten || d.hoten || d.name || "";
        // Lấy tên nhỏ (từ cuối) để chào ngắn gọn
        const shortName = name.trim().split(" ").pop() || "bạn";
        setUserName(shortName);
      } catch {}
    });
  }, []);

  // ─── Data Loading ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [homeRes, reswtsRes, favRes] = await Promise.all([
        apiClient.get("/khach-hang/trang-chu/data"),
        apiClient.get("/khach-hang/quan-an/data"),
        apiClient.get("/khach-hang/yeu-thich/ids"),
      ]);
      setDishes(homeRes.data.mon_an ?? []);
      setFavorites(reswtsRes.data.quan_an_yeu_thich ?? []);
      setVouchers(homeRes.data.voucher ?? []);
      setCategories(homeRes.data.phan_loai ?? []);
      setSales(homeRes.data.quan_an_sale ?? []);
      setFavoriteIds(new Set(favRes.data.ids ?? []));
    } catch (error) {
      console.error("Load data error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const toggleFavorite = useCallback(async (itemId: number) => {
    try {
      const res = await apiClient.post("/khach-hang/yeu-thich/toggle", { id_mon_an: itemId });
      if (res.data?.status) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (next.has(itemId)) {
            next.delete(itemId);
            setToast({ visible: true, message: "Đã xóa khỏi yêu thích", type: "info" });
          } else {
            next.add(itemId);
            setToast({ visible: true, message: res.data.message || "Đã thêm vào yêu thích ❤️", type: "success" });
          }
          return next;
        });
      }
    } catch {
      setToast({ visible: true, message: "Lỗi khi xử lý yêu thích", type: "error" });
    }
  }, []);

  useEffect(() => {
    loadData();
    getLocation();
    // Entrance animation
    Animated.parallel([
      Animated.timing(headerFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentSlideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications().then((list) => {
        setUnreadCount(list.filter((n) => !n.isRead).length);
      });
    }, [])
  );

  // ─── Location ────────────────────────────────────────────────
  const getLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) { setLocation("Không có quyền vị trí"); return; }
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        try {
          await new Promise<void>((r) => setTimeout(r, 300));
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
            { headers: { "User-Agent": "ShoppeFood-App" } }
          );
          const data = await response.json();
          if (data?.display_name) {
            // Rút ngắn địa chỉ: lấy 2 phần đầu
            const parts = data.display_name.split(",");
            setLocation(parts.slice(0, 2).join(",").trim());
            return;
          }
        } catch { /* silent */ }
        setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      },
      () => { setLocation("Không thể lấy vị trí"); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // ─── Search ──────────────────────────────────────────────────
  const handleSearch = useCallback((text: string) => {
    setSearch((prev) => ({ ...prev, query: text }));
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (text.length < 2) {
      setSearch((prev) => ({ ...prev, dishes: [], restaurants: [], isLoading: false }));
      return;
    }
    setSearch((prev) => ({ ...prev, isLoading: true }));
    searchTimerRef.current = setTimeout(async () => {
      try {
        const response = await apiClient.get("/khach-hang/tim-kiem-goi-y", { params: { keyword: text } });
        setSearch((prev) => ({
          ...prev,
          dishes: response.data.mon_an ?? [],
          restaurants: response.data.quan_an ?? [],
          isLoading: false,
        }));
      } catch {
        setSearch((prev) => ({ ...prev, isLoading: false }));
      }
    }, 400);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch({ query: "", dishes: [], restaurants: [], isLoading: false });
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  const hasSearchResults = useMemo(
    () => search.query.length >= 2 && (search.dishes.length > 0 || search.restaurants.length > 0),
    [search.query, search.dishes, search.restaurants]
  );
  const noSearchResults = useMemo(
    () => search.query.length >= 2 && !search.isLoading && search.dishes.length === 0 && search.restaurants.length === 0,
    [search.query, search.isLoading, search.dishes, search.restaurants]
  );

  // ─── Filter by category ─────────────────────────────────────────────────
  const activeCat = useMemo(
    () => categories.find(c => c.id === activeCategory) ?? null,
    [activeCategory, categories]
  );
  const filteredDishes = useMemo(() => {
    if (!activeCat) return dishes;
    const key = activeCat.ten_danh_muc.toLowerCase();
    return dishes.filter(d =>
      d.ten_mon_an.toLowerCase().includes(key) ||
      d.ten_quan_an?.toLowerCase().includes(key)
    );
  }, [dishes, activeCat]);
  const filteredSales = useMemo(() => {
    if (!activeCat) return sales;
    const key = activeCat.ten_danh_muc.toLowerCase();
    return sales.filter(r => r.ten_quan_an?.toLowerCase().includes(key));
  }, [sales, activeCat]);
  const displayedSales = useMemo(
    () => showAllSales ? filteredSales : filteredSales.slice(0, 10),
    [filteredSales, showAllSales]
  );

  // ─── Loading Screen ──────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={s.loadingLogo}>
          <Ionicons name="restaurant" size={32} color={COLORS.WHITE} />
        </View>
        <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginTop: 24 }} />
        <Text style={s.loadingTxt}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  // ─── Main Render ─────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
            progressViewOffset={110}
          />
        }
      >
        {/* ══════════ GRADIENT HEADER ══════════ */}
        <Animated.View style={[s.header, { opacity: headerFadeAnim }]}>
          <SafeAreaView edges={["top"]}>
            <View style={s.headerInner}>

              {/* Top Row: Welcome + Actions */}
              <View style={s.headerTopRow}>
                {/* Lời chào */}
                <View style={s.greetingBlock}>
                  <Text style={s.greetingMain} numberOfLines={1}>Chào mừng trở lại, {userName} 👋</Text>
                </View>

                {/* Actions */}
                <View style={s.headerActions}>
                  <TouchableOpacity style={s.hBtn} onPress={() => navigation.navigate("Cart")}>
                    <Ionicons name="cart-outline" size={22} color={COLORS.WHITE} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.hBtn} onPress={() => navigation.navigate("Notification")}>
                    <Ionicons name="notifications-outline" size={22} color={COLORS.WHITE} />
                    {unreadCount > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeTxt}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search Bar */}
              <View style={s.searchBarWrap}>
                <View style={s.searchBar}>
                  <Ionicons name="search" size={17} color={COLORS.TEXT_MUTED} style={{ marginHorizontal: 12 }} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Tìm quán ăn, món ăn..."
                    placeholderTextColor={COLORS.TEXT_MUTED}
                    value={search.query}
                    onChangeText={handleSearch}
                  />
                  {search.isLoading && (
                    <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginRight: 12 }} />
                  )}
                  {search.query.length > 0 && !search.isLoading && (
                    <TouchableOpacity onPress={clearSearch} style={{ paddingRight: 12 }}>
                      <Ionicons name="close-circle" size={18} color={COLORS.TEXT_MUTED} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Search dropdown */}
                {hasSearchResults && (
                  <View style={s.searchDrop}>
                    {search.dishes.length > 0 && (
                      <>
                        <View style={s.searchSection}>
                          <Ionicons name="fast-food-outline" size={12} color={COLORS.TEXT_MUTED} />
                          <Text style={s.searchSectionTxt}>Món ăn</Text>
                        </View>
                        {search.dishes.slice(0, 4).map((dish) => (
                          <SearchItem
                            key={`dish-${dish.id}`}
                            item={dish}
                            isDish
                            onPress={() => { clearSearch(); navigation.navigate("RestaurantDetail", { id: dish.id_quan_an }); }}
                          />
                        ))}
                      </>
                    )}
                    {search.restaurants.length > 0 && (
                      <>
                        <View style={[s.searchSection, search.dishes.length > 0 && s.searchSectionDivider]}>
                          <Ionicons name="storefront-outline" size={12} color={COLORS.TEXT_MUTED} />
                          <Text style={s.searchSectionTxt}>Quán ăn</Text>
                        </View>
                        {search.restaurants.slice(0, 4).map((restaurant) => (
                          <SearchItem
                            key={`rest-${restaurant.id}`}
                            item={restaurant}
                            isDish={false}
                            onPress={() => { clearSearch(); navigation.navigate("RestaurantDetail", { id: restaurant.id }); }}
                          />
                        ))}
                      </>
                    )}
                  </View>
                )}

                {noSearchResults && (
                  <View style={s.searchEmpty}>
                    <Ionicons name="search-outline" size={20} color={COLORS.TEXT_MUTED} />
                    <Text style={s.searchEmptyTxt}>Không tìm thấy "{search.query}"</Text>
                  </View>
                )}
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* Header wave bottom */}
        <View style={s.headerWave} />

        <Animated.View style={{ transform: [{ translateY: contentSlideAnim }] }}>

          {/* ══════════ CATEGORIES ══════════ */}
          {categories.length > 0 && (
            <View style={s.sec}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.catRow}
              >
                <CategoryItem
                  category={{ id: 0, ten_danh_muc: "Tất cả", hinh_anh: null, slug_danh_muc: "" }}
                  isAll
                  isActive={activeCategory === null}
                  onPress={() => { setActiveCategory(null); setShowAllSales(false); }}
                />
                {categories.map((cat) => (
                  <CategoryItem
                    key={cat.id}
                    category={cat}
                    isActive={activeCategory === cat.id}
                    onPress={() => {
                      setActiveCategory(activeCategory === cat.id ? null : cat.id);
                      setShowAllSales(false);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ══════════ PROMO BANNER ══════════ */}
          <View style={s.bannerWrap}>
            <TouchableOpacity style={s.banner} activeOpacity={0.92}>
              <View style={s.bannerBg}>
                {/* Decorative circles */}
                <View style={s.bCircle1} />
                <View style={s.bCircle2} />
                <View style={s.bCircle3} />
                <View style={s.bannerContent}>
                  <View style={{ flex: 1 }}>
                    <View style={s.bannerChip}>
                      <Ionicons name="flame" size={12} color={COLORS.ORANGE} />
                      <Text style={s.bannerChipTxt}> Ưu đãi hôm nay</Text>
                    </View>
                    <Text style={s.bannerTitle}>Siêu Sale{"\n"}Cuối Tuần!</Text>
                    <Text style={s.bannerSub}>Giao nhanh · Giảm sâu · Ăn ngon</Text>
                    <TouchableOpacity style={s.bannerBtn}>
                      <Text style={s.bannerBtnTxt}>Khám phá ngay</Text>
                      <Ionicons name="arrow-forward" size={13} color={COLORS.PRIMARY} />
                    </TouchableOpacity>
                  </View>
                  <Text style={s.bannerEmoji}>🍜</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* ══════════ QUICK SERVICE SHORTCUTS ══════════ */}
          <View style={s.shortcutRow}>
            {[
              { icon: "bicycle-outline", label: "Giao hàng", color: "#EFF6FF", iconColor: "#3B82F6" },
              { icon: "storefront-outline", label: "Quán ăn", color: "#FFF7ED", iconColor: COLORS.ORANGE },
              { icon: "leaf-outline", label: "Healthy", color: "#F0FDF4", iconColor: "#22C55E" },
              { icon: "cafe-outline", label: "Đồ uống", color: "#FDF4FF", iconColor: "#A855F7" },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={s.shortcutItem} activeOpacity={0.75}
                onPress={() => navigation.navigate("AllRestaurantsSale")}>
                <View style={[s.shortcutIcon, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
                </View>
                <Text style={s.shortcutLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ══════════ DISHES ON SALE ══════════ */}
          {dishes.length > 0 && (
            <View style={s.sec}>
              <SectionHeader
                title={`🔥 Món Đang Giảm Giá${activeCat ? ` • ${activeCat.ten_danh_muc}` : ""}`}
                onPress={activeCat ? undefined : () => navigation.navigate("AllDishesOnSale")}
              />
              {filteredDishes.length > 0 ? (
                <FlatList
                  data={filteredDishes}
                  keyExtractor={(item) => item.id.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.listContent}
                  renderItem={({ item }) => (
                    <DishCard
                      dish={item}
                      onPress={() => navigation.navigate("RestaurantDetail", { id: item.id_quan_an })}
                      isFavorite={favoriteIds.has(item.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  )}
                />
              ) : (
                <View style={[s.emptyFilter, { marginTop: 0 }]}>
                  <Ionicons name="fast-food-outline" size={36} color={COLORS.TEXT_MUTED} />
                  <Text style={s.emptyFilterTxt}>Không có món nào phù hợp</Text>
                </View>
              )}
            </View>
          )}

          {/* ══════════ VOUCHERS ══════════ */}
          {vouchers.length > 0 && (
            <View style={s.sec}>
              <SectionHeader
                title="🎟️ Mã Giảm Giá"
                onPress={() => navigation.navigate("AllVouchers", { vouchers })}
              />
              <FlatList
                data={vouchers}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.listContent}
                renderItem={({ item }) => <VoucherCard voucher={item} />}
              />
            </View>
          )}

          {/* ══════════ FAVORITE RESTAURANTS ══════════ */}
          {favorites.length > 0 && (
            <View style={s.sec}>
              <SectionHeader
                title="❤️ Quán Yêu Thích"
                onPress={() => navigation.navigate("Wishlist")}
              />
              <FlatList
                data={favorites}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.listContent}
                renderItem={({ item }) => (
                  <RestaurantCard
                    restaurant={item}
                    onPress={() => navigation.navigate("RestaurantDetail", { id: item.id })}
                    isFav
                  />
                )}
              />
            </View>
          )}

          {/* ══════════ RESTAURANTS ON SALE (2-col grid) ══════════ */}
          {sales.length > 0 && (
            <View style={[s.sec, { paddingBottom: 8 }]}>
              <SectionHeader
                title={`🚀 Quán Đang Sale${activeCat ? ` • ${activeCat.ten_danh_muc}` : ""}`}
                linkLabel={
                  filteredSales.length > 10
                    ? showAllSales
                      ? "Thu gọn ↑"
                      : `Xem tất cả (${filteredSales.length})`
                    : undefined
                }
                onPress={
                  filteredSales.length > 10
                    ? () => setShowAllSales(v => !v)
                    : undefined
                }
              />
              {displayedSales.length > 0 ? (
                <View style={s.grid}>
                  {displayedSales.map((item, idx) => (
                    <View
                      key={item.id}
                      style={{
                        width: CARD_WIDTH,
                        marginLeft: idx % 2 === 1 ? SPACING.GUTTER : 0,
                        marginBottom: SPACING.GUTTER,
                      }}
                    >
                      <RestaurantCard
                        restaurant={item}
                        onPress={() => navigation.navigate("RestaurantDetail", { id: item.id })}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={s.emptyFilter}>
                  <Ionicons name="storefront-outline" size={36} color={COLORS.TEXT_MUTED} />
                  <Text style={s.emptyFilterTxt}>Không có quán nào phù hợp</Text>
                  <TouchableOpacity
                    onPress={() => { setActiveCategory(null); setShowAllSales(false); }}
                    style={s.emptyFilterBtn}
                  >
                    <Text style={s.emptyFilterBtnTxt}>Xem tất cả</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>

      {/* Toast */}
      {toast.visible && (
        <ToastMessage
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      )}
    </View>
  );
};

// ════════════════════════════════════════════════════════
// StyleSheet
// ════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.BG },

  /* ── Loading ──────────────────────────────────────── */
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.BG,
  },
  loadingLogo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.PRIMARY,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10,
  },
  loadingTxt: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
    fontWeight: "500",
    marginTop: 12,
  },

  /* ── Header ─────────────────────────────────────── */
  header: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.PADDING,
    paddingBottom: 24,
    zIndex: 10,
  },
  headerInner: {
    paddingTop: Platform.OS === "android" ? 6 : 4,
    gap: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Location
  locContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  locIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  locTextBlock: { flex: 1 },
  locLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  locMain: { flexDirection: "row", alignItems: "center", gap: 4 },
  locTxt: { fontSize: 13, fontWeight: "700", color: COLORS.WHITE, flex: 1 },

  // Greeting
  greetingBlock: { flex: 1 },
  greetingMain: { fontSize: 16, fontWeight: "700", color: COLORS.WHITE, lineHeight: 22 },

  // Actions
  headerActions: { flexDirection: "row", gap: 8 },
  hBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.YELLOW,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.PRIMARY,
  },
  badgeTxt: { fontSize: 8, fontWeight: "900", color: COLORS.WHITE },

  /* ── Search ─────────────────────────────────────── */
  searchBarWrap: { gap: 0 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.WHITE,
    borderRadius: 14,
    height: 46,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: "500",
  },
  searchDrop: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 14,
    marginTop: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
    zIndex: 100,
  },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.BORDER,
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
  },
  searchSectionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.BORDER,
  },
  searchSectionTxt: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  searchThumb: { width: 40, height: 40, borderRadius: 10, resizeMode: "cover" },
  searchName: { fontSize: 13, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  searchAddr: { fontSize: 12, color: COLORS.TEXT_MUTED, marginTop: 1 },
  searchPrice: { fontSize: 13, fontWeight: "800", color: COLORS.PRIMARY },
  searchArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  searchEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    backgroundColor: COLORS.WHITE,
    borderRadius: 14,
    marginTop: 6,
  },
  searchEmptyTxt: { fontSize: 13, color: COLORS.TEXT_MUTED, fontStyle: "italic" },

  /* Header wave */
  headerWave: {
    height: 28,
    backgroundColor: COLORS.PRIMARY,
    marginTop: -1,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  /* ── Categories ─────────────────────────────────── */
  sec: { marginTop: 24 },
  catRow: {
    paddingHorizontal: SPACING.PADDING,
    paddingBottom: 4,
    gap: 18,
    paddingTop: 4,
  },
  catItem: { alignItems: "center", gap: 7, minWidth: 58 },
  catBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  catBubbleActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
    shadowColor: COLORS.PRIMARY,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  catImgInner: { width: "100%", height: "100%", borderRadius: 50, resizeMode: "cover" },
  catLabel: { fontSize: 11, color: COLORS.TEXT_SECONDARY, fontWeight: "500", textAlign: "center" },
  catLabelActive: { color: COLORS.PRIMARY, fontWeight: "700" },

  /* ── Banner ─────────────────────────────────────── */
  bannerWrap: {
    paddingHorizontal: SPACING.PADDING,
    marginTop: 20,
  },
  banner: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: COLORS.PRIMARY,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  bannerBg: {
    backgroundColor: COLORS.PRIMARY,
    overflow: "hidden",
    minHeight: 160,
    position: "relative",
  },
  bCircle1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  bCircle2: {
    position: "absolute",
    bottom: -30,
    right: 60,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  bCircle3: {
    position: "absolute",
    top: 20,
    left: -20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  bannerChip: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  bannerChipTxt: { color: COLORS.WHITE, fontSize: 11, fontWeight: "700" },
  bannerTitle: {
    color: COLORS.WHITE,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
    marginBottom: 6,
  },
  bannerSub: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    marginBottom: 12,
  },
  bannerBtn: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: COLORS.WHITE,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    gap: 4,
  },
  bannerBtnTxt: { color: COLORS.PRIMARY, fontSize: 12, fontWeight: "800" },
  bannerEmoji: { fontSize: 72, lineHeight: 82 },

  /* ── Quick Shortcuts ─────────────────────────────── */
  shortcutRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    paddingHorizontal: SPACING.PADDING,
  },
  shortcutItem: { alignItems: "center", gap: 6 },
  shortcutIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  shortcutLabel: { fontSize: 12, color: COLORS.TEXT_SECONDARY, fontWeight: "600" },

  /* ── Section commons ─────────────────────────────── */
  secHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.PADDING,
    marginBottom: 14,
  },
  secTitle: { fontSize: 16, fontWeight: "800", color: COLORS.TEXT_PRIMARY, letterSpacing: -0.2 },
  secLinkBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  secLink: { fontSize: 13, fontWeight: "600", color: COLORS.PRIMARY },

  listContent: { paddingHorizontal: SPACING.PADDING, gap: SPACING.GUTTER },

  /* ── Dish Card ──────────────────────────────────── */
  dishCard: {
    width: DISH_CARD_W,
    backgroundColor: COLORS.WHITE,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: COLORS.CARD_SHADOW,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  dishImgWrap: { position: "relative" },
  dishImg: { width: "100%", height: 108, resizeMode: "cover" },
  dishBody: { padding: 12 },
  dishName: { fontSize: 13, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  dishShopRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  dishShop: { fontSize: 11, color: COLORS.TEXT_MUTED, flex: 1 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  salePrice: { fontSize: 14, fontWeight: "800", color: COLORS.PRIMARY },
  origPrice: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    textDecorationLine: "line-through",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  discountBadgeTxt: { color: COLORS.WHITE, fontSize: 10, fontWeight: "900" },
  favBtnDish: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* ── Voucher Card ───────────────────────────────── */
  vCard: {
    width: 288,
    backgroundColor: COLORS.WHITE,
    borderRadius: 18,
    flexDirection: "row",
    overflow: "visible",
    shadowColor: COLORS.PRIMARY,
    shadowOpacity: 0.10,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  vLeft: {
    width: 88,
    backgroundColor: COLORS.PRIMARY,
    borderTopLeftRadius: 17,
    borderBottomLeftRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 18,
  },
  vLeftLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  vLeftAmt: { color: COLORS.WHITE, fontSize: 24, fontWeight: "900", textAlign: "center", paddingHorizontal: 2 },
  vHole: {
    position: "absolute",
    left: 79,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.BG,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    zIndex: 1,
  },
  vDivider: {
    width: 1,
    marginVertical: 14,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  vRight: { flex: 1, paddingVertical: 14, paddingRight: 14, paddingLeft: 14 },
  vTitle: { fontSize: 13, fontWeight: "700", color: COLORS.TEXT_PRIMARY, lineHeight: 18 },
  vCondRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  vCond: { fontSize: 11, color: COLORS.TEXT_MUTED },
  vShop: { fontSize: 11, color: COLORS.TEXT_MUTED, flex: 1 },
  vFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, gap: 4 },
  vCodeBox: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,

    borderWidth: 1,
    borderColor: "#FEE2E2",
    flexShrink: 1,
  },
  vCode: { fontSize: 11, fontWeight: "900", color: COLORS.PRIMARY, letterSpacing: 1 },
  vExpiry: { fontSize: 10, color: COLORS.TEXT_MUTED, fontWeight: "600", flexShrink: 0 },

  /* ── Restaurant Card (Favorites) ─────────────────── */
  favCard: {
    width: FAV_CARD_W,
    backgroundColor: COLORS.WHITE,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: COLORS.CARD_SHADOW,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  favImg: { width: "100%", height: 100, resizeMode: "cover" },
  favBody: { padding: 11 },
  favName: { fontSize: 13, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  favAddr: { fontSize: 11, color: COLORS.TEXT_MUTED, flex: 1 },
  favPrice: { fontSize: 12, color: COLORS.PRIMARY, fontWeight: "700", marginTop: 5 },
  addrRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },

  /* ── Grid (2-col) : Sales ────────────────────────── */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SPACING.PADDING,
  },
  gridCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: COLORS.CARD_SHADOW,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  gridImg: { width: "100%", height: 115, resizeMode: "cover" },
  gridBody: { padding: 11 },
  gridName: { fontSize: 13, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  gridAddr: { fontSize: 11, color: COLORS.TEXT_MUTED, flex: 1 },
  salePill: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.YELLOW,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  salePillTxt: { color: COLORS.WHITE, fontSize: 10, fontWeight: "900" },

  /* ── Shared ─────────────────────────────────────── */
  imgPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },

  /* ── Empty filter state ─────────────────────────── */
  emptyFilter: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
    marginHorizontal: SPACING.PADDING,
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    marginBottom: 12,
  },
  emptyFilterTxt: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    fontWeight: "500",
  },
  emptyFilterBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  emptyFilterBtnTxt: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.WHITE,
  },
});

export default HomePage;