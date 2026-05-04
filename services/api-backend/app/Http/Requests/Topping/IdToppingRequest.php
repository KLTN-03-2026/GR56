<?php

namespace App\Http\Requests\Topping;

use Illuminate\Foundation\Http\FormRequest;

class IdToppingRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id' => 'required|integer|exists:toppings,id',
        ];
    }

    public function messages(): array
    {
        return [
            'id.required' => 'Vui lòng chọn topping.',
            'id.exists'   => 'Topping không tồn tại.',
        ];
    }
}
