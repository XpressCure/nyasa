const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000/api";

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("nyasa_token");
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
  } catch (_error) {
    throw new Error(`Cannot reach Nyasa API at ${API_BASE_URL}. Start the API with npm run dev:api.`);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error?.message || `API request failed: ${response.status}`);
  }

  return payload;
}

export async function apiGet(path) {
  return apiRequest(path);
}

export async function apiPost(path, body) {
  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function apiPostEmpty(path) {
  return apiRequest(path, {
    method: "POST"
  });
}

export async function apiPatch(path, body) {
  return apiRequest(path, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export { API_BASE_URL };
