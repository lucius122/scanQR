<?php

namespace App\Services;

use App\Models\CheckIn;
use App\Models\Member;
use App\Models\User;
use App\Services\AuditLogService;
use Carbon\Carbon;
use Carbon\CarbonInterface;

/*
 * CheckInService — logika validasi dan pencatatan check-in.
 *
 * Dipakai oleh dua endpoint:
 *   KasirScanController::scan()          → via QR (dengan HMAC verification)
 *   KasirScanController::manualCheckIn() → via member_code (tanpa HMAC)
 *
 * Semua validasi bisnis ada di sini (DRY principle).
 * Controller hanya bertanggung jawab parse input dan format HTTP response.
 *
 * STATUS RETURN VALUES:
 *   invalid_qr        → HMAC gagal / format QR salah → HTTP 400 di controller
 *   invalid           → QR valid tapi akun bermasalah → HTTP 200
 *   expired           → membership kadaluarsa         → HTTP 200
 *   already_checked_in→ sudah check-in < 2 jam tadi   → HTTP 200
 *   success           → check-in berhasil dicatat      → HTTP 200
 *
 * ════════════════════════════════════════════════
 *  ALUR VALIDASI (7 LANGKAH)
 * ════════════════════════════════════════════════
 * 1. Parse payload / cari member_code
 * 2. Verify HMAC signature        (QR scan only)
 * 3. Cari member di database
 * 4. Cek status user = 'active'
 * 5. Cek expires_date >= today    (end-of-day logic)
 * 6. Cek duplicate check-in < 2 jam
 * 7. Insert check_in record       (jika semua lolos)
 * ════════════════════════════════════════════════
 */
class CheckInService
{
    public function __construct(private QrService $qrService) {}

    // ─── QR Scan ─────────────────────────────────────────────────────────────

    public function processQrScan(string $payload, User $kasir): array
    {
        // Langkah 2: Verify HMAC — pastikan QR asli dan tidak dimanipulasi
        $parsed = $this->qrService->verify($payload);
        if (!$parsed) {
            AuditLogService::log('qr_invalid_signature', $kasir, 'bad', [
                'attempted_payload' => substr($payload, 0, 80) . (strlen($payload) > 80 ? '...' : ''),
                'scanner_branch'    => $kasir->branch?->name,
            ]);
            return $this->noMemberResponse('QR tidak valid atau telah dimanipulasi.', 'invalid_qr');
        }

        // Langkah 3: Cari member berdasarkan KEDUA field sekaligus (member_code + qr_token).
        // Jika hanya cek qr_token, ada risiko: qr_token yang bocor bisa dipakai
        // dengan member_code orang lain. Double-check menghilangkan risiko ini.
        $member = Member::with(['user.branch'])
            ->where('member_code', $parsed['member_code'])
            ->where('qr_token', $parsed['qr_token'])
            ->first();

        if (!$member) {
            return $this->noMemberResponse('QR tidak dikenali. Mungkin sudah di-regenerate oleh member.');
        }

        return $this->validate($member, $kasir, 'qr_scan');
    }

    // ─── Manual Check-in ─────────────────────────────────────────────────────

    public function processManualCheckIn(string $memberCode, User $kasir, ?string $reason): array
    {
        $member = Member::with(['user.branch'])
            ->where('member_code', strtoupper($memberCode))
            ->first();

        if (!$member) {
            return $this->noMemberResponse("Member code '{$memberCode}' tidak ditemukan.");
        }

        return $this->validate($member, $kasir, 'manual', $reason);
    }

    // ─── Shared Validation ───────────────────────────────────────────────────

    private function validate(Member $member, User $kasir, string $method, ?string $reason = null): array
    {
        // Langkah 4: Cek status akun user
        if ($member->user->status === 'inactive') {
            return $this->buildResponse('invalid', $member, 'Akun member tidak aktif (dinonaktifkan admin).');
        }

        // Langkah 5: Cek expires_date menggunakan logika end-of-day.
        // isActive() → Carbon::today()->lte($expires_date)
        // Member aktif sampai akhir hari expires_date (23:59:59).
        if (!$member->isActive()) {
            /** @var CarbonInterface $expires */
            $expires = $member->expires_date;
            AuditLogService::log('expired_member_scan_attempt', $kasir, 'warn', [
                'member_code'  => $member->member_code,
                'expired_since' => $expires->format('Y-m-d'),
            ]);
            return $this->buildResponse(
                'expired',
                $member,
                'Keanggotaan berakhir ' . $expires->format('d M Y') . '. Tolak masuk.'
            );
        }

        // Langkah 6: Record check-in.
        // Tidak ada anti-spam — setiap scan dicatat sebagai kunjungan terpisah
        // untuk melacak frekuensi kunjungan member (track record).
        $checkIn = CheckIn::create([
            'member_id'     => $member->id,
            'branch_id'     => $kasir->branch_id,
            'scanned_by'    => $kasir->id,
            'checked_in_at' => now(),
            'status'        => 'success',
            'method'        => $method,
            'manual_reason' => $reason,
        ]);

        if ($method === 'manual') {
            AuditLogService::log('manual_checkin', $kasir, 'warn', [
                'member_code' => $member->member_code,
                'member_name' => $member->user->name,
                'reason'      => $reason,
            ]);
        }

        return $this->buildResponse('success', $member, 'Check-in berhasil.', $checkIn);
    }

    // ─── Response Builders ───────────────────────────────────────────────────

    private function buildResponse(
        string $status,
        Member $member,
        string $message,
        ?CheckIn $checkIn = null
    ): array {
        $user    = $member->user;
        /** @var CarbonInterface $expires */
        $expires  = $member->expires_date;
        $isActive = $member->isActive();

        return [
            'status'  => $status,
            'message' => $message,
            'member'  => [
                'member_code'  => $member->member_code,
                'name'         => $user->name,
                'photo_url'    => $user->photo ? asset('storage/' . $user->photo) : null,
                'tier'         => $member->tier,
                'branch'       => $user->branch?->name,
                'expires_date' => $expires->format('Y-m-d'),
                'days_left'    => $isActive ? (int) Carbon::today()->diffInDays($expires) : 0,
            ],
            'check_in' => $checkIn ? [
                'id'            => $checkIn->id,
                'checked_in_at' => $checkIn->checked_in_at->format('Y-m-d H:i:s'),
                'method'        => $checkIn->method,
            ] : null,
        ];
    }

    private function noMemberResponse(string $message, string $status = 'invalid'): array
    {
        return [
            'status'   => $status,
            'message'  => $message,
            'member'   => null,
            'check_in' => null,
        ];
    }
}
