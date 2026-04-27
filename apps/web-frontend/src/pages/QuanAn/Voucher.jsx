import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/helpers';

const qA = (url, method = 'get', data = null) => {
  const token = localStorage.getItem('quan_an_login');
  const cfg = { headers: { Authorization: `Bearer ${token}` } };
  return method === 'get' ? api.get(url, cfg) : api.post(url, data, cfg);
};

const EMPTY_V = { tinh_trang: '1', loai_giam: 1 };
const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5';

function VoucherModal({ open, onClose, title, data, onChange, onSubmit }) {
  if (!open) return null;
  const isAdd = title.includes('Thêm');
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className={`p-5 rounded-t-3xl flex items-center justify-between ${isAdd ? 'bg-green-600' : 'bg-blue-600'}`}>
          <h3 className="font-bold text-white"><i className="fa-solid fa-ticket mr-2" />{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl" /></button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={LABEL}>Mã Voucher</label><input value={data.ma_code || ''} onChange={e => onChange({ ...data, ma_code: e.target.value })} className={INPUT} placeholder="VD: SALE50" /></div>
          <div><label className={LABEL}>Tên Voucher</label><input value={data.ten_voucher || ''} onChange={e => onChange({ ...data, ten_voucher: e.target.value })} className={INPUT} /></div>
          <div><label className={LABEL}>Hình Ảnh (URL)</label><input value={data.hinh_anh || ''} onChange={e => onChange({ ...data, hinh_anh: e.target.value })} className={INPUT} /></div>
          <div><label className={LABEL}>Tình Trạng</label>
            <select value={data.tinh_trang ?? '1'} onChange={e => onChange({ ...data, tinh_trang: e.target.value })} className={INPUT}>
              <option value="1">Hiển Thị</option>
              <option value="0">Tạm Tắt</option>
            </select>
          </div>
          <div><label className={LABEL}>Loại Giảm</label>
            <select value={data.loai_giam ?? 1} onChange={e => onChange({ ...data, loai_giam: e.target.value })} className={INPUT}>
              <option value="1">Phần Trăm (%)</option>
              <option value="0">Tiền Mặt (đ)</option>
            </select>
          </div>
          <div><label className={LABEL}>{data.loai_giam == 1 ? 'Phần Trăm Giảm (%)' : 'Số Tiền Giảm (đ)'}</label>
            <input type="number" value={data.so_giam_gia || ''} onChange={e => onChange({ ...data, so_giam_gia: e.target.value })} className={INPUT} /></div>
          <div><label className={LABEL}>Số Tiền Tối Đa (đ)</label><input type="number" value={data.so_tien_toi_da || ''} onChange={e => onChange({ ...data, so_tien_toi_da: e.target.value })} className={INPUT} /></div>
          <div><label className={LABEL}>Đơn Hàng Tối Thiểu (đ)</label><input type="number" value={data.don_hang_toi_thieu || ''} onChange={e => onChange({ ...data, don_hang_toi_thieu: e.target.value })} className={INPUT} /></div>
          <div><label className={LABEL}>Ngày Bắt Đầu</label><input type="date" value={data.thoi_gian_bat_dau || ''} onChange={e => onChange({ ...data, thoi_gian_bat_dau: e.target.value })} className={INPUT} /></div>
          <div><label className={LABEL}>Ngày Kết Thúc</label><input type="date" value={data.thoi_gian_ket_thuc || ''} onChange={e => onChange({ ...data, thoi_gian_ket_thuc: e.target.value })} className={INPUT} /></div>
        </div>
        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={onSubmit} className={`px-6 py-2 rounded-xl text-white font-bold text-sm ${isAdd ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {isAdd ? 'Thêm Mới' : 'Cập Nhật'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDel({ open, onClose, onConfirm, code }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 bg-red-500 rounded-t-3xl"><h3 className="font-bold text-white"><i className="fa-solid fa-triangle-exclamation mr-2" />Xóa Voucher</h3></div>
        <div className="p-6 text-center">
          <i className="fa-solid fa-ticket-slash text-5xl text-red-200 mb-4 block" />
          <p className="text-gray-600">Xóa voucher <b className="text-red-500">{code}</b>?</p>
        </div>
        <div className="p-4 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button>
          <button onClick={onConfirm} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button>
        </div>
      </div>
    </div>
  );
}

export default function QuanAnVoucher() {
  const [vouchers, setVouchers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_V });
  const [editForm, setEditForm] = useState({});
  const [delForm, setDelForm] = useState({});

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = async () => { try { const r = await qA('/api/quan-an/voucher/data'); setVouchers(r.data.data || []); } catch {} };

  const handleAdd = async () => {
    try { const r = await qA('/api/quan-an/voucher/create', 'post', addForm); if (r.data.status) { toast.success(r.data.message); setShowAdd(false); setAddForm({ ...EMPTY_V }); fetchVouchers(); } else toast.error(r.data.message); }
    catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
  };
  const handleEdit = async () => {
    try { const r = await qA('/api/quan-an/voucher/update', 'post', editForm); toast.success(r.data.message); setShowEdit(false); fetchVouchers(); }
    catch (e) { Object.values(e?.response?.data?.errors || {}).forEach(v => toast.error(v[0])); }
  };
  const handleDel = async () => {
    try { const r = await qA('/api/quan-an/voucher/delete', 'post', delForm); if (r.data.status) { toast.success(r.data.message); setShowDel(false); fetchVouchers(); } }
    catch {}
  };
  const handleChange = async (item) => {
    try { const r = await qA('/api/quan-an/voucher/change', 'post', item); if (r.data.status) { toast.success(r.data.message); fetchVouchers(); } }
    catch {}
  };

  const isExpired = (date) => date && new Date(date) < new Date();

  return (
    <div className="p-6">
      <VoucherModal open={showAdd} onClose={() => setShowAdd(false)} title="Thêm Mới Voucher" data={addForm} onChange={setAddForm} onSubmit={handleAdd} />
      <VoucherModal open={showEdit} onClose={() => setShowEdit(false)} title="Cập Nhật Voucher" data={editForm} onChange={setEditForm} onSubmit={handleEdit} />
      <ConfirmDel open={showDel} onClose={() => setShowDel(false)} onConfirm={handleDel} code={delForm.ma_code} />

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-ticket mr-3 text-green-500" />Quản Lý Voucher</h1>
          <p className="text-gray-400 text-sm mt-1">{vouchers.length} voucher</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors">
          <i className="fa-solid fa-plus" />Thêm Mới
        </button>
      </div>

      {vouchers.length === 0
        ? <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
            <i className="fa-solid fa-ticket text-6xl text-gray-200 mb-4 block" />
            <p className="text-gray-400">Chưa có voucher nào</p>
          </div>
        : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vouchers.map((v, i) => {
              const expired = isExpired(v.thoi_gian_ket_thuc);
              return (
                <div key={i} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${v.tinh_trang == 0 || expired ? 'opacity-60 border-gray-200' : 'border-green-100'}`}>
                  {/* Top */}
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 flex items-center justify-between">
                    <div>
                      <span className="text-white font-extrabold text-xl tracking-widest">{v.ma_code}</span>
                      <p className="text-green-100 text-xs mt-0.5">{v.ten_voucher}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-extrabold text-lg">
                        {v.loai_giam == 1 ? `-${v.so_giam_gia}%` : `-${formatVND(v.so_giam_gia)}`}
                      </div>
                      <div className="text-green-100 text-xs">{v.loai_giam == 1 ? 'Phần trăm' : 'Tiền mặt'}</div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-2 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span><i className="fa-solid fa-arrow-down mr-1 text-green-400" />Đơn tối thiểu</span>
                      <span className="font-semibold text-gray-700">{formatVND(v.don_hang_toi_thieu)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span><i className="fa-solid fa-up-right-and-down-left-from-center mr-1 text-blue-400" />Giảm tối đa</span>
                      <span className="font-semibold text-gray-700">{formatVND(v.so_tien_toi_da)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span><i className="fa-regular fa-calendar mr-1 text-orange-400" />HSD</span>
                      <span className={`font-semibold ${expired ? 'text-red-500' : 'text-gray-700'}`}>{v.thoi_gian_ket_thuc || '—'}</span>
                    </div>
                    {expired && <div className="text-center text-red-400 font-bold text-xs bg-red-50 rounded-lg py-1">Đã hết hạn</div>}
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex items-center gap-2">
                    <button onClick={() => handleChange(v)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors ${v.tinh_trang == 1 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                      {v.tinh_trang == 1 ? <><i className="fa-solid fa-eye mr-1" />Hiển thị</> : <><i className="fa-solid fa-eye-slash mr-1" />Tạm tắt</>}
                    </button>
                    <button onClick={() => { setEditForm({ ...v }); setShowEdit(true); }}
                      className="px-3 py-1.5 rounded-xl bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-colors">
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button onClick={() => { setDelForm(v); setShowDel(true); }}
                      className="px-3 py-1.5 rounded-xl bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 transition-colors">
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}
