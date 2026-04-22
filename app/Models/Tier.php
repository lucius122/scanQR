<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/*
 * Tier — template harga keanggotaan.
 *
 * Admin mengelola tier (nama + harga), lalu assign ke cabang.
 * Member otomatis mendapat tier dari cabang tempat mereka daftar.
 */
#[Fillable(['name', 'price', 'sort_order'])]
class Tier extends Model
{
    protected function casts(): array
    {
        return ['price' => 'decimal:2'];
    }

    public function branches()
    {
        return $this->hasMany(Branch::class);
    }
}
