<?php

namespace App\Http\Controllers;


use App\Events\DonHangDaHuyEvent;
use App\Events\DonHangDaNhanEvent;
use App\Events\DonHangDaXongEvent;
use App\Events\DonHangHoanThanhEvent;
use App\Events\ShipperLocationUpdated;
use App\Http\Requests\DonHang\HuyDonHangRequest;
use App\Http\Requests\DonHang\ShipperNhanDonHangRequest;
use App\Models\ChiTietDonHang;
use App\Models\DonHang;
use App\Models\DanhGia;
use App\Models\Shipper;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Services\WalletService;
use App\Jobs\RefundPayOSJob;
use App\Models\CauHinh;

class DonHangController extends Controller
{
    public function getDonHangKhachHang()
    {
        $user = Auth::guard('sanctum')->user();

        $data = DonHang::where('don_hangs.id_khach_hang', $user->id)
            ->join('quan_ans', 'quan_ans.id', 'don_hangs.id_quan_an')
            ->leftJoin('shippers', 'shippers.id', 'don_hangs.id_shipper')
            ->join('dia_chis', 'dia_chis.id', 'don_hangs.id_dia_chi_nhan')
            ->leftJoin('chi_tiet_don_hangs', 'chi_tiet_don_hangs.id_don_hang', 'don_hangs.id')
            ->leftJoin('mon_ans', 'mon_ans.id', 'chi_tiet_don_hangs.id_mon_an')
            ->select(
                'don_hangs.id',
                'don_hangs.ma_don_hang',
                'don_hangs.created_at',
                'don_hangs.updated_at',
                'don_hangs.tien_hang',
                'don_hangs.phi_ship',
                'don_hangs.tong_tien',
                'don_hangs.is_thanh_toan',
                'don_hangs.phuong_thuc_thanh_toan',
                'don_hangs.tinh_trang',
                'don_hangs.id_shipper',
                'don_hangs.refund_status',
                'don_hangs.refund_at',
                'quan_ans.ten_quan_an',
                'quan_ans.hinh_anh as hinh_anh_quan',
                'quan_ans.dia_chi as dia_chi_quan',
                'shippers.ho_va_ten as ho_va_ten_shipper',
                'shippers.so_dien_thoai as sdt_shipper',
                'dia_chis.dia_chi',
                'dia_chis.ten_nguoi_nhan',
                'dia_chis.so_dien_thoai',
                DB::raw('SUBSTRING_INDEX(GROUP_CONCAT(DISTINCT mon_ans.hinh_anh ORDER BY mon_ans.id SEPARATOR \',\'), \',\', 1) as hinh_anh_mon_an'),
                DB::raw('COUNT(DISTINCT chi_tiet_don_hangs.id) as so_mon')
            )
            ->groupBy(
                'don_hangs.id',
                'don_hangs.ma_don_hang',
                'don_hangs.created_at',
                'don_hangs.updated_at',
                'don_hangs.tien_hang',
                'don_hangs.phi_ship',
                'don_hangs.tong_tien',
                'don_hangs.is_thanh_toan',
                'don_hangs.phuong_thuc_thanh_toan',
                'don_hangs.tinh_trang',
                'don_hangs.id_shipper',
                'don_hangs.refund_status',
                'don_hangs.refund_at',
                'quan_ans.ten_quan_an',
                'quan_ans.hinh_anh',
                'quan_ans.dia_chi',
                'shippers.ho_va_ten',
                'shippers.so_dien_thoai',
                'dia_chis.dia_chi',
                'dia_chis.ten_nguoi_nhan',
                'dia_chis.so_dien_thoai'
            )
            ->orderBy('don_hangs.id', 'desc')
            ->get();

        return response()->json([
            'status' => true,
            'data' => $data
        ]);
    }

    public function getChiTietDonHangKhachHang(Request $request)
    {
        $user = Auth::guard('sanctum')->user();

        // Validate request
        if (!$request->id) {
            return response()->json([
                'status' => false,
                'message' => 'Vui lòng cung cấp ID đơn hàng'
            ], 400);
        }

        // Lấy thông tin tổng quát đơn hàng
        $donHang = DonHang::where('don_hangs.id', $request->id)
            ->where('don_hangs.id_khach_hang', $user->id) // Đảm bảo đơn hàng thuộc về khách hàng này
            ->leftJoin('khach_hangs', 'khach_hangs.id', 'don_hangs.id_khach_hang')
            ->leftJoin('quan_ans', 'quan_ans.id', 'don_hangs.id_quan_an')
            ->leftJoin('shippers', 'shippers.id', 'don_hangs.id_shipper')
            ->leftJoin('dia_chis', 'dia_chis.id', 'don_hangs.id_dia_chi_nhan')
            ->join('quan_huyens', 'quan_huyens.id', 'dia_chis.id_quan_huyen')
            ->join('tinh_thanhs', 'tinh_thanhs.id', 'quan_huyens.id_tinh_thanh')
            ->leftJoin('vouchers', 'vouchers.id', 'don_hangs.id_voucher')
            ->select(
                'don_hangs.*',
                'quan_ans.ten_quan_an',
                'quan_ans.hinh_anh as hinh_anh_quan',
                'quan_ans.dia_chi as dia_chi_quan',
                'quan_ans.so_dien_thoai as sdt_quan',
                'shippers.ho_va_ten as ho_va_ten_shipper',
                'shippers.so_dien_thoai as sdt_shipper',
                'shippers.hinh_anh as hinh_anh_shipper',
                'dia_chis.dia_chi',
                'quan_huyens.ten_quan_huyen',
                'tinh_thanhs.ten_tinh_thanh',
                'dia_chis.ten_nguoi_nhan',
                'dia_chis.so_dien_thoai as sdt_nguoi_nhan',
                'vouchers.ma_code',
                'vouchers.ten_voucher',
                'vouchers.loai_giam',
                'vouchers.so_giam_gia',
                'vouchers.so_tien_toi_da',
                'khach_hangs.avatar',
                'khach_hangs.ho_va_ten'
            )
            ->first();

        if (!$donHang) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy đơn hàng'
            ], 404);
        }

        // Lấy thông tin chi tiết các món ăn
        $chiTietMonAn = ChiTietDonHang::where('chi_tiet_don_hangs.id_don_hang', $request->id)
            ->join('mon_ans', 'mon_ans.id', 'chi_tiet_don_hangs.id_mon_an')
            ->select(
                'chi_tiet_don_hangs.id',
                'mon_ans.id as id_mon_an',
                'mon_ans.ten_mon_an',
                'mon_ans.hinh_anh',
                'chi_tiet_don_hangs.so_luong',
                'chi_tiet_don_hangs.don_gia',
                'chi_tiet_don_hangs.thanh_tien',
                'chi_tiet_don_hangs.ghi_chu',
                'chi_tiet_don_hangs.id_size',
                'chi_tiet_don_hangs.ten_size'
            )
            ->orderBy('chi_tiet_don_hangs.id', 'asc')
            ->get();

        return response()->json([
            'status' => true,
            'don_hang' => $donHang,
            'chi_tiet_mon_an' => $chiTietMonAn,
            'tong_so_mon' => $chiTietMonAn->count()
        ]);
    }

    public function getDonHangQuanAn()
    {
        $user = Auth::guard('sanctum')->user();

        $data = DonHang::where('don_hangs.id_quan_an', $user->id)
            ->where('don_hangs.tinh_trang', '>=', 1)
            ->join('khach_hangs', 'khach_hangs.id', 'don_hangs.id_khach_hang')
            ->leftJoin('shippers', 'shippers.id', 'don_hangs.id_shipper')
            ->leftJoin('vouchers', 'vouchers.id', 'don_hangs.id_voucher')
            ->select(
                'don_hangs.id',
                'don_hangs.created_at',
                'don_hangs.ma_don_hang',
                'don_hangs.tien_hang',
                'don_hangs.phi_ship',
                'don_hangs.tong_tien',
                'don_hangs.tien_giam_tu_xu',
                'don_hangs.tien_quan_an',
                'don_hangs.da_doi_soat',
                'don_hangs.id_voucher',
                'don_hangs.is_thanh_toan',
                'don_hangs.phuong_thuc_thanh_toan',
                'don_hangs.tinh_trang',
                'don_hangs.ten_nguoi_nhan',
                'shippers.ho_va_ten as ho_va_ten_shipper',
                'vouchers.ma_code as ma_voucher',
                DB::raw('(don_hangs.tien_hang + don_hangs.phi_ship - don_hangs.tong_tien - don_hangs.tien_giam_tu_xu) as chiet_khau_voucher')
            )
            ->orderBy('don_hangs.id', 'desc')
            ->get();

        return response()->json([
            'data'   => $data,
            'status' => 1
        ]);
    }



    public function chiTietDonHangQuanAn(Request $request)
    {
        $user = Auth::guard('sanctum')->user();

        // Lấy thông tin đơn hàng với đầy đủ địa chỉ
        $donHangQuery = DonHang::where('don_hangs.id', $request->id)
            ->leftJoin('quan_ans', 'quan_ans.id', 'don_hangs.id_quan_an')
            ->leftJoin('khach_hangs', 'khach_hangs.id', 'don_hangs.id_khach_hang')
            ->leftJoin('dia_chis', 'dia_chis.id', 'don_hangs.id_dia_chi_nhan')
            ->leftJoin('quan_huyens', 'quan_huyens.id', 'dia_chis.id_quan_huyen')
            ->leftJoin('tinh_thanhs', 'tinh_thanhs.id', 'quan_huyens.id_tinh_thanh')
            ->leftJoin('vouchers', 'vouchers.id', 'don_hangs.id_voucher')
            ->select(
                'don_hangs.*',
                'quan_ans.ten_quan_an',
                'quan_ans.hinh_anh',
                'quan_ans.dia_chi as dia_chi_quan',
                'khach_hangs.avatar',
                'dia_chis.dia_chi as dia_chi_khach',
                'quan_huyens.ten_quan_huyen',
                'tinh_thanhs.ten_tinh_thanh',
                'vouchers.ten_voucher',
                'vouchers.ma_code',
                'vouchers.loai_giam',
                'vouchers.so_giam_gia',
                'vouchers.so_tien_toi_da'
            );

        // Check if user is quan_an or shipper
        if (property_exists($user, 'id_quan_an') && $user->id_quan_an) {
            // User is quan_an
            $donHangQuery->where('don_hangs.id_quan_an', $user->id);
        } else {
            // User is shipper
            $donHangQuery->where(function ($query) use ($user) {
                $query->where('don_hangs.id_shipper', $user->id)
                      ->orWhereIn('don_hangs.tinh_trang', [0, 1]);
            });
        }

        $donHang = $donHangQuery->first();

        // Thêm thông tin tiền hàng và tiền giảm voucher nếu có
        if ($donHang && $donHang->id_voucher) {
            $donHang->tien_giam_voucher = $donHang->tien_hang - ($donHang->tong_tien - $donHang->phi_ship);
        }

        // Lấy chi tiết món ăn
        $data = ChiTietDonHang::join('mon_ans', 'mon_ans.id', 'chi_tiet_don_hangs.id_mon_an')
            ->where('chi_tiet_don_hangs.id_don_hang', $request->id)
            ->select(
                'mon_ans.ten_mon_an',
                'chi_tiet_don_hangs.so_luong',
                'chi_tiet_don_hangs.don_gia',
                'chi_tiet_don_hangs.thanh_tien',
                'chi_tiet_don_hangs.ghi_chu',
                'chi_tiet_don_hangs.id_size',
                'chi_tiet_don_hangs.ten_size',
                'mon_ans.hinh_anh'
            )
            ->get();

        return response()->json([
            'status'    =>  1,
            'data'      =>  $data,
            'don_hang'  =>  $donHang,
        ]);
    }

    public function getDonHangShipper()
    {
        $list_don_hang_co_the_nhan = DonHang::where('don_hangs.id_shipper', 0)
            ->where('don_hangs.tinh_trang', 0)
            ->where(function ($query) {
                // Đơn tiền mặt (COD)
                $query->where('don_hangs.phuong_thuc_thanh_toan', DonHang::thanh_toan_tien_mat)
                    // Hoặc các đơn đã thanh toán Online (Chuyển khoản hoặc PayOS)
                    ->orWhere(function ($q) {
                        $q->whereIn('don_hangs.phuong_thuc_thanh_toan', [DonHang::thanh_toan_chuyen_khoan, 3])
                            ->where('don_hangs.is_thanh_toan', 1);
                    });
            })
            ->join('quan_ans', 'quan_ans.id', 'don_hangs.id_quan_an')
            ->join('khach_hangs', 'khach_hangs.id', 'don_hangs.id_khach_hang')
            ->join('dia_chis', 'dia_chis.id', 'don_hangs.id_dia_chi_nhan')
            ->join('quan_huyens', 'quan_huyens.id', 'dia_chis.id_quan_huyen')
            ->join('tinh_thanhs', 'tinh_thanhs.id', 'quan_huyens.id_tinh_thanh')
            ->select(
                'don_hangs.id',
                'don_hangs.ma_don_hang',
                'don_hangs.is_thanh_toan',
                'don_hangs.phuong_thuc_thanh_toan',
                'quan_ans.ten_quan_an',
                'quan_ans.hinh_anh',
                'quan_ans.dia_chi as dia_chi_quan',
                'don_hangs.ten_nguoi_nhan',
                'khach_hangs.avatar',
                'dia_chis.dia_chi as dia_chi_khach',
                'quan_huyens.ten_quan_huyen',
                'tinh_thanhs.ten_tinh_thanh',
                'don_hangs.tong_tien',
                'don_hangs.phi_ship',
                'don_hangs.created_at',
                DB::raw('DATE_FORMAT(don_hangs.created_at, "%H:%i") as gio_tao_don')
            )
            ->orderBy('don_hangs.id', 'desc')
            ->get();
        return response()->json([
            'list_don_hang_co_the_nhan' => $list_don_hang_co_the_nhan,
        ]);
    }

    public function getDonHangShipperDangGiao()
    {
        $user = Auth::guard('sanctum')->user();
        $list_don_hang_co_the_nhan = DonHang::where('don_hangs.id_shipper', $user->id)
            ->whereIn('don_hangs.tinh_trang', [1, 2, 3])
            ->join('quan_ans', 'quan_ans.id', 'don_hangs.id_quan_an')
            ->join('khach_hangs', 'khach_hangs.id', 'don_hangs.id_khach_hang')
            ->join('dia_chis', 'dia_chis.id', 'don_hangs.id_dia_chi_nhan')
            ->join('quan_huyens', 'quan_huyens.id', 'dia_chis.id_quan_huyen')
            ->join('tinh_thanhs', 'tinh_thanhs.id', 'quan_huyens.id_tinh_thanh')
            ->select(
                'don_hangs.id',
                'don_hangs.ma_don_hang',
                'don_hangs.is_thanh_toan',
                'don_hangs.phuong_thuc_thanh_toan',
                'quan_ans.ten_quan_an',
                'quan_ans.hinh_anh',
                'quan_ans.dia_chi as dia_chi_quan',
                'don_hangs.ten_nguoi_nhan',
                'khach_hangs.avatar',
                'dia_chis.dia_chi as dia_chi_khach',
                'quan_huyens.ten_quan_huyen',
                'tinh_thanhs.ten_tinh_thanh',
                'don_hangs.tong_tien',
                'don_hangs.tien_hang',
                'don_hangs.phi_ship',
                'don_hangs.tinh_trang',
                'don_hangs.created_at',
            )
            ->orderBy('don_hangs.id', 'desc')
            ->get();
        $list_don_hang_hoan_thanh = DonHang::where('don_hangs.id_shipper', $user->id)
            ->whereIn('don_hangs.tinh_trang', [4])
            ->join('quan_ans', 'quan_ans.id', 'don_hangs.id_quan_an')
            ->join('khach_hangs', 'khach_hangs.id', 'don_hangs.id_khach_hang')
            ->join('dia_chis', 'dia_chis.id', 'don_hangs.id_dia_chi_nhan')
            ->join('quan_huyens', 'quan_huyens.id', 'dia_chis.id_quan_huyen')
            ->join('tinh_thanhs', 'tinh_thanhs.id', 'quan_huyens.id_tinh_thanh')
            ->select(
                'don_hangs.id',
                'don_hangs.ma_don_hang',
                'don_hangs.is_thanh_toan',
                'don_hangs.phuong_thuc_thanh_toan',
                'quan_ans.ten_quan_an',
                'quan_ans.hinh_anh',
                'quan_ans.dia_chi as dia_chi_quan',
                'don_hangs.ten_nguoi_nhan',
                'khach_hangs.avatar',
                'dia_chis.dia_chi as dia_chi_khach',
                'quan_huyens.ten_quan_huyen',
                'tinh_thanhs.ten_tinh_thanh',
                'don_hangs.tong_tien',
                'don_hangs.phi_ship',
                'don_hangs.tinh_trang',
                'don_hangs.created_at',
            )
            ->orderBy('don_hangs.id', 'desc')
            ->get();

        // Đơn hàng đã hủy mà shipper từng nhận
        $list_don_hang_da_huy = DonHang::where('don_hangs.id_shipper', $user->id)
            ->whereIn('don_hangs.tinh_trang', [5])
            ->join('quan_ans', 'quan_ans.id', 'don_hangs.id_quan_an')
            ->join('khach_hangs', 'khach_hangs.id', 'don_hangs.id_khach_hang')
            ->join('dia_chis', 'dia_chis.id', 'don_hangs.id_dia_chi_nhan')
            ->join('quan_huyens', 'quan_huyens.id', 'dia_chis.id_quan_huyen')
            ->join('tinh_thanhs', 'tinh_thanhs.id', 'quan_huyens.id_tinh_thanh')
            ->select(
                'don_hangs.id',
                'don_hangs.ma_don_hang',
                'don_hangs.is_thanh_toan',
                'don_hangs.phuong_thuc_thanh_toan',
                'quan_ans.ten_quan_an',
                'quan_ans.hinh_anh',
                'quan_ans.dia_chi as dia_chi_quan',
                'don_hangs.ten_nguoi_nhan',
                'khach_hangs.avatar',
                'dia_chis.dia_chi as dia_chi_khach',
                'quan_huyens.ten_quan_huyen',
                'tinh_thanhs.ten_tinh_thanh',
                'don_hangs.tong_tien',
                'don_hangs.tien_hang',
                'don_hangs.phi_ship',
                'don_hangs.tinh_trang',
                'don_hangs.created_at',
            )
            ->orderBy('don_hangs.id', 'desc')
            ->get();

        return response()->json([
            'data'                      => $list_don_hang_co_the_nhan,
            'list_don_hang_hoan_thanh'  => $list_don_hang_hoan_thanh,
            'list_don_hang_da_huy'      => $list_don_hang_da_huy,
        ]);
    }

    public function hoanThanhDonHangShipper(Request $request)
    {
        $user = Auth::guard('sanctum')->user();

        $donHang = DonHang::where('id', $request->id)
            ->where('id_shipper', $user->id)
            ->where('tinh_trang', 3) // Trạng thái 3: Đang giao
            ->first();

        if ($donHang) {
            $updateData = [
                'is_thanh_toan' => 1,
                'tinh_trang'    => 4, // Trạng thái 4: Đã hoàn thành
            ];
            
            // Nếu là đơn hàng COD (phuong_thuc_thanh_toan = 1), shipper sẽ nhận tiền từ khách
            if ($donHang->phuong_thuc_thanh_toan == 1) {
                $updateData['so_tien_nhan'] = $donHang->tong_tien;
            }

            if ($request->hasFile('anh_giao_hang')) {
                try {
                    $file = $request->file('anh_giao_hang');
                    $file_extention = $file->getClientOriginalExtension();
                    $file_name = 'proof_' . $donHang->id . '_' . time() . '.' . $file_extention;
                    $cho_luu = "ShipperProof/" . $file_name;
                    $file->move("ShipperProof", $file_name);
                    
                    $updateData['anh_giao_hang'] = env('APP_URL', 'https://be-foodbee.edu.vn') . '/' . $cho_luu;
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Lỗi upload ảnh giao hàng: " . $e->getMessage());
                }
            } elseif ($request->has('anh_giao_hang_base64')) {
                try {
                    $base64_image = $request->input('anh_giao_hang_base64');
                    // Tách header data:image/png;base64,... nếu có
                    if (preg_match('/^data:image\/(\w+);base64,/', $base64_image, $type)) {
                        $base64_image = substr($base64_image, strpos($base64_image, ',') + 1);
                        $type = strtolower($type[1]);
                        
                        $base64_image = str_replace(' ', '+', $base64_image);
                        $image_data = base64_decode($base64_image);
                        
                        if ($image_data !== false) {
                            $file_name = 'proof_' . $donHang->id . '_' . time() . '.' . $type;
                            $cho_luu = "ShipperProof/" . $file_name;
                            
                            if (!file_exists(public_path("ShipperProof"))) {
                                mkdir(public_path("ShipperProof"), 0777, true);
                            }
                            file_put_contents(public_path($cho_luu), $image_data);
                            
                            $updateData['anh_giao_hang'] = env('APP_URL', 'https://be-foodbee.edu.vn') . '/' . $cho_luu;
                        }
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error("Lỗi upload ảnh giao hàng base64: " . $e->getMessage());
                }
            }

            $donHang->update($updateData);

            $donHang->refresh(); // Đảm bảo trạng thái mới nhất được nạp vào Event

            // TRIGGER EVENT
            try {
                event(new DonHangHoanThanhEvent($donHang));
            } catch (Exception $e) {
                \Illuminate\Support\Facades\Log::error('Lỗi khi phát sự kiện DonHangHoanThanhEvent: ' . $e->getMessage());
            }

            $donHang->refresh();
            if ($donHang->xu_tich_luy > 0) {
                $khachHang = \App\Models\KhachHang::find($donHang->id_khach_hang);
                if ($khachHang) {
                    $khachHang->diem_xu += $donHang->xu_tich_luy;
                    $khachHang->save();
                    \App\Models\LichSuXu::create([
                        'id_khach_hang'     => $khachHang->id,
                        'id_don_hang'       => $donHang->id,
                        'so_xu'             => $donHang->xu_tich_luy,
                        'loai_giao_dich'    => 1, 
                        'mo_ta'             => 'Tích lũy xu từ đơn hàng ' . $donHang->ma_don_hang,
                    ]);
                }
            }
            WalletService::doiSoatDonHang($donHang);

            // ── GỬI EMAIL HOÀN THÀNH ĐƠN HÀNG ─────────────────────────────
            try {
                $khachHangEmail = \App\Models\KhachHang::find($donHang->id_khach_hang);
                $quanAn = \App\Models\QuanAn::find($donHang->id_quan_an);
                $shipper = \App\Models\Shipper::find($donHang->id_shipper);
                if ($khachHangEmail) {
                    \App\Jobs\SendMailJob::dispatch(
                        $khachHangEmail->email,
                        '✅ Đơn hàng hoàn thành - #' . $donHang->ma_don_hang,
                        'emails.don_hang_hoan_thanh',
                        [
                            'ho_ten'       => $khachHangEmail->ho_va_ten,
                            'ma_don_hang'  => $donHang->ma_don_hang,
                            'ten_quan'     => $quanAn->ten_quan_an ?? '',
                            'ten_shipper'  => $shipper->ho_va_ten ?? '',
                            'tong_tien'    => $donHang->tong_tien,
                            'xu_tich_luy'  => $donHang->xu_tich_luy ?? 0,
                        ]
                    );
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Lỗi gửi email hoàn thành đơn: ' . $e->getMessage());
            }
        }

        return response()->json([
            'status'    =>  1,
            'message'   =>  'Đã hoàn thành đơn hàng!!',
        ]);
    }

    public function quanAnNhanDon(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        $donHang = DonHang::where('id', $request->id)
            ->where('id_quan_an', $user->id)
            ->where('tinh_trang', 1) // Chờ quán nhận
            ->first();

        if (!$donHang) return response()->json(['status' => 0, 'message' => 'Đơn hàng không khả dụng']);

        $donHang->update(['tinh_trang' => 2]); // Đang chế biến

        try {
            event(new \App\Events\DonHangQuanDangLamEvent($donHang));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Lỗi khi phát sự kiện DonHangQuanDangLamEvent: ' . $e->getMessage());
        }

        // Có thể bắn thêm event nếu cần khách hàng biết quán đã nhận
        return response()->json(['status' => 1, 'message' => 'Đã nhận đơn và bắt đầu chế biến!']);
    }

    public function daXongDonHang(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        $donHang = DonHang::where('id', $request->id)
            ->where('id_quan_an', $user->id)
            ->where('tinh_trang', 2) // Quán đang làm -> Xong
            ->first();

        if ($donHang) {
            $donHang->update(['tinh_trang' => 3]); // Chuyển sang đang giao

            try {
                event(new DonHangDaXongEvent($donHang));
            } catch (Exception $e) {
                \Illuminate\Support\Facades\Log::error('Lỗi khi phát sự kiện DonHangDaXongEvent: ' . $e->getMessage());
            }
            return response()->json(['status' => 1, 'message' => 'Đã chuẩn bị xong, mời shipper đến lấy!']);
        }
        return response()->json(['status' => 0, 'message' => 'Lỗi cập nhật']);
    }

    public function nhanDonDonHangShipper(ShipperNhanDonHangRequest $request)
    {
        $user = Auth::guard('sanctum')->user();

        $check = DonHang::where('id', $request->id)
            ->where('id_shipper', 0)
            ->first();

        if (!$check) {
            return response()->json([
                'status'  => 0,
                'message' => 'Đơn hàng này đã có người nhận!!',
            ]);
        }

        // ===== ĐƠN TIỀN MẶT: Bắt buộc đặt cọc trước =====
        if ($check->phuong_thuc_thanh_toan == DonHang::thanh_toan_tien_mat) {
            $ketQua = WalletService::thanhToanDonHangCOD($check, $user->id);
            if (!$ketQua['ok']) {
                return response()->json([
                    'status'  => 0,
                    'message' => $ketQua['message'],
                    'can_nop_tien' => true, // Flag để frontend biết cần nộp tiền
                ]);
            }
        }

        $check->update([
            'id_shipper' => $user->id,
            'tinh_trang' => 1,
        ]);

        $check->refresh(); // Đảm bảo dữ liệu mới nhất (bao gồm cả id_shipper và tinh_trang)

        \Illuminate\Support\Facades\Log::info("Shipper {$user->id} đã nhận đơn #{$check->ma_don_hang}. Phương thức: " . ($check->phuong_thuc_thanh_toan == 1 ? 'COD' : 'Online'));

        // Trigger Broadcasting Event: Thông báo shipper đã nhận đơn
        try {
            \Illuminate\Support\Facades\Log::info("Đang phát sự kiện DonHangDaNhanEvent cho đơn #{$check->ma_don_hang}...");
            event(new DonHangDaNhanEvent($check));
            \Illuminate\Support\Facades\Log::info("Đã phát xong sự kiện DonHangDaNhanEvent.");
        } catch (Exception $e) {
            \Illuminate\Support\Facades\Log::error('Lỗi khi phát sự kiện DonHangDaNhanEvent: ' . $e->getMessage());
        }

        return response()->json([
            'status'  => 1,
            'message' => $check->phuong_thuc_thanh_toan == DonHang::thanh_toan_tien_mat
                ? 'Đã nhận đơn! Bạn đã thanh toán tiền hàng cho quán & phí hệ thống. Hãy thu ' . number_format($check->tong_tien, 0, ',', '.') . 'đ tiền mặt từ khách khi giao xong.'
                : 'Đã nhận đơn hàng thành công!',
        ]);
    }

    public function getDonHangAdmin()
    {
        $data = DonHang::join('quan_ans', 'quan_ans.id', 'don_hangs.id_quan_an')
            ->join('khach_hangs', 'khach_hangs.id', 'don_hangs.id_khach_hang')
            ->leftjoin('shippers', 'shippers.id', 'don_hangs.id_shipper')
            ->leftJoin('vouchers', 'vouchers.id', 'don_hangs.id_voucher')
            ->select(
                'don_hangs.*',
                'quan_ans.ten_quan_an',
                'khach_hangs.ho_va_ten as ho_va_ten_khach_hang',
                'shippers.ho_va_ten as ho_va_ten_shipper',
                'vouchers.ma_code as ma_voucher',
                // Tính luôn chiết khấu voucher trực tiếp trong query nếu cần, hoặc trả về tien_hang + phi_ship - tong_tien - tien_giam_tu_xu
                \Illuminate\Support\Facades\DB::raw('(don_hangs.tien_hang + don_hangs.phi_ship - don_hangs.tong_tien - don_hangs.tien_giam_tu_xu) as chiet_khau_voucher')
            )
            ->orderBy('don_hangs.id', 'desc')
            ->get();

        return response()->json([
            'status' => true,
            'data'   => $data,
        ]);
    }

    public function getChiTietDonHangAdmin(Request $request)
    {
        $data = ChiTietDonHang::where('chi_tiet_don_hangs.id_don_hang', $request->id)
            ->join('mon_ans', 'mon_ans.id', 'chi_tiet_don_hangs.id_mon_an')
            ->select(
                'mon_ans.ten_mon_an',
                'chi_tiet_don_hangs.so_luong',
                'chi_tiet_don_hangs.don_gia',
                'chi_tiet_don_hangs.thanh_tien',
                'chi_tiet_don_hangs.ghi_chu',
                'chi_tiet_don_hangs.id_size',
                'chi_tiet_don_hangs.ten_size'

            )
            ->get();
        return response()->json([
            'status' => true,
            'data'   => $data
        ]);
    }

    public function huyDonHangAdmin(HuyDonHangRequest $request)
    {
        $donHang = DonHang::find($request->id);

        if (!$donHang) {
            return response()->json(['status' => 0, 'message' => 'Không tìm thấy đơn hàng'], 404);
        }

        DonHang::where('id', $request->id)->update([
            'tinh_trang' => 5,
            'ly_do'      => 'admin',
        ]);
        $donHang->refresh();

        // ── Hoàn xu và voucher cho khách ────────────────────────
        try {
            WalletService::hoanXuVaVoucher($donHang);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Không thể hoàn xu/voucher: ' . $e->getMessage());
        }

        // ── Hoàn cọc COD về ví shipper (nếu shipper đã nhận đơn COD) ──
        if ($donHang->id_shipper && $donHang->da_dat_coc && $donHang->phuong_thuc_thanh_toan == DonHang::thanh_toan_tien_mat) {
            try {
                WalletService::hoanCocCODChoShipper($donHang);
                \Illuminate\Support\Facades\Log::info("[huyDonHangAdmin] Đã hoàn cọc COD cho shipper #{$donHang->id_shipper} (đơn #{$donHang->ma_don_hang})");
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Không thể hoàn cọc COD shipper: ' . $e->getMessage());
            }
        }

        // ── Tự động hoàn tiền nếu đơn đã thanh toán PayOS ──────
        $se_hoan_tien = false;
        if ($donHang->is_thanh_toan == 1 && $donHang->phuong_thuc_thanh_toan == DonHang::thanh_toan_payos) {
            $enabled = CauHinh::getVal('refund_enabled', 1);
            $delay   = intval(CauHinh::getVal('refund_delay_minutes', 5));
            if ($enabled) {
                RefundPayOSJob::dispatch($donHang->id, $donHang->tong_tien, 'Admin hủy đơn - hoàn tiền tự động')
                    ->delay(now()->addMinutes($delay));
                $se_hoan_tien = true;
            }
        }

        // ── Notification DB cho Khách hàng ──────────────────────
        try {
            $khachHang = \App\Models\KhachHang::find($donHang->id_khach_hang);
            $quanAn    = \App\Models\QuanAn::find($donHang->id_quan_an);

            if ($khachHang) {
                $msgKhach = "Đơn #{$donHang->ma_don_hang} của bạn đã bị admin hủy."
                    . ($donHang->xu_su_dung > 0 ? " Xu và voucher đã được hoàn lại." : "")
                    . ($se_hoan_tien ? " Tiền sẽ được hoàn về tài khoản ngân hàng của bạn." : "");

                $khachHang->notify(new \App\Notifications\OrderCancelledKhachHangNotification(
                    $donHang, $msgKhach, 'admin'
                ));

                // Gửi email kèm (giữ nguyên)
                \App\Jobs\SendMailJob::dispatch(
                    $khachHang->email,
                    '❌ Đơn hàng đã hủy - #' . $donHang->ma_don_hang,
                    'emails.don_hang_huy',
                    [
                        'ho_ten'       => $khachHang->ho_va_ten,
                        'ma_don_hang'  => $donHang->ma_don_hang,
                        'ten_quan'     => $quanAn->ten_quan_an ?? '',
                        'tong_tien'    => $donHang->tong_tien,
                        'ly_do'        => 'Admin hủy đơn',
                        'se_hoan_tien' => $se_hoan_tien,
                    ]
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Lỗi gửi thông báo/email hủy đơn cho khách: ' . $e->getMessage());
        }

        // ── Notification DB cho Shipper (nếu đã nhận đơn) ───────
        if ($donHang->id_shipper) {
            try {
                $shipper = Shipper::find($donHang->id_shipper);
                if ($shipper) {
                    $msgShipper = $donHang->da_dat_coc
                        ? "Đơn #{$donHang->ma_don_hang} đã bị admin hủy. Tiền cọc COD đã được hoàn lại vào ví của bạn."
                        : "Đơn #{$donHang->ma_don_hang} đã bị admin hủy.";

                    $shipper->notify(new \App\Notifications\OrderCancelledShipperNotification(
                        $donHang, $msgShipper
                    ));
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Lỗi gửi thông báo hủy đơn cho shipper: ' . $e->getMessage());
            }
        }

        // ── Broadcast realtime ───────────────────────────────────
        try {
            event(new \App\Events\DonHangDaHuyEvent($donHang));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Lỗi broadcast hủy đơn admin: ' . $e->getMessage());
        }

        return response()->json([
            'status'  => 1,
            'message' => "Đã hủy đơn hàng thành công!!",
        ]);
    }

    /**
     * API cho Admin theo dõi vị trí đơn hàng đang giao
     */
    public function theoDoiDonHangAdmin(Request $request)
    {
        $donHang = DonHang::where('don_hangs.id', $request->id)
            ->leftJoin('shippers', 'shippers.id', 'don_hangs.id_shipper')
            ->join('quan_ans', 'quan_ans.id', 'don_hangs.id_quan_an')
            ->leftJoin('dia_chis', 'dia_chis.id', 'don_hangs.id_dia_chi_nhan')
            ->select(
                'don_hangs.id',
                'don_hangs.ma_don_hang',
                'don_hangs.tinh_trang',
                'don_hangs.created_at',
                // Shipper
                'shippers.ho_va_ten as shipper_name',
                'shippers.so_dien_thoai as shipper_phone',
                'shippers.lat as shipper_lat',
                'shippers.lng as shipper_lng',
                'shippers.last_location_update',
                // Quán ăn
                'quan_ans.ten_quan_an',
                'quan_ans.dia_chi as restaurant_address',
                'quan_ans.toa_do_y as restaurant_lat',
                'quan_ans.toa_do_x as restaurant_lng',
                // Khách hàng
                'dia_chis.dia_chi as customer_address',
                'dia_chis.toa_do_y as customer_lat',
                'dia_chis.toa_do_x as customer_lng'
            )
            ->first();

        if (!$donHang) {
            return response()->json(['status' => false, 'message' => 'Không tìm thấy đơn hàng'], 404);
        }

        return response()->json([
            'status' => true,
            'order'  => $donHang,
        ]);
    }

    // ============ REAL-TIME ORDER TRACKING ============

    /**
     * API cho khách hàng theo dõi đơn hàng real-time
     */
    public function theoDoiDonHangKhachHang(Request $request)
    {
        $user = Auth::guard('sanctum')->user();

        // Validate
        if (!$request->id) {
            return response()->json([
                'status' => false,
                'message' => 'Vui lòng cung cấp ID đơn hàng'
            ], 400);
        }

        // Lấy thông tin đơn hàng với vị trí shipper, quán ăn, và khách hàng
        $donHang = DonHang::where('don_hangs.id', $request->id)
            ->where('don_hangs.id_khach_hang', $user->id)
            ->leftJoin('shippers', 'shippers.id', 'don_hangs.id_shipper')
            ->leftJoin('quan_ans', 'quan_ans.id', 'don_hangs.id_quan_an')
            ->leftJoin('dia_chis', 'dia_chis.id', 'don_hangs.id_dia_chi_nhan')
            ->select(
                'don_hangs.id',
                'don_hangs.ma_don_hang',
                'don_hangs.tinh_trang',
                'don_hangs.created_at',

                // Shipper info & location
                'shippers.id as shipper_id',
                'shippers.ho_va_ten as shipper_name',
                'shippers.so_dien_thoai as shipper_phone',
                'shippers.hinh_anh as shipper_avatar',
                'shippers.lat as shipper_lat',
                'shippers.lng as shipper_lng',
                'shippers.last_location_update',

                // Restaurant location
                'quan_ans.ten_quan_an',
                'quan_ans.dia_chi as restaurant_address',
                'quan_ans.toa_do_y as restaurant_lat',  // toa_do_y = latitude
                'quan_ans.toa_do_x as restaurant_lng',  // toa_do_x = longitude

                // Customer location
                'dia_chis.dia_chi as customer_address',
                'dia_chis.toa_do_y as customer_lat',    // toa_do_y = latitude
                'dia_chis.toa_do_x as customer_lng'     // toa_do_x = longitude
            )
            ->first();

        if (!$donHang) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy đơn hàng'
            ], 404);
        }

        // Kiểm tra trạng thái có thể theo dõi
        // Chỉ cho phép tracking khi: tinh_trang = 1 (shipper nhận), 2 (đang nấu), 3 (đang giao)
        $canTrack = in_array($donHang->tinh_trang, [1, 2, 3]);

        return response()->json([
            'status' => true,
            'can_track' => $canTrack,
            'order' => $donHang,
            'tracking_channel' => 'order.' . $donHang->id
        ]);
    }

    /**
     * API cho shipper cập nhật vị trí real-time
     * Cho phép cập nhật vị trí dù có đơn hàng hay không
     */
    public function capNhatViTriShipper(Request $request)
    {
        $user = Auth::guard('sanctum')->user();

        // Validate - id_don_hang là optional
        $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'id_don_hang' => 'nullable|exists:don_hangs,id'
        ]);

        // Luôn update vị trí shipper trong DB (dù có đơn hay không)
        DB::table('shippers')
            ->where('id', $user->id)
            ->update([
                'lat' => $request->lat,
                'lng' => $request->lng,
                'last_location_update' => now()
            ]);

        // Nếu có id_don_hang, broadcast vị trí cho khách hàng theo dõi
        if ($request->id_don_hang) {
            // Kiểm tra shipper có đang giao đơn này không
            $donHang = DonHang::where('id', $request->id_don_hang)
                ->where('id_shipper', $user->id)
                ->whereIn('tinh_trang', [1, 2]) // Chỉ broadcast khi đơn đang giao
                ->first();

            if ($donHang) {
                // Broadcast vị trí mới qua WebSocket
                try {
                    event(new ShipperLocationUpdated(
                        $donHang->id,
                        $user->id,
                        $request->lat,
                        $request->lng
                    ));
                } catch (Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Lỗi khi phát sự kiện ShipperLocationUpdated: ' . $e->getMessage());
                }
            }
        }

        return response()->json([
            'status' => true,
            'message' => 'Đã cập nhật vị trí'
        ]);
    }

    public function danhGiaDonHang(Request $request)
    {
        $khach_hang = Auth::guard('sanctum')->user();
        if (!$khach_hang) {
            return response()->json([
                'status' => false,
                'message' => 'Người dùng chưa xác thực'
            ], 401);
        }

        $donHang = DonHang::find($request->id_don_hang);
        if (!$donHang) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy đơn hàng'
            ]);
        }

        // Check if already rated
        $danhGiaTonTai = DanhGia::where('id_don_hang', $request->id_don_hang)->first();
        if ($danhGiaTonTai) {
            return response()->json([
                'status' => false,
                'message' => 'Đơn hàng này đã được đánh giá'
            ]);
        }

        DanhGia::create([
            'id_don_hang'      => $request->id_don_hang,
            'id_khach_hang'    => $khach_hang->id,
            'id_quan_an'       => $donHang->id_quan_an,
            'id_shipper'       => $donHang->id_shipper,
            'sao_quan_an'      => $request->sao_quan_an,
            'nhan_xet_quan_an' => $request->nhan_xet_quan_an,
            'sao_shipper'      => $request->sao_shipper,
            'nhan_xet_shipper' => $request->nhan_xet_shipper,
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Cảm ơn bạn đã đánh giá đơn hàng'
        ]);
    }

    public function reorder(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        
        $request->validate([
            'id' => 'required|exists:don_hangs,id'
        ]);

        $oldOrder = DonHang::where('id', $request->id)
            ->where('id_khach_hang', $user->id)
            ->first();

        if (!$oldOrder) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy đơn hàng'
            ], 404);
        }

        // Lấy chi tiết đơn hàng cũ
        $items = ChiTietDonHang::where('id_don_hang', $oldOrder->id)->get();

        if ($items->isEmpty()) {
            return response()->json([
                'status' => false,
                'message' => 'Đơn hàng không có món ăn nào'
            ], 400);
        }

        // Optional: Xóa giỏ hàng hiện tại của QUÁN NÀY để 'đúng món đó luôn'
        ChiTietDonHang::where('id_khach_hang', $user->id)
            ->where('id_don_hang', 0)
            ->where('id_quan_an', $oldOrder->id_quan_an)
            ->delete();

        foreach ($items as $it) {
            // Kiểm tra món ăn còn tồn tại và đang bán không
            $monAn = \App\Models\MonAn::find($it->id_mon_an);
            if ($monAn && $monAn->tinh_trang == 1) {
                ChiTietDonHang::create([
                    'id_mon_an'     => $it->id_mon_an,
                    'id_quan_an'    => $it->id_quan_an,
                    'id_khach_hang' => $user->id,
                    'id_don_hang'   => 0, // Vào giỏ hàng
                    'don_gia'       => $it->don_gia,
                    'so_luong'      => $it->so_luong,
                    'thanh_tien'    => $it->thanh_tien,
                    'ghi_chu'       => $it->ghi_chu,
                    'id_size'       => $it->id_size,
                    'ten_size'      => $it->ten_size,
                ]);
            }
        }

        return response()->json([
            'status' => true,
            'message' => 'Đã thêm các món vào giỏ hàng!',
            'id_quan_an' => $oldOrder->id_quan_an
        ]);
    }



    // ─── LỊCH SỬ GIAO DỊCH TIỀN (KHÁCH HÀNG) ────────────────────────
    public function getLichSuGiaoDich()
    {
        $user = Auth::guard('sanctum')->user();

        $data = DonHang::where('don_hangs.id_khach_hang', $user->id)
            ->where('don_hangs.tinh_trang', '!=', 0) // Bỏ đơn chờ
            ->join('quan_ans', 'quan_ans.id', 'don_hangs.id_quan_an')
            ->select(
                'don_hangs.id',
                'don_hangs.ma_don_hang',
                'don_hangs.created_at',
                'don_hangs.tien_hang',
                'don_hangs.phi_ship',
                'don_hangs.tong_tien',
                'don_hangs.tien_giam_tu_xu',
                'don_hangs.is_thanh_toan',
                'don_hangs.phuong_thuc_thanh_toan',
                'don_hangs.tinh_trang',
                'quan_ans.ten_quan_an',
                'quan_ans.hinh_anh as hinh_anh_quan',
                DB::raw('(don_hangs.tien_hang + don_hangs.phi_ship - don_hangs.tong_tien - IFNULL(don_hangs.tien_giam_tu_xu,0)) as tien_giam_voucher')
            )
            ->orderBy('don_hangs.id', 'desc')
            ->get();

        $tong_chi = $data->where('tinh_trang', 4)->sum('tong_tien');
        $so_don_thanh_cong = $data->where('tinh_trang', 4)->count();

        return response()->json([
            'status' => true,
            'data' => $data,
            'tong_chi' => $tong_chi,
            'so_don_thanh_cong' => $so_don_thanh_cong,
        ]);
    }
}
