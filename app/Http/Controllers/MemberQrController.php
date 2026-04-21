<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\QrService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MemberQrController extends Controller
{
    public function __construct(private QrService $qrService) {}

    /*
     * GET /api/member/qr
     *
     * Mengembalikan signed QR payload + info membership untuk ditampilkan
     * di dashboard member. QR di-render oleh frontend (qrcode.react).
     *
     * Payload di-generate fresh setiap request (timestamp baru).
     * Token tidak expired secara otomatis — gunakan regenerate() untuk
     * invalidasi paksa (misal QR bocor/disalahgunakan).
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'member') {
            return response()->json(['message' => 'Endpoint ini hanya untuk member.'], 403);
        }

        $member = $user->member;
        if (!$member) {
            return response()->json(['message' => 'Profil member tidak ditemukan.'], 404);
        }

        return response()->json($this->buildResponse($user, $member));
    }

    /*
     * POST /api/member/qr/regenerate
     *
     * Generate ulang qr_token di database → semua QR lama otomatis invalid
     * karena token yang tersimpan di DB sudah berbeda.
     *
     * Use case: member curiga QR-nya di-screenshot dan disalahgunakan.
     */
    public function regenerate(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'member') {
            return response()->json(['message' => 'Endpoint ini hanya untuk member.'], 403);
        }

        $member = $user->member;
        if (!$member) {
            return response()->json(['message' => 'Profil member tidak ditemukan.'], 404);
        }

        $member->update(['qr_token' => Str::random(64)]);

        AuditLogService::log('qr_regenerated', $user, 'info', [
            'member_code'    => $member->member_code,
            'regenerated_by' => 'member',
        ]);

        return response()->json($this->buildResponse($user, $member->fresh()));
    }

    private function buildResponse($user, $member): array
    {
        $isActive = $member->isActive();
        $today    = Carbon::today();
        $expires  = $member->expires_date;

        // Hitung sisa hari — 0 jika sudah expired
        $daysLeft = $isActive ? (int) $today->diffInDays($expires) : 0;

        return [
            'qr_payload'   => $this->qrService->generate($member),
            'member_code'  => $member->member_code,
            'name'         => $user->name,
            'tier'         => $member->tier,
            'branch'       => $user->branch?->name,
            'expires_date' => $expires->format('Y-m-d'),
            'days_left'    => $daysLeft,
            'status'       => $isActive ? 'active' : 'expired',
        ];
    }
}
