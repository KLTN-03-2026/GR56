<?php

namespace App\Http\Requests\GioHang;

use Illuminate\Foundation\Http\FormRequest;

class AppVoucherRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'ma_code'    => 'required|string',
            'id_quan_an' => 'required|exists:quan_ans,id',
        ];
    }

    public function messages(): array
    {
        return [
            'ma_code.required'    => 'Vui lòng nhập mã voucher.',
            'id_quan_an.required' => 'Vui lòng chọn quán ăn.',
            'id_quan_an.exists'   => 'Quán ăn không tồn tại.',
        ];
    }
}
