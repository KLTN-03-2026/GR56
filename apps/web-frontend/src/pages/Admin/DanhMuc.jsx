import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { debounce, toSlug } from '../../utils/helpers';
import { exportToExcel, ExcelButton } from '../../utils/exportExcel';

const adm = (url, method='get', data=null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method==='get' ? api.get(url,cfg) : api.post(url,data,cfg);
};
const INPUT = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all';
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5';

function Modal({ open, onClose, title, headerCls='bg-teal-600', children, footer, wide=false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-3xl w-full ${wide?'max-w-2xl':'max-w-lg'} shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}>
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

const DMForm = ({ form, onChange, list }) => (
  <div className="space-y-3">
    <div>
      <label className={LABEL}>Tên danh mục</label>
      <input 
        value={form.ten_danh_muc||''} 
        onChange={e=>{
          const val = e.target.value;
          onChange({...form, ten_danh_muc: val, slug_danh_muc: toSlug(val)});
        }} 
        className={INPUT}
      />
    </div>
    <div>
      <label className={LABEL}>Slug danh mục</label>
      <input 
        value={form.slug_danh_muc||''} 
        onChange={e=>onChange({...form, slug_danh_muc: e.target.value})} 
        className={INPUT}
      />
    </div>
    <div><label className={LABEL}>Hình ảnh (URL)</label><input value={form.hinh_anh||''} onChange={e=>onChange({...form,hinh_anh:e.target.value})} className={INPUT}/></div>
    <div><label className={LABEL}>Danh mục cha</label>
      <select value={form.id_danh_muc_cha||''} onChange={e=>onChange({...form,id_danh_muc_cha:e.target.value})} className={INPUT}>
        <option value="">-- Không có cha --</option>
        {list.map(d=><option key={d.id} value={d.id}>{d.ten_danh_muc}</option>)}
      </select>
    </div>
    <div><label className={LABEL}>Trạng thái</label>
      <select value={form.tinh_trang??'1'} onChange={e=>onChange({...form,tinh_trang:e.target.value})} className={INPUT}>
        <option value="1">Hiển thị</option><option value="0">Tạm tắt</option>
      </select>
    </div>
  </div>
);

// ======== TAB DANH MỤC ========
function TabDanhMuc() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [createForm, setCreateForm] = useState({ ten_danh_muc:'', slug_danh_muc:'', hinh_anh:'', id_danh_muc_cha:'', tinh_trang:'1' });
  const [editForm, setEditForm] = useState({});
  const [delForm, setDelForm] = useState({});

  useEffect(()=>{ fetchList(); },[]);
  const fetchList = async () => { setLoading(true); try{const r=await adm('/api/admin/danh-muc/data'); setList(r.data.data||[]);}catch{}finally{setLoading(false);} };
  const doSearch = useCallback(debounce(async (kw) => {
    if(!kw.trim()){fetchList();return;}
    try{const r=await adm('/api/admin/danh-muc/tim-kiem','post',{noi_dung_tim:kw});setList(r.data.data||[]);}catch{}
  },400),[]);

  const handleCreate = async () => { try{const r=await adm('/api/admin/danh-muc/create','post',createForm);if(r.data.status){toast.success(r.data.message);setShowCreate(false);setCreateForm({ten_danh_muc:'',slug_danh_muc:'',hinh_anh:'',id_danh_muc_cha:'',tinh_trang:'1'});fetchList();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const handleEdit = async () => { try{const r=await adm('/api/admin/danh-muc/update','post',editForm);if(r.data.status){toast.success(r.data.message);setShowEdit(false);fetchList();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const handleDel = async () => { try{const r=await adm('/api/admin/danh-muc/delete','post',delForm);if(r.data.status){toast.success(r.data.message);setShowDel(false);fetchList();}else toast.error(r.data.message);}catch{} };
  const changeStatus = async (v) => { try{const r=await adm('/api/admin/danh-muc/change-status','post',v);if(r.data.status){toast.success(r.data.message);fetchList();}else toast.error(r.data.message);}catch{} };



  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const currentItems = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(list.length / itemsPerPage);

  return (
    <div>
      <Modal open={showCreate} onClose={()=>setShowCreate(false)} title="Thêm Danh Mục"
        footer={<><button onClick={()=>setShowCreate(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleCreate} className="px-6 py-2 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700">Tạo mới</button></>}>
        <DMForm form={createForm} onChange={setCreateForm} list={list}/>
      </Modal>
      <Modal open={showEdit} onClose={()=>setShowEdit(false)} title="Cập Nhật Danh Mục" headerCls="bg-teal-700"
        footer={<><button onClick={()=>setShowEdit(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleEdit} className="px-6 py-2 rounded-xl bg-teal-700 text-white font-bold text-sm hover:bg-teal-800">Lưu</button></>}>
        <DMForm form={editForm} onChange={setEditForm} list={list}/>
      </Modal>
      <Modal open={showDel} onClose={()=>setShowDel(false)} title="Xóa Danh Mục" headerCls="bg-red-500"
        footer={<><button onClick={()=>setShowDel(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleDel} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button></>}>
        <div className="text-center py-4"><i className="fa-solid fa-layer-group text-5xl text-red-200 mb-3 block"/>
          <p className="text-gray-600">Xóa danh mục: <b className="text-red-500">{delForm.ten_danh_muc}</b>?</p></div>
      </Modal>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="relative"><input value={search} onChange={e=>{setSearch(e.target.value);doSearch(e.target.value);}} placeholder="Tìm danh mục..." className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 w-64 transition-all"/>
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"/></div>
        <div className="flex gap-3">
          <ExcelButton disabled={list.length === 0} onClick={() => exportToExcel(
            list.map((d, i) => ({ ...d, __stt: i + 1 })),
            [
              { label: 'STT',          key: '__stt',         width: 6 },
              { label: 'Tên danh mục', key: 'ten_danh_muc',  width: 25 },
              { label: 'Slug',         key: 'slug_danh_muc', width: 20 },
              { label: 'Danh mục cha', key: 'ten_danh_muc_cha', width: 20, format: v => v || '—' },
              { label: 'Trạng thái',   key: 'tinh_trang',    width: 14, format: v => v == 1 ? 'Hiển thị' : 'Tạm tắt' },
            ],
            'DanhMuc', 'Danh Mục'
          )} />
          <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700"><i className="fa-solid fa-plus"/>Thêm danh mục</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin"/></div>
        : list.length===0 ? <div className="text-center py-16 text-gray-400">Không có danh mục nào</div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-teal-50 text-gray-600 font-semibold text-xs uppercase">
              <th className="px-4 py-3 text-center">#</th>
              <th className="px-4 py-3 text-left">Tên danh mục</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-center">Hình ảnh</th>
              <th className="px-4 py-3 text-center">Danh mục cha</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3 text-center">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.map((d,i)=>(
                <tr key={d.id||i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">{(currentPage-1)*itemsPerPage+i+1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{d.ten_danh_muc}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs"><code className="bg-gray-100 px-1.5 py-0.5 rounded">{d.slug_danh_muc}</code></td>
                  <td className="px-4 py-3 text-center">{d.hinh_anh?<img src={d.hinh_anh} alt="" className="w-16 h-12 object-cover rounded-lg mx-auto" onError={e=>e.target.style.display='none'}/>:<span className="text-gray-300 text-xs">—</span>}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{d.ten_danh_muc_cha||<span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={()=>changeStatus(d)} className={`px-3 py-1 rounded-lg text-xs font-bold w-full transition-colors ${d.tinh_trang==1?'bg-green-100 text-green-700 hover:bg-green-200':'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                      {d.tinh_trang==1?'Hiển thị':'Tạm tắt'}</button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={()=>{setEditForm({...d});setShowEdit(true);}} className="px-2.5 py-1.5 rounded-lg bg-teal-100 text-teal-700 text-xs hover:bg-teal-200"><i className="fa-solid fa-pen"/></button>
                      <button onClick={()=>{setDelForm(d);setShowDel(true);}} className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs hover:bg-red-200"><i className="fa-solid fa-trash"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, list.length)}</span> trong <span className="font-bold text-gray-800">{list.length}</span> danh mục
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  <i className="fa-solid fa-chevron-left text-xs" />
                </button>
                <div className="flex gap-1 text-sm font-semibold">
                  {[...Array(totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) return <span key={`dots-${page}`} className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>;
                    return null;
                  })}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
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

// ======== TAB TỈNH/HUYỆN ========
function TabTinhHuyen() {
  const [listTinh, setListTinh] = useState([]);
  const [listQH, setListQH] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTinh, setShowCreateTinh] = useState(false);
  const [showEditTinh, setShowEditTinh] = useState(false);
  const [showDelTinh, setShowDelTinh] = useState(false);
  const [showQH, setShowQH] = useState(false);
  const [selTinh, setSelTinh] = useState(null);
  const [createTinh, setCreateTinh] = useState({ ten_tinh_thanh:'', tinh_trang:'1' });
  const [editTinh, setEditTinh] = useState({});
  const [delTinh, setDelTinh] = useState({});

  useEffect(()=>{ fetchTinh(); },[]);
  const fetchTinh = async () => { setLoading(true); try{const r=await adm('/api/admin/tinh-thanh/data');setListTinh(r.data.data||[]);}catch{}finally{setLoading(false);} };
  const fetchQH = async (tinh) => { setSelTinh(tinh); try{const r=await adm('/api/admin/quan-huyen/data','post',tinh);setListQH(r.data.data||[]);}catch{} };
  const handleCreateTinh = async () => { try{const r=await adm('/api/admin/tinh-thanh/create','post',createTinh);if(r.data.status){toast.success(r.data.message);setShowCreateTinh(false);setCreateTinh({ten_tinh_thanh:'',tinh_trang:'1'});fetchTinh();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const handleEditTinh = async () => { try{const r=await adm('/api/admin/tinh-thanh/update','post',editTinh);if(r.data.status){toast.success(r.data.message);setShowEditTinh(false);fetchTinh();}else toast.error(r.data.message);}catch(e){Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));} };
  const handleDelTinh = async () => { try{const r=await adm('/api/admin/tinh-thanh/delete','post',delTinh);if(r.data.status){toast.success(r.data.message);setShowDelTinh(false);fetchTinh();}else toast.error(r.data.message);}catch{} };
  const changeStatusTinh = async (v) => { try{const r=await adm('/api/admin/tinh-thanh/change-status','post',v);if(r.data.status){toast.success(r.data.message);fetchTinh();}else toast.error(r.data.message);}catch{} };
  const changeStatusQH = async (v) => { try{const r=await adm('/api/admin/quan-huyen/change-status','post',v);if(r.data.status){toast.success(r.data.message);fetchQH(selTinh);}else toast.error(r.data.message);}catch{} };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const currentItems = listTinh.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(listTinh.length / itemsPerPage);

  return (
    <div>
      {/* Modals */}
      <Modal open={showCreateTinh} onClose={()=>setShowCreateTinh(false)} title="Thêm Tỉnh/Thành phố"
        footer={<><button onClick={()=>setShowCreateTinh(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleCreateTinh} className="px-6 py-2 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700">Thêm mới</button></>}>
        <div><label className={LABEL}>Tên Tỉnh/Thành phố</label><input value={createTinh.ten_tinh_thanh||''} onChange={e=>setCreateTinh({...createTinh,ten_tinh_thanh:e.target.value})} className={INPUT}/></div>
        <div><label className={LABEL}>Trạng thái</label><select value={createTinh.tinh_trang||'1'} onChange={e=>setCreateTinh({...createTinh,tinh_trang:e.target.value})} className={INPUT}><option value="1">Hiển thị</option><option value="0">Tạm tắt</option></select></div>
      </Modal>
      <Modal open={showEditTinh} onClose={()=>setShowEditTinh(false)} title="Cập Nhật Tỉnh/Thành phố" headerCls="bg-teal-700"
        footer={<><button onClick={()=>setShowEditTinh(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleEditTinh} className="px-6 py-2 rounded-xl bg-teal-700 text-white font-bold text-sm hover:bg-teal-800">Lưu</button></>}>
        <div><label className={LABEL}>Tên Tỉnh/Thành phố</label><input value={editTinh.ten_tinh_thanh||''} onChange={e=>setEditTinh({...editTinh,ten_tinh_thanh:e.target.value})} className={INPUT}/></div>
        <div><label className={LABEL}>Trạng thái</label><select value={editTinh.tinh_trang??'1'} onChange={e=>setEditTinh({...editTinh,tinh_trang:e.target.value})} className={INPUT}><option value="1">Hiển thị</option><option value="0">Tạm tắt</option></select></div>
      </Modal>
      <Modal open={showDelTinh} onClose={()=>setShowDelTinh(false)} title="Xóa Tỉnh/Thành phố" headerCls="bg-red-500"
        footer={<><button onClick={()=>setShowDelTinh(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Hủy</button><button onClick={handleDelTinh} className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Xóa</button></>}>
        <div className="text-center py-4"><i className="fa-solid fa-city text-5xl text-red-200 mb-3 block"/>
          <p className="text-gray-600">Xóa: <b className="text-red-500">{delTinh.ten_tinh_thanh}</b>?</p></div>
      </Modal>
      <Modal open={showQH} onClose={()=>setShowQH(false)} title={`Quận/Huyện - ${selTinh?.ten_tinh_thanh}`} wide>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="bg-teal-50 text-xs uppercase font-semibold text-gray-600">
            <th className="px-3 py-2 text-center">#</th><th className="px-3 py-2 text-left">Tên quận/huyện</th><th className="px-3 py-2 text-center">Trạng thái</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {listQH.map((q,i)=>(
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-center text-gray-400 text-xs">{i+1}</td>
                <td className="px-3 py-2 font-medium text-gray-700">{q.ten_quan_huyen}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={()=>changeStatusQH(q)} className={`px-3 py-1 rounded-lg text-xs font-bold w-full transition-colors ${q.tinh_trang==1?'bg-green-100 text-green-700 hover:bg-green-200':'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                    {q.tinh_trang==1?'Hoạt động':'Tạm tắt'}</button>
                </td>
              </tr>
            ))}
            {listQH.length===0 && <tr><td colSpan="3" className="text-center text-gray-400 py-6">Không có quận/huyện</td></tr>}
          </tbody>
        </table></div>
        <div className="flex justify-end pt-2"><button onClick={()=>setShowQH(false)} className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">Đóng</button></div>
      </Modal>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{listTinh.length} tỉnh/thành phố</span>
        <button onClick={()=>setShowCreateTinh(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700"><i className="fa-solid fa-plus"/>Thêm Tỉnh/TP</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin"/></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-teal-50 text-gray-600 font-semibold text-xs uppercase">
              <th className="px-4 py-3 text-center">#</th>
              <th className="px-4 py-3 text-left">Tên Tỉnh/Thành phố</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3 text-center">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.map((t,i)=>(
                <tr key={t.id||i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">{(currentPage-1)*itemsPerPage+i+1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{t.ten_tinh_thanh}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={()=>changeStatusTinh(t)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${t.tinh_trang==1?'bg-green-100 text-green-700 hover:bg-green-200':'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                      {t.tinh_trang==1?'Hiển thị':'Tạm tắt'}</button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={()=>{setEditTinh({...t});setShowEditTinh(true);}} className="px-2.5 py-1.5 rounded-lg bg-teal-100 text-teal-700 text-xs hover:bg-teal-200"><i className="fa-solid fa-pen"/></button>
                      <button onClick={()=>{setDelTinh(t);setShowDelTinh(true);}} className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs hover:bg-red-200"><i className="fa-solid fa-trash"/></button>
                      <button onClick={()=>{fetchQH(t);setShowQH(true);}} className="px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs hover:bg-blue-200 whitespace-nowrap"><i className="fa-solid fa-eye mr-1"/>Q/Huyện</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Hiển thị <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, listTinh.length)}</span> trong <span className="font-bold text-gray-800">{listTinh.length}</span> tỉnh thành
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  <i className="fa-solid fa-chevron-left text-xs" />
                </button>
                <div className="flex gap-1 text-sm font-semibold">
                  {[...Array(totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === page ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) return <span key={`dots-${page}`} className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>;
                    return null;
                  })}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors">
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
export default function AdminDanhMuc() {
  const [tab, setTab] = useState('danh_muc');
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900"><i className="fa-solid fa-layer-group mr-3 text-teal-500"/>Quản Lý Danh Mục & Địa Lý</h1>
      </div>
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-2xl p-1 w-fit">
        <button onClick={()=>setTab('danh_muc')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab==='danh_muc'?'bg-white text-teal-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
          <i className="fa-solid fa-bars mr-2"/>Danh Mục Món Ăn
        </button>
        <button onClick={()=>setTab('tinh_huyen')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab==='tinh_huyen'?'bg-white text-teal-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
          <i className="fa-solid fa-city mr-2"/>Tỉnh/Huyện
        </button>
      </div>
      {tab==='danh_muc' ? <TabDanhMuc/> : <TabTinhHuyen/>}
    </div>
  );
}
