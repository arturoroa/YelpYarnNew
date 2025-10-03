export async function apiGet<T = unknown>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal,
  });

  // Handle 204 or empty body up front
  if (res.status === 204) return [] as unknown as T;

  const ct = res.headers.get('content-type') || '';

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`);
  }

  // Prefer JSON; fall back to text->JSON if servers send text/plain
  if (ct.includes('application/json')) {
    // If body is empty string, res.json() still throws; guard by reading text first
    const raw = await res.text();
    if (!raw) return [] as unknown as T;
    return JSON.parse(raw) as T;
  } else {
    const raw = await res.text();
    if (!raw) return [] as unknown as T;
    return JSON.parse(raw) as T;
  }
}

export async function apiPost<T = unknown>(url: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined,
    signal,
  });

  // Handle 204 or empty body up front
  if (res.status === 204) return [] as unknown as T;

  const ct = res.headers.get('content-type') || '';

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`);
  }

  // Prefer JSON; fall back to text->JSON if servers send text/plain
  if (ct.includes('application/json')) {
    // If body is empty string, res.json() still throws; guard by reading text first
    const raw = await res.text();
    if (!raw) return [] as unknown as T;
    return JSON.parse(raw) as T;
  } else {
    const raw = await res.text();
    if (!raw) return [] as unknown as T;
    return JSON.parse(raw) as T;
  }
}

export async function apiPut<T = unknown>(url: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined,
    signal,
  });

  // Handle 204 or empty body up front
  if (res.status === 204) return [] as unknown as T;

  const ct = res.headers.get('content-type') || '';

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`);
  }

  // Prefer JSON; fall back to text->JSON if servers send text/plain
  if (ct.includes('application/json')) {
    // If body is empty string, res.json() still throws; guard by reading text first
    const raw = await res.text();
    if (!raw) return [] as unknown as T;
    return JSON.parse(raw) as T;
  } else {
    const raw = await res.text();
    if (!raw) return [] as unknown as T;
    return JSON.parse(raw) as T;
  }
}