<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreThongBaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tieu_de'  => 'required|string|max:255',
            'noi_dung' => 'required|string',
            'loai'     => 'required|in:sale,event,news',
            'duong_dan'=> 'nullable|string|max:500',
            'hinh_anh' => 'nullable|file|mimes:jpeg,png,jpg,gif,webp,svg|max:5120',
        ];
    }

    public function messages(): array
    {
        return [
            'tieu_de.required'  => 'Vui lòng nhập tiêu đề',
            'noi_dung.required' => 'Vui lòng nhập nội dung',
            'loai.required'     => 'Vui lòng chọn loại thông báo',
            'hinh_anh.mimes'    => 'Hình ảnh phải có định dạng jpeg, png, jpg, gif, webp hoặc svg.',
            'hinh_anh.max'      => 'Dung lượng hình ảnh không được vượt quá 5MB.',
        ];
    }
}
