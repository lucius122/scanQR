<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Prepend CORS middleware agar berjalan sebelum middleware lain
        $middleware->prepend(\Illuminate\Http\Middleware\HandleCors::class);

        // Kecualikan CSRF check untuk semua API routes (pakai Sanctum token/cookie)
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);

        // Aktifkan Sanctum stateful authentication untuk SPA
        $middleware->statefulApi();

        /*
         * Override redirect unauthenticated untuk API routes.
         * Tanpa ini, middleware Authenticate akan mencoba redirect ke named route 'login'
         * yang tidak terdefinisi di API, menyebabkan error 500 "Route [login] not defined".
         * Dengan ini, semua API request yang tidak terautentikasi mendapat JSON 401.
         */
        $middleware->redirectGuestsTo(function (\Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return null; // null = don't redirect, throw unauthenticated exception as JSON
            }
            return route('login');
        });
    })

    ->withExceptions(function (Exceptions $exceptions): void {
        /*
         * Pastikan semua API routes mengembalikan JSON saat unauthenticated/unauthorized,
         * bukan redirect ke route 'login' yang tidak didefinisikan.
         */
        $exceptions->shouldRenderJsonWhen(
            fn (\Illuminate\Http\Request $request, \Throwable $e) =>
                $request->is('api/*') || $request->expectsJson()
        );
    })->create();
