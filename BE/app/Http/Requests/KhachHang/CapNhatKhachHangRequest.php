<?php

namespace App\Http\Requests\KhachHang;

use Illuminate\Foundation\Http\FormRequest;

class CapNhatKhachHangRequest extends FormRequest
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
            'id'            => 'required|exists:khach_hangs,id',
            'ho_va_ten'     => 'required|max:50',
            'so_dien_thoai' => 'required|digits:10',
            'email'         => 'required|email|unique:khach_hangs,email,' . $this->id,
            'ngay_sinh'     => 'required|date',
        ];
    }
    public function messages()
    {
        return [
            'id.required'           => 'Khách hàng cần cập nhật là bắt buộc',
            'id.exists'             => 'Khách hàng cần cập nhật không tồn tại',
            'ho_va_ten.required'    => 'Họ và tên không được để trống',
            'ho_va_ten.max'         => 'Họ và tên không được vượt quá 50 ký tự',
            'so_dien_thoai.required'=> 'Số điện thoại không được để trống',
            'so_dien_thoai.digits'  => 'Số điện thoại không đúng định dạng',
            'email.required'        => 'Email không được để trống',
            'email.email'           => 'Email không đúng định dạng',
            'email.unique'          => 'Email đã tồn tại',
            'ngay_sinh.required'    => 'Ngày sinh không được để trống',
            'ngay_sinh.date'        => 'Ngày sinh không đúng định dạng',

        ];
    }
}
