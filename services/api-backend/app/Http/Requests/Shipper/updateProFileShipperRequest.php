<?php

namespace App\Http\Requests\Shipper;

use Illuminate\Foundation\Http\FormRequest;

class updateProFileShipperRequest extends FormRequest
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
            'ho_va_ten' => 'required|string|max:255',
            'so_dien_thoai' => 'required|numeric|digits:10',
            // 'password' => 'required|string|min:6|max:255',
            'cccd' => 'required|numeric|digits:12',
            'dia_chi' => 'required|string|max:255',
        ];
    }
    public function messages()
    {
        return [
            'ho_va_ten.required' => 'Họ và tên không được để trống',
            'ho_va_ten.string' => 'Họ và tên phải là chuỗi',
            'ho_va_ten.max' => 'Họ và tên không được quá 255 ký tự',
            'so_dien_thoai.required' => 'Số điện thoại không được để trống',
            'so_dien_thoai.numeric' => 'Số điện thoại phải là số',
            'so_dien_thoai.digits' => 'Số điện thoại phải có 10 chữ số',
            // 'password.required' => 'Mật khẩu không được để trống',
            // 'password.string' => 'Mật khẩu phải là chuỗi',
            // 'password.min' => 'Mật khẩu phải có ít nhất 6 ký tự',
            // 'password.max' => 'Mật khẩu không được quá 255 ký tự',
            'cccd.required' => 'CCCD không được để trống',
            'cccd.numeric' => 'CCCD phải là số',
            'cccd.digits' => 'CCCD phải có 12 chữ số',
        ];
    }
}
