import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

const adm = (url, method = 'get', data = null) => {
  const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}` } };
  return method === 'get' ? api.get(url, cfg) : api[method](url, data, cfg);
};

const BASE_URL = import.meta.env.VITE_API_URL || '';

const TYPE_CONFIG = {
  sale:  { label: 'Khuyến mãi', icon: 'fa-gift',     color: 'text-orange-500', bg: 'bg-orange-100', border: 'border-orange-500' },
  event: { label: 'Sự kiện',    icon: 'fa-bullhorn', color: 'text-purple-500', bg: 'bg-purple-100', border: 'border-purple-500' },
  news:  { label: 'Tin tức',    icon: 'fa-newspaper',color: 'text-blue-500',   bg: 'bg-blue-100',   border: 'border-blue-500' },
};

export default function AdminThongBao() {
  const [list, setList] = useState([]);
  const [listQuanAn, setListQuanAn] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [linkType, setLinkType] = useState('none'); // none, home, list_quan_an, quan_an, custom
  const [selectedQuanAn, setSelectedQuanAn] = useState('');

  const [form, setForm] = useState({
    tieu_de: '',
    noi_dung: '',
    loai: 'sale',
    duong_dan: '',
    hinh_anh: null,
  });

  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => { 
    fetchList(); 
    fetchQuanAn();
  }, []);

  const fetchQuanAn = async () => {
    try {
      const r = await adm('/api/admin/quan-an/data');
      if (r.data.data) {
         setListQuanAn(r.data.data.data || r.data.data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const r = await adm('/api/admin/thong-bao-he-thong/data');
      if (r.data.status) setList(r.data.data.data || []);
      else if (r.data.message) toast.error(r.data.message);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Có lỗi xảy ra!');
    } finally { setLoading(false); }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm(f => ({ ...f, hinh_anh: file }));
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let finalLink = form.duong_dan;
    if (linkType === 'none') finalLink = '';
    else if (linkType === 'home') finalLink = '/';
    else if (linkType === 'list_quan_an') finalLink = '/khach-hang/list-quan-an';
    else if (linkType === 'quan_an') finalLink = selectedQuanAn ? `/khach-hang/quan-an/${selectedQuanAn}` : '';

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('tieu_de', form.tieu_de);
      fd.append('noi_dung', form.noi_dung);
      fd.append('loai', form.loai);
      if (finalLink) fd.append('duong_dan', finalLink);
      if (form.hinh_anh) fd.append('hinh_anh', form.hinh_anh);
      if (linkType === 'quan_an' && !selectedQuanAn) fd.append('selected_quan_an', ''); // Gửi cờ rỗng để BE bắt lỗi nếu cần

      // Multipart Form Data để gửi file
      const cfg = { headers: { Authorization: `Bearer ${localStorage.getItem('nhan_vien_login')}`, 'Content-Type': 'multipart/form-data' } };
      const r = await api.post('/api/admin/thong-bao-he-thong/store', fd, cfg);
      if (r.data.status) {
        toast.success(r.data.message);
        setForm({ tieu_de: '', noi_dung: '', loai: 'sale', duong_dan: '', hinh_anh: null });
        setLinkType('none');
        setSelectedQuanAn('');
        setPreviewImage(null);
        fetchList();
      } else {
        toast.error(r.data.message);
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        // Hiển thị lỗi validation từ Laravel
        const errors = error.response.data.errors;
        Object.values(errors).forEach(errArray => toast.error(errArray[0]));
      } else {
        toast.error(error.response?.data?.message || 'Có lỗi xảy ra!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa thông báo khóa biểu này (khách hàng sẽ không thấy push notification nữa)?')) return;
    try {
      const r = await adm(`/api/admin/thong-bao-he-thong/${id}`, 'delete');
      if (r.data.status) {
        toast.success(r.data.message);
        fetchList();
      } else {
        toast.error(r.data.message);
      }
    } catch (error) { toast.error(error.response?.data?.message || 'Có lỗi xảy ra!'); }
  };

  const currentType = TYPE_CONFIG[form.loai] || TYPE_CONFIG.news;

  // Xây dựng link giả định để preview
  let previewLink = form.duong_dan;
  if (linkType === 'none') previewLink = '';
  else if (linkType === 'home') previewLink = '/';
  else if (linkType === 'list_quan_an') previewLink = '/khach-hang/list-quan-an';
  else if (linkType === 'quan_an') previewLink = selectedQuanAn ? `/khach-hang/quan-an/${selectedQuanAn}` : '';

  return (
    <div className="p-6 max-w-7xl mx-auto flex gap-6 flex-col lg:flex-row">
      
      {/* Cột trái: Form tạo */}
      <div className="w-full lg:w-1/3 flex-shrink-0 space-y-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <i className="fa-solid fa-bullhorn text-red-500" /> Tạo Thông Báo Broadcast
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Loại thông báo</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                  <button type="button" key={key} onClick={() => setForm(f => ({ ...f, loai: key }))}
                    className={`p-3 border-2 rounded-2xl flex flex-col items-center gap-1 transition-all ${form.loai === key ? config.border + ' ' + config.bg : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}>
                    <i className={`fa-solid ${config.icon} ${form.loai === key ? config.color : ''} text-xl`} />
                    <span className={`text-xs font-bold ${form.loai === key ? config.color : ''}`}>{config.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tiêu đề</label>
              <input required value={form.tieu_de} onChange={e => setForm(f => ({...f, tieu_de: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
                placeholder="VD: Siêu Sale Giữa Tháng 50%" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nội dung</label>
              <textarea required rows={4} value={form.noi_dung} onChange={e => setForm(f => ({...f, noi_dung: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none resize-none"
                placeholder="VD: Nhanh tay đặt hàng để nhận ưu đãi KHỦNG..." />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Action / Đường dẫn khi khách bấm vào</label>
              <select value={linkType} onChange={e => setLinkType(e.target.value)}
                className="w-full px-4 py-2.5 mb-2 rounded-xl border border-gray-200 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none">
                <option value="none">Không có hành động (Chỉ xem nội dung)</option>
                <option value="home">Đưa về Trang chủ</option>
                <option value="list_quan_an">Mở danh sách Tất cả quán ăn (Khu vực deal)</option>
                <option value="quan_an">Dẫn tới Quán ăn cụ thể (Tăng doanh thu quán)</option>
                <option value="custom">Đường dẫn tự nhập (Tùy chỉnh)</option>
              </select>

              {linkType === 'quan_an' && (
                <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <label className="block text-xs font-bold text-red-700 mb-1.5">Chọn quán ăn chuyển tới <span className="text-red-500">*</span></label>
                  <select value={selectedQuanAn} onChange={e => setSelectedQuanAn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm outline-none bg-white">
                    <option value="">-- Chọn một nhà hàng --</option>
                    {listQuanAn.map(q => <option key={q.id} value={q.id}>{q.ten_quan_an}</option>)}
                  </select>
                </div>
              )}

              {linkType === 'custom' && (
                <div className="mt-2">
                  <input value={form.duong_dan} onChange={e => setForm(f => ({...f, duong_dan: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
                    placeholder="VD: /khach-hang/list-quan-an?sale=true" />
                  <div className="text-[10px] text-gray-400 mt-1">💡 Hỗ trợ absolute link (https://...) hoặc relative link (/path)</div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Banner/Hình ảnh (tùy chọn)</label>
              {!form.hinh_anh ? (
                <input type="file" accept="image/*" onChange={handleImageChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
              ) : (
                <div className="flex items-center gap-3 bg-red-50 p-2 rounded-xl border border-red-100">
                  <div className="text-sm font-semibold text-red-700 bg-white px-3 py-1.5 rounded-lg border border-red-100 truncate flex-1">
                    <i className="fa-regular fa-image mr-2 text-red-400" />
                    {form.hinh_anh.name || 'Đã chọn hình ảnh'}
                  </div>
                  <button type="button" onClick={() => {
                    setForm(f => ({ ...f, hinh_anh: null }));
                    setPreviewImage(null);
                  }} className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 shadow-sm shadow-red-200">
                    <i className="fa-solid fa-xmark mr-1" /> Xóa ảnh
                  </button>
                </div>
              )}
            </div>

            <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-50 transition-all shadow-md shadow-red-200 mt-6 flex justify-center items-center gap-2">
              {submitting ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane" />}
              Gửi tới Toàn Bộ Khách Hàng
            </button>
          </form>
        </div>
      </div>

      {/* Cột phải: Preview + Lịch sử */}
      <div className="flex-1 space-y-6">
        
        {/* Xem trước */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Xem trước trên Mobile</h2>
          <div className="max-w-sm mx-auto bg-gray-50 rounded-3xl p-4 border-2 border-gray-200">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex gap-3">
                <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${currentType.bg} ${currentType.color}`}>
                  <i className={`fa-solid ${currentType.icon} text-xl`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-sm mb-1">{form.tieu_de || 'Tiêu đề thông báo'}</div>
                  <p className="text-xs text-gray-500 line-clamp-3 mb-2">{form.noi_dung || 'Nội dung chi tiết sẽ hiển thị ở đây...'}</p>
                  {previewImage && (
                    <img src={previewImage} alt="preview" className="w-full h-24 object-cover rounded-xl mt-2 border border-gray-100" />
                  )}
                  {previewLink && (
                    <div className="mt-2 text-[10px] font-semibold text-blue-500 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 inline-flex items-center gap-1">
                      <i className="fa-solid fa-link" /> Điều hướng: {previewLink}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lịch sử */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Lịch sử gửi thông báo</h2>
          {loading ? (
             <div className="py-12 flex justify-center"><i className="fa-solid fa-spinner fa-spin text-3xl text-gray-300" /></div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Chưa có thông báo nào được tạo.</div>
          ) : (
            <div className="space-y-4">
              {list.map(item => {
                const conf = TYPE_CONFIG[item.loai] || TYPE_CONFIG.news;
                return (
                  <div key={item.id} className="flex gap-4 p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${conf.bg} ${conf.color}`}>
                      <i className={`fa-solid ${conf.icon} text-xl`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-gray-800 text-sm">{item.tieu_de}</div>
                          <div className="text-xs text-gray-500 text-xs mt-0.5 whitespace-pre-wrap line-clamp-2">{item.noi_dung}</div>
                        </div>
                        <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><i className="fa-solid fa-trash" /></button>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <i className="fa-solid fa-users" /> Gửi tới {item.so_nguoi_nhan} người
                        </span>
                        <span><i className="fa-regular fa-clock mr-1" /> {new Date(item.created_at).toLocaleString('vi-VN')}</span>
                        {item.duong_dan && <span className="text-blue-500"><i className="fa-solid fa-link mr-1" /> Có link</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
