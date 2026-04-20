<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        /*
         * Urutan seeder PENTING:
         * 1. BranchSeeder  → branch harus ada sebelum users (FK)
         * 2. UserSeeder    → user harus ada sebelum members (FK)
         * 3. MemberSeeder  → member profil untuk user ber-role 'member'
         */
        $this->call([
            BranchSeeder::class,
            UserSeeder::class,
            MemberSeeder::class,
        ]);
    }
}
