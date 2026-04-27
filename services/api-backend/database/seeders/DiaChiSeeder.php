<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DiaChiSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('dia_chis')->truncate();

        DB::table('dia_chis')->insert([
            ['id' => 1,  'dia_chi' => '101 Lê Duẩn',                          'id_quan_huyen' => 2, 'toa_do_x' => 108.2135434, 'toa_do_y' => 16.0706229,  'id_khach_hang' => 1, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Nguyễn Văn Nhân',       'so_dien_thoai' => '0123456780'],
            ['id' => 2,  'dia_chi' => '23 Nguyễn Văn Linh',                   'id_quan_huyen' => 2, 'toa_do_x' => 108.2187971, 'toa_do_y' => 16.060746,   'id_khach_hang' => 1, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Nguyễn Văn Nhân',       'so_dien_thoai' => '0123456780'],
            ['id' => 3,  'dia_chi' => '45 Lê Thanh Nghị',                     'id_quan_huyen' => 2, 'toa_do_x' => 108.2151536, 'toa_do_y' => 16.0424714,  'id_khach_hang' => 1, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Nguyễn Văn Nhân',       'so_dien_thoai' => '0123456780'],
            ['id' => 4,  'dia_chi' => '88 Nguyễn Tất Thành',                  'id_quan_huyen' => 6, 'toa_do_x' => 16.065522,   'toa_do_y' => 108.187813,  'id_khach_hang' => 2, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Nguyễn Văn A',          'so_dien_thoai' => '0123456789'],
            ['id' => 5,  'dia_chi' => '190 Trần Cao Vân',                     'id_quan_huyen' => 6, 'toa_do_x' => 16.060112,   'toa_do_y' => 108.199389,  'id_khach_hang' => 2, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Nguyễn Văn A',          'so_dien_thoai' => '0123456789'],
            ['id' => 6,  'dia_chi' => '02 Nguyễn Hữu Thọ',                   'id_quan_huyen' => 2, 'toa_do_x' => 16.043820,   'toa_do_y' => 108.210663,  'id_khach_hang' => 2, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Nguyễn Văn A',          'so_dien_thoai' => '0123456789'],
            ['id' => 7,  'dia_chi' => '60 Nguyễn Tri Phương',                 'id_quan_huyen' => 6, 'toa_do_x' => 16.058120,   'toa_do_y' => 108.197856,  'id_khach_hang' => 3, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Lê Minh Tuấn',          'so_dien_thoai' => '0987654321'],
            ['id' => 8,  'dia_chi' => '66 Nguyễn Chí Thanh',                  'id_quan_huyen' => 2, 'toa_do_x' => 16.073004,   'toa_do_y' => 108.220612,  'id_khach_hang' => 3, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Lê Minh Tuấn',          'so_dien_thoai' => '0987654321'],
            ['id' => 9,  'dia_chi' => '80 Nguyễn Hữu Thọ',                   'id_quan_huyen' => 2, 'toa_do_x' => 16.046311,   'toa_do_y' => 108.210984,  'id_khach_hang' => 3, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Lê Minh Tuấn',          'so_dien_thoai' => '0987654321'],
            ['id' => 10, 'dia_chi' => '37 Nguyễn Văn Thoại',                  'id_quan_huyen' => 4, 'toa_do_x' => 16.042390,   'toa_do_y' => 108.243331,  'id_khach_hang' => 4, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Trần Thị Hồng Nhung',   'so_dien_thoai' => '0911223344'],
            ['id' => 11, 'dia_chi' => '33 An Thượng 26',                      'id_quan_huyen' => 4, 'toa_do_x' => 16.037229,   'toa_do_y' => 108.246977,  'id_khach_hang' => 4, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Trần Thị Hồng Nhung',   'so_dien_thoai' => '0911223344'],
            ['id' => 12, 'dia_chi' => '25 Hồ Xuân Hương',                     'id_quan_huyen' => 4, 'toa_do_x' => 16.031478,   'toa_do_y' => 108.242894,  'id_khach_hang' => 4, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Trần Thị Hồng Nhung',   'so_dien_thoai' => '0911223344'],
            ['id' => 13, 'dia_chi' => '14 Nguyễn Văn Cừ',                     'id_quan_huyen' => 3, 'toa_do_x' => 16.087891,   'toa_do_y' => 108.133952,  'id_khach_hang' => 5, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Đặng Quốc Huy',         'so_dien_thoai' => '0933445566'],
            ['id' => 14, 'dia_chi' => '112 Tôn Đức Thắng',                    'id_quan_huyen' => 3, 'toa_do_x' => 16.065361,   'toa_do_y' => 108.157582,  'id_khach_hang' => 5, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Đặng Quốc Huy',         'so_dien_thoai' => '0933445566'],
            ['id' => 15, 'dia_chi' => '295 Nguyễn Lương Bằng',                'id_quan_huyen' => 3, 'toa_do_x' => 16.071234,   'toa_do_y' => 108.153721,  'id_khach_hang' => 5, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Đặng Quốc Huy',         'so_dien_thoai' => '0933445566'],
            ['id' => 16, 'dia_chi' => '15 Nguyễn Công Trứ',                   'id_quan_huyen' => 5, 'toa_do_x' => 16.071203,   'toa_do_y' => 108.236738,  'id_khach_hang' => 6, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Phạm Thị Mai',          'so_dien_thoai' => '0909887766'],
            ['id' => 17, 'dia_chi' => '21 Hồ Nghinh',                         'id_quan_huyen' => 5, 'toa_do_x' => 16.074378,   'toa_do_y' => 108.244821,  'id_khach_hang' => 6, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Phạm Thị Mai',          'so_dien_thoai' => '0909887766'],
            ['id' => 18, 'dia_chi' => '05 Võ Văn Kiệt',                       'id_quan_huyen' => 5, 'toa_do_x' => 16.061167,   'toa_do_y' => 108.238498,  'id_khach_hang' => 6, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Phạm Thị Mai',          'so_dien_thoai' => '0909887766'],
            ['id' => 19, 'dia_chi' => 'Trung tâm hành chính huyện Hòa Vang',  'id_quan_huyen' => 7, 'toa_do_x' => 16.003093,   'toa_do_y' => 108.054232,  'id_khach_hang' => 7, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Ngô Văn Lâm',           'so_dien_thoai' => '0966887799'],
            ['id' => 20, 'dia_chi' => 'Xã Hòa Nhơn',                          'id_quan_huyen' => 7, 'toa_do_x' => 15.997589,   'toa_do_y' => 108.062402,  'id_khach_hang' => 7, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Ngô Văn Lâm',           'so_dien_thoai' => '0966887799'],
            ['id' => 21, 'dia_chi' => 'Khu công nghệ cao Hòa Liên',           'id_quan_huyen' => 7, 'toa_do_x' => 16.061901,   'toa_do_y' => 108.027447,  'id_khach_hang' => 7, 'id_shipper' => 0, 'ten_nguoi_nhan' => 'Ngô Văn Lâm',           'so_dien_thoai' => '0966887799'],
        ]);
    }
}
