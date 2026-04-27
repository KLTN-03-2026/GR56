import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layouts
import ClientLayout from '../layouts/ClientLayout';
import BlankLayout from '../layouts/BlankLayout';
import QuanAnLayout from '../layouts/QuanAnLayout';
import ShipperLayout from '../layouts/ShipperLayout';

// Guards
import PrivateRoute from '../components/PrivateRoute';

// KhachHang pages (eager loaded - thường dùng nhất)
import HomePage from '../pages/KhachHang/HomePage';
import DangNhap from '../pages/KhachHang/DangNhap';

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
      <p className="text-gray-400 font-medium">Đang tải...</p>
    </div>
  </div>
);

// Lazy KhachHang
const DangKy = lazy(() => import('../pages/KhachHang/DangKy'));
const QuenMatKhau = lazy(() => import('../pages/KhachHang/QuenMatKhau'));
const Profile = lazy(() => import('../pages/KhachHang/Profile'));
const DonHang = lazy(() => import('../pages/KhachHang/DonHang'));
const DonDatHang = lazy(() => import('../pages/KhachHang/DonDatHang'));
const QuanAnList = lazy(() => import('../pages/KhachHang/QuanAnList'));
const MonAn = lazy(() => import('../pages/KhachHang/MonAn'));
const LichSuXu = lazy(() => import('../pages/KhachHang/LichSuXu'));
const LichSuGiaoDich = lazy(() => import('../pages/KhachHang/LichSuGiaoDich'));
const TimKiem = lazy(() => import('../pages/KhachHang/TimKiem'));
const KichHoat = lazy(() => import('../pages/KhachHang/KichHoat'));
const PaymentReturn = lazy(() => import('../pages/KhachHang/PaymentReturn'));
const YeuThich = lazy(() => import('../pages/KhachHang/YeuThich'));

// Lazy QuanAn auth
const QuanAnDangKy = lazy(() => import('../pages/QuanAn/DangKy'));
const QuanAnDangNhap = lazy(() => import('../pages/QuanAn/DangNhap'));
const QuanAnQuenMatKhau = lazy(() => import('../pages/QuanAn/QuenMatKhau'));

// Lazy QuanAn dashboard
const QuanAnDonHang = lazy(() => import('../pages/QuanAn/DonHang'));
const QuanAnProfile = lazy(() => import('../pages/QuanAn/Profile'));
const QuanAnMonAn = lazy(() => import('../pages/QuanAn/MonAn'));
const QuanAnDanhMuc = lazy(() => import('../pages/QuanAn/DanhMuc'));
const QuanAnVoucher = lazy(() => import('../pages/QuanAn/Voucher'));
const QuanAnDoanhThu = lazy(() => import('../pages/QuanAn/DoanhThu'));
const QuanAnViTien = lazy(() => import('../pages/QuanAn/ViTien'));
const QuanAnConfig = lazy(() => import('../pages/QuanAn/Config'));
const QuanAnThongKeMonAn = lazy(() => import('../pages/QuanAn/ThongKeMonAn'));

// Lazy Shipper
const ShipperDangKy = lazy(() => import('../pages/Shipper/DangKy'));
const ShipperDangNhap = lazy(() => import('../pages/Shipper/DangNhap'));
const ShipperDonHang = lazy(() => import('../pages/Shipper/DonHang'));
const ShipperProfile = lazy(() => import('../pages/Shipper/Profile'));
const ShipperThongKe = lazy(() => import('../pages/Shipper/ThongKe'));
const ShipperViTien = lazy(() => import('../pages/Shipper/ViTien'));
const ShipperViTriHienTai = lazy(() => import('../pages/Shipper/ViTriHienTai'));
const ShipperQuenMatKhau = lazy(() => import('../pages/Shipper/QuenMatKhau'));

// Lazy Admin auth
const AdminDangNhap = lazy(() => import('../pages/Admin/DangNhap'));

// Lazy Admin layout + pages
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard'));
const AdminKhachHang = lazy(() => import('../pages/Admin/KhachHang'));
const AdminQuanAn = lazy(() => import('../pages/Admin/QuanAn'));
const AdminShipper = lazy(() => import('../pages/Admin/Shipper'));
const AdminDonHang = lazy(() => import('../pages/Admin/DonHang'));
const AdminMonAn = lazy(() => import('../pages/Admin/MonAn'));
const AdminDanhMuc = lazy(() => import('../pages/Admin/DanhMuc'));
const AdminVoucher = lazy(() => import('../pages/Admin/Voucher'));
const AdminRutTien = lazy(() => import('../pages/Admin/RutTien'));
const AdminThongKeKhachHang = lazy(() => import('../pages/Admin/ThongKeKhachHang'));
const AdminThongKeQuanAn = lazy(() => import('../pages/Admin/ThongKeQuanAn'));
const AdminNhanVien = lazy(() => import('../pages/Admin/NhanVien'));
const AdminProfile = lazy(() => import('../pages/Admin/Profile'));
const AdminClientMenu = lazy(() => import('../pages/Admin/ClientMenu'));
const AdminPhanQuyen = lazy(() => import('../pages/Admin/PhanQuyen'));
const AdminThongTinDonHang = lazy(() => import('../pages/Admin/ThongTinDonHang'));
const AdminThongKe = lazy(() => import('../pages/Admin/ThongKe'));
const AdminSystemConfig = lazy(() => import('../pages/Admin/SystemConfig'));
const AdminReport = lazy(() => import('../pages/Admin/Report'));
const AdminThongBao = lazy(() => import('../pages/Admin/ThongBao'));
const AdminDanhGia = lazy(() => import('../pages/Admin/DanhGia'));
const S = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

// Placeholder page for unimplemented admin sub-pages
const AdminPlaceholder = ({ title }) => (
  <div className="p-8 text-center">
    <i className="fa-solid fa-hammer text-6xl text-gray-200 mb-4 block" />
    <h2 className="text-xl font-bold text-gray-500">{title}</h2>
    <p className="text-gray-400 text-sm mt-2">Tính năng đang được phát triển...</p>
  </div>
);



const router = createBrowserRouter([
  // =================== KHÁCH HÀNG (Navbar + Footer) ===================
  {
    element: <ClientLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/khach-hang/profile', element: <PrivateRoute>{S(Profile)}</PrivateRoute> },
      { path: '/khach-hang/list-quan-an', element: <PrivateRoute>{S(QuanAnList)}</PrivateRoute> },
      { path: '/khach-hang/mon-an', element: <PrivateRoute>{S(MonAn)}</PrivateRoute> },
      { path: '/khach-hang/quan-an/:id_quan', element: <PrivateRoute>{S(DonDatHang)}</PrivateRoute> },
      { path: '/khach-hang/don-hang', element: <PrivateRoute>{S(DonHang)}</PrivateRoute> },
      { path: '/khach-hang/lich-su-xu', element: <PrivateRoute>{S(LichSuXu)}</PrivateRoute> },
      { path: '/khach-hang/lich-su-giao-dich', element: <PrivateRoute>{S(LichSuGiaoDich)}</PrivateRoute> },
      { path: '/khach-hang/yeu-thich', element: <PrivateRoute>{S(YeuThich)}</PrivateRoute> },
      { path: '/tim-kiem/:thong_tin', element: S(TimKiem) },
    ],
  },

  // =================== BLANK LAYOUT (fullscreen - no nav) ===================
  {
    element: <BlankLayout />,
    children: [
      { path: '/khach-hang/dang-nhap', element: <DangNhap /> },
      { path: '/khach-hang/dang-ky', element: S(DangKy) },
      { path: '/khach-hang/quen-mat-khau', element: S(QuenMatKhau) },
      { path: '/khach-hang/kich-hoat/:id_khach_hang', element: S(KichHoat) },

      // QuanAn auth
      { path: '/quan-an/dang-ky', element: S(QuanAnDangKy) },
      { path: '/quan-an/dang-nhap', element: S(QuanAnDangNhap) },
      { path: '/quan-an/quen-mat-khau', element: S(QuanAnQuenMatKhau) },

      // Shipper auth
      { path: '/shipper/dang-ky', element: S(ShipperDangKy) },
      { path: '/shipper/dang-nhap', element: S(ShipperDangNhap) },
      { path: '/shipper/quen-mat-khau', element: S(ShipperQuenMatKhau) },
      // Admin auth
      { path: '/admin/dang-nhap', element: S(AdminDangNhap) },

      // PayOS Callback Pages (không cần auth)
      { path: '/payment/payos/return', element: S(PaymentReturn) },
      { path: '/payment/payos/cancel', element: S(PaymentReturn) },
    ],
  },

  // =================== SHIPPER DASHBOARD (sidebar layout) ===================
  {
    element: (
      <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><i className="fa-solid fa-motorcycle fa-spin text-4xl text-orange-500"></i></div>}>
        <ShipperLayout />
      </Suspense>
    ),
    children: [
      { path: '/shipper/don-hang', element: S(ShipperDonHang) },
      { path: '/shipper/profile', element: S(ShipperProfile) },
      { path: '/shipper/thong-ke', element: S(ShipperThongKe) },
      { path: '/shipper/vi-tien', element: S(ShipperViTien) },
      { path: '/shipper/vi-tri-hien-tai', element: S(ShipperViTriHienTai) },
    ],
  },

  // =================== QUÁN ĂN DASHBOARD (sidebar layout) ===================
  {
    element: <QuanAnLayout />,
    children: [
      { path: '/quan-an/profile', element: S(QuanAnProfile) },
      { path: '/quan-an/don-hang', element: S(QuanAnDonHang) },
      { path: '/quan-an/mon-an', element: S(QuanAnMonAn) },
      { path: '/quan-an/danh-muc', element: S(QuanAnDanhMuc) },
      { path: '/quan-an/voucher', element: S(QuanAnVoucher) },
      { path: '/quan-an/thong-ke/doanh-thu', element: S(QuanAnDoanhThu) },
      { path: '/quan-an/vi-tien', element: S(QuanAnViTien) },
      { path: '/quan-an/cau-hinh', element: S(QuanAnConfig) },
      { path: '/quan-an/thong-ke/mon-an', element: S(QuanAnThongKeMonAn) },
    ],
  },

  // =================== ADMIN DASHBOARD (sidebar layout) ===================
  {
    element: (
      <Suspense fallback={<PageLoader />}>
        <AdminLayout />
      </Suspense>
    ),
    children: [
      { path: '/admin', element: S(AdminDashboard) },
      { path: '/admin/dashboard', element: S(AdminDashboard) },
      { path: '/admin/khach-hang', element: S(AdminKhachHang) },
      { path: '/admin/quan-an', element: S(AdminQuanAn) },
      { path: '/admin/shipper', element: S(AdminShipper) },
      { path: '/admin/don-hang', element: S(AdminDonHang) },
      { path: '/admin/mon-an', element: S(AdminMonAn) },
      { path: '/admin/danh-muc', element: S(AdminDanhMuc) },
      { path: '/admin/voucher', element: S(AdminVoucher) },
      { path: '/admin/rut-tien', element: S(AdminRutTien) },
      { path: '/admin/thong-ke-khach-hang', element: S(AdminThongKeKhachHang) },
      { path: '/admin/thong-ke-quan-an', element: S(AdminThongKeQuanAn) },
      { path: '/admin/nhan-vien', element: S(AdminNhanVien) },
      { path: '/admin/profile', element: S(AdminProfile) },
      { path: '/admin/client-menu', element: S(AdminClientMenu) },
      { path: '/admin/phan-quyen', element: S(AdminPhanQuyen) },
      { path: '/admin/thong-tin-don-hang', element: S(AdminThongTinDonHang) },
      { path: '/admin/thong-ke', element: S(AdminThongKe) },
      { path: '/admin/cau-hinh-he-thong', element: S(AdminSystemConfig) },
      { path: '/admin/reports', element: S(AdminReport) },
      { path: '/admin/thong-bao', element: S(AdminThongBao) },
      { path: '/admin/danh-gia', element: S(AdminDanhGia) },
    ],
  },

  // =================== CATCH ALL ===================
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
