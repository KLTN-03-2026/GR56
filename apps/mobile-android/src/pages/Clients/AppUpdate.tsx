import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    StatusBar,
    Platform,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import Ionicons from "react-native-vector-icons/Ionicons";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import LoadingModal from "../../components/LoadingModal";

const PRIMARY_COLOR = "#EE4D2D";
const BACKGROUND_COLOR = "#F5F6F8";
const TEXT_DARK = "#1E293B";
const TEXT_MUTED = "#64748B";
const SUCCESS_COLOR = "#10B981";

const AppUpdate = ({ navigation }: any) => {
    const [currentVersion] = useState("1.2.5");
    const [newVersion] = useState("1.3.0");
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateProgress, setUpdateProgress] = useState(0);
    const [hasUpdate, setHasUpdate] = useState(true);

    const updateChangelog = [
        {
            title: "Tính năng mới",
            icon: "sparkles",
            features: [
                "Thêm hỗ trợ thanh toán VNPay",
                "Cải thiện bộ lọc nhà hàng",
                "Chế độ Dark Mode",
            ],
        },
        {
            title: "Sửa lỗi",
            icon: "bug",
            features: [
                "Sửa lỗi không load danh sách đơn hàng",
                "Cải thiện tốc độ ứng dụng",
                "Sửa lỗi crash khi cập nhật địa chỉ",
            ],
        },
    ];

    const handleUpdate = async () => {
        setIsUpdating(true);
        // Simulate download progress
        for (let i = 0; i <= 100; i += 10) {
            setTimeout(() => {
                setUpdateProgress(i);
            }, i * 100);
        }

        setTimeout(() => {
            setIsUpdating(false);
            Alert.alert(
                "Thành công",
                "Cập nhật ứng dụng hoàn tất! Vui lòng khởi động lại ứng dụng.",
                [{ text: "OK", onPress: () => {} }]
            );
        }, 1000);
    };

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            <LoadingModal visible={isUpdating} />

            <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="chevron-back" size={28} color={TEXT_DARK} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Cập nhật ứng dụng</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    contentContainerStyle={{ paddingBottom: hp("3%") }}
                >
                    {/* APP ICON & VERSION */}
                    <View style={styles.appInfoCard}>
                        <View style={styles.appIconContainer}>
                            <Image
                                source={require("../../assets/images/logoFood.png")}
                                style={styles.appLogo}
                            />
                        </View>
                        <Text style={styles.appName}>FoodBee</Text>
                        <Text style={styles.versionText}>Phiên bản {currentVersion}</Text>

                        {hasUpdate && (
                            <View style={styles.newVersionBadge}>
                                <Ionicons name="arrow-up-circle" size={20} color={PRIMARY_COLOR} />
                                <Text style={styles.newVersionText}>Có phiên bản mới {newVersion}</Text>
                            </View>
                        )}
                    </View>

                    {/* VERSION COMPARISON */}
                    {hasUpdate && (
                        <View style={styles.versionCompareCard}>
                            <View style={styles.versionRow}>
                                <View style={styles.versionItem}>
                                    <Text style={styles.versionLabel}>Phiên bản hiện tại</Text>
                                    <Text style={styles.versionNumber}>{currentVersion}</Text>
                                </View>
                                <View style={styles.versionArrow}>
                                    <Ionicons name="arrow-forward" size={24} color={TEXT_MUTED} />
                                </View>
                                <View style={styles.versionItem}>
                                    <Text style={styles.versionLabel}>Phiên bản mới</Text>
                                    <Text style={[styles.versionNumber, { color: SUCCESS_COLOR }]}>
                                        {newVersion}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* CHANGELOG SECTION */}
                    <View style={styles.changelogSection}>
                        <View style={styles.changelogTitleRow}>
                            <Ionicons name="document-text" size={24} color={TEXT_DARK} />
                            <Text style={styles.changelogTitle}>Có gì mới</Text>
                        </View>

                        {updateChangelog.map((section, idx) => (
                            <View key={idx} style={styles.changelogCard}>
                                <View style={styles.changelogSubtitleRow}>
                                    <Ionicons name={section.icon} size={18} color={PRIMARY_COLOR} />
                                    <Text style={styles.changelogSubtitle}>{section.title}</Text>
                                </View>
                                {section.features.map((feature, i) => (
                                    <View key={i} style={styles.featureRow}>
                                        <View style={styles.featureDot} />
                                        <Text style={styles.featureText}>{feature}</Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>

                    {/* UPDATE SIZE INFO */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoIconWrap}>
                                <Ionicons name="phone-portrait" size={20} color={PRIMARY_COLOR} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Dung lượng tải xuống</Text>
                                <Text style={styles.infoValue}>45 MB</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoIconWrap}>
                                <Ionicons name="shield-checkmark" size={20} color={SUCCESS_COLOR} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Phiên bản an toàn</Text>
                                <Text style={styles.infoValue}>Đã xác thực từ CH Play</Text>
                            </View>
                        </View>
                    </View>

                    {/* PROGRESS SECTION */}
                    {isUpdating && (
                        <View style={styles.progressCard}>
                            <View style={styles.progressBarContainer}>
                                <View
                                    style={[
                                        styles.progressBar,
                                        { width: `${updateProgress}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                Đang tải xuống... {updateProgress}%
                            </Text>
                        </View>
                    )}

                    {/* UPDATE BUTTON */}
                    {hasUpdate && !isUpdating && (
                        <TouchableOpacity
                            style={styles.updateBtn}
                            onPress={handleUpdate}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="cloud-download" size={20} color="#FFF" />
                            <Text style={styles.updateBtnText}>Cập nhật ngay</Text>
                        </TouchableOpacity>
                    )}

                    {isUpdating && (
                        <TouchableOpacity style={[styles.updateBtn, { opacity: 0.6 }]} disabled>
                            <Text style={styles.updateBtnText}>Đang cập nhật...</Text>
                        </TouchableOpacity>
                    )}

                    {!hasUpdate && (
                        <View style={styles.upToDateCard}>
                            <Ionicons name="checkmark-circle" size={48} color={SUCCESS_COLOR} />
                            <Text style={styles.upToDateTitle}>Ứng dụng đã cập nhật</Text>
                            <Text style={styles.upToDateSubtitle}>
                                Bạn đang sử dụng phiên bản mới nhất
                            </Text>
                        </View>
                    )}

                    {/* OPTIONAL: LATER BUTTON */}
                    {hasUpdate && !isUpdating && (
                        <TouchableOpacity
                            style={styles.laterBtn}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.laterBtnText}>Cập nhật sau</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: wp("4%"),
        paddingVertical: hp("2%"),
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: wp("4.5%"),
        fontWeight: "700",
        color: TEXT_DARK,
        flex: 1,
        textAlign: "center",
    },
    // APP INFO CARD
    appInfoCard: {
        backgroundColor: "#FFF",
        marginHorizontal: wp("5%"),
        marginTop: hp("2%"),
        borderRadius: wp("4%"),
        paddingVertical: hp("3%"),
        alignItems: "center",
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    appIconContainer: {
        marginBottom: hp("2%"),
    },
    appIcon: {
        width: wp("20%"),
        height: wp("20%"),
        borderRadius: wp("10%"),
        backgroundColor: PRIMARY_COLOR,
        justifyContent: "center",
        alignItems: "center",
    },
    appLogo: {
        width: wp("20%"),
        height: wp("20%"),
        borderRadius: wp("10%"),
        resizeMode: "contain",
    },
    appName: {
        fontSize: wp("6%"),
        fontWeight: "800",
        color: TEXT_DARK,
        marginBottom: hp("0.5%"),
    },
    versionText: {
        fontSize: wp("3.5%"),
        color: TEXT_MUTED,
        marginBottom: hp("1.5%"),
    },
    newVersionBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF2F2",
        paddingHorizontal: wp("3%"),
        paddingVertical: hp("1%"),
        borderRadius: wp("3%"),
        borderWidth: 1,
        borderColor: "#FECACA",
        marginTop: hp("1%"),
    },
    newVersionText: {
        fontSize: wp("3.2%"),
        color: PRIMARY_COLOR,
        fontWeight: "600",
        marginLeft: wp("2%"),
    },
    // VERSION COMPARE
    versionCompareCard: {
        backgroundColor: "#FFF",
        marginHorizontal: wp("5%"),
        marginTop: hp("2%"),
        borderRadius: wp("4%"),
        padding: wp("4%"),
    },
    versionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    versionItem: {
        flex: 1,
        alignItems: "center",
    },
    versionLabel: {
        fontSize: wp("3%"),
        color: TEXT_MUTED,
        marginBottom: hp("0.5%"),
    },
    versionNumber: {
        fontSize: wp("5%"),
        fontWeight: "800",
        color: TEXT_DARK,
    },
    versionArrow: {
        marginHorizontal: wp("3%"),
    },
    // CHANGELOG
    changelogSection: {
        marginHorizontal: wp("5%"),
        marginTop: hp("2.5%"),
    },
    changelogTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: hp("1.5%"),
    },
    changelogTitle: {
        fontSize: wp("4%"),
        fontWeight: "700",
        color: TEXT_DARK,
        marginLeft: wp("2%"),
    },
    changelogCard: {
        backgroundColor: "#FFF",
        borderRadius: wp("4%"),
        padding: wp("4%"),
        marginBottom: hp("1.5%"),
    },
    changelogSubtitleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: hp("1%"),
    },
    changelogSubtitle: {
        fontSize: wp("3.5%"),
        fontWeight: "700",
        color: PRIMARY_COLOR,
        marginLeft: wp("2%"),
    },
    featureRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: hp("0.8%"),
    },
    featureDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: PRIMARY_COLOR,
        marginTop: hp("0.6%"),
        marginRight: wp("2.5%"),
    },
    featureText: {
        fontSize: wp("3.2%"),
        color: TEXT_DARK,
        flex: 1,
        lineHeight: 20,
    },
    // INFO CARDS
    infoCard: {
        backgroundColor: "#FFF",
        marginHorizontal: wp("5%"),
        marginTop: hp("1.5%"),
        borderRadius: wp("4%"),
        padding: wp("4%"),
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    infoIconWrap: {
        width: wp("12%"),
        height: wp("12%"),
        borderRadius: wp("6%"),
        backgroundColor: "#F8FAFC",
        justifyContent: "center",
        alignItems: "center",
        marginRight: wp("3%"),
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: wp("3%"),
        color: TEXT_MUTED,
        marginBottom: hp("0.3%"),
    },
    infoValue: {
        fontSize: wp("3.5%"),
        fontWeight: "600",
        color: TEXT_DARK,
    },
    // PROGRESS
    progressCard: {
        backgroundColor: "#FFF",
        marginHorizontal: wp("5%"),
        marginTop: hp("2.5%"),
        borderRadius: wp("4%"),
        padding: wp("4%"),
    },
    progressBarContainer: {
        width: "100%",
        height: 8,
        borderRadius: 4,
        backgroundColor: "#E2E8F0",
        overflow: "hidden",
        marginBottom: hp("1%"),
    },
    progressBar: {
        height: "100%",
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 4,
    },
    progressText: {
        fontSize: wp("3.2%"),
        color: TEXT_MUTED,
        textAlign: "center",
        fontWeight: "600",
    },
    // UPDATE BUTTON
    updateBtn: {
        flexDirection: "row",
        backgroundColor: PRIMARY_COLOR,
        marginHorizontal: wp("5%"),
        marginTop: hp("2.5%"),
        paddingVertical: hp("2%"),
        borderRadius: wp("4%"),
        justifyContent: "center",
        alignItems: "center",
        elevation: 5,
        shadowColor: PRIMARY_COLOR,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
    },
    updateBtnText: {
        color: "#FFF",
        fontSize: wp("4%"),
        fontWeight: "700",
        marginLeft: wp("2%"),
    },
    // LATER BUTTON
    laterBtn: {
        backgroundColor: "#FFF",
        marginHorizontal: wp("5%"),
        marginTop: hp("1.5%"),
        paddingVertical: hp("1.8%"),
        borderRadius: wp("4%"),
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
    },
    laterBtnText: {
        color: TEXT_DARK,
        fontSize: wp("4%"),
        fontWeight: "600",
    },
    // UP TO DATE
    upToDateCard: {
        backgroundColor: "#FFF",
        marginHorizontal: wp("5%"),
        marginTop: hp("3%"),
        borderRadius: wp("4%"),
        paddingVertical: hp("4%"),
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#D1FAE5",
    },
    upToDateTitle: {
        fontSize: wp("4%"),
        fontWeight: "700",
        color: TEXT_DARK,
        marginTop: hp("1.5%"),
        marginBottom: hp("0.5%"),
    },
    upToDateSubtitle: {
        fontSize: wp("3.2%"),
        color: TEXT_MUTED,
    },
});

export default AppUpdate;
