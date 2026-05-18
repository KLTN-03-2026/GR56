import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore
import Ionicons from 'react-native-vector-icons/Ionicons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import apiClient from '../../genaral/api';

const PRIMARY = '#EE4D2D';
const BG = '#F5F6F8';
const TEXT_DARK = '#1E293B';
const TEXT_MUTED = '#64748B';

const getTypeInfo = (item: any) => {
    const xu = Number(item.so_xu ?? 0);
    if (item.loai_giao_dich == 1 || xu > 0)
        return { color: '#16A34A', bg: '#DCFCE7', icon: 'arrow-down-circle-outline', label: 'Tích lũy mua hàng' };
    if (item.loai_giao_dich == 2 || xu < 0)
        return { color: '#DC2626', bg: '#FEE2E2', icon: 'arrow-up-circle-outline', label: 'Thanh toán xu' };
    if (item.loai_giao_dich == 3)
        return { color: '#64748B', bg: '#F1F5F9', icon: 'refresh-circle-outline', label: 'Hoàn trả' };
    if (item.loai_giao_dich == 4)
        return { color: '#D97706', bg: '#FEF3C7', icon: 'trophy-outline', label: 'Hệ thống cấp' };
    return { color: '#64748B', bg: '#F1F5F9', icon: 'ellipse-outline', label: 'Giao dịch khác' };
};

const fmtDate = (dt: string) => {
    if (!dt) return '';
    return new Date(dt).toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
    });
};

const LichSuXu = ({ navigation }: any) => {
    const [list, setList]         = useState<any[]>([]);
    const [diemXu, setDiemXu]    = useState(0);
    const [loading, setLoading]   = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [xuRes, profileRes] = await Promise.allSettled([
                apiClient.get('/khach-hang/lich-su-xu'),
                apiClient.get('/khach-hang/data-login'),
            ]);
            if (xuRes.status === 'fulfilled' && xuRes.value.data?.status) {
                setList(xuRes.value.data.data || []);
            }
            if (profileRes.status === 'fulfilled' && profileRes.value.data?.status) {
                setDiemXu(profileRes.value.data.data?.diem_xu ?? 0);
            }
        } catch (e) {
            console.log('LichSuXu error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, []);

    const renderItem = ({ item }: { item: any }) => {
        const info = getTypeInfo(item);
        const xu = Number(item.so_xu ?? 0);
        return (
            <View style={styles.card}>
                <View style={[styles.iconCircle, { backgroundColor: info.bg }]}>
                    <Ionicons name={info.icon as any} size={24} color={info.color} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.desc} numberOfLines={2}>{item.mo_ta || info.label}</Text>
                    <Text style={styles.metaText}>
                        <Ionicons name="time-outline" size={11} color={TEXT_MUTED} />  {fmtDate(item.created_at)}
                    </Text>
                    <View style={[styles.typeBadge, { backgroundColor: info.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: info.color }]}>{info.label}</Text>
                    </View>
                </View>
                <View style={styles.amountCol}>
                    <Text style={[styles.xuAmount, { color: xu > 0 ? '#16A34A' : xu < 0 ? '#DC2626' : TEXT_MUTED }]}>
                        {xu > 0 ? '+' : ''}{xu}
                    </Text>
                    <Ionicons name="logo-bitcoin" size={14} color={xu > 0 ? '#16A34A' : xu < 0 ? '#DC2626' : TEXT_MUTED} />
                    <Text style={styles.xuLabel}>xu</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={22} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Lịch Sử FoodBee Xu</Text>
                        <View style={{ width: 38 }} />
                    </View>
                </SafeAreaView>
            </View>

            {/* Balance hero */}
            <View style={styles.heroCard}>
                <Ionicons name="logo-bitcoin" size={28} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroLabel}>Tổng điểm Xu hiện có</Text>
                <View style={styles.heroAmountRow}>
                    <Text style={styles.heroAmount}>{diemXu}</Text>
                    <Text style={styles.heroUnit}>xu</Text>
                </View>
                <Text style={styles.heroSub}>Tổng {list.length} giao dịch</Text>
            </View>

            {/* Section title */}
            <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>

            {/* List */}
            {loading ? (
                <ActivityIndicator style={{ marginTop: hp('8%') }} size="large" color={PRIMARY} />
            ) : (
                <FlatList
                    data={list}
                    keyExtractor={(_, i) => String(i)}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: wp('4%'), paddingBottom: hp('12%') }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[PRIMARY]} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="logo-bitcoin" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>Chưa có giao dịch Xu</Text>
                            <Text style={styles.emptySub}>Mua sắm để tích lũy xu ngay nhé!</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    header: { backgroundColor: '#D97706', paddingBottom: hp('2%') },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: wp('4%'), paddingTop: hp('1%') },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: wp('4.5%'), fontWeight: '700', color: '#FFF' },
    heroCard: {
        marginHorizontal: wp('4%'), marginTop: hp('1.5%'), marginBottom: hp('1.5%'),
        borderRadius: wp('4%'), padding: wp('5%'),
        backgroundColor: '#F59E0B',
    },
    heroLabel: { fontSize: wp('3%'), color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 8, marginBottom: 4 },
    heroAmountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    heroAmount: { fontSize: wp('12%'), fontWeight: '900', color: '#FFF' },
    heroUnit: { fontSize: wp('5%'), color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
    heroSub: { fontSize: wp('3%'), color: 'rgba(255,255,255,0.65)', marginTop: 4 },
    sectionTitle: { fontSize: wp('4%'), fontWeight: '700', color: TEXT_DARK, paddingHorizontal: wp('4%'), marginBottom: hp('1%') },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: wp('3%'), marginBottom: 10, padding: wp('3.5%'), gap: wp('3%'), elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, borderLeftWidth: 3, borderLeftColor: '#FCD34D' },
    iconCircle: { width: wp('12%'), height: wp('12%'), borderRadius: wp('6%'), justifyContent: 'center', alignItems: 'center' },
    cardInfo: { flex: 1 },
    desc: { fontSize: wp('3.8%'), fontWeight: '700', color: TEXT_DARK, marginBottom: 3 },
    metaText: { fontSize: wp('2.8%'), color: TEXT_MUTED, marginBottom: 5 },
    typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    typeBadgeText: { fontSize: 10, fontWeight: '700' },
    amountCol: { alignItems: 'center', minWidth: wp('12%') },
    xuAmount: { fontSize: wp('5%'), fontWeight: '900' },
    xuLabel: { fontSize: wp('2.8%'), color: TEXT_MUTED, marginTop: 1 },
    empty: { alignItems: 'center', paddingTop: hp('8%'), gap: 8 },
    emptyTitle: { fontSize: wp('4%'), fontWeight: '600', color: '#94A3B8' },
    emptySub: { fontSize: wp('3%'), color: '#CBD5E1' },
});

export default LichSuXu;
