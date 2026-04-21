<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * Performance indexes untuk skalabilitas dengan ~1000-2000 member.
 *
 * Migration ini idempotent — setiap index dicek keberadaannya sebelum
 * ditambahkan, sehingga aman dijalankan ulang jika sebelumnya gagal di tengah.
 *
 * Catatan: kolom FK (member_id, branch_id, scanned_by, user_id, dll)
 * sudah otomatis ter-index oleh MySQL via FK constraint. Yang ditambahkan
 * adalah index pada kolom non-FK yang sering dipakai untuk filter/sort/lookup.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── users ───────────────────────────────────────────────────────────
        $this->addIndex('users', 'role',                           'idx_users_role');
        $this->addIndex('users', 'status',                         'idx_users_status');
        $this->addIndex('users', ['role', 'status', 'branch_id'],  'idx_users_role_status_branch');

        // ── members ─────────────────────────────────────────────────────────
        $this->addIndex('members', 'member_code',              'idx_members_member_code');
        $this->addIndex('members', 'qr_token',                 'idx_members_qr_token');
        $this->addIndex('members', 'expires_date',             'idx_members_expires_date');
        $this->addIndex('members', 'tier',                     'idx_members_tier');
        $this->addIndex('members', ['expires_date', 'tier'],   'idx_members_expires_tier');

        // ── check_ins ───────────────────────────────────────────────────────
        $this->addIndex('check_ins', 'checked_in_at',                        'idx_checkins_checked_in_at');
        $this->addIndex('check_ins', 'method',                               'idx_checkins_method');
        $this->addIndex('check_ins', 'status',                               'idx_checkins_status');
        $this->addIndex('check_ins', ['branch_id', 'checked_in_at'],         'idx_checkins_branch_date');
        $this->addIndex('check_ins', ['member_id', 'checked_in_at'],         'idx_checkins_member_date');

        // ── audit_logs ──────────────────────────────────────────────────────
        $this->addIndex('audit_logs', 'action',                    'idx_audit_action');
        $this->addIndex('audit_logs', 'severity',                  'idx_audit_severity');
        $this->addIndex('audit_logs', 'created_at',                'idx_audit_created_at');
        $this->addIndex('audit_logs', ['action', 'created_at'],    'idx_audit_action_date');
        $this->addIndex('audit_logs', ['user_id', 'created_at'],   'idx_audit_user_date');

        // ── branches ────────────────────────────────────────────────────────
        $this->addIndex('branches', 'status', 'idx_branches_status');
    }

    public function down(): void
    {
        $drops = [
            'users'      => ['idx_users_role', 'idx_users_status', 'idx_users_role_status_branch'],
            'members'    => ['idx_members_member_code', 'idx_members_qr_token', 'idx_members_expires_date', 'idx_members_tier', 'idx_members_expires_tier'],
            'check_ins'  => ['idx_checkins_checked_in_at', 'idx_checkins_method', 'idx_checkins_status', 'idx_checkins_branch_date', 'idx_checkins_member_date'],
            'audit_logs' => ['idx_audit_action', 'idx_audit_severity', 'idx_audit_created_at', 'idx_audit_action_date', 'idx_audit_user_date'],
            'branches'   => ['idx_branches_status'],
        ];

        foreach ($drops as $table => $indexes) {
            foreach ($indexes as $name) {
                $this->dropIndex($table, $name);
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function indexExists(string $table, string $indexName): bool
    {
        return collect(DB::select(
            'SELECT 1 FROM information_schema.STATISTICS
             WHERE table_schema = DATABASE()
               AND table_name = ?
               AND index_name = ?
             LIMIT 1',
            [$table, $indexName]
        ))->isNotEmpty();
    }

    private function addIndex(string $table, array|string $columns, string $name): void
    {
        if ($this->indexExists($table, $name)) return;

        Schema::table($table, function (Blueprint $t) use ($columns, $name) {
            $t->index($columns, $name);
        });
    }

    private function dropIndex(string $table, string $name): void
    {
        if (!$this->indexExists($table, $name)) return;

        Schema::table($table, function (Blueprint $t) use ($name) {
            $t->dropIndex($name);
        });
    }
};
