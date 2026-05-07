import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    FlatList,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../../genaral/api";
import LoadingModal from "../../components/LoadingModal";
import AlertModal from "../../components/AlertModal";
import ConfirmModal from "../../components/ConfirmModal";

const PRIMARY_COLOR = "#EE4D2D";
const BACKGROUND_COLOR = "#F5F6F8";
const TEXT_DARK = "#1E293B";
const TEXT_MUTED = "#64748B";

interface BankAccount {
    id: number;
    ten_ngan_hang: string;
    so_tai_khoan: string;
    chu_tai_khoan: string;
    is_default: boolean;
}

interface WithdrawHistory {
    id: number;
    so_tien_rut: number;
    trang_thai: string;
    noi_dung_chuyen_khoan: string;
    ten_ngan_hang: string;
    so_tai_khoan: string;
    created_at: string;
    thoi_gian_duyet?: string;
    thoi_gian_chuyen?: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
    cho_duyet: { label: "Chờ duyệt", color: "#F59E0B" },
    da_duyet: { label: "Đã duyệt", color: "#3B82F6" },
    tu_choi: { label: "Từ chối", color: "#EF4444" },
    da_chuyen: { label: "Đã chuyển", color: "#10B981" },
    huy: { label: "Đã hủy", color: "#94A3B8" },
};

const ShipperWithdraw = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState("0đ");
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
    const [amount, setAmount] = useState("");
    const [history, setHistory] = useState<WithdrawHistory[]>([]);
    const [showBankModal, setShowBankModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [isAddingBank, setIsAddingBank] = useState(false);
    const [newBank, setNewBank] = useState({
        ten_ngan_hang: "",
        so_tai_khoan: "",
        chu_tai_khoan: "",
    });
    const [activeTab, setActiveTab] = useState<"rut" | "lich-su">("rut");
    const [confirmState, setConfirmState] = useState({
        visible: false,
        title: "",
        message: "",
        soTien: 0,
        onConfirm: () => {},
    });
    const [alertState, setAlertState] = useState({
        visible: false,
        type: "info" as "success" | "error" | "warning" | "info",
        title: "",
        message: "",
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const userDataString = await AsyncStorage.getItem("userData");
            const userData = userDataString ? JSON.parse(userDataString) : {};
            const idShipper = userData.id;

            const [balanceRes, bankRes, historyRes] = await Promise.allSettled([
                apiClient.get("/wallet/chi-tiet", {
                    params: { loai_vi: "shipper", id_chu_vi: idShipper },
                }),
                apiClient.get("/wallet/tai-khoan", {
                    params: { loai_chu: "shipper", id_chu: idShipper },
                }),
                apiClient.get("/wallet/lich-su-rut", {
                    params: { loai_vi: "shipper", id_chu_vi: idShipper },
                }),
            ]);

            if (balanceRes.status === "fulfilled" && balanceRes.value.data?.status) {
                const soDu: number = balanceRes.value.data.data?.vi?.so_du ?? 0;
                setBalance(
                    new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                    }).format(soDu)
                );
            }

            if (bankRes.status === "fulfilled" && bankRes.value.data?.data) {
                const accounts = bankRes.value.data.data as BankAccount[];
                setBankAccounts(accounts);
                const defaultAcc = accounts.find((a: any) => a.is_default) || accounts[0];
                if (defaultAcc) setSelectedBank(defaultAcc);
            }

            if (historyRes.status === "fulfilled" && historyRes.value.data?.data) {
                setHistory(historyRes.value.data.data);
            }
        } catch (error) {
            console.log("Error fetching withdraw data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async () => {
        if (!selectedBank) {
            setAlertState({ visible: true, type: "warning", title: "Thông báo", message: "Vui lòng chọn tài khoản ngân hàng" });
            return;
        }

        const soTien = parseInt(amount.replace(/[^0-9]/g, ""), 10);
        if (!soTien || soTien < 10000) {
            setAlertState({ visible: true, type: "warning", title: "Thông báo", message: "Số tiền rút tối thiểu là 10.000đ" });
            return;
        }

        setConfirmState({
            visible: true,
            title: "Xác nhận rút tiền",
            message: `Bạn muốn rút ${formatCurrency(soTien)} về tài khoản ${selectedBank.ten_ngan_hang} ****${selectedBank.so_tai_khoan.slice(-4)}?`,
            soTien,
            onConfirm: async () => {
                setConfirmState({ ...confirmState, visible: false });
                setLoading(true);
                try {
                    const userDataString = await AsyncStorage.getItem("userData");
                    const userData = userDataString ? JSON.parse(userDataString) : {};

                    const res = await apiClient.post("/wallet/yeu-cau-rut-tien", {
                        loai_vi: "shipper",
                        id_chu_vi: userData.id,
                        so_tien_rut: soTien,
                        id_bank_account: selectedBank.id,
                    });

                    if (res.data.status) {
                        setAlertState({ visible: true, type: "success", title: "Thành công", message: "Yêu cầu rút tiền đã được gửi!" });
                        setAmount("");
                        fetchData();
                    } else {
                        setAlertState({ visible: true, type: "error", title: "Lỗi", message: res.data.message || "Không thể tạo yêu cầu" });
                    }
                } catch (error: any) {
                    console.log("Withdraw error:", error);
                    const message = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
                    setAlertState({ visible: true, type: "error", title: "Lỗi", message });
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    const handleAddBank = async () => {
        if (!newBank.ten_ngan_hang || !newBank.so_tai_khoan || !newBank.chu_tai_khoan) {
            setAlertState({ visible: true, type: "warning", title: "Thông báo", message: "Vui lòng điền đầy đủ thông tin" });
            return;
        }

        setLoading(true);
        try {
            const userDataString = await AsyncStorage.getItem("userData");
            const userData = userDataString ? JSON.parse(userDataString) : {};

            const res = await apiClient.post("/wallet/them-tai-khoan", {
                loai_chu: "shipper",
                id_chu: userData.id,
                ten_ngan_hang: newBank.ten_ngan_hang,
                so_tai_khoan: newBank.so_tai_khoan,
                chu_tai_khoan: newBank.chu_tai_khoan,
            });

            if (res.data.status) {
                setAlertState({ visible: true, type: "success", title: "Thành công", message: "Đã thêm tài khoản ngân hàng" });
                setNewBank({ ten_ngan_hang: "", so_tai_khoan: "", chu_tai_khoan: "" });
                setIsAddingBank(false);
                fetchData();
            } else {
                setAlertState({ visible: true, type: "error", title: "Lỗi", message: res.data.message || "Không thể thêm tài khoản" });
            }
        } catch (error: any) {
            console.log("Add bank error:", error);
            const message = error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi thêm tài khoản";
            setAlertState({ visible: true, type: "error", title: "Lỗi", message });
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(value);
    };

    const formatInputAmount = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, "");
        setAmount(cleaned ? parseInt(cleaned, 10).toLocaleString("vi-VN") : "");
    };

    const handleQuickAmount = (percent: number) => {
        const currentBalance = parseInt(balance.replace(/[^0-9]/g, ""), 10);
        const value = Math.floor(currentBalance * percent);
        setAmount(value.toLocaleString("vi-VN"));
    };

    const renderStatusBadge = (status: string) => {
        const config = statusLabels[status] || { label: status, color: TEXT_MUTED };
        return (
            <View style={[styles.statusBadge, { backgroundColor: config.color + "20" }]}>
                <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <LoadingModal visible={loading} />

            <AlertModal
                visible={alertState.visible}
                type={alertState.type}
                title={alertState.title}
                message={alertState.message}
                onClose={() => setAlertState({ ...alertState, visible: false })}
            />

            <ConfirmModal
                visible={confirmState.visible}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={() => setConfirmState({ ...confirmState, visible: false })}
            />

            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rút tiền về ngân hàng</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* TABS */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "rut" && styles.tabActive]}
                    onPress={() => setActiveTab("rut")}
                >
                    <Text style={[styles.tabText, activeTab === "rut" && styles.tabTextActive]}>
                        Rút tiền
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "lich-su" && styles.tabActive]}
                    onPress={() => setActiveTab("lich-su")}
                >
                    <Text style={[styles.tabText, activeTab === "lich-su" && styles.tabTextActive]}>
                        Lịch sử
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === "rut" ? (
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* SỐ DƯ */}
                    <View style={styles.balanceCard}>
                        <View style={styles.balanceHeader}>
                            <Ionicons name="wallet" size={22} color={PRIMARY_COLOR} />
                            <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
                        </View>
                        <Text style={styles.balanceValue}>{balance}</Text>
                    </View>

                    {/* CHỌN NGÂN HÀNG */}
                    <Text style={styles.sectionTitle}>Tài khoản nhận tiền</Text>
                    <TouchableOpacity
                        style={styles.bankSelector}
                        onPress={() => setShowBankModal(true)}
                    >
                        {selectedBank ? (
                            <View style={styles.selectedBankInfo}>
                                <View style={styles.bankIconWrap}>
                                    <Ionicons name="business" size={22} color={PRIMARY_COLOR} />
                                </View>
                                <View style={styles.bankDetails}>
                                    <Text style={styles.bankName}>{selectedBank.ten_ngan_hang}</Text>
                                    <Text style={styles.bankAccount}>
                                        {selectedBank.chu_tai_khoan} •••• {selectedBank.so_tai_khoan.slice(-4)}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.noBankSelected}>
                                <Ionicons name="add-circle-outline" size={22} color={PRIMARY_COLOR} />
                                <Text style={styles.noBankText}>Thêm tài khoản ngân hàng</Text>
                            </View>
                        )}
                        <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
                    </TouchableOpacity>

                    {/* NHẬP SỐ TIỀN */}
                    <Text style={styles.sectionTitle}>Số tiền rút</Text>
                    <View style={styles.amountInputWrap}>
                        <Text style={styles.currencySymbol}>đ</Text>
                        <TextInput
                            style={styles.amountInput}
                            placeholder="0"
                            placeholderTextColor={TEXT_MUTED}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={formatInputAmount}
                        />
                    </View>
                    <Text style={styles.minAmount}>Tối thiểu: 10.000đ</Text>

                    {/* QUICK AMOUNT BUTTONS */}
                    <View style={styles.quickAmountRow}>
                        {[0.25, 0.5, 0.75, 1].map((pct) => (
                            <TouchableOpacity
                                key={pct}
                                style={styles.quickAmountBtn}
                                onPress={() => handleQuickAmount(pct)}
                            >
                                <Text style={styles.quickAmountText}>
                                    {pct === 1 ? "Tất cả" : `${pct * 100}%`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* NÚT RÚT TIỀN */}
                    <TouchableOpacity
                        style={[
                            styles.withdrawBtn,
                            (!selectedBank || !amount) && styles.withdrawBtnDisabled,
                        ]}
                        onPress={handleWithdraw}
                        disabled={!selectedBank || !amount}
                    >
                        <Text style={styles.withdrawBtnText}>Rút tiền</Text>
                    </TouchableOpacity>

                    {/* LƯU Ý */}
                    <View style={styles.noteCard}>
                        <Ionicons name="information-circle" size={18} color={TEXT_MUTED} />
                        <Text style={styles.noteText}>
                            Yêu cầu rút tiền sẽ được xử lý trong 5-15 phút. Phí giao dịch: 0đ
                        </Text>
                    </View>
                </ScrollView>
            ) : (
                /* LỊCH SỬ */
                <FlatList
                    data={history}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.historyList}
                    ListEmptyComponent={
                        <View style={styles.emptyHistory}>
                            <Ionicons name="receipt-outline" size={48} color={TEXT_MUTED} />
                            <Text style={styles.emptyText}>Chưa có yêu cầu rút tiền</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.historyItem}>
                            <View style={styles.historyTop}>
                                <View>
                                    <Text style={styles.historyAmount}>{formatCurrency(item.so_tien_rut)}</Text>
                                    <Text style={styles.historyBank}>
                                        {item.ten_ngan_hang} •••• {String(item.so_tai_khoan).slice(-4)}
                                    </Text>
                                </View>
                                {renderStatusBadge(item.trang_thai)}
                            </View>
                            <View style={styles.historyMeta}>
                                <Text style={styles.historyDate}>
                                    {new Date(item.created_at).toLocaleDateString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </Text>
                                {item.noi_dung_chuyen_khoan && (
                                    <Text style={styles.historyRef}>REF: {item.noi_dung_chuyen_khoan}</Text>
                                )}
                            </View>
                        </View>
                    )}
                />
            )}

            {/* MODAL CHỌN NGÂN HÀNG */}
            <Modal visible={showBankModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn tài khoản ngân hàng</Text>
                            <TouchableOpacity onPress={() => setShowBankModal(false)}>
                                <Ionicons name="close" size={24} color={TEXT_DARK} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={bankAccounts}
                            keyExtractor={(item) => String(item.id)}
                            style={styles.bankList}
                            ListHeaderComponent={
                                <TouchableOpacity
                                    style={styles.addBankBtn}
                                    onPress={() => {
                                        setShowBankModal(false);
                                        setIsAddingBank(true);
                                    }}
                                >
                                    <Ionicons name="add-circle" size={22} color={PRIMARY_COLOR} />
                                    <Text style={styles.addBankText}>Thêm tài khoản mới</Text>
                                </TouchableOpacity>
                            }
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.bankOption}
                                    onPress={() => {
                                        setSelectedBank(item);
                                        setShowBankModal(false);
                                    }}
                                >
                                    <View style={styles.bankIconWrap2}>
                                        <Ionicons name="business" size={20} color={PRIMARY_COLOR} />
                                    </View>
                                    <View style={styles.bankOptionInfo}>
                                        <Text style={styles.bankOptionName}>{item.ten_ngan_hang}</Text>
                                        <Text style={styles.bankOptionAccount}>
                                            {item.chu_tai_khoan} •••• {item.so_tai_khoan.slice(-4)}
                                        </Text>
                                    </View>
                                    {item.is_default && (
                                        <View style={styles.defaultBadge}>
                                            <Text style={styles.defaultBadgeText}>Mặc định</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* MODAL THÊM NGÂN HÀNG */}
            <Modal visible={isAddingBank} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Thêm tài khoản ngân hàng</Text>
                                <TouchableOpacity onPress={() => setIsAddingBank(false)}>
                                    <Ionicons name="close" size={24} color={TEXT_DARK} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Tên ngân hàng</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="VD: Vietcombank"
                                    placeholderTextColor={TEXT_MUTED}
                                    value={newBank.ten_ngan_hang}
                                    onChangeText={(t) => setNewBank((p) => ({ ...p, ten_ngan_hang: t }))}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Số tài khoản</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Nhập số tài khoản"
                                    placeholderTextColor={TEXT_MUTED}
                                    keyboardType="numeric"
                                    value={newBank.so_tai_khoan}
                                    onChangeText={(t) => setNewBank((p) => ({ ...p, so_tai_khoan: t }))}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Tên chủ tài khoản</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Nhập tên chủ tài khoản"
                                    placeholderTextColor={TEXT_MUTED}
                                    autoCapitalize="words"
                                    value={newBank.chu_tai_khoan}
                                    onChangeText={(t) => setNewBank((p) => ({ ...p, chu_tai_khoan: t }))}
                                />
                            </View>

                            <TouchableOpacity style={styles.saveBankBtn} onPress={handleAddBank}>
                                <Text style={styles.saveBankBtnText}>Lưu tài khoản</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
    header: {
        backgroundColor: PRIMARY_COLOR,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: wp("4%"),
        paddingVertical: hp("1.5%"),
    },
    backBtn: { padding: wp("1%") },
    headerTitle: {
        color: "#FFF",
        fontSize: wp("4.5%"),
        fontWeight: "700",
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#FFF",
        paddingHorizontal: wp("5%"),
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    tab: {
        flex: 1,
        paddingVertical: hp("1.5%"),
        alignItems: "center",
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: PRIMARY_COLOR,
    },
    tabText: {
        fontSize: wp("3.8%"),
        color: TEXT_MUTED,
        fontWeight: "500",
    },
    tabTextActive: {
        color: PRIMARY_COLOR,
        fontWeight: "700",
    },
    content: { flex: 1, paddingHorizontal: wp("5%"), paddingTop: hp("2%") },
    balanceCard: {
        backgroundColor: "#FFF",
        borderRadius: wp("4%"),
        padding: wp("4%"),
        marginBottom: hp("2.5%"),
    },
    balanceHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    balanceLabel: { fontSize: wp("3.5%"), color: TEXT_MUTED },
    balanceValue: {
        fontSize: wp("8%"),
        fontWeight: "900",
        color: TEXT_DARK,
        marginTop: hp("0.5%"),
    },
    sectionTitle: {
        fontSize: wp("3.8%"),
        fontWeight: "600",
        color: TEXT_DARK,
        marginBottom: hp("1%"),
    },
    bankSelector: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderRadius: wp("3%"),
        padding: wp("3.5%"),
        marginBottom: hp("2.5%"),
        justifyContent: "space-between",
    },
    selectedBankInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
    bankIconWrap: {
        width: wp("10%"),
        height: wp("10%"),
        borderRadius: wp("5%"),
        backgroundColor: "#FFF5F3",
        justifyContent: "center",
        alignItems: "center",
        marginRight: wp("3%"),
    },
    bankDetails: { flex: 1 },
    bankName: { fontSize: wp("3.8%"), fontWeight: "700", color: TEXT_DARK },
    bankAccount: { fontSize: wp("3%"), color: TEXT_MUTED, marginTop: 2 },
    noBankSelected: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    noBankText: { fontSize: wp("3.8%"), color: PRIMARY_COLOR, fontWeight: "500" },
    amountInputWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderRadius: wp("3%"),
        paddingHorizontal: wp("4%"),
        marginBottom: hp("0.5%"),
    },
    currencySymbol: {
        fontSize: wp("7%"),
        fontWeight: "700",
        color: TEXT_DARK,
        marginRight: 4,
    },
    amountInput: {
        flex: 1,
        fontSize: wp("7%"),
        fontWeight: "700",
        color: TEXT_DARK,
        paddingVertical: hp("1.5%"),
    },
    minAmount: { fontSize: wp("3%"), color: TEXT_MUTED, marginBottom: hp("1.5%") },
    quickAmountRow: {
        flexDirection: "row",
        gap: wp("2.5%"),
        marginBottom: hp("3%"),
    },
    quickAmountBtn: {
        flex: 1,
        backgroundColor: "#FFF",
        paddingVertical: hp("1.2%"),
        borderRadius: wp("3%"),
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    quickAmountText: {
        fontSize: wp("3.3%"),
        fontWeight: "600",
        color: PRIMARY_COLOR,
    },
    withdrawBtn: {
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: hp("1.8%"),
        borderRadius: wp("3%"),
        alignItems: "center",
        marginBottom: hp("2%"),
    },
    withdrawBtnDisabled: {
        backgroundColor: "#FECACA",
    },
    withdrawBtnText: {
        color: "#FFF",
        fontSize: wp("4.2%"),
        fontWeight: "800",
    },
    noteCard: {
        flexDirection: "row",
        backgroundColor: "#FFF",
        padding: wp("3.5%"),
        borderRadius: wp("3%"),
        gap: 8,
        marginBottom: hp("3%"),
    },
    noteText: {
        flex: 1,
        fontSize: wp("3%"),
        color: TEXT_MUTED,
        lineHeight: 18,
    },
    historyList: { padding: wp("5%"), paddingBottom: hp("10%") },
    emptyHistory: { alignItems: "center", marginTop: hp("10%") },
    emptyText: { fontSize: wp("3.8%"), color: TEXT_MUTED, marginTop: hp("1.5%") },
    historyItem: {
        backgroundColor: "#FFF",
        borderRadius: wp("3%"),
        padding: wp("4%"),
        marginBottom: hp("1.5%"),
    },
    historyTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    historyAmount: { fontSize: wp("4.5%"), fontWeight: "800", color: TEXT_DARK },
    historyBank: { fontSize: wp("3%"), color: TEXT_MUTED, marginTop: 2 },
    statusBadge: {
        paddingHorizontal: wp("2.5%"),
        paddingVertical: hp("0.4%"),
        borderRadius: wp("2%"),
    },
    statusText: { fontSize: wp("2.8%"), fontWeight: "600" },
    historyMeta: { marginTop: hp("1%") },
    historyDate: { fontSize: wp("2.8%"), color: TEXT_MUTED },
    historyRef: { fontSize: wp("2.5%"), color: TEXT_MUTED, marginTop: 2 },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: wp("5%"),
        borderTopRightRadius: wp("5%"),
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: wp("5%"),
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    modalTitle: { fontSize: wp("4.2%"), fontWeight: "700", color: TEXT_DARK },
    bankList: { paddingHorizontal: wp("5%"), paddingBottom: hp("5%") },
    addBankBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: hp("1.5%"),
        marginBottom: hp("1%"),
    },
    addBankText: { fontSize: wp("3.8%"), color: PRIMARY_COLOR, fontWeight: "600" },
    bankOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: hp("1.5%"),
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    bankIconWrap2: {
        width: wp("10%"),
        height: wp("10%"),
        borderRadius: wp("5%"),
        backgroundColor: "#FFF5F3",
        justifyContent: "center",
        alignItems: "center",
        marginRight: wp("3%"),
    },
    bankOptionInfo: { flex: 1 },
    bankOptionName: { fontSize: wp("3.8%"), fontWeight: "600", color: TEXT_DARK },
    bankOptionAccount: { fontSize: wp("3%"), color: TEXT_MUTED, marginTop: 2 },
    defaultBadge: {
        backgroundColor: "#DCFCE7",
        paddingHorizontal: wp("2%"),
        paddingVertical: hp("0.3%"),
        borderRadius: wp("1.5%"),
    },
    defaultBadgeText: { fontSize: wp("2.5%"), color: "#16A34A", fontWeight: "600" },
    formGroup: { marginBottom: hp("2%"), paddingHorizontal: wp("5%") },
    formLabel: { fontSize: wp("3.5%"), fontWeight: "600", color: TEXT_DARK, marginBottom: hp("0.8%") },
    formInput: {
        backgroundColor: "#F8FAFC",
        borderRadius: wp("3%"),
        paddingHorizontal: wp("4%"),
        paddingVertical: hp("1.5%"),
        fontSize: wp("3.8%"),
        color: TEXT_DARK,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    saveBankBtn: {
        backgroundColor: PRIMARY_COLOR,
        marginHorizontal: wp("5%"),
        paddingVertical: hp("1.8%"),
        borderRadius: wp("3%"),
        alignItems: "center",
        marginBottom: hp("3%"),
    },
    saveBankBtnText: { color: "#FFF", fontSize: wp("4%"), fontWeight: "800" },
});

export default ShipperWithdraw;
