<?php

namespace App\Http\Requests\Shipper;

use Illuminate\Foundation\Http\FormRequest;

class updatePasswordShipperRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }


    public function rules(): array
    {
        return [
            "old_password" => "required|string|min:6|max:255",
            "password" => "required|string|min:6|max:255",
            "re_password" => "required|string|min:6|max:255|same:password",
        ];
            
    }
    public function messages()
    {
        return [
            'old_password.required' => 'Mật khẩu cũ không được để trống',
            'old_password.string' => 'Mật khẩu cũ phải là chuỗi',
            'old_password.min' => 'Mật khẩu cũ phải có ít nhất 6 ký tự',
            'old_password.max' => 'Mật khẩu cũ không được quá 255 ký tự',
            'password.required' => 'Mật khẩu mới không được để trống',
            'password.string' => 'Mật khẩu mới phải là chuỗi',
            'password.min' => 'Mật khẩu mới phải có ít nhất 6 ký tự',
            'password.max' => 'Mật khẩu mới không được quá 255 ký tự',
            're_password.required' => 'Nhập lại mật khẩu không được để trống',
            're_password.string' => 'Nhập lại mật khẩu phải là chuỗi',
            're_password.min' => 'Nhập lại mật khẩu phải có ít nhất 6 ký tự',
            're_password.max' => 'Nhập lại mật khẩu không được quá 255 ký tự',
            're_password.same' => 'Nhập lại mật khẩu không khớp',
        ];
    }
}
