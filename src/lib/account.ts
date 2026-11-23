import { SITES, titleCase, type JobCard, type SiteCode } from './api';
import { getState, signOutLocal } from './store';

/* ---------- Types ---------- */

export type Role = 'candidate' | 'employer';

export type User = {
  id: number;
  role: Role;
  name: string;
  email: string;
  phone: string;
  city: string;
  headline: string;
  company: string;
  website: string;
  about: string;
  resume_name: string;
  resume_url: string;
};

export type Application = { job: JobCard; applied: number; status: string };

export type Thread = { id: string; with: string; job: string; last: string; time: number; unread: boolean };
export type Message = { id: number; mine: boolean; text: string; time: number };

export type Salary = { title: string; avg: string; min: string; max: string; n: number };
export type Company = { id: string; name: string; city: string; jobs: number; rating: number; reviews: number };
export type CompanyDetail = Company & { about: string; website: string; jobs_list: JobCard[]; review_list: { stars: number; title: string; text: string; time: number }[] };

export type Post = { id: number; title: string; excerpt: string; image: string; time: number };
export type PostDetail = Post & { content: string };
export type Page = { title: string; content: string };

export type Taxonomies = { types: { id: number; name: string }[]; categories: { id: number; name: string }[]; periods: string[]; currency: string; ontario: boolean };

export type EmployerJob = { id: number; title: string; city: string; status: 'active' | 'pending' | 'closed' | 'expired'; posted: number; expires: number; applicants: number; views: number; pay: string };
export type JobForm = {
  title: string;
  description: string;
  city: string;
  type: number;
  category: number;
  pay_min: string;
  pay_max: string;
  pay_period: string;
  apply_email: string;
  openings: string;
  vacancy?: 'yes' | 'no';
  ai?: 'yes' | 'no';
};
export type Applicant = { id: number; user_id: number; name: string; email: string; phone: string; city: string; cover: string; answers: { q: string; a: string }[]; resume_url: string; applied: number; status: 'new' | 'shortlisted' | 'rejected' };
export type Candidate = { id: number; name: string; headline: string; city: string; updated: number };
export type CandidateDetail = Candidate & { email: string; phone: string; about: string; resume_url: string };

/* ---------- Transport ---------- */

const v1 = (site: SiteCode) => `${SITES[site].host}/wp-json/jobsrack/v1`;

export class AuthError extends Error {}

async function call<T>(site: SiteCode, path: string, opts: { method?: string; body?: any; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getState().auth?.token;
  if (token && opts.auth !== false) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-JR-Token'] = token; // some hosts strip Authorization
  }
  let body: any;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(v1(site) + path, { method: opts.method ?? (body ? 'POST' : 'GET'), headers, body, signal: ctrl.signal });
    let j: any = null;
    try {
      j = await r.json();
    } catch {}
    if (r.status === 401 && token) {
      signOutLocal();
      throw new AuthError('Please sign in again.');
    }
    if (!r.ok) throw new Error((j && j.message) || 'Something went wrong. Please try again.');
    return j as T;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('The connection is slow. Please try again.');
    if (e instanceof TypeError) throw new Error('No internet connection. Please check and try again.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

const tidyJob = (j: JobCard, site: SiteCode): JobCard => ({ ...j, city: titleCase(j.city), site });

/* ---------- Account ---------- */

export const login = (site: SiteCode, loginName: string, password: string) => call<{ token: string; user: User }>(site, '/auth/login', { body: { login: loginName, password }, auth: false });

export const register = (site: SiteCode, f: { role: Role; name: string; email: string; phone: string; password: string; company?: string }) =>
  call<{ token: string; user: User }>(site, '/auth/register', { body: f, auth: false });

export const forgotPassword = (site: SiteCode, email: string) => call<{ ok: boolean; message: string }>(site, '/auth/forgot', { body: { email }, auth: false });

export const logout = (site: SiteCode, push?: string | null) => call<{ ok: boolean }>(site, '/auth/logout', { body: push ? { push } : {} }).catch(() => ({ ok: true }));

/** Lets the portal send this phone personal notifications (messages, shortlisted). */
export const registerMyPush = (site: SiteCode, token: string) => call<{ ok: boolean }>(site, '/me/push', { body: { token } });

export const getMe = (site: SiteCode) => call<User>(site, '/me');

export function updateMe(site: SiteCode, f: Partial<User>, resume?: { uri: string; name: string; mimeType?: string; file?: any }) {
  const fd = new FormData();
  Object.entries(f).forEach(([k, v]) => v !== undefined && fd.append(k, String(v)));
  if (resume) {
    if (resume.file) fd.append('resume', resume.file, resume.name);
    else fd.append('resume', { uri: resume.uri, name: resume.name, type: resume.mimeType || 'application/pdf' } as any);
  }
  return call<User>(site, '/me', { body: fd });
}

export const deleteAccount = (site: SiteCode) => call<{ ok: boolean; message: string }>(site, '/me/delete', { body: {} });

export const applyWithSavedResume = (site: SiteCode, job: number, cover: string, answers: string[]) => call<{ ok: boolean; msg: string }>(site, '/me/apply', { body: { job, cover, answers } });

export const myApplications = (site: SiteCode) => call<Application[]>(site, '/me/applications').then((a) => a.map((x) => ({ ...x, job: tidyJob(x.job, site) })));

/* ---------- Messages ---------- */

export const threads = (site: SiteCode) => call<Thread[]>(site, '/messages');
export const thread = (site: SiteCode, id: string) => call<{ thread: Thread; messages: Message[] }>(site, `/messages/${id}`);
export const sendMessage = (site: SiteCode, id: string, text: string) => call<Message>(site, `/messages/${id}`, { body: { text } });
export const startThread = (site: SiteCode, to: number, job: number, text: string) => call<{ id: string }>(site, '/messages', { body: { to, job, text } });

/* ---------- Explore ---------- */

export const salaries = (site: SiteCode, q: string) => call<Salary[]>(site, `/salaries?q=${encodeURIComponent(q)}`, { auth: false });
export const companies = (site: SiteCode, q: string, page = 1) => call<{ items: Company[]; pages: number }>(site, `/companies?q=${encodeURIComponent(q)}&page=${page}`, { auth: false });
export const company = (site: SiteCode, id: string) =>
  call<CompanyDetail>(site, `/company/${id}`, { auth: false }).then((c) => ({ ...c, jobs_list: c.jobs_list.map((j) => tidyJob(j, site)) }));
export const companyByName = (site: SiteCode, name: string) => call<{ id: string }>(site, `/company-lookup?name=${encodeURIComponent(name)}`, { auth: false });
export const posts = (site: SiteCode, page = 1) => call<{ items: Post[]; pages: number }>(site, `/posts?page=${page}`, { auth: false });
export const post = (site: SiteCode, id: number) => call<PostDetail>(site, `/post/${id}`, { auth: false });
export const page = (site: SiteCode, slug: string) => call<Page>(site, `/page/${slug}`, { auth: false });
export const contact = (site: SiteCode, f: { name: string; email: string; message: string }) => call<{ ok: boolean; message: string }>(site, '/contact', { body: f, auth: false });

/* ---------- Employer ---------- */

export const taxonomies = (site: SiteCode) => call<Taxonomies>(site, '/taxonomies', { auth: false });
export const employerJobs = (site: SiteCode) => call<EmployerJob[]>(site, '/employer/jobs');
export const employerJob = (site: SiteCode, id: number) => call<JobForm & { id: number; status: EmployerJob['status'] }>(site, `/employer/jobs/${id}`);
export const saveJob = (site: SiteCode, f: JobForm, id?: number) => call<{ id: number; status: string; message: string }>(site, id ? `/employer/jobs/${id}` : '/employer/jobs', { body: f });
export const setJobStatus = (site: SiteCode, id: number, status: 'closed' | 'active') => call<{ ok: boolean; status: string }>(site, `/employer/jobs/${id}/status`, { body: { status } });
export const applicants = (site: SiteCode, jobId: number) => call<Applicant[]>(site, `/employer/jobs/${jobId}/applicants`);
export const setApplicantStatus = (site: SiteCode, jobId: number, userId: number, status: Applicant['status']) => call<{ ok: boolean }>(site, `/employer/jobs/${jobId}/applicants/${userId}`, { body: { status } });
export const searchCandidates = (site: SiteCode, q: string, loc: string, page = 1) =>
  call<{ items: Candidate[]; pages: number; total: number }>(site, `/employer/candidates?q=${encodeURIComponent(q)}&loc=${encodeURIComponent(loc)}&page=${page}`);
export const candidate = (site: SiteCode, id: number) => call<CandidateDetail>(site, `/employer/candidates/${id}`);
