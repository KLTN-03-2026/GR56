<?php

namespace App\Http\Requests\QuanAn;

use Illuminate\Foundation\Http\FormRequest;

class QuanAnDeleteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => 'required|exists:quan_ans,id',

        ];
    }
    public function messages()
    {
           return [
            'id.required'   => 'Quán ăn cần xóa không được để trống!',
            'id.exists'     => 'Quán ăn cần xóa không tồn tại!',
        ];
    }
}
