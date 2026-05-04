<?php

namespace App\Http\Requests\GioHang;

use Illuminate\Foundation\Http\FormRequest;

class ThemGioHangRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'    =>  'required|exists:mon_ans,id'
        ];
    }

    public function messages(): array
    {
        return [
            'id.required' => 'Vui lòng chọn món ăn',
            'id.exists'   => 'Món ăn không tồn tại'
        ];
    }
}
