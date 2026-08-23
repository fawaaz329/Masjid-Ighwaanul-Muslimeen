export async function onRequestPost(context) {
  try {
    const secretPassword = context.env.ADMIN_PASSWORD; // Pulls the secret you set in Cloudflare dashboard
    if (!secretPassword) {
      return new Response(JSON.stringify({ authenticated: false, error: "ADMIN_PASSWORD secret is not configured in Cloudflare." }), { status: 500 });
    }

    const body = await context.request.json();
    const { password } = body;

    if (password === secretPassword) {
      return new Response(JSON.stringify({ authenticated: true, success: true }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } else {
      return new Response(JSON.stringify({ authenticated: false, success: false, error: "Incorrect password." }), { status: 401 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPut(context) {
  try {
    const body = await context.request.json();
    // Credential updates handled via Cloudflare secret variables
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
