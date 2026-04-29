<?php

namespace App\Http\Requests\DiaChi;

use Illuminate\Foundation\Http\FormRequest;

class deleteDiaChiKhachHangRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'        => 'required|exists:dia_chis,id',
        ];
    }

    public function messages()
    {
        return [
            'id.required'               => 'Địa chỉ không được để trống',
            'id.exists'                 => 'Địa chỉ không tồn tại',
        ];
    }
}
