export const getVerificationSuccessTemplate = (token: string, role: string, firstName: string, lastName: string, id: number) => `
<!DOCTYPE html>
<html>
<head>
    <title>Email Verified - AgriLink</title>
    <style>
        :root {
            --primary: #10b981;
            --primary-dark: #059669;
            --bg: #f9fafb;
            --text: #1f2937;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            color: var(--text);
        }
        .card {
            background: white;
            padding: 48px;
            border-radius: 24px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            text-align: center;
            max-width: 480px;
            width: 90%;
            border: 1px solid #f3f4f6;
        }
        .icon-circle {
            width: 80px;
            height: 80px;
            background: #ecfdf5;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 auto 24px;
            color: var(--primary);
            font-size: 40px;
        }
        h1 {
            color: #065f46;
            margin: 0 0 16px;
            font-size: 30px;
            font-weight: 800;
            letter-spacing: -0.025em;
        }
        p {
            font-size: 16px;
            line-height: 1.6;
            color: #4b5563;
            margin-bottom: 32px;
        }
        .btn {
            display: inline-block;
            background-color: var(--primary);
            color: white;
            padding: 16px 40px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);
            cursor: pointer;
            border: none;
            width: 100%;
            box-sizing: border-box;
        }
        .btn:hover {
            background-color: var(--primary-dark);
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4);
        }
        .btn:active {
            transform: translateY(0);
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-circle">✓</div>
        <h1>Email Verified!</h1>
        <p>Your account is now fully active. Click below to start your journey and explore the marketplace.</p>
        <button id="startBtn" class="btn">Start Your Journey</button>
    </div>

    <script>
        document.getElementById('startBtn').addEventListener('click', () => {
            localStorage.setItem('agrilink_token', '${token}');
            localStorage.setItem('agrilink_role', '${role}');
            localStorage.setItem('agrilink_firstName', '${firstName}');
            localStorage.setItem('agrilink_lastName', '${lastName}');
            localStorage.setItem('agrilink_id', '${id}');
            localStorage.setItem('agrilink_isLoggedIn', 'true');
            
            // Redirect based on role
            let target = '/profile';
            if ('${role}' === 'farmer') target = '/farmer/dashboard';
            else if ('${role}' === 'admin') target = '/admin/dashboard';
            else if ('${role}' === 'brgy_official') target = '/brgy/dashboard';
            else if ('${role}' === 'buyer') target = '/buyer/dashboard';
            
            window.location.href = 'http://localhost:5173' + target + '?welcome=true';
        });
    </script>
</body>
</html>
`;

export const getVerificationExpiredTemplate = () => `
<!DOCTYPE html>
<html>
<head>
    <title>Link Expired - AgriLink</title>
    <style>
        body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f9fafb; }
        .card { background: white; padding: 48px; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 90%; }
        h1 { color: #991b1b; margin-bottom: 16px; font-size: 24px; font-weight: 700; }
        p { color: #4b5563; line-height: 1.6; margin-bottom: 32px; font-size: 15px; }
        .btn { display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; transition: background 0.2s; border: none; width: 100%; }
        .btn:hover { background: #047857; }
    </style>
</head>
<body>
    <div class="card">
        <h1 style="font-size: 40px; margin-bottom: 8px;">⏳</h1>
        <h1>Link Expired</h1>
        <p>For security reasons, verification links expire after 10 minutes. Please return to the registration page to request a new one.</p>
        <a href="http://localhost:5173/register" class="btn">Return to Registration</a>
    </div>
</body>
</html>
`;
