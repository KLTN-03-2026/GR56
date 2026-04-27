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
