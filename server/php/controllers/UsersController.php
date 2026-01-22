<?php
/**
 * Users Controller
 * Handles user management (admin only)
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/response.php';

class UsersController {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * GET /api/users - list all users (admin)
     */
    public function list() {
        $authUser = AuthMiddleware::requireRole('admin');
        
        try {
            $stmt = $this->db->query("
                SELECT id, email, display_name, role, is_active 
                FROM users 
                ORDER BY id ASC
            ");
            
            $users = $stmt->fetchAll();
            Response::json(['users' => $users]);
        } catch (PDOException $e) {
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * POST /api/users - create user (admin)
     */
    public function create() {
        $authUser = AuthMiddleware::requireRole('admin');
        $data = json_decode(file_get_contents("php://input"), true);
        
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $display_name = $data['display_name'] ?? null;
        $role = $data['role'] ?? 'user';
        
        if (!$email) {
            Response::error('email required', 400);
        }
        
        if (!in_array($role, ['user', 'admin'])) {
            Response::error('invalid role', 400);
        }
        
        try {
            // Check if email exists
            $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                Response::error('email already exists', 400);
            }
            
            $this->db->beginTransaction();
            
            $password_hash = $password ? password_hash($password, PASSWORD_BCRYPT) : null;
            
            $stmt = $this->db->prepare("
                INSERT INTO users (email, password_hash, display_name, role, is_active)
                VALUES (?, ?, ?, ?, 1)
            ");
            $stmt->execute([$email, $password_hash, $display_name, $role]);
            
            $userId = $this->db->lastInsertId();
            
            // Audit log
            $stmt = $this->db->prepare("
                INSERT INTO audit_logs (actor_id, action_type, entity_type, entity_id, payload)
                VALUES (?, 'create_user', 'user', ?, ?)
            ");
            $stmt->execute([
                $authUser['userId'],
                $userId,
                json_encode(['email' => $email, 'display_name' => $display_name, 'role' => $role])
            ]);
            
            $this->db->commit();
            
            Response::json([
                'user' => [
                    'id' => (int)$userId,
                    'email' => $email,
                    'display_name' => $display_name,
                    'role' => $role
                ]
            ], 201);
        } catch (PDOException $e) {
            $this->db->rollBack();
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * DELETE /api/users/:id - delete user (admin)
     */
    public function delete($id) {
        $authUser = AuthMiddleware::requireRole('admin');
        
        if (!$id) {
            Response::error('invalid id', 400);
        }
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $existing = $stmt->fetch();
            
            if (!$existing) {
                Response::error('user not found', 404);
            }
            
            // Prevent self-deletion
            if ($authUser['userId'] == $id) {
                Response::error('cannot delete yourself', 400);
            }
            
            $this->db->beginTransaction();
            
            $stmt = $this->db->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);
            
            // Audit log
            $stmt = $this->db->prepare("
                INSERT INTO audit_logs (actor_id, action_type, entity_type, entity_id, payload)
                VALUES (?, 'delete_user', 'user', ?, ?)
            ");
            $stmt->execute([
                $authUser['userId'],
                $id,
                json_encode(['email' => $existing['email'], 'display_name' => $existing['display_name'], 'role' => $existing['role']])
            ]);
            
            $this->db->commit();
            
            Response::json(['ok' => true]);
        } catch (PDOException $e) {
            $this->db->rollBack();
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * PATCH /api/users/:id/role - update user role (admin)
     */
    public function updateRole($id) {
        $authUser = AuthMiddleware::requireRole('admin');
        $data = json_decode(file_get_contents("php://input"), true);
        
        $role = $data['role'] ?? null;
        
        if (!$id || !in_array($role, ['user', 'admin'])) {
            Response::error('invalid request', 400);
        }
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $existing = $stmt->fetch();
            
            if (!$existing) {
                Response::error('user not found', 404);
            }
            
            $this->db->beginTransaction();
            
            $stmt = $this->db->prepare("UPDATE users SET role = ? WHERE id = ?");
            $stmt->execute([$role, $id]);
            
            // Audit log
            $stmt = $this->db->prepare("
                INSERT INTO audit_logs (actor_id, action_type, entity_type, entity_id, payload)
                VALUES (?, 'update_role', 'user', ?, ?)
            ");
            $stmt->execute([
                $authUser['userId'],
                $id,
                json_encode(['before' => $existing['role'], 'after' => $role])
            ]);
            
            $this->db->commit();
            
            $stmt = $this->db->prepare("SELECT id, email, display_name, role FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $updated = $stmt->fetch();
            
            Response::json(['user' => $updated]);
        } catch (PDOException $e) {
            $this->db->rollBack();
            Response::error($e->getMessage(), 500);
        }
    }
}
