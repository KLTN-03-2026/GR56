import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/helpers';
import { exportToExcel, ExcelButton } from '../../utils/exportExcel';

const adm = (url, method='get', data=null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method==='get' ? api.get(url,cfg) : api.post(url,data,cfg);
};
const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5';
const EMPTY = { ma_code:'', ten_voucher:'', hinh_anh:'', thoi_gian_bat_dau:'', thoi_gian_ket_thuc:'', loai_giam:'1', so_giam_gia:0, so_tien_toi_da:50000, don_hang_toi_thieu:100000, so_luot_toi_da:'', tinh_trang:'1' };

function Modal({ open, onClose, title, headerCls='bg-purple-600', children, footer, wide=false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-3xl w-full ${wide?'max-w-3xl':'max-w-lg'} shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}>
        <div className={`p-5 ${headerCls} rounded-t-3xl flex items-center justify-between`}>
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fa-solid fa-xmark text-xl"/></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        {footer && <div className="p-4 border-t flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

function VoucherForm({ form, onChange }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div><label className={LABEL}>Mã Code</label><input value={form.ma_code||''} onChange={e=>onChange({...form,ma_code:e.target.value})} placeholder="VD: SUMMER2026" className={INPUT}/></div>
      <div><label className={LABEL}>Tên Voucher</label><input value={form.ten_voucher||''} onChange={e=>onChange({...form,ten_voucher:e.target.value})} className={INPUT}/></div>
      <div className="sm:col-span-2"><label className={LABEL}>Hình ảnh (URL)</label><input value={form.hinh_anh||''} onChange={e=>onChange({...form,hinh_anh:e.target.value})} placeholder="https://..." className={INPUT}/></div>
      <div><label className={LABEL}>Ngày bắt đầu</label><input type="date" value={form.thoi_gian_bat_dau||''} onChange={e=>onChange({...form,thoi_gian_bat_dau:e.target.value})} className={INPUT}/></div>
      <div><label className={LABEL}>Ngày kết thúc</label><input type="date" value={form.thoi_gian_ket_thuc||''} onChange={e=>onChange({...form,thoi_gian_ket_thuc:e.target.value})} className={INPUT}/></div>
      <div><label className={LABEL}>Loại giảm</label><select value={form.loai_giam||'1'} onChange={e=>onChange({...form,loai_giam:e.target.value})} className={INPUT}><option value="1">Giảm %</option><option value="0">Tiền mặt</option></select></div>
      <div><label className={LABEL}>Số giảm giá <span className="text-gray-400 font-normal">(% hoặc VNĐ)</span></label><input type="number" value={form.so_giam_gia||0} onChange={e=>onChange({...form,so_giam_gia:e.target.value})} className={INPUT}/></div>
      <div><label className={LABEL}>Số tiền tối đa (VNĐ)</label><input type="number" value={form.so_tien_toi_da||''} onChange={e=>onChange({...form,so_tien_toi_da:e.target.value})} className={INPUT}/></div>
      <div><label className={LABEL}>Đơn hàng tối thiểu (VNĐ)</label><input type="number" value={form.don_hang_toi_thieu||''} onChange={e=>onChange({...form,don_hang_toi_thieu:e.target.value})} className={INPUT}/></div>
      <div><label className={LABEL}>Lượt dùng tối đa <span className="text-gray-400 font-normal">(Bỏ trống = Không giới hạn)</span></label><input type="number" value={form.so_luot_toi_da||''} onChange={e=>onChange({...form,so_luot_toi_da:e.target.value})} className={INPUT}/></div>
      <div><label className={LABEL}>Tình trạng</label><select value={form.tinh_trang||'1'} onChange={e=>onChange({...form,tinh_trang:e.target.value})} className={INPUT}><option value="1">Hiển thị</option><option value="0">Tạm tắt</option></select></div>
      <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700">
        <i className="fa-solid fa-globe mr-2"/>Voucher do <b>Admin</b> tạo áp dụng cho <b>tất cả quán</b> trên hệ thống.
      </div>
    </div>
  );
}

export default function AdminVoucher() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [createForm, setCreateForm] = useState({...EMPTY});
  const [editForm, setEditForm] = useState({});
  const [delForm, setDelForm] = useState({});
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showBatch, setShowBatch] = useState(false);
  const [batchPkgs, setBatchPkgs] = useState([
    { key: 'free_ship', label: 'Miễn Phí Vận Chuyển (Giảm 30K)', enabled: false, so_luong: 20, han_dung: 7 },
    { key: 'flash_sale', label: 'Flash Sale (Giảm 15%)', enabled: false, so_luong: 20, han_dung: 7 },
    { key: 'cuoi_tuan', label: 'Cuối Tuần (Giảm 20%)', enabled: false, so_luong: 20, han_dung: 3 },
    { key: 'don_lon', label: 'Đơn Lớn (Giảm 50K)', enabled: false, so_luong: 20, han_dung: 14 },
    { key: 'chao_mung', label: 'Khách Mới (Giảm 20K)', enabled: false, so_luong: 50, han_dung: 30 },
    { key: 'gio_vang', label: 'Giờ Vàng (Giảm 10%)', enabled: false, so_luong: 30, han_dung: 7 },
  ]);

  useEffect(()=>{fetchList();},[]);
  const fetchList = async () => { setLoading(true); try{const r=await adm('/api/admin/voucher/data');setList(r.data.data||[]); setCurrentPage(1);}catch{}finally{setLoading(false);} };
  const handleCreate = async () => {
    try { const r=await adm('/api/admin/voucher/create','post',createForm); if(r.data.status){toast.success(r.data.message);setShowCreate(false);setCreateForm({...EMPTY});fetchList();}else toast.error(r.data.message); }
    catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));}
  };
  const handleEdit = async () => {
    try { const r=await adm('/api/admin/voucher/update','post',editForm); if(r.data.status){toast.success(r.data.message);setShowEdit(false);fetchList();}else toast.error(r.data.message); }
    catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));}
  };
  const handleDel = async () => { try{const r=await adm('/api/admin/voucher/delete','post',delForm);if(r.data.status){toast.success(r.data.message);setShowDel(false);fetchList();}else toast.error(r.data.message);}catch{} };
  const changeStatus = async (v) => { try{const r=await adm('/api/admin/voucher/change-status','post',v);if(r.data.status){toast.success(r.data.message);fetchList();}else toast.error(r.data.message);}catch{} };
  const handleBatch = async () => {
    const pkgs = batchPkgs.filter(p => p.enabled);
    if (!pkgs.length) return toast.error("Vui lòng chọn ít nhất 1 loại voucher để tạo!");
    try {
      const r = await adm('/api/admin/voucher/batch-generate', 'post', { packages: pkgs });
      if (r.data.status) {
        toast.success(r.data.message);
        setShowBatch(false);
        fetchList();
      } else toast.error(r.data.message);
    } catch(e) { toast.error(e?.response?.data?.message || 'Có lỗi xảy ra'); }
  };

  const totalPages = Math.ceil(list.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = list.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6">
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Thêm Mã Giảm Giá" wide
        footer={<><button onClick={()=>setShowCreate(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleCreate} className="px-6 py-2 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700">Tạo mới</button></>}>
        <VoucherForm form={createForm} onChange={setCreateForm}/>
      </Modal>
      <Modal open={showEdit} onClose={()=>setShowEdit(false)} title="Cập Nhật Voucher" headerCls="bg-purple-700" wide
        footer={<><button onClick={()=>setShowEdit(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleEdit} className="px-6 py-2 rounded-xl bg-purple-700 text-white font-bold text-sm hover:bg-purple-800">Lưu</button></>}>
        <VoucherForm form={editForm} onChange={setEditForm}/>
      </Modal>
      <Modal open={showDel} onClose={()=>setShowDel(false)} title="Xóa Voucher" headerCls="bg-red-500"
        footer={<><button onClick={()=>setShowDel(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleDel} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button></>}>
        <div className="text-center py-4"><i className="fa-solid fa-ticket text-5xl text-red-200 mb-3 block"/>
          <p className="text-gray-600">Xóa voucher: <b className="text-red-500">{delForm.ma_code}</b>?</p></div>
      </Modal>

      <Modal open={showBatch} onClose={()=>setShowBatch(false)} title="Tạo Voucher Nhanh" headerCls="bg-orange-500" wide
        footer={<><button onClick={()=>setShowBatch(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleBatch} className="px-6 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600"><i className="fa-solid fa-wand-magic-sparkles mr-2"/>Tạo ngay</button></>}>
        <div className="bg-orange-50 text-orange-800 text-sm px-4 py-3 rounded-xl mb-4 leading-relaxed">
          <i className="fa-solid fa-bolt mr-2 text-orange-500"/>Chọn các loại voucher mẫu để hệ thống <b>tự động sinh mã ngẫu nhiên</b>.<br/>
          Các gói này đã được thiết kế tối ưu lợi nhuận cho quán và thu hút khách.
        </div>
        <div className="space-y-3">
          {batchPkgs.map((p, i) => (
            <div key={i} className={`flex items-center gap-4 p-3 border rounded-xl transition-all ${p.enabled ? 'border-orange-400 bg-orange-50/30 shadow-sm' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/10'}`}>
              <div className="flex items-center justify-center w-8">
                <input type="checkbox" checked={p.enabled} onChange={(e) => {
                  const arr = [...batchPkgs]; arr[i].enabled = e.target.checked; setBatchPkgs(arr);
                }} className="w-5 h-5 accent-orange-500 rounded cursor-pointer"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800 text-sm truncate">{p.label}</div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-500 uppercase">Số lượng (mã)</label>
                <input type="number" min="1" value={p.so_luong} disabled={!p.enabled} onChange={e=> {const arr = [...batchPkgs]; arr[i].so_luong = e.target.value; setBatchPkgs(arr);}} className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-orange-500 outline-none disabled:bg-gray-100 disabled:opacity-50"/></div>
                <div className="flex flex-col"><label className="text-[10px] font-bold text-gray-500 uppercase">Hạn dùng (ngày)</label>
                <input type="number" min="1" value={p.han_dung} disabled={!p.enabled} onChange={e=> {const arr = [...batchPkgs]; arr[i].han_dung = e.target.value; setBatchPkgs(arr);}} className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-orange-500 outline-none disabled:bg-gray-100 disabled:opacity-50"/></div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-ticket mr-3 text-purple-500"/>Quản Lý Voucher</h1>
          <p className="text-gray-400 text-sm mt-1">{list.length} voucher hệ thống và voucher quán ăn</p></div>
        <div className="flex items-center gap-3">
          <ExcelButton color="green" disabled={list.length === 0} onClick={() => exportToExcel(
            list,
            [
              { label: 'Mã Code',       key: 'ma_code',            width: 18 },
              { label: 'Tên Voucher',   key: 'ten_voucher',         width: 30 },
              { label: 'Bắt đầu',       key: 'thoi_gian_bat_dau',  width: 14 },
              { label: 'Kết thúc',      key: 'thoi_gian_ket_thuc', width: 14 },
              { label: 'Loại giảm',     key: 'loai_giam',          width: 12, format: v => v == 1 ? 'Giảm %' : 'Tiền mặt' },
              { label: 'Số giảm',       key: 'so_giam_gia',        width: 12 },
              { label: 'Tối đa (VNĐ)', key: 'so_tien_toi_da',     width: 16, format: v => Number(v).toLocaleString('vi-VN') },
              { label: 'Đơn tối thiểu', key: 'don_hang_toi_thieu', width: 16, format: v => Number(v).toLocaleString('vi-VN') },
              { label: 'Lượt đã dùng',  key: 'so_luot_da_dung',   width: 14 },
              { label: 'Lượt tối đa',   key: 'so_luot_toi_da',    width: 14, format: v => v || '∞' },
              { label: 'Phạm vi',       key: 'id_quan_an',         width: 20, format: (v, r) => (!v || v == 0) ? 'Toàn hệ thống' : (r.ten_quan_an || 'Quán #' + v) },
              { label: 'Tình trạng',    key: 'tinh_trang',         width: 14, format: v => v == 1 ? 'Hiển thị' : 'Tạm tắt' },
            ],
            'Voucher', 'Voucher'
          )} />
          <button onClick={()=>setShowBatch(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-white text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all outline-none ring-2 ring-orange-500/20 ring-offset-2"><i className="fa-solid fa-bolt"/>Tạo Hàng Loạt</button>
          <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold shadow-md hover:bg-purple-700 transition-colors"><i className="fa-solid fa-plus"/>Thêm thủ công</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin"/></div>
        : list.length===0 ? <div className="text-center py-24"><i className="fa-solid fa-ticket text-6xl text-gray-200 mb-4 block"/><p className="text-gray-400">Không có voucher nào</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-purple-50 text-gray-600 font-semibold text-xs uppercase">
              <th className="px-3 py-3 text-left">Mã Code</th>
              <th className="px-3 py-3 text-left">Tên</th>
              <th className="px-3 py-3 text-center">Thời gian</th>
              <th className="px-3 py-3 text-center">Loại giảm</th>
              <th className="px-3 py-3 text-right">Số giảm</th>
              <th className="px-3 py-3 text-right">Tối đa</th>
              <th className="px-3 py-3 text-right">Đơn tối thiểu</th>
              <th className="px-3 py-3 text-center">Lượt</th>
              <th className="px-3 py-3 text-center">Phạm vi</th>
              <th className="px-3 py-3 text-center">Tình trạng</th>
              <th className="px-3 py-3 text-center">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.map((v, i) => (
                <tr key={v.id || i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3"><code className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-md text-xs">{v.ma_code}</code></td>
                  <td className="px-3 py-3 font-medium text-gray-800 max-w-36 truncate">{v.ten_voucher}</td>
                  <td className="px-3 py-3 text-center text-xs text-gray-500">{v.thoi_gian_bat_dau} → {v.thoi_gian_ket_thuc}</td>
                  <td className="px-3 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${v.loai_giam==1?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{v.loai_giam==1?'Giảm %':'Tiền mặt'}</span></td>
                  <td className="px-3 py-3 text-right font-bold text-red-600 text-xs">{v.loai_giam==1?`${v.so_giam_gia}%`:formatVND(v.so_giam_gia)}</td>
                  <td className="px-3 py-3 text-right text-xs text-gray-600">{formatVND(v.so_tien_toi_da)}</td>
                  <td className="px-3 py-3 text-right text-xs text-gray-600">{formatVND(v.don_hang_toi_thieu)}</td>
                  <td className="px-3 py-3 text-center text-xs"><span className="font-bold text-green-600">{v.so_luot_da_dung||0}</span>{v.so_luot_toi_da?<>/<span className="text-gray-400">{v.so_luot_toi_da}</span></>:<span className="text-gray-300">/∞</span>}</td>
                  <td className="px-3 py-3 text-center">
                    {!v.id_quan_an||v.id_quan_an==0
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700"><i className="fa-solid fa-globe mr-1"/>Toàn hệ thống</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700"><i className="fa-solid fa-store mr-1"/>{v.ten_quan_an}</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={()=>changeStatus(v)} className={`px-3 py-1 rounded-lg text-xs font-bold w-full transition-colors ${v.tinh_trang==1?'bg-cyan-100 text-cyan-700 hover:bg-cyan-200':'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {v.tinh_trang==1?'Hiển thị':'Tạm tắt'}</button>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={()=>{setEditForm({...v});setShowEdit(true);}} className="px-2.5 py-1.5 rounded-lg bg-purple-100 text-purple-700 text-xs hover:bg-purple-200"><i className="fa-solid fa-pen"/></button>
                      <button onClick={()=>{setDelForm(v);setShowDel(true);}} className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs hover:bg-red-200"><i className="fa-solid fa-trash"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Hiển thị <span className="font-bold text-gray-800">{startIndex + 1}</span> - <span className="font-bold text-gray-800">{Math.min(startIndex + itemsPerPage, list.length)}</span> trong <span className="font-bold text-gray-800">{list.length}</span> voucher
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <i className="fa-solid fa-chevron-left text-xs" />
                </button>
                
                <div className="flex gap-1 text-sm font-semibold">
                  {[...Array(totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    // Show current, first, last, and +/- 1 page from current
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button key={page} onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <i className="fa-solid fa-chevron-right text-xs" />
                </button>
              </div>
            </div>
          )}
        </div>
        }
      </div>
    </div>
  );
}
