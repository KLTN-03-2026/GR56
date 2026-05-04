<?php

namespace App\Http\Requests\PhanQuyen;

use Illuminate\Foundation\Http\FormRequest;

class deletePhanQuyenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_chuc_vu'        => 'required|exists:phan_quyens,id_chuc_vu',
            'id_chuc_nang'      => 'required|exists:phan_quyens,id_chuc_nang',
        ];
    }

    public function messages()
    {
        return [
            'id_chuc_vu.required'   => 'Chức vụ không được để trống',
            'id_chuc_vu.exists'     => 'Chức vụ không tồn tại',
            'id_chuc_nang.required' => 'Chức năng không được để trống',
            'id_chuc_nang.exists'   => 'Chức năng không tồn tại',
        ];
    }
}
