import api from './client';

export const getGroupExpenses = async (groupId) => {
  const response = await api.get(`/expenses/group/${groupId}`);
  return response.data;
};

export const getExpense = async (expenseId) => {
  const response = await api.get(`/expenses/${expenseId}`);
  return response.data;
};

export const createExpense = async (groupId, expenseData) => {
  const response = await api.post(`/expenses/group/${groupId}`, expenseData);
  return response.data;
};
