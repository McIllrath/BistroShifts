<?php
/**
 * Password Controller
 * Handles password reset functionality
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/email.php';

class PasswordController {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * POST /api/password/forgot-password
     * Request password reset by email
     */
    public function forgotPassword() {
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? null;
        
        if (!$email) {
            Response::error('E-Mail ist erforderlich', 400);
            return;
        }
        
        try {
            // Find user by email
            $stmt = $this->db->prepare("SELECT id, display_name FROM users WHERE email = ? AND is_active = 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                // Don't reveal if email exists (security best practice)
                // But still return success
                Response::json(['message' => 'Wenn diese E-Mail existiert, erhalten Sie einen Reset-Link']);
                return;
            }
            
            // Generate secure reset token (32 bytes = 256 bits)
            $token = bin2hex(random_bytes(32));
            $expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 hour expiry
            
            $this->db->beginTransaction();
            
            // Invalidate previous reset tokens for this user
            $stmt = $this->db->prepare("UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0");
            $stmt->execute([$user['id']]);
            
            // Insert new reset token
            $stmt = $this->db->prepare("
                INSERT INTO password_reset_tokens (user_id, token, expires_at)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$user['id'], $token, $expiresAt]);
            
            // Audit log
            $stmt = $this->db->prepare("
                INSERT INTO audit_logs (action_type, entity_type, entity_id, payload)
                VALUES ('password_reset_request', 'user', ?, ?)
            ");
            $stmt->execute([$user['id'], json_encode(['email' => $email])]);
            
            $this->db->commit();
            
            // Send reset email
            $this->sendResetEmail($email, $user['display_name'], $token);
            
            Response::json(['message' => 'Wenn diese E-Mail existiert, erhalten Sie einen Reset-Link']);
        } catch (PDOException $e) {
            try {
                $this->db->rollBack();
            } catch (Exception $rollbackErr) {
                // ignore rollback errors
            }
            error_log('Password reset request error: ' . $e->getMessage());
            Response::error('Ein Fehler ist aufgetreten', 500);
        } catch (Exception $e) {
            error_log('Password reset request error (general): ' . $e->getMessage());
            Response::error('Ein Fehler ist aufgetreten', 500);
        }
    }
    
    /**
     * POST /api/password/reset
     * Reset password with valid token
     */
    public function resetPassword() {
        $data = json_decode(file_get_contents("php://input"), true);
        $token = $data['token'] ?? null;
        $newPassword = $data['password'] ?? null;
        
        if (!$token || !$newPassword) {
            Response::error('Token und Passwort sind erforderlich', 400);
            return;
        }
        
        if (strlen($newPassword) < 6) {
            Response::error('Passwort muss mindestens 6 Zeichen lang sein', 400);
            return;
        }
        
        try {
            // Find and validate token
            $stmt = $this->db->prepare("
                SELECT prt.user_id, prt.expires_at 
                FROM password_reset_tokens prt
                WHERE prt.token = ? AND prt.used = 0 AND prt.expires_at > NOW()
            ");
            $stmt->execute([$token]);
            $reset = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$reset) {
                Response::error('Ungültiger oder abgelaufener Reset-Link', 400);
                return;
            }
            
            $this->db->beginTransaction();
            
            // Update password
            $passwordHash = password_hash($newPassword, PASSWORD_BCRYPT);
            $stmt = $this->db->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
            $stmt->execute([$passwordHash, $reset['user_id']]);
            
            // Mark token as used
            $stmt = $this->db->prepare("UPDATE password_reset_tokens SET used = 1 WHERE token = ?");
            $stmt->execute([$token]);
            
            // Invalidate all other reset tokens for this user
            $stmt = $this->db->prepare("UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0");
            $stmt->execute([$reset['user_id']]);
            
            // Audit log
            $stmt = $this->db->prepare("
                INSERT INTO audit_logs (actor_id, action_type, entity_type, entity_id, payload)
                VALUES (?, 'password_reset_complete', 'user', ?, ?)
            ");
            $stmt->execute([$reset['user_id'], $reset['user_id'], json_encode(['ip' => $_SERVER['REMOTE_ADDR']])]);
            
            $this->db->commit();
            
            Response::json(['message' => 'Passwort erfolgreich zurückgesetzt']);
        } catch (PDOException $e) {
            try {
                $this->db->rollBack();
            } catch (Exception $rollbackErr) {
                // ignore rollback errors
            }
            error_log('Password reset error: ' . $e->getMessage());
            Response::error('Ein Fehler ist aufgetreten', 500);
        } catch (Exception $e) {
            error_log('Password reset error (general): ' . $e->getMessage());
            Response::error('Ein Fehler ist aufgetreten', 500);
        }
    }
    
    /**
     * GET /api/password/validate-token?token=xxx
     * Validate if a reset token is still valid
     */
    public function validateToken() {
        $token = $_GET['token'] ?? null;
        
        if (!$token) {
            Response::error('Token ist erforderlich', 400);
            return;
        }
        
        try {
            $stmt = $this->db->prepare("
                SELECT prt.id
                FROM password_reset_tokens prt
                WHERE prt.token = ? AND prt.used = 0 AND prt.expires_at > NOW()
            ");
            $stmt->execute([$token]);
            $reset = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$reset) {
                Response::error('Ungültiger oder abgelaufener Token', 400);
                return;
            }
            
            Response::json(['valid' => true, 'message' => 'Token ist gültig']);
        } catch (PDOException $e) {
            error_log('Token validation error: ' . $e->getMessage());
            Response::error('Ein Fehler ist aufgetreten', 500);
        } catch (Exception $e) {
            error_log('Token validation error (general): ' . $e->getMessage());
            Response::error('Ein Fehler ist aufgetreten', 500);
        }
    }
    
    /**
     * Send password reset email
     */
    private function sendResetEmail($email, $displayName, $token) {
        // Get reset link from environment or construct from request
        $baseUrl = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $baseUrl .= '://' . $_SERVER['HTTP_HOST'];
        $resetUrl = $baseUrl . '/password-reset?token=' . $token;
        
        // Use Email class static method
        Email::sendPasswordResetEmail($email, $displayName, $resetUrl);
    }
}
