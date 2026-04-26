import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const INPUT = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-medium';
const LABEL = 'block text-sm font-semibold text-gray-600 mb-1.5';

export default function AdminProfile() {
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [pwForm, setPwForm] = useState({ mat_khau_cu:'', mat_khau_moi:'', xac_nhan_mat_khau_moi:'' });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/admin/profile', { headers:{Authorization:`Bearer ${localStorage.getItem('nhan_vien_login')}`} });
      if(r.data.status) setUser(r.data.data||{});
    } catch{} finally{setLoading(false);}
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      const r = await api.post('/api/admin/update-profile', user, { headers:{Authorization:`Bearer ${localStorage.getItem('nhan_vien_login')}`} });
      if(r.data.status) toast.success(r.data.message); else toast.error(r.data.message);
    } catch(e) {
      Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));
    } finally { setSaving(false); }
  };

  const changePw = async () => {
    setSavingPw(true);
    try {
      const r = await api.post('/api/admin/doi-mat-khau', pwForm, { headers:{Authorization:`Bearer ${localStorage.getItem('nhan_vien_login')}`} });
      if(r.data.status) { toast.success(r.data.message); setPwForm({mat_khau_cu:'',mat_khau_moi:'',xac_nhan_mat_khau_moi:''}); }
      else toast.error(r.data.message);
    } catch(e) {
      Object.values(e?.response?.data?.errors||{}).forEach(v=>toast.error(v[0]));
    } finally { setSavingPw(false); }
  };

  if(loading) return <div className="flex justify-center p-20"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-sm"><i className="fa-solid fa-user-tie"/></div>
        <div><h1 className="text-2xl font-bold text-gray-900">Thông tin tài khoản</h1><p className="text-sm text-gray-500">Quản lý hồ sơ và bảo mật</p></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cột trái */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <div className="relative z-10 mx-auto w-28 h-28 bg-white p-1 rounded-full shadow-md mt-6 mb-4">
              <img src={user.avatar||`${import.meta.env.VITE_API_URL||'http://localhost:8000'}/images/default-avatar.png`} alt="Admin" className="w-full h-full rounded-full object-cover" onError={e=>e.target.src=`${import.meta.env.VITE_API_URL||'http://localhost:8000'}/images/default-avatar.png`} />
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex justify-center items-center shadow-md hover:bg-indigo-700 transition" title="Đổi Avatar"><i className="fa-solid fa-camera text-sm"/></button>
            </div>
            <h3 className="text-xl font-bold text-gray-900">{user.ho_va_ten}</h3>
            <p className="text-indigo-600 font-semibold text-sm mb-3">{(user.chuc_vu||{}).ten_chuc_vu||user.ten_chuc_vu||'Quản Trị Viên'}</p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Đang hoạt động
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><i className="fa-solid fa-circle-info text-indigo-500"/> Thông tin vắn tắt</h4>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between border-b pb-3"><span className="text-gray-500 flex items-center gap-2"><i className="fa-solid fa-envelope w-4"/> Email</span><span className="font-medium text-gray-800">{user.email}</span></div>
              <div className="flex items-center justify-between border-b pb-3"><span className="text-gray-500 flex items-center gap-2"><i className="fa-solid fa-phone w-4"/> Số ĐT</span><span className="font-medium text-gray-800">{user.so_dien_thoai}</span></div>
              <div className="flex items-center justify-between border-b pb-3"><span className="text-gray-500 flex items-center gap-2"><i className="fa-solid fa-calendar w-4"/> Ngày sinh</span><span className="font-medium text-gray-800">{user.ngay_sinh}</span></div>
            </div>
          </div>
        </div>

        {/* Cột phải */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <h4 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2"><i className="fa-solid fa-pen-to-square text-purple-500"/> Chỉnh sửa hồ sơ</h4>
            <div className="grid sm:grid-cols-2 gap-5 mb-6">
              <div className="sm:col-span-2"><label className={LABEL}>Họ và tên</label><input value={user.ho_va_ten||''} onChange={e=>setUser({...user,ho_va_ten:e.target.value})} className={INPUT}/></div>
              <div><label className={LABEL}>Email</label><input type="email" value={user.email||''} onChange={e=>setUser({...user,email:e.target.value})} className={INPUT} disabled/></div>
              <div><label className={LABEL}>Số điện thoại</label><input type="tel" value={user.so_dien_thoai||''} onChange={e=>setUser({...user,so_dien_thoai:e.target.value})} className={INPUT}/></div>
              <div className="sm:col-span-2"><label className={LABEL}>Địa chỉ</label><input value={user.dia_chi||''} onChange={e=>setUser({...user,dia_chi:e.target.value})} className={INPUT}/></div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button className="px-5 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Hủy</button>
              <button disabled={saving} onClick={updateProfile} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20 disabled:opacity-70 flex items-center gap-2">
                {saving ? <i className="fa-solid fa-spinner fa-spin"/> : <i className="fa-solid fa-save"/>} Lưu thay đổi
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <h4 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2"><i className="fa-solid fa-shield-halved text-green-500"/> Bảo mật & Mật khẩu</h4>
            <div className="space-y-4 max-w-lg mb-6">
              <div><label className={LABEL}>Mật khẩu hiện tại</label><input type="password" value={pwForm.mat_khau_cu} onChange={e=>setPwForm({...pwForm,mat_khau_cu:e.target.value})} className={INPUT} placeholder="••••••••"/></div>
              <div><label className={LABEL}>Mật khẩu mới</label><input type="password" value={pwForm.mat_khau_moi} onChange={e=>setPwForm({...pwForm,mat_khau_moi:e.target.value})} className={INPUT} placeholder="••••••••"/></div>
              <div><label className={LABEL}>Xác nhận mật khẩu</label><input type="password" value={pwForm.xac_nhan_mat_khau_moi} onChange={e=>setPwForm({...pwForm,xac_nhan_mat_khau_moi:e.target.value})} className={INPUT} placeholder="••••••••"/></div>
            </div>
            <div className="flex justify-start">
              <button disabled={savingPw||!pwForm.mat_khau_cu||!pwForm.mat_khau_moi||(pwForm.mat_khau_moi!==pwForm.xac_nhan_mat_khau_moi)} onClick={changePw} className="px-6 py-2.5 rounded-xl font-bold text-white bg-gray-900 hover:bg-gray-800 transition shadow-md disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none flex items-center gap-2">
                {savingPw ? <i className="fa-solid fa-spinner fa-spin"/> : <i className="fa-solid fa-key"/>} Đổi mật khẩu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
