<?php

namespace App\Http\Requests\DonHang;

use Illuminate\Foundation\Http\FormRequest;

class TinhPhiShipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_quan_an'            => 'required|exists:quan_ans,id',
            'id_dia_chi_khach'      => 'required|exists:dia_chis,id',
        ];
    }

    public function messages(): array
    {
        return [
            'id_quan_an.required'       => 'Vui lòng chọn địa chỉ quán ăn',
            'id_quan_an.exists'         => 'Địa chỉ quán ăn không tồn tại',
            'id_dia_chi_khach.required' => 'Vui lòng chọn địa chỉ giao hàng',
            'id_dia_chi_khach.exists'   => 'Địa chỉ giao hàng không tồn tại',
        ];
    }
}
