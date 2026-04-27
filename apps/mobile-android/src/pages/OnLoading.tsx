import { Text, View, Image, StyleSheet, Animated, Easing } from "react-native";
import React, { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../genaral/api";


const OnLoading = ({ navigation }: any) => {
  const fallAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.sequence([
      // Rơi xuống nửa dưới màn hình
      Animated.timing(fallAnim, {
        toValue: 80,
        duration: 2000,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      // Nảy nhẹ lần 1
      Animated.timing(fallAnim, {
        toValue: 70,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Nảy nhẹ lần 2
      Animated.timing(fallAnim, {
        toValue: 75,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Nảy nhẹ lần 3
      Animated.timing(fallAnim, {
        toValue: 72,
        duration: 100,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Dừng lại
      Animated.delay(1500),
    ]).start();

    const checkAuthTimer = setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          navigation.navigate("Login");
          return;
        }

        const userRole = await AsyncStorage.getItem("userRole");

        // Kiểm tra token theo role đã lưu
        const checkEndpoint =
          userRole === "shipper"
            ? "/shipper/check-token"
            : "/khach-hang/check-token";

        try {
          const response = await apiClient.get(checkEndpoint);
          if (response.data.status === 1) {
            if (userRole === "shipper") {
              navigation.navigate("ShipperTabs");
            } else {
              const userDataStr = await AsyncStorage.getItem("userData");
              let userData = userDataStr ? JSON.parse(userDataStr) : {};
              userData = {
                ...userData,
                name: response.data.ho_ten || userData.name,
                avatar: response.data.avatar || userData.avatar,
              };
              await AsyncStorage.setItem("userData", JSON.stringify(userData));
              navigation.navigate("MainTabs");
            }
          } else {
            await AsyncStorage.removeItem("token");
            navigation.navigate("Login");
          }
        } catch {
          // Nếu shipper endpoint thất bại, thử fallback sang khách hàng
          if (userRole === "shipper") {
            navigation.navigate("ShipperTabs");
          } else {
            await AsyncStorage.removeItem("token");
            navigation.navigate("Login");
          }
        }
      } catch (error) {
        console.log("Lỗi check token:", error);
        await AsyncStorage.removeItem("token");
        navigation.navigate("Login");
      }
    }, 2500);

    return () => clearTimeout(checkAuthTimer);
  }, [fallAnim, navigation]);

  return (
    <View style={styles.container}>
      {/* Decorative glow circles (absolute, behind everything) */}
      <View style={styles.glowOuter} />
      <View style={styles.glowMid} />

      {/* Center column: logo + text stacked vertically */}
      <View style={styles.centerGroup}>
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ translateY: fallAnim }] },
          ]}
        >
          {/* Glow ring behind logo */}
          <View style={styles.glowRing} />
          <Image
            source={require("../assets/images/logoFood.png")}
            style={styles.logo}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: fallAnim.interpolate({
                inputRange: [70, 80],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <Text style={styles.brandName}>FOODBEE</Text>
          <Text style={styles.tagline}>Món ngon, giao nhanh 🚀</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F0F1A",
  },

  // Background atmosphere
  glowOuter: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(230, 57, 70, 0.06)",
  },
  glowMid: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(230, 57, 70, 0.1)",
  },

  // Center group: logo + text stacked
  centerGroup: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Logo area
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  glowRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(230, 57, 70, 0.22)",
    shadowColor: "#E63946",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  logo: {
    width: 130,
    height: 130,
    resizeMode: "contain",
    borderRadius: 65,
  },

  // Text
  textBlock: {
    alignItems: "center",
    marginTop: 12,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 4,
    marginTop: 50,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.5,
  },
});

export default OnLoading;