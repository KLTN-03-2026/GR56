<?php

namespace App\Http\Requests\Report;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAdminReportRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id'         => 'required|exists:reports,id',
            'trang_thai' => 'required|string',
        ];
    }

    public function messages(): array
    {
        return [
            'id.required'         => 'Vui lòng chọn báo cáo.',
            'id.exists'           => 'Báo cáo không tồn tại.',
            'trang_thai.required' => 'Vui lòng chọn trạng thái xử lý.',
        ];
    }
}
