<?php

namespace App\Http\Requests\GioHang;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGioHangRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'            =>  'required|exists:chi_tiet_don_hangs,id',
            'so_luong'      => 'required|numeric|min:1'
        ];
    }

    public function messages(): array
    {
        return [
            'id.required'           => 'Vui lòng chọn món ăn',
            'id.exists'             => 'Món ăn không tồn tại',
            'so_luong.required'     => 'Vui lòng chọn số lượng',
            'so_luong.min'          => 'Số lượng phải từ 1 trở lên',
            'so_luong.numeric'      => 'Số lượng chưa đúng định dạng'
        ];
    }
}
