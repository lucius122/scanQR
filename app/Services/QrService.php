<?php

namespace App\Services;

use App\Models\Member;
use Illuminate\Support\Str;

/*
 * QrService — Layanan pembuatan dan verifikasi QR payload bertanda tangan.
 *
 * ═══════════════════════════════════════════════════════════════════
 *  PENJELASAN UNTUK BAB METODOLOGI SKRIPSI
 * ═══════════════════════════════════════════════════════════════════
 *
 * Masalah: QR code yang hanya berisi member_code (contoh: "FG-2026-00001")
 * sangat mudah dipalsukan — siapa saja bisa membuat QR dengan kode itu.
 *
 * Solusi: Signed QR Token menggunakan HMAC-SHA256.
 *
 * FORMAT PAYLOAD:
 *   FORGE|{member_code}|{qr_token}|{unix_timestamp}|{signature}
 *
 * KOMPONEN:
 *   FORGE          → prefix tetap sebagai "magic bytes" identifikasi sistem
 *   member_code    → kode unik member (FG-YYYY-NNNNN)
 *   qr_token       → token acak 64 karakter yang disimpan di database,
 *                    diketahui hanya oleh server — kunci anti-pemalsuan utama
 *   unix_timestamp → waktu QR di-generate (Unix epoch seconds)
 *                    → digunakan untuk audit trail
 *                    → bisa dipakai validasi "QR tidak boleh lebih dari N menit"
 *   signature      → HMAC-SHA256(payload_tanpa_sig, APP_KEY)
 *                    → membuktikan payload tidak dimodifikasi
 *
 * CARA KERJA HMAC-SHA256:
 *   Kasir scan QR → dapat string panjang → backend split per "|"
 *   → rekonstruksi 4 bagian pertama → hash ulang dengan APP_KEY
 *   → bandingkan hash dengan bagian ke-5 (signature)
 *   → jika cocok: QR asli dan tidak dimanipulasi
 *   → jika tidak cocok: QR palsu atau data diubah → tolak
 *
 * MENGAPA AMAN:
 *   1. qr_token disimpan di DB → hanya server yang tahu → tidak bisa ditebak
 *   2. HMAC menggunakan APP_KEY → hanya server yang bisa buat signature valid
 *   3. Jika screenshot QR tersebar → admin bisa regenerate qr_token
 *      → semua QR lama otomatis invalid (qr_token di DB berbeda)
 *   4. hash_equals() mencegah timing attack saat membandingkan signature
 * ═══════════════════════════════════════════════════════════════════
 */
class QrService
{
    /*
     * Generate signed QR payload dari data member.
     * Dipanggil setiap kali member buka halaman QR.
     */
    public function generate(Member $member): string
    {
        $timestamp = now()->timestamp;

        // Bagian payload tanpa signature
        $data = implode('|', [
            'FORGE',
            $member->member_code,
            $member->qr_token,
            $timestamp,
        ]);

        $signature = $this->sign($data);

        return $data . '|' . $signature;
    }

    /*
     * Verifikasi QR string yang di-scan kasir.
     *
     * Return: array berisi member_code, qr_token, timestamp — jika valid
     * Return: false — jika format salah atau signature tidak cocok (QR palsu)
     *
     * Penggunaan di ScanController (Tahap 4 nanti):
     *   $parsed = $qrService->verify($scannedString);
     *   if (!$parsed) { return 'invalid_qr'; }
     *   $member = Member::where('qr_token', $parsed['qr_token'])
     *                    ->where('member_code', $parsed['member_code'])
     *                    ->first();
     *   if (!$member) { return 'invalid_qr'; }      // token tidak ada di DB
     *   if (!$member->isActive()) { return 'expired_blocked'; }
     *   // → success, catat check-in
     */
    public function verify(string $qrString): array|false
    {
        $parts = explode('|', $qrString);

        // Harus tepat 5 bagian dan diawali "FORGE"
        if (count($parts) !== 5 || $parts[0] !== 'FORGE') {
            return false;
        }

        [$prefix, $memberCode, $qrToken, $timestamp, $receivedSignature] = $parts;

        // Rekonstruksi payload dan hash ulang
        $data             = implode('|', [$prefix, $memberCode, $qrToken, $timestamp]);
        $expectedSignature = $this->sign($data);

        // hash_equals() — perbandingan constant-time untuk mencegah timing attack
        if (!hash_equals($expectedSignature, $receivedSignature)) {
            return false;
        }

        return [
            'member_code' => $memberCode,
            'qr_token'    => $qrToken,
            'timestamp'   => (int) $timestamp,
        ];
    }

    /*
     * HMAC-SHA256 signing.
     *
     * APP_KEY Laravel disimpan dalam format "base64:xxxx..." di .env.
     * Kita decode dulu ke bytes mentah sebelum dipakai sebagai HMAC key,
     * agar kualitas entropi key tetap terjaga (256-bit random bytes).
     */
    private function sign(string $data): string
    {
        $appKey = config('app.key');

        $rawKey = str_starts_with($appKey, 'base64:')
            ? base64_decode(substr($appKey, 7))
            : $appKey;

        return hash_hmac('sha256', $data, $rawKey);
    }
}
