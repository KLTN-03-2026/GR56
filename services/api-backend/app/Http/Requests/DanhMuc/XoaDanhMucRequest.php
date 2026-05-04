<?php

namespace App\Http\Requests\DanhMuc;

use Illuminate\Foundation\Http\FormRequest;

class XoaDanhMucRequest extends FormRequest
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
            'id' => 'required|integer|exists:danh_mucs,id',
        ];
    }
    public function messages()
    {
        return [
            'id.required' => 'Danh mục không được để trống!',
            'id.integer' => 'Danh mục phải là số nguyên!',
            'id.exists' => 'Danh mục không tồn tại!',
        ];
    }
}
