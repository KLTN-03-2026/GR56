<?php

namespace App\Http\Requests\ChucVu;

use Illuminate\Foundation\Http\FormRequest;

class updateChucVuRequest extends FormRequest
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
            'id' => 'required|exists:chuc_vus,id',
            'ten_chuc_vu' => 'required|string|max:255',
        ];
    }
    public function messages()
    {
        return [
            'id.required' => 'Chức Vụ không được để trống',
            'id.exists' => 'Chức Vụ không tồn tại',
            'ten_chuc_vu.required' => 'Tên chức vụ không được để trống',
            'ten_chuc_vu.string' => 'Tên chức vụ phải là chuỗi',
            'ten_chuc_vu.max' => 'Tên chức vụ không được vượt quá 255 ký tự',
        ];
    }
}
