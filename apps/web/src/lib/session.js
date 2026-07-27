import { apiGet } from "./api.js";

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("nyasa_user") || "null");
  } catch (_error) {
    return null;
  }
}

export function getStoredFamilyId() {
  return localStorage.getItem("nyasa_family_id");
}

export async function loadCurrentSession() {
  const familyId = getStoredFamilyId();
  const user = getStoredUser();

  if (!familyId) {
    return {
      familyId: null,
      user,
      member: null,
      family: null,
      role: null,
      permissions: []
    };
  }

  const response = await apiGet(`/permissions/family/${familyId}/me`);
  return {
    ...response.data,
    familyId
  };
}

export function hasPermission(session, permission) {
  return session?.permissions?.includes(permission);
}
