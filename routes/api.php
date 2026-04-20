<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\KasirScanController;
use App\Http\Controllers\MemberQrController;
use App\Http\Controllers\MemberRegistrationController;

/*
 * FORGE Gym OS — API Routes
 * Auth: Sanctum SPA cookie-based session (bukan Bearer token).
 */

Route::get('/ping', fn () => response()->json([
    'message' => 'pong',
    'app'     => config('app.name'),
    'time'    => now()->toIso8601String(),
]));

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Member — QR display (role: member)
    Route::get('/member/qr', [MemberQrController::class, 'show']);
    Route::post('/member/qr/regenerate', [MemberQrController::class, 'regenerate']);

    // Member — registration (role: kasir, admin)
    Route::post('/members', [MemberRegistrationController::class, 'store']);

    // Kasir — scan & check-in (role: kasir)
    Route::post('/kasir/scan', [KasirScanController::class, 'scan']);
    Route::post('/kasir/check-in/manual', [KasirScanController::class, 'manualCheckIn']);
    Route::get('/kasir/visitors/today', [KasirScanController::class, 'todayVisitors']);
});
