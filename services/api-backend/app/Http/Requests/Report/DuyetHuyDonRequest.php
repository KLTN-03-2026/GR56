<?php

namespace App\Http\Requests\Report;

use Illuminate\Foundation\Http\FormRequest;

class DuyetHuyDonRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id' => 'required|exists:reports,id',
        ];
    }

    public function messages(): array
    {
        return [
            'id.required' => 'Vui lòng chọn báo cáo.',
            'id.exists'   => 'Báo cáo không tồn tại.',
        ];
    }
}
