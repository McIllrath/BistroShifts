<?php
/**
 * Events Controller
 * Handles event proposals and management
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/email.php';

class EventsController {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * POST /api/events - create event proposal (authenticated user)
     */
    public function create() {
        $authUser = AuthMiddleware::requireAuth();
        $data = json_decode(file_get_contents("php://input"), true);
        
        $title = $data['title'] ?? null;
        $description = $data['description'] ?? null;
        $members_only = isset($data['members_only']) ? ($data['members_only'] ? 1 : 0) : 0;
        $start_time = $data['start_time'] ?? null;
        $end_time = $data['end_time'] ?? null;
        
        if (!$title || !$start_time || !$end_time) {
            Response::error('title, start_time und end_time sind erforderlich', 400);
        }
        
        try {
            $this->db->beginTransaction();
            
            $stmt = $this->db->prepare("
                INSERT INTO events (title, description, members_only, start_time, end_time, created_by, status, is_active)
                VALUES (?, ?, ?, ?, ?, ?, 'pending', 1)
            ");
            $stmt->execute([
                $title,
                $description,
                $members_only,
                date('Y-m-d H:i:s', strtotime($start_time)),
                date('Y-m-d H:i:s', strtotime($end_time)),
                $authUser['userId']
            ]);
            
            $eventId = $this->db->lastInsertId();
            
            // Audit log
            $stmt = $this->db->prepare("
                INSERT INTO audit_logs (actor_id, action_type, entity_type, entity_id, payload)
                VALUES (?, 'event_create', 'event', ?, ?)
            ");
            $stmt->execute([
                $authUser['userId'],
                $eventId,
                json_encode(['title' => $title])
            ]);
            
            $this->db->commit();
            
            // Notify admins (non-blocking)
            // Placeholder for actual email implementation
            
            Response::json(['event' => ['id' => (int)$eventId, 'title' => $title, 'status' => 'pending']]);
        } catch (PDOException $e) {
            try {
                $this->db->rollBack();
            } catch (Exception $rollbackErr) {
                // ignore rollback errors
            }
            error_log('Event creation error: ' . $e->getMessage());
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * GET /api/events - list events
     */
    public function list() {
        try {
            // Check optional authentication
            $authUser = null;
            try {
                $authUser = AuthMiddleware::authenticate();
            } catch (Exception $e) {
                // Not authenticated, continue as public
            }
            
            $sql = "
                SELECT e.*, u.display_name as creator_name, u.email as creator_email
                FROM events e
                LEFT JOIN users u ON e.created_by = u.id
                WHERE e.is_active = 1
            ";
            
            if (!$authUser) {
                // Public: only approved events
                $sql .= " AND e.status = 'approved'";
            } elseif (!isset($authUser['role']) || $authUser['role'] !== 'admin') {
                // User: approved or own events
                $sql .= " AND (e.status = 'approved' OR e.created_by = ?)";
            }
            // Admin sees all
            
            $sql .= " ORDER BY e.start_time ASC";
            
            if (!$authUser || (isset($authUser['role']) && $authUser['role'] !== 'admin')) {
                if (isset($authUser['userId'])) {
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute([$authUser['userId']]);
                } else {
                    $stmt = $this->db->query($sql);
                }
            } else {
                $stmt = $this->db->query($sql);
            }
            
            $events = $stmt->fetchAll();
            Response::json(['events' => $events]);
        } catch (PDOException $e) {
            Response::error('Event-Liste konnte nicht geladen werden', 500);
        }
    }
    
    /**
     * GET /api/events/:id - get event details
     */
    public function get($id) {
        $authUser = AuthMiddleware::requireAuth();
        
        try {
            $stmt = $this->db->prepare("
                SELECT e.*, u.display_name as creator_name, u.email as creator_email
                FROM events e
                LEFT JOIN users u ON e.created_by = u.id
                WHERE e.id = ?
            ");
            $stmt->execute([$id]);
            $event = $stmt->fetch();
            
            if (!$event) {
                Response::error('Event nicht gefunden', 404);
            }
            
            // Check permissions
            if ($event['status'] !== 'approved' && 
                $authUser['userId'] != $event['created_by'] && 
                (!isset($authUser['role']) || $authUser['role'] !== 'admin')) {
                Response::error('Keine Berechtigung', 403);
            }
            
            Response::json(['event' => $event]);
        } catch (PDOException $e) {
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * PATCH /api/events/:id/status - approve/reject event (admin)
     */
    public function updateStatus($id) {
        $authUser = AuthMiddleware::requireRole('admin');
        $data = json_decode(file_get_contents("php://input"), true);
        
        $status = $data['status'] ?? null;
        
        if (!in_array($status, ['approved', 'rejected'])) {
            Response::error('invalid status', 400);
        }
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM events WHERE id = ?");
            $stmt->execute([$id]);
            $event = $stmt->fetch();
            
            if (!$event) {
                Response::error('Event nicht gefunden', 404);
            }
            
            $this->db->beginTransaction();
            
            $stmt = $this->db->prepare("UPDATE events SET status = ? WHERE id = ?");
            $stmt->execute([$status, $id]);
            
            // Audit log
            $stmt = $this->db->prepare("
                INSERT INTO audit_logs (actor_id, action_type, entity_type, entity_id, payload)
                VALUES (?, 'event_status_update', 'event', ?, ?)
            ");
            $stmt->execute([
                $authUser['userId'],
                $id,
                json_encode(['before' => $event['status'], 'after' => $status])
            ]);
            
            $this->db->commit();
            
            Response::json(['event' => ['id' => (int)$id, 'status' => $status]]);
        } catch (PDOException $e) {
            $this->db->rollBack();
            Response::error($e->getMessage(), 500);
        }
    }
    
    /**
     * DELETE /api/events/:id - delete event (admin or creator)
     */
    public function delete($id) {
        $authUser = AuthMiddleware::requireAuth();
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM events WHERE id = ?");
            $stmt->execute([$id]);
            $event = $stmt->fetch();
            
            if (!$event) {
                Response::error('Event nicht gefunden', 404);
            }
            
            // Only creator or admin can delete
            if ($authUser['userId'] != $event['created_by'] && 
                (!isset($authUser['role']) || $authUser['role'] !== 'admin')) {
                Response::error('Keine Berechtigung', 403);
            }
            
            $stmt = $this->db->prepare("UPDATE events SET is_active = 0 WHERE id = ?");
            $stmt->execute([$id]);
            
            http_response_code(204);
            exit;
        } catch (PDOException $e) {
            Response::error($e->getMessage(), 500);
        }
    }
}
