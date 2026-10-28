/**
 * Cloudflare Pages Function: /api/projects
 * Connects to Cloudflare D1 database (Binding: env.DB)
 */

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ 
      error: "D1 Database binding 'DB' not configured. Running in fallback mode." 
    }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM projects ORDER BY featured DESC, order_index ASC, created_at DESC"
    ).all();

    // Transform boolean featured and property names for frontend compatibility
    const formatted = (results || []).map(row => ({
      ...row,
      featured: Boolean(row.featured),
      order: row.order_index
    }));

    return new Response(JSON.stringify(formatted), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Simple token / pin verification
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
    const project = await request.json();
    if (!project.id || !project.title || !project.sourceUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields (id, title, sourceUrl)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // If setting as featured, un-feature others
    if (project.featured) {
      await env.DB.prepare("UPDATE projects SET featured = 0").run();
    }

    const query = `
      INSERT INTO projects (
        id, title, client, category, year, sourceType, sourceUrl, 
        embedUrl, thumbnailUrl, aspectRatio, featured, duration, role, description, order_index, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        client = excluded.client,
        category = excluded.category,
        year = excluded.year,
        sourceType = excluded.sourceType,
        sourceUrl = excluded.sourceUrl,
        embedUrl = excluded.embedUrl,
        thumbnailUrl = excluded.thumbnailUrl,
        aspectRatio = excluded.aspectRatio,
        featured = excluded.featured,
        duration = excluded.duration,
        role = excluded.role,
        description = excluded.description,
        order_index = excluded.order_index,
        updated_at = datetime('now')
    `;

    await env.DB.prepare(query).bind(
      project.id,
      project.title || '',
      project.client || '',
      project.category || 'Commercials',
      project.year || '',
      project.sourceType || 'youtube',
      project.sourceUrl || '',
      project.embedUrl || '',
      project.thumbnailUrl || '',
      project.aspectRatio || '16:9',
      project.featured ? 1 : 0,
      project.duration || '',
      project.role || '',
      project.description || '',
      project.order || 999
    ).run();

    return new Response(JSON.stringify({ success: true, project }), {
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

export async function onRequestDelete(context) {
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

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing project id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
    return new Response(JSON.stringify({ success: true, id }), {
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
