<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * CHECK_INS — log setiap percobaan absensi.
         * Status:
         *   success          → QR valid, member aktif, check-in dicatat
         *   expired_blocked  → QR valid tapi membership sudah kadaluarsa
         *   invalid_qr       → token QR tidak dikenali di database
         *
         * scanned_by → FK ke users (kasir yang melakukan scan)
         * checked_in_at pakai DATETIME (bukan timestamps) karena kita butuh
         * presisi waktu yang akurat untuk riwayat absensi.
         */
        Schema::create('check_ins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained('members');
            $table->foreignId('branch_id')->constrained('branches');
            $table->foreignId('scanned_by')->constrained('users');
            $table->dateTime('checked_in_at');
            $table->enum('status', ['success', 'expired_blocked', 'invalid_qr'])
                ->default('success');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('check_ins');
    }
};
