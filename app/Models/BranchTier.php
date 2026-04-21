<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['branch_id', 'tier', 'price'])]
class BranchTier extends Model
{
    protected function casts(): array
    {
        return ['price' => 'decimal:2'];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
