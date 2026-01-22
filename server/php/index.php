<?php
/**
 * Main API Router
 * Routes requests to appropriate controllers
 */

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load all dependencies
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/jwt.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/utils/email.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/ShiftsController.php';
require_once __DIR__ . '/controllers/UsersController.php';
require_once __DIR__ . '/controllers/EventsController.php';
require_once __DIR__ . '/controllers/PasswordController.php';

// Parse request URI
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Remove query string
$requestUri = strtok($requestUri, '?');

// Remove base path if exists (adjust if PHP is in subfolder)
$basePath = '/api';
if (strpos($requestUri, $basePath) === 0) {
    $requestUri = substr($requestUri, strlen($basePath));
}

// Split path into segments
$segments = array_filter(explode('/', $requestUri));
$segments = array_values($segments);

// Serve built client assets (e.g. /assets/index-*.js or css)
if (isset($segments[0]) && $segments[0] === 'assets') {
    $assetPath = __DIR__ . '/client' . $requestUri;
    if (file_exists($assetPath) && is_file($assetPath)) {
        $ext = pathinfo($assetPath, PATHINFO_EXTENSION);
        $mime = [
            'js' => 'application/javascript',
            'css' => 'text/css',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'svg' => 'image/svg+xml',
            'html' => 'text/html'
        ][$ext] ?? 'application/octet-stream';
        header('Content-Type: ' . $mime);
        readfile($assetPath);
        exit;
    }
    Response::error('Not found', 404);
}

// If no segments (e.g. requesting "/"), serve the client SPA if available
if (count($segments) === 0) {
    $clientIndex = __DIR__ . '/client/index.html';
    if (!file_exists($clientIndex)) {
        // fallback to root index if client build is not mounted
        $clientIndex = __DIR__ . '/index.html';
    }
    if (file_exists($clientIndex)) {
        readfile($clientIndex);
        exit;
    }
    Response::error('Not found', 404);
}

// Health check
if ($requestUri === '/health' || $requestUri === '/api/health') {
    Response::json(['ok' => true]);
}

// Route to controllers
try {
    // Auth routes
    if (isset($segments[0]) && $segments[0] === 'auth') {
        $controller = new AuthController();
        
        if (isset($segments[1]) && $segments[1] === 'register' && $requestMethod === 'POST') {
            $controller->register();
        } elseif (isset($segments[1]) && $segments[1] === 'login' && $requestMethod === 'POST') {
            $controller->login();
        } elseif (isset($segments[1]) && $segments[1] === 'me' && $requestMethod === 'GET') {
            $controller->me();
        } else {
            Response::error('Not found', 404);
        }
    }
    // Password routes
    elseif (isset($segments[0]) && $segments[0] === 'password') {
        $controller = new PasswordController();
        
        if (isset($segments[1]) && $segments[1] === 'forgot-password' && $requestMethod === 'POST') {
            $controller->forgotPassword();
        } elseif (isset($segments[1]) && $segments[1] === 'reset' && $requestMethod === 'POST') {
            $controller->resetPassword();
        } elseif (isset($segments[1]) && $segments[1] === 'validate-token' && $requestMethod === 'GET') {
            $controller->validateToken();
        } else {
            Response::error('Not found', 404);
        }
    }
    // Shifts routes
    elseif (isset($segments[0]) && $segments[0] === 'shifts') {
        $controller = new ShiftsController();
        
        if (!isset($segments[1]) && $requestMethod === 'GET') {
            $controller->list();
        } elseif (!isset($segments[1]) && $requestMethod === 'POST') {
            $controller->create();
        } elseif (isset($segments[1]) && is_numeric($segments[1])) {
            $shiftId = (int)$segments[1];
            
            if (!isset($segments[2]) && $requestMethod === 'GET') {
                $controller->get($shiftId);
            } elseif (!isset($segments[2]) && $requestMethod === 'PUT') {
                $controller->update($shiftId);
            } elseif (!isset($segments[2]) && $requestMethod === 'DELETE') {
                $controller->delete($shiftId);
            } elseif ($segments[2] === 'signups' && $requestMethod === 'POST') {
                $controller->signup($shiftId);
            } elseif ($segments[2] === 'participants' && !isset($segments[3]) && $requestMethod === 'GET') {
                $controller->participants($shiftId);
            } elseif ($segments[2] === 'participants' && isset($segments[3]) && $requestMethod === 'DELETE') {
                $signupId = (int)$segments[3];
                $controller->removeParticipant($shiftId, $signupId);
            } else {
                Response::error('Not found', 404);
            }
        } else {
            Response::error('Not found', 404);
        }
    }
    // Users routes
    elseif (isset($segments[0]) && $segments[0] === 'users') {
        $controller = new UsersController();
        
        if (!isset($segments[1]) && $requestMethod === 'GET') {
            $controller->list();
        } elseif (!isset($segments[1]) && $requestMethod === 'POST') {
            $controller->create();
        } elseif (isset($segments[1]) && is_numeric($segments[1])) {
            $userId = (int)$segments[1];
            
            if (!isset($segments[2]) && $requestMethod === 'DELETE') {
                $controller->delete($userId);
            } elseif ($segments[2] === 'role' && $requestMethod === 'PATCH') {
                $controller->updateRole($userId);
            } else {
                Response::error('Not found', 404);
            }
        } else {
            Response::error('Not found', 404);
        }
    }
    // Events routes
    elseif (isset($segments[0]) && $segments[0] === 'events') {
        $controller = new EventsController();
        
        if (!isset($segments[1]) && $requestMethod === 'GET') {
            $controller->list();
        } elseif (!isset($segments[1]) && $requestMethod === 'POST') {
            $controller->create();
        } elseif (isset($segments[1]) && is_numeric($segments[1])) {
            $eventId = (int)$segments[1];
            
            if (!isset($segments[2]) && $requestMethod === 'GET') {
                $controller->get($eventId);
            } elseif (!isset($segments[2]) && $requestMethod === 'DELETE') {
                $controller->delete($eventId);
            } elseif ($segments[2] === 'status' && $requestMethod === 'PATCH') {
                $controller->updateStatus($eventId);
            } else {
                Response::error('Not found', 404);
            }
        } else {
            Response::error('Not found', 404);
        }
    }
    else {
        Response::error('Not found', 404);
    }
} catch (Exception $e) {
    error_log('API Error: ' . $e->getMessage());
    Response::error('Internal server error', 500);
}
