<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class QuanHuyenSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('quan_huyens')->delete();

        DB::table('quan_huyens')->truncate();

        DB::table('quan_huyens')->insert([
            ['id' => 1, 'ten_quan_huyen' => 'Quận Cẩm Lệ', 'id_tinh_thanh' => 1],
            ['id' => 2, 'ten_quan_huyen' => 'Quận Hải Châu', 'id_tinh_thanh' => 1],
            ['id' => 3, 'ten_quan_huyen' => 'Quận Liên Chiểu', 'id_tinh_thanh' => 1],
            ['id' => 4, 'ten_quan_huyen' => 'Quận Ngũ Hành Sơn', 'id_tinh_thanh' => 1],
            ['id' => 5, 'ten_quan_huyen' => 'Quận Sơn Trà', 'id_tinh_thanh' => 1],
            ['id' => 6, 'ten_quan_huyen' => 'Quận Thanh Khê', 'id_tinh_thanh' => 1],
            ['id' => 7, 'ten_quan_huyen' => 'Huyện Hòa Vang', 'id_tinh_thanh' => 1],
            ['id' => 8, 'ten_quan_huyen' => 'Huyện Hoàng Sa', 'id_tinh_thanh' => 1],
        ]);

    }
}
