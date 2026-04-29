<?php

namespace App\Http\Requests\Shipper;

use Illuminate\Foundation\Http\FormRequest;

class CapNhatShipperRequest extends FormRequest
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
            'id' => 'required|exists:shippers,id',
            'ho_va_ten' => 'required|max:100',
            'email' => 'required|email|unique:shippers,email,' . $this->id,
            'cccd' => 'required|digits:12|unique:shippers,cccd,' . $this->id,
            'so_dien_thoai' => 'required|digits:10|unique:shippers,so_dien_thoai,' . $this->id,
        ];
    }

    public function messages()
    {
        return [
            'id.required' => 'Shipper cần cập nhật không được để trống',
            'id.exists' => 'Shipper cần cập nhật không tồn tại',
            'ho_va_ten.required' => 'Họ và tên không được để trống',
            'ho_va_ten.max' => 'Họ và tên không được quá 100 ký tự',
            'email.required' => 'Email không được để trống',
            'email.email' => 'Email không đúng định dạng',
            'email.unique' => 'Email đã tồn tại',
            'cccd.required' => 'CCCD không được để trống',
            'cccd.digits' => 'CCCD không đúng định dạng',
            'cccd.unique' => 'CCCD đã tồn tại',
            'so_dien_thoai.required' => 'Số điện thoại không được để trống',
            'so_dien_thoai.digits' => 'Số điện thoại không đúng định dạng',
            'so_dien_thoai.unique' => 'Số điện thoại đã tồn tại',
        ];
    }
}
