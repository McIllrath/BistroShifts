<?php
/**
 * HTTP Response Helper Functions
 */

class Response {
    public static function json($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
    
    public static function error($message, $statusCode = 400, $details = null) {
        $response = ['error' => $message];
        if ($details !== null) {
            $response['details'] = $details;
        }
        self::json($response, $statusCode);
    }
    
    public static function success($data = null, $statusCode = 200) {
        if ($data === null) {
            $data = ['success' => true];
        }
        self::json($data, $statusCode);
    }
}
