<?php
/**
 * Authentication Routes
 * Handles user registration, login, and profile
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/email.php';

class AuthController {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * POST /api/auth/register
     */
    public function register() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $display_name = $data['display_name'] ?? null;
        
        if (!$email || !$password) {
            Response::error('email and password required', 400);
        }
        
        $password_hash = password_hash($password, PASSWORD_BCRYPT);
        
        try {
            // Check if this is the first user - if so, make them an admin
            $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM users");
            $stmt->execute();
            $result = $stmt->fetch();
            $isFirstUser = (int)$result['count'] === 0;
            
            $role = $isFirstUser ? 'admin' : 'user';
            
            $stmt = $this->db->prepare("INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)");
            $stmt->execute([$email, $password_hash, $display_name, $role]);
            
            $userId = $this->db->lastInsertId();
            
            $stmt = $this->db->prepare("SELECT id, email, display_name, role FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            
            // Send welcome email (non-blocking)
            Email::sendWelcomeEmail($user);
            
            Response::json(['user' => $user], 201);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) { // Duplicate entry
                Response::error('Email already exists', 400);
            }
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * POST /api/auth/login
     */
    public function login() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        
        if (!$email || !$password) {
            Response::error('email and password required', 400);
        }
        
        try {
            $stmt = $this->db->prepare("SELECT id, email, password_hash, display_name, role FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            if (!$user) {
                Response::error('invalid credentials', 401);
            }
            
            if (!$user['password_hash']) {
                Response::error('no password set for user', 400);
            }
            
            if (!password_verify($password, $user['password_hash'])) {
                Response::error('invalid credentials', 401);
            }
            
            $token = JWT::encode([
                'userId' => $user['id'],
                'role' => $user['role'] ?? 'user'
            ]);
            
            Response::json([
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'display_name' => $user['display_name'],
                    'role' => $user['role']
                ]
            ]);
        } catch (PDOException $e) {
            error_log('login error: ' . $e->getMessage());
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * GET /api/auth/me
     */
    public function me() {
        $authUser = AuthMiddleware::requireAuth();
        $userId = $authUser['userId'];
        
        try {
            $stmt = $this->db->prepare("SELECT id, email, display_name, role, is_active FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            
            if (!$user) {
                Response::error('user not found', 404);
            }
            
            Response::json(['user' => $user]);
        } catch (PDOException $e) {
            error_log('me error: ' . $e->getMessage());
            Response::error($e->getMessage(), 500);
        }
    }
}
