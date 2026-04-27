<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class NhanVienSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('nhan_viens')->delete();
        DB::table('nhan_viens')->truncate();

        DB::table('nhan_viens')->insert([
            [
                'email' => 'admin@master.com',
                'ho_va_ten' => 'Admin Master',
                'password' => bcrypt('123456'),
                'so_dien_thoai' => '0901234567',
                'dia_chi' => '180 Cao Lỗ, Phường 4, Quận 8, TP.HCM',
                'ngay_sinh' => '1990-01-15',
                'avatar' => null,
                'tinh_trang' => 1,
                'id_chuc_vu' => 1,
                'is_master' => 1,
            ],
            [
                'email' => 'vannhan130504@gmail.com',
                'ho_va_ten' => 'Nguyễn Văn Nhân',
                'password' => bcrypt('123456'),
                'so_dien_thoai' => '0912345678',
                'dia_chi' => '123 Nguyễn Văn Cừ, Quận 5, TP.HCM',
                'ngay_sinh' => '1985-03-20',
                'avatar' => null,
                'tinh_trang' => 1,
                'id_chuc_vu' => 2,
                'is_master' => 1, // Full quyền như admin master
            ],
            [
                'email' => 'nhansu@gmail.com',
                'ho_va_ten' => 'Trần Thị Nhân',
                'password' => bcrypt('123456'),
                'so_dien_thoai' => '0923456789',
                'dia_chi' => '456 Lý Thường Kiệt, Quận 10, TP.HCM',
                'ngay_sinh' => '1988-07-25',
                'avatar' => null,
                'tinh_trang' => 1,
                'id_chuc_vu' => 7,
                'is_master' => 0,
            ],
            [
                'email' => 'ketoan@gmail.com',
                'ho_va_ten' => 'Lê Thị Kế',
                'password' => bcrypt('123456'),
                'so_dien_thoai' => '0934567890',
                'dia_chi' => '789 Cách Mạng Tháng 8, Quận 3, TP.HCM',
                'ngay_sinh' => '1992-12-10',
                'avatar' => null,
                'tinh_trang' => 1,
                'id_chuc_vu' => 18,
                'is_master' => 0,
            ],
            [
                'email' => 'it@gmail.com',
                'ho_va_ten' => 'Phạm Văn Công Nghệ',
                'password' => bcrypt('123456'),
                'so_dien_thoai' => '0945678901',
                'dia_chi' => '321 Võ Văn Ngân, TP.Thủ Đức, TP.HCM',
                'ngay_sinh' => '1994-05-05',
                'avatar' => null,
                'tinh_trang' => 1,
                'id_chuc_vu' => 20,
                'is_master' => 0,
            ],
            [
                'email' => 'banhang@gmail.com',
                'ho_va_ten' => 'Hoàng Thị Bán',
                'password' => bcrypt('123456'),
                'so_dien_thoai' => '0956789012',
                'dia_chi' => '147 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM',
                'ngay_sinh' => '1995-08-15',
                'avatar' => null,
                'tinh_trang' => 1,
                'id_chuc_vu' => 21,
                'is_master' => 0,
            ],
            [
                'email' => 'cskh@gmail.com',
                'ho_va_ten' => 'Vũ Thị Chăm Sóc',
                'password' => bcrypt('123456'),
                'so_dien_thoai' => '0967890123',
                'dia_chi' => '258 Lê Văn Việt, TP.Thủ Đức, TP.HCM',
                'ngay_sinh' => '1993-11-20',
                'avatar' => null,
                'tinh_trang' => 1,
                'id_chuc_vu' => 22,
                'is_master' => 0,
            ]
        ]);

    }
}
