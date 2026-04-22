<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    /*
     * POST /api/login
     *
     * Tidak ada field 'role' di form — role dibaca otomatis dari database.
     * Flow:
     *   1. Validasi input (email + password)
     *   2. Coba login via Auth::attempt (menggunakan web guard / session)
     *   3. Cek status akun — jika 'inactive', logout dan kembalikan 403
     *   4. Regenerate session ID (mencegah session fixation attack)
     *   5. Return data user + branch
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Email atau password salah.',
            ], 401);
        }

        $user = Auth::user();

        if ($user->status === 'inactive') {
            Auth::logout();
            return response()->json([
                'message' => 'Akun Anda telah dinonaktifkan. Hubungi admin.',
            ], 403);
        }

        $request->session()->regenerate();

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    /*
     * POST /api/logout
     *
     * Menghancurkan session aktif dan regenerate CSRF token.
     * Penting: session harus di-invalidate agar tidak bisa dipakai ulang.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'status'  => 'success',
            'message' => 'Logout berhasil.',
        ]);
    }

    /*
     * GET /api/me
     *
     * Mengembalikan data user yang sedang login (dari session aktif).
     * Digunakan oleh React frontend saat app pertama kali dimuat
     * untuk mengetahui apakah user sudah login atau belum.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->formatUser($request->user()),
        ]);
    }

    private function formatUser($user): array
    {
        // Eager-load branch + tier jika belum loaded
        if ($user->branch_id && !$user->relationLoaded('branch')) {
            $user->load('branch.tier');
        }

        return [
            'id'                   => $user->id,
            'name'                 => $user->name,
            'email'                => $user->email,
            'role'                 => $user->role,
            'photo'                => $user->photo,
            'status'               => $user->status,
            'must_change_password' => (bool) ($user->must_change_password ?? false),
            'branch' => $user->branch ? [
                'id'         => $user->branch->id,
                'name'       => $user->branch->name,
                'tier_id'    => $user->branch->tier_id,
                'tier_name'  => $user->branch->tier?->name,
                'tier_price' => $user->branch->tier ? (float) $user->branch->tier->price : 0,
            ] : null,
        ];
    }
}
