export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Present';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString(); 
};