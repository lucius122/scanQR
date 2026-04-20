<?php

use App\Http\Controllers\AuthController;

/*
 * FORGE Gym OS — API Routes
 *
 * Semua route di sini otomatis mendapat prefix /api/
 * Auth menggunakan Sanctum SPA (cookie-based session), bukan Bearer token.
 * Middleware 'auth:sanctum' memeriksa session dari domain stateful (localhost:5173).
 */

// Health check
Route::get('/ping', function () {
    return response()->json([
        'message' => 'pong',
        'app'     => config('app.name'),
        'time'    => now()->toIso8601String(),
    ]);
});

// Public — tidak butuh login
Route::post('/login', [AuthController::class, 'login']);

// Protected — butuh session Sanctum yang valid
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
});
