<?php

namespace App\Http\Requests\KhachHang;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Contracts\Validation\Validator;

class DangKyKhachHangRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ho_va_ten'     => 'required|string|max:100|min:3',
            'email'         => 'required|email|unique:khach_hangs,email',
            'password'      => 'required|string|min:6',
            'ngay_sinh'     => 'nullable|date',
            'so_dien_thoai' => 'nullable|string|digits:10',
        ];
    }

    public function messages(): array
    {
        return [
            'ho_va_ten.required'     => 'Vui lòng nhập họ và tên.',
            'ho_va_ten.min'          => 'Họ và tên phải có ít nhất 3 ký tự.',
            'ho_va_ten.max'          => 'Họ và tên không được quá 100 ký tự.',
            'email.required'         => 'Vui lòng nhập email.',
            'email.email'            => 'Email không đúng định dạng.',
            'email.unique'           => 'Email này đã được đăng ký. Vui lòng dùng email khác hoặc đăng nhập!',
            'password.required'      => 'Vui lòng nhập mật khẩu.',
            'password.min'           => 'Mật khẩu phải có ít nhất 6 ký tự.',
            'so_dien_thoai.digits'   => 'Số điện thoại phải có đúng 10 số.',
        ];
    }

    /**
     * Trả về JSON thay vì redirect khi validation thất bại (API).
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'status'  => 0,
            'message' => $validator->errors()->first(),
        ], 422));
    }
}
