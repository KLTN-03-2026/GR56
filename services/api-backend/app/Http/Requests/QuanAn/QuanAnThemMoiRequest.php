<?php

namespace App\Http\Requests\QuanAn;

use Illuminate\Foundation\Http\FormRequest;

class QuanAnThemMoiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'             => 'required|email|unique:quan_ans,email',
            'password'          => 'required|min:6|max:255',
            're_password'       => 'required|min:6|max:255|same:password',
            'ma_so_thue'        => 'required|min:1|max:255',
            'ten_quan_an'       => 'required|min:1|max:255',
            'hinh_anh'          => 'required',
            'so_dien_thoai'     => 'required|min:10|max:11|unique:quan_ans,so_dien_thoai',
            'gio_mo_cua'        => 'required|date_format:H:i',
            'gio_dong_cua'      => 'required|date_format:H:i',
            'dia_chi'           => 'required|min:1|max:255',
            'id_quan_huyen'     => 'required|exists:quan_huyens,id',
        ];
    }
    public function messages(): array
    {
        return [
            'email.required'        => 'Email là bắt buộc.',
            'email.email'           => 'Email không hợp lệ.',
            'email.unique'          => 'Email đã tồn tại.',
            'password.required'     => 'Mật khẩu là bắt buộc.',
            'password.min'          => 'Mật khẩu phải có ít nhất 6 ký tự.',
            'password.max'          => 'Mật khẩu không được vượt quá 255 ký tự.',
            're_password.required'  => 'Mật khẩu xác nhận là bắt buộc.',
            're_password.min'       => 'Mật khẩu xác nhận phải có ít nhất 6 ký tự.',
            're_password.max'       => 'Mật khẩu xác nhận không được vượt quá 255 ký tự.',
            're_password.same'      => 'Mật khẩu xác nhận không khớp.',
            'ma_so_thue.required'   => 'Mã số thuế là bắt buộc.',
            'ma_so_thue.min'        => 'Mã số thuế phải có ít nhất 1 ký tự.',
            'ma_so_thue.max'        => 'Mã số thuế không được vượt quá 255 ký tự.',
            'ten_quan_an.required'  => 'Tên quán ăn là bắt buộc.',
            'ten_quan_an.min'       => 'Tên quán ăn phải có ít nhất 1 ký tự.',
            'ten_quan_an.max'       => 'Tên quán ăn không được vượt quá 255 ký tự.',
            'hinh_anh.required'     => 'Hình ảnh là bắt buộc.',
            'so_dien_thoai.required' => 'Số điện thoại là bắt buộc.',
            'so_dien_thoai.min'     => 'Số điện thoại phải có ít nhất 10 ký tự.',
            'so_dien_thoai.max'     => 'Số điện thoại không được vượt quá 11 ký tự.',
            'gio_mo_cua.required'   => 'Giờ mở cửa là bắt buộc.',
            'gio_mo_cua.date_format' => 'Giờ mở cửa không hợp lệ.',
            'gio_dong_cua.required' => 'Giờ đóng cửa là bắt buộc.',
            'gio_dong_cua.date_format' => 'Giờ đóng cửa không hợp lệ.',
            'dia_chi.required'      => 'Địa chỉ là bắt buộc.',
            'dia_chi.min'           => 'Địa chỉ phải có ít nhất 1 ký tự.',
            'dia_chi.max'           => 'Địa chỉ không được vượt quá 255 ký tự.',
            'id_quan_huyen.required' => 'Quận/Huyện là bắt buộc.',
            'id_quan_huyen.exists'  => 'Quận/Huyện không tồn tại.',
            'so_dien_thoai.unique'  => 'Số điện thoại đã tồn tại.',
        ];
    }
}
