import api from './client';

export const getGroups = async () => {
  const response = await api.get('/groups');
  return response.data;
};

export const getGroupById = async (id) => {
  const response = await api.get(`/groups/${id}`);
  return response.data;
};

export const createGroup = async (name, description) => {
  const response = await api.post('/groups', { name, description });
  return response.data;
};

export const addMember = async (groupId, username) => {
  const response = await api.post(`/groups/${groupId}/members`, { username });
  return response.data;
};
