import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    StatusBar, ActivityIndicator, RefreshControl, Image,
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

const STATUS_MAP: Record<number, { label: string; color: string; bg: string; icon: string }> = {
    0: { label: 'Chờ xác nhận', color: '#D97706', bg: '#FEF3C7', icon: 'time-outline' },
    1: { label: 'Chờ quán',     color: '#D97706', bg: '#FEF3C7', icon: 'restaurant-outline' },
    2: { label: 'Đang nấu',     color: '#EA580C', bg: '#FFEDD5', icon: 'flame-outline' },
    3: { label: 'Đang giao',    color: '#2563EB', bg: '#DBEAFE', icon: 'bicycle-outline' },
    4: { label: 'Hoàn tất',     color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle-outline' },
    5: { label: 'Đã hủy',       color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' },
};

const TABS = [
    { key: 'all',    label: 'Tất cả' },
    { key: '1',      label: 'Tiền mặt' },
    { key: '2',      label: 'Chuyển khoản' },
    { key: 'done',   label: 'Hoàn tất' },
    { key: 'cancel', label: 'Đã hủy' },
];

const fmt = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0);

const fmtDate = (dt: string) => {
    if (!dt) return '';
    const d = new Date(dt);
    const pad = (x: number) => String(x).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const LichSuGiaoDich = ({ navigation }: any) => {
    const [list, setList]         = useState<any[]>([]);
    const [loading, setLoading]   = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab]           = useState('all');
    const [tongChi, setTongChi]   = useState(0);
    const [soDon, setSoDon]       = useState(0);

    const loadData = useCallback(async () => {
        try {
            const res = await apiClient.get('/khach-hang/lich-su-giao-dich');
            if (res.data?.status) {
                setList(res.data.data || []);
                setTongChi(res.data.tong_chi || 0);
                setSoDon(res.data.so_don_thanh_cong || 0);
            }
        } catch (e) {
            console.log('LichSuGiaoDich error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, []);

    const filtered = list.filter(it => {
        if (tab === 'all')    return true;
        if (tab === 'done')   return Number(it.tinh_trang) === 4;
        if (tab === 'cancel') return Number(it.tinh_trang) === 5;
        return String(it.phuong_thuc_thanh_toan) === tab;
    });

    const tabCount = (key: string) => {
        if (key === 'all')    return list.length;
        if (key === 'done')   return list.filter(i => Number(i.tinh_trang) === 4).length;
        if (key === 'cancel') return list.filter(i => Number(i.tinh_trang) === 5).length;
        return list.filter(i => String(i.phuong_thuc_thanh_toan) === key).length;
    };

    const renderItem = ({ item }: { item: any }) => {
        const st = STATUS_MAP[Number(item.tinh_trang)] || STATUS_MAP[4];
        const isCancel = Number(item.tinh_trang) === 5;
        const isCash   = Number(item.phuong_thuc_thanh_toan) === 1;

        return (
            <View style={styles.card}>
                {/* Left accent */}
                <View style={[styles.cardAccent, { backgroundColor: isCancel ? '#DC2626' : '#16A34A' }]} />

                <View style={styles.cardInner}>
                    {/* Restaurant image / placeholder */}
                    {item.hinh_anh_quan
                        ? <Image source={{ uri: item.hinh_anh_quan }} style={styles.quanImg} />
                        : (
                            <View style={[styles.quanImg, styles.quanPlaceholder]}>
                                <Ionicons name="storefront-outline" size={22} color="#94A3B8" />
                            </View>
                        )
                    }

                    {/* Info */}
                    <View style={styles.cardInfo}>
                        <Text style={styles.quanName} numberOfLines={1}>{item.ten_quan_an}</Text>
                        <Text style={styles.metaText}>
                            <Ionicons name="time-outline" size={11} color={TEXT_MUTED} /> {fmtDate(item.created_at)}  ·  #{item.ma_don_hang}
                        </Text>

                        {/* Badges */}
                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, { backgroundColor: st.bg }]}>
                                <Ionicons name={st.icon as any} size={10} color={st.color} />
                                <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: isCash ? '#F0FDF4' : '#EEF2FF' }]}>
                                <Ionicons name={isCash ? 'cash-outline' : 'qr-code-outline'} size={10} color={isCash ? '#16A34A' : '#4F46E5'} />
                                <Text style={[styles.badgeText, { color: isCash ? '#16A34A' : '#4F46E5' }]}>{isCash ? 'Tiền mặt' : 'QR/CK'}</Text>
                            </View>
                        </View>

                        {/* Sub: tiền hàng + ship */}
                        <Text style={styles.subText}>
                            Hàng: {fmt(item.tien_hang)}{item.phi_ship > 0 ? `  ·  Ship: ${fmt(item.phi_ship)}` : ''}
                        </Text>
                    </View>

                    {/* Amount */}
                    <View style={styles.amountCol}>
                        <Text style={[styles.amount, isCancel && styles.amountCancel]}>{fmt(item.tong_tien)}</Text>
                        <View style={[styles.paidBadge, { backgroundColor: item.is_thanh_toan == 1 ? '#DCFCE7' : '#FEF3C7' }]}>
                            <Text style={[styles.paidText, { color: item.is_thanh_toan == 1 ? '#16A34A' : '#D97706' }]}>
                                {item.is_thanh_toan == 1 ? 'Đã TT' : 'Chưa TT'}
                            </Text>
                        </View>
                    </View>
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
                        <Text style={styles.headerTitle}>Lịch Sử Giao Dịch</Text>
                        <View style={{ width: 38 }} />
                    </View>
                </SafeAreaView>
            </View>

            {/* Summary cards */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { flex: 2, backgroundColor: '#4F46E5' }]}>
                    <Ionicons name="wallet-outline" size={20} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.summaryLabel}>Tổng đã chi</Text>
                    <Text style={styles.summaryValue}>{fmt(tongChi)}</Text>
                </View>
                <View style={[styles.summaryCard, { flex: 1, backgroundColor: '#16A34A' }]}>
                    <Ionicons name="checkmark-done-outline" size={20} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.summaryLabel}>Đơn thành công</Text>
                    <Text style={[styles.summaryValue, { fontSize: wp('6%') }]}>{soDon}</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={TABS}
                    keyExtractor={t => t.key}
                    contentContainerStyle={{ paddingHorizontal: wp('4%'), gap: 8 }}
                    renderItem={({ item: t }) => (
                        <TouchableOpacity
                            onPress={() => setTab(t.key)}
                            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
                        >
                            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                            <View style={[styles.tabCount, tab === t.key && styles.tabCountActive]}>
                                <Text style={[styles.tabCountText, tab === t.key && { color: '#FFF' }]}>{tabCount(t.key)}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* List */}
            {loading ? (
                <ActivityIndicator style={{ marginTop: hp('10%') }} size="large" color={PRIMARY} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(_, i) => String(i)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: wp('4%'), paddingBottom: hp('12%') }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[PRIMARY]} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="receipt-outline" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>Không có giao dịch nào</Text>
                            <Text style={styles.emptySub}>Đặt hàng ngay để xem lịch sử!</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    header: { backgroundColor: PRIMARY, paddingBottom: hp('2%') },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: wp('4%'), paddingTop: hp('1%') },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: wp('4.5%'), fontWeight: '700', color: '#FFF' },
    summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: wp('4%'), marginTop: hp('1.5%') },
    summaryCard: { borderRadius: wp('3%'), padding: wp('3.5%') },
    summaryLabel: { fontSize: wp('2.8%'), color: 'rgba(255,255,255,0.75)', marginTop: 4, marginBottom: 2 },
    summaryValue: { fontSize: wp('4%'), fontWeight: '800', color: '#FFF' },
    tabsContainer: { marginTop: hp('1.5%'), marginBottom: hp('0.5%') },
    tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: wp('3.5%'), paddingVertical: hp('1%'), borderRadius: wp('5%'), backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
    tabBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    tabText: { fontSize: wp('3.2%'), fontWeight: '600', color: TEXT_MUTED },
    tabTextActive: { color: '#FFF' },
    tabCount: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
    tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    tabCountText: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED },
    card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: wp('3%'), marginBottom: 10, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
    cardAccent: { width: 4 },
    cardInner: { flex: 1, flexDirection: 'row', padding: wp('3%'), gap: wp('3%'), alignItems: 'center' },
    quanImg: { width: wp('14%'), height: wp('14%'), borderRadius: wp('2.5%') },
    quanPlaceholder: { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    cardInfo: { flex: 1 },
    quanName: { fontSize: wp('3.8%'), fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
    metaText: { fontSize: wp('2.8%'), color: TEXT_MUTED, marginBottom: 5 },
    badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    subText: { fontSize: wp('2.8%'), color: '#94A3B8', marginTop: 2 },
    amountCol: { alignItems: 'flex-end', justifyContent: 'center', gap: 5 },
    amount: { fontSize: wp('3.8%'), fontWeight: '800', color: TEXT_DARK, textAlign: 'right' },
    amountCancel: { color: '#94A3B8', textDecorationLine: 'line-through' },
    paidBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
    paidText: { fontSize: 10, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: hp('10%'), gap: 8 },
    emptyTitle: { fontSize: wp('4%'), fontWeight: '600', color: '#94A3B8' },
    emptySub: { fontSize: wp('3%'), color: '#CBD5E1' },
});

export default LichSuGiaoDich;
