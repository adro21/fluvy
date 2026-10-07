#!/usr/bin/env node
/**
 * Talks to the owner's own Home Assistant over its API, so a release can be installed from here without clicking
 * through HACS. Dev tool only: nothing of this ships in the integration.
 *
 *   node tools/dev/ha.mjs status                   Home Assistant's version, what HACS has of Fluvy, what is loaded
 *   node tools/dev/ha.mjs refresh                  make HACS look at the fork's releases again (after a new one)
 *   node tools/dev/ha.mjs download v1.5.2          HACS downloads that release of the fork
 *   node tools/dev/ha.mjs restart                  restart Home Assistant (waits until it answers again)
 *   node tools/dev/ha.mjs add                      add the Fluvy integration when it is missing (after a removal)
 *   node tools/dev/ha.mjs ws '{"type":"..."}'      any WebSocket command, for looking around
 *
 * Credentials come from ~/.config/fluvy/ha.env (HA_URL=http://… and HA_TOKEN=… on two lines, the file readable
 * by the owner only) or from the environment. The token never goes anywhere else.
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const REPOSITORY = 'adro21/fluvy';

async function credentials() {
  const env = { ...process.env };
  if (!env.HA_URL || !env.HA_TOKEN) {
    const text = await readFile(join(homedir(), '.config', 'fluvy', 'ha.env'), 'utf8').catch(
      () => '',
    );
    for (const line of text.split('\n')) {
      const m = /^\s*(HA_URL|HA_TOKEN)\s*=\s*(.+?)\s*$/.exec(line);
      if (m && !env[m[1]]) env[m[1]] = m[2];
    }
  }
  if (!env.HA_URL || !env.HA_TOKEN)
    throw new Error('no HA_URL / HA_TOKEN: put them in ~/.config/fluvy/ha.env');
  return { url: env.HA_URL.replace(/\/$/, ''), token: env.HA_TOKEN };
}

async function rest(method, path, body) {
  const { url, token } = await credentials();
  const response = await fetch(`${url}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: globalThis.AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

/** One WebSocket command; resolves with its result, rejects with its error. */
async function ws(message, { timeout = 120_000 } = {}) {
  const { url, token } = await credentials();
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${url.replace(/^http/, 'ws')}/api/websocket`);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error(`${message.type}: no answer in ${timeout / 1000} s`));
    }, timeout);
    socket.onerror = () => reject(new Error(`${message.type}: the socket failed`));
    socket.onmessage = (event) => {
      const m = JSON.parse(event.data);
      if (m.type === 'auth_required')
        socket.send(JSON.stringify({ type: 'auth', access_token: token }));
      else if (m.type === 'auth_ok') socket.send(JSON.stringify({ id: 1, ...message }));
      else if (m.type === 'auth_invalid') reject(new Error('the token was refused'));
      else if (m.type === 'result') {
        clearTimeout(timer);
        socket.close();
        if (m.success) resolve(m.result);
        else reject(new Error(`${message.type}: ${JSON.stringify(m.error)}`));
      }
    };
  });
}

async function fluvyInHacs() {
  const list = await ws({ type: 'hacs/repositories/list', categories: ['integration'] });
  return list.find((r) => r.full_name === REPOSITORY) ?? null;
}

async function status() {
  const config = await rest('GET', '/api/config');
  console.log(`Home Assistant ${config.version} (${config.location_name})`);
  const repo = await fluvyInHacs();
  if (!repo) console.log(`HACS: ${REPOSITORY} is not added as a custom repository`);
  else
    console.log(
      `HACS: ${REPOSITORY} installed=${repo.installed} version=${repo.installed_version ?? '—'} available=${repo.available_version ?? '—'}`,
    );
  const entries = await rest('GET', '/api/config/config_entries/entry?domain=fluvy');
  console.log(
    entries.length
      ? `Integration: ${entries.map((e) => e.state).join(', ')}`
      : 'Integration: not added',
  );
  const manifest = await ws({ type: 'manifest/get', integration: 'fluvy' }).catch(() => null);
  console.log(`Loaded: ${manifest?.version ?? 'nothing'}`);
  const resources = await ws({ type: 'lovelace/resources' }).catch(() => []);
  for (const r of resources) if (r.url.includes('fluvy')) console.log(`Resource: ${r.url}`);
}

async function refresh() {
  const repo = await fluvyInHacs();
  if (!repo) throw new Error(`${REPOSITORY} is not in HACS`);
  await ws({ type: 'hacs/repository/refresh', repository: repo.id });
  const after = await fluvyInHacs();
  console.log(
    `HACS sees ${after.available_version ?? '—'} (installed ${after.installed_version ?? '—'})`,
  );
}

async function download(version) {
  if (!/^v\d+\.\d+\.\d+$/.test(version ?? ''))
    throw new Error('usage: node tools/dev/ha.mjs download vX.Y.Z');
  const repo = await fluvyInHacs();
  if (!repo) throw new Error(`${REPOSITORY} is not in HACS`);
  await ws({ type: 'hacs/repository/refresh', repository: repo.id });
  await ws({ type: 'hacs/repository/download', repository: repo.id, version });
  const after = await fluvyInHacs();
  if (after.installed_version !== version)
    throw new Error(`HACS reports ${after.installed_version} after the download, not ${version}`);
  console.log(`HACS downloaded ${version}; restart Home Assistant to run it`);
}

async function restart() {
  // Home Assistant may drop the connection as it goes down before answering: that is the restart starting
  await rest('POST', '/api/services/homeassistant/restart', {}).catch(() => undefined);
  console.log('restarting…');
  const started = Date.now();
  await new Promise((r) => setTimeout(r, 10_000));
  while (Date.now() - started < 300_000) {
    try {
      const config = await rest('GET', '/api/config');
      if (config.state === 'RUNNING') {
        console.log(`back after ${Math.round((Date.now() - started) / 1000)} s`);
        return;
      }
    } catch {
      /* still starting */
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Home Assistant did not come back within five minutes');
}

async function add() {
  const entries = await rest('GET', '/api/config/config_entries/entry?domain=fluvy');
  if (entries.length) {
    console.log('the Fluvy integration is already added');
    return;
  }
  let flow = await rest('POST', '/api/config/config_entries/flow', {
    handler: 'fluvy',
    show_advanced_options: false,
  });
  if (flow.type === 'form')
    flow = await rest('POST', `/api/config/config_entries/flow/${flow.flow_id}`, {});
  if (flow.type !== 'create_entry')
    throw new Error(`the integration was not added: ${JSON.stringify(flow)}`);
  console.log('the Fluvy integration is added');
}

const [command, argument] = process.argv.slice(2);
try {
  switch (command) {
    case 'status':
      await status();
      break;
    case 'refresh':
      await refresh();
      break;
    case 'download':
      await download(argument);
      break;
    case 'restart':
      await restart();
      break;
    case 'add':
      await add();
      break;
    case 'ws':
      console.log(JSON.stringify(await ws(JSON.parse(argument ?? '{}')), null, 2));
      break;
    default:
      console.error(
        'usage: node tools/dev/ha.mjs status | refresh | download vX.Y.Z | restart | add | ws <json>',
      );
      process.exit(2);
  }
} catch (error) {
  console.error(`✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
