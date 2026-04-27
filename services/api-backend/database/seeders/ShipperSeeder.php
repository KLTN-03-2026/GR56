<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ShipperSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('shippers')->delete();
        DB::table('shippers')->truncate();
        DB::table('shippers')->insert([
            [
                'id'             => 1,
                'ho_va_ten'      => 'Shipper A',
                'so_dien_thoai'  => '0123456789',
                'email'          => 'shippera@gmail.com',
                'password'       => bcrypt('123456'),
                'hinh_anh'       => 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTz9DRP4CVaKV8PJry73davlLklnK-PgqIKBQ&s',
                'cccd'           => '123456789012',
                'is_active'      => 1,
                'is_open'        => 1,
                'tong_tien'      => 0,
            ],
            [
                'id'             => 2,
                'ho_va_ten'      => 'Shipper B',
                'so_dien_thoai'  => '0987654321',
                'email'          => 'shipperb@gmail.com',
                'password'       => bcrypt('123456'),
                'hinh_anh'       => 'https://png.pngtree.com/png-vector/20210702/ourmid/pngtree-a-boy-riding-blue-scooter-free-shipping-png-image_3539466.jpg',
                'cccd'           => '987654321098',
                'is_active'      => 1,
                'is_open'        => 1,
                'tong_tien'      => 0,
            ],
        ]);
    }
}
