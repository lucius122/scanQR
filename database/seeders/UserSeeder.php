<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // branch_id 1 = FORGE Sudirman, 2 = FORGE Kemang
        $users = [
            // Admin HQ — tidak terikat cabang (branch_id null)
            [
                'name'      => 'Budi Santoso',
                'email'     => 'budi@forge.test',
                'password'  => Hash::make('password123'),
                'role'      => 'admin',
                'branch_id' => null,
                'status'    => 'active',
            ],
            // Kasir cabang Sudirman
            [
                'name'      => 'Andi Wijaya',
                'email'     => 'andi@forge.test',
                'password'  => Hash::make('password123'),
                'role'      => 'kasir',
                'branch_id' => 1,
                'status'    => 'active',
            ],
            // Kasir cabang Kemang
            [
                'name'      => 'Citra Dewi',
                'email'     => 'citra@forge.test',
                'password'  => Hash::make('password123'),
                'role'      => 'kasir',
                'branch_id' => 2,
                'status'    => 'active',
            ],
            // Trainer cabang Sudirman
            [
                'name'      => 'Dimas Pratama',
                'email'     => 'dimas@forge.test',
                'password'  => Hash::make('password123'),
                'role'      => 'trainer',
                'branch_id' => 1,
                'status'    => 'active',
            ],
            // Member aktif Premium
            [
                'name'      => 'Rania Putri',
                'email'     => 'rania@mail.test',
                'password'  => Hash::make('password123'),
                'role'      => 'member',
                'branch_id' => 1,
                'status'    => 'active',
            ],
            // Member aktif Basic
            [
                'name'      => 'Raka Alfarizi',
                'email'     => 'raka@mail.test',
                'password'  => Hash::make('password123'),
                'role'      => 'member',
                'branch_id' => 2,
                'status'    => 'active',
            ],
            // Member sudah expired (untuk uji coba logika kadaluarsa)
            [
                'name'      => 'Expired User',
                'email'     => 'expired@mail.test',
                'password'  => Hash::make('password123'),
                'role'      => 'member',
                'branch_id' => 1,
                'status'    => 'active',
            ],
        ];

        foreach ($users as $data) {
            User::create($data);
        }
    }
}
