<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MonAnSizeSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('mon_an_sizes')->delete();

        $sizes = [];

        $monAns = DB::table('mon_ans')->get(['id', 'ten_mon_an', 'id_quan_an', 'gia_ban']);

        foreach ($monAns as $mon) {
            $loai = $this->phanLoaiMon($mon->ten_mon_an, $mon->id_quan_an);

            switch ($loai) {
                // ─── ĐỒ UỐNG: Cafe, Trà sữa, Trà, Nước ép, Sinh tố, Nước uống ───
                case 'do_uong':
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'S (nhỏ)', 'gia_cong_them' => 0];
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'M (vừa)', 'gia_cong_them' => 5000];
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'L (lớn)', 'gia_cong_them' => 10000];
                    break;

                // ─── BÚN / PHỞ / MÌ QUẢNG ───
                case 'bun_pho_mi':
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Nhỏ',  'gia_cong_them' => -5000];
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Vừa',  'gia_cong_them' => 0];
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Lớn',  'gia_cong_them' => 10000];
                    break;

                // ─── CƠM (cơm tấm, cơm gà, cơm chiên, cơm văn phòng) ───
                case 'com':
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Ít cơm',   'gia_cong_them' => -5000];
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Vừa',      'gia_cong_them' => 0];
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Nhiều cơm','gia_cong_them' => 5000];
                    break;

                // ─── BÁNH MÌ / BÁNH CUỐN / BÁNH TRUYỀN THỐNG ───
                case 'banh_co':
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Nhỏ', 'gia_cong_them' => 0];
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Vừa', 'gia_cong_them' => 5000];
                    break;

                // ─── BÁNH XÈO / ỐC / HẢI SẢN / LẨU / BÊ THUI ───
                case 'mon_nhom':
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Phần đơn', 'gia_cong_them' => 0];
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Phần đôi', 'gia_cong_them' => round($mon->gia_ban * 0.9 / 1000) * 1000];
                    break;

                // ─── CHÈ / XÔI ───
                case 'che_xoi':
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Nhỏ', 'gia_cong_them' => 0];
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Vừa', 'gia_cong_them' => 5000];
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Lớn', 'gia_cong_them' => 10000];
                    break;

                // ─── BÁNH KEM / CUPCAKE ───
                case 'banh_kem':
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Size 16cm', 'gia_cong_them' => 0];
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Size 20cm', 'gia_cong_them' => 80000];
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Size 24cm', 'gia_cong_them' => 150000];
                    break;

                // ─── COMBO / GIA ĐÌNH (mặc định vừa hoặc không size) ───
                default:
                    $sizes[] = ['id_mon_an' => $mon->id, 'ten_size' => 'Tiêu chuẩn', 'gia_cong_them' => 0];
                    break;
            }
        }

        // Chèn theo từng batch 200 bản ghi để tránh lỗi
        foreach (array_chunk($sizes, 200) as $chunk) {
            DB::table('mon_an_sizes')->insert($chunk);
        }

        $this->command->info('✅ MonAnSizeSeeder: Đã tạo ' . count($sizes) . ' size cho ' . count($monAns) . ' món ăn.');
    }

    /**
     * Phân loại món ăn dựa theo tên và id_quan_an.
     */
    private function phanLoaiMon(string $ten, int $idQuan): string
    {
        $ten = mb_strtolower($ten);

        // ── ĐỒ UỐNG ──────────────────────────────────────────────────────
        // Quán 1-5: Highlands Coffee, Trà Sữa, Nước Ép
        if (in_array($idQuan, [1, 2, 3, 4, 5])) {
            return 'do_uong';
        }

        // Nhận diện theo tên
        $keywordDoUong = ['cafe', 'cà phê', 'phin', 'bạc xỉu', 'trà sữa', 'trà ', 'freeze',
                          'nước ép', 'nước cam', 'nước dưa', 'nước mía', 'nước dừa',
                          'nước chanh', 'sinh tố', 'lục trà', 'matcha', 'socola đá xay',
                          'ô long'];
        foreach ($keywordDoUong as $kw) {
            if (str_contains($ten, $kw)) {
                return 'do_uong';
            }
        }

        // ── BÚN / PHỞ / MÌ ───────────────────────────────────────────────
        $keywordBunPhoMi = ['bún', 'phở', 'mì quảng', 'bánh canh'];
        foreach ($keywordBunPhoMi as $kw) {
            if (str_contains($ten, $kw)) {
                return 'bun_pho_mi';
            }
        }

        // ── CƠM ──────────────────────────────────────────────────────────
        if (str_contains($ten, 'cơm')) {
            return 'com';
        }

        // ── BÁNH KEM / CUPCAKE / TIRAMISU ────────────────────────────────
        if (in_array($idQuan, [40])) {
            return 'banh_kem';
        }
        $keywordBanhKem = ['bánh kem', 'cupcake', 'tiramisu'];
        foreach ($keywordBanhKem as $kw) {
            if (str_contains($ten, $kw)) {
                return 'banh_kem';
            }
        }

        // ── CHÈ / XÔI ────────────────────────────────────────────────────
        if (in_array($idQuan, [31, 35])) {
            return 'che_xoi';
        }
        $keywordCheXoi = ['chè', 'xôi'];
        foreach ($keywordCheXoi as $kw) {
            if (str_contains($ten, $kw)) {
                return 'che_xoi';
            }
        }

        // ── MÓN NHÓM: Hải sản, Lẩu, Ốc, Bánh xèo, Combo lớn ────────────
        $keywordNhom = ['lẩu', 'cua biển', 'bê thui', 'combo', 'gia đình', 'ốc hút',
                        'ốc len', 'sò ', 'nghêu', 'bánh xèo'];
        foreach ($keywordNhom as $kw) {
            if (str_contains($ten, $kw)) {
                return 'mon_nhom';
            }
        }

        // ── BÁNH MÌ / BÁNH CUỐN / BÁNH TRUYỀN THỐNG ─────────────────────
        $keywordBanh = ['bánh mì', 'bánh cuốn', 'bánh tráng', 'bánh đập', 'bánh bèo'];
        foreach ($keywordBanh as $kw) {
            if (str_contains($ten, $kw)) {
                return 'banh_co';
            }
        }

        // Mặc định
        return 'tieu_chuan';
    }
}
