<?php

namespace App\Http\Requests\Voucher;

use Illuminate\Foundation\Http\FormRequest;

class BatchGenerateVoucherRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'packages' => 'required|array|min:1',
        ];
    }

    public function messages(): array
    {
        return [
            'packages.required' => 'Vui lòng chọn ít nhất một gói voucher.',
            'packages.array'    => 'Dữ liệu gói voucher không hợp lệ.',
            'packages.min'      => 'Vui lòng chọn ít nhất một gói voucher.',
        ];
    }
}
