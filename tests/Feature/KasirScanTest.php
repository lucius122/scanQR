<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\CheckIn;
use App\Models\Member;
use App\Models\User;
use App\Services\QrService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
 * KasirScanTest — Feature tests untuk endpoint scan QR dan manual check-in.
 *
 * Menggunakan RefreshDatabase: setiap test berjalan dalam transaksi DB
 * yang di-rollback setelah test selesai → tidak ada data sisa antar test.
 *
 * Skenario yang diuji (10 test cases):
 *   1. scan_valid_qr_returns_success
 *   2. scan_expired_member_returns_expired
 *   3. scan_tampered_qr_returns_invalid
 *   4. scan_duplicate_within_2_hours_returns_already_checked_in
 *   5. scan_inactive_user_returns_invalid
 *   6. scan_cross_branch_member_succeeds (member cabang lain boleh scan)
 *   7. manual_checkin_valid_code_succeeds
 *   8. manual_checkin_expired_member_blocked
 *   9. manual_checkin_invalid_code_returns_not_found
 *  10. manual_checkin_logged_with_method_flag
 */
class KasirScanTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;
    private Branch $otherBranch;
    private User   $kasir;
    private User   $memberUser;
    private Member $member;
    private QrService $qr;

    protected function setUp(): void
    {
        parent::setUp();

        $this->qr = app(QrService::class);

        $this->branch = Branch::create([
            'name'    => 'FORGE Test Utama',
            'address' => 'Jl. Test No. 1',
            'phone'   => '021-000001',
            'status'  => 'active',
        ]);

        $this->otherBranch = Branch::create([
            'name'    => 'FORGE Test Kemang',
            'address' => 'Jl. Kemang No. 2',
            'phone'   => '021-000002',
            'status'  => 'active',
        ]);

        $this->kasir = User::create([
            'name'      => 'Kasir Test',
            'email'     => 'kasir@test.local',
            'password'  => bcrypt('test'),
            'role'      => 'kasir',
            'branch_id' => $this->branch->id,
            'status'    => 'active',
        ]);

        $this->memberUser = User::create([
            'name'      => 'Member Test',
            'email'     => 'member@test.local',
            'password'  => bcrypt('test'),
            'role'      => 'member',
            'branch_id' => $this->branch->id,
            'status'    => 'active',
        ]);

        // member_code & qr_token di-generate otomatis via booted()
        $this->member = Member::create([
            'user_id'      => $this->memberUser->id,
            'tier'         => 'Basic',
            'joined_date'  => now()->toDateString(),
            'expires_date' => now()->addMonths(3)->toDateString(),
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    //  QR SCAN TESTS
    // ────────────────────────────────────────────────────────────────────────

    /** @test */
    public function test_scan_valid_qr_returns_success(): void
    {
        $payload = $this->qr->generate($this->member);

        $this->actingAs($this->kasir, 'sanctum')
            ->postJson('/api/kasir/scan', ['qr_payload' => $payload])
            ->assertStatus(200)
            ->assertJson([
                'status'  => 'success',
                'message' => 'Check-in berhasil.',
            ])
            ->assertJsonPath('member.member_code', $this->member->member_code)
            ->assertJsonPath('check_in.method', 'qr_scan');

        // Pastikan record tersimpan di DB
        $this->assertDatabaseHas('check_ins', [
            'member_id' => $this->member->id,
            'status'    => 'success',
            'method'    => 'qr_scan',
        ]);
    }

    /** @test */
    public function test_scan_expired_member_returns_expired(): void
    {
        $this->member->update(['expires_date' => now()->subDay()->toDateString()]);
        $payload = $this->qr->generate($this->member->fresh());

        $this->actingAs($this->kasir, 'sanctum')
            ->postJson('/api/kasir/scan', ['qr_payload' => $payload])
            ->assertStatus(200)
            ->assertJson(['status' => 'expired'])
            ->assertJsonPath('check_in', null);

        // Tidak boleh ada record check-in
        $this->assertDatabaseMissing('check_ins', ['member_id' => $this->member->id]);
    }

    /** @test */
    public function test_scan_tampered_qr_returns_invalid_qr(): void
    {
        $payload  = $this->qr->generate($this->member);
        // Manipulasi member_code di payload → HMAC tidak cocok
        $tampered = str_replace($this->member->member_code, 'FG-2026-HACKED', $payload);

        $this->actingAs($this->kasir, 'sanctum')
            ->postJson('/api/kasir/scan', ['qr_payload' => $tampered])
            ->assertStatus(400)
            ->assertJson(['status' => 'invalid_qr'])   // bukan 'invalid' biasa
            ->assertJsonPath('member', null);
    }

    /** @test */
    public function test_scan_duplicate_within_2_hours_returns_already_checked_in(): void
    {
        // Simulasikan check-in yang sudah ada 30 menit lalu
        CheckIn::create([
            'member_id'     => $this->member->id,
            'branch_id'     => $this->branch->id,
            'scanned_by'    => $this->kasir->id,
            'checked_in_at' => now()->subMinutes(30),
            'status'        => 'success',
            'method'        => 'qr_scan',
        ]);

        $payload = $this->qr->generate($this->member);

        $this->actingAs($this->kasir, 'sanctum')
            ->postJson('/api/kasir/scan', ['qr_payload' => $payload])
            ->assertStatus(200)
            ->assertJson(['status' => 'already_checked_in'])
            ->assertJsonStructure(['message']); // message berisi jam check-in sebelumnya

        // Tidak boleh ada record check-in baru
        $this->assertDatabaseCount('check_ins', 1);
    }

    /** @test */
    public function test_scan_inactive_user_returns_invalid(): void
    {
        $this->memberUser->update(['status' => 'inactive']);
        $payload = $this->qr->generate($this->member);

        $this->actingAs($this->kasir, 'sanctum')
            ->postJson('/api/kasir/scan', ['qr_payload' => $payload])
            ->assertStatus(200)
            ->assertJson(['status' => 'invalid']);
    }

    /** @test */
    public function test_scan_cross_branch_member_succeeds(): void
    {
        // Member dari cabang lain — harus tetap BOLEH check-in
        // Log mencatat branch kasir (tempat scan), bukan branch member
        $this->memberUser->update(['branch_id' => $this->otherBranch->id]);
        $payload = $this->qr->generate($this->member);

        $this->actingAs($this->kasir, 'sanctum')
            ->postJson('/api/kasir/scan', ['qr_payload' => $payload])
            ->assertStatus(200)
            ->assertJson(['status' => 'success']);

        $this->assertDatabaseHas('check_ins', [
            'member_id' => $this->member->id,
            'branch_id' => $this->branch->id, // branch kasir, bukan branch member
            'status'    => 'success',
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    //  MANUAL CHECK-IN TESTS
    // ────────────────────────────────────────────────────────────────────────

    /** @test */
    public function test_manual_checkin_valid_member_succeeds(): void
    {
        $this->actingAs($this->kasir, 'sanctum')
            ->postJson('/api/kasir/check-in/manual', [
                'member_code'   => $this->member->member_code,
                'manual_reason' => 'HP mati',
            ])
            ->assertStatus(200)
            ->assertJson(['status' => 'success'])
            ->assertJsonPath('check_in.method', 'manual');

        $this->assertDatabaseHas('check_ins', [
            'member_id'     => $this->member->id,
            'method'        => 'manual',
            'manual_reason' => 'HP mati',
        ]);
    }

    /** @test */
    public function test_manual_checkin_expired_member_blocked(): void
    {
        $this->member->update(['expires_date' => now()->subDay()->toDateString()]);

        $this->actingAs($this->kasir, 'sanctum')
            ->postJson('/api/kasir/check-in/manual', [
                'member_code' => $this->member->member_code,
            ])
            ->assertStatus(200)
            ->assertJson(['status' => 'expired']);

        $this->assertDatabaseMissing('check_ins', ['member_id' => $this->member->id]);
    }

    /** @test */
    public function test_manual_checkin_invalid_code_returns_not_found(): void
    {
        $this->actingAs($this->kasir, 'sanctum')
            ->postJson('/api/kasir/check-in/manual', [
                'member_code' => 'FG-2026-99999',
            ])
            ->assertStatus(404)
            ->assertJson(['status' => 'invalid'])
            ->assertJsonPath('member', null);
    }

    /** @test */
    public function test_manual_checkin_logged_with_method_flag(): void
    {
        $this->actingAs($this->kasir, 'sanctum')
            ->postJson('/api/kasir/check-in/manual', [
                'member_code' => $this->member->member_code,
            ])
            ->assertStatus(200)
            ->assertJson(['status' => 'success']);

        // Verifikasi method='manual' tersimpan di DB untuk audit trail
        $this->assertDatabaseHas('check_ins', [
            'member_id' => $this->member->id,
            'method'    => 'manual',
            'status'    => 'success',
        ]);

        // Verifikasi method='qr_scan' TIDAK tersimpan
        $this->assertDatabaseMissing('check_ins', [
            'member_id' => $this->member->id,
            'method'    => 'qr_scan',
        ]);
    }
}
