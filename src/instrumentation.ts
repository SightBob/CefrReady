export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.server.config');
  }

  // SECURITY: refuse to start the server in production with a weak JWT secret.
  // NextAuth signs the session JWT with NEXTAUTH_SECRET — a short/guessable
  // value lets anyone forge a session as any user (including the admin)
  // without going through OAuth. A 32-char minimum matches the output of
  // `openssl rand -base64 32` and rules out human-chosen phrases.
  //
  // `register()` runs once at server-runtime startup in both the Node and Edge
  // runtimes, but NOT during `next build` — so this guard cannot trip the build
  // while still failing fast at boot when the secret is missing or too short.
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32)
  ) {
    throw new Error(
      'NEXTAUTH_SECRET must be set to a random 32+ character value in production. ' +
        'Generate one with: openssl rand -base64 32'
    );
  }
}
