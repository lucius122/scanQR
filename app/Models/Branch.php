<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'address', 'phone', 'status'])]
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
}
