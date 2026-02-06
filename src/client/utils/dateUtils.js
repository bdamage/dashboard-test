// Date utility functions for analytics
export const getLast120Days = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 120);

  return {
    start: startDate.toISOString().split('T')[0] + ' 00:00:00',
    end: endDate.toISOString().split('T')[0] + ' 23:59:59'
  };
};

export const getDateRange = (days) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return {
    start: startDate.toISOString().split('T')[0] + ' 00:00:00',
    end: endDate.toISOString().split('T')[0] + ' 23:59:59'
  };
};
