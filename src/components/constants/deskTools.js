import {
  faBoxOpen, faCalendar, faCalendarDays, faClipboardList, faComments, faGift, faIdCard,
  faPeopleGroup, faQrcode, faSearch, faStopwatch, faTrophy, faTv, faUserCheck,
  faUserGear, faUserPen, faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import { fieldStaffPaths } from './fieldStaffApi';

export const adminToolGroups = [
  {
    id: 'game-day',
    title: 'Game day',
    actions: [
      { title: 'Player Check-In', description: 'Scan members, check in walk-ons or welcome a party.', path: fieldStaffPaths.checkIn, icon: faUserCheck },
      { title: 'Manage Groups', description: 'Find a booking and update its guest list.', path: fieldStaffPaths.groups, icon: faPeopleGroup },
      { title: 'Rental Pickup', description: 'Issue numbered gear, swap an item or record a return.', path: '/admin/rentalform?view=pickup', icon: faBoxOpen, waiverDesk: true },
      { title: 'Rental Form', shortTitle: 'Rentals', description: 'Choose gear and verify waivers for each renter.', path: '/admin/rentalform', icon: faClipboardList, waiverDesk: true },
      { title: 'Round Controls', description: 'Run the briefing, review the lineup and score the round.', path: fieldStaffPaths.rounds, icon: faStopwatch },
      { title: 'Wins & Losses', description: 'Look up or correct an individual player’s result.', path: '/admin/scores', icon: faTrophy },
    ],
  },
  {
    id: 'membership',
    title: 'Membership',
    actions: [
      { title: 'New Member', shortTitle: 'New member', path: '/admin/signup', icon: faUserPlus, waiverDesk: true },
      { title: 'Renew Member', shortTitle: 'Renew member', path: '/admin/renewal', icon: faUserGear, waiverDesk: true },
      { title: 'Verify Membership', path: fieldStaffPaths.membership, icon: faIdCard },
      { title: 'Check Free Games', path: '/admin/freegames', icon: faGift, waiverDesk: true },
    ],
  },
  {
    id: 'waivers-parties',
    title: 'Waivers & parties',
    actions: [
      { title: 'Search Waiver', shortTitle: 'Find a waiver', path: '/admin/waiverlookup', icon: faSearch, waiverDesk: true },
      { title: 'Scan Waiver', path: '/admin/scanwaiver', icon: faQrcode, waiverDesk: true },
      { title: 'Sign Waiver', path: '/admin/waiverform', icon: faUserPen, waiverDesk: true },
      { title: 'Party Calendar', path: '/admin/birthday', icon: faCalendar, waiverDesk: true },
    ],
  },
  {
    id: 'field-operations',
    title: 'Field operations',
    actions: [
      { title: 'Field Game Days', path: '/schedule', icon: faCalendarDays },
      { title: 'Rotation & Briefings', path: fieldStaffPaths.missionTools, icon: faClipboardList },
      { title: 'Barracks Game Day TV', path: fieldStaffPaths.tv, icon: faTv },
      { title: 'Team Reports', path: fieldStaffPaths.reports, icon: faComments },
      { title: 'Player Feedback', path: fieldStaffPaths.feedback, icon: faComments },
    ],
  },
];

// The same waiver tools are mounted under two route prefixes.
export function waiverToolGroups(base) {
  return adminToolGroups.map(group => ({
    ...group,
    actions: group.actions.filter(tool => tool.waiverDesk).map(tool => ({
      ...tool, path: tool.path.replace(/^\/admin\//, base + '/'),
    })),
  })).filter(group => group.actions.length > 0);
}
