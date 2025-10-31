import { drizzle } from 'drizzle-orm/libsql';
import { migrate as drizzleMigrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import debug from 'debug';
import { eq } from 'drizzle-orm';
import { promises as fs } from 'fs';
import { join } from 'path';

import * as schema from './schema';
import { ClientService } from './repositories/client/service';
import { GeneralService } from './repositories/general/service';
import { UserService } from './repositories/user/service';
import { UserConfigService } from './repositories/userConfig/service';
import { InterfaceService } from './repositories/interface/service';
import { HooksService } from './repositories/hooks/service';
import { OneTimeLinkService } from './repositories/oneTimeLink/service';

const DB_DEBUG = debug('Database');

const client = createClient({ url: 'file:/etc/wireguard/wg-easy.db' });
const db = drizzle({ client, schema });

export async function connect() {
  await migrate();
  const dbService = new DBService(db);

  if (WG_INITIAL_ENV.ENABLED) {
    await initialSetup(dbService);
  }

  if (WG_ENV.DISABLE_IPV6) {
    DB_DEBUG('Warning: Disabling IPv6...');
    await disableIpv6(db);
  }

  // Override hooks from files, do not allow empty overwrite here
  await overrideHooksFromFiles(db, { allowEmptyOverwrite: false });

  return dbService;
}

class DBService {
  clients: ClientService;
  general: GeneralService;
  users: UserService;
  userConfigs: UserConfigService;
  interfaces: InterfaceService;
  hooks: HooksService;
  oneTimeLinks: OneTimeLinkService;

  constructor(db: DBType) {
    this.clients = new ClientService(db);
    this.general = new GeneralService(db);
    this.users = new UserService(db);
    this.userConfigs = new UserConfigService(db);
    this.interfaces = new InterfaceService(db);
    this.hooks = new HooksService(db);
    this.oneTimeLinks = new OneTimeLinkService(db);
  }
}

export type DBType = typeof db;
export type DBServiceType = DBService;

async function migrate() {
  try {
    DB_DEBUG('Migrating database...');
    await drizzleMigrate(db, {
      migrationsFolder: './server/database/migrations',
    });
    DB_DEBUG('Migration complete');
  } catch (e) {
    if (e instanceof Error) {
      DB_DEBUG('Failed to migrate database:', e.message);
    }
  }
}

async function initialSetup(db: DBServiceType) {
  const setup = await db.general.getSetupStep();

  if (setup.done) {
    DB_DEBUG('Setup already done. Skiping initial setup.');
    return;
  }

  if (WG_INITIAL_ENV.IPV4_CIDR && WG_INITIAL_ENV.IPV6_CIDR) {
    DB_DEBUG('Setting initial CIDR...');
    await db.interfaces.updateCidr({
      ipv4Cidr: WG_INITIAL_ENV.IPV4_CIDR,
      ipv6Cidr: WG_INITIAL_ENV.IPV6_CIDR,
    });
  }

  if (WG_INITIAL_ENV.DNS) {
    DB_DEBUG('Setting initial DNS...');
    await db.userConfigs.update({
      defaultDns: WG_INITIAL_ENV.DNS,
    });
  }

  if (WG_INITIAL_ENV.ALLOWED_IPS) {
    DB_DEBUG('Setting initial Allowed IPs...');
    await db.userConfigs.update({
      defaultAllowedIps: WG_INITIAL_ENV.ALLOWED_IPS,
    });
  }

  if (
    WG_INITIAL_ENV.USERNAME &&
    WG_INITIAL_ENV.PASSWORD &&
    WG_INITIAL_ENV.HOST &&
    WG_INITIAL_ENV.PORT
  ) {
    DB_DEBUG('Creating initial user...');
    await db.users.create(WG_INITIAL_ENV.USERNAME, WG_INITIAL_ENV.PASSWORD);

    DB_DEBUG('Setting initial host and port...');
    await db.userConfigs.updateHostPort(
      WG_INITIAL_ENV.HOST,
      WG_INITIAL_ENV.PORT
    );

    await db.general.setSetupStep(0);
  }
}

async function disableIpv6(db: DBType) {
  // This should match the initial value migration
  const postUpMatch =
    ' ip6tables -t nat -A POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -A FORWARD -i wg0 -j ACCEPT; ip6tables -A FORWARD -o wg0 -j ACCEPT;';
  const postDownMatch =
    ' ip6tables -t nat -D POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE; ip6tables -D INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -D FORWARD -i wg0 -j ACCEPT; ip6tables -D FORWARD -o wg0 -j ACCEPT;';

  await db.transaction(async (tx) => {
    const hooks = await tx.query.hooks.findFirst({
      where: eq(schema.hooks.id, 'wg0'),
    });

    if (!hooks) {
      throw new Error('Hooks not found');
    }

    if (hooks.postUp.includes(postUpMatch)) {
      DB_DEBUG('Disabling IPv6 in Post Up hooks...');
      await tx
        .update(schema.hooks)
        .set({
          postUp: hooks.postUp.replace(postUpMatch, ''),
          postDown: hooks.postDown.replace(postDownMatch, ''),
        })
        .where(eq(schema.hooks.id, 'wg0'))
        .execute();
    } else {
      DB_DEBUG('IPv6 Post Up hooks already disabled, skipping...');
    }
    if (hooks.postDown.includes(postDownMatch)) {
      DB_DEBUG('Disabling IPv6 in Post Down hooks...');
      await tx
        .update(schema.hooks)
        .set({
          postUp: hooks.postUp.replace(postUpMatch, ''),
          postDown: hooks.postDown.replace(postDownMatch, ''),
        })
        .where(eq(schema.hooks.id, 'wg0'))
        .execute();
    } else {
      DB_DEBUG('IPv6 Post Down hooks already disabled, skipping...');
    }
  });
}

const IPTABLES_DIR = '/hooks';
const HOOK_FILE_MAP = {
  postUp: 'wg-post-up.txt',
  postDown: 'wg-post-down.txt',
} as const;

function normalizeHook(s: string): string {
  // remove BOM, normalize line endings, remove comments and extra whitespace
  const noBom = s.replace(/^\uFEFF/, '');

  // Normalize line endings
  const normalized = noBom.replace(/\r\n/g, '\n');

  // Remove lines starting with # (including leading whitespace)
  const withoutComments = normalized
    .split('\n')
    .filter(line => !line.trim().startsWith('#') && line.trim() !== '')
    .join(' '); // Join the removed lines with a space to avoid command concatenation

  // Remove extra whitespace
  return withoutComments.trim().replace(/\s+/g, ' ');
}

async function readIfExists(p: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(p, 'utf8');
    return normalizeHook(raw);
  } catch (e: any) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) return null;
    throw e;
  }
}

export async function overrideHooksFromFiles(
  db: DBType,
  opts?: { allowEmptyOverwrite?: boolean }
) {
  const allowEmptyOverwrite = !!opts?.allowEmptyOverwrite;

  DB_DEBUG('Overriding hooks from files under /iptables...');

  // pre-read files concurrently
  const [postUpFile, postDownFile] = await Promise.all([
    readIfExists(join(IPTABLES_DIR, HOOK_FILE_MAP.postUp)),
    readIfExists(join(IPTABLES_DIR, HOOK_FILE_MAP.postDown)),
  ]);

  DB_DEBUG('Read hook files:', {
    postUpFile: postUpFile === null ? 'not found' : '[found]',
    postDownFile: postDownFile === null ? 'not found' : '[found]',
  });

  DB_DEBUG('Contents:', {
    postUpFile:
      postUpFile === null ? 'N/A' : postUpFile === '' ? '[empty]' : postUpFile,
    postDownFile:
      postDownFile === null
        ? 'N/A'
        : postDownFile === ''
        ? '[empty]'
        : postDownFile,
  });

  const hasAnyFile =
    postUpFile !== null || postDownFile !== null;

  if (!hasAnyFile) {
    DB_DEBUG('No hook files found, nothing to override.');
    return;
  }

  await db.transaction(async (tx) => {
    const hooks = await tx.query.hooks.findFirst({
      where: eq(schema.hooks.id, 'wg0'),
    });
    if (!hooks) throw new Error('Hooks not found');

    const updatedHooks = {
      preUp: hooks.preUp,       // not changed
      preDown: hooks.preDown,   // not changed
      postUp:
        postUpFile === null
          ? hooks.postUp
          : postUpFile === '' && !allowEmptyOverwrite
          ? hooks.postUp
          : postUpFile, // use file content if exists
      postDown:
        postDownFile === null
          ? hooks.postDown
          : postDownFile === '' && !allowEmptyOverwrite
          ? hooks.postDown
          : postDownFile,
    };

     // Check if anything changed
    const unchanged =
      updatedHooks.postUp === hooks.postUp &&
      updatedHooks.postDown === hooks.postDown;

    if (unchanged) {
      DB_DEBUG('Hook contents identical, skip updating DB.');
      return;
    }

    await tx
      .update(schema.hooks)
      .set(updatedHooks)
      .where(eq(schema.hooks.id, 'wg0'))
      .execute();
  });

  DB_DEBUG('Hooks successfully overridden from files.');
}