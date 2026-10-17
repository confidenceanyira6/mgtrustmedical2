# M.G TRUST MEDICAL

Health • Care • Trust — mobile-first medical centre app (React + Vite + Supabase).

## Run

```bash
npm install
cp .env.example .env   # add your Supabase URL + publishable key
npm run dev
```

Set the same two variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in your hosting provider.

## Supabase settings

- Authentication → URL Configuration: add your site URL and `http://localhost:5173` to **Redirect URLs** (needed for password reset and email confirmation).
- Patients sign up in the app. Staff accounts are created by an admin in Supabase (the first account created without `account_type: patient` becomes the admin).

## Structure

- `src/pages/Auth.jsx` — splash, login, sign up, forgot/reset password
- `src/patient/*` — patient app (home, lab services, booking, appointments, results/reports, messages, profile, notifications, bills)
- `src/staff/*` — staff app (patients, services, products)
