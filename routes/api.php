<?php

use App\Http\Controllers\AdminAuditLogController;
use App\Http\Controllers\AdminBranchController;
use App\Http\Controllers\AdminMemberController;
use App\Http\Controllers\AdminOverviewController;
use App\Http\Controllers\AdminReportController;
use App\Http\Controllers\AdminUserController;
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

// Branches — dropdown publik (hanya cabang aktif, tidak sensitif, tidak butuh auth)
// Ini memastikan dropdown form selalu bisa diakses tanpa masalah Sanctum SPA session timing
Route::get('/branches/options',      [AdminBranchController::class, 'options']);
Route::get('/branches',              [AdminBranchController::class, 'dropdown']);
Route::get('/branches/{id}/tiers',   [AdminBranchController::class, 'tiersByBranch']);

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

        // Admin — kelola cabang
        Route::get('/admin/branches', [AdminBranchController::class, 'index']);
        Route::post('/admin/branches', [AdminBranchController::class, 'store']);
        Route::put('/admin/branches/{id}', [AdminBranchController::class, 'update']);
        Route::patch('/admin/branches/{id}/status', [AdminBranchController::class, 'updateStatus']);
        Route::delete('/admin/branches/{id}', [AdminBranchController::class, 'destroy']);

        // Admin — kelola user (list, edit, toggle status, reset password, daftarkan)
        Route::get('/admin/users', [AdminUserController::class, 'index']);
        Route::post('/admin/users', [AdminUserController::class, 'store']);
        Route::put('/admin/users/{id}', [AdminUserController::class, 'update']);
        Route::patch('/admin/users/{id}/status', [AdminUserController::class, 'updateStatus']);
        Route::post('/admin/users/{id}/reset-password', [AdminUserController::class, 'resetPassword']);
    });
});
