<?php

namespace App\Http\Requests\Wallet;

use Illuminate\Foundation\Http\FormRequest;

class AdminNopTienShipperRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id_shipper' => 'required|exists:shippers,id',
            'so_tien'    => 'required|numeric|min:1000',
            'ghi_chu'    => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'id_shipper.required' => 'Vui lòng chọn shipper.',
            'id_shipper.exists'   => 'Shipper không tồn tại.',
            'so_tien.required'    => 'Vui lòng nhập số tiền.',
            'so_tien.numeric'     => 'Số tiền phải là số.',
            'so_tien.min'         => 'Số tiền nộp tối thiểu là 1.000đ.',
        ];
    }
}
