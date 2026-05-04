<?php

namespace App\Http\Requests\DonHang;

use Illuminate\Foundation\Http\FormRequest;

class ReorderRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id' => 'required|exists:don_hangs,id',
        ];
    }

    public function messages(): array
    {
        return [
            'id.required' => 'Vui lòng chọn đơn hàng cần đặt lại.',
            'id.exists'   => 'Đơn hàng không tồn tại.',
        ];
    }
}
