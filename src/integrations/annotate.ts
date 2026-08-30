// The write path for annotations — see `_plans/spec-annotations.md`.
//
// `astro:server:setup` only fires under `astro dev`, which is exactly the reach
// the feature is meant to have: annotations are a `serve` feature (D-ANN-5), and
// a build has no endpoint to strip because none was ever added. It is a dev
// middleware rather than an API route because the site is static — a route that
// answered a POST would need an adapter, and an adapter would follow the export
// into a file that has no server behind it.
import type { AstroIntegration } from 'astro';
import type { IncomingMessage, ServerResponse } from 'node:http';
// Imported at config load, not lazily inside the handler: a dynamic import from
// here goes through Vite's module runner, which is already closed by the time a
// request arrives — the write hangs with an unhandled rejection.
import { ANNOTATIONS_ROUTE, chainText, isAnchor, MAX_NOTE, toContext } from '../lib/anchor';
import { readAnnotations, updateAnnotation, writeAnnotation } from '../lib/annotations';
import { teamDirFromEnv } from '../lib/load';

const ROUTE = `/${ANNOTATIONS_ROUTE}`;

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_NOTE * 4) throw new Error('body too large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

export default function annotate(): AstroIntegration {
  return {
    name: 'ai-sdlc:annotate',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        server.middlewares.use(async (req, res, next) => {
          // `base` puts a prefix in front of every path in dev, and this
          // middleware sees the raw url — so the route is matched at the end.
          const path = (req.url ?? '').split('?')[0].replace(/\/$/, '');
          if (!path.endsWith(ROUTE)) return next();

          const teamDir = teamDirFromEnv();
          try {
            if (req.method === 'GET') {
              const { annotations, problems } = await readAnnotations(teamDir);
              return send(res, 200, { annotations, problems: problems.length });
            }
            if (req.method === 'POST') {
              const body = await readBody(req);
              const note = typeof body.note === 'string' ? body.note.trim() : '';
              if (!note) return send(res, 400, { error: 'note is empty' });
              if (note.length > MAX_NOTE) return send(res, 400, { error: 'note is too long' });
              // An id means the reader opened a note that was already there and
              // rewrote it, so this is a correction, not a second note — and the
              // anchor it is filed under is the stored one, not a resubmitted one.
              if (typeof body.id === 'string' && body.id) {
                const edited = await updateAnnotation(teamDir, body.id, note);
                if (!edited) return send(res, 404, { error: `no annotation "${body.id}"` });
                logger.info(`annotation ${edited.id} edited`);
                return send(res, 200, edited);
              }
              if (!isAnchor(body.anchor)) return send(res, 400, { error: 'anchor is not a model id' });
              // The chain is normalised, not validated: the note is the thing the
              // reader spent effort on, and a bad crumb is not worth a 400. The
              // anchor above is the half that is rejected, because a wrong one
              // files the note against the wrong node.
              const written = await writeAnnotation(teamDir, {
                anchor: body.anchor,
                context: toContext(body.context),
                note,
              });
              logger.info(`annotation ${written.id} → ${chainText([...(written.context ?? []), written.anchor])}`);
              return send(res, 201, written);
            }
          } catch (err) {
            return send(res, 400, { error: (err as Error).message });
          }
          return send(res, 405, { error: `${req.method} not allowed` });
        });
      },
    },
  };
}
