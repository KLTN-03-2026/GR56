<?php

namespace App\Http\Requests\TinhThanh;

use Illuminate\Foundation\Http\FormRequest;

class changeStatusTinhThanhRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id'                => 'required|exists:tinh_thanhs,id',
        ];
    }

    public function messages(): array
    {
        return [
            'id.required' => 'Tỉnh thành không được để trống',
            'id.exists' => 'Tỉnh thành không tồn tại',
        ];
    }
}
