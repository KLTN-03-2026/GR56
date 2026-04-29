<?php

namespace App\Http\Requests\QuanHuyen;

use Illuminate\Foundation\Http\FormRequest;

class changeStatusQuanHuyenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'        => 'required|exists:quan_huyens,id',
        ];
    }

    public function messages(): array
    {
        return [
            'id.required' => 'Quận huyện không được để trống',
            'id.exists' => 'Quận huyện không tồn tại',
        ];
    }
}
