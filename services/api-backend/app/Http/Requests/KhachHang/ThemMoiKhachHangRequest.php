<?php

namespace App\Http\Requests\KhachHang;

use Illuminate\Foundation\Http\FormRequest;

class ThemMoiKhachHangRequest extends FormRequest
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
            'ho_va_ten'     => 'required|max:100|min:3',
            'so_dien_thoai' => 'required|numeric|digits:10',
            'email'         => 'required|email|unique:khach_hangs,email',
            'password'      => 'required|min:6',
            'ngay_sinh'     => 'required|date',
        ];
    }
    public function messages()
    {
        return [
            'ho_va_ten.required'    => 'Họ và tên không được để trống',
            'ho_va_ten.max'         => 'Họ và tên không được vượt quá 100 ký tự',
            'ho_va_ten.min'         => 'Họ và tên không được nhỏ hơn 3 ký tự',
            'so_dien_thoai.required'=> 'Số điện thoại không được để trống',
            'so_dien_thoai.numeric' => 'Số điện thoại phải là số',
            'so_dien_thoai.digits'  => 'Số điện thoại phải có 10 số',
            'email.required'        => 'Email không được để trống',
            'email.email'           => 'Email không đúng định dạng',
            'email.unique'          => 'Email đã tồn tại',
            'password.required'     => 'Mật khẩu không được để trống',
            'password.min'          => 'Mật khẩu phải có ít nhất 6 ký tự',
            'ngay_sinh.required'    => 'Ngày sinh không được để trống',
            'ngay_sinh.date'        => 'Ngày sinh không đúng định dạng',

        ];
    }
}
