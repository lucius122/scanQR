<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\CheckIn;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReportController extends Controller
{
    public function attendance(Request $request): JsonResponse
    {
        $start    = $request->query('start_date') ? Carbon::parse($request->query('start_date'))->startOfDay() : Carbon::now()->subDays(29)->startOfDay();
        $end      = $request->query('end_date')   ? Carbon::parse($request->query('end_date'))->endOfDay()     : Carbon::now()->endOfDay();
        $branchId = $request->query('branch_id');
        $perPage  = min((int) $request->query('per_page', 25), 100);

        $query = CheckIn::with(['member.user', 'branch', 'scanner'])
            ->whereBetween('checked_in_at', [$start, $end])
            ->orderByDesc('checked_in_at');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $paginator = $query->paginate($perPage);

        $items = $paginator->map(fn ($ci) => [
            'id'            => $ci->id,
            'member_code'   => $ci->member->member_code,
            'member_name'   => $ci->member->user->name,
            'member_photo_url' => $ci->member->user->photo ? asset('storage/' . $ci->member->user->photo) : null,
            'tier'          => $ci->member->tier,
            'branch_name'   => $ci->branch?->name,
            'checked_in_at' => $ci->checked_in_at->format('Y-m-d H:i:s'),
            'method'        => $ci->method,
            'kasir_name'    => $ci->scanner?->name,
            'status'        => $ci->status,
        ]);

        $summary = $this->buildSummary($start, $end, $branchId);

        return response()->json([
            'data'       => $items,
            'summary'    => $summary,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
        ]);
    }

    public function exportCsv(Request $request)
    {
        $start    = $request->query('start_date') ? Carbon::parse($request->query('start_date'))->startOfDay() : Carbon::now()->subDays(29)->startOfDay();
        $end      = $request->query('end_date')   ? Carbon::parse($request->query('end_date'))->endOfDay()     : Carbon::now()->endOfDay();
        $branchId = $request->query('branch_id');

        $query = CheckIn::with(['member.user', 'branch', 'scanner'])
            ->where('status', 'success')
            ->whereBetween('checked_in_at', [$start, $end])
            ->orderByDesc('checked_in_at');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $data     = $query->get();
        $filename = 'laporan-absensi-' . $start->format('Ymd') . '-' . $end->format('Ymd') . '.csv';

        return response()->streamDownload(function () use ($data) {
            $handle = fopen('php://output', 'w');
            // BOM UTF-8 agar Excel Indonesia bisa baca karakter khusus
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['No', 'Tanggal', 'Waktu (WIB)', 'Member Code', 'Nama Member', 'Tier', 'Cabang', 'Metode', 'Kasir', 'Status']);
            foreach ($data as $i => $ci) {
                fputcsv($handle, [
                    $i + 1,
                    $ci->checked_in_at->format('Y-m-d'),
                    $ci->checked_in_at->format('H:i:s') . ' WIB',
                    $ci->member->member_code,
                    $ci->member->user->name,
                    $ci->member->tier,
                    $ci->branch?->name,
                    $ci->method === 'manual' ? 'Manual' : 'QR Scan',
                    $ci->scanner?->name,
                    $ci->status,
                ]);
            }
            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function branches(): JsonResponse
    {
        $branches = Branch::where('status', 'active')->orderBy('name')->get(['id', 'name']);
        return response()->json($branches);
    }

    private function buildSummary($start, $end, $branchId): array
    {
        $query = CheckIn::where('status', 'success')->whereBetween('checked_in_at', [$start, $end]);
        if ($branchId) $query->where('branch_id', $branchId);

        $total       = (clone $query)->count();
        $unique      = (clone $query)->distinct('member_id')->count('member_id');
        $byQr        = (clone $query)->where('method', 'qr_scan')->count();
        $byManual    = (clone $query)->where('method', 'manual')->count();

        return [
            'total_check_ins'  => $total,
            'unique_members'   => $unique,
            'by_method'        => ['qr_scan' => $byQr, 'manual' => $byManual],
        ];
    }
}
