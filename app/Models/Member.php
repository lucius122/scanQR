<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/*
 * Member model — profil khusus untuk user ber-role 'member'.
 *
 * Auto-generation via booted():
 *   - member_code : format FG-YYYY-NNNNN, urutan per tahun, query DB untuk nomor berikutnya
 *   - qr_token    : Str::random(64) — token acak yang disimpan di DB,
 *                   digunakan sebagai salah satu komponen payload QR.
 *                   Bisa di-regenerate sewaktu-waktu (membatalkan QR lama).
 */
#[Fillable(['user_id', 'member_code', 'tier', 'joined_date', 'expires_date', 'qr_token'])]
class Member extends Model
{
    protected function casts(): array
    {
        return [
            'joined_date'  => 'date',
            'expires_date' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Member $member) {
            // Auto-generate member_code jika belum diisi (misal dari seeder yang sudah set manual)
            if (empty($member->member_code)) {
                $year = now()->year;

                /*
                 * Ambil member terakhir tahun ini untuk mendapatkan nomor urut berikutnya.
                 * Contoh: "FG-2026-00003" → ambil "00003" → cast ke int → +1 → "00004"
                 *
                 * Catatan: ada kemungkinan race condition jika ada dua registrasi
                 * bersamaan di load tinggi. Untuk skala thesis ini aman; di produksi
                 * gunakan DB sequence atau auto-increment terpisah.
                 */
                $last = static::where('member_code', 'like', "88SG-{$year}-%")
                    ->orderByDesc('id')
                    ->lockForUpdate()
                    ->first();

                $nextNum = $last
                    ? ((int) Str::afterLast($last->member_code, '-')) + 1
                    : 1;

                $member->member_code = sprintf('88SG-%d-%05d', $year, $nextNum);
            }

            // Auto-generate qr_token jika belum diisi
            if (empty($member->qr_token)) {
                $member->qr_token = Str::random(64);
            }
        });
    }

    /*
     * Cek apakah membership masih aktif.
     *
     * expires_date adalah DATE (tanpa jam). Member dianggap aktif
     * selama hari ini (Carbon::today()) masih <= expires_date,
     * artinya member aktif sampai akhir hari expires_date (23:59:59).
     *
     * Contoh: expires_date = 2026-02-28
     *   → 2026-02-28 jam 23:59 → today = 28 Feb → AKTIF  ✓
     *   → 2026-03-01 jam 00:01 → today = 1 Mar  → EXPIRED ✗
     */
    public function isActive(): bool
    {
        return Carbon::today()->lte($this->expires_date);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function checkIns()
    {
        return $this->hasMany(CheckIn::class);
    }
}
