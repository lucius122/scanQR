<?php

namespace App\Http\Controllers;

use App\Models\CheckIn;
use App\Services\CheckInService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class KasirScanController extends Controller
{
    public function __construct(private CheckInService $checkInService) {}

    /*
     * POST /api/kasir/scan
     *
     * Kasir submit QR payload yang di-scan dari kamera.
     * CheckInService menjalankan 7 langkah validasi.
     *
     * HTTP Response Codes:
     *   200 → semua business logic (success, expired, already_checked_in)
     *   400 → format input salah / QR invalid (invalid)
     *   403 → bukan kasir
     */
    public function scan(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'kasir') {
            return response()->json(['message' => 'Endpoint ini hanya untuk kasir.'], 403);
        }

        $data = $request->validate([
            'qr_payload' => ['required', 'string'],
        ]);

        $result = $this->checkInService->processQrScan($data['qr_payload'], $request->user());

        // 'invalid_qr' = HMAC gagal / format salah → 400 Bad Request
        // semua status lain (success, expired, already_checked_in, invalid) → 200
        $status = $result['status'] === 'invalid_qr' ? 400 : 200;

        return response()->json($result, $status);
    }

    /*
     * POST /api/kasir/check-in/manual
     *
     * Fallback saat QR tidak bisa di-scan (HP mati, QR rusak, dll).
     * Validasi sama dengan scan QR minus HMAC verification.
     *
     * Setiap manual check-in WAJIB menampilkan foto member di frontend
     * supaya kasir bisa verifikasi secara visual bahwa orangnya benar.
     */
    public function manualCheckIn(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'kasir') {
            return response()->json(['message' => 'Endpoint ini hanya untuk kasir.'], 403);
        }

        $data = $request->validate([
            'member_code'   => ['required', 'string'],
            'manual_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $result = $this->checkInService->processManualCheckIn(
            $data['member_code'],
            $request->user(),
            $data['manual_reason'] ?? null
        );

        $status = $result['status'] === 'invalid' ? 404 : 200;

        return response()->json($result, $status);
    }

    /*
     * GET /api/kasir/visitors/today
     *
     * Daftar semua member yang sudah check-in hari ini di cabang kasir ini.
     * Diurutkan dari yang terbaru (paling atas).
     */
    public function todayVisitors(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'kasir') {
            return response()->json(['message' => 'Endpoint ini hanya untuk kasir.'], 403);
        }

        $kasir = $request->user();

        $checkIns = CheckIn::with(['member.user'])
            ->where('branch_id', $kasir->branch_id)
            ->whereDate('checked_in_at', Carbon::today())
            ->orderByDesc('checked_in_at')
            ->get()
            ->map(fn ($ci) => [
                'id'            => $ci->id,
                'name'          => $ci->member->user->name,
                'member_code'   => $ci->member->member_code,
                'photo_url'     => $ci->member->user->photo
                    ? asset('storage/' . $ci->member->user->photo)
                    : null,
                'tier'          => $ci->member->tier,
                'checked_in_at' => $ci->checked_in_at->format('H:i'),
                'method'        => $ci->method,
                'manual_reason' => $ci->manual_reason,
            ]);

        return response()->json([
            'date'   => Carbon::today()->format('Y-m-d'),
            'branch' => $kasir->branch?->name,
            'total'  => $checkIns->count(),
            'items'  => $checkIns,
        ]);
    }

    /*
     * GET /api/kasir/visitors/export?date=YYYY-MM-DD
     *
     * Export CSV pengunjung hari ini (atau tanggal tertentu) di cabang kasir.
     * BOM UTF-8 di awal agar Excel Indonesia bisa baca karakter khusus.
     */
    public function exportCsv(Request $request): Response
    {
        if ($request->user()->role !== 'kasir') {
            abort(403, 'Endpoint ini hanya untuk kasir.');
        }

        $kasir    = $request->user();
        $date     = $request->query('date') ? Carbon::parse($request->query('date')) : Carbon::today();
        $filename = 'pengunjung-' . $date->format('Y-m-d') . '.csv';

        $checkIns = CheckIn::with(['member.user'])
            ->where('branch_id', $kasir->branch_id)
            ->whereDate('checked_in_at', $date)
            ->where('status', 'success')
            ->orderBy('checked_in_at')
            ->get();

        return response()->streamDownload(function () use ($checkIns) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['No', 'Member Code', 'Nama', 'Tier', 'Waktu Check-in (WIB)', 'Metode', 'Status', 'Alasan Manual']);
            foreach ($checkIns as $i => $ci) {
                fputcsv($handle, [
                    $i + 1,
                    $ci->member->member_code,
                    $ci->member->user->name,
                    $ci->member->tier,
                    $ci->checked_in_at->format('H:i:s') . ' WIB',
                    $ci->method === 'manual' ? 'Manual' : 'QR Scan',
                    $ci->status,
                    $ci->manual_reason ?? '',
                ]);
            }
            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
