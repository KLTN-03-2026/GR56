import {
  Text,
  View,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Chiều cao vùng ảnh và vùng text cố định, tránh bể khung
const IMAGE_AREA_H = SCREEN_HEIGHT * 0.48;
const BOTTOM_AREA_H = SCREEN_HEIGHT * 0.52;

const slides = [
  {
    title: "Thêm lạ có,\năn là ngon",
    description: "Khám phá hàng ngàn quán ăn ngon quanh bạn và nhận ưu đãi mỗi ngày.",
    image: require("../assets/images/slide1.png"),
    accent: "#E63946",
  },
  {
    title: "Giao hàng\nnhanh chóng",
    description: "Đặt hàng và nhận đồ ăn nóng hổi trong vòng 30 phút.",
    image: require("../assets/images/slide2.jpg"),
    accent: "#FF6B35",
  },
  {
    title: "Giá cả hợp lý\nchất lượng cao",
    description: "Luôn có ưu đãi và khuyến mãi dành riêng cho khách hàng thân thiết.",
    image: require("../assets/images/slide3.jpg"),
    accent: "#E63946",
  },
];

const GetStart = ({ navigation }: any) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  // Auto-slide mỗi 4.5s
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % slides.length;
        scrollViewRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handlePressIn = () => {
    Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();
  };

  const currentAccent = slides[activeSlide].accent;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F1A" translucent />

      {/* ── Ảnh slide (phần trên) ── */}
      <View style={[styles.imageArea, { height: IMAGE_AREA_H }]}>
        {/* Decorative circle */}
        <View style={[styles.bgBlob, { backgroundColor: currentAccent + "18" }]} />

        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveSlide(idx);
          }}
          style={styles.imageScroll}
        >
          {slides.map((slide, i) => (
            <View key={i} style={{ width: SCREEN_WIDTH, height: IMAGE_AREA_H, justifyContent: "center", alignItems: "center" }}>
              <Image
                source={slide.image}
                style={styles.slideImage}
              />
            </View>
          ))}
        </ScrollView>

        {/* Logo top-left */}
        <View style={styles.logoHeader}>
          <Image
            source={require("../assets/images/logoFood.png")}
            style={styles.logoSmall}
          />
          <Text style={styles.logoText}>FoodBee</Text>
        </View>
      </View>

      {/* ── Nội dung + nút (phần dưới) ── */}
      <View style={[styles.bottomSheet, { height: BOTTOM_AREA_H }]}>
        {/* Thanh kéo */}
        <View style={styles.dragHandle} />

        {/* Text content */}
        <View style={styles.textArea}>
          <Text style={[styles.title, { color: "#FFFFFF" }]}>
            {slides[activeSlide].title}
          </Text>
          <Text style={styles.description}>
            {slides[activeSlide].description}
          </Text>
        </View>

        {/* Dots pagination */}
        <View style={styles.pagination}>
          {slides.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setActiveSlide(i);
                scrollViewRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true });
              }}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === activeSlide ? currentAccent : "rgba(255,255,255,0.2)",
                    width: i === activeSlide ? wp("8%") : wp("2.5%"),
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Nút bắt đầu */}
        <Animated.View style={{ transform: [{ scale: btnScale }], marginHorizontal: wp("6%") }}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: currentAccent }]}
            onPress={() => navigation.navigate("Login")}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          >
            <Text style={styles.buttonText}>Bắt đầu ngay</Text>
            <View style={styles.arrowBadge}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Link đăng nhập */}
        <TouchableOpacity style={styles.loginRow} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.loginText}>
            Đã có tài khoản?{" "}
            <Text style={[styles.loginLink, { color: currentAccent }]}>Đăng nhập</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F1A",
  },

  // ── Image area ──
  imageArea: {
    overflow: "hidden",
    position: "relative",
  },
  bgBlob: {
    position: "absolute",
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    alignSelf: "center",
    top: "10%",
    zIndex: 0,
  },
  imageScroll: {
    flex: 1,
    zIndex: 1,
  },
  slideImage: {
    width: SCREEN_WIDTH * 0.78,
    height: SCREEN_HEIGHT * 0.38,
    resizeMode: "cover",
    borderRadius: 24,
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logoHeader: {
    position: "absolute",
    top: hp("6%"),
    left: wp("5%"),
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    zIndex: 10,
  },
  logoSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    resizeMode: "contain",
  },
  logoText: {
    fontSize: wp("3.8%"),
    fontWeight: "700",
    color: "#E63946",
    letterSpacing: 0.5,
  },

  // ── Bottom Sheet ──
  bottomSheet: {
    backgroundColor: "#16162A",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: hp("3%"),
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: hp("3%"),
  },
  textArea: {
    paddingHorizontal: wp("7%"),
    marginBottom: hp("3%"),
  },
  title: {
    fontSize: wp("7%"),
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: wp("9%"),
    marginBottom: hp("1.5%"),
    letterSpacing: 0.2,
  },
  description: {
    fontSize: wp("3.8%"),
    color: "rgba(255,255,255,0.5)",
    lineHeight: wp("6%"),
    letterSpacing: 0.2,
  },

  // ── Dots ──
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp("3.5%"),
    gap: wp("1.5%"),
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  // ── Button ──
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: wp("4%"),
    paddingVertical: hp("1.9%"),
    marginBottom: hp("2%"),
    shadowColor: "#E63946",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonText: {
    color: "#FFF",
    fontSize: wp("4.2%"),
    fontWeight: "700",
    letterSpacing: 0.4,
    marginRight: wp("2%"),
  },
  arrowBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: wp("5%"),
    width: wp("8%"),
    height: wp("8%"),
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: {
    color: "#fff",
    fontSize: wp("4%"),
    fontWeight: "bold",
  },

  // ── Login row ──
  loginRow: {
    alignItems: "center",
  },
  loginText: {
    fontSize: wp("3.5%"),
    color: "rgba(255,255,255,0.4)",
  },
  loginLink: {
    fontWeight: "700",
  },
});

export default GetStart;