import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
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

interface Voucher {
    id: number;
    ten_voucher: string;
    ma_voucher: string;
    so_tien_giam_mo_ta: string;
    don_hang_toi_thieu: number;
    thoi_gian_ket_thuc: string;
    loai_giam: number;
    so_giam_gia: number;
    so_tien_toi_da?: number;
}

const MyVouchers = ({ navigation }: any) => {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const fetchVouchers = async () => {
        try {
            const res = await apiClient.get("/khach-hang/voucher/cua-toi");
            if (res.data && res.data.status) {
                setVouchers(res.data.data || []);
            }
        } catch (error) {
            console.log("Error fetching vouchers:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchVouchers();
    }, []);

    const handleCopy = (voucher: Voucher) => {
        setCopiedId(voucher.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    };

    const renderVoucher = ({ item }: { item: Voucher }) => {
        const isCopied = copiedId === item.id;
        return (
            <View style={styles.voucherCard}>
                {/* Left accent strip */}
                <View style={styles.leftStrip} />

                {/* Dashed divider circles */}
                <View style={styles.circleTop} />
                <View style={styles.circleBottom} />

                {/* Left: discount info */}
                <View style={styles.discountSide}>
                    <Ionicons name="ticket" size={28} color="#FFF" />
                    <Text style={styles.discountPercent}>
                        {item.loai_giam === 1
                            ? `${item.so_giam_gia}%`
                            : `${(item.so_giam_gia / 1000).toFixed(0)}K`}
                    </Text>
                    <Text style={styles.discountLabel}>GIẢM</Text>
                </View>

                {/* Right: details */}
                <View style={styles.detailSide}>
                    <Text style={styles.voucherName} numberOfLines={1}>{item.ten_voucher}</Text>
                    <Text style={styles.voucherDesc} numberOfLines={2}>{item.so_tien_giam_mo_ta}</Text>

                    {item.don_hang_toi_thieu > 0 && (
                        <Text style={styles.minOrder}>
                            Đơn tối thiểu {(item.don_hang_toi_thieu / 1000).toFixed(0)}K
                        </Text>
                    )}

                    <View style={styles.voucherFooter}>
                        <Text style={styles.expryDate}>
                            <Ionicons name="time-outline" size={12} color={TEXT_MUTED} />
                            {"  "}HSD: {formatDate(item.thoi_gian_ket_thuc)}
                        </Text>

                        <TouchableOpacity
                            style={[styles.copyBtn, isCopied && styles.copyBtnSuccess]}
                            onPress={() => handleCopy(item)}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={isCopied ? "checkmark" : "copy-outline"}
                                size={14}
                                color={isCopied ? "#FFF" : PRIMARY_COLOR}
                            />
                            <Text style={[styles.copyBtnText, isCopied && { color: "#FFF" }]}>
                                {isCopied ? "Đã lưu!" : item.ma_voucher}
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
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="chevron-back" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Voucher của tôi</Text>
                        <View style={{ width: 28 }} />
                    </View>
                </SafeAreaView>
            </View>

            {/* CONTENT */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                    <Text style={styles.loadingText}>Đang tải voucher...</Text>
                </View>
            ) : vouchers.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="ticket-outline" size={72} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>Chưa có voucher nào</Text>
                    <Text style={styles.emptySubtitle}>Voucher dành riêng cho bạn sẽ xuất hiện ở đây</Text>
                </View>
            ) : (
                <FlatList
                    data={vouchers}
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
                        <Text style={styles.countText}>{vouchers.length} voucher khả dụng</Text>
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
    },
    backBtn: {
        padding: wp("1%"),
    },
    headerTitle: {
        fontSize: wp("5%"),
        fontWeight: "700",
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
        paddingTop: hp("3%"),
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
    leftStrip: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: wp("22%"),
        backgroundColor: PRIMARY_COLOR,
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
    detailSide: {
        flex: 1,
        paddingVertical: hp("2%"),
        paddingLeft: wp("6%"),
        paddingRight: wp("3%"),
    },
    voucherName: {
        fontSize: wp("4%"),
        fontWeight: "800",
        color: TEXT_DARK,
        marginBottom: hp("0.5%"),
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
        marginBottom: hp("1%"),
    },
    voucherFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    expryDate: {
        fontSize: wp("2.8%"),
        color: TEXT_MUTED,
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
    copyBtnText: {
        fontSize: wp("2.8%"),
        color: PRIMARY_COLOR,
        fontWeight: "700",
    },
});

export default MyVouchers;
