<?php

namespace App\Http\Requests\GioHang;

use Illuminate\Foundation\Http\FormRequest;

class DeleteGioHangRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'        => 'required|exists:chi_tiet_don_hangs,id'
        ];
    }

    public function messages()
    {
        return [
            'id.*'      => 'Đơn hàng không tồn tại',
        ];
    }
}
