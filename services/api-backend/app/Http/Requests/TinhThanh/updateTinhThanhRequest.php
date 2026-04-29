<?php

namespace App\Http\Requests\TinhThanh;

use Illuminate\Foundation\Http\FormRequest;

class updateTinhThanhRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'                => 'required|exists:tinh_thanhs,id',
            'ten_tinh_thanh'    => 'required|min:1|max:255',
            'tinh_trang'        => 'required|boolean'
        ];
    }

    public function messages(): array
    {
        return [
            'id.required' => 'Tỉnh thành không được để trống',
            'id.exists' => 'Tỉnh thành không tồn tại',
            'ten_tinh_thanh.required' => 'Tên tỉnh thành không được để trống',
            'ten_tinh_thanh.min' => 'Tên tỉnh thành phải có ít nhất 1 ký tự',
            'ten_tinh_thanh.max' => 'Tên tỉnh thành không được quá 255 ký tự',
            'tinh_trang.required' => 'Tình trạng không được để trống',
            'tinh_trang.boolean' => 'Tình trạng phải là true hoặc false'
        ];
    }
}
