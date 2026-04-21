<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * AUDIT_LOGS — rekam jejak semua aksi penting sistem QR.
         * Dipakai sebagai bukti anti-fraud untuk skripsi:
         *   - scan QR invalid → sistem deteksi pemalsuan QR
         *   - manual check-in → transparansi penggunaan fallback
         *   - admin actions   → accountability admin
         *
         * severity: info (normal), warn (perlu perhatian), bad (potensi fraud)
         */
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('severity')->default('info');
            $table->json('details')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
