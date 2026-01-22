<?php
/**
 * JWT Configuration and Helper Functions
 */

class JWT {
    private static $secret;
    
    public static function getSecret() {
        if (self::$secret === null) {
            self::$secret = getenv('JWT_SECRET') ?: 'change-me';
        }
        return self::$secret;
    }
    
    /**
     * Generate JWT token
     */
    public static function encode($payload, $expiresIn = 604800) { // 7 days default
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['exp'] = time() + $expiresIn;
        $payload = json_encode($payload);
        
        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode($payload);
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecret(), true);
        $base64UrlSignature = self::base64UrlEncode($signature);
        
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }
    
    /**
     * Decode and verify JWT token
     */
    public static function decode($token) {
        $tokenParts = explode('.', $token);
        
        if (count($tokenParts) !== 3) {
            return null;
        }
        
        $header = base64_decode($tokenParts[0]);
        $payload = base64_decode($tokenParts[1]);
        $signatureProvided = $tokenParts[2];
        
        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode($payload);
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::getSecret(), true);
        $base64UrlSignature = self::base64UrlEncode($signature);
        
        if ($base64UrlSignature !== $signatureProvided) {
            return null;
        }
        
        $payload = json_decode($payload, true);
        
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }
        
        return $payload;
    }
    
    private static function base64UrlEncode($text) {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($text));
    }
}
