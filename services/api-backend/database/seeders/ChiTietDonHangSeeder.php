<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChiTietDonHangSeeder extends Seeder
{
    public function run(): void
    {
        /*
        DB::table('chi_tiet_don_hangs')->delete();
        DB::table('chi_tiet_don_hangs')->truncate();
        DB::table('chi_tiet_don_hangs')->insert([
            [
                'id' => 1,
                'id_don_hang' => 1,
                'id_khach_hang' => 1,
                'id_mon_an' => 1, // Cafe Dừa
                'id_quan_an' => 2,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 2,
                'id_don_hang' => 1,
                'id_khach_hang' => 1,
                'id_mon_an' => 2, // Cafe Máy
                'id_quan_an' => 2,
                'so_luong' => 1,
                'don_gia' => 15000,
                'thanh_tien' => 15000,
            ],
            [
                'id' => 3,
                'id_don_hang' => 2,
                'id_khach_hang' => 2,
                'id_mon_an' => 9, // Lục Trà Chanh
                'id_quan_an' => 3,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 4,
                'id_don_hang' => 3,
                'id_khach_hang' => 3,
                'id_mon_an' => 13, // Phin Sữa Đá
                'id_quan_an' => 4,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 5,
                'id_don_hang' => 3,
                'id_khach_hang' => 3,
                'id_mon_an' => 15, // Bạc Xỉu
                'id_quan_an' => 4,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 6,
                'id_don_hang' => 4,
                'id_khach_hang' => 4,
                'id_mon_an' => 19, // Cơm Tấm Sườn
                'id_quan_an' => 5,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 7,
                'id_don_hang' => 5,
                'id_khach_hang' => 5,
                'id_mon_an' => 22, // Cơm Chiên Dương Châu
                'id_quan_an' => 6,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            [
                'id' => 8,
                'id_don_hang' => 6,
                'id_khach_hang' => 6,
                'id_mon_an' => 25, // Cơm Chiên Trứng
                'id_quan_an' => 7,
                'so_luong' => 1,
                'don_gia' => 50000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 9,
                'id_don_hang' => 7,
                'id_khach_hang' => 7,
                'id_mon_an' => 27, // Cơm Cá Kho
                'id_quan_an' => 8,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 10,
                'id_don_hang' => 8,
                'id_khach_hang' => 1,
                'id_mon_an' => 30, // Xôi Chiên Thịt Băm
                'id_quan_an' => 9,
                'so_luong' => 2,
                'don_gia' => 20000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 11,
                'id_don_hang' => 11,
                'id_khach_hang' => 4,
                'id_mon_an' => 39, // Bún Thập Cẩm
                'id_quan_an' => 10,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 12,
                'id_don_hang' => 12,
                'id_khach_hang' => 5,
                'id_mon_an' => 41, // Nước Ép Cà Rốt
                'id_quan_an' => 11,
                'so_luong' => 2,
                'don_gia' => 25000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 13,
                'id_don_hang' => 13,
                'id_khach_hang' => 6,
                'id_mon_an' => 45, // Trà Sữa Trân Châu Đường Đen
                'id_quan_an' => 12,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            [
                'id' => 14,
                'id_don_hang' => 14,
                'id_khach_hang' => 7,
                'id_mon_an' => 53, // Cơm Chay
                'id_quan_an' => 13,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 15,
                'id_don_hang' => 15,
                'id_khach_hang' => 1,
                'id_mon_an' => 56, // Cà Ri Chay
                'id_quan_an' => 14,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 16,
                'id_don_hang' => 16,
                'id_khach_hang' => 2,
                'id_mon_an' => 58, // Bánh Su Kem
                'id_quan_an' => 15,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 17,
                'id_don_hang' => 17,
                'id_khach_hang' => 3,
                'id_mon_an' => 61, // Bánh Mì Heo Quay
                'id_quan_an' => 16,
                'so_luong' => 1,
                'don_gia' => 50000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 18,
                'id_don_hang' => 18,
                'id_khach_hang' => 4,
                'id_mon_an' => 64, // Nước Dừa
                'id_quan_an' => 17,
                'so_luong' => 1,
                'don_gia' => 35000,
                'thanh_tien' => 35000,
            ],
            [
                'id' => 19,
                'id_don_hang' => 19,
                'id_khach_hang' => 5,
                'id_mon_an' => 76, // Sườn Bì
                'id_quan_an' => 18,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 20,
                'id_don_hang' => 20,
                'id_khach_hang' => 6,
                'id_mon_an' => 78, // Súp Cua
                'id_quan_an' => 19,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 21,
                'id_don_hang' => 21,
                'id_khach_hang' => 1,
                'id_mon_an' => 9, // Lục Trà Chanh
                'id_quan_an' => 3,
                'so_luong' => 2,
                'don_gia' => 25000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 22,
                'id_don_hang' => 21,
                'id_khach_hang' => 1,
                'id_mon_an' => 10, // Lục Trà Xoài
                'id_quan_an' => 3,
                'so_luong' => 1,
                'don_gia' => 10000,
                'thanh_tien' => 10000,
            ],
            [
                'id' => 23,
                'id_don_hang' => 22,
                'id_khach_hang' => 2,
                'id_mon_an' => 13, // Phin Sữa Đá
                'id_quan_an' => 4,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 24,
                'id_don_hang' => 22,
                'id_khach_hang' => 2,
                'id_mon_an' => 14, // Phin Đen Đá
                'id_quan_an' => 4,
                'so_luong' => 3,
                'don_gia' => 15000,
                'thanh_tien' => 45000,
            ],
            [
                'id' => 25,
                'id_don_hang' => 23,
                'id_khach_hang' => 3,
                'id_mon_an' => 19, // Cơm Tấm Sườn
                'id_quan_an' => 5,
                'so_luong' => 2,
                'don_gia' => 25000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 26,
                'id_don_hang' => 24,
                'id_khach_hang' => 4,
                'id_mon_an' => 22, // Cơm Chiên Dương Châu
                'id_quan_an' => 6,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            [
                'id' => 27,
                'id_don_hang' => 24,
                'id_khach_hang' => 4,
                'id_mon_an' => 23, // Cơm Đùi Gà Quay
                'id_quan_an' => 6,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 28,
                'id_don_hang' => 25,
                'id_khach_hang' => 5,
                'id_mon_an' => 25, // Cơm Chiên Trứng
                'id_quan_an' => 7,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 29,
                'id_don_hang' => 25,
                'id_khach_hang' => 5,
                'id_mon_an' => 26, // Cơm Chiên Heo Quay
                'id_quan_an' => 7,
                'so_luong' => 2,
                'don_gia' => 20000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 30,
                'id_don_hang' => 26,
                'id_khach_hang' => 6,
                'id_mon_an' => 27, // Cơm Cá Kho
                'id_quan_an' => 8,
                'so_luong' => 2,
                'don_gia' => 35000,
                'thanh_tien' => 70000,
            ],
            [
                'id' => 31,
                'id_don_hang' => 31,
                'id_khach_hang' => 1,
                'id_mon_an' => 1, // Cafe Dừa
                'id_quan_an' => 2,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 32,
                'id_don_hang' => 31,
                'id_khach_hang' => 1,
                'id_mon_an' => 2, // Cafe Máy
                'id_quan_an' => 2,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 33,
                'id_don_hang' => 31,
                'id_khach_hang' => 1,
                'id_mon_an' => 3, // Cafe Sữa
                'id_quan_an' => 2,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            // Đơn hàng 32
            [
                'id' => 34,
                'id_don_hang' => 32,
                'id_khach_hang' => 2,
                'id_mon_an' => 9, // Lục Trà Chanh
                'id_quan_an' => 3,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 35,
                'id_don_hang' => 32,
                'id_khach_hang' => 2,
                'id_mon_an' => 10, // Lục Trà Xoài
                'id_quan_an' => 3,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],
            // Đơn hàng 33
            [
                'id' => 36,
                'id_don_hang' => 33,
                'id_khach_hang' => 3,
                'id_mon_an' => 13, // Phin Sữa Đá
                'id_quan_an' => 4,
                'so_luong' => 2,
                'don_gia' => 25000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 37,
                'id_don_hang' => 33,
                'id_khach_hang' => 3,
                'id_mon_an' => 14, // Phin Đen Đá
                'id_quan_an' => 4,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            // Đơn hàng 34
            [
                'id' => 38,
                'id_don_hang' => 34,
                'id_khach_hang' => 4,
                'id_mon_an' => 19, // Cơm Tấm Sườn
                'id_quan_an' => 5,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],
            [
                'id' => 39,
                'id_don_hang' => 34,
                'id_khach_hang' => 4,
                'id_mon_an' => 20, // Cơm Tấm Sườn Nướng
                'id_quan_an' => 5,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            // Đơn hàng 35
            [
                'id' => 40,
                'id_don_hang' => 35,
                'id_khach_hang' => 5,
                'id_mon_an' => 22, // Cơm Chiên Dương Châu
                'id_quan_an' => 6,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            [
                'id' => 41,
                'id_don_hang' => 35,
                'id_khach_hang' => 5,
                'id_mon_an' => 23, // Cơm Đùi Gà Quay
                'id_quan_an' => 6,
                'so_luong' => 1,
                'don_gia' => 50000,
                'thanh_tien' => 50000,
            ],
            // Đơn hàng 36
            [
                'id' => 42,
                'id_don_hang' => 36,
                'id_khach_hang' => 6,
                'id_mon_an' => 25, // Cơm Chiên Trứng
                'id_quan_an' => 7,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],
            [
                'id' => 43,
                'id_don_hang' => 36,
                'id_khach_hang' => 6,
                'id_mon_an' => 26, // Cơm Chiên Heo Quay
                'id_quan_an' => 7,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            // Đơn hàng 37
            [
                'id' => 44,
                'id_don_hang' => 37,
                'id_khach_hang' => 7,
                'id_mon_an' => 27, // Cơm Cá Kho
                'id_quan_an' => 8,
                'so_luong' => 3,
                'don_gia' => 35000,
                'thanh_tien' => 105000,
            ],
            // Đơn hàng 38
            [
                'id' => 45,
                'id_don_hang' => 38,
                'id_khach_hang' => 1,
                'id_mon_an' => 30, // Xôi Chiên Thịt Băm
                'id_quan_an' => 9,
                'so_luong' => 2,
                'don_gia' => 20000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 46,
                'id_don_hang' => 38,
                'id_khach_hang' => 1,
                'id_mon_an' => 31, // Xôi Chiên Thịt Xíu
                'id_quan_an' => 9,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            // Đơn hàng 39
            [
                'id' => 47,
                'id_don_hang' => 39,
                'id_khach_hang' => 2,
                'id_mon_an' => 39, // Bún Thập Cẩm
                'id_quan_an' => 10,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 48,
                'id_don_hang' => 39,
                'id_khach_hang' => 2,
                'id_mon_an' => 40, // Bún Mắm
                'id_quan_an' => 10,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],
            // Đơn hàng 40
            [
                'id' => 49,
                'id_don_hang' => 40,
                'id_khach_hang' => 3,
                'id_mon_an' => 41, // Nước Ép Cà Rốt
                'id_quan_an' => 11,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],
            [
                'id' => 50,
                'id_don_hang' => 40,
                'id_khach_hang' => 3,
                'id_mon_an' => 42, // Nước Dừa
                'id_quan_an' => 11,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 51,
                'id_don_hang' => 41,
                'id_khach_hang' => 4,
                'id_mon_an' => 53, // Cơm Chay
                'id_quan_an' => 13,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],
            [
                'id' => 52,
                'id_don_hang' => 41,
                'id_khach_hang' => 4,
                'id_mon_an' => 54, // Bánh Canh Chay
                'id_quan_an' => 13,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            // Đơn hàng 42
            [
                'id' => 53,
                'id_don_hang' => 42,
                'id_khach_hang' => 5,
                'id_mon_an' => 56, // Cà Ri Chay
                'id_quan_an' => 14,
                'so_luong' => 1,
                'don_gia' => 50000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 54,
                'id_don_hang' => 42,
                'id_khach_hang' => 5,
                'id_mon_an' => 57, // Bánh Kem
                'id_quan_an' => 14,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            // Đơn hàng 43
            [
                'id' => 55,
                'id_don_hang' => 43,
                'id_khach_hang' => 6,
                'id_mon_an' => 60, // Đen Đá
                'id_quan_an' => 15,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],
            [
                'id' => 56,
                'id_don_hang' => 43,
                'id_khach_hang' => 6,
                'id_mon_an' => 61, // Bánh Mì Heo Quay
                'id_quan_an' => 15,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            // Đơn hàng 44
            [
                'id' => 57,
                'id_don_hang' => 44,
                'id_khach_hang' => 7,
                'id_mon_an' => 64, // Nước Dừa
                'id_quan_an' => 16,
                'so_luong' => 3,
                'don_gia' => 30000,
                'thanh_tien' => 90000,
            ],
            // Đơn hàng 45
            [
                'id' => 58,
                'id_don_hang' => 45,
                'id_khach_hang' => 1,
                'id_mon_an' => 70, // Chè Thái
                'id_quan_an' => 17,
                'so_luong' => 2,
                'don_gia' => 50000,
                'thanh_tien' => 100000,
            ],
            // Đơn hàng 46
            [
                'id' => 59,
                'id_don_hang' => 46,
                'id_khach_hang' => 2,
                'id_mon_an' => 75, // Sườn Bì Chả
                'id_quan_an' => 18,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 60,
                'id_don_hang' => 46,
                'id_khach_hang' => 2,
                'id_mon_an' => 76, // Sườn Bì
                'id_quan_an' => 18,
                'so_luong' => 2,
                'don_gia' => 25000,
                'thanh_tien' => 50000,
            ],
            // Đơn hàng 47
            [
                'id' => 61,
                'id_don_hang' => 47,
                'id_khach_hang' => 3,
                'id_mon_an' => 78, // Súp Cua
                'id_quan_an' => 19,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],
            [
                'id' => 62,
                'id_don_hang' => 47,
                'id_khach_hang' => 3,
                'id_mon_an' => 79, // Súp Bột Báng
                'id_quan_an' => 19,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            // Đơn hàng 48
            [
                'id' => 63,
                'id_don_hang' => 48,
                'id_khach_hang' => 4,
                'id_mon_an' => 81, // Cháo Lòng
                'id_quan_an' => 20,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            [
                'id' => 64,
                'id_don_hang' => 48,
                'id_khach_hang' => 4,
                'id_mon_an' => 82, // Lòng Trộn
                'id_quan_an' => 20,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            // Đơn hàng 49
            [
                'id' => 65,
                'id_don_hang' => 49,
                'id_khach_hang' => 5,
                'id_mon_an' => 1, // Cafe Dừa
                'id_quan_an' => 1,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 66,
                'id_don_hang' => 49,
                'id_khach_hang' => 5,
                'id_mon_an' => 2, // Cafe Máy
                'id_quan_an' => 1,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 67,
                'id_don_hang' => 49,
                'id_khach_hang' => 5,
                'id_mon_an' => 3, // Cafe Sữa
                'id_quan_an' => 1,
                'so_luong' => 1,
                'don_gia' => 50000,
                'thanh_tien' => 50000,
            ],
            // Đơn hàng 50
            [
                'id' => 68,
                'id_don_hang' => 50,
                'id_khach_hang' => 6,
                'id_mon_an' => 5, // Nước Chanh
                'id_quan_an' => 2,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],
            [
                'id' => 69,
                'id_don_hang' => 50,
                'id_khach_hang' => 6,
                'id_mon_an' => 6, // Nước Cam Ép
                'id_quan_an' => 2,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 70,
                'id_don_hang' => 51,
                'id_khach_hang' => 7,
                'id_mon_an' => 9, // Lục Trà Chanh
                'id_quan_an' => 3,
                'so_luong' => 2,
                'don_gia' => 25000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 71,
                'id_don_hang' => 51,
                'id_khach_hang' => 7,
                'id_mon_an' => 10, // Lục Trà Xoài
                'id_quan_an' => 3,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            // Đơn hàng 52
            [
                'id' => 72,
                'id_don_hang' => 52,
                'id_khach_hang' => 1,
                'id_mon_an' => 13, // Phin Sữa Đá
                'id_quan_an' => 4,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 73,
                'id_don_hang' => 52,
                'id_khach_hang' => 1,
                'id_mon_an' => 14, // Phin Đen Đá
                'id_quan_an' => 4,
                'so_luong' => 1,
                'don_gia' => 35000,
                'thanh_tien' => 35000,
            ],
            // Đơn hàng 53
            [
                'id' => 74,
                'id_don_hang' => 53,
                'id_khach_hang' => 2,
                'id_mon_an' => 19, // Cơm Tấm Sườn
                'id_quan_an' => 5,
                'so_luong' => 2,
                'don_gia' => 40000,
                'thanh_tien' => 80000,
            ],
            // Đơn hàng 54
            [
                'id' => 75,
                'id_don_hang' => 54,
                'id_khach_hang' => 3,
                'id_mon_an' => 23, // Cơm Đùi Gà Quay
                'id_quan_an' => 6,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            [
                'id' => 76,
                'id_don_hang' => 54,
                'id_khach_hang' => 3,
                'id_mon_an' => 24, // Cơm Cánh Gà Quay
                'id_quan_an' => 6,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            // Đơn hàng 55
            [
                'id' => 77,
                'id_don_hang' => 55,
                'id_khach_hang' => 4,
                'id_mon_an' => 27, // Cơm Cá Kho
                'id_quan_an' => 7,
                'so_luong' => 2,
                'don_gia' => 45000,
                'thanh_tien' => 90000,
            ],
            // Đơn hàng 56
            [
                'id' => 78,
                'id_don_hang' => 56,
                'id_khach_hang' => 5,
                'id_mon_an' => 30, // Xôi Chiên Thịt Băm
                'id_quan_an' => 8,
                'so_luong' => 2,
                'don_gia' => 25000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 79,
                'id_don_hang' => 56,
                'id_khach_hang' => 5,
                'id_mon_an' => 31, // Xôi Chiên Thịt Xíu
                'id_quan_an' => 8,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            // Đơn hàng 57
            [
                'id' => 80,
                'id_don_hang' => 57,
                'id_khach_hang' => 6,
                'id_mon_an' => 39, // Bún Thập Cẩm
                'id_quan_an' => 9,
                'so_luong' => 2,
                'don_gia' => 40000,
                'thanh_tien' => 80000,
            ],
            // Đơn hàng 58
            [
                'id' => 81,
                'id_don_hang' => 58,
                'id_khach_hang' => 7,
                'id_mon_an' => 41, // Nước Ép Cà Rốt
                'id_quan_an' => 10,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],
            [
                'id' => 82,
                'id_don_hang' => 58,
                'id_khach_hang' => 7,
                'id_mon_an' => 42, // Nước Dừa
                'id_quan_an' => 10,
                'so_luong' => 1,
                'don_gia' => 15000,
                'thanh_tien' => 15000,
            ],
            // Đơn hàng 59
            [
                'id' => 83,
                'id_don_hang' => 59,
                'id_khach_hang' => 1,
                'id_mon_an' => 45, // Trà Sữa Trân Châu Đường Đen
                'id_quan_an' => 11,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            [
                'id' => 84,
                'id_don_hang' => 59,
                'id_khach_hang' => 1,
                'id_mon_an' => 46, // Trà Sữa Truyền Thống
                'id_quan_an' => 11,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            // Đơn hàng 60
            [
                'id' => 85,
                'id_don_hang' => 60,
                'id_khach_hang' => 2,
                'id_mon_an' => 50, // Trà Chanh Nhãn
                'id_quan_an' => 12,
                'so_luong' => 3,
                'don_gia' => 30000,
                'thanh_tien' => 90000,
            ],
            [
                'id' => 86,
                'id_don_hang' => 61,
                'id_khach_hang' => 3,
                'id_mon_an' => 55, // Mì Quảng Chay
                'id_quan_an' => 13,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 87,
                'id_don_hang' => 61,
                'id_khach_hang' => 3,
                'id_mon_an' => 56, // Cà Ri Chay
                'id_quan_an' => 13,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 88,
                'id_don_hang' => 61,
                'id_khach_hang' => 3,
                'id_mon_an' => 57, // Bánh Kem
                'id_quan_an' => 13,
                'so_luong' => 1,
                'don_gia' => 33000,
                'thanh_tien' => 33000,
            ],
            // Đơn hàng 62
            [
                'id' => 89,
                'id_don_hang' => 62,
                'id_khach_hang' => 4,
                'id_mon_an' => 60, // Đen Đá
                'id_quan_an' => 14,
                'so_luong' => 2,
                'don_gia' => 35000,
                'thanh_tien' => 70000,
            ],
            [
                'id' => 90,
                'id_don_hang' => 62,
                'id_khach_hang' => 4,
                'id_mon_an' => 61, // Bánh Mì Heo Quay
                'id_quan_an' => 14,
                'so_luong' => 1,
                'don_gia' => 5000,
                'thanh_tien' => 5000,
            ],
            // Đơn hàng 63
            [
                'id' => 91,
                'id_don_hang' => 63,
                'id_khach_hang' => 5,
                'id_mon_an' => 64, // Nước Dừa
                'id_quan_an' => 15,
                'so_luong' => 3,
                'don_gia' => 30000,
                'thanh_tien' => 90000,
            ],
            [
                'id' => 92,
                'id_don_hang' => 63,
                'id_khach_hang' => 5,
                'id_mon_an' => 65, // Nước Dừa Trân châu
                'id_quan_an' => 15,
                'so_luong' => 1,
                'don_gia' => 4000,
                'thanh_tien' => 4000,
            ],
            // Đơn hàng 64
            [
                'id' => 93,
                'id_don_hang' => 64,
                'id_khach_hang' => 6,
                'id_mon_an' => 70, // Chè Thái
                'id_quan_an' => 16,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],
            [
                'id' => 94,
                'id_don_hang' => 64,
                'id_khach_hang' => 6,
                'id_mon_an' => 71, // Chè Thái Sầu
                'id_quan_an' => 16,
                'so_luong' => 1,
                'don_gia' => 21000,
                'thanh_tien' => 21000,
            ],
            // Đơn hàng 65
            [
                'id' => 95,
                'id_don_hang' => 65,
                'id_khach_hang' => 7,
                'id_mon_an' => 75, // Sườn Bì Chả
                'id_quan_an' => 17,
                'so_luong' => 3,
                'don_gia' => 28000,
                'thanh_tien' => 84000,
            ],
            [
                'id' => 96,
                'id_don_hang' => 65,
                'id_khach_hang' => 7,
                'id_mon_an' => 76, // Sườn Bì
                'id_quan_an' => 17,
                'so_luong' => 1,
                'don_gia' => 1000,
                'thanh_tien' => 1000,
            ],
            // Đơn hàng 66
            [
                'id' => 97,
                'id_don_hang' => 66,
                'id_khach_hang' => 1,
                'id_mon_an' => 78, // Súp Cua
                'id_quan_an' => 18,
                'so_luong' => 2,
                'don_gia' => 39000,
                'thanh_tien' => 78000,
            ],
            [
                'id' => 98,
                'id_don_hang' => 66,
                'id_khach_hang' => 1,
                'id_mon_an' => 79, // Súp Bột Báng
                'id_quan_an' => 18,
                'so_luong' => 1,
                'don_gia' => 2000,
                'thanh_tien' => 2000,
            ],
            // Đơn hàng 67
            [
                'id' => 99,
                'id_don_hang' => 67,
                'id_khach_hang' => 2,
                'id_mon_an' => 81, // Cháo Lòng
                'id_quan_an' => 19,
                'so_luong' => 3,
                'don_gia' => 30000,
                'thanh_tien' => 90000,
            ],
            [
                'id' => 100,
                'id_don_hang' => 67,
                'id_khach_hang' => 2,
                'id_mon_an' => 82, // Lòng Trộn
                'id_quan_an' => 19,
                'so_luong' => 1,
                'don_gia' => 2000,
                'thanh_tien' => 2000,
            ],
            // Đơn hàng 68
            [
                'id' => 101,
                'id_don_hang' => 68,
                'id_khach_hang' => 3,
                'id_mon_an' => 1, // Cafe Dừa
                'id_quan_an' => 20,
                'so_luong' => 2,
                'don_gia' => 25000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 102,
                'id_don_hang' => 68,
                'id_khach_hang' => 3,
                'id_mon_an' => 2, // Cafe Máy
                'id_quan_an' => 20,
                'so_luong' => 1,
                'don_gia' => 38000,
                'thanh_tien' => 38000,
            ],
            // Đơn hàng 69
            [
                'id' => 103,
                'id_don_hang' => 69,
                'id_khach_hang' => 4,
                'id_mon_an' => 5, // Nước Chanh
                'id_quan_an' => 1,
                'so_luong' => 3,
                'don_gia' => 31000,
                'thanh_tien' => 93000,
            ],
            // Đơn hàng 70
            [
                'id' => 104,
                'id_don_hang' => 70,
                'id_khach_hang' => 5,
                'id_mon_an' => 9, // Lục Trà Chanh
                'id_quan_an' => 2,
                'so_luong' => 2,
                'don_gia' => 27000,
                'thanh_tien' => 54000,
            ],
            [
                'id' => 105,
                'id_don_hang' => 70,
                'id_khach_hang' => 5,
                'id_mon_an' => 10, // Lục Trà Xoài
                'id_quan_an' => 2,
                'so_luong' => 1,
                'don_gia' => 43000,
                'thanh_tien' => 43000,
            ],
            [
                'id' => 106,
                'id_don_hang' => 71,
                'id_khach_hang' => 6,
                'id_mon_an' => 85, // Bún Bò Huế
                'id_quan_an' => 21,
                'so_luong' => 1,
                'don_gia' => 35000,
                'thanh_tien' => 35000,
            ],
            [
                'id' => 107,
                'id_don_hang' => 71,
                'id_khach_hang' => 6,
                'id_mon_an' => 86, // Bún Bò Nam
                'id_quan_an' => 21,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 108,
                'id_don_hang' => 71,
                'id_khach_hang' => 6,
                'id_mon_an' => 87, // Bún Bò Xào
                'id_quan_an' => 21,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 109,
                'id_don_hang' => 72,
                'id_khach_hang' => 7,
                'id_mon_an' => 88, // Phở Bò
                'id_quan_an' => 22,
                'so_luong' => 1,
                'don_gia' => 35000,
                'thanh_tien' => 35000,
            ],
            [
                'id' => 110,
                'id_don_hang' => 72,
                'id_khach_hang' => 7,
                'id_mon_an' => 89, // Phở Gà
                'id_quan_an' => 22,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 111,
                'id_don_hang' => 73,
                'id_khach_hang' => 1,
                'id_mon_an' => 90, // Bún Chả
                'id_quan_an' => 23,
                'so_luong' => 1,
                'don_gia' => 35000,
                'thanh_tien' => 35000,
            ],
            [
                'id' => 112,
                'id_don_hang' => 73,
                'id_khach_hang' => 1,
                'id_mon_an' => 91, // Bún Chả Cá
                'id_quan_an' => 23,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 113,
                'id_don_hang' => 74,
                'id_khach_hang' => 2,
                'id_mon_an' => 92, // Bánh Mì Thịt Nướng
                'id_quan_an' => 24,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 114,
                'id_don_hang' => 74,
                'id_khach_hang' => 2,
                'id_mon_an' => 93, // Bánh Mì Pate
                'id_quan_an' => 24,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 115,
                'id_don_hang' => 75,
                'id_khach_hang' => 3,
                'id_mon_an' => 94, // Bánh Mì Thịt Nguội
                'id_quan_an' => 25,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 116,
                'id_don_hang' => 75,
                'id_khach_hang' => 3,
                'id_mon_an' => 95, // Bánh Mì Chả Lụa
                'id_quan_an' => 25,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 117,
                'id_don_hang' => 76,
                'id_khach_hang' => 4,
                'id_mon_an' => 96, // Bánh Mì Thịt Quay
                'id_quan_an' => 26,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 118,
                'id_don_hang' => 76,
                'id_khach_hang' => 4,
                'id_mon_an' => 97, // Bánh Mì Xíu Mại
                'id_quan_an' => 26,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 119,
                'id_don_hang' => 77,
                'id_khach_hang' => 5,
                'id_mon_an' => 98, // Bánh Cuốn Thịt
                'id_quan_an' => 27,
                'so_luong' => 1,
                'don_gia' => 25000,
                'thanh_tien' => 25000,
            ],
            [
                'id' => 120,
                'id_don_hang' => 77,
                'id_khach_hang' => 5,
                'id_mon_an' => 99, // Bánh Cuốn Tôm
                'id_quan_an' => 27,
                'so_luong' => 1,
                'don_gia' => 10000,
                'thanh_tien' => 10000,
            ],
            [
                'id' => 121,
                'id_don_hang' => 78,
                'id_khach_hang' => 6,
                'id_mon_an' => 100, // Bánh Cuốn Thịt Băm
                'id_quan_an' => 28,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 122,
                'id_don_hang' => 78,
                'id_khach_hang' => 6,
                'id_mon_an' => 101, // Bánh Cuốn Thịt Xíu
                'id_quan_an' => 28,
                'so_luong' => 1,
                'don_gia' => 22000,
                'thanh_tien' => 22000,
            ],
            [
                'id' => 123,
                'id_don_hang' => 79,
                'id_khach_hang' => 7,
                'id_mon_an' => 102, // Bánh Cuốn Thịt Nướng
                'id_quan_an' => 29,
                'so_luong' => 1,
                'don_gia' => 35000,
                'thanh_tien' => 35000,
            ],
            [
                'id' => 124,
                'id_don_hang' => 79,
                'id_khach_hang' => 7,
                'id_mon_an' => 103, // Bánh Cuốn Thịt Quay
                'id_quan_an' => 29,
                'so_luong' => 1,
                'don_gia' => 10000,
                'thanh_tien' => 10000,
            ],
            [
                'id' => 125,
                'id_don_hang' => 80,
                'id_khach_hang' => 1,
                'id_mon_an' => 104, // Bánh Cuốn Thịt Bò
                'id_quan_an' => 30,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 126,
                'id_don_hang' => 80,
                'id_khach_hang' => 1,
                'id_mon_an' => 105, // Bánh Cuốn Thịt Heo
                'id_quan_an' => 30,
                'so_luong' => 1,
                'don_gia' => 22000,
                'thanh_tien' => 22000,
            ],
            [
                'id' => 127,
                'id_don_hang' => 81,
                'id_khach_hang' => 2,
                'id_mon_an' => 106, // Bánh Cuốn Thịt Gà
                'id_quan_an' => 31,
                'so_luong' => 1,
                'don_gia' => 35000,
                'thanh_tien' => 35000,
            ],
            [
                'id' => 128,
                'id_don_hang' => 81,
                'id_khach_hang' => 2,
                'id_mon_an' => 107, // Bánh Cuốn Thịt Vịt
                'id_quan_an' => 31,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 129,
                'id_don_hang' => 82,
                'id_khach_hang' => 3,
                'id_mon_an' => 108, // Bánh Cuốn Thịt Cá
                'id_quan_an' => 32,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 130,
                'id_don_hang' => 82,
                'id_khach_hang' => 3,
                'id_mon_an' => 109, // Bánh Cuốn Thịt Tôm
                'id_quan_an' => 32,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 131,
                'id_don_hang' => 83,
                'id_khach_hang' => 4,
                'id_mon_an' => 110, // Bánh Cuốn Thịt Cua
                'id_quan_an' => 33,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            [
                'id' => 132,
                'id_don_hang' => 83,
                'id_khach_hang' => 4,
                'id_mon_an' => 111, // Bánh Cuốn Thịt Ếch
                'id_quan_an' => 33,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 133,
                'id_don_hang' => 84,
                'id_khach_hang' => 5,
                'id_mon_an' => 112, // Bánh Cuốn Thịt Dê
                'id_quan_an' => 34,
                'so_luong' => 1,
                'don_gia' => 50000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 134,
                'id_don_hang' => 84,
                'id_khach_hang' => 5,
                'id_mon_an' => 113, // Bánh Cuốn Thịt Bò
                'id_quan_an' => 34,
                'so_luong' => 1,
                'don_gia' => 20000,
                'thanh_tien' => 20000,
            ],
            [
                'id' => 135,
                'id_don_hang' => 85,
                'id_khach_hang' => 6,
                'id_mon_an' => 114, // Bánh Cuốn Thịt Heo
                'id_quan_an' => 35,
                'so_luong' => 1,
                'don_gia' => 45000,
                'thanh_tien' => 45000,
            ],
            [
                'id' => 136,
                'id_don_hang' => 85,
                'id_khach_hang' => 6,
                'id_mon_an' => 115, // Bánh Cuốn Thịt Gà
                'id_quan_an' => 35,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 137,
                'id_don_hang' => 86,
                'id_khach_hang' => 7,
                'id_mon_an' => 116, // Bánh Cuốn Thịt Vịt
                'id_quan_an' => 36,
                'so_luong' => 1,
                'don_gia' => 50000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 138,
                'id_don_hang' => 86,
                'id_khach_hang' => 7,
                'id_mon_an' => 117, // Bánh Cuốn Thịt Cá
                'id_quan_an' => 36,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 139,
                'id_don_hang' => 87,
                'id_khach_hang' => 1,
                'id_mon_an' => 118, // Bánh Cuốn Thịt Tôm
                'id_quan_an' => 37,
                'so_luong' => 1,
                'don_gia' => 55000,
                'thanh_tien' => 55000,
            ],
            [
                'id' => 140,
                'id_don_hang' => 87,
                'id_khach_hang' => 1,
                'id_mon_an' => 119, // Bánh Cuốn Thịt Cua
                'id_quan_an' => 37,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 141,
                'id_don_hang' => 88,
                'id_khach_hang' => 2,
                'id_mon_an' => 120, // Bánh Cuốn Thịt Ếch
                'id_quan_an' => 38,
                'so_luong' => 1,
                'don_gia' => 60000,
                'thanh_tien' => 60000,
            ],
            [
                'id' => 142,
                'id_don_hang' => 88,
                'id_khach_hang' => 2,
                'id_mon_an' => 121, // Bánh Cuốn Thịt Dê
                'id_quan_an' => 38,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 143,
                'id_don_hang' => 89,
                'id_khach_hang' => 3,
                'id_mon_an' => 122, // Bánh Cuốn Thịt Bò
                'id_quan_an' => 39,
                'so_luong' => 1,
                'don_gia' => 65000,
                'thanh_tien' => 65000,
            ],
            [
                'id' => 144,
                'id_don_hang' => 89,
                'id_khach_hang' => 3,
                'id_mon_an' => 123, // Bánh Cuốn Thịt Heo
                'id_quan_an' => 39,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 145,
                'id_don_hang' => 90,
                'id_khach_hang' => 4,
                'id_mon_an' => 124, // Bánh Cuốn Thịt Gà
                'id_quan_an' => 40,
                'so_luong' => 1,
                'don_gia' => 70000,
                'thanh_tien' => 70000,
            ],
            [
                'id' => 146,
                'id_don_hang' => 90,
                'id_khach_hang' => 4,
                'id_mon_an' => 125, // Bánh Cuốn Thịt Vịt
                'id_quan_an' => 40,
                'so_luong' => 1,
                'don_gia' => 42000,
                'thanh_tien' => 42000,
            ],
            [
                'id' => 147,
                'id_don_hang' => 91,
                'id_khach_hang' => 5,
                'id_mon_an' => 126, // Bánh Cuốn Thịt Cá
                'id_quan_an' => 41,
                'so_luong' => 1,
                'don_gia' => 75000,
                'thanh_tien' => 75000,
            ],
            [
                'id' => 148,
                'id_don_hang' => 91,
                'id_khach_hang' => 5,
                'id_mon_an' => 127, // Bánh Cuốn Thịt Tôm
                'id_quan_an' => 41,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 149,
                'id_don_hang' => 92,
                'id_khach_hang' => 6,
                'id_mon_an' => 128, // Bánh Cuốn Thịt Cua
                'id_quan_an' => 42,
                'so_luong' => 1,
                'don_gia' => 80000,
                'thanh_tien' => 80000,
            ],
            [
                'id' => 150,
                'id_don_hang' => 92,
                'id_khach_hang' => 6,
                'id_mon_an' => 129, // Bánh Cuốn Thịt Ếch
                'id_quan_an' => 42,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 151,
                'id_don_hang' => 93,
                'id_khach_hang' => 7,
                'id_mon_an' => 130, // Bánh Cuốn Thịt Dê
                'id_quan_an' => 43,
                'so_luong' => 1,
                'don_gia' => 85000,
                'thanh_tien' => 85000,
            ],
            [
                'id' => 152,
                'id_don_hang' => 93,
                'id_khach_hang' => 7,
                'id_mon_an' => 131, // Bánh Cuốn Thịt Bò
                'id_quan_an' => 43,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],
            [
                'id' => 153,
                'id_don_hang' => 94,
                'id_khach_hang' => 1,
                'id_mon_an' => 132, // Bánh Cuốn Thịt Heo
                'id_quan_an' => 44,
                'so_luong' => 1,
                'don_gia' => 90000,
                'thanh_tien' => 90000,
            ],
            [
                'id' => 154,
                'id_don_hang' => 94,
                'id_khach_hang' => 1,
                'id_mon_an' => 133, // Bánh Cuốn Thịt Gà
                'id_quan_an' => 44,
                'so_luong' => 1,
                'don_gia' => 42000,
                'thanh_tien' => 42000,
            ],
            [
                'id' => 155,
                'id_don_hang' => 95,
                'id_khach_hang' => 2,
                'id_mon_an' => 134, // Bánh Cuốn Thịt Vịt
                'id_quan_an' => 45,
                'so_luong' => 1,
                'don_gia' => 95000,
                'thanh_tien' => 95000,
            ],
            [
                'id' => 156,
                'id_don_hang' => 95,
                'id_khach_hang' => 2,
                'id_mon_an' => 135, // Bánh Cuốn Thịt Cá
                'id_quan_an' => 45,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 157,
                'id_don_hang' => 96,
                'id_khach_hang' => 3,
                'id_mon_an' => 136, // Bánh Cuốn Thịt Tôm
                'id_quan_an' => 46,
                'so_luong' => 1,
                'don_gia' => 100000,
                'thanh_tien' => 100000,
            ],
            [
                'id' => 158,
                'id_don_hang' => 96,
                'id_khach_hang' => 3,
                'id_mon_an' => 137, // Bánh Cuốn Thịt Cua
                'id_quan_an' => 46,
                'so_luong' => 1,
                'don_gia' => 42000,
                'thanh_tien' => 42000,
            ],
            [
                'id' => 159,
                'id_don_hang' => 97,
                'id_khach_hang' => 4,
                'id_mon_an' => 138, // Bánh Cuốn Thịt Ếch
                'id_quan_an' => 47,
                'so_luong' => 1,
                'don_gia' => 105000,
                'thanh_tien' => 105000,
            ],
            [
                'id' => 160,
                'id_don_hang' => 97,
                'id_khach_hang' => 4,
                'id_mon_an' => 139, // Bánh Cuốn Thịt Dê
                'id_quan_an' => 47,
                'so_luong' => 1,
                'don_gia' => 42000,
                'thanh_tien' => 42000,
            ],
            [
                'id' => 161,
                'id_don_hang' => 98,
                'id_khach_hang' => 5,
                'id_mon_an' => 140, // Bánh Cuốn Thịt Bò
                'id_quan_an' => 48,
                'so_luong' => 1,
                'don_gia' => 110000,
                'thanh_tien' => 110000,
            ],
            [
                'id' => 162,
                'id_don_hang' => 98,
                'id_khach_hang' => 5,
                'id_mon_an' => 141, // Bánh Cuốn Thịt Heo
                'id_quan_an' => 48,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 163,
                'id_don_hang' => 99,
                'id_khach_hang' => 6,
                'id_mon_an' => 142, // Bánh Cuốn Thịt Gà
                'id_quan_an' => 49,
                'so_luong' => 1,
                'don_gia' => 115000,
                'thanh_tien' => 115000,
            ],
            [
                'id' => 164,
                'id_don_hang' => 99,
                'id_khach_hang' => 6,
                'id_mon_an' => 143, // Bánh Cuốn Thịt Vịt
                'id_quan_an' => 49,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 165,
                'id_don_hang' => 100,
                'id_khach_hang' => 7,
                'id_mon_an' => 144, // Bánh Cuốn Thịt Cá
                'id_quan_an' => 50,
                'so_luong' => 1,
                'don_gia' => 120000,
                'thanh_tien' => 120000,
            ],
            [
                'id' => 166,
                'id_don_hang' => 100,
                'id_khach_hang' => 7,
                'id_mon_an' => 145, // Bánh Cuốn Thịt Tôm
                'id_quan_an' => 50,
                'so_luong' => 1,
                'don_gia' => 42000,
                'thanh_tien' => 42000,
            ],
            [
                'id' => 167,
                'id_don_hang' => 101,
                'id_khach_hang' => 1,
                'id_mon_an' => 146, // Bánh Cuốn Thịt Cua
                'id_quan_an' => 21,
                'so_luong' => 1,
                'don_gia' => 125000,
                'thanh_tien' => 125000,
            ],
            [
                'id' => 168,
                'id_don_hang' => 101,
                'id_khach_hang' => 1,
                'id_mon_an' => 147, // Bánh Cuốn Thịt Ếch
                'id_quan_an' => 21,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 169,
                'id_don_hang' => 102,
                'id_khach_hang' => 2,
                'id_mon_an' => 148, // Bánh Cuốn Thịt Dê
                'id_quan_an' => 22,
                'so_luong' => 1,
                'don_gia' => 130000,
                'thanh_tien' => 130000,
            ],
            [
                'id' => 170,
                'id_don_hang' => 102,
                'id_khach_hang' => 2,
                'id_mon_an' => 149, // Bánh Cuốn Thịt Bò
                'id_quan_an' => 22,
                'so_luong' => 1,
                'don_gia' => 42000,
                'thanh_tien' => 42000,
            ],
            [
                'id' => 171,
                'id_don_hang' => 103,
                'id_khach_hang' => 3,
                'id_mon_an' => 150, // Bánh Cuốn Thịt Heo
                'id_quan_an' => 23,
                'so_luong' => 1,
                'don_gia' => 135000,
                'thanh_tien' => 135000,
            ],
            [
                'id' => 172,
                'id_don_hang' => 103,
                'id_khach_hang' => 3,
                'id_mon_an' => 151, // Bánh Cuốn Thịt Gà
                'id_quan_an' => 23,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 173,
                'id_don_hang' => 104,
                'id_khach_hang' => 4,
                'id_mon_an' => 152, // Bánh Cuốn Thịt Vịt
                'id_quan_an' => 24,
                'so_luong' => 1,
                'don_gia' => 140000,
                'thanh_tien' => 140000,
            ],
            [
                'id' => 174,
                'id_don_hang' => 104,
                'id_khach_hang' => 4,
                'id_mon_an' => 153, // Bánh Cuốn Thịt Cá
                'id_quan_an' => 24,
                'so_luong' => 1,
                'don_gia' => 42000,
                'thanh_tien' => 42000,
            ],
            [
                'id' => 175,
                'id_don_hang' => 105,
                'id_khach_hang' => 5,
                'id_mon_an' => 154, // Bánh Cuốn Thịt Tôm
                'id_quan_an' => 25,
                'so_luong' => 1,
                'don_gia' => 145000,
                'thanh_tien' => 145000,
            ],
            [
                'id' => 176,
                'id_don_hang' => 105,
                'id_khach_hang' => 5,
                'id_mon_an' => 155, // Bánh Cuốn Thịt Cua
                'id_quan_an' => 25,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 177,
                'id_don_hang' => 106,
                'id_khach_hang' => 6,
                'id_mon_an' => 156, // Bánh Cuốn Thịt Ếch
                'id_quan_an' => 26,
                'so_luong' => 1,
                'don_gia' => 150000,
                'thanh_tien' => 150000,
            ],
            [
                'id' => 178,
                'id_don_hang' => 106,
                'id_khach_hang' => 6,
                'id_mon_an' => 157, // Bánh Cuốn Thịt Dê
                'id_quan_an' => 26,
                'so_luong' => 1,
                'don_gia' => 42000,
                'thanh_tien' => 42000,
            ],
            [
                'id' => 179,
                'id_don_hang' => 107,
                'id_khach_hang' => 7,
                'id_mon_an' => 158, // Bánh Cuốn Thịt Bò
                'id_quan_an' => 27,
                'so_luong' => 1,
                'don_gia' => 155000,
                'thanh_tien' => 155000,
            ],
            [
                'id' => 180,
                'id_don_hang' => 107,
                'id_khach_hang' => 7,
                'id_mon_an' => 159, // Bánh Cuốn Thịt Heo
                'id_quan_an' => 27,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 181,
                'id_don_hang' => 108,
                'id_khach_hang' => 1,
                'id_mon_an' => 160, // Bánh Cuốn Thịt Gà
                'id_quan_an' => 28,
                'so_luong' => 1,
                'don_gia' => 160000,
                'thanh_tien' => 160000,
            ],
            [
                'id' => 182,
                'id_don_hang' => 108,
                'id_khach_hang' => 1,
                'id_mon_an' => 161, // Bánh Cuốn Thịt Vịt
                'id_quan_an' => 28,
                'so_luong' => 1,
                'don_gia' => 42000,
                'thanh_tien' => 42000,
            ],
            [
                'id' => 183,
                'id_don_hang' => 109,
                'id_khach_hang' => 2,
                'id_mon_an' => 162, // Bánh Cuốn Thịt Cá
                'id_quan_an' => 29,
                'so_luong' => 1,
                'don_gia' => 165000,
                'thanh_tien' => 165000,
            ],
            [
                'id' => 184,
                'id_don_hang' => 109,
                'id_khach_hang' => 2,
                'id_mon_an' => 163, // Bánh Cuốn Thịt Tôm
                'id_quan_an' => 29,
                'so_luong' => 1,
                'don_gia' => 42000,
                'thanh_tien' => 42000,
            ],
            [
                'id' => 185,
                'id_don_hang' => 110,
                'id_khach_hang' => 3,
                'id_mon_an' => 164, // Bánh Cuốn Thịt Cua
                'id_quan_an' => 30,
                'so_luong' => 1,
                'don_gia' => 170000,
                'thanh_tien' => 170000,
            ],
            [
                'id' => 186,
                'id_don_hang' => 110,
                'id_khach_hang' => 3,
                'id_mon_an' => 165, // Bánh Cuốn Thịt Ếch
                'id_quan_an' => 30,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            [
                'id' => 187,
                'id_don_hang' => 111,
                'id_khach_hang' => 4,
                'id_mon_an' => 166, // Bánh Cuốn Thịt Dê
                'id_quan_an' => 31,
                'so_luong' => 1,
                'don_gia' => 175000,
                'thanh_tien' => 175000,
            ],
            [
                'id' => 188,
                'id_don_hang' => 111,
                'id_khach_hang' => 4,
                'id_mon_an' => 167, // Bánh Cuốn Thịt Bò
                'id_quan_an' => 31,
                'so_luong' => 1,
                'don_gia' => 42000,
                'thanh_tien' => 42000,
            ],
            [
                'id' => 189,
                'id_don_hang' => 112,
                'id_khach_hang' => 5,
                'id_mon_an' => 168, // Bánh Cuốn Thịt Heo
                'id_quan_an' => 32,
                'so_luong' => 1,
                'don_gia' => 180000,
                'thanh_tien' => 180000,
            ],
            [
                'id' => 190,
                'id_don_hang' => 112,
                'id_khach_hang' => 5,
                'id_mon_an' => 169, // Bánh Cuốn Thịt Gà
                'id_quan_an' => 32,
                'so_luong' => 1,
                'don_gia' => 42000,
                'thanh_tien' => 42000,
            ],
            [
                'id' => 191,
                'id_don_hang' => 113,
                'id_khach_hang' => 6,
                'id_mon_an' => 170, // Bánh Cuốn Thịt Vịt
                'id_quan_an' => 33,
                'so_luong' => 1,
                'don_gia' => 185000,
                'thanh_tien' => 185000,
            ],
            [
                'id' => 192,
                'id_don_hang' => 113,
                'id_khach_hang' => 6,
                'id_mon_an' => 171, // Bánh Cuốn Thịt Cá
                'id_quan_an' => 33,
                'so_luong' => 1,
                'don_gia' => 32000,
                'thanh_tien' => 32000,
            ],
            [
                'id' => 193,
                'id_don_hang' => 114,
                'id_khach_hang' => 7,
                'id_mon_an' => 172, // Bánh Cuốn Thịt Tôm
                'id_quan_an' => 34,
                'so_luong' => 1,
                'don_gia' => 190000,
                'thanh_tien' => 190000,
            ],
            [
                'id' => 194,
                'id_don_hang' => 114,
                'id_khach_hang' => 7,
                'id_mon_an' => 173, // Bánh Cuốn Thịt Cua
                'id_quan_an' => 34,
                'so_luong' => 1,
                'don_gia' => 32000,
                'thanh_tien' => 32000,
            ],
            [
                'id' => 195,
                'id_don_hang' => 115,
                'id_khach_hang' => 1,
                'id_mon_an' => 174, // Bánh Cuốn Thịt Ếch
                'id_quan_an' => 35,
                'so_luong' => 1,
                'don_gia' => 195000,
                'thanh_tien' => 195000,
            ],
            [
                'id' => 196,
                'id_don_hang' => 115,
                'id_khach_hang' => 1,
                'id_mon_an' => 175, // Bánh Cuốn Thịt Dê
                'id_quan_an' => 35,
                'so_luong' => 1,
                'don_gia' => 40000,
                'thanh_tien' => 40000,
            ],
            // Thêm chi tiết đơn hàng mới từ ID 197
            [
                'id' => 197,
                'id_don_hang' => 116,
                'id_khach_hang' => 2,
                'id_mon_an' => 176, // Bánh Cuốn Thịt Bò
                'id_quan_an' => 36,
                'so_luong' => 2,
                'don_gia' => 45000,
                'thanh_tien' => 90000,
            ],
            [
                'id' => 198,
                'id_don_hang' => 116,
                'id_khach_hang' => 2,
                'id_mon_an' => 177, // Bánh Cuốn Thịt Heo
                'id_quan_an' => 36,
                'so_luong' => 1,
                'don_gia' => 50000,
                'thanh_tien' => 50000,
            ],
            [
                'id' => 199,
                'id_don_hang' => 117,
                'id_khach_hang' => 3,
                'id_mon_an' => 178, // Bánh Cuốn Thịt Gà
                'id_quan_an' => 37,
                'so_luong' => 1,
                'don_gia' => 48000,
                'thanh_tien' => 48000,
            ],
            [
                'id' => 200,
                'id_don_hang' => 117,
                'id_khach_hang' => 3,
                'id_mon_an' => 179, // Bánh Cuốn Thịt Vịt
                'id_quan_an' => 37,
                'so_luong' => 2,
                'don_gia' => 52000,
                'thanh_tien' => 104000,
            ],
            [
                'id' => 201,
                'id_don_hang' => 118,
                'id_khach_hang' => 4,
                'id_mon_an' => 180, // Bánh Cuốn Thịt Cá
                'id_quan_an' => 38,
                'so_luong' => 1,
                'don_gia' => 38000,
                'thanh_tien' => 38000,
            ],
            [
                'id' => 202,
                'id_don_hang' => 118,
                'id_khach_hang' => 4,
                'id_mon_an' => 181, // Bánh Cuốn Thịt Tôm
                'id_quan_an' => 38,
                'so_luong' => 1,
                'don_gia' => 55000,
                'thanh_tien' => 55000,
            ],
            [
                'id' => 203,
                'id_don_hang' => 119,
                'id_khach_hang' => 5,
                'id_mon_an' => 182, // Bánh Cuốn Thịt Cua
                'id_quan_an' => 39,
                'so_luong' => 2,
                'don_gia' => 42000,
                'thanh_tien' => 84000,
            ],
            [
                'id' => 204,
                'id_don_hang' => 119,
                'id_khach_hang' => 5,
                'id_mon_an' => 183, // Bánh Cuốn Thịt Ếch
                'id_quan_an' => 39,
                'so_luong' => 1,
                'don_gia' => 58000,
                'thanh_tien' => 58000,
            ],
            [
                'id' => 205,
                'id_don_hang' => 120,
                'id_khach_hang' => 6,
                'id_mon_an' => 184, // Bánh Cuốn Thịt Dê
                'id_quan_an' => 40,
                'so_luong' => 1,
                'don_gia' => 180000,
                'thanh_tien' => 180000,
            ],

            // THÊM CHI TIẾT CHO CÁC ĐƠN HÀNG BỊ THIẾU

            // Đơn hàng 9
            [
                'id' => 206,
                'id_don_hang' => 9,
                'id_khach_hang' => 2,
                'id_mon_an' => 39, // Bún Thập Cẩm
                'id_quan_an' => 10,
                'so_luong' => 1,
                'don_gia' => 30000,
                'thanh_tien' => 30000,
            ],

            // Đơn hàng 10
            [
                'id' => 207,
                'id_don_hang' => 10,
                'id_khach_hang' => 3,
                'id_mon_an' => 41, // Nước Ép Cà Rốt
                'id_quan_an' => 11,
                'so_luong' => 2,
                'don_gia' => 25000,
                'thanh_tien' => 50000,
            ],

            // Đơn hàng 27
            [
                'id' => 208,
                'id_don_hang' => 27,
                'id_khach_hang' => 7,
                'id_mon_an' => 30, // Xôi Chiên Thịt Băm
                'id_quan_an' => 9,
                'so_luong' => 3,
                'don_gia' => 30000,
                'thanh_tien' => 90000,
            ],

            // Đơn hàng 28
            [
                'id' => 209,
                'id_don_hang' => 28,
                'id_khach_hang' => 1,
                'id_mon_an' => 39, // Bún Thập Cẩm
                'id_quan_an' => 10,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],

            // Đơn hàng 29
            [
                'id' => 210,
                'id_don_hang' => 29,
                'id_khach_hang' => 2,
                'id_mon_an' => 41, // Nước Ép Cà Rốt
                'id_quan_an' => 11,
                'so_luong' => 2,
                'don_gia' => 30000,
                'thanh_tien' => 60000,
            ],

            // Đơn hàng 30
            [
                'id' => 211,
                'id_don_hang' => 30,
                'id_khach_hang' => 3,
                'id_mon_an' => 45, // Trà Sữa Trân Châu Đường Đen
                'id_quan_an' => 12,
                'so_luong' => 2,
                'don_gia' => 40000,
                'thanh_tien' => 80000,
            ],

            // Đơn hàng 103 - Bánh Mì Phượng
            [
                'id' => 212,
                'id_don_hang' => 103,
                'id_khach_hang' => 3,
                'id_mon_an' => 61, // Bánh Mì Heo Quay
                'id_quan_an' => 23,
                'so_luong' => 2,
                'don_gia' => 65000,
                'thanh_tien' => 130000,
            ],
            [
                'id' => 213,
                'id_don_hang' => 103,
                'id_khach_hang' => 3,
                'id_mon_an' => 62, // Bánh Mì Thịt  Nướng
                'id_quan_an' => 23,
                'so_luong' => 1,
                'don_gia' => 35000,
                'thanh_tien' => 35000,
            ],

            // Đơn hàng 104
            [
                'id' => 214,
                'id_don_hang' => 104,
                'id_khach_hang' => 4,
                'id_mon_an' => 61,
                'id_quan_an' => 24,
                'so_luong' => 2,
                'don_gia' => 85000,
                'thanh_tien' => 170000,
            ],

            // Đơn hàng 105
            [
                'id' => 215,
                'id_don_hang' => 105,
                'id_khach_hang' => 5,
                'id_mon_an' => 61,
                'id_quan_an' => 25,
                'so_luong' => 2,
                'don_gia' => 90000,
                'thanh_tien' => 180000,
            ],

            // Đơn hàng 106
            [
                'id' => 216,
                'id_don_hang' => 106,
                'id_khach_hang' => 6,
                'id_mon_an' => 70,
                'id_quan_an' => 26,
                'so_luong' => 2,
                'don_gia' => 95000,
                'thanh_tien' => 190000,
            ],

            // Đơn hàng 107
            [
                'id' => 217,
                'id_don_hang' => 107,
                'id_khach_hang' => 7,
                'id_mon_an' => 70,
                'id_quan_an' => 27,
                'so_luong' => 2,
                'don_gia' => 100000,
                'thanh_tien' => 200000,
            ],

            // Đơn hàng 108
            [
                'id' => 218,
                'id_don_hang' => 108,
                'id_khach_hang' => 1,
                'id_mon_an' => 70,
                'id_quan_an' => 28,
                'so_luong' => 2,
                'don_gia' => 80000,
                'thanh_tien' => 160000,
            ],

            // Đơn hàng 109
            [
                'id' => 219,
                'id_don_hang' => 109,
                'id_khach_hang' => 2,
                'id_mon_an' => 78,
                'id_quan_an' => 29,
                'so_luong' => 2,
                'don_gia' => 83000,
                'thanh_tien' => 166000,
            ],

            // Đơn hàng 110
            [
                'id' => 220,
                'id_don_hang' => 110,
                'id_khach_hang' => 3,
                'id_mon_an' => 78,
                'id_quan_an' => 30,
                'so_luong' => 2,
                'don_gia' => 88000,
                'thanh_tien' => 176000,
            ],

            // Đơn hàng 111
            [
                'id' => 221,
                'id_don_hang' => 111,
                'id_khach_hang' => 4,
                'id_mon_an' => 81,
                'id_quan_an' => 31,
                'so_luong' => 2,
                'don_gia' => 103000,
                'thanh_tien' => 206000,
            ],

            // Đơn hàng 112
            [
                'id' => 222,
                'id_don_hang' => 112,
                'id_khach_hang' => 5,
                'id_mon_an' => 81,
                'id_quan_an' => 32,
                'so_luong' => 2,
                'don_gia' => 105000,
                'thanh_tien' => 210000,
            ],
        ]);
        */
    }
}
