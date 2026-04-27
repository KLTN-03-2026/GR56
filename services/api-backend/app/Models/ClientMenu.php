<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientMenu extends Model
{
    protected $table = 'client_menus';
    protected $fillable = [
        'ten_menu',
        'link',
        'icon',
        'tinh_trang',
        'thu_tu'
    ];
}
