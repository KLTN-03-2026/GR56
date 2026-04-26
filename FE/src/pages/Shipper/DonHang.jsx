import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { rtToast } from '../../components/RealtimeToast';
import { formatVND } from '../../utils/helpers';
import ChatBox from '../../components/ChatBox';

const sA = (url, method = 'get', data = null) => {
  const token = localStorage.getItem('shipper_login');
  const cfg = { headers: { Authorization: `Bearer ${token}` } };
  if (data instanceof FormData) {
    // XOÁ Content-Type để trình duyệt tự động sinh ra kèm theo chuỗi Boundary của File (BẮT BUỘC)
    cfg.headers['Content-Type'] = undefined;
  }
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

const FALLBACK_IMG = 'https://placehold.co/80x60?text=QA';
const FALLBACK_AVT = 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';
const safeImg = (url) => (!url || url === 'null' || url.includes('facebook.com') || url.includes('fbcdn.net')) ? FALLBACK_IMG : url;
const safeAvt = (url) => (!url || url === 'null' || url.includes('facebook.com') || url.includes('fbcdn.net')) ? FALLBACK_AVT : url;
const fDT = (dt) => { if (!dt) return ''; const d = new Date(dt); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };

const STATUS_MAP = {
  0: { label: 'Chờ shipper', color: 'bg-gray-100 text-gray-500', icon: 'fa-user-clock' },
  1: { label: 'Chờ quán nhận', color: 'bg-yellow-100 text-yellow-800', icon: 'fa-bell' },
  2: { label: 'Đang nấu', color: 'bg-orange-100 text-orange-800', icon: 'fa-fire-burner' },
  3: { label: 'Đang giao', color: 'bg-blue-100 text-blue-800', icon: 'fa-motorcycle' },
  4: { label: 'Hoàn tất', color: 'bg-green-100 text-green-800', icon: 'fa-circle-check' },
  5: { label: 'Đã hủy', color: 'bg-red-100 text-red-800', icon: 'fa-circle-xmark' },
};

function Pagination({ current, total, onChange, activeColor = 'bg-orange-500' }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button onClick={() => onChange(p => Math.max(1, p - 1))} disabled={current === 1} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm border border-gray-100">
        <i className="fa-solid fa-chevron-left text-xs" />
      </button>
      <div className="flex items-center gap-1">
        {[...Array(total)].map((_, idx) => {
          const p = idx + 1;
          if (p === 1 || p === total || (p >= current - 1 && p <= current + 1)) {
            return (
              <button key={p} onClick={() => onChange(p)} className={`w-10 h-10 flex items-center justify-center rounded-2xl font-bold text-sm transition-all shadow-sm ${current === p ? `${activeColor} text-white` : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                {p}
              </button>
            );
          }
          if (p === current - 2 || p === current + 2) return <span key={`dots-${p}`} className="w-6 text-center text-gray-300">...</span>;
          return null;
        })}
      </div>
      <button onClick={() => onChange(p => Math.min(total, p + 1))} disabled={current === total} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm border border-gray-100">
        <i className="fa-solid fa-chevron-right text-xs" />
      </button>
    </div>
  );
}

/* ----- Confirm Modal ----- */
function ConfirmNhanDon({ open, onClose, onConfirm, order }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 rounded-t-3xl" style={{ background: 'linear-gradient(135deg, #f7971e, #ffd200)' }}>
          <h3 className="font-bold text-gray-900"><i className="fa-solid fa-motorcycle mr-2" />Nhận Đơn Hàng</h3>
        </div>
        <div className="p-6 text-center">
          <i className="fa-solid fa-box text-5xl text-yellow-300 mb-4 block" />
          <p className="text-gray-600">Xác nhận nhận đơn <b className="text-yellow-600">#{order?.ma_don_hang}</b>?</p>
          <p className="text-gray-400 text-sm mt-1">Bạn sẽ chịu trách nhiệm giao đơn này!</p>
        </div>
        <div className="p-4 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={onConfirm} className="px-6 py-2 rounded-xl text-gray-900 font-bold text-sm hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #f7971e, #ffd200)' }}>Xác Nhận</button>
        </div>
      </div>
    </div>
  );
}

/* ----- Confirm Giao Hàng Modal ----- */
function ConfirmGiaoHangModal({ open, onClose, onConfirm, order }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  if (!open) return null;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target.result);
      reader.readAsDataURL(f);
    }
  };

  const submit = () => {
    onConfirm(order, file);
    setFile(null);
    setPreview(null);
  };

  const close = () => {
    setFile(null);
    setPreview(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={close}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 rounded-t-3xl bg-green-500">
          <h3 className="font-bold text-white"><i className="fa-solid fa-camera mr-2" />Xác Nhận Đã Giao</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-600 mb-4 text-sm">Cập nhật ảnh xác minh đã giao kiện hàng <b className="text-green-600">#{order?.ma_don_hang}</b> thành công.</p>
          
          <div className="relative inline-block w-full mb-2">
            {preview ? (
              <img src={preview} alt="preview" className="w-full h-48 object-cover rounded-xl border-2 border-green-500 mb-2" />
            ) : (
              <div className="w-full h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center mb-2">
                <i className="fa-solid fa-image text-4xl text-gray-300 mb-2"></i>
                <span className="text-gray-400 text-sm">Chưa có ảnh</span>
              </div>
            )}
            
            <label className="cursor-pointer flex items-center justify-center w-full py-2.5 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition shadow-sm">
              <i className="fa-solid fa-camera mr-2"></i> Chọn ảnh / Chụp ảnh
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        </div>
        <div className="p-4 border-t flex gap-3 justify-end">
          <button onClick={close} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={submit} disabled={!file} className="px-6 py-2 rounded-xl text-white font-bold text-sm bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-colors">Đã Giao</button>
        </div>
      </div>
    </div>
  );
}

/* ----- Chi Tiết Modal ----- */
function ChiTietModal({ open, onClose, order, items }) {
  if (!open || !order) return null;
  const ST_BADGE = {
    1: 'bg-yellow-100 text-yellow-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-blue-100 text-blue-800',
    4: 'bg-green-100 text-green-800',
    5: 'bg-red-100 text-red-800',
  };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 text-white rounded-t-3xl flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
          <div>
            <h3 className="font-bold"><i className="fa-solid fa-receipt mr-2" />Chi tiết đơn</h3>
            <div className="text-purple-200 text-xs mt-0.5">#{order.ma_don_hang}</div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status + time */}
          <div className="flex items-center justify-between">
            {(() => { const st = STATUS_MAP[order.tinh_trang] || STATUS_MAP[4]; return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${st.color}`}><i className={`fa-solid ${st.icon}`} />{st.label}</span>; })()}
            <span className="text-gray-400 text-xs">{fDT(order.created_at)}</span>
          </div>

          {/* Restaurant + Customer */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4 flex gap-3">
              <img src={safeImg(order.hinh_anh)} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" onError={e => e.target.src=FALLBACK_IMG} />
              <div className="min-w-0">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Quán ăn</div>
                <div className="font-semibold text-gray-800 text-sm truncate">{order.ten_quan_an}</div>
                <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><i className="fa-solid fa-location-dot text-red-400" />{order.dia_chi_quan}</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 flex gap-3">
              <img src={safeAvt(order.avatar)} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" onError={e => e.target.src=FALLBACK_AVT} />
              <div className="min-w-0">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Khách hàng</div>
                <div className="font-semibold text-gray-800 text-sm">{order.ten_nguoi_nhan}</div>
                <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><i className="fa-solid fa-location-dot text-red-400" />{order.dia_chi_khach}</div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="font-bold text-gray-700 text-sm mb-3"><i className="fa-solid fa-bowl-food mr-2 text-orange-400" />Món đã đặt ({items.length})</h4>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  {item.hinh_anh
                    ? <img src={item.hinh_anh} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" onError={e => e.target.style.display='none'} />
                    : <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0"><i className="fa-solid fa-bowl-food text-gray-400" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 text-sm">{item.ten_mon_an}{item.ten_size && <span className="ml-1 text-orange-500 text-xs">(Size {item.ten_size})</span>}</div>
                    <div className="text-xs text-gray-400">{formatVND(item.don_gia)} × {item.so_luong}</div>
                    {item.ghi_chu && <div className="text-xs bg-yellow-50 text-yellow-700 rounded px-2 py-0.5 mt-1">{item.ghi_chu}</div>}
                  </div>
                  <div className="font-bold text-purple-600 text-sm">{formatVND(item.thanh_tien)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="space-y-2 bg-gray-50 rounded-2xl p-4">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Tiền hàng</span><span className="font-semibold">{formatVND(order.tien_hang)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Phí ship</span><span className="font-semibold text-blue-600">{formatVND(order.phi_ship)}</span></div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-bold">Tổng cộng</span>
              <span className="font-extrabold text-purple-600 text-base">{formatVND(order.tong_tien)}</span>
            </div>
            <div className={`text-center text-xs font-bold py-1 rounded-lg ${order.is_thanh_toan == 1 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {order.is_thanh_toan == 1 ? '✅ Đã thanh toán' : '⚠️ Chưa thanh toán (COD)'}
            </div>
          </div>

          {order.anh_giao_hang && (
            <div className="bg-gray-50 rounded-2xl p-4 mt-4">
              <h4 className="font-bold text-gray-700 text-sm mb-3"><i className="fa-solid fa-camera mr-2 text-blue-500" />Ảnh xác nhận giao hàng</h4>
              <img src={order.anh_giao_hang.startsWith('http') ? order.anh_giao_hang : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${order.anh_giao_hang}`} alt="Proof" className="w-full h-auto max-h-64 object-contain rounded-xl border border-gray-200" />
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end">
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-gray-800 text-white font-semibold text-sm hover:bg-gray-900">Đóng</button>
        </div>
      </div>
    </div>
  );
}

/* ----- Order Card (available) ----- */
function AvailableCard({ order, onNhan, onXemChiTiet }) {
  const pttt = order.phuong_thuc_thanh_toan == 1 ? { label: 'COD', cls: 'text-orange-600' } : order.is_thanh_toan == 1 ? { label: 'Đã CK', cls: 'text-green-600' } : { label: 'Chưa TT', cls: 'text-red-500' };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden hover:shadow-md transition-all">
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #f7971e, #ffd200)' }}>
        <span className="font-extrabold text-gray-900">#{order.ma_don_hang}</span>
        <span className="text-gray-700 text-xs">{fDT(order.created_at || order.gio_tao_don)}</span>
      </div>
      <div className="p-4">
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <img src={safeImg(order.hinh_anh)} alt="" className="w-10 h-10 rounded-lg object-cover" onError={e => e.target.src=FALLBACK_IMG} />
              <div>
                <div className="font-bold text-gray-800 text-sm">{order.ten_quan_an}</div>
                <div className="text-xs text-gray-400">{order.dia_chi_quan}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <img src={safeAvt(order.avatar)} alt="" className="w-8 h-8 rounded-full object-cover" onError={e => e.target.src=FALLBACK_AVT} />
              <div>
                <div className="font-semibold text-gray-700 text-sm">{order.ten_nguoi_nhan}</div>
                <div className="text-xs text-gray-400">{order.dia_chi_khach}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 border-t pt-3">
          <div><div>Thu Khách (COD)</div><div className="font-bold text-red-500 text-sm">{order.is_thanh_toan == 1 ? '0 đ' : formatVND(order.tong_tien)}</div></div>
          <div className="text-center"><div>Ship Nhận</div><div className="font-bold text-green-600 text-sm">{formatVND(order.phi_ship)}</div></div>
          <div className="text-right"><div>Loại thanh toán</div><div className={`font-bold mt-0.5 px-2 py-0.5 rounded-full inline-block ${order.is_thanh_toan == 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{order.is_thanh_toan == 1 ? 'Đã CK' : 'Tiền Mặt'}</div></div>
        </div>
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <button onClick={() => onXemChiTiet(order)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all">
          <i className="fa-solid fa-eye mr-2" />Chi Tiết
        </button>
        <button onClick={() => onNhan(order)} className="flex-1 py-3 rounded-xl text-gray-900 font-bold hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #f7971e, #ffd200)' }}>
          <i className="fa-solid fa-motorcycle mr-2" />Nhận Đơn
        </button>
      </div>
    </div>
  );
}

/* ----- Order Card (delivering) ----- */
function DeliveringCard({ order, onGiao, onXemChiTiet, onChat, onReport }) {
  const pct = Math.min(order.tinh_trang * 35, 100);
  const pttt = order.phuong_thuc_thanh_toan == 1 ? { label: 'COD', cls: 'text-orange-600' } : order.is_thanh_toan == 1 ? { label: 'Đã CK', cls: 'text-green-600' } : { label: 'Chưa TT', cls: 'text-red-500' };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden hover:shadow-md transition-all">
      <div className="px-4 py-3 flex items-center justify-between bg-cyan-500">
        <span className="font-extrabold text-white">#{order.ma_don_hang}</span>
        <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded-full">{STATUS_MAP[order.tinh_trang]?.label}</span>
      </div>
      <div className="p-4">
        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            {['Nhận đơn', 'Quán nhận', 'Đang nấu', 'Đang giao', 'Xong'].map((s, i) => (
              <span key={i} className={order.tinh_trang > i ? 'text-green-500 font-semibold' : ''}>{s}</span>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${order.tinh_trang * 25}%` }} />
          </div>
        </div>

        <div className="flex gap-3 mb-3">
          <img src={safeImg(order.hinh_anh)} alt="" className="w-14 h-14 rounded-xl object-cover" onError={e => e.target.src=FALLBACK_IMG} />
          <div>
            <div className="font-bold text-gray-800">{order.ten_quan_an}</div>
            <div className="text-xs text-gray-400">{order.dia_chi_quan}</div>
          </div>
        </div>
        <div className="flex gap-3 mb-3">
          <img src={safeAvt(order.avatar)} alt="" className="w-14 h-14 rounded-full object-cover" onError={e => e.target.src=FALLBACK_AVT} />
          <div>
            <div className="font-bold text-gray-800">{order.ten_nguoi_nhan}</div>
            <div className="text-xs text-gray-400">{order.dia_chi_khach}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 border-t pt-3 mb-3">
          <div><div>Thu Khách (COD)</div><div className="font-bold text-red-500 text-sm">{order.is_thanh_toan == 1 ? '0 đ' : formatVND(order.tong_tien)}</div></div>
          <div className="text-center"><div>Ship Nhận</div><div className="font-bold text-green-600 text-sm">{formatVND(order.phi_ship)}</div></div>
          <div className="text-right"><div>Loại thanh toán</div><div className={`font-bold mt-0.5 px-2 py-0.5 rounded-full inline-block ${order.is_thanh_toan == 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{order.is_thanh_toan == 1 ? 'Đã CK' : 'Tiền Mặt'}</div></div>
        </div>

        {order.tinh_trang < 3
          ? <button disabled className="w-full py-2.5 rounded-xl bg-yellow-100 text-yellow-700 font-bold text-sm cursor-not-allowed">
              <i className="fa-solid fa-hourglass-half mr-2 animate-spin" style={{ animationDuration: '3s' }} />
              {order.tinh_trang == 1 ? 'Chờ quán xác nhận...' : 'Quán đang chế biến...'}
            </button>
          : <button onClick={() => onGiao(order)}
              className="w-full py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors">
              <i className="fa-solid fa-circle-check mr-2" />Đã Giao Hàng
            </button>
        }
        <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => onChat(order)} className="py-2.5 rounded-xl bg-blue-100 text-blue-700 font-bold text-sm hover:bg-blue-200 transition-colors">
              <i className="fa-solid fa-comments mr-2" />Nhắn tin
            </button>
            <button onClick={() => onXemChiTiet(order)} className="py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
              <i className="fa-solid fa-eye mr-2" />Chi Tiết
            </button>
            <button onClick={() => onReport(order)} className="col-span-2 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 font-semibold text-sm hover:bg-orange-100 transition-colors">
              <i className="fa-solid fa-triangle-exclamation mr-2" />Báo Sự Cố / Yêu Cầu Hủy
            </button>
        </div>
      </div>
    </div>
  );
}

/* ----- Cancelled Card ----- */
function CancelledCard({ order, onXemChiTiet }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden hover:shadow-md transition-all">
      <div className="px-4 py-3 flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-500">
        <i className="fa-solid fa-circle-xmark text-white" />
        <span className="font-extrabold text-white">{order.ma_don_hang ? `#${order.ma_don_hang}` : '---'}</span>
        <span className="ml-auto text-xs text-white/70">{fDT(order.created_at)}</span>
      </div>
      <div className="p-4">
        {/* Info tag */}
        <div className="mb-3 flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
          <i className="fa-solid fa-triangle-exclamation text-red-400 text-sm" />
          <span className="text-xs text-red-600 font-semibold">Đơn hàng đã bị hủy theo yêu cầu</span>
        </div>

        <div className="flex gap-3 mb-3">
          <img src={safeImg(order.hinh_anh)} alt="" className="w-14 h-14 rounded-xl object-cover opacity-60" onError={e => e.target.src=FALLBACK_IMG} />
          <div>
            <div className="font-bold text-gray-700">{order.ten_quan_an}</div>
            <div className="text-xs text-gray-400">{order.dia_chi_quan}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              <i className="fa-solid fa-user mr-1" />{order.ten_nguoi_nhan}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
          <div>
            <div>Tổng đơn</div>
            <div className="font-bold text-gray-500 text-sm line-through">{formatVND(order.tong_tien)}</div>
          </div>
          <div className="text-right">
            <div>Phí ship</div>
            <div className="font-bold text-gray-500 text-sm line-through">{formatVND(order.phi_ship)}</div>
          </div>
        </div>

        <button onClick={() => onXemChiTiet(order)}
          className="w-full py-2 rounded-xl border border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
          <i className="fa-solid fa-eye" />Xem Chi Tiết
        </button>
      </div>
    </div>
  );
}

/* ----- Completed Card ----- */
function CompletedCard({ order, onXemChiTiet, onReport }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden hover:shadow-md transition-all">
      <div className="px-4 py-3 flex items-center gap-2 bg-green-500">
        <i className="fa-solid fa-circle-check text-white" />
        <span className="font-extrabold text-white">#{order.ma_don_hang}</span>
        <span className="ml-auto text-xs text-white/70">{fDT(order.created_at)}</span>
      </div>
      <div className="p-4">
        <div className="flex gap-3 mb-3">
          <img src={safeImg(order.hinh_anh)} alt="" className="w-14 h-14 rounded-xl object-cover" onError={e => e.target.src=FALLBACK_IMG} />
          <div>
            <div className="font-bold text-gray-800">{order.ten_quan_an}</div>
            <div className="text-xs text-gray-400">{order.dia_chi_quan}</div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-xs text-gray-500 mb-3">
          <div><div>Đã Thu (COD)</div><div className="font-bold text-gray-700 text-sm">{order.is_thanh_toan == 1 ? '0 đ' : formatVND(order.tong_tien)}</div></div>
          <div className="text-center"><div>Ship Nhận</div><div className="font-bold text-green-600 text-sm">{formatVND(order.phi_ship)}</div></div>
          <div className="text-right"><div>Loại thanh toán</div><div className={`font-bold mt-0.5 px-2 py-0.5 rounded-full inline-block ${order.is_thanh_toan == 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{order.is_thanh_toan == 1 ? 'Đã CK' : 'Tiền Mặt'}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onXemChiTiet(order)} className="py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
            <i className="fa-solid fa-eye mr-2" />Xem Chi Tiết
          </button>
          <button onClick={() => onReport(order)} className="py-2 rounded-xl bg-red-50 border border-red-100 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors">
            <i className="fa-solid fa-flag mr-2" />Báo Cáo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----- MAIN PAGE ----- */
export default function ShipperDonHang() {
  const [tab, setTab] = useState('available');
  const [available, setAvailable] = useState([]);
  const [delivering, setDelivering] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [cancelled, setCancelled] = useState([]);
  const [loading, setLoading] = useState(true);

  const [confirmOrder, setConfirmOrder] = useState(null);
  const [giaoHangOrder, setGiaoHangOrder] = useState(null);
  const [chiTietOrder, setChiTietOrder] = useState(null);
  const [chiTietItems, setChiTietItems] = useState([]);

  const [pageAvailable, setPageAvailable] = useState(1);
  const [pageDelivering, setPageDelivering] = useState(1);
  const [pageCompleted, setPageCompleted] = useState(1);
  const [pageCancelled, setPageCancelled] = useState(1);
  const itemsPerPage = 6;

  const [chatOrder, setChatOrder] = useState(null);
  const [reportOrder, setReportOrder] = useState(null);
  const [reportForm, setReportForm] = useState({ tieu_de: '', noi_dung: '', hinh_anh: null, yeu_cau_huy: false, ly_do_huy: '' });
  const [reportLoading, setReportLoading] = useState(false);

  const currentAvailable = available.slice((pageAvailable - 1) * itemsPerPage, pageAvailable * itemsPerPage);
  const totalAvailable = Math.ceil(available.length / itemsPerPage);

  const currentDelivering = delivering.slice((pageDelivering - 1) * itemsPerPage, pageDelivering * itemsPerPage);
  const totalDelivering = Math.ceil(delivering.length / itemsPerPage);

  const currentCompleted = completed.slice((pageCompleted - 1) * itemsPerPage, pageCompleted * itemsPerPage);
  const totalCompleted = Math.ceil(completed.length / itemsPerPage);

  const currentCancelled = cancelled.slice((pageCancelled - 1) * itemsPerPage, pageCancelled * itemsPerPage);
  const totalCancelled = Math.ceil(cancelled.length / itemsPerPage);

  const unmountEchoRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // Fetch shipper info first to get ID
      try {
         const authRes = await sA('/api/shipper/data-login');
         if (isMounted && authRes.data?.status && authRes.data?.data?.id) {
            const userId = authRes.data.data.id;
            unmountEchoRef.current = await setupRealtime(userId);
         } else if (isMounted) {
            unmountEchoRef.current = await setupRealtime(null);
         }
      } catch {
         if (isMounted) unmountEchoRef.current = await setupRealtime(null);
      }
      
      if (isMounted) {
         await loadAll();
      }
    };

    init();

    return () => {
       isMounted = false;
       if (unmountEchoRef.current) {
          unmountEchoRef.current();
          unmountEchoRef.current = null;
       }
    };
  }, []);

  const loadAll = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        sA('/api/shipper/don-hang/data'),
        sA('/api/shipper/don-hang/data-dang-giao'),
      ]);
      setAvailable(r1.data.list_don_hang_co_the_nhan || []);
      setDelivering(r2.data.data || []);
      setCompleted(r2.data.list_don_hang_hoan_thanh || []);
      setCancelled(r2.data.list_don_hang_da_huy || []);
    } catch {}
    finally { if (!silent) setLoading(false); }
  };

  const setupRealtime = async (userId) => {
    const { default: echo, updateEchoToken } = await import('../../utils/echo');
    updateEchoToken();
    
    // 1. All shippers channel
    const allChannel = echo.private('all-shippers');
    allChannel.listen('.don-hang.moi', (data) => {
       const dh = data.don_hang || data || {};
       toast.success(`📦 Có đơn hàng mới! mã đơn: ${dh.ma_don_hang || ''}`, {
          duration: 10000,
          position: 'top-right'
       });
       setTab('available'); // ← Tự chuyển sang tab "Có thể nhận"
       setTimeout(() => loadAll(true), 500); // silent refresh
    });
    allChannel.listen('.don-hang.da-thanh-toan', (data) => {
       const dh = data.don_hang || data || {};
       if (dh.ma_don_hang) {
          toast.success(`💳 Đơn #${dh.ma_don_hang} vừa được khách thanh toán online!`, {
             duration: 8000,
             position: 'top-right'
          });
          setTimeout(() => loadAll(true), 500); // silent refresh
       }
    });
    allChannel.listen('.don-hang.cho-nhan', () => {
       setTimeout(() => loadAll(true), 500); // silent refresh
    });

    // 2. Personal channel
    if (userId) {
       const personalChannel = echo.private(`shipper.${userId}`);
       personalChannel.listen('.don-hang.dang-lam', (data) => {
          const dh = data.don_hang || data || {};
          rtToast.show({ type: 'order', title: 'Quán đang chế biến!', message: `Quán đang nấu đơn #${dh.ma_don_hang || ''}.`, orderCode: dh.ma_don_hang, duration: 6000 });
          setTimeout(() => loadAll(true), 500);
       });
       personalChannel.listen('.don-hang.da-xong', (data) => {
          const dh = data.don_hang || data || {};
          rtToast.show({ type: 'success', title: 'Quán đã cận xịp xong!', message: `Đơn #${dh.ma_don_hang || ''} đã sẵn sàng. Hãy đến lấy hàng!`, orderCode: dh.ma_don_hang, duration: 8000 });
          setTab('delivering');
          setTimeout(() => loadAll(true), 500);
       });
       personalChannel.listen('.don-hang.thu-hoi', () => {
          rtToast.show({ type: 'error', title: 'Một đơn bị thu hồi!', message: 'Một đơn hàng đã bị hệ thống thu hồi.', duration: 6000 });
          setTimeout(() => loadAll(true), 500);
       });
       personalChannel.listen('.don-hang.da-huy', (data) => {
          const dh = data.don_hang || data || {};
          rtToast.show({
            type: 'cancel',
            title: 'Đơn hàng đã bị hủy!',
            message: `Đơn #${dh.ma_don_hang || ''} đã bị admin hủy theo yêu cầu khách hàng.`,
            orderCode: dh.ma_don_hang,
            duration: 8000,
          });
          setTab('cancelled');
          setTimeout(() => loadAll(true), 500);
       });
    }

    return () => {
       echo.leave('all-shippers');
       if (userId) echo.leave(`shipper.${userId}`);
    };
  };

  const handleNhanDon = async () => {
    try {
      const r = await sA('/api/shipper/don-hang/nhan-don', 'post', confirmOrder);
      if (r.data.status) {
        toast.success(r.data.message);
        setConfirmOrder(null);
        setTab('delivering'); // ← Tự chuyển sang tab "Đang giao" sau khi nhận đơn
        loadAll(true); // silent refresh — không show skeleton
      } else toast.error(r.data.message);
    } catch { toast.error('Lỗi!'); }
  };

  const handleGiao = async (order, file) => {
    try {
      if (!file) {
        toast.error('Vui lòng tải lên ảnh xác minh!');
        return;
      }

      const formData = new FormData();
      formData.append('id', order.id);
      formData.append('anh_giao_hang', file);

      const r = await sA('/api/shipper/don-hang/hoan-thanh', 'post', formData);
      if (r.data.status) {
        toast.success(r.data.message);
        setGiaoHangOrder(null);
        loadAll(true); // silent refresh — không show skeleton
      } else toast.error(r.data.message);
    } catch { toast.error('Lỗi truyền tải!'); }
  };

  const handleXemChiTiet = async (order) => {
    setChiTietOrder(order);
    setChiTietItems([]);
    try {
      const r = await sA('/api/shipper/don-hang/chi-tiet-mon-an', 'post', order);
      if (r.data.status) {
        setChiTietItems(r.data.data || []);
        if (r.data.don_hang) setChiTietOrder(r.data.don_hang);
      }
    } catch {}
  };

  const handleReport = (order) => {
    setReportOrder(order);
    setReportForm({ tieu_de: '', noi_dung: '', hinh_anh: null, yeu_cau_huy: false, ly_do_huy: '' });
  };

  const sendReport = async () => {
    if (!reportForm.tieu_de.trim() || !reportForm.noi_dung.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung!');
      return;
    }
    if (reportForm.yeu_cau_huy && !reportForm.ly_do_huy.trim()) {
      toast.error('Vui lòng nhập lý do yêu cầu hủy đơn!');
      return;
    }
    setReportLoading(true);
    try {
      const fd = new FormData();
      fd.append('tieu_de', reportForm.tieu_de);
      fd.append('noi_dung', reportForm.noi_dung);
      if (reportOrder?.id) fd.append('id_don_hang', reportOrder.id);
      if (reportForm.hinh_anh) fd.append('hinh_anh', reportForm.hinh_anh);
      if (reportForm.yeu_cau_huy) { fd.append('yeu_cau_huy', '1'); fd.append('ly_do_huy', reportForm.ly_do_huy); }
      const r = await sA('/api/shipper/reports/create', 'post', fd);
      if (r.data.status) {
        toast.success(r.data.message);
        setReportOrder(null);
        setReportForm({ tieu_de: '', noi_dung: '', hinh_anh: null, yeu_cau_huy: false, ly_do_huy: '' });
      } else toast.error(r.data.message);
    } catch { toast.error('Lỗi gửi báo cáo!'); }
    finally { setReportLoading(false); }
  };

  const TABS = [
    { key: 'available', label: 'Có thể nhận', count: available.length, icon: 'fa-list-ul', color: 'text-yellow-600' },
    { key: 'delivering', label: 'Đang giao', count: delivering.length, icon: 'fa-motorcycle', color: 'text-blue-600' },
    { key: 'completed', label: 'Hoàn thành', count: completed.length, icon: 'fa-circle-check', color: 'text-green-600' },
    { key: 'cancelled', label: 'Đã hủy', count: cancelled.length, icon: 'fa-circle-xmark', color: 'text-red-500' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-box mr-3 text-orange-500" />Quản Lý Đơn Hàng</h1>
          <p className="text-gray-500 text-sm mt-1">Nhận và giao đơn hàng của bạn</p>
        </div>
        <button onClick={loadAll} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-100 text-orange-700 font-semibold text-sm hover:bg-orange-200 transition-colors">
          <i className="fa-solid fa-rotate-right" />Làm mới
        </button>
      </div>

      <div className="mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${tab === t.key ? 'bg-white shadow-md' : 'bg-white/50 hover:bg-white/80'}`}>
              <i className={`fa-solid ${t.icon} ${tab === t.key ? t.color : 'text-gray-400'}`} />
              <span className={tab === t.key ? 'text-gray-800' : 'text-gray-400'}>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tab === t.key ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="pb-10">
            {tab === 'available' && (
              available.length === 0
                ? <div className="text-center py-24 bg-white rounded-2xl border-dashed border-2 border-gray-200"><i className="fa-solid fa-box-open text-6xl text-gray-300 mb-4 block" /><p className="text-gray-400 font-semibold">Không có đơn nào để nhận</p></div>
                : <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentAvailable.map((o, i) => <AvailableCard key={o.id || i} order={o} onNhan={setConfirmOrder} onXemChiTiet={handleXemChiTiet} />)}
                    </div>
                    {totalAvailable > 1 && (
                      <Pagination current={pageAvailable} total={totalAvailable} onChange={setPageAvailable} activeColor="bg-orange-500" />
                    )}
                  </>
            )}
            {tab === 'delivering' && (
              delivering.length === 0
                ? <div className="text-center py-24 bg-white rounded-2xl border-dashed border-2 border-gray-200"><i className="fa-solid fa-motorcycle text-6xl text-gray-300 mb-4 block" /><p className="text-gray-400 font-semibold">Không có đơn đang giao</p></div>
                : <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentDelivering.map((o, i) => (
                        <DeliveringCard 
                          key={o.id || i} 
                          order={o} 
                          onGiao={setGiaoHangOrder} 
                          onXemChiTiet={handleXemChiTiet} 
                          onChat={setChatOrder}
                          onReport={handleReport}
                        />
                      ))}
                    </div>
                    {totalDelivering > 1 && (
                      <Pagination current={pageDelivering} total={totalDelivering} onChange={setPageDelivering} activeColor="bg-blue-600" />
                    )}
                  </>
            )}
            {tab === 'completed' && (
              completed.length === 0
                ? <div className="text-center py-24 bg-white rounded-2xl border-dashed border-2 border-gray-200"><i className="fa-solid fa-circle-check text-6xl text-gray-300 mb-4 block" /><p className="text-gray-400 font-semibold">Chưa hoàn thành đơn nào</p></div>
                : <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentCompleted.map((o, i) => <CompletedCard key={o.id || i} order={o} onXemChiTiet={handleXemChiTiet} onReport={handleReport} />)}
                    </div>
                    {totalCompleted > 1 && (
                      <Pagination current={pageCompleted} total={totalCompleted} onChange={setPageCompleted} activeColor="bg-green-600" />
                    )}
                  </>
            )}
            {tab === 'cancelled' && (
              cancelled.length === 0
                ? <div className="text-center py-24 bg-white rounded-2xl border-dashed border-2 border-red-100">
                    <i className="fa-solid fa-circle-xmark text-6xl text-red-200 mb-4 block" />
                    <p className="text-gray-400 font-semibold">Không có đơn hàng bị hủy</p>
                  </div>
                : <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentCancelled.map((o, i) => <CancelledCard key={o.id || i} order={o} onXemChiTiet={handleXemChiTiet} />)}
                    </div>
                    {totalCancelled > 1 && (
                      <Pagination current={pageCancelled} total={totalCancelled} onChange={setPageCancelled} activeColor="bg-red-500" />
                    )}
                  </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmNhanDon open={!!confirmOrder} onClose={() => setConfirmOrder(null)} onConfirm={handleNhanDon} order={confirmOrder} />
      <ConfirmGiaoHangModal open={!!giaoHangOrder} onClose={() => setGiaoHangOrder(null)} onConfirm={handleGiao} order={giaoHangOrder} />
      <ChiTietModal open={!!chiTietOrder} onClose={() => setChiTietOrder(null)} order={chiTietOrder} items={chiTietItems} />
      
      {chatOrder && (
          <ChatBox 
            orderId={chatOrder.id} 
            currentUserType="shipper" 
            onClose={() => setChatOrder(null)}
            otherPartyName={chatOrder.ten_nguoi_nhan}
          />
      )}

      {/* Report Modal */}
      {reportOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReportOrder(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className={`p-5 rounded-t-3xl flex items-center justify-between ${reportForm.yeu_cau_huy ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
              <div>
                <h3 className="font-bold text-white text-base">
                  <i className={`fa-solid ${reportForm.yeu_cau_huy ? 'fa-circle-stop' : 'fa-flag'} mr-2`} />
                  {reportForm.yeu_cau_huy ? 'Yêu cầu hủy đơn hàng' : 'Báo cáo / Khiếu nại'}
                </h3>
                <p className="text-white/70 text-xs mt-0.5">Đơn #{reportOrder.ma_don_hang}</p>
              </div>
              <button onClick={() => setReportOrder(null)} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Yêu cầu hủy - chỉ hiện khi đơn đang active */}
              {[0,1,2,3].includes(reportOrder.tinh_trang) && (
                <div className={`rounded-2xl border-2 p-4 transition-all cursor-pointer ${reportForm.yeu_cau_huy ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50 hover:border-orange-200'}`}
                  onClick={() => setReportForm(f => ({ ...f, yeu_cau_huy: !f.yeu_cau_huy, ly_do_huy: '' }))}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${reportForm.yeu_cau_huy ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                      {reportForm.yeu_cau_huy && <i className="fa-solid fa-check text-white text-xs" />}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-sm">⚠️ Yêu cầu hủy đơn hàng</div>
                      <div className="text-xs text-gray-500 mt-0.5">Sự cố khẩn cấp? Admin sẽ xem xét và xử lý hoàn tiền nếu cần.</div>
                    </div>
                  </div>
                  {reportForm.yeu_cau_huy && (
                    <div className="mt-3" onClick={e => e.stopPropagation()}>
                      <label className="block text-xs font-bold text-orange-700 mb-1.5">Lý do yêu cầu hủy <span className="text-red-400">*</span></label>
                      <textarea rows={2} value={reportForm.ly_do_huy} onChange={e => setReportForm(f => ({ ...f, ly_do_huy: e.target.value }))}
                        placeholder="VD: Bị tai nạn, không thể liên hệ khách hàng..."
                        className="w-full px-3 py-2 rounded-xl border border-orange-300 text-sm focus:outline-none focus:border-orange-500 bg-white resize-none" />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tiêu đề <span className="text-red-400">*</span></label>
                <input value={reportForm.tieu_de} onChange={e => setReportForm(f => ({ ...f, tieu_de: e.target.value }))}
                  placeholder={reportForm.yeu_cau_huy ? 'VD: Yêu cầu hủy đơn vì sự cố' : 'VD: Khách hàng khó tính, địa chỉ sai...'}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nội dung chi tiết <span className="text-red-400">*</span></label>
                <textarea rows={3} value={reportForm.noi_dung} onChange={e => setReportForm(f => ({ ...f, noi_dung: e.target.value }))}
                  placeholder="Mô tả chi tiết vấn đề..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ảnh đính kèm</label>
                <input type="file" accept="image/*" onChange={e => setReportForm(f => ({ ...f, hinh_anh: e.target.files[0] }))}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-red-50 file:text-red-700 file:font-semibold hover:file:bg-red-100 cursor-pointer" />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setReportOrder(null)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Đóng</button>
              <button onClick={sendReport} disabled={reportLoading}
                className={`px-6 py-2 rounded-xl text-white font-bold text-sm disabled:opacity-60 flex items-center gap-2 transition-colors ${reportForm.yeu_cau_huy ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600'}`}>
                {reportLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className={`fa-solid ${reportForm.yeu_cau_huy ? 'fa-circle-stop' : 'fa-paper-plane'}`} />}
                {reportForm.yeu_cau_huy ? 'Gửi yêu cầu hủy' : 'Gửi báo cáo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
