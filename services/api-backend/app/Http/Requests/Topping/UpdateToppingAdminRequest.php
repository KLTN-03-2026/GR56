<?php

namespace App\Http\Requests\Topping;

use Illuminate\Foundation\Http\FormRequest;

class UpdateToppingAdminRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id'          => 'required|integer|exists:toppings,id',
            'id_quan_an'  => 'sometimes|integer|exists:quan_ans,id',
            'ten_topping' => 'sometimes|string|max:255',
            'gia'         => 'sometimes|numeric|min:0',
            'loai'        => 'sometimes|in:drink,food,all',
            'hinh_anh'    => 'nullable|string',
            'mo_ta'       => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'id.required'          => 'Vui lòng chọn topping cần cập nhật.',
            'id.exists'            => 'Topping không tồn tại.',
            'id_quan_an.exists'    => 'Quán ăn không tồn tại.',
            'ten_topping.max'      => 'Tên topping không được vượt quá 255 ký tự.',
            'gia.numeric'          => 'Giá topping phải là số.',
            'gia.min'              => 'Giá topping không được âm.',
            'loai.in'              => 'Loại topping không hợp lệ (drink, food, all).',
        ];
    }
}
