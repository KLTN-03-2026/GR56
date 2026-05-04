<?php

namespace App\Http\Requests\MonAn;

use Illuminate\Foundation\Http\FormRequest;

class deleteMonAnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'                => 'required|exists:mon_ans,id',
        ];
    }

    public function messages(): array
    {
        return [
            'id.required' => 'Món ăn không được để trống',
            'id.exists' => 'Món ăn không tồn tại',
        ];
    }
}
