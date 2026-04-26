<?php

namespace App\Http\Requests\Voucher;

use Illuminate\Foundation\Http\FormRequest;

class deleteQuanAnVoucherRequest extends FormRequest
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
            'id'        => 'required|exists:vouchers,id',
        ];
    }

    public function messages()
    {
        return [
            'id.required' => 'Vouver không được để trống',
            'id.exists'   => 'Vouver không tồn tại trong hệ thống',
        ];
    }
}
