export type SiteCode = 'ca' | 'in' | 'au' | 'gl';

export const SITES: Record<SiteCode, { name: string; short: string; host: string; flag: string; example: string }> = {
  ca: { name: 'JobsRack Canada', short: 'Canada', host: 'https://ca.jobsrack.com', flag: '🇨🇦', example: 'Toronto' },
  in: { name: 'JobsRack India', short: 'India', host: 'https://in.jobsrack.com', flag: '🇮🇳', example: 'Delhi' },
  au: { name: 'JobsRack Australia', short: 'Australia', host: 'https://au.jobsrack.com', flag: '🇦🇺', example: 'Sydney' },
  gl: { name: 'JobsRack Global', short: 'Global', host: 'https://jobsrack.com', flag: '🌍', example: 'City or country' },
};

export type JobCard = {
  id: number;
  title: string;
  company: string;
  city: string;
  pay: string;
  posted: number;
  badges: string[];
  summary: string;
  url: string;
  site?: SiteCode;
};

export type JobDetail = JobCard & {
  content: string;
  highlights: { urgent: boolean; openings: string; shifts: string[]; benefits: string[] } | null;
  questions: { q: string; t: string }[];
  ontario: { vac?: string; ai?: string } | null;
  apply_url: string;
  open: boolean;
  company_url: string;
};

export type JobList = { items: JobCard[]; page: number; pages: number; total: number };

export type SiteMeta = {
  site: SiteCode;
  name: string;
  privacy: string;
  terms: string;
  login: string;
  register: string;
  post_job: string;
  salaries: string;
  companies: string;
  messages: string;
  apply_endpoint: string;
};

async function getJson<T>(url: string): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) {
      let msg = 'Something went wrong. Please try again.';
      try {
        const j = await r.json();
        if (j && j.message) msg = j.message;
      } catch {}
      throw new Error(msg);
    }
    return (await r.json()) as T;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('The connection is slow. Please try again.');
    if (e instanceof TypeError) throw new Error('No internet connection. Please check and try again.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

const base = (site: SiteCode) => `${SITES[site].host}/wp-json/jobsrack/v1`;

export function searchJobs(site: SiteCode, q: string, loc: string, page = 1) {
  const p = new URLSearchParams({ q, loc, page: String(page) });
  return getJson<JobList>(`${base(site)}/jobs?${p.toString()}`);
}

export function jobsByIds(site: SiteCode, ids: number[]) {
  return getJson<JobList>(`${base(site)}/jobs?ids=${ids.join(',')}`);
}

export function getJob(site: SiteCode, id: number) {
  return getJson<JobDetail>(`${base(site)}/job/${id}`);
}

export function getMeta(site: SiteCode) {
  return getJson<SiteMeta>(`${base(site)}/meta`);
}

export async function registerPush(site: SiteCode, token: string, alerts: { q: string; loc: string }[]) {
  const r = await fetch(`${base(site)}/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ token, alerts, off: alerts.length === 0 ? 1 : 0 }),
  });
  return r.ok;
}

export type ApplyInput = {
  site: SiteCode;
  jobId: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  answers: string[];
  resume: { uri: string; name: string; mimeType?: string; file?: any };
};

export async function applyToJob(i: ApplyInput): Promise<{ ok: boolean; msg: string }> {
  const fd = new FormData();
  fd.append('action', 'jr_guest_apply');
  fd.append('jr_guest', '1');
  fd.append('jr_consent', '1');
  fd.append('post_id', String(i.jobId));
  fd.append('fullname', i.name);
  fd.append('email', i.email);
  fd.append('phone', i.phone);
  fd.append('cover_letter', i.message);
  i.answers.forEach((a, n) => fd.append(`jr_q[${n}]`, a));
  if (i.resume.file) {
    fd.append('media_upload', i.resume.file, i.resume.name);
  } else {
    fd.append('media_upload', { uri: i.resume.uri, name: i.resume.name, type: i.resume.mimeType || 'application/pdf' } as any);
  }
  try {
    const r = await fetch(`${SITES[i.site].host}/wp-admin/admin-ajax.php`, { method: 'POST', body: fd });
    const j = await r.json();
    return { ok: Number(j.status) === 1, msg: String(j.msg || '') };
  } catch {
    return { ok: false, msg: 'Could not send. Please check your connection and try again.' };
  }
}

export function timeAgo(unix: number) {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - unix));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  if (d < 31) return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  return `${Math.floor(d / 30)} mo ago`;
}

/** Turn the job's HTML into simple blocks the app can show natively. */
export function htmlToBlocks(html: string): { type: 'h' | 'p' | 'li'; text: string }[] {
  const ent = (s: string) =>
    s
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;|&rsquo;|&lsquo;/g, "'")
      .replace(/&ldquo;|&rdquo;/g, '"')
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  const out: { type: 'h' | 'p' | 'li'; text: string }[] = [];
  const re = /<(h[2-4]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    const inner = m[2].replace(/<br\s*\/?>/gi, '\n');
    const text = ent(inner.replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim();
    if (!text) continue;
    const isHeading = tag.startsWith('h') || (tag === 'p' && /^<(strong|b)>[^<]{2,80}<\/(strong|b)>\s*:?$/i.test(m[2].trim()));
    out.push({ type: isHeading ? 'h' : tag === 'li' ? 'li' : 'p', text });
  }
  if (!out.length) {
    const plain = ent(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (plain) out.push({ type: 'p', text: plain });
  }
  return out;
}
