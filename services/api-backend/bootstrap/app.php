<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            "nhanVienMiddle"    => \App\Http\Middleware\NhanVienMiddleware::class,
            "shipperMiddle"     => \App\Http\Middleware\ShipperMiddleware::class,
            "khachHangMiddle"   => \App\Http\Middleware\KhachHangMiddleware::class,
            "quanAnMiddle"      => \App\Http\Middleware\QuanAnMiddleware::class,
            "masterMiddle"      => \App\Http\Middleware\MasterMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
