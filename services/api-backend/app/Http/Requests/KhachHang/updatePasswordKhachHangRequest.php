<?php

namespace App\Http\Requests\KhachHang;

use Illuminate\Foundation\Http\FormRequest;

class updatePasswordKhachHangRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'old_password'  => 'required|min:6|max:20',
            'password'      => 'required|min:6|max:20|different:old_password',
            're_password'   => 'required|min:6|max:20|same:password',
        ];
    }

    public function messages()
    {
        return [
            'old_password.current_password' => 'Mật khẩu cũ không chính xác',
            'old_password.required'         => 'Mật khẩu cũ không được để trống',
            'old_password.min'              => 'Mật khẩu cũ phải có ít nhất 6 ký tự',
            'old_password.max'              => 'Mật khẩu cũ không được quá 20 ký tự',
            'password.required'             => 'Mật khẩu mới không được để trống',
            'password.min'                  => 'Mật khẩu mới phải có ít nhất 6 ký tự',
            'password.max'                  => 'Mật khẩu mới không được quá 20 ký tự',
            'password.different'            => 'Mật khẩu mới không được trùng với mật khẩu cũ',
            're_password.required'          => 'Nhập lại mật khẩu không được để trống',
            're_password.min'               => 'Nhập lại mật khẩu phải có ít nhất 6 ký tự',
            're_password.max'               => 'Nhập lại mật khẩu không được quá 20 ký tự',
            're_password.same'              => 'Nhập lại mật khẩu không khớp với mật khẩu mới',
        ];
    }
}
