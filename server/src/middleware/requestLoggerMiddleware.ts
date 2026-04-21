import { Request, Response, NextFunction } from 'express';
import { writeLog } from '../services/systemLogService';
import { randomBytes } from 'crypto';

const SKIP_PATHS = ['/api/test', '/api/test-now', '/', '/api/logs'];
const SKIP_METHODS = ['OPTIONS'];

// Paths whose payloads contain sensitive data we should never log in full
const SENSITIVE_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/password'];

/**
 * Determines if a route should auto-log to system_logs.
 * Skip health checks, preflight, and the logs endpoint itself.
 */
const shouldLog = (req: Request): boolean => {
    if (SKIP_METHODS.includes(req.method)) return false;
    if (SKIP_PATHS.some(p => req.path === p || req.path.startsWith(p))) return false;
    // Only log state-changing requests and critical GETs (auth, users, etc.)
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const isCriticalGet = req.path.startsWith('/api/auth') || req.path.startsWith('/api/users');
    return isMutation || isCriticalGet;
};

const deriveModule = (path: string): string => {
    if (path.startsWith('/api/auth'))         return 'Authentication';
    if (path.startsWith('/api/users'))        return 'User Management';
    if (path.startsWith('/api/products'))     return 'Product Catalog';
    if (path.startsWith('/api/purchases'))    return 'Orders';
    if (path.startsWith('/api/messages'))     return 'Messaging';
    if (path.startsWith('/api/notifications')) return 'Notifications';
    if (path.startsWith('/api/badges'))       return 'Certification';
    if (path.startsWith('/api/favorites'))    return 'Favorites';
    if (path.startsWith('/api/reviews'))      return 'Reviews';
    if (path.startsWith('/api/phenotyping'))  return 'Phenotyping';
    return 'System';
};

const deriveEventType = (method: string, path: string): string => {
    if (path.includes('/login'))    return 'login';
    if (path.includes('/register')) return 'register';
    if (path.includes('/verify'))   return 'email_verify';
    if (path.includes('/status'))   return 'status_update';
    if (path.includes('/profile'))  return method === 'GET' ? 'profile_view' : 'profile_update';
    if (path.includes('/password')) return 'password_update';
    if (path.includes('/award'))    return 'badge_award';
    if (path.includes('/revoke'))   return 'badge_revoke';

    const m = method.toUpperCase();
    if (m === 'POST')   return 'create';
    if (m === 'PUT')    return 'update';
    if (m === 'PATCH')  return 'update';
    if (m === 'DELETE') return 'delete';
    return 'read';
};

const deriveSeverity = (statusCode: number): 'info' | 'success' | 'warning' | 'error' | 'critical' => {
    if (statusCode >= 500) return 'critical';
    if (statusCode >= 400) return 'warning';
    if (statusCode >= 200 && statusCode < 300) return 'info';
    return 'info';
};

const deriveCategory = (path: string, statusCode: number): 'User' | 'Security' | 'System' | 'Order' | 'Messaging' => {
    if (path.startsWith('/api/auth')) return 'Security';
    if (path.startsWith('/api/users') && statusCode >= 400) return 'Security';
    if (path.startsWith('/api/users')) return 'User';
    if (path.startsWith('/api/purchases')) return 'Order';
    if (path.startsWith('/api/messages')) return 'Messaging';
    if (path.startsWith('/api/badges')) return 'User';
    return 'System';
};

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (!shouldLog(req)) return next();

    const startMs = Date.now();
    const correlationId = randomBytes(6).toString('hex');

    // Attach correlation ID to request for downstream use
    (req as any).correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    const originalEnd = res.end.bind(res);

    (res.end as any) = function (chunk?: any, encoding?: any, callback?: any) {
        const durationMs = Date.now() - startMs;
        const statusCode = res.statusCode;
        const user = (req as any).user || {};
        const isSensitive = SENSITIVE_PATHS.some(p => req.path.startsWith(p));

        const userName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`.trim()
            : user.email || 'Anonymous';

        const actionLabel = `${req.method} ${req.path}`;
        const detail = isSensitive
            ? `[Sensitive endpoint — payload masked]`
            : `${req.method} ${req.path} → ${statusCode}`;

        let errorMessage: string | undefined;
        if (statusCode >= 400 && chunk) {
            try {
                const body = JSON.parse(chunk.toString());
                errorMessage = body?.message;
            } catch (_) {}
        }

        writeLog({
            correlation_id: correlationId,
            user_id:        user.id   ? Number(user.id) : undefined,
            user_name:      userName,
            user_role:      user.role || 'anonymous',
            action:         actionLabel,
            event_type:     deriveEventType(req.method, req.path),
            module:         deriveModule(req.path),
            detail,
            category:       deriveCategory(req.path, statusCode),
            severity:       deriveSeverity(statusCode),
            method:         req.method,
            endpoint:       req.path,
            http_status:    statusCode,
            error_message:  errorMessage,
            ip_address:     (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown',
            user_agent:     req.headers['user-agent'],
            duration_ms:    durationMs,
        });

        return originalEnd(chunk, encoding, callback);
    };

    next();
};
