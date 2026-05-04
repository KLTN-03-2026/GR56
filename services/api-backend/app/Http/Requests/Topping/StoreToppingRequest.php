<?php

namespace App\Http\Requests\Topping;

use Illuminate\Foundation\Http\FormRequest;

class StoreToppingRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
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
