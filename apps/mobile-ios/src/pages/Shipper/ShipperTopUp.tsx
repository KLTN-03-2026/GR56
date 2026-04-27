import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../../genaral/api";
import CustomAlert, { AlertButton } from "../../components/CustomAlert";

const PRIMARY = "#EE4D2D";
const BG = "#F5F6F8";
const DARK = "#1E293B";
const MUTED = "#64748B";

const PRESET_AMOUNTS = [
    { label: "100.000đ", value: 100000 },
    { label: "200.000đ", value: 200000 },
    { label: "500.000đ", value: 500000 },
    { label: "1.000.000đ", value: 1000000 },
    { label: "2.000.000đ", value: 2000000 },
    { label: "5.000.000đ", value: 5000000 },
];

const formatMoney = (value: number): string => {
    if (!value) return "0đ";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
};

// ── Step type ─────────────────────────────────────────
type Step = "select" | "paying" | "confirming";

const ShipperTopUp = ({ navigation }: any) => {
    const [step, setStep] = useState<Step>("select");
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState("");
    const [balance, setBalance] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const insets = useSafeAreaInsets();

    // PayOS data
    const [checkoutUrl, setCheckoutUrl] = useState("");
    const [orderCode, setOrderCode] = useState<number | null>(null);
    const [confirming, setConfirming] = useState(false);

    const webViewRef = useRef<any>(null);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        type?: "success" | "error" | "warning" | "info" | "confirm";
        title: string;
        message?: string;
        buttons?: AlertButton[];
    }>({ visible: false, title: "" });

    const showAlert = (
        type: "success" | "error" | "warning" | "info" | "confirm",
        title: string,
        message?: string,
        buttons?: AlertButton[]
    ) => setAlertConfig({ visible: true, type, title, message, buttons });

    const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const res = await apiClient.get("/shipper/so-du");
                if (res.data?.status) setBalance(res.data.data?.so_du ?? 0);
            } catch {
                setBalance(0);
            }
        };
        fetchBalance();
    }, []);

    const getFinalAmount = (): number => {
        if (selectedAmount) return selectedAmount;
        const parsed = parseInt(customAmount.replace(/\D/g, ""), 10);
        return isNaN(parsed) ? 0 : parsed;
    };

    // ── Bước 1: Tạo link PayOS ─────────────────────────
    const handleCreateLink = async () => {
        const amount = getFinalAmount();
        if (amount < 10000) {
            showAlert("error", "Lỗi", "Số tiền nạp tối thiểu là 10.000đ.");
            return;
        }

        setSubmitting(true);
        try {
            const userDataStr = await AsyncStorage.getItem("userData");
            const userData = userDataStr ? JSON.parse(userDataStr) : {};
            const id_shipper = userData.id;

            if (!id_shipper) {
                showAlert("error", "Lỗi", "Không xác định được tài khoản. Vui lòng đăng nhập lại.");
                return;
            }

            const res = await apiClient.post("/wallet/tao-link-nap-tien", {
                id_shipper,
                so_tien: amount,
            });

            if (res.data?.status) {
                setCheckoutUrl(res.data.data.checkoutUrl);
                setOrderCode(res.data.data.orderCode);
                setStep("paying");
            } else {
                showAlert("error", "Lỗi", res.data?.message || "Không thể tạo link thanh toán.");
            }
        } catch (error: any) {
            showAlert("error", "Lỗi", error?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    // ── Bước 2: Xác nhận thanh toán (S2S) ──────────────
    const handleConfirmPayment = async (code: number) => {
        setConfirming(true);
        try {
            const res = await apiClient.post("/wallet/xac-nhan-nap-tien", {
                orderCode: code,
            });

            if (res.data?.status) {
                // Refresh balance
                try {
                    const balRes = await apiClient.get("/shipper/so-du");
                    if (balRes.data?.status) setBalance(balRes.data.data?.so_du ?? 0);
                } catch {}

                setStep("select");
                setSelectedAmount(null);
                setCustomAmount("");
                setCheckoutUrl("");
                setOrderCode(null);

                showAlert(
                    "success",
                    "Nạp tiền thành công!",
                    res.data.message || "Số dư đã được cộng vào tài khoản của bạn.",
                    [{ text: "OK", style: "default", onPress: () => navigation.goBack() }]
                );
            } else {
                showAlert(
                    "warning",
                    "Chưa xác nhận được",
                    res.data?.message || "Giao dịch chưa hoàn tất. Nếu bạn đã thanh toán, số dư sẽ được cộng tự động trong vài phút.",
                    [
                        { text: "Thử lại", style: "default", onPress: () => handleConfirmPayment(code) },
                        { text: "Đóng", style: "cancel", onPress: () => setStep("select") },
                    ]
                );
            }
        } catch {
            showAlert("error", "Lỗi kết nối", "Không thể kết nối server để xác nhận.");
        } finally {
            setConfirming(false);
        }
    };

    // ── WebView navigation handler ──────────────────────
    const handleWebViewNavChange = (navState: any) => {
        const url: string = navState.url || "";
        // PayOS redirect về success hoặc cancel
        if (url.includes("success") || url.includes("PAID") || url.includes("thanh-cong")) {
            setStep("confirming");
            if (orderCode) handleConfirmPayment(orderCode);
        } else if (url.includes("cancel") || url.includes("huy") || url.includes("CANCELLED")) {
            setStep("select");
            showAlert("info", "Đã huỷ", "Bạn đã huỷ giao dịch nạp tiền.");
        }
    };

    const currentAmount = getFinalAmount();

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor={PRIMARY} barStyle="light-content" />

            {/* Header */}
            <View style={styles.headerBg}>
                <SafeAreaView edges={["top"]} style={styles.headerSafe}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => {
                            if (step === "paying") {
                                showAlert("confirm", "Huỷ thanh toán?", "Bạn muốn thoát khỏi trang thanh toán?", [
                                    { text: "Ở lại", style: "cancel" },
                                    { text: "Thoát", style: "destructive", onPress: () => setStep("select") },
                                ]);
                            } else {
                                navigation.goBack();
                            }
                        }}>
                            <Ionicons name="chevron-back" size={26} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>
                            {step === "paying" ? "Thanh toán PayOS" : "Nạp tiền vào tài khoản"}
                        </Text>
                        <View style={{ width: wp("9%") }} />
                    </View>
                </SafeAreaView>
            </View>

            {/* ── STEP: PAYING — WebView ── */}
            {step === "paying" && (
                <View style={{ flex: 1 }}>
                    <WebView
                        ref={webViewRef}
                        source={{ uri: checkoutUrl }}
                        onNavigationStateChange={handleWebViewNavChange}
                        startInLoadingState
                        renderLoading={() => (
                            <View style={styles.webviewLoading}>
                                <ActivityIndicator size="large" color={PRIMARY} />
                                <Text style={styles.webviewLoadingText}>Đang tải trang thanh toán...</Text>
                            </View>
                        )}
                        style={{ flex: 1 }}
                    />
                    {/* Manual confirm button */}
                    <View style={[styles.webviewFooter, { paddingBottom: insets.bottom > 0 ? insets.bottom : hp("1.8%") }]}>
                        <TouchableOpacity
                            style={[styles.confirmPayBtn, confirming && styles.submitBtnDisabled]}
                            onPress={() => orderCode && handleConfirmPayment(orderCode)}
                            disabled={confirming}
                            activeOpacity={0.85}
                        >
                            {confirming ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                                    <Text style={styles.submitBtnText}>Tôi đã thanh toán xong</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ── STEP: CONFIRMING — Loading ── */}
            {step === "confirming" && (
                <View style={styles.confirmingOverlay}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                    <Text style={styles.confirmingTitle}>Đang xác nhận thanh toán...</Text>
                    <Text style={styles.confirmingDesc}>Vui lòng không tắt ứng dụng</Text>
                </View>
            )}

            {/* ── STEP: SELECT AMOUNT ── */}
            {step === "select" && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Balance Card */}
                        <View style={styles.balanceCard}>
                            <View style={styles.balanceLeft}>
                                <Ionicons name="wallet-outline" size={28} color={PRIMARY} />
                                <View style={{ marginLeft: wp("3%") }}>
                                    <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
                                    <Text style={styles.balanceValue}>
                                        {balance !== null ? formatMoney(balance) : "---"}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.balanceBadge}>
                                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                                <Text style={styles.balanceBadgeText}>Đã xác thực</Text>
                            </View>
                        </View>

                        {/* Preset Amount */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Chọn số tiền nạp</Text>
                            <View style={styles.presetGrid}>
                                {PRESET_AMOUNTS.map((item) => {
                                    const isSelected = selectedAmount === item.value;
                                    return (
                                        <TouchableOpacity
                                            key={item.value}
                                            style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                                            onPress={() => {
                                                setSelectedAmount(isSelected ? null : item.value);
                                                setCustomAmount("");
                                            }}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[styles.presetBtnText, isSelected && styles.presetBtnTextActive]}>
                                                {item.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Custom Amount */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Hoặc nhập số tiền tuỳ chỉnh</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="cash-outline" size={20} color={MUTED} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="VD: 300000"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="number-pad"
                                    value={customAmount}
                                    onChangeText={(v) => {
                                        setCustomAmount(v.replace(/\D/g, ""));
                                        setSelectedAmount(null);
                                    }}
                                />
                                <Text style={styles.inputSuffix}>đ</Text>
                            </View>
                            {currentAmount >= 10000 && (
                                <Text style={styles.amountPreview}>≈ {formatMoney(currentAmount)}</Text>
                            )}
                        </View>

                        {/* PayOS info */}
                        <View style={styles.section}>
                            <View style={styles.payosInfoBox}>
                                <Ionicons name="lock-closed" size={18} color="#3B82F6" />
                                <Text style={styles.payosInfoText}>
                                    Thanh toán bảo mật qua <Text style={{ fontWeight: "800" }}>PayOS</Text> — hỗ trợ QR NAPAS, thẻ ATM, Internet Banking
                                </Text>
                            </View>
                        </View>

                        {/* Steps */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Hướng dẫn nạp tiền</Text>
                            <View style={styles.stepsCard}>
                                {[
                                    "Chọn hoặc nhập số tiền muốn nạp",
                                    "Bấm nút bên dưới để mở trang thanh toán PayOS",
                                    "Quét QR hoặc chọn phương thức thanh toán",
                                    "Sau khi thanh toán, số dư được cộng ngay lập tức",
                                ].map((s, i) => (
                                    <View key={i} style={styles.stepRow}>
                                        <View style={styles.stepNum}>
                                            <Text style={styles.stepNumText}>{i + 1}</Text>
                                        </View>
                                        <Text style={styles.stepText}>{s}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[
                                styles.submitBtn,
                                (currentAmount < 10000 || submitting) && styles.submitBtnDisabled,
                            ]}
                            onPress={handleCreateLink}
                            disabled={currentAmount < 10000 || submitting}
                            activeOpacity={0.85}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="card-outline" size={20} color="#FFF" />
                                    <Text style={styles.submitBtnText}>
                                        {currentAmount >= 10000
                                            ? `Thanh toán ${formatMoney(currentAmount)} qua PayOS`
                                            : "Chọn số tiền để tiếp tục"}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={{ height: insets.bottom > 0 ? insets.bottom + 16 : hp("3%") }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            )}

            <CustomAlert
                visible={alertConfig.visible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onDismiss={hideAlert}
            />
        </View>
    );
};

// ── BankRow helper không còn dùng — đã xoá

// ── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },

    headerBg: {
        backgroundColor: PRIMARY,
        paddingBottom: hp("2%"),
        borderBottomLeftRadius: wp("5%"),
        borderBottomRightRadius: wp("5%"),
    },
    headerSafe: { paddingTop: Platform.OS === "android" ? hp("1.5%") : 0 },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: wp("4%"),
        paddingVertical: hp("1.2%"),
    },
    backBtn: { padding: wp("1%") },
    headerTitle: { fontSize: wp("4.5%"), fontWeight: "700", color: "#FFF" },

    scrollContent: {
        paddingHorizontal: wp("5%"),
        paddingTop: hp("2.5%"),
    },

    // Balance card
    balanceCard: {
        backgroundColor: "#FFF",
        borderRadius: wp("4%"),
        padding: wp("4%"),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: hp("2.5%"),
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
    },
    balanceLeft: { flexDirection: "row", alignItems: "center" },
    balanceLabel: { fontSize: wp("3.2%"), color: MUTED, fontWeight: "600" },
    balanceValue: { fontSize: wp("5%"), fontWeight: "800", color: DARK, marginTop: 2 },
    balanceBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ECFDF5",
        borderRadius: 20,
        paddingHorizontal: wp("2.5%"),
        paddingVertical: 4,
        gap: 4,
    },
    balanceBadgeText: { fontSize: wp("2.8%"), color: "#10B981", fontWeight: "700" },

    // Sections
    section: { marginBottom: hp("2.5%") },
    sectionTitle: { fontSize: wp("3.8%"), fontWeight: "700", color: DARK, marginBottom: hp("1.5%") },

    // Preset amounts
    presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: wp("2.5%") },
    presetBtn: {
        paddingHorizontal: wp("4%"),
        paddingVertical: hp("1.2%"),
        borderRadius: wp("3%"),
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        backgroundColor: "#FFF",
    },
    presetBtnActive: { borderColor: PRIMARY, backgroundColor: "#FFF5F3" },
    presetBtnText: { fontSize: wp("3.5%"), fontWeight: "600", color: MUTED },
    presetBtnTextActive: { color: PRIMARY, fontWeight: "800" },

    // Custom input
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderRadius: wp("3%"),
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        paddingHorizontal: wp("3.5%"),
        height: hp("6.5%"),
    },
    inputIcon: { marginRight: wp("2%") },
    input: { flex: 1, fontSize: wp("3.8%"), color: DARK },
    inputSuffix: { fontSize: wp("3.8%"), color: MUTED, fontWeight: "600" },
    amountPreview: {
        fontSize: wp("3.2%"),
        color: PRIMARY,
        fontWeight: "700",
        marginTop: hp("0.8%"),
        marginLeft: wp("1%"),
    },

    // PayOS info box
    payosInfoBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#EFF6FF",
        borderRadius: wp("3%"),
        padding: wp("4%"),
        gap: 10,
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    payosInfoText: { flex: 1, fontSize: wp("3.3%"), color: "#1E40AF", lineHeight: 20 },

    // Steps
    stepsCard: {
        backgroundColor: "#FFF",
        borderRadius: wp("4%"),
        padding: wp("4%"),
        gap: hp("1.5%"),
    },
    stepRow: { flexDirection: "row", alignItems: "flex-start", gap: wp("3%") },
    stepNum: {
        width: wp("6.5%"),
        height: wp("6.5%"),
        borderRadius: wp("3.25%"),
        backgroundColor: PRIMARY,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 1,
    },
    stepNumText: { color: "#FFF", fontSize: wp("3%"), fontWeight: "800" },
    stepText: { flex: 1, fontSize: wp("3.5%"), color: MUTED, lineHeight: 20 },

    // Submit
    submitBtn: {
        backgroundColor: PRIMARY,
        borderRadius: wp("3%"),
        paddingVertical: hp("2%"),
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        elevation: 3,
        shadowColor: PRIMARY,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 5,
        marginTop: hp("1%"),
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: { color: "#FFF", fontSize: wp("3.8%"), fontWeight: "800" },

    // WebView
    webviewLoading: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFF",
        gap: 14,
    },
    webviewLoadingText: { fontSize: wp("3.5%"), color: MUTED, fontWeight: "600" },
    webviewFooter: {
        backgroundColor: "#FFF",
        paddingHorizontal: wp("5%"),
        paddingVertical: hp("1.8%"),
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
    },
    confirmPayBtn: {
        backgroundColor: "#10B981",
        borderRadius: wp("3%"),
        paddingVertical: hp("1.8%"),
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },

    // Confirming overlay
    confirmingOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
        backgroundColor: "#FFF",
    },
    confirmingTitle: { fontSize: wp("4.5%"), fontWeight: "800", color: DARK },
    confirmingDesc: { fontSize: wp("3.5%"), color: MUTED },
});

export default ShipperTopUp;
