<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

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

    /*
     * Cek apakah membership masih aktif.
     *
     * expires_date adalah DATE (tanpa jam). Member dianggap aktif
     * selama hari ini (Carbon::today()) masih <= expires_date,
     * artinya sampai akhir hari tersebut (23:59:59).
     *
     * Contoh: expires_date = 2026-02-28
     *   → pada 2026-02-28 jam 23:00 → AKTIF  ✓
     *   → pada 2026-03-01 jam 00:01 → EXPIRED ✗
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
