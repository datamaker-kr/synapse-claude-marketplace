// jira-client.ts

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

function getConfig(): JiraConfig {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_USER_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  if (!baseUrl || !email || !apiToken) {
    throw new Error(
      "Missing env vars: JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN"
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), email, apiToken };
}

function authHeader(config: JiraConfig): string {
  return "Basic " + Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
}

export async function jiraFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  const config = getConfig();
  const url = `${config.baseUrl}/rest/api/3${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    const truncated = body.length > 500 ? body.slice(0, 500) + "..." : body;
    throw new Error(`Jira API ${res.status}: ${truncated}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function jiraAgileFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  const config = getConfig();
  const url = `${config.baseUrl}/rest/agile/1.0${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    const truncated = body.length > 500 ? body.slice(0, 500) + "..." : body;
    throw new Error(`Jira Agile API ${res.status}: ${truncated}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// JSON 응답이 보장되어야 하는 호출(GET, 생성 POST 등)에 사용. 빈 본문이면 에러.
export async function jiraFetchJson<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const data = await jiraFetch<T>(path, options);
  if (data === null) {
    throw new Error(`Jira API returned empty body for ${path}`);
  }
  return data;
}

export async function jiraAgileFetchJson<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const data = await jiraAgileFetch<T>(path, options);
  if (data === null) {
    throw new Error(`Jira Agile API returned empty body for ${path}`);
  }
  return data;
}
