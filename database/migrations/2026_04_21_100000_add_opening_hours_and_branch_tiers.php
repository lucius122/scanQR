<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tambah kolom opening_hours ke tabel branches
        Schema::table('branches', function (Blueprint $table) {
            $table->string('opening_hours', 50)->default('06:00-22:00')->after('phone');
        });

        /*
         * Tabel branch_tiers — menyimpan harga tier per cabang.
         * unique(['branch_id', 'tier']) memastikan tidak ada duplikasi
         * harga untuk tier yang sama dalam satu cabang.
         */
        Schema::create('branch_tiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('tier'); // Basic, Premium, VIP
            $table->decimal('price', 12, 2);
            $table->timestamps();
            $table->unique(['branch_id', 'tier']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_tiers');

        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('opening_hours');
        });
    }
};
