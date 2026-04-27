<?php

namespace App\Http\Requests\Voucher;

use Illuminate\Foundation\Http\FormRequest;

class XoaVoucherRequest extends FormRequest
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
            'id' => 'required|exists:vouchers,id',

        ];
    }
    public function messages()
    {
        return [
            'id.required' => 'Voucher cần xóa không được để trống.',
            'id.exists' => 'Voucher cần xóa không tồn tại.',
        ];
    }
}
