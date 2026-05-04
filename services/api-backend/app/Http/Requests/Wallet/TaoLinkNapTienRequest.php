<?php

namespace App\Http\Requests\Wallet;

use Illuminate\Foundation\Http\FormRequest;

class TaoLinkNapTienRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id_shipper' => 'required|exists:shippers,id',
            'so_tien'    => 'required|numeric|min:10000',
        ];
    }

    public function messages(): array
    {
        return [
            'id_shipper.required' => 'Vui lòng chọn shipper.',
            'id_shipper.exists'   => 'Shipper không tồn tại.',
            'so_tien.required'    => 'Vui lòng nhập số tiền nạp.',
            'so_tien.numeric'     => 'Số tiền phải là số.',
            'so_tien.min'         => 'Số tiền nạp tối thiểu là 10.000đ.',
        ];
    }
}
