<?php

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;

class GuiTinNhanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id_don_hang' => 'required|integer|exists:don_hangs,id',
            'noi_dung'    => 'required|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'id_don_hang.required' => 'Vui lòng chọn đơn hàng.',
            'id_don_hang.exists'   => 'Đơn hàng không tồn tại.',
            'noi_dung.required'    => 'Vui lòng nhập nội dung tin nhắn.',
            'noi_dung.max'         => 'Tin nhắn không được vượt quá 1000 ký tự.',
        ];
    }
}
