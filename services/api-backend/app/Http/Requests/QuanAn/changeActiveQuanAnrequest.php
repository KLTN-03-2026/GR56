<?php

namespace App\Http\Requests\QuanAn;

use Illuminate\Foundation\Http\FormRequest;

class changeActiveQuanAnrequest extends FormRequest
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
    public function messages(): array
    {
        return [
            'id.required' => 'Quán ăn cần đổi trạng thái không được để trống',
            'id.exists' => 'Quán ăn cần đổi trạng thái không tồn tại',
        ];
    }
}
