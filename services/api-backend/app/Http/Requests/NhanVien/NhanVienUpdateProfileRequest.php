<?php

namespace App\Http\Requests\NhanVien;

use Illuminate\Foundation\Http\FormRequest;

class NhanVienUpdateProfileRequest extends FormRequest
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
            'ho_va_ten'     => "required|min:3|max:50",
            'so_dien_thoai' => "required|digits:10",
            'email'         => "required|email|unique:nhan_viens,email," . $this->id,
            'dia_chi'       => "required|min:3|max:200",
        ];
    }

    public function messages()
    {
        return [
            'ho_va_ten.required'     => 'Họ và tên không được để trống.',
            'ho_va_ten.min'          => 'Họ và tên phải có ít nhất :min ký tự.',
            'ho_va_ten.max'          => 'Họ và tên không được vượt quá :max ký tự.',

            'so_dien_thoai.required' => 'Số điện thoại không được để trống.',
            'so_dien_thoai.digits'   => 'Số điện thoại phải có đúng :digits chữ số.',

            'email.required'         => 'Email không được để trống.',
            'email.email'            => 'Email không đúng định dạng.',
            'email.unique'           => 'Email này đã được sử dụng.',

            'dia_chi.required'       => 'Địa chỉ không được để trống.',
            'dia_chi.min'            => 'Địa chỉ phải có ít nhất :min ký tự.',
            'dia_chi.max'            => 'Địa chỉ không được vượt quá :max ký tự.',
        ];
    }
}
