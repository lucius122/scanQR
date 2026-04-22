<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AdminBranchController extends Controller
{
    /*
     * GET /api/branches/options
     * Dropdown list aktif — hanya cabang active, non-paginated, di-cache 1 jam.
     * Includes tier info (name + price) for each branch.
     */
    public function options(): JsonResponse
    {
        $data = Cache::remember('branches_options', 3600, fn () =>
            Branch::where('status', 'active')
                ->with('tier:id,name,price')
                ->orderBy('name')
                ->get(['id', 'name', 'address', 'tier_id'])
                ->map(fn ($b) => [
                    'id'         => $b->id,
                    'name'       => $b->name,
                    'address'    => $b->address,
                    'tier_id'    => $b->tier_id,
                    'tier_name'  => $b->tier?->name,
                    'tier_price' => $b->tier ? (float) $b->tier->price : 0,
                ])
                ->toArray()
        );
        return response()->json(['data' => $data]);
    }

    /*
     * GET /api/branches
     * Backward compat — return array langsung (untuk komponen lama).
     */
    public function dropdown(): JsonResponse
    {
        return response()->json(
            Cache::remember('branches_active_dropdown', 3600, fn () =>
                Branch::where('status', 'active')
                    ->with('tier:id,name,price')
                    ->orderBy('name')
                    ->get(['id', 'name', 'address', 'tier_id'])
                    ->map(fn ($b) => [
                        'id'         => $b->id,
                        'name'       => $b->name,
                        'address'    => $b->address,
                        'tier_id'    => $b->tier_id,
                        'tier_name'  => $b->tier?->name,
                        'tier_price' => $b->tier ? (float) $b->tier->price : 0,
                    ])
                    ->toArray()
            )
        );
    }

    /*
     * GET /api/admin/branches
     * List semua cabang beserta tier dan jumlah member aktif.
     */
    public function index(): JsonResponse
    {
        $branches = Branch::withCount([
            'users as member_count' => fn ($q) => $q->where('role', 'member'),
        ])
        ->with('tier:id,name,price')
        ->orderBy('name')
        ->get()
        ->map(fn ($b) => [
            'id'            => $b->id,
            'name'          => $b->name,
            'address'       => $b->address,
            'phone'         => $b->phone,
            'opening_hours' => $b->opening_hours,
            'status'        => $b->status,
            'member_count'  => $b->member_count,
            'tier_id'       => $b->tier_id,
            'tier'          => $b->tier ? [
                'id'    => $b->tier->id,
                'name'  => $b->tier->name,
                'price' => (float) $b->tier->price,
            ] : null,
        ]);

        return response()->json(['data' => $branches]);
    }

    /*
     * POST /api/admin/branches
     * Buat cabang baru — admin memilih tier dari dropdown.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'address'       => ['required', 'string'],
            'phone'         => ['required', 'string', 'max:30'],
            'opening_hours' => ['nullable', 'string', 'max:50'],
            'tier_id'       => ['required', 'exists:tiers,id'],
        ]);

        $branch = Branch::create([
            'name'          => $data['name'],
            'address'       => $data['address'],
            'phone'         => $data['phone'],
            'opening_hours' => $data['opening_hours'] ?? '06:00-22:00',
            'status'        => 'active',
            'tier_id'       => $data['tier_id'],
        ]);

        AuditLogService::log('branch_created', $request->user(), 'info', [
            'branch_name' => $branch->name,
            'branch_id'   => $branch->id,
        ]);

        $this->flushBranchCache();

        return response()->json([
            'message' => 'Cabang berhasil ditambahkan.',
            'data'    => $branch->load('tier'),
        ], 201);
    }

    /*
     * PUT /api/admin/branches/{id}
     * Update info cabang + tier.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branch = Branch::findOrFail($id);

        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'address'       => ['required', 'string'],
            'phone'         => ['required', 'string', 'max:30'],
            'opening_hours' => ['nullable', 'string', 'max:50'],
            'tier_id'       => ['required', 'exists:tiers,id'],
        ]);

        $branch->update([
            'name'          => $data['name'],
            'address'       => $data['address'],
            'phone'         => $data['phone'],
            'opening_hours' => $data['opening_hours'] ?? $branch->opening_hours,
            'tier_id'       => $data['tier_id'],
        ]);

        AuditLogService::log('branch_updated', $request->user(), 'info', [
            'branch_name' => $branch->name,
            'branch_id'   => $branch->id,
        ]);

        $this->flushBranchCache();

        return response()->json([
            'message' => 'Cabang berhasil diupdate.',
            'data'    => $branch->fresh('tier'),
        ]);
    }

    /*
     * PATCH /api/admin/branches/{id}/status
     * Toggle active/inactive cabang.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $branch = Branch::findOrFail($id);

        $data = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $branch->update(['status' => $data['status']]);

        AuditLogService::log('branch_deactivated', $request->user(),
            $data['status'] === 'inactive' ? 'warn' : 'info',
            [
                'branch_name' => $branch->name,
                'branch_id'   => $branch->id,
                'new_status'  => $data['status'],
            ]
        );

        $this->flushBranchCache();

        return response()->json(['message' => 'Status cabang berhasil diupdate.']);
    }

    /*
     * DELETE /api/admin/branches/{id}
     * Hapus cabang jika tidak ada member yang terdaftar.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $branch = Branch::withCount('users')->findOrFail($id);

        if ($branch->users_count > 0) {
            return response()->json([
                'message' => "Cabang tidak bisa dihapus karena masih memiliki {$branch->users_count} user terdaftar.",
            ], 422);
        }

        AuditLogService::log('branch_deleted', $request->user(), 'warn', [
            'branch_name' => $branch->name,
            'branch_id'   => $branch->id,
        ]);

        $this->flushBranchCache();
        $branch->delete();

        return response()->json(['message' => 'Cabang berhasil dihapus.']);
    }

    private function flushBranchCache(): void
    {
        Cache::forget('branches_active_dropdown');
        Cache::forget('branches_options');
    }
}
