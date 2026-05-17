<?php

namespace App\Http\Controllers;

use App\Http\Requests\KhachHang\CapNhatKhachHangRequest;
use App\Http\Requests\KhachHang\changeActiveRequest;
use App\Http\Requests\KhachHang\changKhachHangRequest;
use App\Http\Requests\KhachHang\DangKyKhachHangRequest;
use App\Http\Requests\DiaChi\createDiaChiKhachHangRequest;
use App\Http\Requests\DiaChi\deleteDiaChiKhachHangRequest;
use App\Http\Requests\KhachHang\doiMatKhauKhachHangRequest;
use App\Http\Requests\Auth\KhachHangLoginRequest;
use App\Http\Requests\KhachHang\ThemMoiKhachHangRequest;
use App\Http\Requests\DiaChi\updateDiaChiKhachHangRequest;
use App\Http\Requests\KhachHang\updatePasswordKhachHangRequest;
use App\Http\Requests\KhachHang\updateProfileKhachHangRequest;
use App\Http\Requests\KhachHang\CapNhatXuKhachHangRequest;
use App\Http\Requests\KhachHang\XoaKhachHangRequest;
use App\Jobs\SendMailJob;
use App\Mail\MasterMail;
use App\Models\ChiTietDiaChi;
use App\Models\DiaChi;
use App\Models\KhachHang;
use App\Models\MonAn;
use App\Models\PhanQuyen;
use App\Models\QuanHuyen;
use App\Models\TinhThanh;
use Google_Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class KhachHangController extends Controller
{
    public function search(Request $request)
    {
        $noi_dung_tim = '%' . $request->noi_dung_tim . '%';
        $data   =  KhachHang::withSum(['donHangs as tong_chi_tieu' => function ($query) {
                $query->where('tinh_trang', 4);
            }], 'tong_tien')
            ->where('ho_va_ten', 'like', $noi_dung_tim)
            ->get();
        return response()->json([
            'data'  => $data
        ]);
    }
    public function checkToken()
    {
        $user_login = Auth::guard('sanctum')->user();
        if ($user_login) {
            return response()->json([
                'status'    => 1,
                'ho_ten'    => $user_login->ho_va_ten,
                'avatar'    => $user_login->avatar,
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        }
    }
    public function Login(KhachHangLoginRequest $request)
    {
        // Bước 1: Tìm theo email
        $check = KhachHang::where('email', $request->email)->first();

        if (!$check || !Hash::check($request->password, $check->password)) {
            return response()->json([
                'status'  => 0,
                'message' => "Tài khoản hoặc mật khẩu không đúng.",
            ]);
        }
        if ($check->is_active == 0) {
            return response()->json([
                'status'  => 2,
                'message' => "Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để kích hoạt tài khoản!",
            ]);
        }
        if ($check->is_block == 1) {
            return response()->json([
                'status'  => 0,
                'message' => "Tài khoản của bạn đã bị khoá. Vui lòng liên hệ Admin!",
            ]);
        }

        // Đăng nhập thành công
        return response()->json([
            'status'  => 1,
            'message' => "Đăng nhập thành công!",
            'token'   => $check->createToken('token_khach_hang')->plainTextToken,
        ]);
    }
    public function loginGoogle(Request $request)
    {
        $client = new Google_Client(['client_id' => env('CLIENT_GG')]);
        $payload = $client->verifyIdToken($request->credential);
        if ($payload) {
            $email = $payload['email'];
            $ho_va_ten = $payload['name'];

            $user = KhachHang::where('email', $email)->first();
            if ($user) {
                if ($user->is_block == 1) {
                    return response()->json([
                        'status'    => 0,
                        'message'   => 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ Admin!',
                    ]);
                }
                return response()->json([
                    'status'    => 1,
                    'message'   => 'Đăng nhập thành công',
                    'key'       => $user->createToken('key_khach_hang')->plainTextToken,
                ]);
            } else {
                $khachHang = KhachHang::create([
                    'ho_va_ten'     => $ho_va_ten,
                    'email'         => $email,
                    'password'      => bcrypt('google_oauth_' . uniqid()),
                    'so_dien_thoai' => '0123456789',
                    'ngay_sinh'     => '1990-01-01',
                    'is_active'     => 1,
                ]);
                return response()->json([
                    'status'  => 1,
                    'message' => 'Bạn Đăng Ký Tài Khoản  ' . $email . '  Thành Công',
                    'key'       => $khachHang->createToken('key_khach_hang')->plainTextToken,

                ]);
            }
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Có lỗi xảy ra',
            ]);
        }
    }
    public function getData()
    {
        $id_chuc_nang = 12;
        $login = Auth::guard('sanctum')->user();
        // Nếu là master admin thì bỏ qua kiểm tra quyền
        if ($login->is_master != 1) {
            $id_chuc_vu = $login->id_chuc_vu;
            $check_quyen = PhanQuyen::where('id_chuc_vu', $id_chuc_vu)
                ->where('id_chuc_nang', $id_chuc_nang)
                ->first();
            if (!$check_quyen) {
                return response()->json([
                    'data' => false,
                    'message' => "bạn không có quyền thực hiện chức năng này!"
                ]);
            }
        }

        $check = Auth::guard('sanctum')->user();
        if ($check) {
            $data = KhachHang::withSum(['donHangs as tong_chi_tieu' => function ($query) {
                $query->where('tinh_trang', 4);
            }], 'tong_tien')->orderBy('id', 'DESC')->get();
            return response()->json([
                'status'    => 1,
                'data'      => $data
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        }
    }
    public function store(ThemMoiKhachHangRequest $request)
    {
        $id_chuc_nang = 13;
        $login = Auth::guard('sanctum')->user();
        // Nếu là master admin thì bỏ qua kiểm tra quyền
        if ($login->is_master != 1) {
            $id_chuc_vu = $login->id_chuc_vu;
            $check_quyen = PhanQuyen::where('id_chuc_vu', $id_chuc_vu)
                ->where('id_chuc_nang', $id_chuc_nang)
                ->first();
            if (!$check_quyen) {
                return response()->json([
                    'data' => false,
                    'message' => "bạn không có quyền thực hiện chức năng này!"
                ]);
            }
        }
        $check = Auth::guard('sanctum')->user();
        if (!$check) {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        } else {
            $data = KhachHang::create([
                'ho_va_ten'     => $request->ho_va_ten,
                'so_dien_thoai' => $request->so_dien_thoai,
                'email'         => $request->email,
                'password'      => bcrypt($request->password),
                'ngay_sinh'     => $request->ngay_sinh,
            ]);
            return response()->json([
                'status'    => 1,
                'message'   => 'Thêm Mới khách hàng thành công!',
                'data'      => $data
            ]);
        }
    }
    public function destroy(XoaKhachHangRequest $request)
    {
        $id_chuc_nang = 15;
        $login = Auth::guard('sanctum')->user();
        // Nếu là master admin thì bỏ qua kiểm tra quyền
        if ($login->is_master != 1) {
            $id_chuc_vu = $login->id_chuc_vu;
            $check_quyen = PhanQuyen::where('id_chuc_vu', $id_chuc_vu)
                ->where('id_chuc_nang', $id_chuc_nang)
                ->first();
            if (!$check_quyen) {
                return response()->json([
                    'data' => false,
                    'message' => "bạn không có quyền thực hiện chức năng này!"
                ]);
            }
        }
        $data = KhachHang::find($request->id);
        $data->delete();
        return response()->json([
            'status' => 1,
            'message' => 'Xóa khách hàng thành công'
        ]);
    }
    public function update(CapNhatKhachHangRequest $request)
    {
        $id_chuc_nang = 14;
        $login = Auth::guard('sanctum')->user();
        // Nếu là master admin thì bỏ qua kiểm tra quyền
        if ($login->is_master != 1) {
            $id_chuc_vu = $login->id_chuc_vu;
            $check_quyen = PhanQuyen::where('id_chuc_vu', $id_chuc_vu)
                ->where('id_chuc_nang', $id_chuc_nang)
                ->first();
            if (!$check_quyen) {
                return response()->json([
                    'data' => false,
                    'message' => "bạn không có quyền thực hiện chức năng này!"
                ]);
            }
        }
        $check = Auth::guard('sanctum')->user();
        if (!$check) {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        } else {
            $data = KhachHang::find($request->id);
            if ($data) {
                $data->update([
                    'ho_va_ten'     => $request->ho_va_ten,
                    'so_dien_thoai' => $request->so_dien_thoai,
                    'email'         => $request->email,
                    'ngay_sinh'     => $request->ngay_sinh,
                    'is_active'     => $request->is_active,
                    'is_block'      => $request->is_block,
                ]);
                return response()->json([
                    'status'    => 1,
                    'message'   => 'Cập nhật khách hàng thành công!',
                    'data'      => $data
                ]);
            } else {
                return response()->json([
                    'status'    => 0,
                    'message'   => 'Khách hàng không tồn tại!',
                ]);
            }
        }
    }
    public function capNhatXu(CapNhatXuKhachHangRequest $request)
    {
        $login = Auth::guard('sanctum')->user();
        if (!$login) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn cần đăng nhập hệ thống!'
            ]);
        }

        $id_chuc_nang = 14; // Dùng chung quyền Cập nhật khách hàng
        if ($login->is_master != 1) {
            $check_quyen = PhanQuyen::where('id_chuc_vu', $login->id_chuc_vu)
                ->where('id_chuc_nang', $id_chuc_nang)
                ->first();
            if (!$check_quyen) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Bạn không có quyền thực hiện chức năng này!'
                ]);
            }
        }

        $khachHang = KhachHang::find($request->id);

        \App\Models\LichSuXu::create([
            'id_khach_hang'  => $khachHang->id,
            'id_don_hang'    => null,
            'so_xu'          => $request->so_xu,
            'loai_giao_dich' => 4, // Admin chủ động tặng/trừ
            'mo_ta'          => $request->mo_ta
        ]);

        $khachHang->diem_xu += $request->so_xu;
        // Tránh tình trạng âm xu nếu lỡ trừ quá tay
        if ($khachHang->diem_xu < 0) {
            $khachHang->diem_xu = 0;
        }
        $khachHang->save();

        return response()->json([
            'status'  => true,
            'message' => 'Đã cập nhật xu cho khách hàng thành công!'
        ]);
    }

    public function getLichSuXu()
    {
        $login = Auth::guard('sanctum')->user();
        if (!$login) {
            return response()->json([
                'status' => 0,
                'message' => 'Bạn cần đăng nhập hệ thống!'
            ]);
        }

        $data = \App\Models\LichSuXu::where('id_khach_hang', $login->id)
            ->orderBy('created_at', 'DESC')
            ->get();

        return response()->json([
            'status' => 1,
            'data'   => $data
        ]);
    }

    public function LoginFace(Request $request) {}



    public function Register(DangKyKhachHangRequest $request)
    {
        try {
            $hash_active = Str::uuid();
            KhachHang::create([
                'ho_va_ten'     => $request->ho_va_ten,
                'email'         => $request->email,
                'password'      => bcrypt($request->password),
                'ngay_sinh'     => $request->ngay_sinh,
                'so_dien_thoai' => $request->so_dien_thoai,
                'hash_active'   => $hash_active,
            ]);

            // ── Lấy URL frontend ────────────────────────────────────────────────────
            // Ưu tiên: FRONTEND_URL trong .env
            // Fallback: tự suy ra từ APP_URL (bỏ prefix "be." nếu có)
            $frontendUrl = env('FRONTEND_URL');
            if (!$frontendUrl) {
                $appUrl      = rtrim(env('APP_URL', 'http://localhost:8000'), '/');
                $frontendUrl = preg_replace('#^(https?://)be\.#i', '$1', $appUrl);
            }

            $data['ho_va_ten'] = $request->ho_va_ten;
            $data['link']      = $frontendUrl . '/khach-hang/kich-hoat/' . $hash_active;

            \Illuminate\Support\Facades\Log::info("📧 Gửi mail kích hoạt tới {$request->email} | Link: {$data['link']}");

            SendMailJob::dispatch($request->email, 'Kích Hoạt Tài Khoản', 'khach_hang_dang_ki', $data);

            return response()->json([
                'status'  => 1,
                'message' => 'Đã đăng kí thành công. Vui lòng kiểm tra email để kích hoạt tài khoản!'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 0,
                'message' => 'Có lỗi xảy ra trong quá trình đăng ký!',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    public function kichHoat(Request $request)
    {
        $khach_hang = KhachHang::where('hash_active', $request->id_khach_hang)->first();
        if ($khach_hang && $khach_hang->is_active == 0) {
            $khach_hang->is_active = 1;
            $khach_hang->save();

            return response()->json([
                'status'    =>  true,
                'message'   =>  'Đã kích hoạt tài khoản thành công'
            ]);
        } else {
            return response()->json([
                'status'    =>  false,
                'message'   =>  'Liên kết không tồn tại'
            ]);
        }
    }
    public function changeStatus(changKhachHangRequest $request)
    {
        $id_chuc_nang = 16;
        $login = Auth::guard('sanctum')->user();
        // Nếu là master admin thì bỏ qua kiểm tra quyền
        if ($login->is_master != 1) {
            $id_chuc_vu = $login->id_chuc_vu;
            $check_quyen = PhanQuyen::where('id_chuc_vu', $id_chuc_vu)
                ->where('id_chuc_nang', $id_chuc_nang)
                ->first();
            if (!$check_quyen) {
                return response()->json([
                    'data' => false,
                    'message' => "bạn không có quyền thực hiện chức năng này!"
                ]);
            }
        }
        $data = KhachHang::find($request->id);
        if ($data->is_block == 1) {
            $data->is_block = 0;
        } else {
            $data->is_block = 1;
        }
        $data->save();
        return response()->json([
            'status' => 1,
            'message' => 'Cập nhật trạng thái khách hàng thành công'
        ]);
    }

    public function changeActive(changeActiveRequest $request)
    {
        $khachhang = KhachHang::find($request->id);

        if ($khachhang->is_active == 0) {
            $khachhang->is_active = 1;
            $khachhang->save();

            return response()->json([
                'status' => true,
                'message' => 'Đã kích hoạt khách hàng thành công!'
            ]);
        } else {
            return response()->json([
                'status' => false,
                'message' => 'Khách hàng này đã được kích hoạt trước đó!'
            ]);
        }
    }

    public function getDataKhachHang()
    {
        $user = Auth::guard('sanctum')->user();
        $data = KhachHang::find($user->id);
        return response()->json([
            'status' => 1,
            'data' => $data
        ]);
    }

    public function updateProfile(updateProfileKhachHangRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        $data = KhachHang::find($user->id);
        if ($data) {
            $data->update([
                'ho_va_ten'     => $request->ho_va_ten,
                'so_dien_thoai' => $request->so_dien_thoai,
                'email'         => $request->email,
                'ngay_sinh'     => $request->ngay_sinh,
                'avatar'        => $request->avatar,
                'cccd'          => $request->cccd,
            ]);
            return response()->json([
                'status'    => 1,
                'message'   => 'Cập nhật thông tin thành công!',
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Thông tin khách hàng không tồn tại!',
            ]);
        }
    }

    public function updatePassword(updatePasswordKhachHangRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        $data = KhachHang::where('id', $user->id)->first();
        if ($data && Hash::check($request->old_password, $data->password)) {
            $data->update([
                'password' => bcrypt($request->password),
            ]);
            return response()->json([
                'status'    => 1,
                'message'   => 'Cập nhật mật khẩu thành công!',
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Mật khẩu cũ không đúng!',
            ]);
        }
    }

    public function getDataDiaChi()
    {
        $user = Auth::guard('sanctum')->user();
        $data = DiaChi::where('id_khach_hang', $user->id)
            ->join('khach_hangs', 'dia_chis.id_khach_hang', 'khach_hangs.id')
            ->join('quan_huyens', 'dia_chis.id_quan_huyen', 'quan_huyens.id')
            ->join('tinh_thanhs', 'quan_huyens.id_tinh_thanh', 'tinh_thanhs.id')
            ->select('dia_chis.*', 'quan_huyens.ten_quan_huyen', 'tinh_thanhs.ten_tinh_thanh')
            ->get();
        return response()->json([
            'status' => 1,
            'data' => $data
        ]);
    }

    public function storeDiaChi(createDiaChiKhachHangRequest $request)
    {
        $user = Auth::guard('sanctum')->user();

        // Ưu tiên tọa độ từ FE (user đã dùng nút "Xác định vị trí")
        $lat = $request->lat ?? $request->toa_do_x ?? null;
        $lng = $request->lng ?? $request->toa_do_y ?? null;

        // Nếu FE không gửi coords → thử geocode phía BE (fallback)
        if (!$lat || !$lng) {
            $tenTinhThanh = '';
            $tenQuanHuyen = '';
            if ($request->id_quan_huyen) {
                $qh = \App\Models\QuanHuyen::with('tinhThanh')->find($request->id_quan_huyen);
                if ($qh) {
                    $tenQuanHuyen = $qh->ten_quan_huyen ?? '';
                    $tenTinhThanh = $qh->tinhThanh->ten_tinh_thanh ?? '';
                }
            }
            $coords = $this->geocodeAddress($request->dia_chi, $tenQuanHuyen, $tenTinhThanh);
            $lat = $coords['lat'] ?? null;
            $lng = $coords['lng'] ?? null;
        }

        DiaChi::create([
            'id_khach_hang'  => $user->id,
            'id_quan_huyen'  => $request->id_quan_huyen,
            'dia_chi'        => $request->dia_chi,
            'ten_nguoi_nhan' => $request->ten_nguoi_nhan,
            'so_dien_thoai'  => $request->so_dien_thoai,
            'toa_do_x'       => $lat,
            'toa_do_y'       => $lng,
            'lat'            => $lat,
            'lng'            => $lng,
        ]);

        return response()->json([
            'status'  => 1,
            'message' => 'Thêm mới địa chỉ thành công!'
        ]);
    }

    public function updateDiaChi(updateDiaChiKhachHangRequest $request)
    {
        // Ưu tiên tọa độ từ FE
        $lat = $request->lat ?? $request->toa_do_x ?? null;
        $lng = $request->lng ?? $request->toa_do_y ?? null;

        // Fallback geocode nếu không có
        if (!$lat || !$lng) {
            $tenTinhThanh = '';
            $tenQuanHuyen = '';
            if ($request->id_quan_huyen) {
                $qh = \App\Models\QuanHuyen::with('tinhThanh')->find($request->id_quan_huyen);
                if ($qh) {
                    $tenQuanHuyen = $qh->ten_quan_huyen ?? '';
                    $tenTinhThanh = $qh->tinhThanh->ten_tinh_thanh ?? '';
                }
            }
            $coords = $this->geocodeAddress($request->dia_chi, $tenQuanHuyen, $tenTinhThanh);
            $lat = $coords['lat'] ?? null;
            $lng = $coords['lng'] ?? null;
        }

        DiaChi::where('id', $request->id)->update([
            'ten_nguoi_nhan' => $request->ten_nguoi_nhan,
            'so_dien_thoai'  => $request->so_dien_thoai,
            'dia_chi'        => $request->dia_chi,
            'id_quan_huyen'  => $request->id_quan_huyen,
            'toa_do_x'       => $lat,
            'toa_do_y'       => $lng,
            'lat'            => $lat,
            'lng'            => $lng,
        ]);

        return response()->json([
            'status'  => 1,
            'message' => 'Cập nhật địa chỉ thành công!',
        ]);
    }


    /**
     * Geocode địa chỉ văn bản thành tọa độ lat/lng qua Nominatim (OpenStreetMap - miễn phí)
     */
    private function geocodeAddress(string $diaChiText, string $quanHuyen = '', string $tinhThanh = ''): array
    {
        try {
            $apiKey = '6TTIZbUWJmRMSpiYzQ0YY8z5v8wv43w0';
            $fullAddr = trim("{$diaChiText}, {$quanHuyen}, {$tinhThanh}");
            $url = 'https://mapapis.openmap.vn/v1/geocode/forward?text=' . urlencode($fullAddr) . '&apikey=' . $apiKey;

            $client = new \GuzzleHttp\Client(['timeout' => 5]);

            $response = $client->get($url);
            $data = json_decode($response->getBody()->getContents(), true);

            if (!empty($data['features']) && isset($data['features'][0]['geometry']['coordinates'])) {
                $coords = $data['features'][0]['geometry']['coordinates'];
                \Illuminate\Support\Facades\Log::info("[Geocode] '{$fullAddr}' → lat={$coords[1]}, lng={$coords[0]}");
                return ['lat' => floatval($coords[1]), 'lng' => floatval($coords[0])];
            }

            if ($quanHuyen || $tinhThanh) {
                $simpleAddr = trim("{$quanHuyen}, {$tinhThanh}");
                $url2 = 'https://mapapis.openmap.vn/v1/geocode/forward?text=' . urlencode($simpleAddr) . '&apikey=' . $apiKey;
                $response2 = $client->get($url2);
                $data2 = json_decode($response2->getBody()->getContents(), true);
                if (!empty($data2['features']) && isset($data2['features'][0]['geometry']['coordinates'])) {
                    $coords2 = $data2['features'][0]['geometry']['coordinates'];
                    \Illuminate\Support\Facades\Log::info("[Geocode fallback] '{$simpleAddr}' → lat={$coords2[1]}, lng={$coords2[0]}");
                    return ['lat' => floatval($coords2[1]), 'lng' => floatval($coords2[0])];
                }
            }

            \Illuminate\Support\Facades\Log::warning("[Geocode] Không tìm thấy tọa độ cho: '{$fullAddr}'");
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("[Geocode] Lỗi: " . $e->getMessage());
        }

        return [];
    }

    public function destroyDiaChi(deleteDiaChiKhachHangRequest $request)
    {
        $dia_chi = DiaChi::find($request->id)->delete();
        return response()->json([
            'status'    => 1,
            'message'   => 'Xóa Địa Chỉ thành công!',
        ]);
    }

    public function getMonAn()
    {
        $data = MonAn::where('mon_ans.tinh_trang', 1)
            ->join('quan_ans', 'mon_ans.id_quan_an', '=', 'quan_ans.id')
            ->select('mon_ans.*', 'quan_ans.ten_quan_an')
            ->get();
        return response()->json([
            'status'    => 1,
            'data'      => $data
        ]);
    }
    public function doiMatKhau(doiMatKhauKhachHangRequest $request)
    {
        $user_login = Auth::guard('sanctum')->user();
        $kh = KhachHang::where('id', $user_login->id)->first();
        if ($kh) {
            if (Hash::check($request->password, $kh->password)) {
                $kh->update([
                    'password' => bcrypt($request->new_password)
                ]);
                return response()->json([
                    'status'    => 1,
                    'message'   => 'Đổi mật khẩu thành công!'
                ]);
            } else {
                return response()->json([
                    'status'    => 0,
                    'message'   => 'Mật khẩu cũ không đúng!'
                ]);
            }
        }
    }
    public function guiMaQuenMatKhau(Request $request)
    {
        $kh = KhachHang::where('email', $request->email)->first();
        if (!$kh) {
            return response()->json([
                'status'  => 0,
                'message' => 'Email không tồn tại trong hệ thống!'
            ]);
        }

        // Tạo mã OTP 6 số ngẫu nhiên
        $ma_otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // Lưu OTP vào cache/session (hết hạn sau 10 phút)
        \Illuminate\Support\Facades\Cache::put('quen_mat_khau_' . $request->email, $ma_otp, now()->addMinutes(10));

        // Gửi email
        $data = [
            'ho_va_ten' => $kh->ho_va_ten,
            'ma_otp'    => $ma_otp,
        ];
        SendMailJob::dispatch($request->email, 'Đặt lại mật khẩu FoodBee', 'quen_mat_khau_otp', $data);

        return response()->json([
            'status'  => 1,
            'message' => 'Mã xác nhận đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư!'
        ]);
    }

    public function quenMatKhau(Request $request)
    {
        $kh = KhachHang::where('email', $request->email)->first();
        if (!$kh) {
            return response()->json([
                'status'  => 0,
                'message' => 'Email không tồn tại trong hệ thống!'
            ]);
        }

        // Lấy OTP từ cache
        $ma_otp_cache = \Illuminate\Support\Facades\Cache::get('quen_mat_khau_' . $request->email);

        if (!$ma_otp_cache) {
            return response()->json([
                'status'  => 0,
                'message' => 'Mã xác nhận đã hết hạn. Vui lòng yêu cầu gửi lại!'
            ]);
        }

        if ($request->ma_otp != $ma_otp_cache) {
            return response()->json([
                'status'  => 0,
                'message' => 'Mã xác nhận không đúng!'
            ]);
        }

        // OTP hợp lệ → đổi mật khẩu
        $kh->update([
            'password' => bcrypt($request->new_password)
        ]);

        // Xóa OTP khỏi cache sau khi dùng
        \Illuminate\Support\Facades\Cache::forget('quen_mat_khau_' . $request->email);

        return response()->json([
            'status'  => 1,
            'message' => 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.'
        ]);
    }

    public function getDataTinhThanh()
    {
        $data = TinhThanh::where('tinh_trang', 1)->get();
        return response()->json([
            'data'  => $data
        ]);
    }

    public function getDataQuanHuyen(Request $request)
    {
        $data = QuanHuyen::where('tinh_trang', 1)
            ->where('id_tinh_thanh', $request->id_tinh_thanh)
            ->get();
        return response()->json([
            'data'  => $data
        ]);
    }

    public function DangXuat()
    {
        $user = Auth::guard('sanctum')->user();
        if ($user) {
            DB::table('personal_access_tokens')
                ->where('id', $user->currentAccessToken()->id)
                ->delete();
            return response()->json([
                'status'  => 1,
                'message' => "Đăng xuất thành công",
            ]);
        } else {
            return response()->json([
                'status'  => 0,
                'message' => "Có lỗi xảy ra",
            ]);
        }
    }

    public function DangXuatAll()
    {
        $user = Auth::guard('sanctum')->user();
        if ($user) {
            $ds_token = $user->tokens;
            foreach ($ds_token as $key => $value) {
                $value->delete();
            }
            return response()->json([
                'status'  => 1,
                'message' => "Đăng xuất thành công",
            ]);
        } else {
            return response()->json([
                'status'  => 0,
                'message' => "Có lỗi xảy ra",
            ]);
        }
    }
    public function updateAvatar(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        $data = $request->all();
        $file = $data['avatar'];
        $file_extention = $file->getClientOriginalExtension();
        $file_name = \Illuminate\Support\Str::slug($user->ho_va_ten) . "." . $file_extention;
        $cho_luu = "KhachHangAVT\\" . $file_name;
        $file->move("KhachHangAVT", $file_name);
        $avatar = env('APP_URL', 'https://be-foodbee.edu.vn') . '/' . $cho_luu;
        KhachHang::find($user->id)->update([
            'avatar' => $avatar
        ]);
        return response()->json([
            'status' => true,
            'message' => 'Đã đổi ảnh đại diện thành công',
        ]);
    }
}
