import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    Platform,
    RefreshControl,
    ActivityIndicator,
    TextInput,
} from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import apiClient from "../../genaral/api";

const PRIMARY_COLOR = "#EE4D2D";
const BACKGROUND_COLOR = "#F8FAFC";
const TEXT_DARK = "#1E293B";
const TEXT_MUTED = "#64748B";

type FilterType = "all" | "percent" | "fixed";

interface Voucher {
    id: number;
    ten_voucher: string;
    ma_code: string;
    mo_ta?: string;
    so_tien_giam_mo_ta?: string;
    don_hang_toi_thieu: number;
    thoi_gian_bat_dau?: string;
    thoi_gian_ket_thuc: string;
    loai_giam: number;   // 1 = %, 0 = tiền mặt
    so_giam_gia: number;
    so_tien_toi_da?: number;
    ten_quan_an?: string | null;
    loai_voucher?: string;
    tinh_trang?: boolean | number;
}

const FILTERS: { key: FilterType; label: string; icon: string }[] = [
    { key: "all",     label: "Tất cả",    icon: "pricetags-outline" },
    { key: "percent", label: "Phần trăm", icon: "trending-down-outline" },
    { key: "fixed",   label: "Tiền mặt",  icon: "cash-outline" },
];

const formatPrice = (price: number): string =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const isExpired = (dateStr: string): boolean => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
};

const AllVouchers = ({ navigation, route }: any) => {
    const initialVouchers: Voucher[] = route?.params?.vouchers ?? [];
    const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
    const [loading, setLoading] = useState(initialVouchers.length === 0);
    const [refreshing, setRefreshing] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchVouchers = async () => {
        try {
            const res = await apiClient.get("/khach-hang/voucher/danh-sach");
            if (res.data && res.data.data) {
                setVouchers(res.data.data);
            }
        } catch (error) {
            console.log("Error fetching all vouchers:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (initialVouchers.length === 0) {
            fetchVouchers();
        }
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchVouchers();
    }, []);

    const handleCopy = (voucher: Voucher) => {
        Clipboard.setString(voucher.ma_code);
        setCopiedId(voucher.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredVouchers = useMemo(() => {
        let result = vouchers;

        if (activeFilter === "percent") {
            result = result.filter((v) => v.loai_giam === 1);
        } else if (activeFilter === "fixed") {
            result = result.filter((v) => v.loai_giam === 0);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (v) =>
                    v.ten_voucher.toLowerCase().includes(q) ||
                    v.ma_code.toLowerCase().includes(q) ||
                    (v.ten_quan_an || "").toLowerCase().includes(q)
            );
        }

        return result;
    }, [vouchers, activeFilter, searchQuery]);

    const renderVoucher = ({ item }: { item: Voucher }) => {
        const isCopied = copiedId === item.id;
        const expired = isExpired(item.thoi_gian_ket_thuc);
        const moTa = item.mo_ta ?? item.so_tien_giam_mo_ta;

        return (
            <View style={[styles.voucherCard, expired && styles.voucherCardExpired]}>
                {/* Left accent strip */}
                <View style={[styles.leftStrip, expired && styles.leftStripExpired]} />

                {/* Dashed divider circles */}
                <View style={styles.circleTop} />
                <View style={styles.circleBottom} />

                {/* Left: discount info */}
                <View style={styles.discountSide}>
                    <Ionicons
                        name="ticket"
                        size={28}
                        color={expired ? "rgba(255,255,255,0.5)" : "#FFF"}
                    />
                    <Text style={[styles.discountPercent, expired && styles.textExpired]}>
                        {item.loai_giam === 1
                            ? `${item.so_giam_gia}%`
                            : `${(item.so_giam_gia / 1000).toFixed(0)}K`}
                    </Text>
                    <Text style={[styles.discountLabel, expired && styles.textExpired]}>GIẢM</Text>
                </View>

                {/* Right: details */}
                <View style={styles.detailSide}>
                    <View style={styles.nameRow}>
                        <Text style={styles.voucherName} numberOfLines={1}>
                            {item.ten_voucher}
                        </Text>
                        {expired && (
                            <View style={styles.expiredBadge}>
                                <Text style={styles.expiredBadgeText}>Hết hạn</Text>
                            </View>
                        )}
                    </View>

                    {moTa ? (
                        <Text style={styles.voucherDesc} numberOfLines={2}>
                            {moTa}
                        </Text>
                    ) : (
                        <Text style={styles.voucherDesc} numberOfLines={2}>
                            Giảm {item.loai_giam === 1
                                ? `${item.so_giam_gia}%`
                                : formatPrice(item.so_giam_gia)}
                            {item.so_tien_toi_da
                                ? ` (tối đa ${formatPrice(item.so_tien_toi_da)})`
                                : ""}
                        </Text>
                    )}

                    {item.don_hang_toi_thieu > 0 && (
                        <Text style={styles.minOrder}>
                            Đơn tối thiểu {formatPrice(item.don_hang_toi_thieu)}
                        </Text>
                    )}

                    {item.ten_quan_an && (
                        <Text style={styles.shopName} numberOfLines={1}>
                            <Ionicons name="storefront-outline" size={11} color={TEXT_MUTED} />{" "}
                            {item.ten_quan_an}
                        </Text>
                    )}

                    <View style={styles.voucherFooter}>
                        <Text style={styles.expiryDate}>
                            <Ionicons
                                name="time-outline"
                                size={12}
                                color={expired ? "#EF4444" : TEXT_MUTED}
                            />
                            {"  "}
                            <Text style={expired ? styles.expiryExpired : undefined}>
                                HSD: {formatDate(item.thoi_gian_ket_thuc)}
                            </Text>
                        </Text>

                        <TouchableOpacity
                            style={[
                                styles.copyBtn,
                                isCopied && styles.copyBtnSuccess,
                                expired && styles.copyBtnExpired,
                            ]}
                            onPress={() => !expired && handleCopy(item)}
                            activeOpacity={expired ? 1 : 0.8}
                        >
                            <Ionicons
                                name={isCopied ? "checkmark" : "copy-outline"}
                                size={14}
                                color={isCopied ? "#FFF" : expired ? TEXT_MUTED : PRIMARY_COLOR}
                            />
                            <Text
                                style={[
                                    styles.copyBtnText,
                                    isCopied && { color: "#FFF" },
                                    expired && { color: TEXT_MUTED },
                                ]}
                            >
                                {isCopied ? "Đã sao chép!" : item.ma_code}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor={PRIMARY_COLOR} barStyle="light-content" />

            {/* HEADER */}
            <View style={styles.headerBg}>
                <SafeAreaView edges={["top"]} style={styles.safeArea}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backBtn}
                        >
                            <Ionicons name="chevron-back" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Tất cả Voucher</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {/* Search bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={18} color={TEXT_MUTED} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm voucher, mã, quán ăn..."
                            placeholderTextColor="#B0B8C1"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
                            </TouchableOpacity>
                        )}
                    </View>
                </SafeAreaView>
            </View>

            {/* FILTER TABS */}
            <View style={styles.filterRow}>
                {FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.filterTab, activeFilter === f.key && styles.filterTabActive]}
                        onPress={() => setActiveFilter(f.key)}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={f.icon}
                            size={15}
                            color={activeFilter === f.key ? "#FFF" : TEXT_MUTED}
                            style={{ marginRight: 4 }}
                        />
                        <Text
                            style={[
                                styles.filterTabText,
                                activeFilter === f.key && styles.filterTabTextActive,
                            ]}
                        >
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* CONTENT */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                    <Text style={styles.loadingText}>Đang tải voucher...</Text>
                </View>
            ) : filteredVouchers.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="ticket-outline" size={72} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>
                        {searchQuery ? "Không tìm thấy voucher" : "Chưa có voucher nào"}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                        {searchQuery
                            ? "Thử tìm kiếm với từ khóa khác"
                            : "Quay lại sau để xem các ưu đãi mới nhất"}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredVouchers}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderVoucher}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[PRIMARY_COLOR]}
                            tintColor={PRIMARY_COLOR}
                        />
                    }
                    ListHeaderComponent={
                        <Text style={styles.countText}>
                            {filteredVouchers.length} voucher khả dụng
                        </Text>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR,
    },
    headerBg: {
        backgroundColor: PRIMARY_COLOR,
        paddingBottom: hp("2%"),
        borderBottomLeftRadius: wp("6%"),
        borderBottomRightRadius: wp("6%"),
    },
    safeArea: {
        paddingTop: Platform.OS === "android" ? hp("2%") : 0,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: wp("4%"),
        marginTop: hp("1%"),
        marginBottom: hp("1.5%"),
    },
    backBtn: {
        padding: wp("1%"),
    },
    headerTitle: {
        fontSize: wp("5%"),
        fontWeight: "700",
        color: "#FFF",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        marginHorizontal: wp("4%"),
        borderRadius: wp("3%"),
        paddingHorizontal: wp("3%"),
        height: hp("5.5%"),
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: wp("3.5%"),
        color: TEXT_DARK,
        padding: 0,
    },
    filterRow: {
        flexDirection: "row",
        paddingHorizontal: wp("4%"),
        paddingVertical: hp("1.5%"),
        gap: wp("2%"),
    },
    filterTab: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: wp("3.5%"),
        paddingVertical: hp("0.8%"),
        borderRadius: wp("5%"),
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        backgroundColor: "#FFF",
    },
    filterTabActive: {
        backgroundColor: PRIMARY_COLOR,
        borderColor: PRIMARY_COLOR,
    },
    filterTabText: {
        fontSize: wp("3%"),
        color: TEXT_MUTED,
        fontWeight: "600",
    },
    filterTabTextActive: {
        color: "#FFF",
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: hp("10%"),
    },
    loadingText: {
        marginTop: hp("2%"),
        fontSize: wp("3.8%"),
        color: TEXT_MUTED,
    },
    emptyTitle: {
        fontSize: wp("4.8%"),
        fontWeight: "700",
        color: TEXT_DARK,
        marginTop: hp("2%"),
    },
    emptySubtitle: {
        fontSize: wp("3.5%"),
        color: TEXT_MUTED,
        marginTop: hp("1%"),
        textAlign: "center",
        paddingHorizontal: wp("10%"),
    },
    listContent: {
        paddingHorizontal: wp("5%"),
        paddingTop: hp("1%"),
        paddingBottom: hp("5%"),
    },
    countText: {
        fontSize: wp("3.5%"),
        color: TEXT_MUTED,
        fontWeight: "600",
        marginBottom: hp("2%"),
    },
    // Voucher card
    voucherCard: {
        flexDirection: "row",
        backgroundColor: "#FFF",
        borderRadius: wp("4%"),
        marginBottom: hp("2%"),
        overflow: "hidden",
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
    },
    voucherCardExpired: {
        opacity: 0.55,
    },
    leftStrip: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: wp("22%"),
        backgroundColor: PRIMARY_COLOR,
    },
    leftStripExpired: {
        backgroundColor: "#94A3B8",
    },
    circleTop: {
        position: "absolute",
        left: wp("19%"),
        top: -wp("4%"),
        width: wp("8%"),
        height: wp("8%"),
        borderRadius: wp("4%"),
        backgroundColor: BACKGROUND_COLOR,
        zIndex: 1,
    },
    circleBottom: {
        position: "absolute",
        left: wp("19%"),
        bottom: -wp("4%"),
        width: wp("8%"),
        height: wp("8%"),
        borderRadius: wp("4%"),
        backgroundColor: BACKGROUND_COLOR,
        zIndex: 1,
    },
    discountSide: {
        width: wp("22%"),
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: hp("2.5%"),
        zIndex: 0,
    },
    discountPercent: {
        fontSize: wp("6%"),
        fontWeight: "900",
        color: "#FFF",
        marginTop: hp("0.5%"),
    },
    discountLabel: {
        fontSize: wp("2.5%"),
        color: "rgba(255,255,255,0.85)",
        fontWeight: "700",
        letterSpacing: 1,
    },
    textExpired: {
        color: "rgba(255,255,255,0.5)",
    },
    detailSide: {
        flex: 1,
        paddingVertical: hp("2%"),
        paddingLeft: wp("6%"),
        paddingRight: wp("3%"),
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: wp("2%"),
        marginBottom: hp("0.5%"),
    },
    voucherName: {
        flex: 1,
        fontSize: wp("4%"),
        fontWeight: "800",
        color: TEXT_DARK,
    },
    expiredBadge: {
        backgroundColor: "#FEE2E2",
        borderRadius: wp("2%"),
        paddingHorizontal: wp("2%"),
        paddingVertical: 2,
    },
    expiredBadgeText: {
        fontSize: wp("2.5%"),
        color: "#EF4444",
        fontWeight: "700",
    },
    voucherDesc: {
        fontSize: wp("3%"),
        color: TEXT_MUTED,
        lineHeight: 18,
        marginBottom: hp("0.5%"),
    },
    minOrder: {
        fontSize: wp("2.8%"),
        color: "#F59E0B",
        fontWeight: "600",
        marginBottom: hp("0.5%"),
    },
    shopName: {
        fontSize: wp("2.8%"),
        color: TEXT_MUTED,
        marginBottom: hp("0.8%"),
    },
    voucherFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    expiryDate: {
        fontSize: wp("2.8%"),
        color: TEXT_MUTED,
    },
    expiryExpired: {
        color: "#EF4444",
        fontWeight: "600",
    },
    copyBtn: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: PRIMARY_COLOR,
        borderRadius: wp("3%"),
        paddingHorizontal: wp("2.5%"),
        paddingVertical: hp("0.5%"),
        gap: 4,
    },
    copyBtnSuccess: {
        backgroundColor: "#22C55E",
        borderColor: "#22C55E",
    },
    copyBtnExpired: {
        borderColor: "#CBD5E1",
    },
    copyBtnText: {
        fontSize: wp("2.8%"),
        color: PRIMARY_COLOR,
        fontWeight: "700",
    },
});

export default AllVouchers;
