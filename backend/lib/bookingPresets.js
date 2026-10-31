// How a site handles a new booking. The owner picks one preset on the Bookings page, and the rules below apply.
// confirm: 'instant' books straight away, 'approve' waits for the owner to confirm in the dashboard.
const PRESETS = {
  instant: { confirm: 'instant', ownerEmail: true, customerEmail: true, calendarLink: true },
  approve: { confirm: 'approve', ownerEmail: true, customerEmail: true, calendarLink: true },
  calendar: { confirm: 'instant', ownerEmail: false, customerEmail: false, calendarLink: true },
  quiet: { confirm: 'instant', ownerEmail: false, customerEmail: false, calendarLink: false },
};

const PRESET_KEYS = Object.keys(PRESETS);
const DEFAULT_PRESET = 'instant';

const presetOf = (settings) => PRESETS[settings?.preset] || PRESETS[DEFAULT_PRESET];

module.exports = { PRESETS, PRESET_KEYS, DEFAULT_PRESET, presetOf };
