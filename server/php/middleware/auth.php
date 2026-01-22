<?php
/**
 * Authentication Middleware
 */

require_once __DIR__ . '/../config/jwt.php';

class AuthMiddleware {
    /**
     * Verify JWT token from Authorization header
     * Returns user data if valid, null otherwise
     */
    public static function authenticate() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
        
        if (!$authHeader) {
            return null;
        }
        
        if (strpos($authHeader, 'Bearer ') !== 0) {
            return null;
        }
        
        $token = substr($authHeader, 7);
        $decoded = JWT::decode($token);
        
        if (!$decoded) {
            return null;
        }
        
        return $decoded;
    }
    
    /**
     * Require authentication - send 401 if not authenticated
     */
    public static function requireAuth() {
        $user = self::authenticate();
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'unauthorized']);
            exit;
        }
        
        return $user;
    }
    
    /**
     * Require specific role
     */
    public static function requireRole($role) {
        $user = self::requireAuth();
        
        if (!isset($user['role']) || $user['role'] !== $role) {
            http_response_code(403);
            echo json_encode(['error' => 'forbidden']);
            exit;
        }
        
        return $user;
    }
}
