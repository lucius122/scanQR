<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\User;
use App\Services\AuditLogService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminMemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search   = $request->query('search');
        $status   = $request->query('status');
        $branchId = $request->query('branch_id');
        $tier     = $request->query('tier');
        $perPage  = min((int) $request->query('per_page', 20), 100);

        $query = Member::with(['user.branch'])
            ->orderByDesc('id');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('member_code', 'like', "%{$search}%")
                  ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%"));
            });
        }

        if ($branchId) {
            $query->whereHas('user', fn ($q) => $q->where('branch_id', $branchId));
        }

        if ($tier) {
            $query->where('tier', $tier);
        }

        // Filter status: active (aktif & belum expired), expired (aktif tapi sudah expired), inactive
        if ($status === 'active') {
            $query->whereHas('user', fn ($q) => $q->where('status', 'active'))
                  ->whereDate('expires_date', '>=', Carbon::today());
        } elseif ($status === 'expired') {
            $query->whereHas('user', fn ($q) => $q->where('status', 'active'))
                  ->whereDate('expires_date', '<', Carbon::today());
        } elseif ($status === 'inactive') {
            $query->whereHas('user', fn ($q) => $q->where('status', 'inactive'));
        }

        $paginator = $query->paginate($perPage);

        $today = Carbon::today();
        $items = $paginator->map(function ($member) use ($today) {
            $user      = $member->user;
            $isExpired = $today->greaterThan($member->expires_date);
            $statusStr = $user->status === 'inactive'
                ? 'inactive'
                : ($isExpired ? 'expired' : 'active');

            return [
                'id'           => $member->id,
                'member_code'  => $member->member_code,
                'name'         => $user->name,
                'email'        => $user->email,
                'photo_url'    => $user->photo ? asset('storage/' . $user->photo) : null,
                'tier'         => $member->tier,
                'branch_name'  => $user->branch?->name,
                'branch_id'    => $user->branch_id,
                'status'       => $statusStr,
                'joined_date'  => $member->joined_date->format('Y-m-d'),
                'expires_date' => $member->expires_date->format('Y-m-d'),
            ];
        });

        return response()->json([
            'data'       => $items,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
        ]);
    }

    public function regenerateQr(Request $request, int $id): JsonResponse
    {
        $member = Member::with('user')->findOrFail($id);
        $member->update(['qr_token' => Str::random(64)]);

        AuditLogService::log('qr_regenerated', $request->user(), 'info', [
            'member_code'    => $member->member_code,
            'member_name'    => $member->user->name,
            'regenerated_by' => 'admin',
        ]);

        return response()->json(['message' => 'QR berhasil di-regenerate.', 'member_code' => $member->member_code]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $member = Member::with('user')->findOrFail($id);
        $member->user->update(['status' => $data['status']]);

        $action   = $data['status'] === 'inactive' ? 'member_deactivated' : 'member_reactivated';
        $severity = $data['status'] === 'inactive' ? 'warn' : 'info';

        AuditLogService::log($action, $request->user(), $severity, [
            'target_member_code' => $member->member_code,
            'target_member_name' => $member->user->name,
        ]);

        return response()->json(['message' => 'Status member berhasil diupdate.']);
    }
}
