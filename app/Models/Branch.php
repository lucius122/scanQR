<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'address', 'phone', 'opening_hours', 'status', 'tier_id'])]
class Branch extends Model
{
    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function checkIns()
    {
        return $this->hasMany(CheckIn::class);
    }

    /**
     * Tier yang berlaku di cabang ini.
     * Tier = template harga (nama + harga).
     */
    public function tier()
    {
        return $this->belongsTo(Tier::class);
    }
}
