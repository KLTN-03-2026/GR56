<?php

namespace App\Http\Requests\TinhThanh;

use Illuminate\Foundation\Http\FormRequest;

class createTinhThanhRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ten_tinh_thanh'    => 'required|min:1|max:255|unique:tinh_thanhs,ten_tinh_thanh',
            'tinh_trang'        => 'required|boolean'
        ];
    }

    public function messages(): array
    {
        return [
            'ten_tinh_thanh.required' => 'Tên tỉnh thành không được để trống',
            'ten_tinh_thanh.min' => 'Tên tỉnh thành phải có ít nhất 1 ký tự',
            'ten_tinh_thanh.max' => 'Tên tỉnh thành không được quá 255 ký tự',
            'ten_tinh_thanh.unique' => 'Tên tỉnh thành đã tồn tại',
            'tinh_trang.required' => 'Tình trạng không được để trống',
            'tinh_trang.boolean' => 'Tình trạng phải là true hoặc false'
        ];
    }
}
