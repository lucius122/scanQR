<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\User;
use App\Services\QrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class MemberRegistrationController extends Controller
{
    public function __construct(private QrService $qrService) {}

    /*
     * POST /api/members
     * Kasir / admin mendaftarkan member baru.
     *
     * Proses dalam DB transaction:
     *   1. Simpan foto (jika ada) ke storage/app/public/photos
     *   2. Buat User (role=member)
     *   3. Buat Member → member_code & qr_token auto-generate via booted()
     *   4. Generate QR payload untuk langsung ditampilkan kasir / dicetak
     *
     * Mengapa transaction?
     *   Jika salah satu langkah gagal (DB error, storage penuh, dll),
     *   semua perubahan di-rollback → tidak ada "orphan user" tanpa member profile.
     */
    public function store(Request $request): JsonResponse
    {
        if (!in_array($request->user()->role, ['kasir', 'admin'])) {
            return response()->json(['message' => 'Tidak memiliki akses.'], 403);
        }

        $data = $request->validate([
            'name'            => ['required', 'string', 'max:255'],
            'email'           => ['required', 'email', 'unique:users,email'],
            'password'        => ['required', 'string', 'min:8'],
            'phone'           => ['nullable', 'string', 'max:30'],
            'photo'           => ['nullable', 'image', 'max:2048'],
            'branch_id'       => ['required', 'exists:branches,id'],
            'tier'            => ['required', Rule::in(['Basic', 'Premium', 'VIP'])],
            'duration'        => ['required', Rule::in(['1d', '1w', '1m', '3m'])],
        ]);

        $expiresDate = match ($data['duration']) {
            '1d' => now()->addDay(),
            '1w' => now()->addWeek(),
            '1m' => now()->addMonth(),
            '3m' => now()->addMonths(3),
        };

        /*
         * Foto di-store sebelum transaction DB dimulai.
         * Storage::putFile() aman dipanggil di luar transaction karena
         * jika transaction gagal, file akan dihapus manual (lihat catch di bawah).
         * Pendekatan ini menghindari lock lama di dalam transaction.
         */
        $photoPath = $request->hasFile('photo')
            ? $request->file('photo')->store('photos', 'public')
            : null;

        try {
            [$user, $member] = DB::transaction(function () use ($data, $photoPath, $expiresDate) {
                $user = User::create([
                    'name'      => $data['name'],
                    'email'     => $data['email'],
                    'password'  => Hash::make($data['password']),
                    'role'      => 'member',
                    'branch_id' => $data['branch_id'],
                    'status'    => 'active',
                    'photo'     => $photoPath,
                    'phone'     => $data['phone'] ?? null,
                ]);

                /*
                 * member_code  → auto-generate: "88SG-2026-00001" via Member::booted()
                 * qr_token     → auto-generate: Str::random(64) via Member::booted()
                 * joined_date  → hari ini
                 * expires_date → dihitung dari duration preset
                 */
                $member = Member::create([
                    'user_id'      => $user->id,
                    'tier'         => $data['tier'],
                    'joined_date'  => now()->toDateString(),
                    'expires_date' => $expiresDate->toDateString(),
                ]);

                return [$user, $member];
            });
        } catch (\Throwable $e) {
            // Hapus foto yang sudah ter-upload jika transaction gagal
            if ($photoPath) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($photoPath);
            }
            throw $e;
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'member_code'  => $member->member_code,
                'qr_payload'   => $this->qrService->generate($member),
                'name'         => $user->name,
                'tier'         => $member->tier,
                'expires_date' => $member->expires_date->format('Y-m-d'),
                'branch'       => $user->branch?->name,
            ],
        ], 201);
    }
}
