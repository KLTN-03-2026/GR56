import { useState, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function BaoCaoSuCo() {
  const [formData, setFormData] = useState({
    tieu_de: '',
    noi_dung: '',
    id_don_hang: '',
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem('shipper_login');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Kích thước ảnh không được vượt quá 10MB');
        return;
      }
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tieu_de.trim() || !formData.noi_dung.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('tieu_de', formData.tieu_de);
      data.append('noi_dung', formData.noi_dung);
      if (formData.id_don_hang) data.append('id_don_hang', formData.id_don_hang);
      if (image) data.append('hinh_anh', image);

      const res = await api.post('/api/shipper/reports/create', data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.status) {
        toast.success(res.data.message);
        setFormData({ tieu_de: '', noi_dung: '', id_don_hang: '' });
        clearImage();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra khi gửi báo cáo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-orange-500 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <i className="fa-solid fa-triangle-exclamation text-3xl"></i>
          </div>
          <h2 className="text-2xl font-bold">Báo Cáo Sự Cố</h2>
          <p className="text-orange-100 mt-1">Hỗ trợ đối tác giao hàng FoodBee</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tiêu đề sự cố <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="tieu_de"
              value={formData.tieu_de}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
              placeholder="Ví dụ: Lỗi ứng dụng, Tai nạn, Vấn đề đơn hàng..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mã đơn hàng (Nếu có)
            </label>
            <input
              type="number"
              name="id_don_hang"
              value={formData.id_don_hang}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
              placeholder="Nhập ID đơn hàng liên quan"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Chi tiết nội dung <span className="text-red-500">*</span>
            </label>
            <textarea
              name="noi_dung"
              value={formData.noi_dung}
              onChange={handleChange}
              rows="5"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all resize-none"
              placeholder="Mô tả chi tiết sự cố bạn đang gặp phải..."
              required
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hình ảnh đính kèm (Nếu có)
            </label>
            {preview ? (
              <div className="relative inline-block">
                <img src={preview} alt="Preview" className="h-32 rounded-xl object-cover border border-gray-200" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm"
                >
                  <i className="fa-solid fa-times text-xs"></i>
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                  className="hidden"
                  id="upload-image"
                />
                <label
                  htmlFor="upload-image"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 hover:border-orange-400 transition-colors cursor-pointer"
                >
                  <i className="fa-regular fa-image text-3xl text-gray-400 mb-2"></i>
                  <span className="text-sm text-gray-500">Bấm để tải ảnh lên</span>
                </label>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${
              isSubmitting ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 hover:shadow-orange-500/25 hover:-translate-y-0.5'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi...
              </span>
            ) : (
              'Gửi Báo Cáo'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
