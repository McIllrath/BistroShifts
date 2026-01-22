<?php
/**
 * Email Utility Functions
 */

class Email {
    /**
     * Send welcome email to new user
     */
    public static function sendWelcomeEmail($user) {
        // Placeholder - implement with your email service
        // For now, just log
        error_log("Welcome email would be sent to: " . $user['email']);
        return true;
    }
    
    /**
     * Send shift signup confirmation
     */
    public static function sendShiftSignupConfirmation($user, $shift) {
        // Placeholder - implement with your email service
        error_log("Shift signup confirmation would be sent to: " . $user['email'] . " for shift: " . $shift['title']);
        return true;
    }
    
    /**
     * Send password reset email
     */
    public static function sendPasswordResetEmail($email, $displayName, $resetUrl) {
        // Placeholder - implement with your email service
        error_log("Password reset email would be sent to: " . $email . " with URL: " . $resetUrl);
        return true;
    }
}
