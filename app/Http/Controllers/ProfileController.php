<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    /*
     * GET /api/profile
     * Data profil lengkap (lebih dari /api/me) untuk halaman profile page.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('branch:id,name', 'member:id,user_id,member_code,tier,expires_date');

        return response()->json([
            'data' => [
                'id'                   => $user->id,
                'name'                 => $user->name,
                'email'                => $user->email,
                'phone'                => $user->phone,
                'address'              => $user->address,
                'photo_url'            => $user->photo ? asset('storage/' . $user->photo) : null,
                'role'                 => $user->role,
                'status'               => $user->status,
                'must_change_password' => (bool) $user->must_change_password,
                'branch'               => $user->branch
                    ? ['id' => $user->branch->id, 'name' => $user->branch->name]
                    : null,
                'member' => $user->member ? [
                    'member_code'  => $user->member->member_code,
                    'tier'         => $user->member->tier,
                    'expires_date' => $user->member->expires_date->format('Y-m-d'),
                ] : null,
            ],
        ]);
    }

    /*
     * PUT /api/profile
     * User mengupdate data pribadi. role, branch, email, photo TIDAK bisa diubah via endpoint ini.
     * Explicit whitelist mencegah mass assignment attack.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name'    => ['required', 'string', 'max:255'],
            'phone'   => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        $user->update([
            'name'    => $data['name'],
            'phone'   => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
        ]);

        AuditLogService::logDeferred('profile_updated_self', $user, 'info');

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'data' => [
                'name'    => $user->name,
                'phone'   => $user->phone,
                'address' => $user->address,
            ],
        ]);
    }

    /*
     * PUT /api/profile/password
     * Ganti password sendiri. Wajib verifikasi current password.
     * Berhasil → must_change_password di-set false (hapus flag password default).
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password'          => ['required', 'string'],
            'new_password'              => ['required', 'string', 'min:8', 'confirmed'],
            'new_password_confirmation' => ['required', 'string'],
        ]);

        if (!Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Password lama tidak sesuai.',
                'errors'  => ['current_password' => ['Password lama tidak sesuai.']],
            ], 422);
        }

        $user->update([
            'password'             => Hash::make($data['new_password']),
            'must_change_password' => false,
        ]);

        AuditLogService::logDeferred('password_changed_self', $user, 'info');

        return response()->json(['message' => 'Password berhasil diubah.']);
    }
}
