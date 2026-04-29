<?php

namespace App\Http\Requests\Shipper;

use Illuminate\Foundation\Http\FormRequest;

class UpdateShipperLocationRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'lat'         => 'required|numeric|between:-90,90',
            'lng'         => 'required|numeric|between:-180,180',
            'id_don_hang' => 'nullable|exists:don_hangs,id',
        ];
    }

    public function messages(): array
    {
        return [
            'lat.required'      => 'Vui lòng cung cấp vĩ độ.',
            'lat.numeric'       => 'Vĩ độ phải là số.',
            'lat.between'       => 'Vĩ độ không hợp lệ (phải từ -90 đến 90).',
            'lng.required'      => 'Vui lòng cung cấp kinh độ.',
            'lng.numeric'       => 'Kinh độ phải là số.',
            'lng.between'       => 'Kinh độ không hợp lệ (phải từ -180 đến 180).',
            'id_don_hang.exists'=> 'Đơn hàng không tồn tại.',
        ];
    }
}
