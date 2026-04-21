<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            /*
             * Nomor telepon member — disimpan di users bukan members
             * supaya semua informasi kontak person ada di satu tabel.
             * Nullable karena kasir bisa mendaftarkan member tanpa nomor hp.
             */
            $table->string('phone', 30)->nullable()->after('photo');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('phone');
        });
    }
};
