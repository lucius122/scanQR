<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('check_ins', function (Blueprint $table) {
            /*
             * method — cara check-in dilakukan:
             *   qr_scan → scan QR dari kamera (normal flow)
             *   manual  → kasir input member_code manual (fallback)
             *
             * Penting untuk audit: admin bisa monitor rasio manual vs QR.
             * Rasio manual tinggi = indikasi masalah (QR tidak berfungsi, dll.)
             */
            $table->enum('method', ['qr_scan', 'manual'])->default('qr_scan')->after('status');

            /*
             * manual_reason — alasan kasir pakai check-in manual (nullable).
             * Contoh: "HP mati", "QR rusak", "Member baru daftar"
             * Nilai null = tidak diisi / bukan check-in manual.
             */
            $table->string('manual_reason')->nullable()->after('method');
        });
    }

    public function down(): void
    {
        Schema::table('check_ins', function (Blueprint $table) {
            $table->dropColumn(['method', 'manual_reason']);
        });
    }
};
