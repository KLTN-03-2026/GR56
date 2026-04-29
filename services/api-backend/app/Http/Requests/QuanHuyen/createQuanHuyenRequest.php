<?php

namespace App\Http\Requests\QuanHuyen;

use Illuminate\Foundation\Http\FormRequest;

class createQuanHuyenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ten_quan_huyen'      => 'required|min:1|max:255',
            'toa_do_x'            => '',
            'toa_do_y'            => '',
            'tinh_trang'          => 'required|boolean',
            'id_tinh_thanh'       => 'required|exists:tinh_thanhs,id'
        ];
    }

    public function messages(): array
    {
        return [
            'ten_quan_huyen.required' => 'Tên quận huyện không được để trống',
            'ten_quan_huyen.min' => 'Tên quận huyện phải có ít nhất 1 ký tự',
            'ten_quan_huyen.max' => 'Tên quận huyện không được quá 255 ký tự',
            'tinh_trang.required' => 'Tình trạng không được để trống',
            'tinh_trang.boolean' => 'Tình trạng phải là true hoặc false',
            'id_tinh_thanh.required' => 'Tỉnh thành không được để trống',
            'id_tinh_thanh.exists' => 'Tỉnh thành không tồn tại'
        ];
    }
}
