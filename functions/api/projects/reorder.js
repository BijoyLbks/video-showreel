/**
 * Cloudflare Pages Function: /api/projects/reorder
 * Batch update order of projects in Cloudflare D1
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const authHeader = request.headers.get("Authorization");
  const expectedPin = env.ADMIN_PIN || "admin123";

  if (!authHeader || !authHeader.includes(expectedPin)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 Database 'DB' binding not found" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { order } = await request.json(); // array of project IDs in desired order
    if (Array.isArray(order)) {
      const statements = order.map((id, index) => 
        env.DB.prepare("UPDATE projects SET order_index = ? WHERE id = ?").bind(index + 1, id)
      );
      await env.DB.batch(statements);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
