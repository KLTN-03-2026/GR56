<?php

namespace App\Http\Requests\MonAn;

use Illuminate\Foundation\Http\FormRequest;

class changeStatusMonAnRequest extends FormRequest
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

    public function messages()
    {
        return [
            'required'          => ':attribute không được để trống',
            'exists'            => ':attribute không tồn tại',
        ];
    }

    public function attributes()
    {
        return [
            'id'                => 'Món ăn ',
        ];
    }
}
