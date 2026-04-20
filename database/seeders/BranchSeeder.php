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
                'name'       => 'FORGE Sudirman',
                'address'    => 'Jl. Jend. Sudirman No. 12, Jakarta Pusat',
                'phone'      => '021-5550101',
                'status'     => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name'       => 'FORGE Kemang',
                'address'    => 'Jl. Kemang Raya No. 45, Jakarta Selatan',
                'phone'      => '021-5550202',
                'status'     => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
