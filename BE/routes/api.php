<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

// Các Controller
use App\Http\Controllers\CauHinhQuanAnController;
use App\Http\Controllers\ChiTietDonHangController;
use App\Http\Controllers\ChucVuController;
use App\Http\Controllers\ChucNangController;
use App\Http\Controllers\ClientHomeController;
use App\Http\Controllers\DanhMucController;
use App\Http\Controllers\DonHangController;
use App\Http\Controllers\KhachHangController;
use App\Http\Controllers\MonAnController;
use App\Http\Controllers\NhanVienController;
use App\Http\Controllers\PhanQuyenController;
use App\Http\Controllers\QuanAnController;
use App\Http\Controllers\QuanHuyenController;
use App\Http\Controllers\ShipperController;
use App\Http\Controllers\TestController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\ThongKeAdminController;
use App\Http\Controllers\ThongkeController;
use App\Http\Controllers\TinhThanhController;
use App\Http\Controllers\VoucherController;
use App\Http\Controllers\ClientMenuController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\ToppingController;
use App\Http\Controllers\WithdrawController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\PayOSController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\KhachHangBankAccountController;
use App\Http\Controllers\DanhGiaController;
use App\Http\Controllers\YeuThichController;

/*
|--------------------------------------------------------------------------
| 1. PUBLIC ROUTES (Không cần đăng nhập)
|--------------------------------------------------------------------------
*/
// ── Chatbot Routes (PUBLIC) ────────────────────────────────────────────
Route::post('/chatbot/tim-kiem-mon-an', [ChatbotController::class, 'timKiemMonAn']);
Route::post('/chatbot/goi-y-ca-nhan',   [ChatbotController::class, 'goiYCaNhan']);
Route::get('/chatbot/mon-an-ban-chay',  [ChatbotController::class, 'monAnBanChay']);


// ── PayOS Routes (PUBLIC — Webhook & Thông tin) ─────────────────────────────
Route::post('/payos/webhook', [PayOSController::class, 'webhook']);         // Webhook từ PayOS
Route::get('/payos/ngan-hang', [PayOSController::class, 'danhSachNganHang']); // Danh sách ngân hàng


Route::post('/khach-hang/mon-an/tim-kiem', [MonAnController::class, 'searchNguoiDung']);
Route::post('/admin/dang-nhap', [NhanVienController::class, 'Login']);
Route::get('/admin/check-token', [NhanVienController::class, 'checkToken']);

Route::post('/quan-an/dang-nhap', [QuanAnController::class, 'Login']);
Route::post('/quan-an/dang-ky', [QuanAnController::class, 'dangKy']);
Route::get('/quan-an/check-token', [QuanAnController::class, 'checkTokenQuanAn']);

Route::post('/shipper/dang-nhap', [ShipperController::class, 'Login']);
Route::post('/shipper/dang-ky', [ShipperController::class, 'Register']);
Route::get('/shipper/check-token', [ShipperController::class, 'checkTokenShipper']);

Route::get('/khach-hang/check-token', [KhachHangController::class, 'checkToken']);
Route::post('/khach-hang/dang-nhap', [KhachHangController::class, 'Login']);
Route::post('/khach-hang/dang-nhap-google', [KhachHangController::class, 'loginGoogle']);
Route::post('/khach-hang/login-facebook', [KhachHangController::class, 'LoginFace']);
Route::post('/khach-hang/dang-ky', [KhachHangController::class, 'Register']);
Route::post('/khach-hang/kich-hoat', [KhachHangController::class, 'kichHoat']);
Route::post('/khach-hang/gui-ma-quen-mat-khau', [KhachHangController::class, 'guiMaQuenMatKhau']);
Route::post('/khach-hang/quen-mat-khau', [KhachHangController::class, 'quenMatKhau']);

// Data Công khai (Thường dùng cho trang chủ hoặc lúc đăng ký)
Route::get('/khach-hang/tinh-thanh/data', [KhachHangController::class, 'getDataTinhThanh']);
Route::post('/khach-hang/quan-huyen/data', [KhachHangController::class, 'getDataQuanHuyen']);
Route::get('/khach-hang/quan-an/data-open', [QuanAnController::class, 'getDataOpen']);
Route::get('/khach-hang/quan-an/danh-gia/{id_quan_an}', [QuanAnController::class, 'getDanhGia']);
Route::get('/khach-hang/quan-an/thong-ke-danh-gia/{id_quan_an}', [QuanAnController::class, 'getThongKeDanhGia']);
Route::get('/khach-hang/data-mon-an', [KhachHangController::class, 'getMonAn']);
Route::get('/khach-hang/trang-chu/data', [ClientHomeController::class, 'getDataHome']);
Route::get('/khach-hang/toppings/{id_quan_an}', [ToppingController::class, 'getByQuanAn']);
Route::get('/khach-hang/tim-kiem-goi-y', [ClientHomeController::class, 'timKiemGoiY']);
Route::get('/khach-hang/client-menu/data', [ClientMenuController::class, 'getDataClient']);
Route::get('/admin/tinh-thanh/data-open', [TinhThanhController::class, 'getDataOpen']);
Route::get('/admin/quan-huyen/data-open', [QuanHuyenController::class, 'getDataOpen']);

/*
|--------------------------------------------------------------------------
| 2. ADMIN ROUTES (nhanVienMiddle)
|--------------------------------------------------------------------------
*/
Route::group(['prefix' => '/admin', 'middleware' => 'nhanVienMiddle'], function () {
    Route::get('/profile', [NhanVienController::class, 'profile']);
    Route::post('/doi-mat-khau', [NhanVienController::class, 'doiMatKhau']);
    Route::post('/update-profile', [NhanVienController::class, 'updateProfile']);
    Route::get('/dang-xuat', [NhanVienController::class, 'DangXuat']);
    Route::get('/dang-xuat-tat-ca', [NhanVienController::class, 'DangXuatAll']);

    // Quản lý Cấu hình hệ thống
    Route::get('/cau-hinh', [\App\Http\Controllers\CauHinhController::class, 'getCauHinhAdmin']);
    Route::post('/cau-hinh', [\App\Http\Controllers\CauHinhController::class, 'updateCauHinhAdmin']);

    // Quản lý Danh Mục
    Route::get('/danh-muc/data', [DanhMucController::class, 'getData']);
    Route::post('/danh-muc/create', [DanhMucController::class, 'store']);
    Route::post('/danh-muc/update', [DanhMucController::class, 'update']);
    Route::post('/danh-muc/delete', [DanhMucController::class, 'destroy']);
    Route::post('/danh-muc/change-status', [DanhMucController::class, 'changeStatus']);
    Route::post('/danh-muc/tim-kiem', [DanhMucController::class, 'search']);

    // Quản lý Voucher
    Route::get('/voucher/data', [VoucherController::class, 'getData']);
    Route::post('/voucher/create', [VoucherController::class, 'store']);
    Route::post('/voucher/update', [VoucherController::class, 'update']);
    Route::post('/voucher/delete', [VoucherController::class, 'destroy']);
    Route::post('/voucher/change-status', [VoucherController::class, 'changeStatus']);
    Route::post('/voucher/auto-generate', [VoucherController::class, 'autoGenerate']);
    Route::post('/voucher/batch-generate', [VoucherController::class, 'batchGenerate']);
    Route::get('/voucher/thong-ke', [VoucherController::class, 'thongKeVoucher']);
    Route::post('/voucher/gui-email-khuyen-mai', [VoucherController::class, 'guiEmailKhuyenMai']);

    // Quản lý Khách Hàng
    Route::get('/khach-hang/data', [KhachHangController::class, 'getData']);
    Route::post('/khach-hang/create', [KhachHangController::class, 'store']);
    Route::post('/khach-hang/update', [KhachHangController::class, 'update']);
    Route::post('/khach-hang/delete', [KhachHangController::class, 'destroy']);
    Route::post('/khach-hang/change-status', [KhachHangController::class, 'changeStatus']);
    Route::post('/khach-hang/change-active', [KhachHangController::class, 'changeActive']);
    Route::post('/khach-hang/cap-nhat-xu', [KhachHangController::class, 'capNhatXu']);
    Route::post('/khach-hang/tim-kiem', [KhachHangController::class, 'search']);

    // Quản lý Quán Ăn
    Route::get('/quan-an/data', [QuanAnController::class, 'getData']);
    Route::post('/quan-an/create', [QuanAnController::class, 'store']);
    Route::post('/quan-an/update', [QuanAnController::class, 'update']);
    Route::post('/quan-an/delete', [QuanAnController::class, 'destroy']);
    Route::post('/quan-an/change-status', [QuanAnController::class, 'changeStatus']);
    Route::post('/quan-an/change-active', [QuanAnController::class, 'changeActive']);
    Route::post('/quan-an/tim-kiem', [QuanAnController::class, 'search']);

    // Quản lý Shipper
    Route::get('/shipper/data', [ShipperController::class, 'getData']);
    Route::post('/shipper/create', [ShipperController::class, 'store']);
    Route::post('/shipper/update', [ShipperController::class, 'update']);
    Route::post('/shipper/delete', [ShipperController::class, 'destroy']);
    Route::post('/shipper/change-status', [ShipperController::class, 'changeStatus']);
    Route::post('/shipper/active', [ShipperController::class, 'active']);
    Route::post('/shipper/tim-kiem', [ShipperController::class, 'search']);

    // Quản lý Nhân Viên & Chức Vụ & Phân Quyền
    Route::get('/nhan-vien/data', [NhanVienController::class, 'getData']);
    Route::post('/nhan-vien/create', [NhanVienController::class, 'store']);
    Route::post('/nhan-vien/update', [NhanVienController::class, 'update']);
    Route::post('/nhan-vien/delete', [NhanVienController::class, 'destroy']);
    Route::post('/nhan-vien/change-status', [NhanVienController::class, 'changeStatus']);
    Route::post('/nhan-vien/tim-kiem', [NhanVienController::class, 'search']);

    Route::get('/chuc-vu/data', [ChucVuController::class, 'getData']);
    Route::post('/chuc-vu/create', [ChucVuController::class, 'store']);
    Route::post('/chuc-vu/update', [ChucVuController::class, 'update']);
    Route::post('/chuc-vu/delete', [ChucVuController::class, 'destroy']);
    Route::post('/chuc-vu/change-status', [ChucVuController::class, 'changeStatus']);
    Route::post('/chuc-vu/search', [ChucVuController::class, 'searchChucVu']);

    Route::get('/chuc-nang/data', [ChucNangController::class, 'getData']);
    Route::get('/phan-quyen/chi-tiet-data', [PhanQuyenController::class, 'getData']);
    Route::post('/phan-quyen-chuc-vu/create', [PhanQuyenController::class, 'store']);
    Route::post('/phan-quyen-chuc-vu/delete', [PhanQuyenController::class, 'destroy']);

    // Quản lý Món Ăn
    Route::get('/mon-an/data', [MonAnController::class, 'getData']);
    Route::post('/mon-an/create', [MonAnController::class, 'store']);
    Route::post('/mon-an/update', [MonAnController::class, 'update']);
    Route::post('/mon-an/delete', [MonAnController::class, 'destroy']);
    Route::post('/mon-an/change-status', [MonAnController::class, 'changeStatus']);

    // Địa Lý
    Route::get('/tinh-thanh/data', [TinhThanhController::class, 'getData']);
    Route::post('/tinh-thanh/create', [TinhThanhController::class, 'store']);
    Route::post('/tinh-thanh/update', [TinhThanhController::class, 'update']);
    Route::post('/tinh-thanh/delete', [TinhThanhController::class, 'destroy']);
    Route::post('/tinh-thanh/change-status', [TinhThanhController::class, 'changeStatus']);

    Route::post('/quan-huyen/data', [QuanHuyenController::class, 'getData']);
    Route::post('/quan-huyen/create', [QuanHuyenController::class, 'store']);
    Route::post('/quan-huyen/update', [QuanHuyenController::class, 'update']);
    Route::post('/quan-huyen/delete', [QuanHuyenController::class, 'destroy']);
    Route::post('/quan-huyen/change-status', [QuanHuyenController::class, 'changeStatus']);

    // Đơn Hàng & Thống Kê
    Route::get('/don-hang/data', [DonHangController::class, 'getDonHangAdmin']);
    Route::post('/don-hang/data-chi-tiet', [DonHangController::class, 'getChiTietDonHangAdmin']);
    Route::post('/don-hang/huy-don-hang', [DonHangController::class, 'huyDonHangAdmin']);
    Route::get('/don-hang/thong-tin-day-du', [DonHangController::class, 'getDonHangAdmin']);
    Route::post('/don-hang/chi-tiet-day-du', [DonHangController::class, 'getChiTietDonHangAdmin']);
    Route::post('/don-hang/theo-doi', [DonHangController::class, 'theoDoiDonHangAdmin']);


    Route::post('/thong-ke/thong-ke-tien-khach-hang', [ThongKeAdminController::class, 'thongKeTienKhachHang']);
    Route::post('/thong-ke/thong-ke-tien-quan-an', [ThongKeAdminController::class, 'thongKeTienQuanAn']);
    Route::get('/thong-ke/dashboard', [ThongKeAdminController::class, 'dashboard']);
    Route::post('/thong-ke/huy-don', [ThongKeAdminController::class, 'thongKeHuyDon']);

    // Client Menu Admin
    Route::get('/client-menu/data', [ClientMenuController::class, 'getData']);
    Route::post('/client-menu/create', [ClientMenuController::class, 'create']);
    Route::post('/client-menu/update', [ClientMenuController::class, 'update']);
    Route::post('/client-menu/delete', [ClientMenuController::class, 'delete']);
    Route::post('/client-menu/change-status', [ClientMenuController::class, 'changeStatus']);
    Route::post('/client-menu/update-order', [ClientMenuController::class, 'updateOrder']);

    // Quản lý Topping (Admin)
    Route::get('/toppings/data', [ToppingController::class, 'getDataAdmin']);
    Route::post('/toppings/create', [ToppingController::class, 'storeAdmin']);
    Route::post('/toppings/update', [ToppingController::class, 'updateAdmin']);
    Route::post('/toppings/delete', [ToppingController::class, 'deleteAdmin']);
    Route::post('/toppings/change-status', [ToppingController::class, 'changeStatusAdmin']);

    // Ví & Rút Tiền Admin — CHỈ MASTER ADMIN
    Route::group(['middleware' => 'masterMiddle'], function () {
        Route::get('/wallet/overview', [WalletController::class, 'adminOverview']);
        Route::get('/wallet/don-hang-doi-soat', [WalletController::class, 'donHangDoiSoat']);
        Route::post('/wallet/doi-soat', [WalletController::class, 'doiSoatManual']);
        Route::get('/wallet/chi-tiet', [WalletController::class, 'chiTiet']);
        Route::post('/wallet/nop-tien-shipper', [WalletController::class, 'adminNopTienChoShipper']);
        Route::get('/wallet/danh-sach-shipper', [WalletController::class, 'danhSachViShipper']);
        Route::get('/wallet/lich-su-nap-tien', [WalletController::class, 'lichSuNapTienShipper']);

        Route::get('/withdraw/data', [WithdrawController::class, 'adminData']);
        Route::post('/withdraw/approve', [WithdrawController::class, 'approve']);
        Route::post('/withdraw/reject', [WithdrawController::class, 'reject']);
        Route::post('/withdraw/confirm-transfer', [WithdrawController::class, 'confirmTransfer']);
        Route::get('/transaction/lich-su', [TransactionController::class, 'lichSuGiaoDich']);

        // ── PayOS Admin Routes — CHỈ MASTER ADMIN ───────────────────────────────
        Route::get('/payos/kiem-tra-ket-noi', [PayOSController::class, 'kiemTraKetNoi']);
        Route::get('/payos/lich-su', [PayOSController::class, 'lichSu']);
        Route::get('/payos/lich-su-noi-bo', [PayOSController::class, 'lichSuNoiBo']);
        Route::get('/payos/payout/danh-sach', [PayOSController::class, 'danhSachPayout']);
        Route::get('/payos/payout/so-du', [PayOSController::class, 'soDuPayout']);
        Route::get('/payos/payout/{payout_id}', [PayOSController::class, 'chiTietPayout']);

        // ── Quản lý hoàn tiền PayOS — CHỈ MASTER ADMIN ────────────────────────
        Route::get('/refund/danh-sach', [KhachHangBankAccountController::class, 'adminRefundStatus']);
        Route::post('/refund/hoan-tien-thu-cong', [KhachHangBankAccountController::class, 'adminManualRefund']);
    });

    // Quản lý Báo cáo
    Route::get('/reports/data', [ReportController::class, 'getAdminReports']);
    Route::post('/reports/update', [ReportController::class, 'updateAdminReport']);
    Route::post('/reports/duyet-huy-don', [ReportController::class, 'duyetHuyDon']);

    // Quản lý Đánh Giá (Admin)
    Route::get('/danh-gia/data', [DanhGiaController::class, 'getAdminDanhGia']);
    Route::get('/danh-gia/filter-data', [DanhGiaController::class, 'getFilterData']);
    Route::post('/danh-gia/delete', [DanhGiaController::class, 'deleteDanhGia']);
    Route::post('/danh-gia/hide', [DanhGiaController::class, 'hideDanhGia']);

    // Gửi thông báo broadcast hệ thống
    Route::get('/thong-bao-he-thong/data', [App\Http\Controllers\ThongBaoHeThongController::class, 'index']);
    Route::post('/thong-bao-he-thong/store', [App\Http\Controllers\ThongBaoHeThongController::class, 'store']);
    Route::delete('/thong-bao-he-thong/{id}', [App\Http\Controllers\ThongBaoHeThongController::class, 'destroy']);
});


Route::post('/quan-an/gui-ma-quen-mat-khau', [QuanAnController::class, 'guiMaQuenMatKhau']);
Route::post('/quan-an/quen-mat-khau', [QuanAnController::class, 'quenMatKhau']);
/*
|--------------------------------------------------------------------------
| 3. QUÁN ĂN ROUTES (quanAnMiddle)
|--------------------------------------------------------------------------
*/
Route::group(['prefix' => '/quan-an', 'middleware' => 'quanAnMiddle'], function () {
    Route::get('/dang-xuat', [QuanAnController::class, 'DangXuat']);
    Route::get('/dang-xuat-tat-ca', [QuanAnController::class, 'DangXuatAll']);
    Route::get('/data-login', [QuanAnController::class, 'getDataQuanAn']);
    Route::post('/update-profile', [QuanAnController::class, 'updateProfile']);
    Route::post('/update-password', [QuanAnController::class, 'updatePassword']);

    // Danh Mục & Món Ăn (Quán Ăn)
    Route::get('/danh-muc/data', [QuanAnController::class, 'getDataDanhMuc']);
    Route::get('/danh-muc/data-danh-muc-cha', [QuanAnController::class, 'getDataDanhMucCha']);
    Route::post('/danh-muc/create', [QuanAnController::class, 'createDanhMuc']);
    Route::post('/danh-muc/update', [QuanAnController::class, 'updateDanhMuc']);
    Route::post('/danh-muc/delete', [QuanAnController::class, 'deleteDanhMuc']);
    Route::post('/danh-muc/change', [QuanAnController::class, 'doiTrangThaiDanhMuc']);

    Route::get('/mon-an/data', [QuanAnController::class, 'getDataMonAn']);
    Route::post('/mon-an/create', [QuanAnController::class, 'createMonAn']);
    Route::post('/mon-an/update', [QuanAnController::class, 'updateMonAn']);
    Route::post('/mon-an/delete', [QuanAnController::class, 'deleteMonAn']);
    Route::post('/mon-an/change', [QuanAnController::class, 'doiTrangThaiMonAn']);

    // Topping Quán Ăn
    Route::get('/toppings/data', [ToppingController::class, 'getDataQuanAn']);
    Route::post('/toppings/create', [ToppingController::class, 'storeQuanAn']);
    Route::post('/toppings/update', [ToppingController::class, 'updateQuanAn']);
    Route::post('/toppings/delete', [ToppingController::class, 'deleteQuanAn']);
    Route::post('/toppings/change-status', [ToppingController::class, 'changeStatusQuanAn']);

    // Voucher Quán Ăn
    Route::get('/voucher/data', [VoucherController::class, 'getDataQuanAnVoucher']);
    Route::post('/voucher/create', [VoucherController::class, 'createQuanAnVoucher']);
    Route::post('/voucher/update', [VoucherController::class, 'updateQuanAnVoucher']);
    Route::post('/voucher/delete', [VoucherController::class, 'deleteQuanAnVoucher']);
    Route::post('/voucher/change', [VoucherController::class, 'doiTrangThaiQuanAnVoucher']);

    // Đơn Hàng Quán Ăn
    Route::get('/don-hang/data', [DonHangController::class, 'getDonHangQuanAn']);
    Route::post('/don-hang/nhan-don', [DonHangController::class, 'quanAnNhanDon']);
    Route::post('/don-hang/da-xong', [DonHangController::class, 'daXongDonHang']);
    Route::post('/don-hang/chi-tiet', [DonHangController::class, 'chiTietDonHangQuanAn']);

    // Cấu hình & Thống kê
    Route::post('/cau-hinh', [CauHinhQuanAnController::class, 'cauHinhQuanAn']);
    Route::get('/cau-hinh/data', [CauHinhQuanAnController::class, 'cauHinhQuanAnData']);
    Route::post('/thong-ke/doanh-thu', [ThongkeController::class, 'thongkeDoanhThu']);
    Route::post('/thong-ke/mon-an', [ThongkeController::class, 'thongkeMonAn']);
    Route::get('/thong-ke/tong-quan', [ThongkeController::class, 'thongKeTongQuan']);

    // Báo cáo
    Route::post('/reports/create', [ReportController::class, 'store']);
});


Route::post('/shipper/gui-ma-quen-mat-khau', [ShipperController::class, 'guiMaQuenMatKhau']);
Route::post('/shipper/quen-mat-khau', [ShipperController::class, 'quenMatKhau']);
/*
|--------------------------------------------------------------------------
| 4. SHIPPER ROUTES (shipperMiddle)
|--------------------------------------------------------------------------
*/
Route::group(['prefix' => '/shipper', 'middleware' => 'shipperMiddle'], function () {
    Route::get('/dang-xuat', [ShipperController::class, 'DangXuat']);
    Route::get('/dang-xuat-tat-ca', [ShipperController::class, 'DangXuatAll']);
    Route::get('/data-login', [ShipperController::class, 'dataSP']);
    Route::post('/update-profile', [ShipperController::class, 'updateSP']);
    Route::post('/update-password', [ShipperController::class, 'updatePassword']);

    // Đơn hàng Shipper (Style cũ)
    Route::get('/don-hang/data-nhan', [ShipperController::class, 'dataDonHangNhan']);
    Route::get('/don-hang/data-da-giao', [ShipperController::class, 'dataDaGiao']);
    Route::post('/nhan-don-hang', [ShipperController::class, 'nhanDonHang']);
    Route::post('/hoan-thanh-don', [ShipperController::class, 'hoanThanhDonHang']);
    Route::post('/cap-nhat-vi-tri-don-gian', [ShipperController::class, 'capNhatViTri']);
    Route::post('/cap-nhat-vi-tri', [DonHangController::class, 'capNhatViTriShipper']);

    // Đơn hàng Shipper (Style mới)
    Route::get('/don-hang/data', [DonHangController::class, 'getDonHangShipper']);
    Route::get('/don-hang/data-dang-giao', [DonHangController::class, 'getDonHangShipperDangGiao']);
    Route::post('/don-hang/nhan-don', [DonHangController::class, 'nhanDonDonHangShipper']);
    Route::post('/don-hang/hoan-thanh', [DonHangController::class, 'hoanThanhDonHangShipper']);
    Route::post('/don-hang/chi-tiet-mon-an', [DonHangController::class, 'chiTietDonHangQuanAn']);
    Route::post('/don-hang/thong-ke', [ThongkeController::class, 'dataThongKeShipper']);

    Route::get('/wallet/qr-nop-tien', [TransactionController::class, 'qrNopTien']);

    // Chat
    Route::get('/chat/{id_don_hang}/tin-nhan', [ChatController::class, 'layTinNhan']);
    Route::post('/chat/gui', [ChatController::class, 'guiTinNhan']);
    Route::get('/chat/{id_don_hang}/chua-doc', [ChatController::class, 'demChuaDoc']);

    // Đánh giá Shipper
    Route::get('/danh-gia', [ShipperController::class, 'getDanhGiaShipper']);

    // Báo cáo
    Route::post('/reports/create', [ReportController::class, 'store']);
});

/*
|--------------------------------------------------------------------------
| 5. KHÁCH HÀNG ROUTES (khachHangMiddle)
|--------------------------------------------------------------------------
*/
Route::group(['prefix' => '/khach-hang', 'middleware' => 'khachHangMiddle'], function () {
    Route::get('/dang-xuat', [KhachHangController::class, 'DangXuat']);
    Route::get('/dang-xuat-tat-ca', [KhachHangController::class, 'DangXuatAll']);
    Route::post('/update-avatar', [KhachHangController::class, 'updateAvatar']);
    Route::post('/doi-mat-khau', [KhachHangController::class, 'doiMatKhau']);
    Route::get('/data-login', [KhachHangController::class, 'getDataKhachHang']);
    Route::post('/update-profile', [KhachHangController::class, 'updateProfile']);
    Route::post('/update-password', [KhachHangController::class, 'updatePassword']);

    // Địa Chỉ Khách Hàng
    Route::get('/dia-chi/data', [KhachHangController::class, 'getDataDiaChi']);
    Route::post('/dia-chi/create', [KhachHangController::class, 'storeDiaChi']);
    Route::post('/dia-chi/update', [KhachHangController::class, 'updateDiaChi']);
    Route::post('/dia-chi/delete', [KhachHangController::class, 'destroyDiaChi']);

    Route::get('/lich-su-xu', [KhachHangController::class, 'getLichSuXu']);
    Route::get('/quan-an/data', [ClientHomeController::class, 'getDataQuanAn']);

    // Giỏ hàng & Đơn đặt hàng
    Route::get('/gio-hang/summary', [ChiTietDonHangController::class, 'getCartSummary']);
    Route::get('/don-dat-hang/{id_quan_an}', [ChiTietDonHangController::class, 'getDonDatHang']);
    Route::get('/xac-nhan-dat-hang/{id_quan_an}/{id_dia_chi_khach}', [ChiTietDonHangController::class, 'xacNhanDatHangChuyenKhoan']);
    Route::get('/xac-nhan-dat-hang-tien-mat/{id_quan_an}/{id_dia_chi_khach}', [ChiTietDonHangController::class, 'xacNhanDatHangTienMat']);
    Route::post('/don-dat-hang/create', [ChiTietDonHangController::class, 'themGioHang']);
    Route::post('/don-dat-hang/update', [ChiTietDonHangController::class, 'updateGioHang']);
    Route::post('/don-dat-hang/delete', [ChiTietDonHangController::class, 'deleteGioHang']);
    Route::post('/don-dat-hang/phi-ship', [ChiTietDonHangController::class, 'tinhPhiShip']);
    Route::post('/don-dat-hang/app-voucher', [ChiTietDonHangController::class, 'appVoucher']);

    // Voucher & Đơn Hàng Khách
    Route::get('/voucher/de-xuat', [VoucherController::class, 'deXuatVoucher']);
    Route::get('/voucher/cua-toi', [VoucherController::class, 'voucherCuaToi']);
    Route::get('/voucher/public', [VoucherController::class, 'voucherPublic']);
    Route::get('/don-hang/data', [DonHangController::class, 'getDonHangKhachHang']);
    Route::post('/don-hang/data-chi-tiet', [DonHangController::class, 'getChiTietDonHangKhachHang']);
    Route::post('/don-hang/reorder', [DonHangController::class, 'reorder']);
    Route::post('/don-hang/theo-doi-don-hang', [DonHangController::class, 'theoDoiDonHangKhachHang']);
    Route::get('/lich-su-giao-dich', [DonHangController::class, 'getLichSuGiaoDich']);
    Route::post('/don-hang/danh-gia', [DonHangController::class, 'danhGiaDonHang']);

    // Chat
    Route::get('/chat/{id_don_hang}/tin-nhan', [ChatController::class, 'layTinNhan']);
    Route::post('/chat/gui', [ChatController::class, 'guiTinNhan']);
    Route::get('/chat/{id_don_hang}/chua-doc', [ChatController::class, 'demChuaDoc']);

    // Báo cáo
    Route::post('/reports/create', [ReportController::class, 'store']);

    // ── Tài khoản NH hoàn tiền tự động (MỚI) ─────────────────────────────
    Route::get('/tai-khoan-ngan-hang', [KhachHangBankAccountController::class, 'index']);
    Route::post('/tai-khoan-ngan-hang', [KhachHangBankAccountController::class, 'store']);
    Route::delete('/tai-khoan-ngan-hang/{id}', [KhachHangBankAccountController::class, 'destroy']);
    Route::post('/tai-khoan-ngan-hang/{id}/default', [KhachHangBankAccountController::class, 'setDefault']);

    // ── Yêu Thích (Wishlist) ───────────────────────────────────────────────
    Route::get('/yeu-thich/data',   [YeuThichController::class, 'getYeuThich']);
    Route::get('/yeu-thich/ids',    [YeuThichController::class, 'getYeuThichIds']);
    Route::post('/yeu-thich/toggle', [YeuThichController::class, 'toggleYeuThich']);

    // ── Thông Báo ───────────────────────────────────────────────────────────
    Route::get('/thong-bao/data', [NotificationController::class, 'index']);
    Route::post('/thong-bao/mark-read', [NotificationController::class, 'markAsRead']);
});


/*
|--------------------------------------------------------------------------
| 6. WALLET & SYSTEM ROUTES
|--------------------------------------------------------------------------
*/
// Rút tiền (Dùng chung cho cả Quán và Shipper - cần Sanctum)
Route::group(['middleware' => 'auth:sanctum'], function () {
    Route::get('/wallet/chi-tiet', [WalletController::class, 'chiTiet']);
    Route::get('/wallet/lich-su-rut', [WithdrawController::class, 'lichSuRut']);
    Route::post('/wallet/yeu-cau-rut-tien', [WithdrawController::class, 'createWithdrawRequest']);
    Route::post('/wallet/tao-link-nap-tien', [WalletController::class, 'taoLinkNapTienShipper']);
    Route::post('/wallet/xac-nhan-nap-tien', [WalletController::class, 'xacNhanNapTienS2S']);
    Route::get('/wallet/tai-khoan', [WithdrawController::class, 'bankAccounts']);
    Route::post('/wallet/them-tai-khoan', [WithdrawController::class, 'addBankAccount']);
    Route::post('/wallet/xoa-tai-khoan', [WithdrawController::class, 'deleteBankAccount']);

    // Notifications
    Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index']);
    Route::post('/notifications/mark-read', [\App\Http\Controllers\NotificationController::class, 'markAsRead']);
});

// MB Bank & Broadcasting Section
Route::get('/transaction/sync', [TransactionController::class, 'syncTransactions']);

// ── PayOS: Tạo link thanh toán (Yêu cầu auth sanctum) ────────────────────────
Route::group(['middleware' => 'khachHangMiddle'], function () {
    Route::post('/payos/tao-link/{id_don_hang}', [PayOSController::class, 'taoLinkThanhToan']); // Tạo link thanh toán PayOS
    Route::get('/payos/thong-tin/{orderCode}', [PayOSController::class, 'thongTinLink']);     // Thông tin link
    Route::post('/payos/xac-nhan-s2s', [PayOSController::class, 'xacNhanS2S']);       // Xác nhận giao dịch S2S thủ công
    Route::post('/payos/huy-link/{orderCode}', [PayOSController::class, 'huyLink']);          // Huỷ link
});


Route::post('/broadcasting/auth', function (Request $request) {
    if (!Auth::guard('sanctum')->check())
        return response()->json(['message' => 'Unauthorized'], 401);
    $user = Auth::guard('sanctum')->user();
    $request->setUserResolver(fn() => $user);
    try {
        return Broadcast::auth($request);
    } catch (\Exception $e) {
        return response()->json(['message' => 'Forbidden', 'error' => $e->getMessage()], 403);
    }
})->middleware(['auth:sanctum']);

// Legacy/Test Routes
Route::get('/transaction', [TestController::class, 'GetTransaction']);
Route::get('/text/{input}', [TestController::class, 'convert']);

// return response()->json(['message' => 'Forbidden', 'error' => $e->getMessage()], 403);
//     }
// })->middleware(['auth:sanctum']);

// // Legacy/Test Routes
// Route::get('/transaction',                              [TestController::class, 'GetTransaction']);
// Route::get('/text/{input}',                             [TestController::class, 'convert']);
