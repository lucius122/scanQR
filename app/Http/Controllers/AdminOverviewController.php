<?php

namespace App\Http\Controllers;

use App\Models\CheckIn;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOverviewController extends Controller
{
    public function index(): JsonResponse
    {
        $today     = Carbon::today();
        $thisMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();
        $lastMonthEnd = Carbon::now()->subMonth()->endOfMonth();

        $activeMembers  = Member::whereHas('user', fn ($q) => $q->where('status', 'active'))
            ->whereDate('expires_date', '>=', $today)
            ->count();

        $visitorsToday  = CheckIn::where('status', 'success')
            ->whereDate('checked_in_at', $today)
            ->count();

        $visitorsMonth  = CheckIn::where('status', 'success')
            ->where('checked_in_at', '>=', $thisMonth)
            ->count();

        $visitorsLastMonth = CheckIn::where('status', 'success')
            ->whereBetween('checked_in_at', [$lastMonth, $lastMonthEnd])
            ->count();

        $totalAllTime = CheckIn::where('status', 'success')->count();

        // Delta vs bulan lalu — persentase perubahan
        $monthDelta = $visitorsLastMonth > 0
            ? round((($visitorsMonth - $visitorsLastMonth) / $visitorsLastMonth) * 100, 1)
            : null;
        $deltaStr = $monthDelta !== null
            ? ($monthDelta >= 0 ? "+{$monthDelta}% vs bulan lalu" : "{$monthDelta}% vs bulan lalu")
            : null;

        $topBranches = CheckIn::selectRaw('branch_id, count(*) as total')
            ->where('status', 'success')
            ->where('checked_in_at', '>=', $thisMonth)
            ->with('branch:id,name')
            ->groupBy('branch_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'branch_name' => $row->branch?->name ?? 'Unknown',
                'visitors'    => $row->total,
            ]);

        return response()->json([
            'kpi' => [
                'active_members'        => $activeMembers,
                'visitors_today'        => $visitorsToday,
                'visitors_this_month'   => $visitorsMonth,
                'total_check_ins_all_time' => $totalAllTime,
                'month_delta'           => $deltaStr,
            ],
            'top_branches' => $topBranches,
        ]);
    }

    public function traffic(Request $request): JsonResponse
    {
        $period = (int) $request->query('period', 6);
        if (!in_array($period, [3, 6, 12])) $period = 6;

        $labels = [];
        $values = [];

        for ($i = $period - 1; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i)->startOfMonth();
            $end   = $month->copy()->endOfMonth();

            $labels[] = $month->translatedFormat('M Y') ?: $month->format('M Y');
            $values[] = CheckIn::where('status', 'success')
                ->whereBetween('checked_in_at', [$month, $end])
                ->count();
        }

        return response()->json([
            'period' => $period,
            'labels' => $labels,
            'values' => $values,
        ]);
    }
}
