export async function onRequestPost(context) {
  try {
    const secretPassword = context.env.ADMIN_PASSWORD; // Pulls the secret you set in Cloudflare
    
    if (!secretPassword) {
      return new Response(JSON.stringify({ success: false, error: "ADMIN_PASSWORD environment secret is not set in Cloudflare dashboard." }), { status: 500 });
    }

    const body = await context.request.json();
    const { action, password } = body;

    if (action === 'login') {
      if (password === secretPassword) {
        return new Response(JSON.stringify({ success: true, token: "cloud_admin_verified" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } else {
        return new Response(JSON.stringify({ success: false, error: "Incorrect password." }), { status: 401 });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
