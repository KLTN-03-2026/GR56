<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CauHinhSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $configs = [
            [
                'ma_cau_hinh' => 'chiet_khau_phan_tram',
                'gia_tri' => '15',
                'mo_ta' => 'Phần trăm hoa hồng sàn thu từ quán ăn (%)',
            ],
            [
                'ma_cau_hinh' => 'phi_ship_km_binh_thuong',
                'gia_tri' => '15000',
                'mo_ta' => 'Phí giao hàng mỗi km vào giờ bình thường (VNĐ)',
            ],
            [
                'ma_cau_hinh' => 'phi_ship_km_cao_diem',
                'gia_tri' => '20000',
                'mo_ta' => 'Phí giao hàng mỗi km vào giờ cao điểm (VNĐ)',
            ],
            [
                'ma_cau_hinh' => 'don_toi_thieu',
                'gia_tri' => '30000',
                'mo_ta' => 'Giá trị đơn hàng tối thiểu (VNĐ)',
            ],
            [
                'ma_cau_hinh' => 'phi_ship_toi_thieu',
                'gia_tri' => '15000',
                'mo_ta' => 'Phí giao hàng thấp nhất dù khoảng cách gần (VNĐ)',
            ],
            [
                'ma_cau_hinh' => 'gio_cao_diem',
                'gia_tri' => json_encode([
                    ['start' => '11:00', 'end' => '13:00'],
                    ['start' => '17:30', 'end' => '19:30'],
                ]),
                'mo_ta' => 'Danh sách khung giờ cao điểm tính phí ship',
            ],
        ];

        foreach ($configs as $config) {
            \App\Models\CauHinh::updateOrCreate(
                ['ma_cau_hinh' => $config['ma_cau_hinh']],
                $config
            );
        }
    }
}
