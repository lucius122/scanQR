<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class MemberRegistrationController extends Controller
{
    /*
     * POST /api/members
     * Endpoint untuk kasir dan admin mendaftarkan member baru.
     *
     * Proses berjalan dalam DB transaction:
     *   1. Buat User (role=member)
     *   2. Buat Member profile → member_code & qr_token di-generate
     *      otomatis via Member::booted() (tidak perlu diisi manual)
     *
     * Mengapa transaction?
     *   Jika pembuatan Member gagal (misal DB error), User yang sudah
     *   terbuat akan ikut di-rollback → tidak ada "orphan user tanpa profil member".
     */
    public function store(Request $request): JsonResponse
    {
        // Hanya kasir dan admin yang boleh mendaftarkan member
        if (!in_array($request->user()->role, ['kasir', 'admin'])) {
            return response()->json(['message' => 'Tidak memiliki akses.'], 403);
        }

        $data = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'email'        => ['required', 'email', 'unique:users,email'],
            'password'     => ['required', 'string', 'min:8'],
            'branch_id'    => ['required', 'exists:branches,id'],
            'tier'         => ['required', Rule::in(['Basic', 'Premium', 'VIP'])],
            'expires_date' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $result = DB::transaction(function () use ($data) {
            $user = User::create([
                'name'      => $data['name'],
                'email'     => $data['email'],
                'password'  => Hash::make($data['password']),
                'role'      => 'member',
                'branch_id' => $data['branch_id'],
                'status'    => 'active',
            ]);

            /*
             * member_code  → di-generate otomatis oleh booted() di Member model
             * qr_token     → idem, Str::random(64)
             * joined_date  → hari ini
             */
            $member = Member::create([
                'user_id'      => $user->id,
                'tier'         => $data['tier'],
                'joined_date'  => now()->toDateString(),
                'expires_date' => $data['expires_date'],
            ]);

            return [$user, $member];
        });

        [$user, $member] = $result;

        return response()->json([
            'message'     => 'Member berhasil didaftarkan.',
            'member_code' => $member->member_code,
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
        ], 201);
    }
}
