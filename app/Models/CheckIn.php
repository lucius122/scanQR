<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['member_id', 'branch_id', 'scanned_by', 'checked_in_at', 'status'])]
class CheckIn extends Model
{
    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
        ];
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    // Relasi ke kasir yang melakukan scan (FK: scanned_by → users.id)
    public function scanner()
    {
        return $this->belongsTo(User::class, 'scanned_by');
    }
}
