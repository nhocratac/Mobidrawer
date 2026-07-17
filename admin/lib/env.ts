// Central env module: every NEXT_PUBLIC_* read for the admin app goes
// through here. Localhost dev defaults are ALLOWED (client precedent,
// client/utils/environment.ts) so `npm run build` succeeds with no .env
// present on the gate machine. No secret of any kind lives here.
const env = {
  NEXT_PUBLIC_BACKEND_URL:
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080/api/v1",
};

export default env;
