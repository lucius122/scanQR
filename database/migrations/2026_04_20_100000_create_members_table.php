<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * MEMBERS — profil tambahan khusus untuk user ber-role 'member'.
         * Relasi 1:1 dengan tabel users via user_id (unique).
         *
         * expires_date pakai DATE (bukan DATETIME) karena validasi aktif/kadaluarsa
         * berdasarkan hari penuh — member aktif sampai akhir hari expires_date (23:59:59).
         * Logika: Carbon::today() <= expires_date
         *
         * qr_token adalah token acak 64 karakter yang dipakai untuk generate QR code.
         * Bisa di-regenerate kapan saja (jika member minta reset QR).
         */
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->unique()
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('member_code', 20)->unique();   // FG-YYYY-NNNNN
            $table->enum('tier', ['Basic', 'Premium', 'VIP']);
            $table->date('joined_date');
            $table->date('expires_date');
            $table->string('qr_token', 64)->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};
