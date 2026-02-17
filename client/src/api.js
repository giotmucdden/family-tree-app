const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Auth
export const getCurrentUser = () => request('/auth/current-user');
export const logout = () => request('/auth/logout');
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const register = (data) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
export const forgotPassword = (email) =>
  request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
export const resetPassword = (token, password) =>
  request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });

// Trees
export const getTrees = () => request('/trees');
export const getTree = (id) => request(`/trees/${id}`);
export const createTree = (data) =>
  request('/trees', { method: 'POST', body: JSON.stringify(data) });
export const updateTree = (id, data) =>
  request(`/trees/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTree = (id) =>
  request(`/trees/${id}`, { method: 'DELETE' });

// Members
export const addMember = (treeId, data) =>
  request(`/trees/${treeId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const updateMember = (treeId, memberId, data) =>
  request(`/trees/${treeId}/members/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
export const deleteMember = (treeId, memberId) =>
  request(`/trees/${treeId}/members/${memberId}`, { method: 'DELETE' });
export const updateMemberPosition = (treeId, memberId, position) =>
  request(`/trees/${treeId}/members/${memberId}/position`, {
    method: 'PUT',
    body: JSON.stringify(position),
  });

// Branch — create new tree from a member's subtree
export const createBranchTree = (treeId, rootMemberId) =>
  request(`/trees/${treeId}/branch`, {
    method: 'POST',
    body: JSON.stringify({ rootMemberId }),
  });

// Export members to Excel
export const exportMembersExcel = async (treeId) => {
  const res = await fetch(`${API_BASE}/trees/${treeId}/export`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(err.error || 'Export failed');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?(.+?)"?$/);
  a.download = match ? match[1] : 'family_members.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// Import members from Excel
export const importMembersExcel = async (treeId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/trees/${treeId}/import`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(err.error || 'Import failed');
  }
  return res.json();
};
