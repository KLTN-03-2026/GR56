import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatVND, toSlug } from '../../utils/helpers';
import { exportToExcel, ExcelButton } from '../../utils/exportExcel';

const adm = (url, method='get', data=null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method==='get' ? api.get(url,cfg) : (method==='get_params' ? api.get(url,{...cfg,params:data}) : api.post(url,data,cfg));
};
const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5';

function Modal({ open, onClose, title, headerCls='bg-red-600', children, footer, wide=false }) {
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

const MonAnForm = ({ form, onChange, listQA, listDM }) => (
  <div className="grid sm:grid-cols-2 gap-3">
    <div>
      <label className={LABEL}>Tên món ăn</label>
      <input 
        value={form.ten_mon_an||''} 
        onChange={e=>{
          const val = e.target.value;
          onChange({...form, ten_mon_an: val, slug_mon_an: toSlug(val)});
        }} 
        className={INPUT}
      />
    </div>
    <div><label className={LABEL}>Slug</label><input value={form.slug_mon_an||''} onChange={e=>onChange({...form,slug_mon_an:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>Giá bán</label><input type="number" value={form.gia_ban||0} onChange={e=>onChange({...form,gia_ban:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>Giá khuyến mãi</label><input type="number" value={form.gia_khuyen_mai||0} onChange={e=>onChange({...form,gia_khuyen_mai:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>Quán ăn</label><select value={form.id_quan_an||''} onChange={e=>onChange({...form,id_quan_an:e.target.value})} className={INPUT}><option value="">-- Chọn quán ăn --</option>{listQA.map(q=><option key={q.id} value={q.id}>{q.ten_quan_an}</option>)}</select></div>
    <div><label className={LABEL}>Danh mục</label><select value={form.id_danh_muc||''} onChange={e=>onChange({...form,id_danh_muc:e.target.value})} className={INPUT}><option value="">-- Chọn danh mục --</option>{listDM.map(d=><option key={d.id} value={d.id}>{d.ten_danh_muc}</option>)}</select></div>
    <div className="sm:col-span-2"><label className={LABEL}>Hình ảnh (URL)</label><input value={form.hinh_anh||''} onChange={e=>onChange({...form,hinh_anh:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>Tình trạng</label><select value={form.tinh_trang||'1'} onChange={e=>onChange({...form,tinh_trang:e.target.value})} className={INPUT}><option value="1">Hiển thị</option><option value="0">Tạm tắt</option></select></div>
  </div>
);

const ToppingForm = ({ form, onChange, listQA }) => (
  <div className="grid sm:grid-cols-2 gap-3">
    <div><label className={LABEL}>Quán ăn</label><select value={form.id_quan_an||''} onChange={e=>onChange({...form,id_quan_an:e.target.value})} className={INPUT}><option value="">-- Chọn quán ăn --</option>{listQA.map(q=><option key={q.id} value={q.id}>{q.ten_quan_an}</option>)}</select></div>
    <div><label className={LABEL}>Tên topping</label><input value={form.ten_topping||''} onChange={e=>onChange({...form,ten_topping:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>Giá</label><input type="number" value={form.gia||0} onChange={e=>onChange({...form,gia:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>Loại</label><select value={form.loai||'all'} onChange={e=>onChange({...form,loai:e.target.value})} className={INPUT}><option value="all">Tất cả</option><option value="drink">Đồ uống</option><option value="food">Đồ ăn</option></select></div>
    <div className="sm:col-span-2"><label className={LABEL}>Mô tả</label><textarea rows={2} value={form.mo_ta||''} onChange={e=>onChange({...form,mo_ta:e.target.value})} className={`${INPUT} resize-none`}/></div>
  </div>
);

// ======== TAB: MÓN ĂN ========
function TabMonAn() {
  const [list, setList] = useState([]);
  const [listQA, setListQA] = useState([]);
  const [listDM, setListDM] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const EMPTY = { ten_mon_an:'', slug_mon_an:'', gia_ban:0, gia_khuyen_mai:0, id_quan_an:'', tinh_trang:'1', hinh_anh:'', id_danh_muc:'' };
  const [createForm, setCreateForm] = useState({...EMPTY});
  const [editForm, setEditForm] = useState({});
  const [delForm, setDelForm] = useState({});

  useEffect(()=>{ loadData(); },[]);
  const loadData = async () => { setLoading(true); try{const r=await adm('/api/admin/mon-an/data');setList(r.data.data||[]);setListQA(r.data.quan_an||[]);setListDM(r.data.danh_muc||[]);}catch{}finally{setLoading(false);} };
  const handleCreate = async () => { try{const r=await adm('/api/admin/mon-an/create','post',createForm);if(r.data.status){toast.success(r.data.message);setShowCreate(false);setCreateForm({...EMPTY});loadData();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const handleEdit = async () => { try{const r=await adm('/api/admin/mon-an/update','post',editForm);if(r.data.status){toast.success(r.data.message);setShowEdit(false);loadData();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const handleDel = async () => { try{const r=await adm('/api/admin/mon-an/delete','post',delForm);if(r.data.status){toast.success(r.data.message);setShowDel(false);loadData();}else toast.error(r.data.message);}catch{} };
  const changeStatus = async (v) => { try{const r=await adm('/api/admin/mon-an/change-status','post',v);if(r.data.status){toast.success(r.data.message);loadData();}else toast.error(r.data.message);}catch{} };


  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const currentItems = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(list.length / itemsPerPage);

  return (
    <div>
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Thêm Món Ăn" headerCls="bg-red-500" wide
        footer={<><button onClick={()=>setShowCreate(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleCreate} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Thêm mới</button></>}>
        <MonAnForm form={createForm} onChange={setCreateForm} listQA={listQA} listDM={listDM}/>
      </Modal>
      <Modal open={showEdit} onClose={()=>setShowEdit(false)} title="Cập Nhật Món Ăn" headerCls="bg-red-600" wide
        footer={<><button onClick={()=>setShowEdit(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleEdit} className="px-6 py-2 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700">Lưu</button></>}>
        <MonAnForm form={editForm} onChange={setEditForm} listQA={listQA} listDM={listDM}/>
      </Modal>
      <Modal open={showDel} onClose={()=>setShowDel(false)} title="Xóa Món Ăn" headerCls="bg-red-500"
        footer={<><button onClick={()=>setShowDel(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleDel} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button></>}>
        <div className="text-center py-4"><i className="fa-solid fa-utensils text-5xl text-red-200 mb-3 block"/>
          <p className="text-gray-600">Xóa: <b className="text-red-500">{delForm.ten_mon_an}</b>?</p></div>
      </Modal>

      <div className="flex justify-end mb-4 gap-3">
        <ExcelButton disabled={list.length === 0} onClick={() => exportToExcel(
          list.map((m, i) => ({ ...m, __stt: i + 1 })),
          [
            { label: 'STT',          key: '__stt',         width: 6 },
            { label: 'Tên món ăn',   key: 'ten_mon_an',    width: 25 },
            { label: 'Giá bán',      key: 'gia_ban',       width: 14, format: v => Number(v).toLocaleString('vi-VN') },
            { label: 'Khuyến mãi',   key: 'gia_khuyen_mai',width: 14, format: v => v > 0 ? Number(v).toLocaleString('vi-VN') : '—' },
            { label: 'Quán ăn',      key: 'ten_quan_an',   width: 25 },
            { label: 'Danh mục',     key: 'ten_danh_muc',  width: 20 },
            { label: 'Tình trạng',   key: 'tinh_trang',    width: 14, format: v => v == 1 ? 'Hiển thị' : 'Tạm tắt' },
          ],
          'MonAn', 'Món Ăn'
        )} />
        <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600"><i className="fa-solid fa-plus"/>Thêm Món Ăn</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-red-100 border-t-red-500 rounded-full animate-spin"/></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-red-50 text-gray-600 font-semibold text-xs uppercase">
              <th className="px-3 py-3 text-center">#</th>
              <th className="px-3 py-3 text-left">Tên món ăn</th>
              <th className="px-3 py-3 text-center">Hình ảnh</th>
              <th className="px-3 py-3 text-right">Giá bán</th>
              <th className="px-3 py-3 text-right">Khuyến mãi</th>
              <th className="px-3 py-3 text-left">Quán ăn</th>
              <th className="px-3 py-3 text-left">Danh mục</th>
              <th className="px-3 py-3 text-center">Tình trạng</th>
              <th className="px-3 py-3 text-center">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.map((m,i)=>(
                <tr key={m.id||i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 text-center text-gray-400 text-xs">{(currentPage-1)*itemsPerPage+i+1}</td>
                  <td className="px-3 py-3 font-semibold text-gray-800">{m.ten_mon_an}</td>
                  <td className="px-3 py-3 text-center">{m.hinh_anh?<img src={m.hinh_anh} alt="" className="w-14 h-14 object-cover rounded-xl mx-auto" onError={e=>e.target.style.display='none'}/>:<span className="text-gray-300 text-xs">—</span>}</td>
                  <td className="px-3 py-3 text-right font-bold text-gray-700">{formatVND(m.gia_ban)}</td>
                  <td className="px-3 py-3 text-right text-red-500">{m.gia_khuyen_mai>0?formatVND(m.gia_khuyen_mai):<span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-3 text-xs text-gray-600">{m.ten_quan_an}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{m.ten_danh_muc}</td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={()=>changeStatus(m)} className={`px-3 py-1 rounded-lg text-xs font-bold w-full transition-colors ${m.tinh_trang==1?'bg-green-100 text-green-700 hover:bg-green-200':'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                      {m.tinh_trang==1?'Hiển thị':'Tạm tắt'}</button>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={()=>{setEditForm({...m});setShowEdit(true);}} className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs hover:bg-red-200"><i className="fa-solid fa-pen"/></button>
                      <button onClick={()=>{setDelForm(m);setShowDel(true);}} className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200"><i className="fa-solid fa-trash"/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length===0 && <tr><td colSpan="9" className="text-center py-16 text-gray-400">Không có món ăn nào</td></tr>}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, list.length)}</span> trong <span className="font-bold text-gray-800">{list.length}</span> món ăn
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
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button key={page} onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
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

// ======== TAB: TOPPING ========
function TabTopping() {
  const [list, setList] = useState([]);
  const [listQA, setListQA] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterQA, setFilterQA] = useState('');
  const [filterLoai, setFilterLoai] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const EMPTY = { id_quan_an:'', ten_topping:'', gia:0, loai:'all', mo_ta:'' };
  const [createForm, setCreateForm] = useState({...EMPTY});
  const [editForm, setEditForm] = useState({});
  const [delForm, setDelForm] = useState({});

  useEffect(()=>{
    const fetchQA = async()=>{try{const r=await adm('/api/admin/mon-an/data');setListQA(r.data.quan_an||[]);}catch{}};
    fetchQA(); loadTopping();
  },[]);

  const loadTopping = async () => {
    setLoading(true);
    try{const r=await api.get('/api/admin/toppings/data',{params:{id_quan_an:filterQA,loai:filterLoai},headers:{Authorization:`Bearer ${localStorage.getItem('nhan_vien_login')}`}});setList(r.data.data||[]);}catch{}finally{setLoading(false);}
  };

  useEffect(()=>{loadTopping();},[filterQA,filterLoai]);

  const handleCreate = async () => { try{const r=await adm('/api/admin/toppings/create','post',createForm);if(r.data.status){toast.success(r.data.message);setShowCreate(false);setCreateForm({...EMPTY});loadTopping();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const handleEdit = async () => { try{const r=await adm('/api/admin/toppings/update','post',editForm);if(r.data.status){toast.success(r.data.message);setShowEdit(false);loadTopping();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const handleDel = async () => { try{const r=await adm('/api/admin/toppings/delete','post',delForm);if(r.data.status){toast.success(r.data.message);setShowDel(false);loadTopping();}else toast.error(r.data.message);}catch{} };
  const changeStatus = async (v) => { try{const r=await adm('/api/admin/toppings/change-status','post',v);if(r.data.status){toast.success(r.data.message);loadTopping();}else toast.error(r.data.message);}catch{} };



  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const currentItems = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(list.length / itemsPerPage);

  const loaiMap = { drink:{label:'Đồ uống',cls:'bg-cyan-100 text-cyan-700'}, food:{label:'Đồ ăn',cls:'bg-orange-100 text-orange-600'}, all:{label:'Tất cả',cls:'bg-gray-100 text-gray-600'} };

  return (
    <div>
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Thêm Topping" headerCls="bg-orange-500" wide
        footer={<><button onClick={()=>setShowCreate(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleCreate} className="px-6 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600">Thêm mới</button></>}>
        <ToppingForm form={createForm} onChange={setCreateForm} listQA={listQA}/>
      </Modal>
      <Modal open={showEdit} onClose={()=>setShowEdit(false)} title="Cập Nhật Topping" headerCls="bg-orange-600" wide
        footer={<><button onClick={()=>setShowEdit(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleEdit} className="px-6 py-2 rounded-xl bg-orange-600 text-white font-bold text-sm hover:bg-orange-700">Lưu</button></>}>
        <ToppingForm form={editForm} onChange={setEditForm} listQA={listQA}/>
      </Modal>
      <Modal open={showDel} onClose={()=>setShowDel(false)} title="Xóa Topping" headerCls="bg-red-500"
        footer={<><button onClick={()=>setShowDel(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleDel} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button></>}>
        <div className="text-center py-4"><i className="fa-solid fa-star text-5xl text-red-200 mb-3 block"/>
          <p className="text-gray-600">Xóa topping: <b className="text-red-500">{delForm.ten_topping}</b>?</p></div>
      </Modal>

      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div className="flex gap-2">
          <select value={filterQA} onChange={e=>setFilterQA(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 min-w-40">
            <option value="">-- Tất cả quán ăn --</option>{listQA.map(q=><option key={q.id} value={q.id}>{q.ten_quan_an}</option>)}
          </select>
          <select value={filterLoai} onChange={e=>setFilterLoai(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400">
            <option value="">-- Tất cả loại --</option><option value="drink">Đồ uống</option><option value="food">Đồ ăn</option><option value="all">Chung</option>
          </select>
        </div>
        <div className="flex gap-3">
          <ExcelButton color="green" disabled={list.length === 0} onClick={() => exportToExcel(
            list.map((t, i) => ({ ...t, __stt: i + 1 })),
            [
              { label: 'STT',          key: '__stt',         width: 6 },
              { label: 'Tên topping',  key: 'ten_topping',   width: 25 },
              { label: 'Quán ăn',      key: 'ten_quan_an',   width: 25 },
              { label: 'Giá',          key: 'gia',           width: 14, format: v => Number(v).toLocaleString('vi-VN') },
              { label: 'Loại',         key: 'loai',          width: 12, format: v => v === 'drink' ? 'Đồ uống' : (v === 'food' ? 'Đồ ăn' : 'Tất cả') },
              { label: 'Mô tả',        key: 'mo_ta',         width: 30 },
            ],
            'Topping', 'Topping'
          )} />
          <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600"><i className="fa-solid fa-plus"/>Thêm Topping</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"/></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-orange-50 text-gray-600 font-semibold text-xs uppercase">
              <th className="px-3 py-3 text-center">#</th>
              <th className="px-3 py-3 text-left">Tên topping</th>
              <th className="px-3 py-3 text-left">Quán ăn</th>
              <th className="px-3 py-3 text-right">Giá</th>
              <th className="px-3 py-3 text-center">Loại</th>
              <th className="px-3 py-3 text-left">Mô tả</th>
              <th className="px-3 py-3 text-center">Tình trạng</th>
              <th className="px-3 py-3 text-center">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.map((t,i)=>{const lm=loaiMap[t.loai]||loaiMap.all; return(
                <tr key={t.id||i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 text-center text-gray-400 text-xs">{(currentPage-1)*itemsPerPage+i+1}</td>
                  <td className="px-3 py-3 font-semibold text-gray-800">{t.ten_topping}</td>
                  <td className="px-3 py-3 text-xs text-gray-600">{t.ten_quan_an}</td>
                  <td className="px-3 py-3 text-right font-bold text-gray-700">{formatVND(t.gia)}</td>
                  <td className="px-3 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${lm.cls}`}>{lm.label}</span></td>
                  <td className="px-3 py-3 text-xs text-gray-500 max-w-32 truncate">{t.mo_ta||'—'}</td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={()=>changeStatus(t)} className={`px-3 py-1 rounded-lg text-xs font-bold w-full transition-colors ${t.tinh_trang==1?'bg-green-100 text-green-700 hover:bg-green-200':'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                      {t.tinh_trang==1?'Hiển thị':'Tạm tắt'}</button>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={()=>{setEditForm({...t});setShowEdit(true);}} className="px-2.5 py-1.5 rounded-lg bg-orange-100 text-orange-700 text-xs hover:bg-orange-200"><i className="fa-solid fa-pen"/></button>
                      <button onClick={()=>{setDelForm(t);setShowDel(true);}} className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs hover:bg-red-200"><i className="fa-solid fa-trash"/></button>
                    </div>
                  </td>
                </tr>
              );})}
              {list.length===0 && <tr><td colSpan="8" className="text-center py-16 text-gray-400">Không có topping nào</td></tr>}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, list.length)}</span> trong <span className="font-bold text-gray-800">{list.length}</span> topping
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
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button key={page} onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
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

// ======== MAIN ========
export default function AdminMonAn() {
  const [tab, setTab] = useState('mon_an');
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-utensils mr-3 text-red-500"/>Quản Lý Món Ăn & Topping</h1>
      </div>
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-2xl p-1 w-fit">
        <button onClick={()=>setTab('mon_an')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab==='mon_an'?'bg-white text-red-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
          <i className="fa-solid fa-utensils mr-2"/>Món Ăn
        </button>
        <button onClick={()=>setTab('topping')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab==='topping'?'bg-white text-orange-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
          <i className="fa-solid fa-star mr-2 text-yellow-400"/>Topping
        </button>
      </div>
      {tab==='mon_an' ? <TabMonAn/> : <TabTopping/>}
    </div>
  );
}
