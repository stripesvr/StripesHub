<?php
/**
 * Visitor Logger
 * 
 * Include this file at the top of any PHP page:
 *   require_once 'logger.php';
 * 
 * Logs each unique visitor's IP, timestamp, page, and user agent
 * to stats.txt in the same directory.
 */

// --- Configuration ---
 $log_file    = __DIR__ . '/stats.txt';
 $ignore_bots = true; // Set to false to log bots too

// --- Bot detection (basic) ---
if ($ignore_bots) {
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $bot_patterns = [
        'bot', 'crawl', 'spider', 'slurp', 'mediapartners',
        'googlebot', 'bingbot', 'yandexbot', 'duckduckbot',
        'baiduspider', 'facebookexternalhit', 'twitterbot',
        'linkedinbot', 'discordbot', 'semrushbot', 'ahrefsbot'
    ];
    foreach ($bot_patterns as $pattern) {
        if (stripos($ua, $pattern) !== false) {
            return; // Silently skip bots
        }
    }
}

// --- Get the real IP address ---
function get_real_ip(): string {
    // Check reverse proxy headers in order of trustworthiness
    $headers = [
        'HTTP_CF_CONNECTING_IP', // Cloudflare
        'HTTP_X_FORWARDED_FOR',  // General proxy
        'HTTP_X_REAL_IP',        // Nginx proxy
        'REMOTE_ADDR'            // Direct connection (fallback)
    ];

    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip = $_SERVER[$header];
            // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
            if (strpos($ip, ',') !== false) {
                $ip = trim(explode(',', $ip)[0]);
            }
            // Validate it's actually an IP
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }

    return '0.0.0.0'; // Ultimate fallback
}

 $ip         = get_real_ip();
 $timestamp  = date('Y-m-d H:i:s T');
 $page       = $_SERVER['REQUEST_URI'] ?? '/';
 $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';

// Build the log line
 $log_entry = sprintf(
    "[%s] IP: %s | Page: %s | UA: %s\n",
    $timestamp,
    $ip,
    $page,
    $user_agent
);

// Write to file (append mode, create if doesn't exist)
file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);
