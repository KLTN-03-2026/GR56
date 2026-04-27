<?php

namespace App\Http\Requests\Voucher;

use Illuminate\Foundation\Http\FormRequest;

class DoiTrangThaiVoucherRequest extends FormRequest
{

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'            => 'required|exists:vouchers,id',
        ];
    }
    public function messages()
    {
        return [
            'id.required' => 'Voucher cần thay đổi trạng thái không được để trống.',
            'id.exists' => 'Voucher cần thay đổi trạng thái không tồn tại.',
        ];
    }
}
