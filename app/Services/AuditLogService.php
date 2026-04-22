<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

/*
 * AuditLogService — catat semua event penting untuk audit trail.
 *
 * Dipanggil di:
 *   - CheckInService  → invalid QR, manual check-in, expired scan attempt
 *   - MemberQrController → QR regenerated
 *   - AdminMemberController → member deactivated/reactivated, admin regenerate QR
 */
class AuditLogService
{
    public static function log(
        string  $action,
        ?User   $user     = null,
        string  $severity = 'info',
        array   $details  = []
    ): void {
        AuditLog::create([
            'user_id'    => $user?->id ?? auth()->id(),
            'action'     => $action,
            'severity'   => $severity,
            'details'    => $details ?: null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /*
     * Versi async dari log() — jalankan SETELAH response dikirim ke client.
     * Cocok untuk audit log yang tidak perlu memperlambat response time.
     * Nilai dari request/auth di-capture sekarang, dieksekusi setelah terminate.
     */
    public static function logDeferred(
        string  $action,
        ?User   $user     = null,
        string  $severity = 'info',
        array   $details  = []
    ): void {
        $userId    = $user?->id ?? auth()->id();
        $ip        = request()->ip();
        $userAgent = request()->userAgent();

        app()->terminating(static function () use ($action, $userId, $severity, $details, $ip, $userAgent) {
            AuditLog::create([
                'user_id'    => $userId,
                'action'     => $action,
                'severity'   => $severity,
                'details'    => $details ?: null,
                'ip_address' => $ip,
                'user_agent' => $userAgent,
            ]);
        });
    }
}
