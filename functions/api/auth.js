/**
 * Cloudflare Pages Function: /api/auth
 * Simple admin verification
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const expectedPin = env.ADMIN_PIN || "admin123";

  try {
    const { pin } = await request.json();

    if (pin && pin === expectedPin) {
      // In production you can also sign a lightweight JWT or HMAC token.
      const token = `aura-auth-${expectedPin}-${Date.now()}`;
      return new Response(JSON.stringify({ success: true, token }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid PIN" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
