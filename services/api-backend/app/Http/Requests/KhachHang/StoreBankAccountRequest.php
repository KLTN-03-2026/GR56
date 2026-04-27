<?php

namespace App\Http\Requests\KhachHang;

use Illuminate\Foundation\Http\FormRequest;

class StoreBankAccountRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'ten_ngan_hang' => 'required|string|max:100',
            'so_tai_khoan'  => 'required|string|max:50',
            'chu_tai_khoan' => 'required|string|max:100',
            'chi_nhanh'     => 'nullable|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'ten_ngan_hang.required' => 'Vui lòng nhập tên ngân hàng.',
            'ten_ngan_hang.max'      => 'Tên ngân hàng không được vượt quá 100 ký tự.',
            'so_tai_khoan.required'  => 'Vui lòng nhập số tài khoản.',
            'so_tai_khoan.max'       => 'Số tài khoản không được vượt quá 50 ký tự.',
            'chu_tai_khoan.required' => 'Vui lòng nhập tên chủ tài khoản.',
            'chu_tai_khoan.max'      => 'Tên chủ tài khoản không được vượt quá 100 ký tự.',
        ];
    }
}
