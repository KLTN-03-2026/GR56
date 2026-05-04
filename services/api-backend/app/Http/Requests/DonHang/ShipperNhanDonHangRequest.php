<?php

namespace App\Http\Requests\DonHang;

use Illuminate\Foundation\Http\FormRequest;

class ShipperNhanDonHangRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'            => 'required|exists:don_hangs,id'
        ];
    }

    public function messages()
    {
        return [
            'id.*'            => 'Đơn hàng không tồn tại!'
        ];
    }
}
