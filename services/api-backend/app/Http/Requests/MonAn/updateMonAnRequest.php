<?php

namespace App\Http\Requests\MonAn;

use Illuminate\Foundation\Http\FormRequest;

class updateMonAnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'                => 'required|exists:mon_ans,id',
            'ten_mon_an'        => 'required|min:5|max:255',
            'slug_mon_an'       => 'nullable|unique:mon_ans,slug_mon_an,' . $this->input('id') . ',id',
            'gia_ban'           => 'required|numeric',
            'gia_khuyen_mai'    => 'required|numeric',
            'id_quan_an'        => 'required|exists:quan_ans,id',
            'tinh_trang'        => 'required|boolean',
            'hinh_anh'          => 'required',
            'id_danh_muc'       => 'required|exists:danh_mucs,id',
        ];
    }

    public function messages(): array
    {
        return [
            'id.required'             => 'ID món ăn không được để trống.',
            'id.exists'               => 'Món ăn không tồn tại.',
            'ten_mon_an.required'      => 'Tên món ăn không được để trống.',
            'ten_mon_an.min'           => 'Tên món ăn phải có ít nhất 5 ký tự.',
            'ten_mon_an.max'           => 'Tên món ăn quá dài.',
            'slug_mon_an.unique'       => 'Slug món ăn đã tồn tại.',
            'gia_ban.required'         => 'Giá bán không được để trống.',
            'gia_ban.numeric'          => 'Giá bán phải là số.',
            'gia_khuyen_mai.required'  => 'Giá khuyến mãi không được để trống.',
            'gia_khuyen_mai.numeric'   => 'Giá khuyến mãi phải là số.',
            'id_quan_an.required'      => 'Quán ăn không được để trống.',
            'id_quan_an.exists'        => 'Quán ăn không tồn tại.',
            'tinh_trang.required'      => 'Tình trạng không được để trống.',
            'tinh_trang.boolean'       => 'Tình trạng không hợp lệ.',
            'hinh_anh.required'        => 'Hình ảnh không được để trống.',
            'id_danh_muc.required'     => 'Danh mục không được để trống.',
            'id_danh_muc.exists'       => 'Danh mục không tồn tại.',
        ];
    }
}
