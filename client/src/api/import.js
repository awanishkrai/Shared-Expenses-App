import api from './client';

export const uploadCSV = async (groupId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post(`/import/${groupId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
