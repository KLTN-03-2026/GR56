<?php

namespace App\Http\Requests\KhachHang;

use Illuminate\Foundation\Http\FormRequest;

class CapNhatXuKhachHangRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules()
    {
        return [
            'id'    => 'required|exists:khach_hangs,id',
            'so_xu' => 'required|integer|not_in:0',
            'mo_ta' => 'required|string'
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages()
    {
        return [
            'id.required'    => 'Khách hàng không tồn tại.',
            'id.exists'      => 'Khách hàng không tồn tại trong hệ thống.',
            'so_xu.required' => 'Vui lòng nhập số xu.',
            'so_xu.integer'  => 'Số xu phải là một số nguyên.',
            'so_xu.not_in'   => 'Số xu giao dịch phải khác 0.',
            'mo_ta.required' => 'Vui lòng nhập lý do giao dịch.'
        ];
    }
}
