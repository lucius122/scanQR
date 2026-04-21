<?php

use App\Http\Controllers\AdminAuditLogController;
use App\Http\Controllers\AdminMemberController;
use App\Http\Controllers\AdminOverviewController;
use App\Http\Controllers\AdminReportController;
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

    // Branches — list untuk dropdown form pendaftaran
    Route::get('/branches', function () {
        return response()->json(
            \App\Models\Branch::where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name'])
        );
    });

    // Member — registration (role: kasir, admin)
    Route::post('/members', [MemberRegistrationController::class, 'store']);

    // Kasir — scan & check-in (role: kasir)
    Route::post('/kasir/scan', [KasirScanController::class, 'scan']);
    Route::post('/kasir/check-in/manual', [KasirScanController::class, 'manualCheckIn']);
    Route::get('/kasir/visitors/today', [KasirScanController::class, 'todayVisitors']);
    Route::get('/kasir/visitors/export', [KasirScanController::class, 'exportCsv']);

    // Admin — overview & KPI (role: admin)
    Route::middleware('admin-only')->group(function () {
        Route::get('/admin/overview', [AdminOverviewController::class, 'index']);
        Route::get('/admin/overview/traffic', [AdminOverviewController::class, 'traffic']);

        Route::get('/admin/reports/attendance', [AdminReportController::class, 'attendance']);
        Route::get('/admin/reports/attendance/export', [AdminReportController::class, 'exportCsv']);
        Route::get('/admin/reports/branches', [AdminReportController::class, 'branches']);

        Route::get('/admin/audit-logs', [AdminAuditLogController::class, 'index']);
        Route::get('/admin/audit-logs/stats', [AdminAuditLogController::class, 'stats']);

        Route::get('/admin/members', [AdminMemberController::class, 'index']);
        Route::post('/admin/members/{id}/regenerate-qr', [AdminMemberController::class, 'regenerateQr']);
        Route::patch('/admin/members/{id}/status', [AdminMemberController::class, 'updateStatus']);
    });
});
