import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../genaral/api";
import LoadingModal from "../components/LoadingModal";
import ToastMessage from "../components/ToastMessage";

const PRIMARY_COLOR = "#EE4D2D";

const ShipperRegister = ({ navigation }: any) => {
    const [ho_va_ten, setHo_va_ten] = useState("");
    const [email, setEmail] = useState("");
    const [so_dien_thoai, setSo_dien_thoai] = useState("");
    const [cccd, setCccd] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userDataString = await AsyncStorage.getItem("userData");
                if (userDataString) {
                    const userData = JSON.parse(userDataString);
                    setHo_va_ten(userData.ho_va_ten || userData.ho_ten || userData.hoten || userData.name || "");
                    setSo_dien_thoai(userData.so_dien_thoai || userData.sodienthoai || userData.phone || "");
                    setEmail(userData.email || "");
                    setCccd(userData.cccd || userData.can_cuoc_cong_dan || userData.id_card || "");
                }
            } catch (error) {
                console.log("Error fetching user data in ShipperRegister:", error);
            }
        };
        fetchUserData();
    }, []);

    const showToast = (message: string, type: "success" | "error" | "info") => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
    };

    const handleRegister = async () => {
        if (!ho_va_ten || !email || !so_dien_thoai || !cccd || !password) {
            showToast("Vui lòng điền đầy đủ thông tin", "error");
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.post("/shipper/dang-ky", {
                ho_va_ten,
                email,
                password,
                cccd,
                so_dien_thoai,
            });

            if (response.data.status === 1) {
                showToast(response.data.message || "Đăng ký thành công!", "success");
                setTimeout(async () => {
                    // Xóa dữ liệu user cũ để ép đăng nhập lại bằng Shipper
                    await AsyncStorage.removeItem("userData");
                    await AsyncStorage.removeItem("token");
                    navigation.replace("Login");
                }, 1500);
            } else {
                showToast(response.data.message || "Đăng ký thất bại", "error");
            }
        } catch (error: any) {
            console.log("Register error:", error.response?.data || error.message);
            let errorMessage = "Có lỗi xảy ra, vui lòng thử lại.";
            if (error.response?.data) {
                if (error.response.data.status === 0 && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.data.errors) {
                    const firstErrorKey = Object.keys(error.response.data.errors)[0];
                    errorMessage = error.response.data.errors[firstErrorKey][0];
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            }
            showToast(errorMessage, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeContainer}>
            <LoadingModal visible={loading} />
            <ToastMessage
                visible={toastVisible}
                message={toastMessage}
                type={toastType}
                onHide={() => setToastVisible(false)}
            />

            <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#000" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 30 }}
            >
                <View style={styles.header}>
                    <Image
                        source={{ uri: 'https://png.pngtree.com/png-vector/20230408/ourmid/pngtree-send-food-vector-png-image_6676087.png' }}
                        style={styles.illustration}
                        defaultSource={{ uri: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png' }}
                    />
                    <Text style={styles.welcomeText}>Đăng ký Trở thành Đối tác</Text>
                    <Text style={styles.subText}>Cùng FoodVip giao hàng và gia tăng thu nhập!</Text>
                </View>

                <View style={styles.form}>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Họ và tên</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Nguyễn Văn A"
                                placeholderTextColor="#999"
                                value={ho_va_ten}
                                onChangeText={setHo_va_ten}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="example@email.com"
                                placeholderTextColor="#999"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Số điện thoại</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="0987654321"
                                placeholderTextColor="#999"
                                value={so_dien_thoai}
                                onChangeText={setSo_dien_thoai}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Căn cước công dân (CCCD)</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="card-outline" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Nhập 12 số định danh"
                                placeholderTextColor="#999"
                                value={cccd}
                                onChangeText={setCccd}
                                keyboardType="number-pad"
                                maxLength={12}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mật khẩu</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { paddingRight: 40 }]}
                                placeholder="••••••••"
                                placeholderTextColor="#999"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Ionicons
                                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                                    size={20}
                                    color="#999"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <Text style={styles.loginButtonText}>
                            {loading ? "Đang xử lý..." : "Đăng ký Đối tác"}
                        </Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: "#FFF",
    },
    headerBar: {
        paddingHorizontal: wp("3%"),
        paddingTop: hp("1%"),
        paddingBottom: hp("1%"),
    },
    backBtn: {
        padding: wp("2%"),
    },
    container: {
        flex: 1,
        backgroundColor: "#FFF",
    },
    header: {
        alignItems: "center",
        paddingVertical: hp("2%"),
    },
    illustration: {
        width: wp("35%"),
        height: hp("15%"),
        resizeMode: "contain",
        marginBottom: hp("2%"),
    },
    welcomeText: {
        fontSize: wp("6%"),
        fontWeight: "bold",
        color: "#000",
        marginBottom: hp("1%"),
    },
    subText: {
        fontSize: wp("3.5%"),
        color: "#666",
        textAlign: "center",
        paddingHorizontal: wp("10%"),
    },
    form: {
        paddingHorizontal: wp("5%"),
        paddingVertical: hp("2%"),
        paddingBottom: hp("5%"),
    },
    inputGroup: {
        marginBottom: hp("2.5%"),
    },
    label: {
        fontSize: wp("3.2%"),
        fontWeight: "600",
        color: "#333",
        marginBottom: hp("1%"),
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E0E0E0",
        borderRadius: wp("3%"),
        paddingHorizontal: wp("3%"),
        height: hp("6.5%"),
        backgroundColor: "#F9F9F9",
    },
    inputIcon: {
        marginRight: wp("2.5%"),
    },
    input: {
        flex: 1,
        fontSize: wp("3.5%"),
        color: "#333",
    },
    eyeIcon: {
        padding: wp("2.5%"),
    },
    loginButton: {
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: hp("2%"),
        borderRadius: wp("6.25%"),
        alignItems: "center",
        marginTop: hp("1%"),
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: "#FFF",
        fontSize: wp("4%"),
        fontWeight: "bold",
    },
});

export default ShipperRegister;
