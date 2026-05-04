<?php

namespace App\Http\Requests\DanhMuc;

use Illuminate\Foundation\Http\FormRequest;

class CapNhatDanhMucRequest extends FormRequest
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
            'id'              => 'required|integer|exists:danh_mucs,id',
            'ten_danh_muc'    => 'required|string|max:255',
            'slug_danh_muc'   => 'required|string|max:255|unique:danh_mucs,slug_danh_muc,' . $this->id,
            'tinh_trang'      => 'required|boolean',
            'id_danh_muc_cha' => 'nullable|integer|exists:danh_mucs,id',
            'hinh_anh'        => 'nullable|string',
        ];
    }
    public function messages()
    {
        return [
            'id.required' => 'Danh mục không được để trống!',
            'id.integer' => 'Danh mục phải là số nguyên!',
            'id.exists' => 'Danh mục không tồn tại!',

            'ten_danh_muc.required' => 'Tên danh mục không được để trống!',
            'ten_danh_muc.string' => 'Tên danh mục phải là chuỗi!',
            'ten_danh_muc.max' => 'Tên danh mục không được quá 255 ký tự!',

            'slug_danh_muc.required' => 'Slug danh mục không được để trống!',
            'slug_danh_muc.string' => 'Slug danh mục phải là chuỗi!',
            'slug_danh_muc.max' => 'Slug danh mục không được quá 255 ký tự!',
            'slug_danh_muc.unique' => 'Slug danh mục đã tồn tại!',

            'tinh_trang.required' => 'Tình trạng không được để trống!',
            'tinh_trang.boolean' => 'Tình trạng phải là boolean!',

            'id_danh_muc_cha.integer' => 'Danh mục cha phải là số nguyên!',
            'id_danh_muc_cha.exists' => 'Danh mục cha không tồn tại!',

            'hinh_anh.string' => 'Hình ảnh phải là chuỗi!',
        ];
    }
}
