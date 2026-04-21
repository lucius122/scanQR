<?php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        Branch::insert([
            [
                'name'          => '88 STRONG GYM Cabang 1',
                'address'       => 'Jl. Jend. Sudirman No. 12, Jakarta Pusat',
                'phone'         => '021-5550101',
                'opening_hours' => '06:00-22:00',
                'status'        => 'active',
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
            [
                'name'          => '88 STRONG GYM Cabang 2',
                'address'       => 'Jl. Kemang Raya No. 45, Jakarta Selatan',
                'phone'         => '021-5550202',
                'opening_hours' => '06:00-22:00',
                'status'        => 'active',
                'created_at'    => now(),
                'updated_at'    => now(),
            ],
        ]);
    }
}
