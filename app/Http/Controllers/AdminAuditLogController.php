<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $action   = $request->query('action');
        $severity = $request->query('severity');
        $start    = $request->query('start_date') ? Carbon::parse($request->query('start_date'))->startOfDay() : null;
        $end      = $request->query('end_date')   ? Carbon::parse($request->query('end_date'))->endOfDay()     : null;
        $perPage  = min((int) $request->query('per_page', 30), 100);

        $query = AuditLog::with('user:id,name,role')
            ->orderByDesc('created_at');

        if ($action && $action !== 'all') {
            // action groups
            $groups = [
                'qr'       => ['qr_regenerated', 'qr_invalid_signature'],
                'member'   => ['member_deactivated', 'member_reactivated', 'expired_member_scan_attempt'],
                'security' => ['qr_invalid_signature', 'manual_checkin'],
            ];
            if (isset($groups[$action])) {
                $query->whereIn('action', $groups[$action]);
            } else {
                $query->where('action', $action);
            }
        }

        if ($severity && $severity !== 'all') {
            $query->where('severity', $severity);
        }

        if ($start) $query->where('created_at', '>=', $start);
        if ($end)   $query->where('created_at', '<=', $end);

        $paginator = $query->paginate($perPage);

        $items = $paginator->map(fn ($log) => [
            'id'         => $log->id,
            'created_at' => $log->created_at->format('Y-m-d H:i:s'),
            'user'       => $log->user ? ['name' => $log->user->name, 'role' => $log->user->role] : null,
            'action'     => $log->action,
            'severity'   => $log->severity,
            'details'    => $log->details,
            'ip_address' => $log->ip_address,
        ]);

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

    public function stats(): JsonResponse
    {
        $thirtyDaysAgo = Carbon::now()->subDays(30);

        return response()->json([
            'invalid_qr_30d' => AuditLog::where('action', 'qr_invalid_signature')
                ->where('created_at', '>=', $thirtyDaysAgo)
                ->count(),
            'manual_checkin_30d' => AuditLog::where('action', 'manual_checkin')
                ->where('created_at', '>=', $thirtyDaysAgo)
                ->count(),
            'total_bad_30d' => AuditLog::where('severity', 'bad')
                ->where('created_at', '>=', $thirtyDaysAgo)
                ->count(),
        ]);
    }
}
