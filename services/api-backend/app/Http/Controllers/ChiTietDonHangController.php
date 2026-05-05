<?php

namespace App\Http\Controllers;

use App\Http\Requests\GioHang\DeleteGioHangRequest;
use App\Http\Requests\GioHang\ThemGioHangRequest;
use App\Http\Requests\DonHang\TinhPhiShipRequest;
use App\Http\Requests\GioHang\UpdateGioHangRequest;
use App\Events\DonHangMoiEvent;
use App\Jobs\SendMailJob;
use App\Mail\MasterMail;
use App\Models\ChiTietDonHang;
use App\Models\DiaChi;
use App\Models\DonHang;
use App\Models\MonAn;
use App\Models\QuanAn;
use App\Models\Voucher;
use App\Services\VoucherService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Mail;
use App\Jobs\SendNotificationJob;



class ChiTietDonHangController extends Controller
{
    public function appVoucher(Request $request)
    {
        $user = Auth::guard('sanctum')->user();

        $request->validate([
            'ma_code'    => 'required|string',
            'id_quan_an' => 'required|exists:quan_ans,id',
        ]);

        // Lấy tổng tiền giỏ hàng hiện tại
        $tong_tien_hang = ChiTietDonHang::where('id_khach_hang', $user->id)
            ->where('id_don_hang', 0)
            ->where('id_quan_an', $request->id_quan_an)
            ->sum('thanh_tien');

        // Dùng VoucherService để validate (bao gồm kiểm tra lượt dùng)
        $ket_qua = VoucherService::kiemTraVoucher(
            $request->ma_code,
            $user->id,
            (int) $request->id_quan_an,
            (int) $tong_tien_hang
        );

        if (!$ket_qua['ok']) {
            return response()->json(['status' => false, 'message' => $ket_qua['message']], 400);
        }

        $tong_tien_sau_giam = max(0, $tong_tien_hang - $ket_qua['so_tien_giam']);

        return response()->json([
            'status'  => true,
            'message' => $ket_qua['message'],
            'data'    => [
                'voucher'           => $ket_qua['voucher'],
                'so_tien_giam'      => $ket_qua['so_tien_giam'],
                'tong_tien_goc'     => $tong_tien_hang,
                'tong_tien_sau_giam' => $tong_tien_sau_giam,
            ],
        ]);
    }
    public function getDonDatHang($id_quan_an)
    {
        $khachHang = Auth::guard('sanctum')->user();

        // Load quán + toppings của quán trong 1 query (eager loading)
        $quan_an = QuanAn::with('toppings')
            ->where('id', $id_quan_an)
            ->where('tinh_trang', 1)
            ->where('is_active', 1)
            ->first();

        $mon_an = MonAn::where('id_quan_an', $id_quan_an)
            ->where('tinh_trang', 1)
            ->with('sizes')
            ->get();

        $gio_hang = ChiTietDonHang::where('id_don_hang', 0)
            ->where('id_khach_hang', $khachHang->id)
            ->where('chi_tiet_don_hangs.id_quan_an', $id_quan_an)
            ->join('mon_ans', 'mon_ans.id', '=', 'chi_tiet_don_hangs.id_mon_an')
            ->select('chi_tiet_don_hangs.*', 'mon_ans.ten_mon_an')
            ->get();

        $dia_chi_khach = DiaChi::where('id_khach_hang', $khachHang->id)
            ->join('quan_huyens', 'dia_chis.id_quan_huyen', 'quan_huyens.id')
            ->join('tinh_thanhs', 'quan_huyens.id_tinh_thanh', 'tinh_thanhs.id')
            ->select('dia_chis.*', 'quan_huyens.ten_quan_huyen', 'tinh_thanhs.ten_tinh_thanh')
            ->get();

        if ($quan_an) {
            return response()->json([
                'quan_an'       => $quan_an,
                'mon_an'        => $mon_an,
                'toppings'      => $quan_an ? $quan_an->toppings : [],
                'gio_hang'      => $gio_hang,
                'dia_chi_khach' => $dia_chi_khach,
                'tong_tien'     => $gio_hang->sum('thanh_tien'),
                'status'        => true
            ]);
        } else {
            return response()->json([
                'status' => false
            ]);
        }
    }


    public function tinhPhiShip(TinhPhiShipRequest $request)
    {
        try {
            $dia_chi_quan  = QuanAn::where('id', $request->id_quan_an)->first();
            $dia_chi_khach = DiaChi::where('id', $request->id_dia_chi_khach)->first();

            if (!$dia_chi_quan || !$dia_chi_khach) {
                return response()->json([
                    'status'   => false,
                    'message'  => 'Không tìm thấy địa chỉ quán hoặc địa chỉ khách hàng',
                    'phi_ship' => 30000
                ]);
            }

            // Nếu thiếu tọa độ bất kỳ bên nào → dùng phí ship tối thiểu (fallback)
            $phiShipToiThieu = intval(\App\Models\CauHinh::getVal('phi_ship_toi_thieu', 30000));

            if (!$dia_chi_khach->toa_do_x || !$dia_chi_khach->toa_do_y) {
                return response()->json([
                    'status'   => true,
                    'phi_ship' => $phiShipToiThieu,
                    'khoang_cach' => 0,
                    'note'     => 'Địa chỉ chưa có tọa độ, áp dụng phí ship tối thiểu',
                ]);
            }

            if (!$dia_chi_quan->toa_do_x || !$dia_chi_quan->toa_do_y) {
                return response()->json([
                    'status'   => true,
                    'phi_ship' => $phiShipToiThieu,
                    'khoang_cach' => 0,
                    'note'     => 'Quán chưa có tọa độ, áp dụng phí ship tối thiểu',
                ]);
            }

            // Sử dụng MapTiler API để tính khoảng cách theo đường đi
            $khoang_cach_km = $this->tinhKhoangCachThucTe(
                $dia_chi_quan->toa_do_x,
                $dia_chi_quan->toa_do_y,
                $dia_chi_khach->toa_do_x,
                $dia_chi_khach->toa_do_y
            );

            $phi_ship = $this->calculateShippingFee($khoang_cach_km);

            return response()->json([
                'status'        => true,
                'phi_ship'      => $phi_ship,
                'khoang_cach'   => round($khoang_cach_km ?? 0, 2),
                'dia_chi_quan'  => $dia_chi_quan->dia_chi,
                'dia_chi_khach' => $dia_chi_khach->dia_chi
            ]);
        } catch (\Exception $e) {
            Log::error('Lỗi tính phí ship: ' . $e->getMessage(), [
                'error' => $e->getMessage(),
                'line'  => $e->getLine(),
                'file'  => $e->getFile()
            ]);

            return response()->json([
                'status'   => true,
                'phi_ship' => intval(\App\Models\CauHinh::getVal('phi_ship_toi_thieu', 30000)),
                'note'     => 'Lỗi tính phí ship, áp dụng phí tối thiểu',
            ]);
        }
    }

    /**
     * Tính khoảng cách thực tế theo đường đi (MapTiler Routing API)
     * @param float $lat1 Vĩ độ điểm 1
     * @param float $lon1 Kinh độ điểm 1
     * @param float $lat2 Vĩ độ điểm 2
     * @param float $lon2 Kinh độ điểm 2
     * @return float Khoảng cách tính bằng km
     */
    /**
     * Tính khoảng cách thực tế - tự động phát hiện thứ tự lat/lng DB bị lộn xộn
     * Việt Nam: lat=[8.0..23.5], lng=[102.0..109.5]
     * DB có thể lưu (lng, lat) hoặc (lat, lng) tuỳ từng record
     */
    private function tinhKhoangCachThucTe($x1, $y1, $x2, $y2)
    {
        $isLat = fn($v) => $v >= 8.0  && $v <= 23.5;
        $isLng = fn($v) => $v >= 102.0 && $v <= 109.5;

        // Xác định lat/lng thực cho điểm 1
        if ($isLat($x1) && $isLng($y1)) {
            [$lat1, $lng1] = [$x1, $y1]; // x=lat, y=lng (chuẩn)
        } elseif ($isLng($x1) && $isLat($y1)) {
            [$lat1, $lng1] = [$y1, $x1]; // x=lng, y=lat → hoán vị
        } else {
            Log::warning("Tọa độ điểm 1 không hợp lệ: x={$x1} y={$y1}, dùng fallback");
            return 5.0;
        }

        // Xác định lat/lng thực cho điểm 2
        if ($isLat($x2) && $isLng($y2)) {
            [$lat2, $lng2] = [$x2, $y2]; // x=lat, y=lng (chuẩn)
        } elseif ($isLng($x2) && $isLat($y2)) {
            [$lat2, $lng2] = [$y2, $x2]; // x=lng, y=lat → hoán vị
        } else {
            Log::warning("Tọa độ điểm 2 không hợp lệ: x={$x2} y={$y2}, dùng fallback");
            return 5.0;
        }

        Log::info("Haversine: [{$lat1},{$lng1}] → [{$lat2},{$lng2}]");
        return $this->tinhKhoangCachHaversine($lat1, $lng1, $lat2, $lng2);
    }


    /**
     * Tính khoảng cách đường chim bay (Haversine formula) - Fallback method
     * @param float $lat1 Vĩ độ điểm 1
     * @param float $lon1 Kinh độ điểm 1
     * @param float $lat2 Vĩ độ điểm 2
     * @param float $lon2 Kinh độ điểm 2
     * @return float Khoảng cách tính bằng km
     */
    private function tinhKhoangCachHaversine($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371; // Bán kính trái đất tính bằng km

        $latFrom = deg2rad($lat1);
        $lonFrom = deg2rad($lon1);
        $latTo = deg2rad($lat2);
        $lonTo = deg2rad($lon2);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));

        return $angle * $earthRadius;
    }



    public function themGioHang(Request $request)
    {
        $request->validate([
            'id'        => 'required|exists:mon_ans,id',
            'don_gia'   => 'nullable|numeric',
            'ghi_chu'   => 'nullable|string',
            'id_size'   => 'nullable|exists:mon_an_sizes,id',
            'ten_size'  => 'nullable|string',
        ]);

        $khachHang = Auth::guard('sanctum')->user();
        $monAn     = MonAn::where('id', $request->id)->first();
        $ghi_chu   = $request->ghi_chu ?? "";
        $id_size   = $request->id_size ?? null;
        $ten_size  = $request->ten_size ?? null;

        // Ưu tiên giá từ FE gửi lên (đã bao gồm topping/size), nếu không có hoặc bằng 0 thì lấy giá gốc món ăn
        $don_gia = $request->don_gia;
        if (!$don_gia || $don_gia <= 0) {
            $don_gia = ($monAn->gia_khuyen_mai > 0) ? $monAn->gia_khuyen_mai : $monAn->gia_ban;
        }

        // Tìm món trong giỏ: cùng ID món VÀ cùng ghi chú (topping) và cùng size
        $check = ChiTietDonHang::where('id_khach_hang', $khachHang->id)
            ->where('id_mon_an', $request->id)
            ->where('id_don_hang', 0)
            ->where('ghi_chu', $ghi_chu)
            ->where('id_size', $id_size)
            ->first();

        if ($check) {
            $check->so_luong += 1;
            $check->thanh_tien = $check->don_gia * $check->so_luong;
            $check->save();

            return response()->json([
                'status'    => true,
                'message'   => 'Cập nhật số lượng món ăn thành công'
            ]);
        } else {
            ChiTietDonHang::create([
                'id_mon_an'     => $request->id,
                'id_quan_an'    => $monAn->id_quan_an,
                'don_gia'       => $don_gia,
                'so_luong'      => 1,
                'thanh_tien'    => $don_gia,
                'id_khach_hang' => $khachHang->id,
                'ghi_chu'       => $ghi_chu,
                'id_size'       => $id_size,
                'ten_size'      => $ten_size,
            ]);

            return response()->json([
                'status'    => true,
                'message'   => 'Thêm món ăn vào giỏ hàng thành công'
            ]);
        }
    }

    public function updateGioHang(UpdateGioHangRequest $request)
    {
        $khachHang  = Auth::guard('sanctum')->user();
        $mon_an     =   MonAn::where('id', $request->id_mon_an)
            ->where('mon_ans.tinh_trang', 1)
            ->first();
        if (!$mon_an) {
            return response()->json([
                'status'    => 0,
                'message'   => "Món ăn không tồn tại hoặc đã nhưng bán!!!!"
            ]);
        } else {
            ChiTietDonHang::where('id', $request->id)->update([
                'so_luong'      => $request->so_luong,
                'thanh_tien'    => $request->so_luong * (ChiTietDonHang::find($request->id)->don_gia),
                'ghi_chu'       => $request->ghi_chu,
            ]);

            return response()->json([
                'status'    => 1,
                'message'   => "Cập nhật giỏ hàng thành công!!"
            ]);
        }
    }

    public function deleteGioHang(DeleteGioHangRequest $request)
    {
        ChiTietDonHang::where('id', $request->all())->delete();
        return response()->json([
            'status'    => 1,
            'message'   => "Đã hủy món " . $request->ten_mon_an . " thành công!!",
        ]);
    }

    public function xacNhanDatHangChuyenKhoan($id_quan_an, $id_dia_chi_khach)
    {

        $khachHang  = Auth::guard('sanctum')->user();
        $gio_hang     =   ChiTietDonHang::where('id_don_hang', 0)
            ->where('id_khach_hang', Auth::guard('sanctum')->user()->id)
            ->where('chi_tiet_don_hangs.id_quan_an', $id_quan_an)
            ->join('mon_ans', 'mon_ans.id', '=', 'chi_tiet_don_hangs.id_mon_an')
            ->select('chi_tiet_don_hangs.*', 'mon_ans.ten_mon_an')
            ->get();

        $dia_chi_quan  = QuanAn::where('id', $id_quan_an)->first();
        $dia_chi_khach = DiaChi::where('id', $id_dia_chi_khach)->first();

        // Sử dụng tọa độ từ database để tính khoảng cách
        if (
            $dia_chi_quan && $dia_chi_khach &&
            $dia_chi_quan->toa_do_x && $dia_chi_quan->toa_do_y &&
            $dia_chi_khach->toa_do_x && $dia_chi_khach->toa_do_y
        ) {

            $khoang_cach_km = $this->tinhKhoangCachThucTe(
                $dia_chi_quan->toa_do_x,
                $dia_chi_quan->toa_do_y,
                $dia_chi_khach->toa_do_x,
                $dia_chi_khach->toa_do_y
            );

            if ($khoang_cach_km <= 30) {
                $phi_ship = $this->calculateShippingFee($khoang_cach_km);
            } else {
                $phi_ship = 50000;
            }
        } else {
            $phi_ship = 50000;
        }

        // ========== XỬ LÝ VOUCHER (dùng VoucherService - có kiểm tra lượt dùng) ==========
        $id_voucher   = request()->query('id_voucher', 0);
        $so_tien_giam = 0;
        $tien_hang    = $gio_hang->sum('thanh_tien');
        $voucher_obj  = null;

        $don_toi_thieu = floatval(\App\Models\CauHinh::getVal('don_toi_thieu', 30000));
        if ($tien_hang < $don_toi_thieu) {
            return response()->json([
                'status'  => false,
                'message' => 'Đơn hàng tối thiểu phải đạt ' . number_format($don_toi_thieu, 0, ',', '.') . 'đ'
            ]);
        }

        if ($id_voucher > 0) {
            $voucher_obj = Voucher::find($id_voucher);
            if ($voucher_obj) {
                $ket_qua = VoucherService::kiemTraVoucher(
                    $voucher_obj->ma_code,
                    $khachHang->id,
                    (int) $id_quan_an,
                    (int) $tien_hang
                );
                if ($ket_qua['ok']) {
                    $so_tien_giam = $ket_qua['so_tien_giam'];
                } else {
                    Log::warning('Voucher ko hợp lệ khi xác nhận đơn CK: ' . $ket_qua['message']);
                    $id_voucher = 0; // Reset để không ghi vào đơn hàng
                }
            }
        }

        // ========== XỬ LÝ XU (SHOPEFOOD XU) ==========
        $su_dung_xu = (int) request()->query('su_dung_xu', 0);
        $tien_giam_tu_xu = 0;
        if ($su_dung_xu > 0) {
            if ($khachHang->diem_xu >= $su_dung_xu) {
                $tien_giam_tu_xu = $su_dung_xu;
            } else {
                return response()->json([
                    'status'  => false,
                    'message' => 'Số ShopeFood Xu của bạn không đủ để sử dụng!'
                ]);
            }
        }

        $tong_tien_cuoi = max(0, $tien_hang + $phi_ship - $so_tien_giam - $tien_giam_tu_xu);
        $xu_tich_luy = (int) floor($tong_tien_cuoi * 0.01);

        // Tạo mã đơn hàng unique bằng timestamp + random
        $ma_don_hang_temp = 'FOODBEE' . time() . rand(100, 999);

        $donHang = DonHang::create([
            'ma_don_hang'       =>  $ma_don_hang_temp,
            'id_khach_hang'     =>  Auth::guard('sanctum')->user()->id,
            'id_voucher'        =>  $id_voucher,
            'id_shipper'        =>  0,
            'id_quan_an'        =>  $id_quan_an,
            'phuong_thuc_thanh_toan' =>  DonHang::thanh_toan_chuyen_khoan,
            'id_dia_chi_nhan'   =>  $id_dia_chi_khach,
            'ten_nguoi_nhan'    =>  $dia_chi_khach->ten_nguoi_nhan,
            'so_dien_thoai'     =>  $dia_chi_khach->so_dien_thoai,
            'tien_hang'         =>  $tien_hang,
            'phi_ship'          =>  $phi_ship,
            'tong_tien'         =>  $tong_tien_cuoi,
            'is_thanh_toan'     =>  0,
            'tinh_trang'        =>  0,
            'xu_su_dung'        =>  $tien_giam_tu_xu,
            'tien_giam_tu_xu'   =>  $tien_giam_tu_xu,
            'xu_tich_luy'       =>  $xu_tich_luy,
        ]);

        // Cập nhật giỏ hàng (id_don_hang = 0) thành đơn hàng thật
        ChiTietDonHang::where('id_don_hang', 0)
            ->where('id_khach_hang', Auth::guard('sanctum')->user()->id)
            ->where('chi_tiet_don_hangs.id_quan_an', $id_quan_an)
            ->update([
                'id_don_hang' => $donHang->id,
            ]);

        // Update lại mã đơn hàng theo ID thật
        $donHang->ma_don_hang = 'FOODBEE' . $donHang->id;
        $donHang->save();

        // Trừ xu nếu khách có sử dụng xu
        if ($tien_giam_tu_xu > 0) {
            $khachHang->diem_xu -= $tien_giam_tu_xu;
            $khachHang->save();

            \App\Models\LichSuXu::create([
                'id_khach_hang'     => $khachHang->id,
                'id_don_hang'       => $donHang->id,
                'so_xu'             => -$tien_giam_tu_xu,
                'loai_giao_dich'    => 2, // Sử dụng xu mua hàng
                'mo_ta'             => 'Sử dụng xu cho đơn hàng ' . $donHang->ma_don_hang,
            ]);
        }

        // Ghi nhận đã dùng voucher (nếu có)
        if ($id_voucher > 0 && $so_tien_giam > 0) {
            VoucherService::ghiNhanDaDung($id_voucher, $khachHang->id, $donHang->id, (int) $so_tien_giam);
        }

        // CHỈ BẮN BROADCAST KHI ĐÃ THANH TOÁN (được thực hiện bên trong PayOS webhook)
        // Không dùng event(new DonHangMoiEvent($donHang)) ở đây để tránh Shipper nhận nhầm đơn chưa thanh toán.

        // Lấy lại danh sách món ăn trong đơn hàng để trả về cho modal
        $chi_tiet_mon_an = ChiTietDonHang::where('id_don_hang', $donHang->id)
            ->join('mon_ans', 'mon_ans.id', 'chi_tiet_don_hangs.id_mon_an')
            ->select(
                'chi_tiet_don_hangs.*',
                'mon_ans.ten_mon_an',
                'mon_ans.hinh_anh'
            )
            ->get();

        return response()->json([
            'status'            =>  true,
            'message'           =>  'Đã xác nhận đơn hàng thành công!',
            'id_don_hang'       =>  $donHang->id,
            'ma_don_hang'       =>  $donHang->ma_don_hang,
            'tien_hang'         =>  $donHang->tien_hang,
            'phi_ship'          =>  $donHang->phi_ship,
            'tong_tien'         =>  $donHang->tong_tien,
            'chi_tiet_mon_an'   =>  $chi_tiet_mon_an,
            'dia_chi_nhan'      => [
                'ten_nguoi_nhan'    => $dia_chi_khach->ten_nguoi_nhan,
                'so_dien_thoai'     => $dia_chi_khach->so_dien_thoai,
                'dia_chi'           => $dia_chi_khach->dia_chi,
            ]
        ]);
    }
    public function xacNhanDatHangTienMat($id_quan_an, $id_dia_chi_khach)
    {

        $khachHang  = Auth::guard('sanctum')->user();
        $gio_hang     =   ChiTietDonHang::where('id_don_hang', 0)
            ->where('id_khach_hang', Auth::guard('sanctum')->user()->id)
            ->where('chi_tiet_don_hangs.id_quan_an', $id_quan_an)
            ->join('mon_ans', 'mon_ans.id', '=', 'chi_tiet_don_hangs.id_mon_an')
            ->select('chi_tiet_don_hangs.*', 'mon_ans.ten_mon_an')
            ->get();

        $dia_chi_quan  = QuanAn::where('id', $id_quan_an)->first();
        $dia_chi_khach = DiaChi::where('id', $id_dia_chi_khach)->first();

        // Sử dụng tọa độ từ database để tính khoảng cách
        if (
            $dia_chi_quan && $dia_chi_khach &&
            $dia_chi_quan->toa_do_x && $dia_chi_quan->toa_do_y &&
            $dia_chi_khach->toa_do_x && $dia_chi_khach->toa_do_y
        ) {

            $khoang_cach_km = $this->tinhKhoangCachThucTe(
                $dia_chi_quan->toa_do_x,
                $dia_chi_quan->toa_do_y,
                $dia_chi_khach->toa_do_x,
                $dia_chi_khach->toa_do_y
            );

            if ($khoang_cach_km <= 30) {
                $phi_ship = $this->calculateShippingFee($khoang_cach_km);
            } else {
                $phi_ship = 50000;
            }
        } else {
            $phi_ship = 50000;
        }

        // ========== XỬ LÝ VOUCHER (dùng VoucherService - có kiểm tra lượt dùng) ==========
        $id_voucher   = request()->query('id_voucher', 0);
        $so_tien_giam = 0;
        $tien_hang    = $gio_hang->sum('thanh_tien');

        $don_toi_thieu = floatval(\App\Models\CauHinh::getVal('don_toi_thieu', 30000));
        if ($tien_hang < $don_toi_thieu) {
            return response()->json([
                'status'  => false,
                'message' => 'Đơn hàng tối thiểu phải đạt ' . number_format($don_toi_thieu, 0, ',', '.') . 'đ'
            ]);
        }

        if ($id_voucher > 0) {
            $voucher_obj = Voucher::find($id_voucher);
            if ($voucher_obj) {
                $ket_qua = VoucherService::kiemTraVoucher(
                    $voucher_obj->ma_code,
                    $khachHang->id,
                    (int) $id_quan_an,
                    (int) $tien_hang
                );
                if ($ket_qua['ok']) {
                    $so_tien_giam = $ket_qua['so_tien_giam'];
                } else {
                    $id_voucher = 0;
                }
            }
        }

        // ========== XỬ LÝ XU (SHOPEFOOD XU) ==========
        $su_dung_xu = (int) request()->query('su_dung_xu', 0);
        $tien_giam_tu_xu = 0;
        if ($su_dung_xu > 0) {
            if ($khachHang->diem_xu >= $su_dung_xu) {
                $tien_giam_tu_xu = $su_dung_xu;
            } else {
                return response()->json([
                    'status'  => false,
                    'message' => 'Số ShopeFood Xu của bạn không đủ để sử dụng!'
                ]);
            }
        }

        $tong_tien_cuoi = max(0, $tien_hang + $phi_ship - $so_tien_giam - $tien_giam_tu_xu);
        $xu_tich_luy = (int) floor($tong_tien_cuoi * 0.01);

        // Tạo mã đơn hàng unique bằng timestamp + random
        $ma_don_hang_temp = 'FOODBEE' . time() . rand(100, 999);

        $donHang = DonHang::create([
            'ma_don_hang'       =>  $ma_don_hang_temp,
            'id_khach_hang'     =>  Auth::guard('sanctum')->user()->id,
            'id_voucher'        =>  $id_voucher,
            'id_shipper'        =>  0,
            'id_quan_an'        =>  $id_quan_an,
            'phuong_thuc_thanh_toan' =>  DonHang::thanh_toan_tien_mat,
            'id_dia_chi_nhan'   =>  $id_dia_chi_khach,
            'ten_nguoi_nhan'    =>  $dia_chi_khach->ten_nguoi_nhan,
            'so_dien_thoai'     =>  $dia_chi_khach->so_dien_thoai,
            'tien_hang'         =>  $tien_hang,
            'phi_ship'          =>  $phi_ship,
            'tong_tien'         =>  $tong_tien_cuoi,
            'is_thanh_toan'     =>  0,
            'tinh_trang'        =>  0,
            'xu_su_dung'        =>  $tien_giam_tu_xu,
            'tien_giam_tu_xu'   =>  $tien_giam_tu_xu,
            'xu_tich_luy'       =>  $xu_tich_luy,
        ]);

        // Cập nhật giỏ hàng (id_don_hang = 0) thành đơn hàng thật
        ChiTietDonHang::where('id_don_hang', 0)
            ->where('id_khach_hang', $khachHang->id)
            ->where('chi_tiet_don_hangs.id_quan_an', $id_quan_an)
            ->update(['id_don_hang' => $donHang->id]);

        // Update lại mã đơn hàng theo ID thật
        $donHang->ma_don_hang = 'FOODBEE' . $donHang->id;
        $donHang->save();

        // Trừ xu nếu khách có sử dụng xu
        if ($tien_giam_tu_xu > 0) {
            $khachHang->diem_xu -= $tien_giam_tu_xu;
            $khachHang->save();

            \App\Models\LichSuXu::create([
                'id_khach_hang'     => $khachHang->id,
                'id_don_hang'       => $donHang->id,
                'so_xu'             => -$tien_giam_tu_xu,
                'loai_giao_dich'    => 2, // Sử dụng xu mua hàng
                'mo_ta'             => 'Sử dụng xu cho đơn hàng ' . $donHang->ma_don_hang,
            ]);
        }

        // Ghi nhận đã dùng voucher
        if ($id_voucher > 0 && $so_tien_giam > 0) {
            VoucherService::ghiNhanDaDung($id_voucher, $khachHang->id, $donHang->id, (int) $so_tien_giam);
        }

        // Trigger Broadcasting Event: Thông báo đơn hàng mới đến Quán ăn và Shipper
        try {
            event(new DonHangMoiEvent($donHang));
            
            // THÊM: Gửi notification qua Queue
            SendNotificationJob::dispatch(
                $donHang->id_quan_an, 
                'quan_an', 
                'Đơn hàng mới', 
                'Bạn có một đơn hàng mới từ ' . $donHang->ten_nguoi_nhan
            );
        } catch (\Exception $e) {
            Log::error('Lỗi khi phát sự kiện DonHangMoiEvent: ' . $e->getMessage());
        }

        // Lấy lại danh sách món ăn trong đơn hàng để trả về cho modal
        $chi_tiet_mon_an = ChiTietDonHang::where('id_don_hang', $donHang->id)
            ->join('mon_ans', 'mon_ans.id', 'chi_tiet_don_hangs.id_mon_an')
            ->select(
                'chi_tiet_don_hangs.*',
                'mon_ans.ten_mon_an',
                'mon_ans.hinh_anh'
            )
            ->get();

        // ── GỬI EMAIL XÁC NHẬN ĐƠN HÀNG ──────────────────────────────────
        try {
            $quanAn = QuanAn::find($id_quan_an);
            $mon_an_list = $chi_tiet_mon_an->map(fn($ct) => [
                'ten'      => $ct->ten_mon_an,
                'so_luong' => $ct->so_luong,
                'gia'      => $ct->thanh_tien,
            ])->toArray();

            SendMailJob::dispatch(
                $khachHang->email,
                '🎉 Đặt hàng thành công - #' . $donHang->ma_don_hang,
                'emails.don_hang_moi',
                [
                    'ho_ten'       => $khachHang->ho_va_ten,
                    'ma_don_hang'  => $donHang->ma_don_hang,
                    'ten_quan'     => $quanAn->ten_quan_an ?? '',
                    'tong_tien'    => $donHang->tong_tien,
                    'tien_hang'    => $donHang->tien_hang,
                    'phi_ship'     => $donHang->phi_ship,
                    'giam_gia'     => $so_tien_giam + $tien_giam_tu_xu,
                    'phuong_thuc'  => DonHang::thanh_toan_tien_mat,
                    'dia_chi'      => $dia_chi_khach->dia_chi ?? '',
                    'mon_an'       => $mon_an_list,
                ]
            );
        } catch (\Exception $e) {
            Log::error('Lỗi gửi email xác nhận đơn hàng: ' . $e->getMessage());
        }

        return response()->json([
            'status'            =>  true,
            'message'           =>  'Đã xác nhận đơn hàng thành công!',
            'id_don_hang'       =>  $donHang->id,
            'ma_don_hang'       =>  $donHang->ma_don_hang,
            'tien_hang'         =>  $donHang->tien_hang,
            'phi_ship'          =>  $donHang->phi_ship,
            'tong_tien'         =>  $donHang->tong_tien,
            'chi_tiet_mon_an'   =>  $chi_tiet_mon_an,
            'dia_chi_nhan'      => [
                'ten_nguoi_nhan'    => $dia_chi_khach->ten_nguoi_nhan,
                'so_dien_thoai'     => $dia_chi_khach->so_dien_thoai,
                'dia_chi'           => $dia_chi_khach->dia_chi,
            ]
        ]);
    }
    private function calculateShippingFee($khoang_cach_km)
    {
        if ($khoang_cach_km > 30) {
            return 50000;
        }
        
        $phi_ship_km_binh_thuong = floatval(\App\Models\CauHinh::getVal('phi_ship_km_binh_thuong', 15000));
        $phi_ship_km_cao_diem = floatval(\App\Models\CauHinh::getVal('phi_ship_km_cao_diem', 20000));
        $phi_ship_toi_thieu = floatval(\App\Models\CauHinh::getVal('phi_ship_toi_thieu', 15000));
        $gio_cao_diem_json = \App\Models\CauHinh::getVal('gio_cao_diem', '[{"start": "11:00", "end": "13:00"}, {"start": "17:30", "end": "19:30"}]');
        
        $is_peak = false;
        $now = \Carbon\Carbon::now('Asia/Ho_Chi_Minh');
        $current_time = $now->format('H:i');
        
        $khung_gio = json_decode($gio_cao_diem_json, true);
        if (is_array($khung_gio)) {
            foreach ($khung_gio as $tf) {
                if (isset($tf['start']) && isset($tf['end']) && $current_time >= $tf['start'] && $current_time <= $tf['end']) {
                    $is_peak = true;
                    break;
                }
            }
        }
        
        $don_gia_ship = $is_peak ? $phi_ship_km_cao_diem : $phi_ship_km_binh_thuong;
        $phi_ship = ceil($khoang_cach_km * $don_gia_ship / 1000) * 1000;
        
        return max($phi_ship, $phi_ship_toi_thieu);
    }

    public function getCartSummary()
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user) {
            return response()->json(['status' => false]);
        }

        $cartQuery = ChiTietDonHang::where('id_khach_hang', $user->id)
            ->where('id_don_hang', 0);

        $count = (int) $cartQuery->sum('so_luong');
        // Lấy quán ăn cuối cùng được thêm vào để điều hướng
        $lastItem = $cartQuery->orderBy('id', 'desc')->first();

        return response()->json([
            'status' => true,
            'count' => $count,
            'id_quan_an' => $lastItem ? $lastItem->id_quan_an : null
        ]);
    }
}
