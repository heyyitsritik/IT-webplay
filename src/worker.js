// IT-WebPlay Worker — serves static assets only, no database needed.
export default {
  async fetch(request, env) {
    return new Response('Not Found', { status: 404 });
  }
};
