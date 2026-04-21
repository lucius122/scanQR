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
}
