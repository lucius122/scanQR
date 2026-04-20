<?php

namespace Database\Seeders;

use App\Models\Member;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MemberSeeder extends Seeder
{
    public function run(): void
    {
        /*
         * Format member_code: FG-YYYY-NNNNN
         * Contoh: FG-2026-00001
         *
         * qr_token adalah string acak 64 karakter — ini yang akan di-encode
         * menjadi QR code. Disimpan di database untuk diverifikasi saat scan.
         */

        $year = now()->year; // 2026

        $members = [
            [
                'email'        => 'rania@mail.test',
                'member_code'  => "FG-{$year}-00001",
                'tier'         => 'Premium',
                'joined_date'  => now()->subMonths(3)->toDateString(),
                'expires_date' => now()->addMonths(3)->toDateString(), // aktif 3 bulan ke depan
            ],
            [
                'email'        => 'raka@mail.test',
                'member_code'  => "FG-{$year}-00002",
                'tier'         => 'Basic',
                'joined_date'  => now()->subMonth()->toDateString(),
                'expires_date' => now()->addMonths(2)->toDateString(), // aktif 2 bulan ke depan
            ],
            [
                'email'        => 'expired@mail.test',
                'member_code'  => "FG-{$year}-00003",
                'tier'         => 'Premium',
                'joined_date'  => now()->subMonths(4)->toDateString(),
                'expires_date' => now()->subDay()->toDateString(), // expired kemarin
            ],
        ];

        foreach ($members as $data) {
            $user = User::where('email', $data['email'])->first();

            Member::create([
                'user_id'      => $user->id,
                'member_code'  => $data['member_code'],
                'tier'         => $data['tier'],
                'joined_date'  => $data['joined_date'],
                'expires_date' => $data['expires_date'],
                'qr_token'     => Str::random(64),
            ]);
        }
    }
}
