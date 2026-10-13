"""Start the compiled, loopback-only analytics preview; never load production env files."""
from pathlib import Path
import os, socket, subprocess, time, urllib.request
root = Path(__file__).resolve().parents[1]
runtime = root.parent
cluster = runtime / 'linkwe-admin-analytics-local-db'
if not (root / '.next/BUILD_ID').exists():
    raise SystemExit('Build the local analytics preview first; see docs/admin-analytics-hub.md.')
if not (cluster / 'PG_VERSION').exists():
    raise SystemExit('Initialize the disposable analytics database first; see docs/admin-analytics-hub.md.')
with socket.socket() as check:
    if check.connect_ex(('127.0.0.1', 3159)) == 0:
        raise SystemExit('Port 3159 is already in use. Inspect the existing preview before starting another.')
status = subprocess.run(['pg_ctl', '-D', str(cluster), 'status'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
if status.returncode:
    subprocess.run(['pg_ctl', '-D', str(cluster), '-l', str(runtime / 'linkwe-admin-analytics-pg.log'), '-o', '-h 127.0.0.1 -p 55440 -k /tmp', '-w', 'start'], check=True)
env = dict(os.environ)
# This review preview must never spend model credits.
env.pop("ANTHROPIC_API_KEY", None)
# Fixture review never connects the private workbook through inherited credentials.
for name in list(env):
    if name.startswith("LINKWE_ANALYTICS_") or name in ("VERCEL_OIDC_TOKEN", "VERCEL_OIDC_TOKEN_FILE"):
        env.pop(name, None)
env.update(DATABASE_URL='postgresql://kylescott@127.0.0.1:55440/linkwe_analytics_test', DIRECT_URL='postgresql://kylescott@127.0.0.1:55440/linkwe_analytics_test', AUTH_SECRET='local-analytics-review-only-not-a-production-secret', RESEND_API_KEY='re_local_build_placeholder', VERCEL_ENV='preview', NEXT_TELEMETRY_DISABLED='1')
with (runtime / 'linkwe-admin-analytics-server.log').open('ab', buffering=0) as log:
    child = subprocess.Popen(['node', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3159'], cwd=root, env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
(runtime / 'linkwe-admin-analytics-preview.pid').write_text(str(child.pid))
for _ in range(40):
    if child.poll() is not None:
        raise SystemExit('Preview exited. Check the local server log.')
    try:
        with urllib.request.urlopen('http://127.0.0.1:3159/login', timeout=2) as response:
            if response.status == 200:
                print('Local demo ready: http://127.0.0.1:3159/dashboard/admin/analytics')
                break
    except OSError:
        time.sleep(.5)
else:
    raise SystemExit('Preview did not become ready; inspect the recorded process before retrying.')
