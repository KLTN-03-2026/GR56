import React, { useEffect, useState, useCallback, memo } from "react";
import {
  Text,
  View,
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

const COLORS = { PRIMARY: "#EE4D2D", BG: "#F5F5F7", ACCENT: "#F59E0B" };
const API_BASE_IMAGE = "http://172.30.16.1:8000/storage";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 8) / 2;

interface Restaurant {
  id: number;
  ten_quan_an: string;
  hinh_anh: string | null;
  dia_chi: string;
  gia_min?: number;
  gia_max?: number;
}

const formatPrice = (price: number): string =>
  price.toLocaleString("vi-VN") + "đ";

const getImageUri = (path: string | null): string | null => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_BASE_IMAGE}/${path}`;
};

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
}

const RestaurantCard = memo<RestaurantCardProps>(({ restaurant, onPress }) => {
  const uri = getImageUri(restaurant.hinh_anh);

  return (
    <TouchableOpacity
      style={s.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {uri ? (
        <Image source={{ uri }} style={s.img} />
      ) : (
        <View style={[s.img, s.imgPlaceholder]}>
          <Ionicons name="image-outline" size={24} color="#CBD5E1" />
        </View>
      )}
      <View style={s.salePill}>
        <Ionicons name="flash" size={9} color="#FFF" />
        <Text style={s.salePillTxt}> Sale</Text>
      </View>
      <View style={s.body}>
        <Text style={s.name} numberOfLines={2}>
          {restaurant.ten_quan_an}
        </Text>
        <View style={s.addrRow}>
          <Ionicons name="location-outline" size={11} color="#94A3B8" />
          <Text style={s.addr} numberOfLines={1}>
            {restaurant.dia_chi}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const AllRestaurantsSale = ({ navigation }: { navigation: any }) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await apiClient.get("/khach-hang/trang-chu/data");
      setRestaurants(res.data.quan_an_sale ?? []);
    } catch (error) {
      console.error("Load restaurants error:", error);
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
        <Text style={s.headerTitle}>Quán Đang Sale</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* List */}
      {restaurants.length > 0 ? (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={s.listContent}
          numColumns={2}
          columnWrapperStyle={s.columnWrapper}
          renderItem={({ item, index }) => (
            <View
              style={{
                width: CARD_WIDTH,
                marginLeft: index % 2 === 1 ? 8 : 0,
              }}
            >
              <RestaurantCard
                restaurant={item}
                onPress={() => navigation.navigate("RestaurantDetail", { id: item.id })}
              />
            </View>
          )}
        />
      ) : (
        <View style={s.empty}>
          <Ionicons name="storefront-outline" size={48} color="#CBD5E1" />
          <Text style={s.emptyTxt}>Không có quán nào đang sale</Text>
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

  card: {
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
  img: { width: "100%", height: 110, resizeMode: "cover" },
  body: { padding: 10 },
  name: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  addrRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  addr: { fontSize: 11, color: "#94A3B8", flex: 1 },

  salePill: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.ACCENT,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  salePillTxt: { color: "#FFF", fontSize: 10, fontWeight: "900" },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyTxt: { fontSize: 14, color: "#94A3B8", fontWeight: "500" },

  imgPlaceholder: { justifyContent: "center", alignItems: "center", backgroundColor: "#F1F5F9" },
});

export default AllRestaurantsSale;
