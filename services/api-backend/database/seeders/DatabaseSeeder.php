<?php

namespace Database\Seeders;

use App\Models\DiaChiKhachHang;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        \Illuminate\Support\Facades\Schema::disableForeignKeyConstraints();

        $this->call([
            QuanHuyenSeeder::class,
            TinhThanhSeeder::class,
            DiaChiSeeder::class,
            KhachHangSeeder::class,
            ShipperSeeder::class,
            QuanAnSeeder::class,
            MonAnSeeder::class,
            ChiTietDonHangSeeder::class,
            DonHangSeeder::class,
            NhanVienSeeder::class,
            DanhMucSeeder::class,
            ChucVuSeeder::class,
            ChucNangSeeder::class,
            PhanQuyenSeeder::class,
            VoucherSeeder::class,
            ChiTietDanhMucQuanAnSeeder::class,
            ClientMenuSeeder::class,
            ToppingSeeder::class,
            MonAnSizeSeeder::class,
            CauHinhSeeder::class,
        ]);

        \Illuminate\Support\Facades\Schema::enableForeignKeyConstraints();
    }
}
