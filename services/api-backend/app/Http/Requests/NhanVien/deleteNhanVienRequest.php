<?php

namespace App\Http\Requests\NhanVien;

use Illuminate\Foundation\Http\FormRequest;

class deleteNhanVienRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'        => 'required|exists:nhan_viens,id',
        ];
    }

    public function messages(): array
    {
        return [
            'id.required' => 'Nhân viên không được để trống',
            'id.exists' => 'Nhân viên không tồn tại',
        ];
    }
}
