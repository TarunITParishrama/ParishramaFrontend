export const getMonthDateRange = (date) => {
  const monthDate = new Date(date);
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  return {
    dateFrom: firstDay.toISOString(),
    dateTo: lastDay.toISOString(),
  };
};
