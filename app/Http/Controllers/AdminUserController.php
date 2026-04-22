<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Member;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\QrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function __construct(private QrService $qrService) {}

    /*
     * POST /api/admin/users
     * Admin mendaftarkan user baru dengan role dan cabang pilihan.
     *
     * Role yang tersedia: admin, kasir, member, trainer
     * Untuk role=member: tier & duration_months wajib, member record otomatis dibuat.
     * Untuk role=admin:  branch_id boleh null (admin HQ).
     * Untuk role=kasir/trainer: branch_id wajib.
     */
    /*
     * GET /api/admin/users
     */
    public function index(Request $request): JsonResponse
    {
        $q        = $request->query('q', '');
        $role     = $request->query('role', '');
        $status   = $request->query('status', '');
        $branchId = $request->query('branch_id', '');

        $users = User::with('branch:id,name')
            ->when($q, fn ($b) => $b->where(fn ($b2) => $b2
                ->where('name',  'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%")
            ))
            ->when($role,     fn ($b) => $b->where('role', $role))
            ->when($status,   fn ($b) => $b->where('status', $status))
            ->when($branchId, fn ($b) => $b->where('branch_id', $branchId))
            ->orderBy('name')
            ->paginate(20);

        return response()->json([
            'data' => $users->map(fn ($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'phone'      => $u->phone,
                'role'       => $u->role,
                'status'     => $u->status,
                'branch'     => $u->branch ? ['id' => $u->branch->id, 'name' => $u->branch->name] : null,
                'created_at' => $u->created_at->toIso8601String(),
            ]),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
            ],
        ]);
    }

    /*
     * PUT /api/admin/users/{id}
     * Update user tanpa mengubah password.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'email'     => ['required', 'email', Rule::unique('users', 'email')->ignore($id)],
            'phone'     => ['nullable', 'string', 'max:30'],
            'role'      => ['required', Rule::in(['admin', 'kasir', 'member', 'trainer'])],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'status'    => ['required', Rule::in(['active', 'inactive'])],
        ]);

        if (in_array($data['role'], ['kasir', 'trainer', 'member']) && empty($data['branch_id'])) {
            return response()->json([
                'errors' => ['branch_id' => ['Cabang wajib diisi untuk role ' . $data['role'] . '.']],
            ], 422);
        }

        $user->update([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'phone'     => $data['phone'] ?? null,
            'role'      => $data['role'],
            'branch_id' => $data['branch_id'] ?? null,
            'status'    => $data['status'],
        ]);

        AuditLogService::log('user_updated_by_admin', $request->user(), 'info', [
            'target_name' => $user->name,
            'target_id'   => $user->id,
        ]);

        return response()->json(['message' => 'User berhasil diupdate.']);
    }

    /*
     * PATCH /api/admin/users/{id}/status
     * Toggle active/inactive tanpa ubah field lain.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $user->update(['status' => $data['status']]);

        AuditLogService::log(
            'user_status_changed',
            $request->user(),
            $data['status'] === 'inactive' ? 'warn' : 'info',
            ['target_name' => $user->name, 'target_id' => $user->id, 'new_status' => $data['status']]
        );

        return response()->json(['message' => 'Status user berhasil diupdate.']);
    }

    /*
     * POST /api/admin/users/{id}/reset-password
     * Auto-generate atau manual reset. Password tidak disimpan di log.
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'mode'     => ['required', Rule::in(['generate', 'manual'])],
            'password' => ['required_if:mode,manual', 'nullable', 'string', 'min:8'],
        ]);

        $newPassword = $data['mode'] === 'generate'
            ? $this->generatePassword()
            : $data['password'];

        $user->update([
            'password'             => Hash::make($newPassword),
            'must_change_password' => true,
        ]);

        AuditLogService::log('user_password_reset', $request->user(), 'warn', [
            'target_name' => $user->name,
            'target_id'   => $user->id,
            'mode'        => $data['mode'],
        ]);

        $response = ['message' => 'Password berhasil direset.'];

        if ($data['mode'] === 'generate') {
            $response['new_password'] = $newPassword;
        }

        return response()->json($response);
    }

    private function generatePassword(): string
    {
        $chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
        $pass  = '';
        for ($i = 0; $i < 12; $i++) {
            $pass .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $pass;
    }

    /*
     * POST /api/admin/users
     * Admin mendaftarkan user baru dengan role dan cabang pilihan.
     */
    public function store(Request $request): JsonResponse
    {
        $base = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'email'     => ['required', 'email', 'unique:users,email'],
            'password'  => ['required', 'string', 'min:8'],
            'phone'     => ['nullable', 'string', 'max:30'],
            'photo'     => ['nullable', 'image', 'max:2048'],
            'role'      => ['required', Rule::in(['admin', 'kasir', 'member', 'trainer'])],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'status'    => ['nullable', Rule::in(['active', 'inactive'])],
        ]);

        // Kasir & trainer wajib punya cabang
        if (in_array($base['role'], ['kasir', 'trainer']) && empty($base['branch_id'])) {
            return response()->json([
                'errors' => ['branch_id' => ['Cabang wajib diisi untuk role ' . $base['role'] . '.']],
            ], 422);
        }

        // Member wajib punya cabang
        if ($base['role'] === 'member' && empty($base['branch_id'])) {
            return response()->json([
                'errors' => ['branch_id' => ['Cabang wajib diisi untuk member.']],
            ], 422);
        }

        $expiresDate = null;
        $tierName = null;
        if ($base['role'] === 'member') {
            $memberData = $request->validate([
                'duration'        => ['required', Rule::in(['1d', '1w', '1m', '3m'])],
            ]);

            // Tier otomatis dari cabang yang dipilih
            $branch = Branch::with('tier')->findOrFail($base['branch_id']);
            $tierName = $branch->tier?->name ?? 'Basic';

            $expiresDate = match ($memberData['duration']) {
                '1d' => now()->addDay(),
                '1w' => now()->addWeek(),
                '1m' => now()->addMonth(),
                '3m' => now()->addMonths(3),
            };
        }

        $photoPath = $request->hasFile('photo')
            ? $request->file('photo')->store('photos', 'public')
            : null;

        try {
            $result = DB::transaction(function () use ($base, $tierName, $expiresDate, $photoPath, $request) {
                $user = User::create([
                    'name'                 => $base['name'],
                    'email'                => $base['email'],
                    'password'             => Hash::make($base['password']),
                    'role'                 => $base['role'],
                    'branch_id'            => $base['branch_id'] ?? null,
                    'status'               => $base['status'] ?? 'active',
                    'photo'                => $photoPath,
                    'phone'                => $base['phone'] ?? null,
                    'must_change_password' => true,
                ]);

                $member = null;
                if ($base['role'] === 'member') {
                    $member = Member::create([
                        'user_id'      => $user->id,
                        'tier'         => $tierName,
                        'joined_date'  => now()->toDateString(),
                        'expires_date' => $expiresDate->toDateString(),
                    ]);
                }

                AuditLogService::log('user_created_by_admin', $request->user(), 'info', [
                    'target_name'  => $user->name,
                    'target_role'  => $user->role,
                    'branch_name'  => $user->branch?->name ?? 'HQ',
                ]);

                return [$user, $member];
            });
        } catch (\Throwable $e) {
            if ($photoPath) {
                Storage::disk('public')->delete($photoPath);
            }
            throw $e;
        }

        [$user, $member] = $result;

        $response = [
            'status'  => 'success',
            'message' => 'User berhasil didaftarkan.',
            'data'    => [
                'id'     => $user->id,
                'name'   => $user->name,
                'email'  => $user->email,
                'role'   => $user->role,
                'branch' => $user->branch?->name ?? null,
            ],
        ];

        if ($member) {
            $response['data']['member_code']  = $member->member_code;
            $response['data']['qr_payload']   = $this->qrService->generate($member);
            $response['data']['tier']         = $member->tier;
            $response['data']['expires_date'] = $member->expires_date->format('Y-m-d');
        }

        return response()->json($response, 201);
    }
}
