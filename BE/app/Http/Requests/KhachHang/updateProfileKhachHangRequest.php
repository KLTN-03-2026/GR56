<?php

namespace App\Http\Requests\KhachHang;

use Illuminate\Foundation\Http\FormRequest;

class updateProfileKhachHangRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ho_va_ten'     => 'required|min:10|max:50',
            'so_dien_thoai' => 'required|digits:10|unique:khach_hangs,so_dien_thoai,' . $this->id,
            'email'         => 'required|email|unique:khach_hangs,email,' . $this->id,
            'ngay_sinh'     => 'required|date',
            'cccd'          => 'required|digits:12|unique:khach_hangs,cccd,' . $this->id,
            'avatar'        => 'required|string',
        ];
    }

    public function messages()
    {
        return [
            'ho_va_ten.required'     => 'Họ và tên không được để trống',
            'ho_va_ten.min'         => 'Họ và tên phải có ít nhất 10 ký tự',
            'ho_va_ten.max'         => 'Họ và tên không được quá 50 ký tự',
            'so_dien_thoai.required' => 'Số điện thoại không được để trống',
            'so_dien_thoai.digits'   => 'Số điện thoại phải có 10 chữ số',
            'so_dien_thoai.unique'   => 'Số điện thoại đã tồn tại',
            'email.required'         => 'Email không được để trống',
            'email.email'            => 'Email không đúng định dạng',
            'email.unique'           => 'Email đã tồn tại',
            'ngay_sinh.required'     => 'Ngày sinh không được để trống',
            'ngay_sinh.date'         => 'Ngày sinh không đúng định dạng',
            'cccd.digits'            => 'CCCD phải có 12 chữ số',
            'cccd.required'          => 'CCCD không được để trống',
            'avatar.required'        => 'Ảnh đại diện không được để trống',
            'avatar.string'          => 'Ảnh đại diện phải là link url',
        ];
    }
}
