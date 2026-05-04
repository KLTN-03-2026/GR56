<?php

namespace App\Http\Requests\Wallet;

use Illuminate\Foundation\Http\FormRequest;

class AdminManualRefundRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id_don_hang' => 'required|exists:don_hangs,id',
        ];
    }

    public function messages(): array
    {
        return [
            'id_don_hang.required' => 'Vui lòng chọn đơn hàng cần hoàn tiền.',
            'id_don_hang.exists'   => 'Đơn hàng không tồn tại trong hệ thống.',
        ];
    }
}
