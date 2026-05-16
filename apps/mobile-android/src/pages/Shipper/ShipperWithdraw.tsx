import React, { useState, useEffect } from "react";
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
    Alert,
    Modal,
    FlatList,
    Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
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
    { label: "500.000đ", value: 500000 },
    { label: "1.000.000đ", value: 1000000 },
];

const formatMoney = (value: number): string => {
    if (!value) return "0đ";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
};

const ShipperWithdraw = ({ navigation }: any) => {
    const [balance, setBalance] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState("");
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
    
    const [submitting, setSubmitting] = useState(false);
    const [showAddBank, setShowAddBank] = useState(false);
    
    // Add bank state
    const [newBank, setNewBank] = useState({
        ten_ngan_hang: "",
        so_tai_khoan: "",
        chu_tai_khoan: "",
    });

    const [bankList, setBankList] = useState<any[]>([]);
    const [showBankModal, setShowBankModal] = useState(false);
    const [bankSearch, setBankSearch] = useState("");

    const insets = useSafeAreaInsets();

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

    const fetchData = async () => {
        try {
            const userDataStr = await AsyncStorage.getItem("userData");
            const userData = userDataStr ? JSON.parse(userDataStr) : {};
            const id_shipper = userData.id;

            if (id_shipper) {
                // Fetch balance
                apiClient.get("/wallet/chi-tiet", {
                    params: { loai_vi: "shipper", id_chu_vi: id_shipper },
                }).then(res => {
                    if (res.data?.status) {
                        setBalance(res.data.data?.vi?.so_du ?? 0);
                    }
                });

                // Fetch banks
                apiClient.get("/wallet/tai-khoan", {
                    params: { loai_chu: "shipper", id_chu: id_shipper },
                }).then(res => {
                    if (res.data?.status) {
                        setBankAccounts(res.data.data || []);
                        if (res.data.data && res.data.data.length > 0) {
                            setSelectedBankId(res.data.data[0].id);
                        }
                    }
                });
                // Fetch banks list from VietQR for adding new bank
                fetch("https://api.vietqr.io/v2/banks")
                    .then(res => res.json())
                    .then(res => {
                        if (res.code === "00" && res.data) {
                            setBankList(res.data);
                        }
                    })
                    .catch(e => console.log("Lỗi fetch bank list:", e));
            }
        } catch (error) {
            console.log("Fetch withdraw data error:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getFinalAmount = (): number => {
        if (selectedAmount) return selectedAmount;
        const parsed = parseInt(customAmount.replace(/\D/g, ""), 10);
        return isNaN(parsed) ? 0 : parsed;
    };

    const handleAddBank = async () => {
        if (!newBank.ten_ngan_hang || !newBank.so_tai_khoan || !newBank.chu_tai_khoan) {
            Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin ngân hàng.");
            return;
        }
        
        try {
            const userDataStr = await AsyncStorage.getItem("userData");
            const userData = userDataStr ? JSON.parse(userDataStr) : {};
            const id_shipper = userData.id;

            const res = await apiClient.post("/wallet/them-tai-khoan", {
                loai_chu: "shipper",
                id_chu: id_shipper,
                ...newBank,
                is_default: bankAccounts.length === 0,
            });

            if (res.data?.status) {
                Alert.alert("Thành công", "Đã thêm tài khoản ngân hàng.");
                setShowAddBank(false);
                setNewBank({ ten_ngan_hang: "", so_tai_khoan: "", chu_tai_khoan: "" });
                fetchData();
            } else {
                Alert.alert("Lỗi", res.data?.message || "Không thể thêm tài khoản.");
            }
        } catch (error) {
            Alert.alert("Lỗi", "Có lỗi xảy ra, vui lòng thử lại.");
        }
    };

    const handleWithdraw = async () => {
        const amount = getFinalAmount();
        
        if (amount < 10000) {
            showAlert("warning", "Lỗi", "Số tiền rút tối thiểu là 10.000đ");
            return;
        }
        if (balance !== null && amount > balance) {
            showAlert("warning", "Lỗi", "Số dư không đủ để thực hiện giao dịch này.");
            return;
        }
        if (!selectedBankId) {
            showAlert("warning", "Lỗi", "Vui lòng chọn tài khoản ngân hàng.");
            return;
        }

        setSubmitting(true);
        try {
            const userDataStr = await AsyncStorage.getItem("userData");
            const userData = userDataStr ? JSON.parse(userDataStr) : {};
            const id_shipper = userData.id;

            const res = await apiClient.post("/wallet/yeu-cau-rut-tien", {
                loai_vi: "shipper",
                id_chu_vi: id_shipper,
                id_bank_account: selectedBankId,
                so_tien_rut: amount,
            });

            if (res.data?.status) {
                showAlert(
                    "success",
                    "Đã gửi yêu cầu",
                    res.data.message || "Yêu cầu rút tiền của bạn đang được xử lý.",
                    [{ text: "Hoàn tất", style: "default", onPress: () => navigation.goBack() }]
                );
            } else {
                showAlert("error", "Lỗi", res.data?.message || "Không thể tạo yêu cầu rút tiền.");
            }
        } catch (error: any) {
            showAlert("error", "Lỗi", error?.response?.data?.message || "Có lỗi kết nối, vui lòng thử lại.");
        } finally {
            setSubmitting(false);
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
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={26} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Rút tiền về thẻ</Text>
                        <View style={{ width: wp("9%") }} />
                    </View>
                </SafeAreaView>
            </View>

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
                            <Ionicons name="wallet" size={28} color={PRIMARY} />
                            <View style={{ marginLeft: wp("3%") }}>
                                <Text style={styles.balanceLabel}>Có thể rút</Text>
                                <Text style={styles.balanceValue}>
                                    {balance !== null ? formatMoney(balance) : "---"}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => {
                            if (balance) {
                                setSelectedAmount(null);
                                setCustomAmount(balance.toString());
                            }
                        }}>
                            <Text style={styles.withdrawAllText}>Rút toàn bộ</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Bank Accounts */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tài khoản nhận tiền</Text>
                        
                        {bankAccounts.map((bank) => (
                            <TouchableOpacity
                                key={bank.id}
                                style={[
                                    styles.bankCard,
                                    selectedBankId === bank.id && styles.bankCardActive
                                ]}
                                onPress={() => setSelectedBankId(bank.id)}
                            >
                                <View style={styles.bankIcon}>
                                    <Ionicons name="business" size={24} color={selectedBankId === bank.id ? PRIMARY : MUTED} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.bankName}>{bank.ten_ngan_hang}</Text>
                                    <Text style={styles.bankAccount}>{bank.so_tai_khoan}</Text>
                                    <Text style={styles.bankOwner}>{bank.chu_tai_khoan}</Text>
                                </View>
                                {selectedBankId === bank.id && (
                                    <Ionicons name="checkmark-circle" size={24} color={PRIMARY} />
                                )}
                            </TouchableOpacity>
                        ))}

                        {showAddBank ? (
                            <View style={styles.addBankForm}>
                                <Text style={styles.addBankTitle}>Thêm ngân hàng mới</Text>
                                <TouchableOpacity
                                    style={[styles.addBankInput, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                                    onPress={() => setShowBankModal(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{ color: newBank.ten_ngan_hang ? DARK : "#94A3B8", fontSize: wp("3.5%") }}>
                                        {newBank.ten_ngan_hang || "Chọn ngân hàng"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={18} color="#94A3B8" />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.addBankInput}
                                    placeholder="Số tài khoản"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="number-pad"
                                    value={newBank.so_tai_khoan}
                                    onChangeText={(v) => setNewBank({ ...newBank, so_tai_khoan: v })}
                                />
                                <TextInput
                                    style={styles.addBankInput}
                                    placeholder="Tên chủ tài khoản (Không dấu)"
                                    placeholderTextColor="#94A3B8"
                                    autoCapitalize="characters"
                                    value={newBank.chu_tai_khoan}
                                    onChangeText={(v) => setNewBank({ ...newBank, chu_tai_khoan: v.toUpperCase() })}
                                />
                                <View style={styles.addBankActions}>
                                    <TouchableOpacity style={styles.addBankBtnCancel} onPress={() => setShowAddBank(false)}>
                                        <Text style={styles.addBankBtnCancelText}>Hủy</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.addBankBtnSubmit} onPress={handleAddBank}>
                                        <Text style={styles.addBankBtnSubmitText}>Thêm</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.addBankBtn} onPress={() => setShowAddBank(true)}>
                                <Ionicons name="add-circle-outline" size={20} color={PRIMARY} />
                                <Text style={styles.addBankText}>Thêm tài khoản ngân hàng</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Amount Input */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Nhập số tiền muốn rút</Text>
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
                        {currentAmount > 0 && currentAmount < 10000 && (
                            <Text style={styles.errorText}>Số tiền rút tối thiểu là 10.000đ</Text>
                        )}
                    </View>

                    {/* Preset Amounts */}
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

                    {/* Info */}
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={18} color="#3B82F6" />
                        <Text style={styles.infoText}>
                            Thời gian xử lý giao dịch thường mất từ 5-15 phút. Trong trường hợp ngân hàng bảo trì có thể lâu hơn.
                        </Text>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.submitBtn,
                            (currentAmount < 10000 || !selectedBankId || submitting) && styles.submitBtnDisabled,
                        ]}
                        onPress={handleWithdraw}
                        disabled={currentAmount < 10000 || !selectedBankId || submitting}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Text style={styles.submitBtnText}>Rút {formatMoney(currentAmount)}</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: insets.bottom > 0 ? insets.bottom + 16 : hp("3%") }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modal Chọn Ngân Hàng */}
            <Modal
                visible={showBankModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowBankModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn Ngân Hàng</Text>
                            <TouchableOpacity onPress={() => setShowBankModal(false)}>
                                <Ionicons name="close" size={24} color={DARK} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm kiếm ngân hàng..."
                            value={bankSearch}
                            onChangeText={setBankSearch}
                        />
                        <FlatList
                            data={bankList.filter(b => 
                                b.shortName?.toLowerCase().includes(bankSearch.toLowerCase()) || 
                                b.name?.toLowerCase().includes(bankSearch.toLowerCase())
                            )}
                            keyExtractor={(item) => item.bin}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.bankListItem}
                                    onPress={() => {
                                        setNewBank({ ...newBank, ten_ngan_hang: item.shortName });
                                        setShowBankModal(false);
                                    }}
                                >
                                    {item.logo ? (
                                        <Image source={{ uri: item.logo }} style={styles.bankListLogo} resizeMode="contain" />
                                    ) : (
                                        <View style={[styles.bankListLogo, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                                            <Ionicons name="business" size={16} color={MUTED} />
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.bankListShortName}>{item.shortName}</Text>
                                        <Text style={styles.bankListFullName}>{item.name}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

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
    scrollContent: { paddingHorizontal: wp("5%"), paddingTop: hp("2.5%") },
    
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
    withdrawAllText: { fontSize: wp("3.5%"), color: PRIMARY, fontWeight: "700" },

    section: { marginBottom: hp("2.5%") },
    sectionTitle: { fontSize: wp("3.8%"), fontWeight: "700", color: DARK, marginBottom: hp("1.5%") },

    bankCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderRadius: wp("3%"),
        padding: wp("4%"),
        marginBottom: hp("1%"),
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
    },
    bankCardActive: { borderColor: PRIMARY, backgroundColor: "#FFF5F3" },
    bankIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
        marginRight: wp("3%"),
    },
    bankName: { fontSize: wp("3.8%"), fontWeight: "700", color: DARK },
    bankAccount: { fontSize: wp("3.5%"), color: MUTED, marginTop: 2 },
    bankOwner: { fontSize: wp("3.2%"), color: MUTED, marginTop: 2, textTransform: "uppercase" },

    addBankBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: hp("1.5%"),
        borderWidth: 1,
        borderColor: PRIMARY,
        borderStyle: "dashed",
        borderRadius: wp("3%"),
        marginTop: hp("1%"),
        gap: 6,
    },
    addBankText: { color: PRIMARY, fontWeight: "600", fontSize: wp("3.5%") },

    addBankForm: {
        backgroundColor: "#FFF",
        padding: wp("4%"),
        borderRadius: wp("3%"),
        marginTop: hp("1%"),
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    addBankTitle: { fontSize: wp("3.8%"), fontWeight: "700", color: DARK, marginBottom: hp("1.5%") },
    addBankInput: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: wp("2%"),
        paddingHorizontal: wp("3%"),
        paddingVertical: hp("1.2%"),
        fontSize: wp("3.5%"),
        marginBottom: hp("1%"),
    },
    addBankActions: { flexDirection: "row", justifyContent: "flex-end", gap: wp("3%"), marginTop: hp("1%") },
    addBankBtnCancel: { paddingHorizontal: wp("4%"), paddingVertical: hp("1%") },
    addBankBtnCancelText: { color: MUTED, fontWeight: "600" },
    addBankBtnSubmit: { backgroundColor: PRIMARY, paddingHorizontal: wp("5%"), paddingVertical: hp("1%"), borderRadius: wp("2%") },
    addBankBtnSubmitText: { color: "#FFF", fontWeight: "700" },

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
    errorText: { color: "#EF4444", fontSize: wp("3%"), marginTop: 4, marginLeft: 4 },

    presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: wp("2.5%"), marginBottom: hp("2.5%") },
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

    infoBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#EFF6FF",
        borderRadius: wp("3%"),
        padding: wp("4%"),
        gap: 10,
        marginBottom: hp("3%"),
    },
    infoText: { flex: 1, fontSize: wp("3.2%"), color: "#1E40AF", lineHeight: 18 },

    submitBtn: {
        backgroundColor: PRIMARY,
        borderRadius: wp("3%"),
        paddingVertical: hp("2%"),
        alignItems: "center",
        justifyContent: "center",
        elevation: 3,
        shadowColor: PRIMARY,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 5,
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: { color: "#FFF", fontSize: wp("4%"), fontWeight: "800" },

    // Modal Ngân Hàng
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: wp("5%"),
        borderTopRightRadius: wp("5%"),
        height: hp("70%"),
        paddingBottom: hp("4%"),
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: wp("4%"),
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    modalTitle: { fontSize: wp("4.5%"), fontWeight: "700", color: DARK },
    searchInput: {
        margin: wp("4%"),
        paddingHorizontal: wp("3%"),
        paddingVertical: hp("1%"),
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: wp("2%"),
        backgroundColor: "#F8FAFC",
    },
    bankListItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: wp("4%"),
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    bankListLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: wp("3%"),
    },
    bankListShortName: { fontSize: wp("3.8%"), fontWeight: "700", color: DARK },
    bankListFullName: { fontSize: wp("3%"), color: MUTED, marginTop: 2 },
});

export default ShipperWithdraw;
