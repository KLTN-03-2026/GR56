<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ChucVuSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('chuc_vus')->delete();

        DB::table('chuc_vus')->truncate();

        DB::table('chuc_vus')->insert([
            // === CẤP LÃNH ĐẠO ===
            ['id' => 1, 'ten_chuc_vu' => 'CEO/Tổng Giám Đốc', 'slug_chuc_vu' => Str::slug('CEO/Tổng Giám Đốc'), 'tinh_trang' => 1],
            ['id' => 2, 'ten_chuc_vu' => 'COO - Giám đốc vận hành', 'slug_chuc_vu' => Str::slug('COO - Giám đốc vận hành'), 'tinh_trang' => 1],
            ['id' => 3, 'ten_chuc_vu' => 'CTO - Giám đốc công nghệ', 'slug_chuc_vu' => Str::slug('CTO - Giám đốc công nghệ'), 'tinh_trang' => 1],
            ['id' => 4, 'ten_chuc_vu' => 'CMO - Giám đốc marketing', 'slug_chuc_vu' => Str::slug('CMO - Giám đốc marketing'), 'tinh_trang' => 1],
            ['id' => 5, 'ten_chuc_vu' => 'CFO - Giám đốc tài chính', 'slug_chuc_vu' => Str::slug('CFO - Giám đốc tài chính'), 'tinh_trang' => 1],

            // === QUẢN LÝ CẤP TRUNG ===
            ['id' => 6, 'ten_chuc_vu' => 'Trưởng phòng IT', 'slug_chuc_vu' => Str::slug('Trưởng phòng IT'), 'tinh_trang' => 1],
            ['id' => 7, 'ten_chuc_vu' => 'Trưởng phòng Marketing', 'slug_chuc_vu' => Str::slug('Trưởng phòng Marketing'), 'tinh_trang' => 1],
            ['id' => 8, 'ten_chuc_vu' => 'Trưởng phòng Vận hành', 'slug_chuc_vu' => Str::slug('Trưởng phòng Vận hành'), 'tinh_trang' => 1],
            ['id' => 9, 'ten_chuc_vu' => 'Trưởng phòng CSKH', 'slug_chuc_vu' => Str::slug('Trưởng phòng CSKH'), 'tinh_trang' => 1],
            ['id' => 10, 'ten_chuc_vu' => 'Trưởng phòng Nhân sự', 'slug_chuc_vu' => Str::slug('Trưởng phòng Nhân sự'), 'tinh_trang' => 1],
            ['id' => 11, 'ten_chuc_vu' => 'Trưởng phòng Kế toán', 'slug_chuc_vu' => Str::slug('Trưởng phòng Kế toán'), 'tinh_trang' => 1],

            // === QUẢN LÝ TRỰC TIẾP ===
            ['id' => 12, 'ten_chuc_vu' => 'Team Lead Backend', 'slug_chuc_vu' => Str::slug('Team Lead Backend'), 'tinh_trang' => 1],
            ['id' => 13, 'ten_chuc_vu' => 'Team Lead Frontend', 'slug_chuc_vu' => Str::slug('Team Lead Frontend'), 'tinh_trang' => 1],
            ['id' => 14, 'ten_chuc_vu' => 'Team Lead Mobile', 'slug_chuc_vu' => Str::slug('Team Lead Mobile'), 'tinh_trang' => 1],
            ['id' => 15, 'ten_chuc_vu' => 'Quản lý đối tác quán ăn', 'slug_chuc_vu' => Str::slug('Quản lý đối tác quán ăn'), 'tinh_trang' => 1],
            ['id' => 16, 'ten_chuc_vu' => 'Quản lý Shipper', 'slug_chuc_vu' => Str::slug('Quản lý Shipper'), 'tinh_trang' => 1],

            // === NHÂN VIÊN CHUYÊN MÔN ===
            ['id' => 17, 'ten_chuc_vu' => 'Senior Developer', 'slug_chuc_vu' => Str::slug('Senior Developer'), 'tinh_trang' => 1],
            ['id' => 18, 'ten_chuc_vu' => 'Developer', 'slug_chuc_vu' => Str::slug('Developer'), 'tinh_trang' => 1],
            ['id' => 19, 'ten_chuc_vu' => 'Junior Developer', 'slug_chuc_vu' => Str::slug('Junior Developer'), 'tinh_trang' => 1],
            ['id' => 20, 'ten_chuc_vu' => 'DevOps Engineer', 'slug_chuc_vu' => Str::slug('DevOps Engineer'), 'tinh_trang' => 1],
            ['id' => 21, 'ten_chuc_vu' => 'QA Engineer', 'slug_chuc_vu' => Str::slug('QA Engineer'), 'tinh_trang' => 1],
            ['id' => 22, 'ten_chuc_vu' => 'System Administrator', 'slug_chuc_vu' => Str::slug('System Administrator'), 'tinh_trang' => 1],

            // === NHÂN VIÊN VẬN HÀNH ===
            ['id' => 23, 'ten_chuc_vu' => 'Specialist đối tác quán ăn', 'slug_chuc_vu' => Str::slug('Specialist đối tác quán ăn'), 'tinh_trang' => 1],
            ['id' => 24, 'ten_chuc_vu' => 'Nhân viên onboard quán ăn', 'slug_chuc_vu' => Str::slug('Nhân viên onboard quán ăn'), 'tinh_trang' => 1],
            ['id' => 25, 'ten_chuc_vu' => 'Nhân viên quản lý Shipper', 'slug_chuc_vu' => Str::slug('Nhân viên quản lý Shipper'), 'tinh_trang' => 1],
            ['id' => 26, 'ten_chuc_vu' => 'Nhân viên xử lý đơn hàng', 'slug_chuc_vu' => Str::slug('Nhân viên xử lý đơn hàng'), 'tinh_trang' => 1],

            // === NHÂN VIÊN CSKH & MARKETING ===
            ['id' => 27, 'ten_chuc_vu' => 'Senior CSKH', 'slug_chuc_vu' => Str::slug('Senior CSKH'), 'tinh_trang' => 1],
            ['id' => 28, 'ten_chuc_vu' => 'Nhân viên CSKH', 'slug_chuc_vu' => Str::slug('Nhân viên CSKH'), 'tinh_trang' => 1],
            ['id' => 29, 'ten_chuc_vu' => 'Content Marketing', 'slug_chuc_vu' => Str::slug('Content Marketing'), 'tinh_trang' => 1],
            ['id' => 30, 'ten_chuc_vu' => 'Digital Marketing', 'slug_chuc_vu' => Str::slug('Digital Marketing'), 'tinh_trang' => 1],
            ['id' => 31, 'ten_chuc_vu' => 'Data Analyst', 'slug_chuc_vu' => Str::slug('Data Analyst'), 'tinh_trang' => 1],

            // === NHÂN VIÊN HỖ TRỢ ===
            ['id' => 32, 'ten_chuc_vu' => 'Nhân viên Kế toán', 'slug_chuc_vu' => Str::slug('Nhân viên Kế toán'), 'tinh_trang' => 1],
            ['id' => 33, 'ten_chuc_vu' => 'Nhân viên Nhân sự', 'slug_chuc_vu' => Str::slug('Nhân viên Nhân sự'), 'tinh_trang' => 1],
            ['id' => 34, 'ten_chuc_vu' => 'Thư ký/Trợ lý', 'slug_chuc_vu' => Str::slug('Thư ký/Trợ lý'), 'tinh_trang' => 1],
            ['id' => 35, 'ten_chuc_vu' => 'Nhân viên thực tập', 'slug_chuc_vu' => Str::slug('Nhân viên thực tập'), 'tinh_trang' => 0], // Thực tập tạm thời không hoạt động
        ]);
    }
}
