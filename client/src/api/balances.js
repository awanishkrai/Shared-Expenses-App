import api from './client';

export const getBalances = async (groupId) => {
  const response = await api.get(`/balances/group/${groupId}`);
  return response.data;
};
