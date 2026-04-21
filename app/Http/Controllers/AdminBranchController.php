<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\BranchTier;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AdminBranchController extends Controller
{
    /*
     * GET /api/branches/options
     * Dropdown list aktif — hanya cabang active, non-paginated, di-cache 1 jam.
     */
    public function options(): JsonResponse
    {
        $data = Cache::remember('branches_options', 3600, fn () =>
            Branch::where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'address'])
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
                    ->orderBy('name')
                    ->get(['id', 'name', 'address'])
            )
        );
    }

    /*
     * GET /api/branches/{id}/tiers
     * Daftar harga tier per cabang — di-cache 1 jam.
     */
    public function tiersByBranch(int $id): JsonResponse
    {
        $tiers = Cache::remember(
            "branch_tiers_{$id}",
            3600,
            fn () => BranchTier::where('branch_id', $id)
                ->orderBy('tier')
                ->get(['tier', 'price'])
                ->map(fn ($t) => ['tier' => $t->tier, 'price' => (float) $t->price])
        );

        return response()->json(['data' => $tiers]);
    }

    /*
     * GET /api/admin/branches
     * List semua cabang beserta tiers dan jumlah member aktif.
     */

    public function index(): JsonResponse
    {
        $branches = Branch::withCount([
            'users as member_count' => fn ($q) => $q->where('role', 'member'),
        ])
        ->with('tiers')
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
            'tiers'         => $b->tiers->map(fn ($t) => [
                'id'    => $t->id,
                'tier'  => $t->tier,
                'price' => (float) $t->price,
            ])->values(),
        ]);

        return response()->json(['data' => $branches]);
    }

    /*
     * POST /api/admin/branches
     * Buat cabang baru beserta harga tier-nya.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'              => ['required', 'string', 'max:255'],
            'address'           => ['required', 'string'],
            'phone'             => ['required', 'string', 'max:30'],
            'opening_hours'     => ['nullable', 'string', 'max:50'],
            'tiers'             => ['nullable', 'array'],
            'tiers.Basic'       => ['nullable', 'numeric', 'min:0'],
            'tiers.Premium'     => ['nullable', 'numeric', 'min:0'],
            'tiers.VIP'         => ['nullable', 'numeric', 'min:0'],
        ]);

        $branch = Branch::create([
            'name'          => $data['name'],
            'address'       => $data['address'],
            'phone'         => $data['phone'],
            'opening_hours' => $data['opening_hours'] ?? '06:00-22:00',
            'status'        => 'active',
        ]);

        if (!empty($data['tiers'])) {
            foreach ($data['tiers'] as $tier => $price) {
                if ($price !== null) {
                    BranchTier::updateOrCreate(
                        ['branch_id' => $branch->id, 'tier' => $tier],
                        ['price'     => $price]
                    );
                }
            }
        }

        AuditLogService::log('branch_created', $request->user(), 'info', [
            'branch_name' => $branch->name,
            'branch_id'   => $branch->id,
        ]);

        $this->flushBranchCache($branch->id);

        return response()->json([
            'message' => 'Cabang berhasil ditambahkan.',
            'data'    => $branch->load('tiers'),
        ], 201);
    }

    /*
     * PUT /api/admin/branches/{id}
     * Update info cabang + tier pricing.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $branch = Branch::findOrFail($id);

        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'address'       => ['required', 'string'],
            'phone'         => ['required', 'string', 'max:30'],
            'opening_hours' => ['nullable', 'string', 'max:50'],
            'tiers'         => ['nullable', 'array'],
            'tiers.Basic'   => ['nullable', 'numeric', 'min:0'],
            'tiers.Premium' => ['nullable', 'numeric', 'min:0'],
            'tiers.VIP'     => ['nullable', 'numeric', 'min:0'],
        ]);

        $branch->update([
            'name'          => $data['name'],
            'address'       => $data['address'],
            'phone'         => $data['phone'],
            'opening_hours' => $data['opening_hours'] ?? $branch->opening_hours,
        ]);

        if (!empty($data['tiers'])) {
            foreach ($data['tiers'] as $tier => $price) {
                if ($price !== null) {
                    BranchTier::updateOrCreate(
                        ['branch_id' => $branch->id, 'tier' => $tier],
                        ['price'     => $price]
                    );
                }
            }
        }

        AuditLogService::log('branch_updated', $request->user(), 'info', [
            'branch_name' => $branch->name,
            'branch_id'   => $branch->id,
        ]);

        $this->flushBranchCache($branch->id);

        return response()->json([
            'message' => 'Cabang berhasil diupdate.',
            'data'    => $branch->fresh('tiers'),
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

        $this->flushBranchCache($branch->id);

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

        $this->flushBranchCache($branch->id);
        $branch->delete();

        return response()->json(['message' => 'Cabang berhasil dihapus.']);
    }

    private function flushBranchCache(int $branchId): void
    {
        Cache::forget('branches_active_dropdown');
        Cache::forget('branches_options');
        Cache::forget("branch_tiers_{$branchId}");
    }
}
