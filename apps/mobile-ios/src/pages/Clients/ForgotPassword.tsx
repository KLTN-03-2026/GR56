import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import React, { useState, useRef } from "react";
import apiClient from "../../genaral/api";
import LoadingModal from "../../components/LoadingModal";
import ToastMessage from "../../components/ToastMessage";

const ForgotPassword = ({ navigation }: any) => {
    const [step, setStep] = useState(1); 
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

    const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
    };

    // Refs cho các ô input OTP
    const otpInputRefs = useRef<Array<TextInput | null>>([]);

    // Xử lý gửi email
    const handleSendEmail = async () => {
        const cleanEmail = email.trim();
        if (!cleanEmail) {
            showToast("Vui lòng nhập email", "error");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            showToast("Email không hợp lệ", "error");
            return;
        }

        setLoading(true);
        try {
            const res = await apiClient.post("/khach-hang/gui-ma-quen-mat-khau", { email: cleanEmail });
            if (res.data && res.data.status === 1) {
                showToast(res.data.message || "Đã gửi mã OTP", "success");
                setStep(2);
                startCountdown();
            } else {
                showToast(res.data.message || "Lỗi khi gửi mã OTP", "error");
            }
        } catch (error: any) {
             const msg = error.response?.data?.message || "Có lỗi xảy ra khi gọi API";
             showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    // Đếm ngược thời gian gửi lại OTP
    const startCountdown = () => {
        setCanResend(false);
        setCountdown(60);
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Xử lý gửi lại OTP
    const handleResendOTP = async () => {
        if (!canResend) return;
        setOtp(["", "", "", "", "", ""]);
        
        setLoading(true);
        try {
            const res = await apiClient.post("/khach-hang/gui-ma-quen-mat-khau", { email: email.trim() });
            if (res.data && res.data.status === 1) {
                showToast("Đã gửi lại mã OTP", "success");
                startCountdown();
            } else {
                showToast(res.data.message || "Lỗi khi gửi lại OTP", "error");
            }
        } catch (error: any) {
             const msg = error.response?.data?.message || "Có lỗi xảy ra";
             showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    // Xử lý nhập OTP
    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Tự động focus vào ô tiếp theo khi nhập số
        if (value && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }
    };

    // Xử lý khi nhấn backspace
    const handleOtpKeyPress = (index: number, key: string) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    // Xử lý xác nhận OTP (chuyển qua bước 3)
    const handleVerifyOTP = () => {
        const otpCode = otp.join("");
        if (otpCode.length !== 6) {
            showToast("Vui lòng nhập đủ 6 số OTP", "error");
            return;
        }

        // Chuyển tới bước 3 để nhập password mới trước khi Submit
        setStep(3);
    };
    
    // Xử lý Đặt lại mật khẩu (Gửi kèm OTP)
    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            showToast("Vui lòng nhập đầy đủ mật khẩu", "error");
            return;
        }
        if (newPassword !== confirmPassword) {
             showToast("Mật khẩu xác nhận không khớp", "error");
             return;
        }
        if (newPassword.length < 6) {
             showToast("Mật khẩu phải từ 6 ký tự", "error");
             return;
        }
        
        const otpCode = otp.join("");
        
        setLoading(true);
        try {
            const res = await apiClient.post("/khach-hang/quen-mat-khau", { 
                email: email.trim(),
                ma_otp: otpCode,
                new_password: newPassword
            });
            if (res.data && res.data.status === 1) {
                showToast(res.data.message || "Đổi mật khẩu thành công!", "success");
                setTimeout(() => {
                    navigation.navigate("Login");
                }, 1500);
            } else {
                showToast(res.data.message || "Lỗi khi đổi mật khẩu", "error");
            }
        } catch (error: any) {
             const msg = error.response?.data?.message || "Mã OTP không đúng hoặc đã hết hạn";
             showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LoadingModal visible={loading} />
            <ToastMessage
                visible={toastVisible}
                message={toastMessage}
                type={toastType}
                onHide={() => setToastVisible(false)}
            />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
                            if (step === 2) {
                                setStep(1);
                            } else {
                                navigation.goBack();
                            }
                        }}
                    >
                        <Ionicons name="chevron-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Quên mật khẩu</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {step === 1 ? (
                        // Bước 1: Nhập email
                        <View style={styles.stepContainer}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="mail-outline" size={60} color="#E63946" />
                            </View>

                            <Text style={styles.title}>Nhập email của bạn</Text>
                            <Text style={styles.description}>
                                Chúng tôi sẽ gửi mã OTP gồm 6 số đến email của bạn để xác nhận
                            </Text>

                            <View style={styles.inputWrapper}>
                                <Ionicons
                                    name="mail-outline"
                                    size={20}
                                    color="#999"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập email của bạn"
                                    placeholderTextColor="#999"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    loading && styles.buttonDisabled,
                                ]}
                                onPress={handleSendEmail}
                                disabled={loading}
                            >
                                <Text style={styles.buttonText}>
                                    {loading ? "Đang gửi..." : "Gửi mã OTP"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : step === 2 ? (
                        // Bước 2: Nhập OTP
                        <View style={styles.stepContainer}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="shield-checkmark-outline" size={60} color="#E63946" />
                            </View>

                            <Text style={styles.title}>Nhập mã OTP</Text>
                            <Text style={styles.description}>
                                Mã OTP đã được gửi đến email{"\n"}
                                <Text style={styles.emailHighlight}>{email}</Text>
                            </Text>

                            {/* OTP Input */}
                            <View style={styles.otpContainer}>
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => {
                                            otpInputRefs.current[index] = ref;
                                        }}
                                        style={[
                                            styles.otpInput,
                                            digit && styles.otpInputFilled,
                                        ]}
                                        value={digit}
                                        onChangeText={(value) =>
                                            handleOtpChange(index, value)
                                        }
                                        onKeyPress={({ nativeEvent }) =>
                                            handleOtpKeyPress(index, nativeEvent.key)
                                        }
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        selectTextOnFocus
                                        autoFocus={index === 0}
                                    />
                                ))}
                            </View>

                            {/* Resend OTP */}
                            <View style={styles.resendContainer}>
                                <Text style={styles.resendText}>
                                    Không nhận được mã?{" "}
                                </Text>
                                {canResend ? (
                                    <TouchableOpacity onPress={handleResendOTP}>
                                        <Text style={styles.resendLink}>
                                            Gửi lại
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={styles.countdown}>
                                        Gửi lại sau {countdown}s
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    (loading || otp.join("").length < 6) && styles.buttonDisabled,
                                ]}
                                onPress={handleVerifyOTP}
                                disabled={loading || otp.join("").length < 6}
                            >
                                <Text style={styles.buttonText}>Tiếp tục</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Bước 3: Nhập mật khẩu mới
                        <View style={styles.stepContainer}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="lock-closed-outline" size={60} color="#E63946" />
                            </View>

                            <Text style={styles.title}>Tạo mật khẩu mới</Text>
                            <Text style={styles.description}>
                                Vui lòng nhập mật khẩu mới cho tài khoản của bạn
                            </Text>

                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { paddingRight: 40 }]}
                                    placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
                                    placeholderTextColor="#999"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
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

                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { paddingRight: 40 }]}
                                    placeholder="Xác nhận mật khẩu mới"
                                    placeholderTextColor="#999"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleResetPassword}
                                disabled={loading}
                            >
                                <Text style={styles.buttonText}>
                                    {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: wp("4%"),
        paddingVertical: hp("1.5%"),
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    backButton: {
        padding: wp("2%"),
    },
    headerTitle: {
        fontSize: wp("4.5%"),
        fontWeight: "600",
        color: "#333",
    },
    placeholder: {
        width: wp("10%"),
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        paddingHorizontal: wp("6%"),
    },
    stepContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: hp("4%"),
    },
    iconContainer: {
        width: wp("25%"),
        height: wp("25%"),
        borderRadius: wp("12.5%"),
        backgroundColor: "#FFE8EC",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: hp("3%"),
    },
    title: {
        fontSize: wp("6%"),
        fontWeight: "700",
        color: "#333",
        marginBottom: hp("1.5%"),
        textAlign: "center",
    },
    description: {
        fontSize: wp("3.5%"),
        color: "#666",
        textAlign: "center",
        lineHeight: hp("3%"),
        marginBottom: hp("4%"),
        paddingHorizontal: wp("4%"),
    },
    emailHighlight: {
        fontWeight: "600",
        color: "#E63946",
    },
    inputWrapper: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F5F5",
        borderRadius: wp("3%"),
        paddingHorizontal: wp("4%"),
        marginBottom: hp("3%"),
        borderWidth: 1,
        borderColor: "#F0F0F0",
    },
    inputIcon: {
        marginRight: wp("3%"),
    },
    input: {
        flex: 1,
        paddingVertical: hp("1.8%"),
        fontSize: wp("4%"),
        color: "#333",
    },
    button: {
        width: "100%",
        backgroundColor: "#E63946",
        borderRadius: wp("3%"),
        paddingVertical: hp("2%"),
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#E63946",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: wp("4.5%"),
        fontWeight: "600",
        color: "#FFF",
    },
    eyeIcon: {
        position: 'absolute',
        right: wp("4%"),
    },
    otpContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: hp("3%"),
        paddingHorizontal: wp("2%"),
    },
    otpInput: {
        width: wp("12%"),
        height: wp("14%"),
        borderRadius: wp("2%"),
        backgroundColor: "#F5F5F5",
        borderWidth: 2,
        borderColor: "#E0E0E0",
        textAlign: "center",
        fontSize: wp("6%"),
        fontWeight: "600",
        color: "#333",
    },
    otpInputFilled: {
        borderColor: "#E63946",
        backgroundColor: "#FFE8EC",
    },
    resendContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: hp("3%"),
    },
    resendText: {
        fontSize: wp("3.5%"),
        color: "#666",
    },
    resendLink: {
        fontSize: wp("3.5%"),
        color: "#E63946",
        fontWeight: "600",
    },
    countdown: {
        fontSize: wp("3.5%"),
        color: "#999",
    },
});

export default ForgotPassword;
