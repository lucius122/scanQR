<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/*
 * Membersihkan data check_ins dan audit_logs yang lebih dari 1 tahun.
 * Tujuan: menjaga performa server agar tidak terbebani oleh data lama.
 *
 * Register schedule di routes/console.php:
 *   Schedule::command('app:cleanup-old-records')->dailyAt('03:00');
 *
 * Jalankan manual:
 *   php artisan app:cleanup-old-records
 *   php artisan app:cleanup-old-records --dry-run   (preview tanpa delete)
 */
class CleanupOldRecords extends Command
{
    protected $signature = 'app:cleanup-old-records {--dry-run : Preview jumlah yang akan dihapus tanpa menghapus}';
    protected $description = 'Hapus check_ins dan audit_logs yang lebih dari 1 tahun';

    public function handle(): int
    {
        $cutoff = Carbon::now()->subYear();
        $dryRun = $this->option('dry-run');

        $this->info("Cutoff date: {$cutoff->toDateString()}");

        if ($dryRun) {
            $this->warn('⚠ DRY RUN — tidak ada data yang dihapus.');
        }

        // ── Check-ins ────────────────────────────────────────────────────────
        $checkInCount = DB::table('check_ins')
            ->where('checked_in_at', '<', $cutoff)
            ->count();

        if ($dryRun) {
            $this->line("  check_ins  : {$checkInCount} records akan dihapus");
        } else {
            // Hapus dalam batch 1000 untuk menghindari lock terlalu lama
            $deleted = 0;
            do {
                $batch = DB::table('check_ins')
                    ->where('checked_in_at', '<', $cutoff)
                    ->limit(1000)
                    ->delete();
                $deleted += $batch;
            } while ($batch > 0);
            $this->line("  check_ins  : {$deleted} records dihapus ✓");
        }

        // ── Audit logs ───────────────────────────────────────────────────────
        $auditLogCount = DB::table('audit_logs')
            ->where('created_at', '<', $cutoff)
            ->count();

        if ($dryRun) {
            $this->line("  audit_logs : {$auditLogCount} records akan dihapus");
        } else {
            $deleted = 0;
            do {
                $batch = DB::table('audit_logs')
                    ->where('created_at', '<', $cutoff)
                    ->limit(1000)
                    ->delete();
                $deleted += $batch;
            } while ($batch > 0);
            $this->line("  audit_logs : {$deleted} records dihapus ✓");
        }

        $this->newLine();
        $this->info($dryRun ? 'Preview selesai.' : 'Cleanup selesai.');

        return self::SUCCESS;
    }
}
