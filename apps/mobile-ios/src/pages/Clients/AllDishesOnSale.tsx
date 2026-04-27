import React, { useEffect, useState, useCallback, memo } from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import apiClient from "../../genaral/api";

const COLORS = { PRIMARY: "#EE4D2D", BG: "#F5F5F7" };
const API_BASE_IMAGE = "http://172.30.16.1:8000/storage";

interface Dish {
  id: number;
  ten_mon_an: string;
  gia_ban: number;
  gia_khuyen_mai: number;
  hinh_anh: string | null;
  id_quan_an: number;
  ten_quan_an: string;
}

const formatPrice = (price: number): string =>
  price.toLocaleString("vi-VN") + "đ";

const getImageUri = (path: string | null): string | null => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_BASE_IMAGE}/${path}`;
};

const calculateDiscount = (original: number, discounted: number): number => {
  if (original <= 0) return 0;
  return Math.round(((original - discounted) / original) * 100);
};

interface DishCardProps {
  dish: Dish;
  onPress: () => void;
}

const DishCard = memo<DishCardProps>(({ dish, onPress }) => {
  const uri = getImageUri(dish.hinh_anh);
  const discount = calculateDiscount(dish.gia_ban, dish.gia_khuyen_mai);

  return (
    <TouchableOpacity style={s.dishCard} onPress={onPress} activeOpacity={0.85}>
      {uri ? (
        <Image source={{ uri }} style={s.dishImg} />
      ) : (
        <View style={[s.dishImg, s.imgPlaceholder]}>
          <Ionicons name="image-outline" size={22} color="#CBD5E1" />
        </View>
      )}
      {discount > 0 && (
        <View style={s.pctTag}>
          <Text style={s.pctTxt}>-{discount}%</Text>
        </View>
      )}
      <View style={s.dishBody}>
        <Text style={s.dishName} numberOfLines={2}>{dish.ten_mon_an}</Text>
        <Text style={s.dishShop} numberOfLines={1}>{dish.ten_quan_an}</Text>
        <View style={s.priceRow}>
          <Text style={s.salePrice}>{formatPrice(dish.gia_khuyen_mai)}</Text>
          <Text style={s.origPrice}>{formatPrice(dish.gia_ban)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const AllDishesOnSale = ({ navigation }: { navigation: any }) => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await apiClient.get("/khach-hang/trang-chu/data");
      setDishes(res.data.mon_an ?? []);
    } catch (error) {
      console.error("Load dishes error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} />
        <SafeAreaView edges={["top"]} style={s.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={s.loadingTxt}>Đang tải...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Món Đang Giảm Giá</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* List */}
      {dishes.length > 0 ? (
        <FlatList
          data={dishes}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={s.listContent}
          numColumns={2}
          columnWrapperStyle={s.columnWrapper}
          renderItem={({ item }) => (
            <DishCard
              dish={item}
              onPress={() => navigation.navigate("RestaurantDetail", { id: item.id_quan_an })}
            />
          )}
        />
      ) : (
        <View style={s.empty}>
          <Ionicons name="fast-food-outline" size={48} color="#CBD5E1" />
          <Text style={s.emptyTxt}>Không có món ăn nào</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.BG },

  loadingWrap: { 
    flex: 1, 
    backgroundColor: COLORS.PRIMARY,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingTxt: { color: "#FFF", fontSize: 14, fontWeight: "500" },

  header: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "white" },

  listContent: { paddingHorizontal: 16, paddingVertical: 12 },
  columnWrapper: { gap: 12, marginHorizontal: 0 },

  dishCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  dishImg: { width: "100%", height: 120, resizeMode: "cover" },
  dishBody: { padding: 10 },
  dishName: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  dishShop: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  salePrice: { fontSize: 13, fontWeight: "800", color: COLORS.PRIMARY },
  origPrice: { fontSize: 11, color: "#CBD5E1", textDecorationLine: "line-through" },
  pctTag: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pctTxt: { color: "#FFF", fontSize: 10, fontWeight: "900" },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyTxt: { fontSize: 14, color: "#94A3B8", fontWeight: "500" },

  imgPlaceholder: { justifyContent: "center", alignItems: "center", backgroundColor: "#F1F5F9" },
});

export default AllDishesOnSale;
