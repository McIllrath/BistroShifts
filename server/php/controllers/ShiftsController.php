<?php
/**
 * Shifts Controller
 * Handles shift management and signups
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/email.php';

class ShiftsController {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * GET /api/shifts - public list of active shifts
     */
    public function list() {
        try {
            $stmt = $this->db->query("
                SELECT s.*, 
                (SELECT COUNT(*) FROM signups WHERE shift_id = s.id AND status = 'registered') as registered_count
                FROM shifts s 
                WHERE is_active = 1 
                ORDER BY start_time ASC
            ");
            
            $items = $stmt->fetchAll();
            
            // Convert to proper types
            foreach ($items as &$item) {
                $item['registered_count'] = (int)$item['registered_count'];
                $item['capacity'] = (int)$item['capacity'];
                $item['id'] = (int)$item['id'];
            }
            
            Response::json(['items' => $items]);
        } catch (PDOException $e) {
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * GET /api/shifts/:id - shift detail
     */
    public function get($id) {
        try {
            $stmt = $this->db->prepare("SELECT * FROM shifts WHERE id = ?");
            $stmt->execute([$id]);
            $shift = $stmt->fetch();
            
            if (!$shift) {
                Response::error('not found', 404);
            }
            
            $stmt = $this->db->prepare("SELECT COUNT(*) as cnt FROM signups WHERE shift_id = ? AND status = 'registered'");
            $stmt->execute([$id]);
            $result = $stmt->fetch();
            $shift['registered_count'] = (int)$result['cnt'];
            
            Response::json(['shift' => $shift]);
        } catch (PDOException $e) {
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * POST /api/shifts/:id/signups - create signup
     */
    public function signup($id) {
        $authUser = AuthMiddleware::requireAuth();
        $userId = $authUser['userId'];
        
        try {
            // Check if shift exists and is active
            $stmt = $this->db->prepare("SELECT * FROM shifts WHERE id = ? AND is_active = 1");
            $stmt->execute([$id]);
            $shift = $stmt->fetch();
            
            if (!$shift) {
                Response::error('shift not found', 404);
            }
            
            // Atomic insert - only if room available
            $stmt = $this->db->prepare("
                INSERT INTO signups (shift_id, user_id, status)
                SELECT ?, ?, 'registered'
                WHERE (SELECT COUNT(*) FROM signups WHERE shift_id = ? AND status = 'registered') < 
                      (SELECT capacity FROM shifts WHERE id = ? AND is_active = 1)
            ");
            
            $stmt->execute([$id, $userId, $id, $id]);
            
            if ($stmt->rowCount() === 0) {
                Response::error('shift full or already signed up', 409);
            }
            
            $insertId = $this->db->lastInsertId();
            
            // Get user for email
            $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            
            // Send confirmation email
            Email::sendShiftSignupConfirmation($user, $shift);
            
            Response::json([
                'id' => $insertId,
                'shift_id' => (int)$id,
                'user_id' => $userId
            ], 201);
            
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) { // Duplicate entry
                Response::error('already signed up or constraint violation', 409);
            }
            error_log('signup error: ' . $e->getMessage());
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * POST /api/shifts - create shift (admin)
     */
    public function create() {
        $authUser = AuthMiddleware::requireRole('admin');
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validate required fields
        if (!isset($data['title']) || !isset($data['start_time']) || !isset($data['end_time']) || !isset($data['capacity'])) {
            Response::error('validation error: title, start_time, end_time, and capacity are required', 400);
        }
        
        try {
            $stmt = $this->db->prepare("
                INSERT INTO shifts (title, description, start_time, end_time, location, capacity, event_id, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['title'],
                $data['description'] ?? null,
                $data['start_time'],
                $data['end_time'],
                $data['location'] ?? null,
                $data['capacity'],
                $data['event_id'] ?? null,
                $authUser['userId']
            ]);
            
            $insertId = $this->db->lastInsertId();
            
            $stmt = $this->db->prepare("SELECT * FROM shifts WHERE id = ?");
            $stmt->execute([$insertId]);
            $newShift = $stmt->fetch();
            
            Response::json(['shift' => $newShift], 201);
        } catch (PDOException $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * PUT /api/shifts/:id - update shift (admin)
     */
    public function update($id) {
        $authUser = AuthMiddleware::requireRole('admin');
        $data = json_decode(file_get_contents("php://input"), true);
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM shifts WHERE id = ?");
            $stmt->execute([$id]);
            $shift = $stmt->fetch();
            
            if (!$shift) {
                Response::error('not found', 404);
            }
            
            // Prepare update fields
            $updates = [];
            $params = [];
            
            if (isset($data['title'])) {
                $updates[] = "title = ?";
                $params[] = $data['title'];
            }
            if (isset($data['description'])) {
                $updates[] = "description = ?";
                $params[] = $data['description'];
            }
            if (isset($data['start_time'])) {
                $updates[] = "start_time = ?";
                $params[] = $data['start_time'];
            }
            if (isset($data['end_time'])) {
                $updates[] = "end_time = ?";
                $params[] = $data['end_time'];
            }
            if (isset($data['location'])) {
                $updates[] = "location = ?";
                $params[] = $data['location'];
            }
            if (isset($data['capacity'])) {
                $updates[] = "capacity = ?";
                $params[] = $data['capacity'];
            }
            if (isset($data['is_active'])) {
                $updates[] = "is_active = ?";
                $params[] = $data['is_active'] ? 1 : 0;
            }
            
            if (empty($updates)) {
                Response::error('no fields to update', 400);
            }
            
            $params[] = $id;
            $sql = "UPDATE shifts SET " . implode(', ', $updates) . " WHERE id = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            $stmt = $this->db->prepare("SELECT * FROM shifts WHERE id = ?");
            $stmt->execute([$id]);
            $updatedShift = $stmt->fetch();
            
            Response::json(['shift' => $updatedShift]);
        } catch (PDOException $e) {
            Response::error($e->getMessage(), 400);
        }
    }
    
    /**
     * DELETE /api/shifts/:id - soft delete shift (admin)
     */
    public function delete($id) {
        $authUser = AuthMiddleware::requireRole('admin');
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM shifts WHERE id = ?");
            $stmt->execute([$id]);
            $shift = $stmt->fetch();
            
            if (!$shift) {
                Response::error('not found', 404);
            }
            
            $stmt = $this->db->prepare("UPDATE shifts SET is_active = 0 WHERE id = ?");
            $stmt->execute([$id]);
            
            http_response_code(204);
            exit;
        } catch (PDOException $e) {
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * GET /api/shifts/:id/participants - list participants (admin)
     */
    public function participants($id) {
        $authUser = AuthMiddleware::requireRole('admin');
        
        try {
            $stmt = $this->db->prepare("
                SELECT s.id as signup_id, s.shift_id, u.id as user_id, u.email, u.display_name, s.status, s.created_at
                FROM signups s
                JOIN users u ON s.user_id = u.id
                WHERE s.shift_id = ?
                ORDER BY s.created_at ASC
            ");
            $stmt->execute([$id]);
            $participants = $stmt->fetchAll();
            
            Response::json(['participants' => $participants]);
        } catch (PDOException $e) {
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * DELETE /api/shifts/:id/participants/:signupId - remove participant (admin)
     */
    public function removeParticipant($id, $signupId) {
        $authUser = AuthMiddleware::requireRole('admin');
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM signups WHERE id = ? AND shift_id = ?");
            $stmt->execute([$signupId, $id]);
            $signup = $stmt->fetch();
            
            if (!$signup) {
                Response::error('signup not found', 404);
            }
            
            // Mark as cancelled
            $stmt = $this->db->prepare("UPDATE signups SET status = 'cancelled' WHERE id = ?");
            $stmt->execute([$signupId]);
            
            // Record audit log
            try {
                $stmt = $this->db->prepare("
                    INSERT INTO audit_logs (actor_id, action_type, entity_type, entity_id, payload)
                    VALUES (?, 'remove_signup', 'signup', ?, ?)
                ");
                $stmt->execute([
                    $authUser['userId'],
                    $signupId,
                    json_encode(['shift_id' => $id, 'user_id' => $signup['user_id']])
                ]);
            } catch (PDOException $e) {
                error_log('Failed to write audit log: ' . $e->getMessage());
            }
            
            http_response_code(204);
            exit;
        } catch (PDOException $e) {
            Response::error($e->getMessage(), 500);
        }
    }
}
