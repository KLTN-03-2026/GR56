<?php

namespace App\Http\Requests\QuanAn;

use Illuminate\Foundation\Http\FormRequest;

class QuanAnUpdateProfileRequest extends FormRequest
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
            'ten_quan_an'     => "required|max:50",
            'so_dien_thoai' => "required|digits:10",
            'email'         => "required|email|max:50|unique:quan_ans,email," . $this->id,
            'dia_chi'       => "required|max:100",
        ];
    }

    public function messages(): array
{
    return [
        'ten_quan_an.required'     => 'Họ và tên không được để trống.',
        'ten_quan_an.max'          => 'Họ và tên không được vượt quá :max ký tự.',

        'so_dien_thoai.required' => 'Số điện thoại không được để trống.',
        'so_dien_thoai.digits'   => 'Số điện thoại phải có đúng :digits chữ số.',

        'email.required'         => 'Email không được để trống.',
        'email.email'            => 'Email không đúng định dạng.',
        'email.max'              => 'Email không được vượt quá :max ký tự.',
        'email.unique'           => 'Email này đã được sử dụng.',

        'dia_chi.required'       => 'Địa chỉ không được để trống.',
        'dia_chi.max'            => 'Địa chỉ không được vượt quá :max ký tự.',
    ];
}

}
