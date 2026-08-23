export async function onRequestGet(context) {
  try {
    const kv = context.env.MASJID_KV;
    if (!kv) {
      return new Response(JSON.stringify({ error: "KV Namespace binding 'MASJID_KV' is missing." }), { status: 500 });
    }

    let data = await kv.get("live_board_data", "json");
    if (!data) {
      data = { autoApi: true, iqamaOffset: 10, hijriOffset: 0 };
    }

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const kv = context.env.MASJID_KV;
    const secretPassword = context.env.ADMIN_PASSWORD; // Secure Cloudflare Secret Variable

    if (!kv) {
      return new Response(JSON.stringify({ error: "KV Namespace binding 'MASJID_KV' is missing." }), { status: 500 });
    }

    const body = await context.request.json();
    const { action, password, data } = body;

    // Secure server-side check against your secret variable
    if (!password || password !== secretPassword) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized password" }), { status: 401 });
    }

    if (action === 'login') {
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === 'save') {
      await kv.put("live_board_data", JSON.stringify(data));
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
        }
