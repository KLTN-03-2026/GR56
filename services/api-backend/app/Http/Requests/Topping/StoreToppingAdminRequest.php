<?php

namespace App\Http\Requests\Topping;

use Illuminate\Foundation\Http\FormRequest;

class StoreToppingAdminRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id_quan_an'  => 'required|integer|exists:quan_ans,id',
            'ten_topping' => 'required|string|max:255',
            'gia'         => 'required|numeric|min:0',
            'loai'        => 'required|in:drink,food,all',
            'hinh_anh'    => 'nullable|string',
            'mo_ta'       => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'id_quan_an.required'  => 'Vui lòng chọn quán ăn.',
            'id_quan_an.exists'    => 'Quán ăn không tồn tại.',
            'ten_topping.required' => 'Vui lòng nhập tên topping.',
            'ten_topping.max'      => 'Tên topping không được vượt quá 255 ký tự.',
            'gia.required'         => 'Vui lòng nhập giá topping.',
            'gia.numeric'          => 'Giá topping phải là số.',
            'gia.min'              => 'Giá topping không được âm.',
            'loai.required'        => 'Vui lòng chọn loại topping.',
            'loai.in'              => 'Loại topping không hợp lệ (drink, food, all).',
        ];
    }
}
