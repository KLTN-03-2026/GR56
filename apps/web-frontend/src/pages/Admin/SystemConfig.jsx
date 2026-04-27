import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import toast from "react-hot-toast";

const SystemConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Config hiện có ─────────────────────────────────────────────
  const [formData, setFormData] = useState({
    chiet_khau_phan_tram: 15,
    phi_ship_km_binh_thuong: 15000,
    phi_ship_km_cao_diem: 20000,
    phi_ship_toi_thieu: 15000,
    don_toi_thieu: 30000,
    gio_cao_diem: [
      { start: "11:00", end: "13:00" },
      { start: "17:30", end: "19:30" }
    ]
  });

  // ── Config hoàn tiền tự động (MỚI) ─────────────────────────────
  const [refundConfig, setRefundConfig] = useState({ refund_enabled: '1', refund_delay_minutes: '5' });
  const [savingRefund, setSavingRefund] = useState(false);

  // ── Config tự động hủy đơn ───────────────────────────────────────
  const [cancelConfig, setCancelConfig] = useState({ auto_cancel_enabled: '1', thoi_gian_cho_shipper: '5' });
  const [savingCancel, setSavingCancel] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/cau-hinh");
      if (res.data.status) {
        const data = res.data.data;
        setFormData({
          chiet_khau_phan_tram: Number(data.chiet_khau_phan_tram || 15),
          phi_ship_km_binh_thuong: Number(data.phi_ship_km_binh_thuong || 15000),
          phi_ship_km_cao_diem: Number(data.phi_ship_km_cao_diem || 20000),
          phi_ship_toi_thieu: Number(data.phi_ship_toi_thieu || 15000),
          don_toi_thieu: Number(data.don_toi_thieu || 30000),
          gio_cao_diem: Array.isArray(data.gio_cao_diem) ? data.gio_cao_diem : [
            { start: "11:00", end: "13:00" },
            { start: "17:30", end: "19:30" }
          ]
        });
        // Load refund config từ cùng response
        setRefundConfig({
          refund_enabled: data.refund_enabled !== undefined ? String(data.refund_enabled) : '1',
          refund_delay_minutes: data.refund_delay_minutes !== undefined ? String(data.refund_delay_minutes) : '5',
        });
        // Load auto-cancel config
        setCancelConfig({
          auto_cancel_enabled: data.auto_cancel_enabled !== undefined ? String(data.auto_cancel_enabled) : '1',
          thoi_gian_cho_shipper: data.thoi_gian_cho_shipper !== undefined ? String(data.thoi_gian_cho_shipper) : '5',
        });
      }
    } catch (error) {
      toast.error("Lỗi khi tải cấu hình hệ thống");
    } finally {
      setLoading(false);
    }
  };

  // ── Lưu refund config riêng (MỚI) ──────────────────────────────
  const saveRefundConfig = async () => {
    setSavingRefund(true);
    try {
      const res = await api.post("/api/admin/cau-hinh", {
        ...formData,
        refund_enabled: refundConfig.refund_enabled,
        refund_delay_minutes: refundConfig.refund_delay_minutes,
      });
      if (res.data.status) toast.success(res.data.message);
      else toast.error(res.data.message);
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSavingRefund(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleTimeChange = (index, field, value) => {
    const newTimes = [...formData.gio_cao_diem];
    newTimes[index][field] = value;
    setFormData(prev => ({ ...prev, gio_cao_diem: newTimes }));
  };

  const addTimeSlot = () => {
    setFormData(prev => ({
      ...prev,
      gio_cao_diem: [...prev.gio_cao_diem, { start: "00:00", end: "00:00" }]
    }));
  };

  const removeTimeSlot = (index) => {
    const newTimes = formData.gio_cao_diem.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, gio_cao_diem: newTimes }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.post("/api/admin/cau-hinh", formData);
      if (res.data.status) toast.success(res.data.message);
    } catch (error) {
      toast.error("Lỗi khi cập nhật cấu hình");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <i className="fa-solid fa-spinner fa-spin text-4xl text-orange-500"></i>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Cấu Hình Nền Tảng</h2>
        <p className="text-gray-500 mt-1">Quản lý các thông số tài chính, phí nền tảng và hoa hồng.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Card 1 — Chiết khấu */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">1. Chiết khấu nền tảng</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hoa hồng thu từ quán ăn (%) <span className="text-red-500">*</span>
            </label>
            <div className="flex bg-gray-50 rounded-lg overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500 transition-all">
              <input type="number" name="chiet_khau_phan_tram" required min="0" max="100"
                value={formData.chiet_khau_phan_tram} onChange={handleChange}
                className="flex-1 bg-transparent px-4 py-2.5 outline-none text-gray-800" />
              <span className="flex items-center px-4 bg-gray-100 text-gray-500 font-medium border-l border-gray-200">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Tỉ lệ phần trăm hệ thống sẽ tự động trừ khi đơn hàng hoàn thành.</p>
          </div>
        </div>

        {/* Card 2 — Phí vận chuyển */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">2. Cấu hình cước vận chuyển</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cước vận chuyển mỗi KM (Giờ bình thường)</label>
              <div className="flex bg-gray-50 rounded-lg overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                <input type="number" name="phi_ship_km_binh_thuong" required min="0"
                  value={formData.phi_ship_km_binh_thuong} onChange={handleChange}
                  className="flex-1 bg-transparent px-4 py-2.5 outline-none text-gray-800" />
                <span className="flex items-center px-4 bg-gray-100 text-gray-500 font-medium border-l border-gray-200">VNĐ</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cước vận chuyển mỗi KM (Giờ cao điểm)</label>
              <div className="flex bg-gray-50 rounded-lg overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                <input type="number" name="phi_ship_km_cao_diem" required min="0"
                  value={formData.phi_ship_km_cao_diem} onChange={handleChange}
                  className="flex-1 bg-transparent px-4 py-2.5 outline-none text-gray-800" />
                <span className="flex items-center px-4 bg-gray-100 text-gray-500 font-medium border-l border-gray-200">VNĐ</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phí giao hàng tối thiểu</label>
              <div className="flex bg-gray-50 rounded-lg overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                <input type="number" name="phi_ship_toi_thieu" required min="0"
                  value={formData.phi_ship_toi_thieu} onChange={handleChange}
                  className="flex-1 bg-transparent px-4 py-2.5 outline-none text-gray-800" />
                <span className="flex items-center px-4 bg-gray-100 text-gray-500 font-medium border-l border-gray-200">VNĐ</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Khoảng cách quá ngắn (ví dụ &lt; 1km) phí ship sẽ được tính tối thiểu theo mốc này.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Khung giờ cao điểm</label>
            <div className="space-y-3">
              {formData.gio_cao_diem.map((slot, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input type="time" required value={slot.start}
                    onChange={(e) => handleTimeChange(index, "start", e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 p-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
                  <span className="text-gray-500 text-sm">đến</span>
                  <input type="time" required value={slot.end}
                    onChange={(e) => handleTimeChange(index, "end", e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 p-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
                  <button type="button" onClick={() => removeTimeSlot(index)}
                    className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addTimeSlot}
              className="mt-3 flex items-center gap-2 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-lg transition-colors font-medium border border-orange-100">
              <i className="fa-solid fa-plus"></i> Thêm khung giờ
            </button>
          </div>
        </div>

        {/* Card 3 — Giỏ hàng */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">3. Cấu hình giỏ hàng</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị đơn hàng tối thiểu</label>
            <div className="flex bg-gray-50 rounded-lg overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-orange-500 transition-all">
              <input type="number" name="don_toi_thieu" required min="0"
                value={formData.don_toi_thieu} onChange={handleChange}
                className="flex-1 bg-transparent px-4 py-2.5 outline-none text-gray-800" />
              <span className="flex items-center px-4 bg-gray-100 text-gray-500 font-medium border-l border-gray-200">VNĐ</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Khách hàng chỉ có thể đặt hàng nếu tổng tiền món ăn bằng hoặc lớn hơn mức này.</p>
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" disabled={saving}
            className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold text-white transition-all shadow-md focus:ring-4 focus:ring-orange-200 flex items-center justify-center gap-2 ${saving ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 hover:-translate-y-0.5 hover:shadow-lg'}`}>
            {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-save"></i>}
            {saving ? "Đang lưu..." : "Lưu Cấu Hình"}
          </button>
        </div>
      </form>

      {/* Card 4 — Hoàn tiền tự động PayOS (MỚI - form riêng) */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border-2 border-orange-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <i className="fa-solid fa-rotate-left text-orange-500 text-sm" />
          </span>
          4. Hoàn tiền tự động PayOS
        </h3>
        <p className="text-gray-400 text-sm mb-5 ml-10">Tự động chuyển tiền về tài khoản NH của khách khi đơn bị hủy (chỉ đơn thanh toán PayOS).</p>

        <div className="space-y-5">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <div className="font-semibold text-gray-800 text-sm">Bật hoàn tiền tự động</div>
              <div className="text-xs text-gray-500 mt-0.5">Khi tắt, hệ thống sẽ KHÔNG tự chuyển tiền — Admin phải xử lý thủ công</div>
            </div>
            <button type="button"
              onClick={() => setRefundConfig(c => ({ ...c, refund_enabled: c.refund_enabled === '1' ? '0' : '1' }))}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 ${refundConfig.refund_enabled === '1' ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${refundConfig.refund_enabled === '1' ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fa-solid fa-hourglass-half mr-2 text-orange-400" />
              Thời gian chờ trước khi hoàn tiền
            </label>
            <div className="flex bg-gray-50 rounded-lg overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-orange-500 transition-all max-w-xs">
              <input type="number" min="1" max="1440"
                value={refundConfig.refund_delay_minutes}
                onChange={e => setRefundConfig(c => ({ ...c, refund_delay_minutes: e.target.value }))}
                className="flex-1 bg-transparent px-4 py-2.5 outline-none text-gray-800" />
              <span className="flex items-center px-4 bg-gray-100 text-gray-500 font-medium border-l border-gray-200 text-sm">phút</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Hệ thống chờ N phút sau khi hủy đơn rồi mới thực hiện hoàn tiền — tránh hoàn nhầm nếu hủy nhầm.
            </p>
          </div>

          {/* Info box */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs space-y-1">
            <div><i className="fa-solid fa-circle-info mr-1" /><strong>Điều kiện hoàn tiền:</strong> Đơn hủy + Đã thanh toán PayOS + Khách đã cấu hình tài khoản NH</div>
            <div><i className="fa-solid fa-building-columns mr-1" />Tiền được chuyển qua <strong>PayOS Payout API</strong> vào tài khoản mặc định của khách</div>
          </div>

          <button type="button" onClick={saveRefundConfig} disabled={savingRefund}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-all ${savingRefund ? 'bg-orange-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 hover:shadow-lg hover:-translate-y-0.5'}`}>
            {savingRefund ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-rotate-left" />}
            {savingRefund ? 'Đang lưu...' : 'Lưu cài đặt hoàn tiền'}
          </button>
        </div>
      </div>

      {/* Card 5 — Tự động hủy đơn quá hạn */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border-2 border-red-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <i className="fa-solid fa-clock text-red-500 text-sm" />
          </span>
          5. Tự Động Hủy Đơn Quá Hạn
        </h3>
        <p className="text-gray-400 text-sm mb-5 ml-10">
          Tự động hủy đơn ở trạng thái <strong>Chờ shipper</strong> / <strong>Chờ quán nhận</strong> nếu không ai nhận trong N phút.
          Hệ thống sẽ hoàn xu, voucher và hoàn tiền PayOS tự động.
        </p>

        <div className="space-y-5">
          {/* Toggle bật/tắt */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <div className="font-semibold text-gray-800 text-sm">Bật tự động hủy đơn</div>
              <div className="text-xs text-gray-500 mt-0.5">Khi tắt, đơn quá hạn sẽ KHÔNG bị hủy tự động</div>
            </div>
            <button type="button"
              onClick={() => setCancelConfig(c => ({ ...c, auto_cancel_enabled: c.auto_cancel_enabled === '1' ? '0' : '1' }))}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 ${cancelConfig.auto_cancel_enabled === '1' ? 'bg-red-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${cancelConfig.auto_cancel_enabled === '1' ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Thời gian chờ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fa-solid fa-hourglass-half mr-2 text-red-400" />
              Thời gian chờ shipper nhận đơn
            </label>
            <div className="flex bg-gray-50 rounded-lg overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-red-400 transition-all max-w-xs">
              <input type="number" min="1" max="60"
                value={cancelConfig.thoi_gian_cho_shipper}
                onChange={e => setCancelConfig(c => ({ ...c, thoi_gian_cho_shipper: e.target.value }))}
                className="flex-1 bg-transparent px-4 py-2.5 outline-none text-gray-800" />
              <span className="flex items-center px-4 bg-gray-100 text-gray-500 font-medium border-l border-gray-200 text-sm">phút</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Sau <strong>{cancelConfig.thoi_gian_cho_shipper} phút</strong> không có shipper nhận → đơn tự động bị hủy. Khuyến nghị: 5–15 phút.
            </p>
          </div>

          {/* Info box */}
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs space-y-1">
            <div><i className="fa-solid fa-circle-info mr-1" /><strong>Luồng xử lý:</strong> Hủy đơn → Hoàn xu → Hoàn voucher → Hoàn tiền PayOS (nếu đơn online)</div>
            <div><i className="fa-solid fa-bell mr-1" />Khách hàng và Quán ăn nhận thông báo realtime khi đơn bị hủy</div>
          </div>

          <button type="button"
            onClick={async () => {
              setSavingCancel(true);
              try {
                const res = await api.post('/api/admin/cau-hinh', cancelConfig);
                if (res.data.status) toast.success(res.data.message);
                else toast.error(res.data.message);
              } catch { toast.error('Lỗi kết nối'); }
              finally { setSavingCancel(false); }
            }}
            disabled={savingCancel}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-all ${savingCancel ? 'bg-red-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 hover:shadow-lg hover:-translate-y-0.5'}`}>
            {savingCancel ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-clock" />}
            {savingCancel ? 'Đang lưu...' : 'Lưu cài đặt hủy đơn'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemConfig;
