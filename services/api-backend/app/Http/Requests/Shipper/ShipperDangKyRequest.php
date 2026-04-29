<?php

namespace App\Http\Requests\Shipper;

use Illuminate\Foundation\Http\FormRequest;

class ShipperDangKyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ho_va_ten'     => 'required|string|max:255',
            'email'         => 'required|email|max:255|unique:shippers,email',
            'password'      => 'required|min:6|max:255',
            'so_dien_thoai' => 'required|string|max:15|unique:shippers,so_dien_thoai',
            'cccd'          => 'required|string|size:12|unique:shippers,cccd',
        ];
    }

    public function messages(): array
    {
        return [
            'ho_va_ten.required'     => 'Họ và tên không được để trống.',
            'ho_va_ten.max'          => 'Họ và tên không được quá 255 ký tự.',

            'email.required'         => 'Email không được để trống.',
            'email.email'            => 'Email không đúng định dạng.',
            'email.max'              => 'Email không được quá 255 ký tự.',
            'email.unique'           => 'Email đã tồn tại.',

            'password.required'      => 'Mật khẩu không được để trống.',
            'password.min'           => 'Mật khẩu phải có ít nhất 6 ký tự.',
            'password.max'           => 'Mật khẩu không được quá 255 ký tự.',
            
            'so_dien_thoai.required' => 'Số điện thoại không được để trống.',
            'so_dien_thoai.max'      => 'Số điện thoại không hợp lệ.',
            'so_dien_thoai.unique'   => 'Số điện thoại đã tồn tại.',

            'cccd.required'          => 'Số CCCD không được để trống.',
            'cccd.size'              => 'Số CCCD phải đúng 12 chữ số.',
            'cccd.unique'            => 'Số CCCD đã tồn tại.',
        ];
    }
}
