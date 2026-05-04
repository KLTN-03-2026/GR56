<?php

namespace App\Http\Requests\NhanVien;

use Illuminate\Foundation\Http\FormRequest;

class NhanVienDoiMatKhauRequest extends FormRequest
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
            'mat_khau_cu'           => 'required|min:6|max:30',
            'mat_khau_moi'          => 'required|min:6|max:30',
            'xac_nhan_mat_khau_moi' => 'required|min:6|same:mat_khau_moi',
        ];
    }

    public function messages()
    {
        return [
            'mat_khau_cu.required'            => 'Mật khẩu cũ không được để trống.',
            'mat_khau_cu.min'                 => 'Mật khẩu cũ phải có ít nhất :min ký tự.',
            'mat_khau_cu.max'                 => 'Mật khẩu cũ không được vượt quá :max ký tự.',

            'mat_khau_moi.required'          => 'Mật khẩu mới không được để trống.',
            'mat_khau_moi.min'               => 'Mật khẩu mới phải có ít nhất :min ký tự.',
            'mat_khau_moi.max'               => 'Mật khẩu mới không được vượt quá :max ký tự.',

            'xac_nhan_mat_khau_moi.required' => 'Vui lòng nhập lại mật khẩu mới.',
            'xac_nhan_mat_khau_moi.min'      => 'Xác nhận mật khẩu mới phải có ít nhất :min ký tự.',
            'xac_nhan_mat_khau_moi.same'     => 'Xác nhận mật khẩu mới không khớp với mật khẩu mới.',
        ];
    }
}
