<?php

namespace App\Http\Controllers;

use App\Http\Requests\DanhMuc\CapNhatDanhMucRequest;
use App\Http\Requests\QuanAn\changeActiveQuanAnrequest;
use App\Http\Requests\QuanAn\ChangeStatusQuanAnrequest;

use App\Http\Requests\MonAn\createMonAnRequest;
use App\Http\Requests\QuanAn\DangKyQuanAnRequest;
use App\Http\Requests\MonAn\deleteMonAnRequest;

use App\Http\Requests\QuanAn\QuanAnDeleteRequest;

use App\Http\Requests\Auth\QuanAnLoginRequest;
use App\Http\Requests\QuanAn\QuanAnThemMoiRequest;
use App\Http\Requests\QuanAn\QuanAnUpdateProfileRequest;
use App\Http\Requests\QuanAn\QuanAnUpdateRequest;

use App\Http\Requests\DanhMuc\ThemMoiDanhMucRequest;
use App\Http\Requests\MonAn\updateMonAnRequest;
use App\Http\Requests\DanhMuc\XoaDanhMucRequest;
use App\Models\ChiTietDanhMucQuanAn;
use App\Models\DanhMuc;
use App\Models\DanhGia;
use App\Models\DiaChi;
use App\Models\MonAn;
use App\Models\PhanQuyen;
use App\Models\QuanAn;
use App\Models\QuanHuyen;
use App\Jobs\SendMailJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class QuanAnController extends Controller
{
    public function searchNguoiDung(Request $request)
    {
        $noi_dung_tim = '%' . $request->noi_dung_tim . '%';
        $data = QuanAn::leftJoin('quan_huyens', 'quan_ans.id_quan_huyen', 'quan_huyens.id')
            ->leftJoin('tinh_thanhs', 'tinh_thanhs.id', 'quan_huyens.id_tinh_thanh')
            ->select('quan_ans.*', 'quan_huyens.ten_quan_huyen', 'tinh_thanhs.ten_tinh_thanh')
            ->where('ten_quan_an', 'like', $noi_dung_tim)
            ->where('tinh_trang', 1)
            ->get();
        return response()->json([
            'data'  => $data
        ]);
    }

    public function search(Request $request)
    {
        $noi_dung_tim = '%' . $request->noi_dung_tim . '%';
        $data = QuanAn::leftJoin('quan_huyens', 'quan_ans.id_quan_huyen', 'quan_huyens.id')
            ->leftJoin('tinh_thanhs', 'tinh_thanhs.id', 'quan_huyens.id_tinh_thanh')
            ->select('quan_ans.*', 'quan_huyens.ten_quan_huyen', 'tinh_thanhs.ten_tinh_thanh')
            ->where('ten_quan_an', 'like', $noi_dung_tim)
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
    public function checkTokenQuanAn()
    {
        $user_login = Auth::guard('sanctum')->user();
        if ($user_login && $user_login instanceof \App\Models\QuanAn) {
            return response()->json([
                'status'        => 1,
                'ten_quan_an'   => $user_login->ten_quan_an,
                'hinh_anh'      => $user_login->hinh_anh,
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập bằng tài khoản quán ăn!'
            ]);
        }
    }
    public function Login(QuanAnLoginRequest $request)
    {
        $quanAn = QuanAn::where('email', $request->email)->first();
        if (!$quanAn) {
            return response()->json([
                'status'  => 0,
                'message' => "Email không tồn tại trong hệ thống.",
            ]);
        }
        // Xử lý trường hợp password chưa được hash bcrypt (lưu plaintext)
        $passwordValid = false;
        try {
            $passwordValid = Hash::check($request->password, $quanAn->password);
        } catch (\RuntimeException $e) {
            // Password trong DB là plaintext, so sánh trực tiếp
            $passwordValid = ($request->password === $quanAn->password);
            if ($passwordValid) {
                // Tự động re-hash lại bằng bcrypt
                $quanAn->update(['password' => bcrypt($request->password)]);
            }
        }

        if (!$passwordValid) {
            return response()->json([
                'status'  => 0,
                'message' => "Mật khẩu không chính xác.",
            ]);
        }
        if ($quanAn->tinh_trang != 1) {
            return response()->json([
                'status'  => 0,
                'message' => "Tài khoản chưa được duyệt. Vui lòng chờ quản trị viên xét duyệt.",
            ]);
        }
        if ($quanAn->is_active != 1) {
            return response()->json([
                'status'  => 0,
                'message' => "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.",
            ]);
        }
        return response()->json([
            'status'  => 1,
            'message' => "Đăng nhập thành công!",
            'token'   => $quanAn->createToken('token_quan_an')->plainTextToken,
        ]);
    }

    public function getData()
    {
        $id_chuc_nang = 28;
        $login = Auth::guard('sanctum')->user();
        if (!$login) {
            return response()->json(['data' => [], 'message' => 'Bạn cần đăng nhập!']);
        }
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
        $data = QuanAn::leftJoin('quan_huyens', 'quan_ans.id_quan_huyen', 'quan_huyens.id')
            ->leftJoin('tinh_thanhs', 'tinh_thanhs.id', 'quan_huyens.id_tinh_thanh')
            ->select('quan_ans.*', 'quan_huyens.ten_quan_huyen', 'tinh_thanhs.ten_tinh_thanh')
            ->get();
        return response()->json([
            'data' => $data
        ]);
    }


    public function getDataOpen()
    {
        $data = QuanAn::where('tinh_trang', 1)->get();
        return response()->json([
            'data' => $data
        ]);
    }

    public function store(QuanAnThemMoiRequest $request)
    {
        $id_chuc_nang = 29;
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
        QuanAn::create([
            'email'                 => $request->email,
            'password'              => bcrypt($request->password),
            'ma_so_thue'            => $request->ma_so_thue,
            'ten_quan_an'           => $request->ten_quan_an,
            'hinh_anh'              => $request->hinh_anh,
            'gio_mo_cua'            => $request->gio_mo_cua,
            'gio_dong_cua'          => $request->gio_dong_cua,
            'so_dien_thoai'         => $request->so_dien_thoai,
            'is_active'             => $request->is_active,
            'tinh_trang'            => $request->tinh_trang,
            'dia_chi'               => $request->dia_chi,
            'id_quan_huyen'         => $request->id_quan_huyen,
        ]);
        return response()->json([
            'status'    => 1,
            'message'   => 'Thêm mới quán ăn thành công!',
        ]);
    }

    public function update(QuanAnUpdateRequest $request)
    {
        $id_chuc_nang = 30;
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
        $data = QuanAn::find($request->id);
        if ($data) {
            $data->update([
                'email'                 => $request->email,
                'ma_so_thue'            => $request->ma_so_thue,
                'ten_quan_an'           => $request->ten_quan_an,
                'hinh_anh'              => $request->hinh_anh,
                'gio_mo_cua'            => $request->gio_mo_cua,
                'gio_dong_cua'          => $request->gio_dong_cua,
                'so_dien_thoai'         => $request->so_dien_thoai,
                'is_active'             => $request->is_active,
                'tinh_trang'            => $request->tinh_trang,
                'dia_chi'               => $request->dia_chi,
                'id_quan_huyen'         => $request->id_quan_huyen,
            ]);
            return response()->json([
                'status'    => 1,
                'message'   => 'Cập nhật quán ăn thành công!',
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Quán ăn không tồn tại!',
            ]);
        }
    }
    public function destroy(QuanAnDeleteRequest $request)
    {
        $id_chuc_nang = 31;
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
        $data = QuanAn::find($request->id);
        if ($data) {
            $data->delete();
            return response()->json([
                'status'    => 1,
                'message'   => 'Xóa quán ăn thành công!',
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Quán ăn không tồn tại!',
            ]);
        }
    }
    public function changeStatus(ChangeStatusQuanAnrequest $request)
    {
        $id_chuc_nang = 32;
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
            $data = QuanAn::find($request->id);
            if ($data) {
                $data->update([
                    'tinh_trang'    => !$data->tinh_trang,
                ]);
                return response()->json([
                    'status'    => 1,
                    'message'   => 'Thay đổi trạng thái thành công!',
                    'data'      => $data
                ]);
            } else {
                return response()->json([
                    'status'    => 0,
                    'message'   => 'Quán ăn không tồn tại!',
                ]);
            }
        }
    }
    public function changeActive(changeActiveQuanAnrequest $request)
    {
        $id_chuc_nang = 27;
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
        $quan_an = QuanAn::find($request->id);

        if ($quan_an->is_active == 0) {
            $quan_an->is_active = 1;
            $quan_an->save();

            return response()->json([
                'status' => true,
                'message' => 'Đã kích hoạt quán ăn thành công!'
            ]);
        } else {
            return response()->json([
                'status' => false,
                'message' => 'Quán ăn này đã được kích hoạt trước đó!'
            ]);
        }
    }

    public function getDataDanhMuc()
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user) {
            return response()->json(['data' => [], 'message' => 'Unauthorized'], 401);
        }
        $data = DanhMuc::join('chi_tiet_danh_muc_quan_ans', 'danh_mucs.id', 'chi_tiet_danh_muc_quan_ans.id_danh_muc')
            ->where('chi_tiet_danh_muc_quan_ans.id_quan_an', $user->id)
            ->leftJoin('danh_mucs as B', 'B.id', 'danh_mucs.id_danh_muc_cha')
            ->select('danh_mucs.*', 'B.ten_danh_muc as ten_danh_muc_cha')
            ->get();
        return response()->json([
            'data' => $data
        ]);
    }
    public function getDataDanhMucCha()
    {
        $user = Auth::guard('sanctum')->user();
        $data = DanhMuc::join('chi_tiet_danh_muc_quan_ans', 'danh_mucs.id', 'chi_tiet_danh_muc_quan_ans.id_danh_muc')
            ->join('quan_ans', 'chi_tiet_danh_muc_quan_ans.id_quan_an', 'quan_ans.id')
            ->select('danh_mucs.*', 'chi_tiet_danh_muc_quan_ans.id_quan_an', 'quan_ans.ten_quan_an', 'chi_tiet_danh_muc_quan_ans.id_danh_muc')
            // ->where('chi_tiet_danh_muc_quan_ans.id_quan_an', $user->id)
            ->whereNull('danh_mucs.id_danh_muc_cha')
            ->get();

        return response()->json([
            'data'      => $data
        ]);
    }
    public function createDanhMuc(ThemMoiDanhMucRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        $danhMuc = DanhMuc::create([
            'ten_danh_muc'      => $request->ten_danh_muc,
            'slug_danh_muc'     => $request->slug_danh_muc,
            'tinh_trang'        => $request->tinh_trang,
            'id_danh_muc_cha'   => $request->id_danh_muc_cha,
            'hinh_anh'          => $request->hinh_anh,
        ]);
        ChiTietDanhMucQuanAn::create([
            'id_danh_muc' => $danhMuc->id,
            'id_quan_an'  => $user->id
        ]);
        return response()->json([
            'status' => 1,
            'message' => 'Thêm danh mục món ăn thành công'
        ]);
    }

    public function updateDanhMuc(CapNhatDanhMucRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user || !$user->id) {
            return response()->json([
                'status' => 0,
                'message' => 'Bạn cần đăng nhập để cập nhật danh mục!'
            ]);
        }
        $danhMuc = DanhMuc::find($request->id);
        if (!$danhMuc) {
            return response()->json([
                'status' => 0,
                'message' => 'Danh mục không tồn tại!'
            ]);
        }
        $check = ChiTietDanhMucQuanAn::where('id_danh_muc', $request->id)
            ->where('id_quan_an', $user->id)
            ->first();
        if (!$check) {
            return response()->json([
                'status' => 0,
                'message' => 'Bạn không có quyền cập nhật danh mục này!'
            ]);
        }
        $danhMuc->update([
            'ten_danh_muc'      => $request->ten_danh_muc,
            'slug_danh_muc'     => $request->slug_danh_muc,
            'tinh_trang'        => $request->tinh_trang,
            'id_danh_muc_cha'   => $request->id_danh_muc_cha,
            'hinh_anh'          => $request->hinh_anh,
        ]);

        return response()->json([
            'status' => 1,
            'message' => 'Cập nhật danh mục món ăn thành công',
        ]);
    }
    public function deleteDanhMuc(XoaDanhMucRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user || !$user->id) {
            return response()->json([
                'status' => 0,
                'message' => 'Bạn cần đăng nhập để xóa danh mục!'
            ]);
        }
        $danhMuc = DanhMuc::find($request->id);
        $check = ChiTietDanhMucQuanAn::where('id_danh_muc', $request->id)
            ->where('id_quan_an', $user->id)
            ->first();
        if ($check) {
            $danhMuc->delete();
            $check->delete();
            return response()->json([
                'status' => 1,
                'message' => 'Xóa danh mục món ăn thành công'
            ]);
        } else {
            return response()->json([
                'status' => 0,
                'message' => 'Bạn không có quyền xóa danh mục này!'
            ]);
        }
    }
    public function doiTrangThaiDanhMuc(XoaDanhMucRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user || !$user->id) {
            return response()->json([
                'status' => 0,
                'message' => 'Bạn cần đăng nhập để xóa danh mục!'
            ]);
        }
        $data = DanhMuc::find($request->id);
        $check = ChiTietDanhMucQuanAn::where('id_danh_muc', $request->id)
            ->where('id_quan_an', $user->id)
            ->first();
        if ($check) {
            $data->tinh_trang = $data->tinh_trang == 1 ? 0 : 1;
            $data->save();
        } else {
            return response()->json([
                'status' => 0,
                'message' => 'Bạn không có quyền thay đổi trạng thái danh mục này!'
            ]);
        }
        return response()->json([
            'status' => 1,
            'message' => 'Cập nhật tình trạng danh mục món ăn thành công'
        ]);
    }
    public function getDataMonAn()
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user) {
            return response()->json(['data' => [], 'message' => 'Unauthorized'], 401);
        }
        $data = MonAn::where('mon_ans.id_quan_an', $user->id)
            ->leftJoin('danh_mucs', 'mon_ans.id_danh_muc', 'danh_mucs.id')
            ->select('mon_ans.*', 'danh_mucs.ten_danh_muc')
            ->with('sizes')
            ->get();
        return response()->json([
            'data' => $data
        ]);
    }
    public function createMonAn(createMonAnRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        $monAn = MonAn::create([
            'ten_mon_an'     => $request->ten_mon_an,
            'slug_mon_an'    => $request->slug_mon_an,
            'gia_ban'        => $request->gia_ban,
            'gia_khuyen_mai' => $request->gia_khuyen_mai,
            'mo_ta'          => $request->mo_ta,
            'id_quan_an'     => $user->id,
            'tinh_trang'     => $request->tinh_trang,
            'hinh_anh'       => $request->hinh_anh,
            'is_combo'       => 0,
            'id_danh_muc'    => $request->id_danh_muc,
        ]);

        if ($request->has('sizes') && is_array($request->sizes)) {
            foreach($request->sizes as $sz) {
                if (!empty($sz['ten_size'])) {
                    \App\Models\MonAnSize::create([
                        'id_mon_an' => $monAn->id,
                        'ten_size' => $sz['ten_size'],
                        'gia_cong_them' => $sz['gia_cong_them'] ?? 0
                    ]);
                }
            }
        }
        return response()->json([
            'status' => 1,
            'message' => 'Thêm món ăn thành công!',
        ]);
    }
    public function updateMonAn(updateMonAnRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user || !$user->id) {
            return response()->json([
                'status' => 0,
                'message' => 'Bạn cần đăng nhập để cập nhật món ăn!'
            ]);
        }

        $monAn = MonAn::where('id', $request->id)
            ->where('id_quan_an', $user->id)
            ->first();

        if (!$monAn) {
            return response()->json([
                'status' => 0,
                'message' => 'Món ăn không tồn tại hoặc bạn không có quyền cập nhật!'
            ]);
        }

        $monAn->update([
            'ten_mon_an'        => $request->ten_mon_an,
            'slug_mon_an'       => $request->slug_mon_an,
            'gia_ban'           => $request->gia_ban,
            'gia_khuyen_mai'    => $request->gia_khuyen_mai,
            'mo_ta'             => $request->mo_ta,
            'tinh_trang'        => $request->tinh_trang,
            'hinh_anh'          => $request->hinh_anh,
            'is_combo'          => $request->is_combo ?? 0,
            'id_danh_muc'       => $request->id_danh_muc,
        ]);

        if ($request->has('sizes') && is_array($request->sizes)) {
            \App\Models\MonAnSize::where('id_mon_an', $monAn->id)->delete();
            foreach($request->sizes as $sz) {
                if (!empty($sz['ten_size'])) {
                    \App\Models\MonAnSize::create([
                        'id_mon_an' => $monAn->id,
                        'ten_size' => $sz['ten_size'],
                        'gia_cong_them' => $sz['gia_cong_them'] ?? 0
                    ]);
                }
            }
        }

        return response()->json([
            'status' => 1,
            'message' => 'Cập nhật món ăn thành công!',
        ]);
    }

    // XoaMonAnRequest
    public function deleteMonAn(deleteMonAnRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user || !$user->id) {
            return response()->json([
                'status' => 0,
                'message' => 'Bạn cần đăng nhập để xóa món ăn!'
            ]);
        }
        $check = MonAn::where('id', $request->id)
            ->where('id_quan_an', $user->id)
            ->first();

        if (!$check) {
            return response()->json([
                'status' => 0,
                'message' => 'Món ăn không tồn tại hoặc bạn không có quyền xóa!'
            ]);
        }
        $check->delete();

        return response()->json([
            'status' => 1,
            'message' => 'Xóa món ăn thành công!'
        ]);
    }
    // DoiTrangThaiMonAnRequest
    public function doiTrangThaiMonAn(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user || !$user->id) {
            return response()->json([
                'status' => 0,
                'message' => 'Bạn cần đăng nhập để thay đổi trạng thái món ăn!'
            ]);
        }
        $data = MonAn::where('id', $request->id)
            ->where('id_quan_an', $user->id)
            ->first();
        if (!$data) {
            return response()->json([
                'status' => 0,
                'message' => 'Món ăn không tồn tại hoặc bạn không có quyền thay đổi trạng thái!'
            ]);
        }
        $data->tinh_trang = $data->tinh_trang == 1 ? 0 : 1;
        $data->save();
        return response()->json([
            'status' => 1,
            'message' => 'Cập nhật tình trạng món ăn thành công!',
        ]);
    }

    public function dangKy(DangKyQuanAnRequest $request)
    {
        QuanAn::create([
            'email'                 => $request->email,
            'password'              => bcrypt($request->password),
            'ma_so_thue'            => $request->ma_so_thue,
            'ten_quan_an'           => $request->ten_quan_an,
            'gio_mo_cua'            => $request->gio_mo_cua,
            'gio_dong_cua'          => $request->gio_dong_cua,
            'so_dien_thoai'         => $request->so_dien_thoai,
            'dia_chi'               => $request->dia_chi,
            'id_quan_huyen'         => $request->id_quan_huyen,
        ]);
        return response()->json([
            'status'    => 1,
            'message'   => 'Đăng ký quán ăn thành công!',
        ]);
    }
    public function getDataQuanAn()
    {
        $user_login = Auth::guard('sanctum')->user();
        if ($user_login) {
            $quanan = QuanAn::where('quan_ans.id', $user_login->id)->first();
            return response()->json([
                'status'    => 1,
                'data'      => $quanan
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        }
    }
    public function updatePassword(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        $data = QuanAn::where('id', $user->id)->first();
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

    public function updateProfile(QuanAnUpdateProfileRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        $data = QuanAn::find($user->id);
        if ($data) {
            $data->update([
                'ten_quan_an'     => $request->ten_quan_an,
                'so_dien_thoai' => $request->so_dien_thoai,
                'email'         => $request->email,
                'dia_chi'       => $request->dia_chi
            ]);
            return response()->json([
                'status'    => 1,
                'message'   => 'Cập nhật thông tin thành công!',
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Thông tin quán ăn không tồn tại!',
            ]);
        }
    }

    public function getDanhGia($id_quan_an)
    {
        $danh_gia = DanhGia::join('khach_hangs', 'danh_gias.id_khach_hang', 'khach_hangs.id')
            ->where('id_quan_an', $id_quan_an)
            ->whereNotNull('sao_quan_an')
            ->select('danh_gias.*', 'khach_hangs.ho_va_ten', 'khach_hangs.avatar')
            ->orderBy('danh_gias.created_at', 'desc')
            ->get();
            
        return response()->json([
            'status' => true,
            'data'   => $danh_gia
        ]);
    }

    public function getThongKeDanhGia($id_quan_an)
    {
        $stats = DanhGia::where('id_quan_an', $id_quan_an)
            ->whereNotNull('sao_quan_an')
            ->select(
                DB::raw('COUNT(*) as total_reviews'),
                DB::raw('AVG(sao_quan_an) as average_stars')
            )
            ->first();
            
        return response()->json([
            'status' => true,
            'data'   => [
                'total_reviews' => (int)$stats->total_reviews,
                'average_stars' => round($stats->average_stars, 1)
            ]
        ]);
    }

    public function guiMaQuenMatKhau(Request $request)
    {
        $quanAn = QuanAn::where('email', $request->email)->first();
        if (!$quanAn) {
            return response()->json([
                'status'  => 0,
                'message' => 'Email không tồn tại trong hệ thống!'
            ]);
        }
        $ma_otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        \Illuminate\Support\Facades\Cache::put('quan_an_quen_mat_khau_' . $request->email, $ma_otp, now()->addMinutes(10));
        $data = ['ho_va_ten' => $quanAn->ten_quan_an, 'ma_otp' => $ma_otp];
        SendMailJob::dispatch($request->email, 'Đặt lại mật khẩu FoodBee Quán Ăn', 'quen_mat_khau_otp', $data);
        return response()->json(['status' => 1, 'message' => 'Mã xác nhận đã gửi tới email!']);
    }

    public function quenMatKhau(Request $request)
    {
        $quanAn = QuanAn::where('email', $request->email)->first();
        if (!$quanAn) return response()->json(['status' => 0, 'message' => 'Email không tồn tại!']);
        $cache = \Illuminate\Support\Facades\Cache::get('quan_an_quen_mat_khau_' . $request->email);
        if (!$cache || $request->ma_otp != $cache) return response()->json(['status' => 0, 'message' => 'Mã sai hoặc hết hạn!']);
        $quanAn->update(['password' => bcrypt($request->new_password)]);
        \Illuminate\Support\Facades\Cache::forget('quan_an_quen_mat_khau_' . $request->email);
        return response()->json(['status' => 1, 'message' => 'Đặt lại mật khẩu thành công!']);
    }
}
