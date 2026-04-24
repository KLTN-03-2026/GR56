<?php

namespace App\Http\Requests\KhachHang;

use Illuminate\Foundation\Http\FormRequest;

class changeActiveRequest extends FormRequest
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
            'id' => 'required|exists:khach_hangs,id',
        ];
    }
    public function messages(): array
    {
        return [
            'id.required' => 'Khách hàng cần đổi trạng thái không được để trống',
            'id.exists' => 'Khách hàng cần đổi trạng thái không tồn tại',
        ];
    }
}
