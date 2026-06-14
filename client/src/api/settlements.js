import api from './client';

export const getGroupSettlements = async (groupId) => {
  const response = await api.get(`/settlements/group/${groupId}`);
  return response.data;
};

export const createSettlement = async (settlementData) => {
  const response = await api.post('/settlements/create', settlementData);
  return response.data;
};
