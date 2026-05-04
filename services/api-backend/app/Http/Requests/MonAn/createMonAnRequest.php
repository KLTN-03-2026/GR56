<?php

namespace App\Http\Requests\MonAn;

use Illuminate\Foundation\Http\FormRequest;

class createMonAnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ten_mon_an'        => 'required|min:5|max:255',
            'slug_mon_an'       => 'required|unique:mon_ans,slug_mon_an',
            'gia_ban'           => 'required|numeric',
            'gia_khuyen_mai'    => 'required|numeric',
            // 'id_quan_an'        => 'required|exists:quan_ans,id',
            'tinh_trang'        => 'required|boolean',
            'hinh_anh'          => 'required',
            'id_danh_muc'       => 'required|exists:danh_mucs,id',
        ];
    }

    public function messages()
    {
        return [
            'required'          => ':attribute không được để trống',
            'min'               => ':attribute không được nhỏ hơn :min ký tự',
            'max'               => ':attribute không được lớn hơn :max ký tự',
            'unique'            => ':attribute đã tồn tại',
            'numeric'           => ':attribute phải là số',
            'exists'            => ':attribute không tồn tại',
            'boolean'           => ':attribute phải là true hoặc false',

        ];
    }

    public function attributes()
    {
        return [
            'ten_mon_an'        => 'Tên món ăn',
            'slug_mon_an'       => 'Slug món ăn',
            'gia_ban'           => 'Giá bán',
            'gia_khuyen_mai'    => 'Giá khuyến mãi',
            // 'id_quan_an'        => 'Quán ăn',
            'tinh_trang'        => 'Tình trạng',
            'hinh_anh'          => 'Hình ảnh',
            'id_danh_muc'       => 'Danh mục',
        ];
    }
}
