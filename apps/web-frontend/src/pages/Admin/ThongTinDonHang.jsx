import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND, formatDate } from '../../utils/helpers';
import { exportToExcel } from '../../utils/exportExcel';

const adm = (url) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return api.get(url,cfg);
};
const admPost = (url,data) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return api.post(url,data,cfg);
};

export default function AdminThongTinDonHang() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterKw, setFilterKw] = useState('');
  const [filterTT, setFilterTT] = useState('');
  const [filterTu, setFilterTu] = useState('');
  const [filterDen, setFilterDen] = useState('');

  const [showChiTiet, setShowChiTiet] = useState(false);
  const [donDangXem, setDonDangXem] = useState({});
  const [chiTietDon, setChiTietDon] = useState([]);
  const [loadingCT, setLoadingCT] = useState(false);
  const [modalTab, setModalTab] = useState('chi_tiet');
  const [trackingData, setTrackingData] = useState(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const [mapUnlocked, setMapUnlocked] = useState(false);
  const trackPollRef = useRef(null);

  useEffect(()=>{loadData();},[]);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await adm('/api/admin/don-hang/thong-tin-day-du');
      setList(r.data.data||[]);
    } catch(e) {
      toast.error('Lỗi tải dữ liệu');
    } finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    return list.filter(v => {
      const kw = filterKw.toLowerCase();
      const matchKw = !kw ||
        (v.ma_don_hang||'').toLowerCase().includes(kw) ||
        (v.ten_quan_an||'').toLowerCase().includes(kw) ||
        (v.ho_va_ten_khach_hang||'').toLowerCase().includes(kw) ||
        (v.ho_va_ten_shipper||'').toLowerCase().includes(kw);
      const matchTT = filterTT==='' || String(v.tinh_trang)===String(filterTT);
      let matchDate = true;
      if(v.created_at) {
        const dt = new Date(v.created_at);
        if(filterTu) matchDate = matchDate && dt >= new Date(filterTu);
        if(filterDen) matchDate = matchDate && dt <= new Date(filterDen+'T23:59:59');
      }
      return matchKw && matchTT && matchDate;
    });
  }, [list, filterKw, filterTT, filterTu, filterDen]);

  const stats = useMemo(()=>{
    const donThanhCong = filtered.filter(v=>v.tinh_trang==4).length;
    const tongLoi = filtered.filter(v=>v.tinh_trang==4&&v.da_doi_soat).reduce((acc,v)=>acc+(parseFloat(v.tien_chiet_khau)||0),0);
    return { donThanhCong, tongLoi };
  }, [filtered]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => { setCurrentPage(1); }, [filterKw, filterTT, filterTu, filterDen]);

  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filtered.slice(indexOfFirstItem, indexOfLastItem);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const resetFilter = () => { setFilterKw(''); setFilterTT(''); setFilterTu(''); setFilterDen(''); };

  const xemChiTiet = async (don) => {
    setDonDangXem(don);
    setChiTietDon([]);
    setTrackingData(null);
    setModalTab('chi_tiet');
    setShowChiTiet(true);
    setLoadingCT(true);
    if (trackPollRef.current) clearInterval(trackPollRef.current);
    try {
      const r = await admPost('/api/admin/don-hang/chi-tiet-day-du', {id: don.id});
      setChiTietDon(r.data.data||[]);
    } catch(e) {
      toast.error('Lỗi tải chi tiết đơn');
    } finally { setLoadingCT(false); }
  };

  const fetchTracking = async (id) => {
    try {
      const r = await admPost('/api/admin/don-hang/theo-doi', { id });
      if (r.data.status) setTrackingData(r.data.order);
    } catch {}
  };

  useEffect(() => {
    if (modalTab === 'ban_do' && donDangXem?.id) {
      setLoadingMap(true);
      fetchTracking(donDangXem.id).finally(() => setLoadingMap(false));
      trackPollRef.current = setInterval(() => fetchTracking(donDangXem.id), 10000);
    } else {
      if (trackPollRef.current) { clearInterval(trackPollRef.current); trackPollRef.current = null; }
    }
    return () => { if (trackPollRef.current) clearInterval(trackPollRef.current); };
  }, [modalTab, donDangXem?.id]);

  const closeModal = () => {
    setShowChiTiet(false);
    if (trackPollRef.current) { clearInterval(trackPollRef.current); trackPollRef.current = null; }
  };

  const STATUS_LABEL = { 0:'Chờ shipper', 1:'Chờ quán nhận', 2:'Đang nấu', 3:'Đang giao', 4:'Thành công', 5:'Đã hủy' };
  const STATUS_COLOR = { 0:'bg-gray-100 text-gray-600', 1:'bg-yellow-100 text-yellow-700', 2:'bg-orange-100 text-orange-700', 3:'bg-blue-100 text-blue-700', 4:'bg-green-100 text-green-700', 5:'bg-red-100 text-red-600' };

  const tongSl = chiTietDon.reduce((acc,c)=>acc+(parseInt(c.so_luong)||0),0);

  const xuatExcel = () => {
    const data = filtered.map(v=>({
      ...v,
      phuong_thuc_thanh_toan: v.phuong_thuc_thanh_toan==1?'Tiền mặt':'Chuyển khoản',
      is_thanh_toan: v.is_thanh_toan==1?'Đã thanh toán':'Chưa thanh toán',
      ho_va_ten_shipper: v.ho_va_ten_shipper||'-',
      ma_voucher: v.ma_voucher||'-'
    }));
    exportToExcel(data, [
      {key:'ma_don_hang',label:'Mã Đơn'},
      {key:'created_at',label:'Thời gian'},
      {key:'ten_quan_an',label:'Quán ăn'},
      {key:'ho_va_ten_khach_hang',label:'Khách hàng'},
      {key:'ho_va_ten_shipper',label:'Shipper'},
      {key:'phuong_thuc_thanh_toan',label:'PT Thanh toán'},
      {key:'tien_hang',label:'Tiền hàng (VND)'},
      {key:'phi_ship',label:'Phí ship (VND)'},
      {key:'tong_tien',label:'Tổng Tiền (VND)'},
      {key:'tien_chiet_khau',label:'Tiền lời Admin (VND)'},
      {key:'chiet_khau_phan_tram',label:'% Chiết khấu'},
      {key:'tinh_trang',label:'Trạng thái'},
      {key:'is_thanh_toan',label:'TT Thanh toán'}
    ], 'thong_tin_don_hang', 'Thông tin đơn');
  };

  return (
    <div className="p-6 space-y-5">
      {showChiTiet && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>

            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-3xl flex items-center justify-between shrink-0">
              <h3 className="font-bold text-white text-lg"><i className="fa-solid fa-receipt mr-2"/>Đơn hàng — {donDangXem.ma_don_hang}</h3>
              <button onClick={closeModal} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl"/></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-4 shrink-0 border-b border-gray-100 bg-white">
              {[
                { key:'chi_tiet', label:'Chi Tiết', icon:'fa-receipt' },
                { key:'ban_do',   label:'Theo Dõi Bản Đồ', icon:'fa-map-location-dot' },
              ].map(t => (
                <button key={t.key} onClick={()=>setModalTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 transition-all -mb-px ${
                    modalTab===t.key ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <i className={`fa-solid ${t.icon}`}/>{t.label}
                </button>
              ))}
            </div>

            {/* ─── TAB CHI TIẾT ─── */}
            <div className={`overflow-y-auto flex-1 ${modalTab!=='chi_tiet'?'hidden':''}`}>
              <div className="p-6">
                {loadingCT
                  ? <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"/></div>
                  : (
                    <div className="space-y-6">
                      {/* SUMMARY CARDS */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-2xl p-4 text-center border">
                          <div className="text-gray-500 text-xs font-semibold uppercase mb-1">Tiền Hàng</div>
                          <div className="font-extrabold text-gray-800">{formatVND(donDangXem.tien_hang)}</div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 text-center border">
                          <div className="text-gray-500 text-xs font-semibold uppercase mb-1">Phí Ship</div>
                          <div className="font-extrabold text-gray-800">{formatVND(donDangXem.phi_ship)}</div>
                        </div>
                        <div className="bg-orange-50 rounded-2xl p-4 text-center border border-orange-100">
                          <div className="text-orange-500 text-xs font-semibold uppercase mb-1">Khuyến Mãi</div>
                          <div className="font-extrabold text-orange-600">
                            {donDangXem.chiet_khau_voucher>0?<div className="text-sm">Voucher: -{formatVND(donDangXem.chiet_khau_voucher)}</div>:null}
                            {donDangXem.tien_giam_tu_xu>0?<div className="text-sm text-green-600">Xu: -{formatVND(donDangXem.tien_giam_tu_xu)}</div>:null}
                            {!donDangXem.chiet_khau_voucher && !donDangXem.tien_giam_tu_xu && <span className="text-gray-400">—</span>}
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-200 shadow-sm">
                          <div className="text-green-600 text-xs font-semibold uppercase mb-1">Tổng Thanh Toán</div>
                          <div className="font-extrabold text-green-700 text-lg">{formatVND(donDangXem.tong_tien)}</div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white border rounded-2xl overflow-hidden text-sm shadow-sm">
                          <table className="w-full text-left">
                            <tbody className="divide-y">
                              <tr><td className="px-4 py-3 bg-gray-50 text-gray-600 font-semibold w-32 border-r">Quán Ăn</td><td className="px-4 py-3 font-bold">{donDangXem.ten_quan_an}</td></tr>
                              <tr><td className="px-4 py-3 bg-gray-50 text-gray-600 font-semibold border-r">Khách Hàng</td><td className="px-4 py-3">{donDangXem.ho_va_ten_khach_hang}</td></tr>
                              <tr><td className="px-4 py-3 bg-gray-50 text-gray-600 font-semibold border-r">Người Nhận</td><td className="px-4 py-3 text-blue-600 truncate">{donDangXem.ten_nguoi_nhan}</td></tr>
                              <tr><td className="px-4 py-3 bg-gray-50 text-gray-600 font-semibold border-r">Shipper</td><td className="px-4 py-3 font-semibold text-purple-600">{donDangXem.ho_va_ten_shipper||<span className="text-gray-300 italic">Chưa nhận đơn</span>}</td></tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="bg-white border rounded-2xl overflow-hidden text-sm shadow-sm">
                          <table className="w-full text-left">
                            <tbody className="divide-y">
                              <tr><td className="px-4 py-3 bg-gray-50 text-gray-600 font-semibold w-[130px] border-r">PT Thanh Toán</td><td className="px-4 py-3">{donDangXem.phuong_thuc_thanh_toan==1?<span className="text-green-600 font-bold"><i className="fa-solid fa-money-bill mr-1"/>Tiền Mặt</span>:<span className="text-blue-600 font-bold"><i className="fa-solid fa-qrcode mr-1"/>Chuyển Khoản</span>}</td></tr>
                              <tr><td className="px-4 py-3 bg-gray-50 text-gray-600 font-semibold border-r">TT Thanh Toán</td><td className="px-4 py-3">{donDangXem.is_thanh_toan==1?<span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">Đã thanh toán</span>:<span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold">Chưa thanh toán</span>}</td></tr>
                              <tr><td className="px-4 py-3 bg-purple-50 text-purple-700 font-semibold border-r items-start"><i className="fa-solid fa-sack-dollar mr-1"/>Lợi Nhuận Adm</td>
                                <td className="px-4 py-3 bg-purple-50/30">
                                  {donDangXem.tien_chiet_khau>0 ? <>
                                    <div className="font-extrabold text-purple-700 text-base">{formatVND(donDangXem.tien_chiet_khau)}</div>
                                    <div className="text-gray-500 text-xs mt-1">Từ quán: <span className="font-semibold text-gray-700">{formatVND(donDangXem.tien_hang-donDangXem.tien_quan_an)} ({donDangXem.chiet_khau_phan_tram}%)</span></div>
                                    {(donDangXem.phi_ship-donDangXem.tien_shipper)>0 && <div className="text-gray-500 text-xs">Từ ship: <span className="font-semibold text-gray-700">{formatVND(donDangXem.phi_ship-donDangXem.tien_shipper)} (10%)</span></div>}
                                  </> : <span className="text-gray-400 italic text-xs">Chưa chốt đối soát</span>}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ITEMS LIST */}
                      <div>
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center justify-between"><span className="flex items-center gap-2"><i className="fa-solid fa-utensils text-orange-500"/>Danh Sách Món Ăn</span> <span className="bg-gray-100 px-2.5 py-1 rounded text-xs text-gray-600">{tongSl} món</span></h4>
                        <div className="border rounded-2xl overflow-hidden shadow-sm">
                          <table className="w-full text-sm">
                            <thead><tr className="bg-gray-100/50 text-gray-500 font-semibold text-xs uppercase text-left">
                              <th className="px-4 py-3">Tên Món</th>
                              <th className="px-4 py-3 text-center">SL</th>
                              <th className="px-4 py-3 text-right">Đơn giá</th>
                              <th className="px-4 py-3 text-center">Ghi chú</th>
                              <th className="px-4 py-3 text-right">Thành tiền</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100 align-middle">
                              {chiTietDon.map((it,i)=>(
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 font-semibold text-gray-800">{it.ten_mon_an}{it.ten_size && <span className="ml-1 text-orange-500 text-xs">(Size {it.ten_size})</span>}</td>
                                  <td className="px-4 py-3 text-center font-bold">{it.so_luong}</td>
                                  <td className="px-4 py-3 text-right text-gray-500">{formatVND(it.don_gia)}</td>
                                  <td className="px-4 py-3 text-center text-xs text-gray-400">{it.ghi_chu||'—'}</td>
                                  <td className="px-4 py-3 text-right font-bold text-gray-700">{formatVND(it.thanh_tien)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50 text-right text-sm">
                              <tr><td colSpan={4} className="px-4 py-2 text-gray-500">Tiền hàng:</td><td className="px-4 py-2 font-bold">{formatVND(donDangXem.tien_hang)}</td></tr>
                              <tr><td colSpan={4} className="px-4 py-2 text-gray-500">Phí ship:</td><td className="px-4 py-2 font-bold">{formatVND(donDangXem.phi_ship)}</td></tr>
                              {donDangXem.chiet_khau_voucher>0 && <tr><td colSpan={4} className="px-4 py-2 text-orange-500">Giảm giá Voucher:</td><td className="px-4 py-2 font-bold text-orange-600">-{formatVND(donDangXem.chiet_khau_voucher)}</td></tr>}
                              {donDangXem.tien_giam_tu_xu>0 && <tr><td colSpan={4} className="px-4 py-2 text-green-500">Đã dùng Xu:</td><td className="px-4 py-2 font-bold text-green-600">-{formatVND(donDangXem.tien_giam_tu_xu)}</td></tr>}
                              <tr className="text-base"><td colSpan={4} className="px-4 py-3 font-bold text-gray-700">Tổng thu:</td><td className="px-4 py-3 font-extrabold text-green-600">{formatVND(donDangXem.tong_tien)}</td></tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* PROOF IMAGE */}
                      {donDangXem.anh_giao_hang && (
                        <div className="mt-6 border-t pt-6">
                          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <i className="fa-solid fa-camera text-blue-500"/> Ảnh Minh Chứng Giao Hàng
                          </h4>
                          <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-300 flex justify-center">
                            <img 
                              src={donDangXem.anh_giao_hang} 
                              alt="Ảnh minh chứng" 
                              className="max-h-80 rounded-xl shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(donDangXem.anh_giao_hang, '_blank')}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }
              </div>
            </div>

            {/* ─── TAB BẢN ĐỒ ─── */}
            {modalTab === 'ban_do' && (
              <div className="flex-1 flex flex-col overflow-hidden rounded-b-3xl">
                {loadingMap ? (
                  <div className="flex-1 flex items-center justify-center py-20 text-gray-400">
                    <div className="text-center">
                      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"/>
                      <p className="text-sm font-medium">Đang tải bản đồ...</p>
                    </div>
                  </div>
                ) : trackingData ? (
                  <>
                    {/* Info bar */}
                    <div className="px-5 py-3 bg-gray-50 border-b flex flex-wrap gap-4 text-sm shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLOR[trackingData.tinh_trang]}`}>
                          {STATUS_LABEL[trackingData.tinh_trang]}
                        </span>
                      </div>
                      {trackingData.shipper_name && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <i className="fa-solid fa-motorcycle text-blue-500"/>
                          <span className="font-semibold">{trackingData.shipper_name}</span>
                          <span className="text-gray-400">— {trackingData.shipper_phone}</span>
                        </div>
                      )}
                      {trackingData.last_location_update && (
                        <div className="text-gray-400 text-xs">
                          <i className="fa-regular fa-clock mr-1"/>
                          Cập nhật: {new Date(trackingData.last_location_update).toLocaleTimeString('vi-VN')}
                        </div>
                      )}
                      <div className="ml-auto">
                        <span className="text-xs text-blue-500 animate-pulse">
                          <i className="fa-solid fa-circle-notch fa-spin mr-1"/>Tự động làm mới mỗi 10s
                        </span>
                      </div>
                    </div>

                    {/* Bản đồ */}
                    <div
                      style={{ height: '360px', flexShrink: 0, position: 'relative' }}
                      onClick={() => setMapUnlocked(true)}
                      onMouseLeave={() => setMapUnlocked(false)}
                    >
                      {/* Overlay – nhấn để kích hoạt scroll bản đồ */}
                      {!mapUnlocked && (
                        <div style={{
                          position: 'absolute', inset: 0, zIndex: 10,
                          background: 'rgba(0,0,0,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', backdropFilter: 'blur(1px)',
                        }}>
                          <div style={{
                            background: 'rgba(0,0,0,0.55)', color: '#fff',
                            padding: '8px 18px', borderRadius: '999px',
                            fontSize: '13px', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '8px',
                          }}>
                            <i className="fa-solid fa-hand-pointer"/>
                            Nhấn vào bản đồ để cuộn
                          </div>
                        </div>
                      )}
                      {trackingData.customer_lat && (trackingData.shipper_lat || trackingData.restaurant_lat) ? (
                        // Hiển thị đường đi: shipper (hoặc quán) → khách
                        <iframe
                          key={`${trackingData.shipper_lat ?? trackingData.restaurant_lat}-${trackingData.customer_lat}`}
                          width="100%"
                          height="360"
                          style={{ border: 0, display: 'block' }}
                          loading="lazy"
                          src={`https://maps.google.com/maps?saddr=${
                            trackingData.shipper_lat
                              ? `${trackingData.shipper_lat},${trackingData.shipper_lng}`
                              : `${trackingData.restaurant_lat},${trackingData.restaurant_lng}`
                          }&daddr=${trackingData.customer_lat},${trackingData.customer_lng}&output=embed`}
                        />
                      ) : trackingData.restaurant_lat ? (
                        // Không có tọa độ khách, chỉ hiển thị vị trí quán
                        <iframe
                          width="100%"
                          height="360"
                          style={{ border: 0, display: 'block' }}
                          loading="lazy"
                          src={`https://maps.google.com/maps?q=${trackingData.restaurant_lat},${trackingData.restaurant_lng}&t=m&z=15&output=embed&iwloc=near`}
                        />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                          <i className="fa-solid fa-map-location-dot text-5xl text-gray-200 mb-3"/>
                          <p className="font-semibold">Chưa có tọa độ</p>
                          <p className="text-xs mt-1">Shipper chưa bật định vị hoặc quán chưa cập nhật tọa độ</p>
                        </div>
                      )}
                    </div>

                    {/* Địa chỉ bên dưới */}
                    <div className="px-5 py-4 border-t border-gray-100 bg-white rounded-b-3xl shrink-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-start gap-2 bg-orange-50 rounded-xl px-3 py-2.5">
                          <i className="fa-solid fa-store text-orange-500 mt-0.5"/>
                          <div>
                            <p className="font-bold text-orange-700 mb-0.5">Quán ăn</p>
                            <p className="text-gray-600">{trackingData.restaurant_address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 bg-green-50 rounded-xl px-3 py-2.5">
                          <i className="fa-solid fa-location-dot text-green-500 mt-0.5"/>
                          <div>
                            <p className="font-bold text-green-700 mb-0.5">Giao đến</p>
                            <p className="text-gray-600">{trackingData.customer_address}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400">
                    <i className="fa-solid fa-map-location-dot text-5xl text-gray-200 mb-3"/>
                    <p className="font-semibold">Không tải được dữ liệu bản đồ</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* HEADER & STATS CARDS */}
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-chart-line mr-3 text-blue-500"/>Báo Cáo - Thống Kê Đơn Hàng</h1>
        <p className="text-gray-500 text-sm mt-1">Tra cứu đầy đủ thông tin thanh toán, khuyến mãi, doanh thu đơn hàng</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <i className="fa-solid fa-receipt absolute -right-4 -bottom-4 text-8xl opacity-10"/>
          <div className="text-indigo-100 font-medium text-sm mb-1 uppercase tracking-wider">Tổng đơn hàng</div>
          <div className="text-4xl font-extrabold">{list.length}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <i className="fa-solid fa-sack-dollar absolute -right-4 -bottom-4 text-8xl opacity-10"/>
          <div className="text-purple-100 font-medium text-sm mb-1 uppercase tracking-wider">Tổng Tiền Lời Admin</div>
          <div className="text-4xl font-extrabold">{formatVND(stats.tongLoi)}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <i className="fa-solid fa-circle-check absolute -right-4 -bottom-4 text-8xl opacity-10"/>
          <div className="text-emerald-50 font-medium text-sm mb-1 uppercase tracking-wider">Đơn Thành Công</div>
          <div className="text-4xl font-extrabold">{stats.donThanhCong}</div>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tìm kiếm mã/tên</label>
          <div className="relative"><i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/><input value={filterKw} onChange={e=>setFilterKw(e.target.value)} type="text" placeholder="Tìm theo mã đơn, quán, KH..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"/></div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Trạng thái</label>
          <select value={filterTT} onChange={e=>setFilterTT(e.target.value)} className="w-[180px] px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500">
            <option value="">Tất cả</option>
            <option value="0">Chờ shipper</option>
            <option value="1">Chờ quán nhận</option>
            <option value="2">Quán đang làm</option>
            <option value="3">Đang giao</option>
            <option value="4">Thành công</option>
            <option value="5">Đã hủy</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Từ ngày</label>
          <input value={filterTu} onChange={e=>setFilterTu(e.target.value)} type="date" className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500"/>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Đến ngày</label>
          <input value={filterDen} onChange={e=>setFilterDen(e.target.value)} type="date" className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500"/>
        </div>
        <button onClick={resetFilter} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 text-sm mb-[1px]"><i className="fa-solid fa-rotate-right mr-2"/>Đặt lại</button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
          <h2 className="font-bold text-gray-800"><i className="fa-solid fa-list mr-2 text-blue-500"/>Thông Tin Đầy Đủ Đơn Hàng</h2>
          <button onClick={xuatExcel} className="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-xs rounded-xl shadow-sm"><i className="fa-solid fa-file-excel mr-2"/>Xuất Excel</button>
        </div>
        {loading ? <div className="py-24 text-center"><div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto"/></div>
        : filtered.length===0 ? <div className="py-24 text-center text-gray-400"><i className="fa-solid fa-file-invoice text-6xl mb-4 opacity-50 block"/>Không có đơn hàng nào khớp tìm kiếm</div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-semibold text-xs tracking-wider uppercase text-left whitespace-nowrap border-b border-gray-200 min-w-max">
                <th className="px-4 py-3 text-center">Mã Đơn</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Người Nhận & PT</th>
                <th className="px-4 py-3 text-right">Tiền Hàng</th>
                <th className="px-4 py-3 text-right">Phí Ship</th>
                <th className="px-4 py-3 text-right bg-orange-50/50">Khuyến Mãi</th>
                <th className="px-4 py-3 text-right bg-green-50/50 text-green-700">Tổng Tiền</th>
                <th className="px-4 py-3 text-right bg-purple-50/50 text-purple-700 w-32">Lời Admin</th>
                <th className="px-4 py-3 text-center">Trạng Thái</th>
                <th className="px-4 py-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 align-middle">
              {currentItems.map(v=>{
                return (
                  <tr key={v.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 text-center font-extrabold text-blue-600">{v.ma_don_hang}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(v.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800 truncate max-w-[150px]">{v.ho_va_ten_khach_hang}</div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        {v.phuong_thuc_thanh_toan==1?<span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">Tiền mặt</span>:<span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">Chuyển khoản</span>}
                        {v.is_thanh_toan?<span><i className="fa-solid fa-check text-green-500 ml-1"/> Đã TT</span>:<span><i className="fa-solid fa-xmark text-red-500 ml-1"/> Chưa TT</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 font-medium whitespace-nowrap">{formatVND(v.tien_hang)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 font-medium whitespace-nowrap">{formatVND(v.phi_ship)}</td>
                    <td className="px-4 py-3 text-right bg-orange-50/30 whitespace-nowrap">
                      {v.chiet_khau_voucher>0 && <div className="text-xs text-orange-500 font-bold mb-0.5"><i className="fa-solid fa-ticket mr-1"/>-{formatVND(v.chiet_khau_voucher)}</div>}
                      {v.tien_giam_tu_xu>0 && <div className="text-xs text-green-600 font-bold"><i className="fa-brands fa-bitcoin mr-1"/>-{formatVND(v.tien_giam_tu_xu)}</div>}
                      {!v.chiet_khau_voucher&&!v.tien_giam_tu_xu && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-green-600 bg-green-50/30 whitespace-nowrap">{formatVND(v.tong_tien)}</td>
                    <td className="px-4 py-3 text-right bg-purple-50/30 whitespace-nowrap">
                      {v.tien_chiet_khau>0 ? (
                        <>
                          <div className="font-extrabold text-purple-700">{formatVND(v.tien_chiet_khau)}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">Quán: {formatVND(v.tien_hang-v.tien_quan_an)}</div>
                          {(v.phi_ship-v.tien_shipper)>0&&<div className="text-[10px] text-gray-400">Ship: {formatVND(v.phi_ship-v.tien_shipper)}</div>}
                        </>
                      ) : <span className="text-xs text-gray-400 italic">Chưa đối soát</span>}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {v.tinh_trang==0 && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold whitespace-nowrap">Chờ shipper</span>}
                      {v.tinh_trang==1 && <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold whitespace-nowrap">Chờ quán nhận</span>}
                      {v.tinh_trang==2 && <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold whitespace-nowrap">Đang nấu</span>}
                      {v.tinh_trang==3 && <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold whitespace-nowrap">Đang giao</span>}
                      {v.tinh_trang==4 && (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold whitespace-nowrap flex items-center gap-1 justify-center">
                          Thành công
                          {v.anh_giao_hang && <i className="fa-solid fa-camera text-[10px]"/>}
                        </span>
                      )}
                      {v.tinh_trang==5 && <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold whitespace-nowrap">Bị hủy</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={()=>xemChiTiet(v)} className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors shadow-sm"><i className="fa-solid fa-eye"/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>}
          
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> trong <span className="font-bold text-gray-800">{filtered.length}</span> đơn hàng
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <i className="fa-solid fa-chevron-left text-xs" />
              </button>
              <div className="flex gap-1 text-sm font-semibold">
                {[...Array(totalPages)].map((_, idx) => {
                  const page = idx + 1;
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button key={page} onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {page}
                      </button>
                    );
                  }
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={`dots-${page}`} className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <i className="fa-solid fa-chevron-right text-xs" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
