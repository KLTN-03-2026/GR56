<?php

namespace App\Http\Requests\Shipper;

use Illuminate\Foundation\Http\FormRequest;

class activeShipperRequest extends FormRequest
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
        ];
    }

    public function messages()
    {
        return [
            'id.required' => 'Shipper cần kích hoạt không được để trống',
            'id.exists' => 'Shipper cần kích hoạt không tồn tại',
        ];
    }
}
