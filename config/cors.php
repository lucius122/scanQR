<?php

return [
    /*
     * CORS configuration untuk FORGE Gym OS
     * Mengizinkan React SPA di localhost:5173 berkomunikasi dengan API Laravel
     *
     * paths         : endpoint mana yang kena CORS (semua /api/*)
     * allowed_origins: domain React frontend
     * supports_credentials: WAJIB true untuk Sanctum cookie-based auth
     */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['http://localhost:5173'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
