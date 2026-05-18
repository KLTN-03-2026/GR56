<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChucNangSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('chuc_nangs')->delete();
        DB::table('chuc_nangs')->truncate();

        DB::table('chuc_nangs')->insert([
            // === QUẢN LÝ NHÂN VIÊN (1-5) ===
            ['id' => 1, 'ten_chuc_nang' => 'Xem danh sách nhân viên'],
            ['id' => 2, 'ten_chuc_nang' => 'Tạo mới nhân viên'],
            ['id' => 3, 'ten_chuc_nang' => 'Cập nhật thông tin nhân viên'],
            ['id' => 4, 'ten_chuc_nang' => 'Xóa nhân viên'],
            ['id' => 5, 'ten_chuc_nang' => 'Thay đổi trạng thái nhân viên'],

            // === QUẢN LÝ SHIPPER (6-11) ===
            ['id' => 6, 'ten_chuc_nang' => 'Xem danh sách shipper'],
            ['id' => 7, 'ten_chuc_nang' => 'Tạo mới shipper'],
            ['id' => 8, 'ten_chuc_nang' => 'Cập nhật thông tin shipper'],
            ['id' => 9, 'ten_chuc_nang' => 'Xóa shipper'],
            ['id' => 10, 'ten_chuc_nang' => 'Thay đổi trạng thái shipper'],
            ['id' => 11, 'ten_chuc_nang' => 'Duyệt đăng ký shipper'],

            // === QUẢN LÝ KHÁCH HÀNG (12-16) ===
            ['id' => 12, 'ten_chuc_nang' => 'Xem danh sách khách hàng'],
            ['id' => 13, 'ten_chuc_nang' => 'Cập nhật thông tin khách hàng'],
            ['id' => 14, 'ten_chuc_nang' => 'Thay đổi trạng thái khách hàng'],
            ['id' => 15, 'ten_chuc_nang' => 'Xóa khách hàng'],
            ['id' => 16, 'ten_chuc_nang' => 'Tìm kiếm khách hàng'],

            // === QUẢN LÝ VOUCHER (17-21) ===
            ['id' => 17, 'ten_chuc_nang' => 'Xem danh sách voucher'],
            ['id' => 18, 'ten_chuc_nang' => 'Tạo voucher hệ thống'],
            ['id' => 19, 'ten_chuc_nang' => 'Xóa voucher'],
            ['id' => 20, 'ten_chuc_nang' => 'Cập nhật voucher'],
            ['id' => 21, 'ten_chuc_nang' => 'Thay đổi trạng thái voucher'],

            // === QUẢN LÝ DANH MỤC (22-26) ===
            ['id' => 22, 'ten_chuc_nang' => 'Xem danh sách danh mục'],
            ['id' => 23, 'ten_chuc_nang' => 'Tạo mới danh mục'],
            ['id' => 24, 'ten_chuc_nang' => 'Xóa danh mục'],
            ['id' => 25, 'ten_chuc_nang' => 'Cập nhật danh mục'],
            ['id' => 26, 'ten_chuc_nang' => 'Thay đổi trạng thái danh mục'],

            // === QUẢN LÝ QUÁN ĂN (27-32) ===
            ['id' => 27, 'ten_chuc_nang' => 'Kích hoạt quán ăn'],
            ['id' => 28, 'ten_chuc_nang' => 'Xem danh sách quán ăn'],
            ['id' => 29, 'ten_chuc_nang' => 'Tạo mới quán ăn'],
            ['id' => 30, 'ten_chuc_nang' => 'Cập nhật thông tin quán ăn'],
            ['id' => 31, 'ten_chuc_nang' => 'Xóa quán ăn'],
            ['id' => 32, 'ten_chuc_nang' => 'Thay đổi trạng thái quán ăn'],

            // === QUẢN LÝ CHỨC VỤ (33-39) ===
            ['id' => 33, 'ten_chuc_nang' => 'Tạo mới chức vụ'],
            ['id' => 34, 'ten_chuc_nang' => 'Xem danh sách chức vụ'],
            ['id' => 35, 'ten_chuc_nang' => 'Xem chi tiết chức vụ'],
            ['id' => 36, 'ten_chuc_nang' => 'Cập nhật chức vụ'],
            ['id' => 37, 'ten_chuc_nang' => 'Xóa chức vụ'],
            ['id' => 38, 'ten_chuc_nang' => 'Thay đổi trạng thái chức vụ'],
            ['id' => 39, 'ten_chuc_nang' => 'Tìm kiếm chức vụ'],

            // === QUẢN LÝ CHỨC NĂNG (40) ===
            ['id' => 40, 'ten_chuc_nang' => 'Xem danh sách chức năng'],

            // === QUẢN LÝ PHÂN QUYỀN (41) ===
            ['id' => 41, 'ten_chuc_nang' => 'Xem danh sách phân quyền'],
            ['id' => 56, 'ten_chuc_nang' => 'Cấp quyền cho chức vụ'],
            ['id' => 57, 'ten_chuc_nang' => 'Xóa quyền khỏi chức vụ'],

            // === DASHBOARD & ĐƠN HÀNG ADMIN (58-63) ===
            ['id' => 58, 'ten_chuc_nang' => 'Xem dashboard admin'],
            ['id' => 59, 'ten_chuc_nang' => 'Xem danh sách đơn hàng admin'],
            ['id' => 60, 'ten_chuc_nang' => 'Xem chi tiết đơn hàng admin'],
            ['id' => 61, 'ten_chuc_nang' => 'Hủy đơn hàng admin'],
            ['id' => 62, 'ten_chuc_nang' => 'Theo dõi đơn hàng admin'],
            ['id' => 63, 'ten_chuc_nang' => 'Xem đơn hàng chatbot'],

            // === QUẢN LÝ MÓN ĂN ADMIN (64-69) ===
            ['id' => 64, 'ten_chuc_nang' => 'Xem danh sách món ăn admin'],
            ['id' => 65, 'ten_chuc_nang' => 'Tạo mới món ăn admin'],
            ['id' => 66, 'ten_chuc_nang' => 'Cập nhật món ăn admin'],
            ['id' => 67, 'ten_chuc_nang' => 'Xóa món ăn admin'],
            ['id' => 68, 'ten_chuc_nang' => 'Thay đổi trạng thái món ăn admin'],
            ['id' => 69, 'ten_chuc_nang' => 'Tìm kiếm món ăn admin'],

            // === MENU GIAO DIỆN CLIENT (70-75) ===
            ['id' => 70, 'ten_chuc_nang' => 'Xem menu giao diện'],
            ['id' => 71, 'ten_chuc_nang' => 'Tạo menu giao diện'],
            ['id' => 72, 'ten_chuc_nang' => 'Cập nhật menu giao diện'],
            ['id' => 73, 'ten_chuc_nang' => 'Xóa menu giao diện'],
            ['id' => 74, 'ten_chuc_nang' => 'Thay đổi trạng thái menu giao diện'],
            ['id' => 75, 'ten_chuc_nang' => 'Sắp xếp menu giao diện'],

            // === TOPPING ADMIN (76-80) ===
            ['id' => 76, 'ten_chuc_nang' => 'Xem topping admin'],
            ['id' => 77, 'ten_chuc_nang' => 'Tạo topping admin'],
            ['id' => 78, 'ten_chuc_nang' => 'Cập nhật topping admin'],
            ['id' => 79, 'ten_chuc_nang' => 'Xóa topping admin'],
            ['id' => 80, 'ten_chuc_nang' => 'Thay đổi trạng thái topping admin'],

            // === VÍ, RÚT TIỀN, HOÀN TIỀN (81-84) ===
            ['id' => 81, 'ten_chuc_nang' => 'Xem ví tài chính admin'],
            ['id' => 82, 'ten_chuc_nang' => 'Đối soát và hoàn tiền admin'],
            ['id' => 83, 'ten_chuc_nang' => 'Nạp tiền cho shipper'],
            ['id' => 84, 'ten_chuc_nang' => 'Duyệt yêu cầu rút tiền'],

            // === BÁO CÁO, ĐÁNH GIÁ, THÔNG BÁO, AI (85-95) ===
            ['id' => 85, 'ten_chuc_nang' => 'Xem báo cáo khiếu nại'],
            ['id' => 86, 'ten_chuc_nang' => 'Cập nhật báo cáo khiếu nại'],
            ['id' => 87, 'ten_chuc_nang' => 'Duyệt yêu cầu hủy đơn'],
            ['id' => 88, 'ten_chuc_nang' => 'Xem đánh giá admin'],
            ['id' => 89, 'ten_chuc_nang' => 'Xóa đánh giá admin'],
            ['id' => 90, 'ten_chuc_nang' => 'Ẩn hiện đánh giá admin'],
            ['id' => 91, 'ten_chuc_nang' => 'Xem thông báo hệ thống'],
            ['id' => 92, 'ten_chuc_nang' => 'Gửi thông báo hệ thống'],
            ['id' => 93, 'ten_chuc_nang' => 'Xóa thông báo hệ thống'],
            ['id' => 94, 'ten_chuc_nang' => 'Xem AI chatbot analytics'],
            ['id' => 95, 'ten_chuc_nang' => 'Cập nhật AI chatbot analytics'],

            // === THỐNG KÊ CHUYÊN TRANG (96-97) ===
            ['id' => 96, 'ten_chuc_nang' => 'Xem thống kê khách hàng'],
            ['id' => 97, 'ten_chuc_nang' => 'Xem thống kê quán ăn'],

            // === ĐỊA LÝ ADMIN (99-108) ===
            ['id' => 99, 'ten_chuc_nang' => 'Xem tỉnh thành'],
            ['id' => 100, 'ten_chuc_nang' => 'Tạo tỉnh thành'],
            ['id' => 101, 'ten_chuc_nang' => 'Cập nhật tỉnh thành'],
            ['id' => 102, 'ten_chuc_nang' => 'Xóa tỉnh thành'],
            ['id' => 103, 'ten_chuc_nang' => 'Thay đổi trạng thái tỉnh thành'],
            ['id' => 104, 'ten_chuc_nang' => 'Xem quận huyện'],
            ['id' => 105, 'ten_chuc_nang' => 'Tạo quận huyện'],
            ['id' => 106, 'ten_chuc_nang' => 'Cập nhật quận huyện'],
            ['id' => 107, 'ten_chuc_nang' => 'Xóa quận huyện'],
            ['id' => 108, 'ten_chuc_nang' => 'Thay đổi trạng thái quận huyện'],

            // === BÁO CÁO & THỐNG KÊ (42-45) ===
            ['id' => 42, 'ten_chuc_nang' => 'Xem báo cáo doanh thu'],
            ['id' => 43, 'ten_chuc_nang' => 'Xem thống kê hệ thống'],
            ['id' => 44, 'ten_chuc_nang' => 'Xuất báo cáo Excel/PDF'],
            ['id' => 45, 'ten_chuc_nang' => 'Xem báo cáo chi tiết theo thời gian'],

            // === QUẢN LÝ HỆ THỐNG (46-48) ===
            ['id' => 46, 'ten_chuc_nang' => 'Cấu hình hệ thống'],
            ['id' => 47, 'ten_chuc_nang' => 'Backup dữ liệu'],
            ['id' => 48, 'ten_chuc_nang' => 'Xem log hệ thống'],

            // === HỖ TRỢ KHÁCH HÀNG (49-51) ===
            ['id' => 49, 'ten_chuc_nang' => 'Trả lời chat khách hàng'],
            ['id' => 50, 'ten_chuc_nang' => 'Xử lý khiếu nại'],
            ['id' => 51, 'ten_chuc_nang' => 'Quản lý feedback'],

            // === MARKETING (52-55) ===
            ['id' => 52, 'ten_chuc_nang' => 'Tạo chương trình khuyến mãi'],
            ['id' => 53, 'ten_chuc_nang' => 'Quản lý banner/quảng cáo'],
            ['id' => 54, 'ten_chuc_nang' => 'Gửi thông báo push'],
            ['id' => 55, 'ten_chuc_nang' => 'Quản lý email marketing'],
        ]);
    }
}
