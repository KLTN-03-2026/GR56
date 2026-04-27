<?php
// Chạy lần 1: tạo 1500 đơn (có xóa data cũ)
// Chạy lần 2+: APPEND thêm data, không xóa

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * TrainDataSeeder – 1500 đơn tiền mặt hoàn chỉnh (mỗi đơn > 1.000.000đ)
 *
 * Sửa lại theo logic WalletService:
 *  1. Wallet shipper: debit cọc (tong_tien) khi nhận đơn → credit hoàn cọc + phi_ship*90% khi giao xong
 *  2. Wallet quán ăn: credit tien_hang*85% mỗi đơn (sau chiết khấu 15%)
 *  3. ~30% đơn sử dụng xu, ~20% đơn sử dụng voucher
 *
 * Chiều dài wallet_transactions cho shipper mỗi đơn tiền mặt:
 *   - 1 bản ghi debit: "Đặt cọc nhận đơn tiền mặt #DZ{id}"
 *   - 1 bản ghi credit: "Hoàn cọc + phí ship đơn #DZ{id}"
 * Chiều dài wallet_transactions cho quán ăn mỗi đơn:
 *   - 1 bản ghi credit: "Tiền đơn hàng #DZ{id} (sau chiết khấu 15%)"
 */
class TrainDataSeeder extends Seeder
{
    // Thông tin khách hàng
    private array $khachHangs = [
        1 => ['ho_va_ten' => 'Nguyễn Văn Nhân',      'so_dien_thoai' => '0123456780', 'dia_chis' => [1, 2, 3],    'diem_xu' => 0],
        2 => ['ho_va_ten' => 'Nguyễn Văn A',          'so_dien_thoai' => '0123456789', 'dia_chis' => [4, 5, 6],    'diem_xu' => 0],
        3 => ['ho_va_ten' => 'Lê Minh Tuấn',          'so_dien_thoai' => '0987654321', 'dia_chis' => [7, 8, 9],    'diem_xu' => 0],
        4 => ['ho_va_ten' => 'Trần Thị Hồng Nhung',   'so_dien_thoai' => '0911223344', 'dia_chis' => [10, 11, 12], 'diem_xu' => 0],
        5 => ['ho_va_ten' => 'Đặng Quốc Huy',         'so_dien_thoai' => '0933445566', 'dia_chis' => [13, 14, 15], 'diem_xu' => 0],
        6 => ['ho_va_ten' => 'Phạm Thị Mai',          'so_dien_thoai' => '0909887766', 'dia_chis' => [16, 17, 18], 'diem_xu' => 0],
        7 => ['ho_va_ten' => 'Ngô Văn Lâm',           'so_dien_thoai' => '0966887799', 'dia_chis' => [19, 20, 21], 'diem_xu' => 0],
    ];

    // Voucher lấy từ VoucherSeeder (id, loai_giam, so_giam_gia, so_tien_toi_da, don_hang_toi_thieu)
    // loai_giam: 0=tiền mặt, 1=phần trăm
    private array $vouchers = [
        // toàn hệ thống (id_quan_an=0) dùng được
        2  => ['loai' => 1, 'giam' => 10, 'toi_da' => 30000,  'toi_thieu' => 50000],   // 10%
        10 => ['loai' => 1, 'giam' => 12, 'toi_da' => 30000,  'toi_thieu' => 60000],   // 12%
        13 => ['loai' => 0, 'giam' => 20000, 'toi_da' => 20000, 'toi_thieu' => 50000], // 20k
        17 => ['loai' => 0, 'giam' => 30000, 'toi_da' => 30000, 'toi_thieu' => 80000], // 30k
        36 => ['loai' => 0, 'giam' => 15000, 'toi_da' => 15000, 'toi_thieu' => 0],      // freeship 15k
        37 => ['loai' => 0, 'giam' => 30000, 'toi_da' => 30000, 'toi_thieu' => 100000], // freeship 30k
    ];

    // Món ăn theo quán [id_quan_an => [[id_mon, don_gia], ...]]
    private array $monAnTheoQuan = [
        1  => [[1, 30000], [2, 28000], [3, 30000], [4, 35000], [5, 38000], [6, 45000], [7, 47000], [8, 50000], [9, 40000], [10, 38000], [11, 35000], [12, 32000]],
        2  => [[13, 30000], [14, 25000], [15, 28000], [16, 30000], [17, 33000], [18, 28000], [19, 30000], [20, 31000], [21, 33000], [22, 30000]],
        3  => [[23, 25000], [24, 27000], [25, 28000], [26, 26000], [27, 28000], [28, 26000], [29, 30000], [30, 29000], [31, 28000], [32, 28000]],
        4  => [[33, 35000], [34, 33000], [35, 30000], [36, 31000], [37, 33000], [38, 38000], [39, 30000], [40, 30000], [41, 25000], [42, 33000]],
        5  => [[43, 28000], [44, 25000], [45, 26000], [46, 25000], [47, 20000], [48, 18000], [49, 22000], [50, 30000], [51, 28000], [52, 26000], [53, 30000]],
        6  => [[54, 40000], [55, 38000], [56, 38000], [57, 35000], [58, 35000], [59, 30000], [60, 26000], [61, 38000], [62, 35000]],
        7  => [[63, 45000], [64, 43000], [65, 38000], [66, 40000], [67, 48000], [68, 38000], [69, 40000], [70, 140000]],
        8  => [[71, 33000], [72, 38000], [73, 30000], [74, 40000], [75, 43000], [76, 35000], [77, 33000], [78, 38000], [79, 35000]],
        9  => [[80, 40000], [81, 30000], [82, 45000], [83, 43000], [84, 38000], [85, 40000], [86, 43000], [87, 38000]],
        10 => [[88, 28000], [89, 26000], [90, 26000], [91, 30000], [92, 28000], [93, 25000], [94, 26000], [95, 22000], [96, 26000]],
        11 => [[97, 40000], [98, 33000], [99, 38000], [100, 38000], [101, 38000], [102, 35000], [103, 35000], [104, 33000]],
        12 => [[105, 40000], [106, 43000], [107, 38000], [108, 38000], [109, 40000], [110, 35000], [111, 33000], [112, 45000]],
        13 => [[113, 38000], [114, 35000], [115, 40000], [116, 43000], [117, 35000], [118, 33000], [119, 35000], [120, 33000]],
        14 => [[121, 38000], [122, 40000], [123, 35000], [124, 43000], [125, 38000], [126, 35000], [127, 33000]],
        15 => [[128, 40000], [129, 35000], [130, 33000], [131, 38000], [132, 35000], [133, 38000], [134, 33000], [135, 45000]],
        16 => [[136, 35000], [137, 40000], [138, 33000], [139, 45000], [140, 38000], [141, 50000], [142, 40000], [143, 30000]],
        17 => [[144, 40000], [145, 43000], [146, 35000], [147, 33000], [148, 45000], [149, 38000], [150, 35000]],
        18 => [[136, 35000], [137, 40000], [138, 33000], [139, 45000], [140, 38000]],
        19 => [[121, 38000], [122, 40000], [123, 35000], [124, 43000], [125, 38000]],
        20 => [[128, 40000], [129, 35000], [130, 33000], [131, 38000], [132, 35000]],
        21 => [[54, 40000], [55, 38000], [56, 38000], [57, 35000], [58, 35000]],
        22 => [[54, 40000], [55, 38000], [56, 38000], [57, 35000], [58, 35000]],
        23 => [[105, 40000], [106, 43000], [107, 38000], [108, 38000], [109, 40000]],
        24 => [[105, 40000], [106, 43000], [107, 38000], [108, 38000], [109, 40000]],
        25 => [[105, 40000], [106, 43000], [107, 38000], [108, 38000], [109, 40000]],
        26 => [[151, 50000], [152, 55000], [153, 40000], [154, 45000], [155, 110000]],
        27 => [[63, 45000], [64, 43000], [65, 38000], [66, 40000], [67, 48000]],
        28 => [[63, 45000], [64, 43000], [65, 38000], [66, 40000], [67, 48000]],
        29 => [[128, 40000], [129, 35000], [130, 33000], [131, 38000], [132, 35000]],
        30 => [[105, 40000], [106, 43000], [107, 38000], [108, 38000], [109, 40000]],
        31 => [[80, 40000], [81, 30000], [82, 45000], [83, 43000], [84, 38000]],
        32 => [[156, 40000], [157, 38000], [158, 45000], [159, 50000], [160, 35000]],
        33 => [[82, 45000], [83, 43000], [84, 38000], [80, 40000], [81, 30000]],
        34 => [[97, 40000], [98, 33000], [99, 38000], [100, 38000], [101, 38000]],
        35 => [[54, 40000], [55, 38000], [56, 38000], [57, 35000], [58, 35000]],
        36 => [[54, 40000], [55, 38000], [56, 38000], [57, 35000], [58, 35000]],
        37 => [[88, 28000], [89, 26000], [90, 26000], [91, 30000], [92, 28000]],
        38 => [[88, 28000], [89, 26000], [90, 26000], [91, 30000], [92, 28000]],
        39 => [[97, 40000], [98, 33000], [99, 38000], [100, 38000], [101, 38000]],
        40 => [[54, 40000], [55, 38000], [56, 38000], [57, 35000], [58, 35000]],
    ];

    private array $danhSachQuan = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40];
    private array $phiShips     = [15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000];

    private function randomDate(int $seed): string
    {
        $months = ['2025-01-', '2025-02-', '2025-03-', '2025-04-', '2025-05-', '2025-06-', '2025-07-', '2025-08-', '2025-09-', '2025-10-', '2025-11-', '2025-12-', '2026-01-', '2026-02-'];
        $month  = $months[$seed % 14];
        $day    = str_pad(($seed % 28) + 1, 2, '0', STR_PAD_LEFT);
        $hour   = str_pad(($seed * 3 + 7) % 16 + 7, 2, '0', STR_PAD_LEFT);
        $min    = str_pad(($seed * 7) % 60, 2, '0', STR_PAD_LEFT);
        return $month . $day . ' ' . $hour . ':' . $min . ':00';
    }

    public function run(): void
    {
        // === APPEND MODE: lấy max ID hiện có, không xóa data cũ ===
        $this->command->info('Chế độ APPEND: đọc trạng thái hiện có...');

        // Không tạo ví mới nếu đã có, chỉ nạp thêm 5 triệu nếu số dư shipper < 2 triệu
        foreach ([1, 2] as $shipperId) {
            $existingWallet = DB::table('wallets')
                ->where('loai_vi', 'shipper')->where('id_chu_vi', $shipperId)->first();
            if (!$existingWallet) {
                $wId = DB::table('wallets')->insertGetId([
                    'loai_vi' => 'shipper',
                    'id_chu_vi' => $shipperId,
                    'so_du' => 5000000,
                    'tong_tien_nhan' => 5000000,
                    'tong_tien_rut' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                DB::table('wallet_transactions')->insert([
                    'id_wallet' => $wId,
                    'id_don_hang' => null,
                    'loai_giao_dich' => 'credit',
                    'so_tien' => 5000000,
                    'so_du_truoc' => 0,
                    'so_du_sau' => 5000000,
                    'mo_ta' => 'Nạp tiền ban đầu vào ví',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } elseif ($existingWallet->so_du < 2000000) {
                // Nạp thêm 5 triệu để đủ cọc
                $nap = 5000000;
                DB::table('wallets')->where('id', $existingWallet->id)
                    ->increment('so_du', $nap, ['tong_tien_nhan' => DB::raw("tong_tien_nhan + $nap")]);
                DB::table('wallet_transactions')->insert([
                    'id_wallet' => $existingWallet->id,
                    'id_don_hang' => null,
                    'loai_giao_dich' => 'credit',
                    'so_tien' => $nap,
                    'so_du_truoc' => $existingWallet->so_du,
                    'so_du_sau' => $existingWallet->so_du + $nap,
                    'mo_ta' => 'Nạp bổ sung vào ví shipper',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $soLuong        = 1500; // Số đơn thêm mới
        $CHIET_KHAU     = 15;    // % chiết khấu quán
        $CHIET_KHAU_SHIP = 10;   // % admin giữ từ phí ship

        $donHangs    = [];
        $chiTiets    = [];
        $lichSuXus   = [];
        $walletTrans = [];

        // Đọc số dư ví hiện có từ DB
        $viQuanAn  = [];
        $viShipper = [];
        foreach (DB::table('wallets')->where('loai_vi', 'shipper')->get() as $w) {
            $viShipper[$w->id_chu_vi] = ['id' => $w->id, 'so_du' => (float)$w->so_du];
        }
        foreach (DB::table('wallets')->where('loai_vi', 'quan_an')->get() as $w) {
            $viQuanAn[$w->id_chu_vi] = ['id' => $w->id, 'so_du' => (float)$w->so_du];
        }

        // Lấy max ID hiện có để tiếp nối
        $donHangId  = ((int) DB::table('don_hangs')->max('id') ?: 0) + 1;
        $chiTietId  = ((int) DB::table('chi_tiet_don_hangs')->max('id') ?: 0) + 1;
        $lichSuXuId = ((int) DB::table('lich_su_xus')->max('id') ?: 0) + 1;

        $this->command->info("Bắt đầu từ don_hang ID #{$donHangId}");
        $voucherKeys = array_keys($this->vouchers);

        // Đọc diem_xu khách hàng hiện tại từ DB
        // Đảm bảo tối thiểu 5000 xu để xu logic hoạt động ngay từ đầu
        $danhDiemXu = [];
        foreach (DB::table('khach_hangs')->whereIn('id', [1, 2, 3, 4, 5, 6, 7])->get(['id', 'diem_xu']) as $kh) {
            $xuHienTai = (int)($kh->diem_xu ?? 0);
            if ($xuHienTai < 5000) {
                // Ghi lịch sử tặng xu để đủ điều kiện
                $tangXu = 5000 - $xuHienTai;
                DB::table('khach_hangs')->where('id', $kh->id)->update(['diem_xu' => 5000]);
                DB::table('lich_su_xus')->insert([
                    'id'             => $lichSuXuId++,
                    'id_khach_hang'  => $kh->id,
                    'id_don_hang'    => null,
                    'so_xu'          => $tangXu,
                    'loai_giao_dich' => 4, // Admin tặng
                    'mo_ta'          => 'Admin tặng xu khởi động tài khoản',
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
                $danhDiemXu[$kh->id] = 5000;
            } else {
                $danhDiemXu[$kh->id] = $xuHienTai;
            }
        }

        $this->command->info("Đang tạo {$soLuong} đơn hàng mới (APPEND)...");

        for ($i = 0; $i < $soLuong; $i++) {
            $seed = $i + 1;

            $isCancelled = ($i % 50 === 0); // 100 đơn huỷ / 5000 đơn

            $loaiDon = $i % 10;
            // Phân bổ: 0,1,2 = Không dùng; 3,4 = Chỉ Voucher; 5,6 = Chỉ Xu; 7,8,9 = Cả hai
            $useVoucher = in_array($loaiDon, [3, 4, 7, 8, 9]);
            $useXu      = in_array($loaiDon, [5, 6, 7, 8, 9]);

            // === Khách hàng ===
            $id_khach_hang = ($seed % 7) + 1;
            $khach         = $this->khachHangs[$id_khach_hang];
            $diaChiArr     = $khach['dia_chis'];
            $id_dia_chi    = $diaChiArr[$seed % count($diaChiArr)];

            // === Quán & shipper ===
            $id_quan_an = $this->danhSachQuan[$seed % count($this->danhSachQuan)];
            $id_shipper = ($seed % 2) + 1;
            $phi_ship   = $this->phiShips[$seed % count($this->phiShips)];

            // === Món ăn (25-35 món, đảm bảo tong_tien > 1.000.000đ) ===
            $monAnQuan  = $this->monAnTheoQuan[$id_quan_an];
            $soMonChon  = 25 + ($seed % 11); // 25 đến 35 món
            $tien_hang  = 0;
            $selectedMons = [];
            for ($j = 0; $j < $soMonChon; $j++) {
                $monIdx      = ($seed + $j * 13) % count($monAnQuan);
                $mon         = $monAnQuan[$monIdx];
                $soLuongMon  = ($seed + $j) % 3 === 0 ? 1 : (($seed + $j) % 3 === 1 ? 2 : 3);
                $thanh_tien  = $mon[1] * $soLuongMon;
                $tien_hang  += $thanh_tien;
                $selectedMons[] = ['id_mon_an' => $mon[0], 'don_gia' => $mon[1], 'so_luong' => $soLuongMon, 'thanh_tien' => $thanh_tien];
            }

            // === Voucher ===
            $id_voucher           = null;
            $so_tien_giam_voucher = 0;
            if ($useVoucher && $tien_hang >= 50000) {
                $vIdx = intdiv($donHangId, 5) % count($voucherKeys);
                $vId  = $voucherKeys[$vIdx];
                $v    = $this->vouchers[$vId];
                if ($tien_hang >= $v['toi_thieu']) {
                    if ($v['loai'] === 1) { // %
                        $so_tien_giam_voucher = min((int)round($tien_hang * $v['giam'] / 100), $v['toi_da']);
                    } else {
                        $so_tien_giam_voucher = min($v['giam'], $v['toi_da']);
                    }
                    $id_voucher = $vId;
                }
            }

            // === Xu ===
            $xu_su_dung      = 0;
            $tien_giam_tu_xu = 0;
            // Đơn huỷ không trừ xu để khỏi phải xử lý hoàn xu
            if ($useXu && !$isCancelled && $danhDiemXu[$id_khach_hang] >= 100) {
                $xu_co_the_dung = min($danhDiemXu[$id_khach_hang], 20000);
                $xu_su_dung     = min($xu_co_the_dung, (int)floor($tien_hang * 0.1));
                if ($xu_su_dung > 0) {
                    $tien_giam_tu_xu = $xu_su_dung;
                    $danhDiemXu[$id_khach_hang] -= $xu_su_dung;
                    $lichSuXus[] = [
                        'id'             => $lichSuXuId++,
                        'id_khach_hang'  => $id_khach_hang,
                        'id_don_hang'    => $donHangId,
                        'so_xu'          => -$xu_su_dung,
                        'loai_giao_dich' => 2,
                        'mo_ta'          => 'Dùng xu mua hàng đơn DZ' . $donHangId,
                        'created_at'     => $this->randomDate($seed),
                        'updated_at'     => $this->randomDate($seed),
                    ];
                }
            }

            // === Tổng tiền ===
            $tong_tien   = max(0, $tien_hang + $phi_ship - $so_tien_giam_voucher - $tien_giam_tu_xu);
            $xu_tich_luy = (int) floor($tong_tien * 0.01);

            // === Chiết khấu & chia tiền (miroring WalletService::doiSoatDonHang) ===
            $tien_chiet_khau     = round($tien_hang * $CHIET_KHAU / 100, 2);
            $chiet_khau_phi_ship = round($phi_ship * $CHIET_KHAU_SHIP / 100, 2);
            $tien_quan_an        = round($tien_hang - $tien_chiet_khau, 2);
            $tien_shipper        = round($phi_ship - $chiet_khau_phi_ship, 2);
            $total_chiet_khau    = $tien_chiet_khau + $chiet_khau_phi_ship;

            $created_at  = $this->randomDate($seed);
            $ma_don_hang = 'FOODBEE' . $donHangId;

            // === Đơn hàng ===
            $donHangs[] = [
                'id'                     => $donHangId,
                'ma_don_hang'            => $ma_don_hang,
                'id_khach_hang'          => $id_khach_hang,
                'id_voucher'             => $id_voucher,
                'id_shipper'             => $id_shipper,
                'id_quan_an'             => $id_quan_an,
                'id_dia_chi_nhan'        => $id_dia_chi,
                'ten_nguoi_nhan'         => $khach['ho_va_ten'],
                'so_dien_thoai'          => $khach['so_dien_thoai'],
                'tien_hang'              => $tien_hang,
                'phi_ship'               => $phi_ship,
                'tong_tien'              => $tong_tien,
                'so_tien_nhan'           => $tong_tien,
                'phuong_thuc_thanh_toan' => 1,
                'is_thanh_toan'          => $isCancelled ? 0 : 1,
                'tinh_trang'             => $isCancelled ? 5 : 4, // 5: Huỷ, 4: Hoàn thành
                'chiet_khau_phan_tram'   => $CHIET_KHAU,
                'tien_chiet_khau'        => $total_chiet_khau,
                'tien_quan_an'           => $tien_quan_an,
                'tien_shipper'           => $tien_shipper,
                'da_doi_soat'            => $isCancelled ? 0 : 1,
                'thoi_gian_doi_soat'     => $isCancelled ? null : $created_at,
                'da_dat_coc'             => $isCancelled ? 0 : 1,
                'xu_su_dung'             => $xu_su_dung,
                'tien_giam_tu_xu'        => $tien_giam_tu_xu,
                'xu_tich_luy'            => $isCancelled ? 0 : $xu_tich_luy,
                'created_at'             => $created_at,
                'updated_at'             => $created_at,
            ];

            // === Chi tiết đơn ===
            foreach ($selectedMons as $mon) {
                $chiTiets[] = [
                    'id'           => $chiTietId++,
                    'id_don_hang'  => $donHangId,
                    'id_khach_hang' => $id_khach_hang,
                    'id_mon_an'    => $mon['id_mon_an'],
                    'id_quan_an'   => $id_quan_an,
                    'don_gia'      => $mon['don_gia'],
                    'so_luong'     => $mon['so_luong'],
                    'thanh_tien'   => $mon['thanh_tien'],
                    'ghi_chu'      => null,
                    'created_at'   => $created_at,
                    'updated_at'   => $created_at,
                ];
            }

            // === Lịch sử xu tích lũy ===
            if ($xu_tich_luy > 0 && !$isCancelled) {
                $danhDiemXu[$id_khach_hang] += $xu_tich_luy;
                $lichSuXus[] = [
                    'id'             => $lichSuXuId++,
                    'id_khach_hang'  => $id_khach_hang,
                    'id_don_hang'    => $donHangId,
                    'so_xu'          => $xu_tich_luy,
                    'loai_giao_dich' => 1,
                    'mo_ta'          => 'Tích lũy xu từ đơn hàng ' . $ma_don_hang,
                    'created_at'     => $created_at,
                    'updated_at'     => $created_at,
                ];
            }

            // ============================================================
            // WALLET TRANSACTIONS – giống WalletService::doiSoatDonHang
            // ============================================================

            if (!$isCancelled) {
                // --- Ví shipper: DEBIT cọc khi nhận đơn ---
                $shipperKey = $id_shipper;
                if (!isset($viShipper[$shipperKey])) {
                    $newWId = DB::table('wallets')->insertGetId([
                        'loai_vi' => 'shipper',
                        'id_chu_vi' => $shipperKey,
                        'so_du' => 0,
                        'tong_tien_nhan' => 0,
                        'tong_tien_rut' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $viShipper[$shipperKey] = ['id' => $newWId, 'so_du' => 0];
                }
                $wShipper = &$viShipper[$shipperKey];

                $debitSoDuTruoc = $wShipper['so_du'];
                $debitSoDuSau   = $debitSoDuTruoc - $tong_tien;
                $wShipper['so_du'] = $debitSoDuSau;
                $walletTrans[] = [
                    'id_wallet'      => $wShipper['id'],
                    'id_don_hang'    => $donHangId,
                    'loai_giao_dich' => 'debit',
                    'so_tien'        => $tong_tien,
                    'so_du_truoc'    => $debitSoDuTruoc,
                    'so_du_sau'      => $debitSoDuSau,
                    'mo_ta'          => "Đặt cọc nhận đơn tiền mặt #{$ma_don_hang} (" . number_format($tong_tien, 0, ',', '.') . "đ)",
                    'created_at'     => $created_at,
                    'updated_at'     => $created_at,
                ];

                // --- Ví shipper: CREDIT hoàn cọc + phí ship khi giao xong ---
                $tong_credit_shipper = $tong_tien + $tien_shipper;
                $creditShipSoDuTruoc = $wShipper['so_du'];
                $creditShipSoDuSau   = $creditShipSoDuTruoc + $tong_credit_shipper;
                $wShipper['so_du']   = $creditShipSoDuSau;
                $walletTrans[] = [
                    'id_wallet'      => $wShipper['id'],
                    'id_don_hang'    => $donHangId,
                    'loai_giao_dich' => 'credit',
                    'so_tien'        => $tong_credit_shipper,
                    'so_du_truoc'    => $creditShipSoDuTruoc,
                    'so_du_sau'      => $creditShipSoDuSau,
                    'mo_ta'          => "Hoàn cọc + phí ship đơn #{$ma_don_hang} (cọc: " . number_format($tong_tien, 0, ',', '.') . "đ + ship: " . number_format($tien_shipper, 0, ',', '.') . "đ)",
                    'created_at'     => $created_at,
                    'updated_at'     => $created_at,
                ];

                // --- Ví quán ăn: CREDIT tiền hàng sau chiết khấu ---
                $quanKey = $id_quan_an;
                if (!isset($viQuanAn[$quanKey])) {
                    $newWId = DB::table('wallets')->insertGetId([
                        'loai_vi' => 'quan_an',
                        'id_chu_vi' => $quanKey,
                        'so_du' => 0,
                        'tong_tien_nhan' => 0,
                        'tong_tien_rut' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $viQuanAn[$quanKey] = ['id' => $newWId, 'so_du' => 0];
                }
                $wQuan = &$viQuanAn[$quanKey];

                $creditQuanSoDuTruoc = $wQuan['so_du'];
                $creditQuanSoDuSau   = $creditQuanSoDuTruoc + $tien_quan_an;
                $wQuan['so_du']      = $creditQuanSoDuSau;
                $walletTrans[] = [
                    'id_wallet'      => $wQuan['id'],
                    'id_don_hang'    => $donHangId,
                    'loai_giao_dich' => 'credit',
                    'so_tien'        => $tien_quan_an,
                    'so_du_truoc'    => $creditQuanSoDuTruoc,
                    'so_du_sau'      => $creditQuanSoDuSau,
                    'mo_ta'          => "Tiền đơn hàng #{$ma_don_hang} (sau chiết khấu {$CHIET_KHAU}%)",
                    'created_at'     => $created_at,
                    'updated_at'     => $created_at,
                ];
            }

            $donHangId++;

            // Insert batch 100
            if (count($donHangs) >= 100) {
                DB::table('don_hangs')->insert($donHangs);
                DB::table('chi_tiet_don_hangs')->insert($chiTiets);
                if (!empty($lichSuXus))  DB::table('lich_su_xus')->insert($lichSuXus);
                if (!empty($walletTrans)) DB::table('wallet_transactions')->insert($walletTrans);
                $donHangs = $chiTiets = $lichSuXus = $walletTrans = [];
                $this->command->info("Đã chèn đến đơn #{$donHangId}...");
            }
        }

        // Insert phần còn lại
        if (!empty($donHangs))   DB::table('don_hangs')->insert($donHangs);
        if (!empty($chiTiets))   DB::table('chi_tiet_don_hangs')->insert($chiTiets);
        if (!empty($lichSuXus))  DB::table('lich_su_xus')->insert($lichSuXus);
        if (!empty($walletTrans)) DB::table('wallet_transactions')->insert($walletTrans);

        // === Cập nhật số dư ví trong DB (từ dữ liệu in-memory) ===
        $this->command->info('Cập nhật số dư ví...');
        foreach ($viShipper as $shipperId => $w) {
            // so_du = tong_credit - tong_debit (debit = tiền cọc nội bộ khi nhận đơn COD)
            // tong_tien_rut = 0 vì chưa có withdraw request nào (debit COD KHÔNG phải rút tiền)
            // tong_tien_nhan = tổng credit (hoàn cọc + phí ship đã được credit về)
            $tongCredit = DB::table('wallet_transactions')->where('id_wallet', $w['id'])->where('loai_giao_dich', 'credit')->sum('so_tien');
            $tongDebit  = DB::table('wallet_transactions')->where('id_wallet', $w['id'])->where('loai_giao_dich', 'debit')->sum('so_tien');
            DB::table('wallets')->where('id', $w['id'])->update([
                'so_du'          => $tongCredit - $tongDebit,
                'tong_tien_nhan' => $tongCredit,
                'tong_tien_rut'  => 0, // Chỉ cộng khi có WithdrawRequest thực sự được duyệt
                'updated_at'     => now(),
            ]);
        }
        foreach ($viQuanAn as $quanId => $w) {
            $tongCredit = DB::table('wallet_transactions')->where('id_wallet', $w['id'])->where('loai_giao_dich', 'credit')->sum('so_tien');
            DB::table('wallets')->where('id', $w['id'])->update([
                'so_du'          => $tongCredit,
                'tong_tien_nhan' => $tongCredit,
                'tong_tien_rut'  => 0,
                'updated_at'     => now(),
            ]);
        }

        // === Cập nhật diem_xu khách hàng ===
        $this->command->info('Cập nhật điểm xu khách hàng...');
        foreach ($danhDiemXu as $khId => $xu) {
            DB::table('khach_hangs')->where('id', $khId)->update(['diem_xu' => max(0, $xu)]);
        }

        $this->command->info("✅ Hoàn thành! Đã THÊM {$soLuong} đơn hàng tiền mặt (mỗi đơn > 1.000.000đ):");
        $this->command->info("   - Wallet transactions: debit cọc + credit hoàn cọc cho shipper");
        $this->command->info("   - Wallet transactions: credit tiền hàng 85% cho quán ăn");
        $this->command->info("   - ~30% đơn dùng voucher, ~50% đơn dùng xu");
    }
}
