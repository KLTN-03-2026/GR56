<?php

namespace App\Http\Controllers;

use App\Models\CauHinh;
use Illuminate\Http\Request;

class CauHinhController extends Controller
{
    /**
     * Get all configurations formatted as a flat key-value array
     */
    public function getCauHinhAdmin()
    {
        $cau_hinhs = CauHinh::all();
        $data = [];
        
        foreach ($cau_hinhs as $ch) {
            // Phân giải json nếu có thể cho mảng khung giờ
            $val = json_decode($ch->gia_tri, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $data[$ch->ma_cau_hinh] = $val;
            } else {
                $data[$ch->ma_cau_hinh] = $ch->gia_tri;
            }
        }

        return response()->json([
            'status' => true,
            'data'   => $data,
        ]);
    }

    /**
     * Update configurations sent from Admin
     */
    public function updateCauHinhAdmin(Request $request)
    {
        // $request->all() sẽ truyền lên một object/array key-value
        // Ví dụ: ["chiet_khau_phan_tram" => 20, "phi_ship_km_binh_thuong" => 6000, ...]
        
        $configs = $request->except(['_token', 'status']); // Lấy tất cả trừ dữ liệu k liên quan
        
        foreach ($configs as $key => $value) {
            // Encode mảng thành chuỗi JSON nếu frontend gửi mảng (đối với giờ cao điểm)
            if (is_array($value)) {
                $value = json_encode($value);
            }
            
            CauHinh::updateOrCreate(
                ['ma_cau_hinh' => $key],
                ['gia_tri' => $value]
            );
        }

        return response()->json([
            'status' => true,
            'message' => 'Cập nhật cấu hình sàn thành công!'
        ]);
    }
}
