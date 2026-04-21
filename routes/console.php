<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Cleanup data lama setiap hari jam 03:00 WIB.
 * Menghapus check_ins dan audit_logs yang > 1 tahun.
 */
Schedule::command('app:cleanup-old-records')->dailyAt('03:00');
