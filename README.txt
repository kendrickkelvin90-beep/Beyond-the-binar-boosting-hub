BEYOND THE BINARY BOOST HUB

This is the standalone static website. It connects directly to the existing Supabase project.
Upload index.html, style.css and app.js to your Hostinger public_html folder.

Supabase project: jpnwqoghmxpheotlstxx

IMPORTANT ADMIN SETUP:
1. Register your own account on the site.
2. In Supabase SQL Editor, run:
   UPDATE public.users SET role='admin' WHERE email='YOUR_EMAIL_HERE';
3. Sign out and sign in again.

The app uses Supabase Auth and the publishable key only. Never add a Supabase service-role key to these files.
