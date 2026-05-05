<?php

namespace App\Http\Controllers;

use App\Models\Topping;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ToppingController extends Controller
{
    // ============================================================
    // PHÍA KHÁCH HÀNG
    // ============================================================

    /**
     * Lấy danh sách toppings của một quán (dành cho khách hàng chọn topping khi đặt hàng).
     * GET /khach-hang/toppings/{id_quan_an}
     */
    public function getByQuanAn(int $idQuanAn)
    {
        $toppings = Topping::where('id_quan_an', $idQuanAn)
            ->where('tinh_trang', 1)
            ->orderBy('loai')
            ->orderBy('ten_topping')
            ->get(['id', 'ten_topping', 'gia', 'hinh_anh', 'mo_ta', 'loai']);

        return response()->json([
            'status' => true,
            'data'   => $toppings,
        ]);
    }

    // ============================================================
    // PHÍA QUÁN ĂN
    // ============================================================

    /**
     * Lấy danh sách toppings của quán đang đăng nhập.
     * GET /quan-an/toppings/data
     */
    public function getDataQuanAn(Request $request)
    {
        $idQuanAn = Auth::guard('sanctum')->user()->id;

        $toppings = Topping::where('id_quan_an', $idQuanAn)
            ->orderBy('loai')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => true,
            'data'   => $toppings,
        ]);
    }

    /**
     * Tạo topping mới (quán ăn).
     * POST /quan-an/toppings/create
     */
    public function storeQuanAn(Request $request)
    {
        $request->validate([
            'ten_topping' => 'required|string|max:255',
            'gia'         => 'required|numeric|min:0',
            'loai'        => 'required|in:drink,food,all',
            'hinh_anh'    => 'nullable|string',
            'mo_ta'       => 'nullable|string',
        ]);

        $idQuanAn = Auth::guard('sanctum')->user()->id;

        $topping = Topping::create([
            'id_quan_an'  => $idQuanAn,
            'ten_topping' => $request->ten_topping,
            'gia'         => (int) ceil($request->gia / 1000) * 1000, // Làm tròn lên ngàn
            'hinh_anh'    => $request->hinh_anh,
            'mo_ta'       => $request->mo_ta,
            'loai'        => $request->loai,
            'tinh_trang'  => 1,
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Tạo topping thành công!',
            'data'    => $topping,
        ]);
    }

    /**
     * Cập nhật topping (quán ăn).
     * POST /quan-an/toppings/update
     */
    public function updateQuanAn(Request $request)
    {
        $request->validate([
            'id'          => 'required|integer|exists:toppings,id',
            'ten_topping' => 'sometimes|string|max:255',
            'gia'         => 'sometimes|numeric|min:0',
            'loai'        => 'sometimes|in:drink,food,all',
            'hinh_anh'    => 'nullable|string',
            'mo_ta'       => 'nullable|string',
        ]);

        $idQuanAn = Auth::guard('sanctum')->user()->id;
        $topping  = Topping::where('id', $request->id)
                           ->where('id_quan_an', $idQuanAn)
                           ->firstOrFail();

        $data = $request->only(['ten_topping', 'hinh_anh', 'mo_ta', 'loai']);
        if ($request->has('gia')) {
            $data['gia'] = (int) ceil($request->gia / 1000) * 1000;
        }

        $topping->update($data);

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật topping thành công!',
            'data'    => $topping->fresh(),
        ]);
    }

    /**
     * Xóa topping (quán ăn).
     * POST /quan-an/toppings/delete
     */
    public function deleteQuanAn(Request $request)
    {
        $request->validate([
            'id' => 'required|integer|exists:toppings,id',
        ]);

        $idQuanAn = Auth::guard('sanctum')->user()->id;
        $topping  = Topping::where('id', $request->id)
                           ->where('id_quan_an', $idQuanAn)
                           ->firstOrFail();

        $topping->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Xóa topping thành công!',
        ]);
    }

    /**
     * Đổi trạng thái topping (ẩn/hiện) cho quán ăn.
     * POST /quan-an/toppings/change-status
     */
    public function changeStatusQuanAn(Request $request)
    {
        $request->validate([
            'id' => 'required|integer|exists:toppings,id',
        ]);

        $idQuanAn = Auth::guard('sanctum')->user()->id;
        $topping  = Topping::where('id', $request->id)
                           ->where('id_quan_an', $idQuanAn)
                           ->firstOrFail();

        $topping->tinh_trang = $topping->tinh_trang == 1 ? 0 : 1;
        $topping->save();

        return response()->json([
            'status'  => true,
            'message' => $topping->tinh_trang == 1 ? 'Topping đã được hiện!' : 'Topping đã được ẩn!',
            'data'    => $topping,
        ]);
    }

    // ============================================================
    // PHÍA ADMIN
    // ============================================================

    /**
     * Admin xem tất cả toppings (có thể lọc theo quán).
     * GET /admin/toppings/data?id_quan_an=1
     */
    public function getDataAdmin(Request $request)
    {
        $query = Topping::join('quan_ans', 'quan_ans.id', 'toppings.id_quan_an')
            ->select('toppings.*', 'quan_ans.ten_quan_an');

        if ($request->filled('id_quan_an')) {
            $query->where('toppings.id_quan_an', $request->id_quan_an);
        }

        if ($request->filled('loai')) {
            $query->where('toppings.loai', $request->loai);
        }

        $toppings = $query->orderBy('toppings.id_quan_an')->orderBy('toppings.id', 'desc')->get();

        return response()->json([
            'status' => true,
            'data'   => $toppings,
        ]);
    }


    /**
     * Admin tạo topping cho bất kỳ quán nào.
     * POST /admin/toppings/create
     */
    public function storeAdmin(Request $request)
    {
        $request->validate([
            'id_quan_an'  => 'required|integer|exists:quan_ans,id',
            'ten_topping' => 'required|string|max:255',
            'gia'         => 'required|numeric|min:0',
            'loai'        => 'required|in:drink,food,all',
            'hinh_anh'    => 'nullable|string',
            'mo_ta'       => 'nullable|string',
        ]);

        $topping = Topping::create([
            'id_quan_an'  => $request->id_quan_an,
            'ten_topping' => $request->ten_topping,
            'gia'         => (int) ceil($request->gia / 1000) * 1000,
            'hinh_anh'    => $request->hinh_anh,
            'mo_ta'       => $request->mo_ta,
            'loai'        => $request->loai,
            'tinh_trang'  => 1,
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Tạo topping thành công!',
            'data'    => $topping,
        ]);
    }

    /**
     * Admin cập nhật topping bất kỳ.
     * POST /admin/toppings/update
     */
    public function updateAdmin(Request $request)
    {
        $request->validate([
            'id'          => 'required|integer|exists:toppings,id',
            'id_quan_an'  => 'sometimes|integer|exists:quan_ans,id',
            'ten_topping' => 'sometimes|string|max:255',
            'gia'         => 'sometimes|numeric|min:0',
            'loai'        => 'sometimes|in:drink,food,all',
            'hinh_anh'    => 'nullable|string',
            'mo_ta'       => 'nullable|string',
        ]);

        $topping = Topping::findOrFail($request->id);
        $data    = $request->only(['id_quan_an', 'ten_topping', 'hinh_anh', 'mo_ta', 'loai']);

        if ($request->has('gia')) {
            $data['gia'] = (int) ceil($request->gia / 1000) * 1000;
        }

        $topping->update($data);

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật topping thành công!',
            'data'    => $topping->fresh(),
        ]);
    }

    /**
     * Admin xóa topping.
     * POST /admin/toppings/delete
     */
    public function deleteAdmin(Request $request)
    {
        $request->validate([
            'id' => 'required|integer|exists:toppings,id',
        ]);

        Topping::findOrFail($request->id)->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Xóa topping thành công!',
        ]);
    }

    /**
     * Admin đổi trạng thái topping.
     * POST /admin/toppings/change-status
     */
    public function changeStatusAdmin(Request $request)
    {
        $request->validate([
            'id' => 'required|integer|exists:toppings,id',
        ]);

        $topping             = Topping::findOrFail($request->id);
        $topping->tinh_trang = $topping->tinh_trang == 1 ? 0 : 1;
        $topping->save();

        return response()->json([
            'status'  => true,
            'message' => $topping->tinh_trang == 1 ? 'Đã hiện topping!' : 'Đã ẩn topping!',
            'data'    => $topping,
        ]);
    }
}
