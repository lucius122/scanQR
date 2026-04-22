<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * Refactor Tier System
 *
 * SEBELUM:  branch_tiers (branch_id, tier, price) — 1 cabang bisa multi-tier
 * SESUDAH:  tiers (id, name, price) + branches.tier_id FK — 1 cabang = 1 tier
 *
 * Tier = template harga. Admin kelola tier, lalu assign ke cabang.
 * Member otomatis dapat tier dari cabang tempat daftar.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Buat tabel master tiers
        Schema::create('tiers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->decimal('price', 12, 2);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // 2. Populate tier dari data branch_tiers yang sudah ada
        if (Schema::hasTable('branch_tiers')) {
            $existingTiers = DB::table('branch_tiers')
                ->select('tier', 'price')
                ->groupBy('tier', 'price')
                ->orderBy('tier')
                ->get();

            $sortOrder = 1;
            $tierMap = []; // tier_name => tier_id
            foreach ($existingTiers as $t) {
                if (!isset($tierMap[$t->tier])) {
                    $id = DB::table('tiers')->insertGetId([
                        'name'       => $t->tier,
                        'price'      => $t->price,
                        'sort_order' => $sortOrder++,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $tierMap[$t->tier] = $id;
                }
            }

            // Jika tidak ada data existing, seed default
            if (empty($tierMap)) {
                $tierMap['Basic']   = DB::table('tiers')->insertGetId(['name' => 'Basic',   'price' => 150000, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()]);
                $tierMap['Premium'] = DB::table('tiers')->insertGetId(['name' => 'Premium', 'price' => 250000, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()]);
                $tierMap['VIP']     = DB::table('tiers')->insertGetId(['name' => 'VIP',     'price' => 400000, 'sort_order' => 3, 'created_at' => now(), 'updated_at' => now()]);
            }

            // 3. Tambah tier_id ke branches (nullable dulu)
            Schema::table('branches', function (Blueprint $table) {
                $table->foreignId('tier_id')->nullable()->after('status')->constrained('tiers');
            });

            // 4. Assign tier_id ke setiap cabang berdasarkan data branch_tiers
            $branches = DB::table('branches')->get();
            foreach ($branches as $branch) {
                // Cari tier pertama (alphabetical) dari branch_tiers untuk cabang ini
                $bt = DB::table('branch_tiers')
                    ->where('branch_id', $branch->id)
                    ->orderBy('tier')
                    ->first();

                $tierId = $bt ? ($tierMap[$bt->tier] ?? null) : null;

                // Fallback ke Basic jika tidak ada data
                if (!$tierId) {
                    $tierId = $tierMap['Basic'] ?? DB::table('tiers')->orderBy('sort_order')->value('id');
                }

                DB::table('branches')
                    ->where('id', $branch->id)
                    ->update(['tier_id' => $tierId]);
            }

            // 5. Drop tabel branch_tiers (sudah tidak dipakai)
            Schema::dropIfExists('branch_tiers');
        } else {
            // Kalau branch_tiers sudah tidak ada (fresh install), seed default tiers
            DB::table('tiers')->insert([
                ['name' => 'Basic',   'price' => 150000, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Premium', 'price' => 250000, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'VIP',     'price' => 400000, 'sort_order' => 3, 'created_at' => now(), 'updated_at' => now()],
            ]);

            // Tambah tier_id ke branches
            Schema::table('branches', function (Blueprint $table) {
                $table->foreignId('tier_id')->nullable()->after('status')->constrained('tiers');
            });

            // Default semua cabang ke Basic
            $basicId = DB::table('tiers')->where('name', 'Basic')->value('id');
            if ($basicId) {
                DB::table('branches')->whereNull('tier_id')->update(['tier_id' => $basicId]);
            }
        }
    }

    public function down(): void
    {
        // Recreate branch_tiers from current data
        Schema::create('branch_tiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('tier');
            $table->decimal('price', 12, 2);
            $table->timestamps();
            $table->unique(['branch_id', 'tier']);
        });

        // Migrate data back
        $branches = DB::table('branches')->whereNotNull('tier_id')->get();
        foreach ($branches as $branch) {
            $tier = DB::table('tiers')->find($branch->tier_id);
            if ($tier) {
                DB::table('branch_tiers')->insert([
                    'branch_id'  => $branch->id,
                    'tier'       => $tier->name,
                    'price'      => $tier->price,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        Schema::table('branches', function (Blueprint $table) {
            $table->dropForeign(['tier_id']);
            $table->dropColumn('tier_id');
        });

        Schema::dropIfExists('tiers');
    }
};
