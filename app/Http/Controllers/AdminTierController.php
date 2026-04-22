<?php

namespace App\Http\Controllers;

use App\Models\Tier;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AdminTierController extends Controller
{
    /*
     * GET /api/tiers/options
     * Dropdown list — non-paginated, di-cache 1 jam.
     */
    public function options(): JsonResponse
    {
        $data = Cache::remember('tiers_options', 3600, fn () =>
            Tier::orderBy('sort_order')
                ->get(['id', 'name', 'price'])
                ->toArray()
        );
        return response()->json(['data' => $data]);
    }

    /*
     * GET /api/admin/tiers
     * List semua tier beserta jumlah cabang yang menggunakan.
     */
    public function index(): JsonResponse
    {
        $tiers = Tier::withCount('branches')
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($t) => [
                'id'             => $t->id,
                'name'           => $t->name,
                'price'          => (float) $t->price,
                'sort_order'     => $t->sort_order,
                'branches_count' => $t->branches_count,
            ]);

        return response()->json(['data' => $tiers]);
    }

    /*
     * POST /api/admin/tiers
     * Tambah tier baru.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'       => ['required', 'string', 'max:50', 'unique:tiers,name'],
            'price'      => ['required', 'numeric', 'min:0'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $tier = Tier::create([
            'name'       => $data['name'],
            'price'      => $data['price'],
            'sort_order' => $data['sort_order'] ?? (Tier::max('sort_order') + 1),
        ]);

        AuditLogService::log('tier_created', $request->user(), 'info', [
            'tier_name' => $tier->name,
            'tier_id'   => $tier->id,
        ]);

        $this->flushCache();

        return response()->json([
            'message' => 'Tier berhasil ditambahkan.',
            'data'    => $tier,
        ], 201);
    }

    /*
     * PUT /api/admin/tiers/{id}
     * Update nama dan/atau harga tier.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $tier = Tier::findOrFail($id);

        $data = $request->validate([
            'name'       => ['required', 'string', 'max:50', "unique:tiers,name,{$id}"],
            'price'      => ['required', 'numeric', 'min:0'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $tier->update([
            'name'       => $data['name'],
            'price'      => $data['price'],
            'sort_order' => $data['sort_order'] ?? $tier->sort_order,
        ]);

        AuditLogService::log('tier_updated', $request->user(), 'info', [
            'tier_name' => $tier->name,
            'tier_id'   => $tier->id,
        ]);

        $this->flushCache();

        return response()->json([
            'message' => 'Tier berhasil diupdate.',
            'data'    => $tier->fresh(),
        ]);
    }

    /*
     * DELETE /api/admin/tiers/{id}
     * Hapus tier — gagal jika masih ada cabang yang menggunakan.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $tier = Tier::withCount('branches')->findOrFail($id);

        if ($tier->branches_count > 0) {
            return response()->json([
                'message' => "Tier \"{$tier->name}\" tidak bisa dihapus karena masih digunakan oleh {$tier->branches_count} cabang.",
            ], 422);
        }

        AuditLogService::log('tier_deleted', $request->user(), 'warn', [
            'tier_name' => $tier->name,
            'tier_id'   => $tier->id,
        ]);

        $tier->delete();
        $this->flushCache();

        return response()->json(['message' => 'Tier berhasil dihapus.']);
    }

    private function flushCache(): void
    {
        Cache::forget('tiers_options');
        Cache::forget('branches_options');
        Cache::forget('branches_active_dropdown');
    }
}
