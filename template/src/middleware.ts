// // _middleware.js
import { NextRequest, NextResponse } from 'next/server';

async function verifyJwt(token: string, secret: string) {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid token');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode base64 URL to Uint8Array
    const signature = decodeBase64Url(signatureB64);

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
        "raw", // key format
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
    );

    // Verify the JWT
    const valid = await crypto.subtle.verify(
        "HMAC",
        cryptoKey,
        signature, // Must be Uint8Array
        encoder.encode(headerB64 + "." + payloadB64) // Signed data
    );

    return valid;
}

// Helper function to decode Base64 URL
function decodeBase64Url(base64Url: string) {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}


function _base64UrlToArrayBuffer(base64Url) {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function redirectToLogin(req: NextRequest, reason: string) {
    const url = req.nextUrl.clone();
    url.searchParams.set('returnTo', url.pathname);
    url.searchParams.set('reason', reason);
    url.pathname = '/login';
    return NextResponse.redirect(url);
}

export async function middleware(req) {
    // Define the paths that don't require authentication

    const authRequired = process.env.JWT_REQUIRED === 'true';

    // If authentication is not required, allow all requests to proceed
    if (!authRequired) {
        return NextResponse.next();
    }

    const publicPaths = ['/login', '/api/login'];
    const { pathname } = req.nextUrl;

    // Check if the path is public
    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

    // Allow the request for public paths
    if (isPublicPath) {
        return NextResponse.next();
    }

    // Extract the auth_token cookie
    const token = req.cookies.get('auth_token');
    if (token === undefined) {
        return redirectToLogin(req, 'loggedOut');
        // If the token is valid, proceed with the request
    }
    try {
        // Verify the token
        const decoded = await verifyJwt(token.value, process.env.JWT_KEY || 'DefaultJWTKey');
        if (!decoded) {
            return redirectToLogin(req, 'jwtInvalid');
        }
    } catch (error) {
        console.log(error);
        return redirectToLogin(req, 'jwtError');
    }
}
export const config = {
    matcher: ['/', '/((?!login|_next/static|_next/image|auth|favicon.ico|robots.txt|images|$).*)']
};
