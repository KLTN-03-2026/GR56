<?php

namespace App\Http\Requests\KhachHang;

use Illuminate\Foundation\Http\FormRequest;

class changKhachHangRequest extends FormRequest
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
    public function messages()
    {
        return [
            'id.required' => 'Khách hàng cần cập nhật trạng thái là bắt buộc',
            'id.exists' => 'Khách hàng cần cập nhật trạng thái không tồn tại',
        ];
    }
}
