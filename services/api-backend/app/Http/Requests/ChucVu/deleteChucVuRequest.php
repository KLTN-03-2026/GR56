<?php

namespace App\Http\Requests\ChucVu;

use Illuminate\Foundation\Http\FormRequest;

class deleteChucVuRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'id' => 'required|exists:chuc_vus,id',
        ];
    }
    public function messages()
    {
        return [
            'id.required' => 'Chức Vụ không được để trống',
            'id.exists' => 'Chức Vụ không tồn tại',
        ];
    }
}
