export function groupRentalLink(id, isAdmin = true) {
  const path = isAdmin ? '/admin/rentalform' : '/dashboard/rentalform';
  return path + '?' + new URLSearchParams({ view: 'new', group: id });
}
