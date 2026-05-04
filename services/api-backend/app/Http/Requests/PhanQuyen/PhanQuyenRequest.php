<?php

namespace App\Http\Requests\PhanQuyen;

use Illuminate\Foundation\Http\FormRequest;

class PhanQuyenRequest extends FormRequest
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
            'id_chuc_vu' => 'required|exists:chuc_vus,id',
            'id_chuc_nang' => 'required|exists:chuc_nangs,id',
        ];
    }
    public function messages(): array
    {
        return [
            'id_chuc_vu.required' => 'Chức vụ không được để trống',
            'id_chuc_vu.exists' => 'Chức vụ không tồn tại',
            'id_chuc_nang.required' => 'Chức năng không được để trống',
            'id_chuc_nang.exists' => 'Chức năng không tồn tại',
        ];
    }
}
