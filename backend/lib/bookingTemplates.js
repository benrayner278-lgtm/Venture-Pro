// Booking presets: ready-made setups for different kinds of business. Each one sets the booking type, services or
// recurring sessions, opening hours and length of each slot. The owner can change anything afterwards.
//
// kind:
//   'call'         one phone or video call at a time the visitor picks
//   'appointments' services the visitor books at a free time
//   'sessions'     fixed classes or sessions that repeat each week, with a limited number of places

const HOURS = {
  office: { mon: ['09:00', '17:00'], tue: ['09:00', '17:00'], wed: ['09:00', '17:00'], thu: ['09:00', '17:00'], fri: ['09:00', '17:00'] },
  extended: { mon: ['09:00', '18:00'], tue: ['09:00', '18:00'], wed: ['09:00', '18:00'], thu: ['09:00', '18:00'], fri: ['09:00', '18:00'], sat: ['09:00', '18:00'] },
  evenings: { tue: ['10:00', '19:00'], wed: ['10:00', '19:00'], thu: ['10:00', '19:00'], fri: ['10:00', '19:00'], sat: ['10:00', '19:00'] },
  everyday: { mon: ['09:00', '18:00'], tue: ['09:00', '18:00'], wed: ['09:00', '18:00'], thu: ['09:00', '18:00'], fri: ['09:00', '18:00'], sat: ['09:00', '18:00'], sun: ['09:00', '18:00'] },
};

// Services are [name, minutes, price]. Sessions are [name, day, time, minutes, places].
const make = (id, name, kind, group, fields) => ({
  id,
  name,
  kind,
  group, // 'main' for the five headline presets, 'more' for the rest
  summary: fields.summary,
  bestFor: fields.bestFor,
  slotMinutes: fields.slotMinutes ?? 30,
  daysAhead: fields.daysAhead ?? 14,
  hours: HOURS[fields.hours ?? 'office'],
  confirm: fields.confirm ?? 'instant',
  services: (fields.services || []).map(([serviceName, minutes, price = '']) => ({ name: serviceName, minutes, price })),
  sessions: (fields.sessions || []).map(([sessionName, day, time, minutes, places]) => ({ name: sessionName, day, time, minutes, capacity: places })),
  callDetails: fields.callDetails ?? '',
});

const MAIN = [
  make('call', 'Book a call', 'call', 'main', {
    summary: 'Visitors pick a free time for a phone or video call. The simplest setup: one call length, and your phone number or meeting link.',
    bestFor: ['Consultations and advice', 'Sales calls and quotes given by phone', 'Coaching and mentoring', 'Accountants, solicitors and other advisers'],
    slotMinutes: 30,
    services: [['Phone call', 30]],
    callDetails: 'Your phone number or video call link',
  }),
  make('appointments', 'Appointments', 'appointments', 'main', {
    summary: 'Visitors book a service that takes a set length of time, at a time you have free.',
    bestFor: ['Hair, beauty and barbers', 'Therapists, physios and clinics', 'Tradespeople visiting a home or site', 'Any business where each customer gets their own time'],
    slotMinutes: 30,
    hours: 'extended',
    services: [['Appointment', 60]],
  }),
  make('sessions', 'Classes and sessions', 'sessions', 'main', {
    summary: 'Fixed times that repeat each week. Each session has a number of places, and it stops taking bookings when full.',
    bestFor: ['Pottery, art and craft classes', 'Yoga, dance and fitness classes', 'Weekly courses and workshops', 'Group tours and activities'],
    sessions: [['Group class', 'tue', '18:30', 90, 10]],
  }),
  make('quote', 'Quote or site visit', 'appointments', 'main', {
    summary: 'A longer visit where you look at the job before you quote. Each request is checked by you before it is confirmed.',
    bestFor: ['Builders, decorators and roofers', 'Cleaners and gardeners quoting for larger jobs', 'Designers and surveyors', 'Any job that needs seeing in person first'],
    slotMinutes: 60,
    confirm: 'approve',
    services: [['Quote visit', 60]],
  }),
  make('short-slots', 'Short slots', 'appointments', 'main', {
    summary: 'Quick, regular slots through the day. Good for fast jobs and check-ups that take little time.',
    bestFor: ['Repairs and drop-ins', 'Quick health check-ups', 'Small services such as car washes or key cutting', 'Pickups and collections'],
    slotMinutes: 15,
    hours: 'extended',
    services: [['Quick visit', 15]],
  }),
];

const MORE = [
  // Appointments
  make('hair-salon', 'Hair salon', 'appointments', 'more', { summary: 'Cuts, colour and styling, each with its own length.', bestFor: ['Hair salons', 'Mobile hairdressers'], hours: 'extended', services: [['Cut', 45], ['Colour', 120], ['Blow-dry', 30]] }),
  make('barber', 'Barber', 'appointments', 'more', { summary: 'Quick cuts and beard trims, with a longer combined option.', bestFor: ['Barbershops', 'Mobile barbers'], slotMinutes: 15, hours: 'extended', services: [['Haircut', 30], ['Beard trim', 15], ['Haircut and beard', 45]] }),
  make('nails', 'Nail bar', 'appointments', 'more', { summary: 'Manicures, pedicures and gel sets.', bestFor: ['Nail bars', 'Independent nail technicians'], hours: 'extended', services: [['Manicure', 45], ['Pedicure', 60], ['Gel nails', 60]] }),
  make('lashes-brows', 'Lash and brow studio', 'appointments', 'more', { summary: 'Lash extensions and brow treatments.', bestFor: ['Lash and brow studios', 'Beauty therapists'], services: [['Lash extensions', 90], ['Brow shape and tint', 30]] }),
  make('massage', 'Massage therapy', 'appointments', 'more', { summary: 'Treatments of different lengths.', bestFor: ['Massage therapists', 'Spas'], services: [['Massage 60 min', 60], ['Massage 90 min', 90]] }),
  make('physio', 'Physiotherapy', 'appointments', 'more', { summary: 'A longer first assessment, then shorter follow-ups.', bestFor: ['Physiotherapists', 'Sports injury clinics'], services: [['Initial assessment', 60], ['Follow-up', 30]] }),
  make('counselling', 'Counselling session', 'appointments', 'more', { summary: 'Fixed-length sessions, usually at the same time each week.', bestFor: ['Counsellors', 'Therapists'], services: [['Session', 50]] }),
  make('dentist', 'Dental check-up', 'appointments', 'more', { summary: 'Check-ups and hygiene appointments.', bestFor: ['Dental practices', 'Hygienists'], services: [['Check-up', 30], ['Hygiene', 45]] }),
  make('optician', 'Eye test', 'appointments', 'more', { summary: 'Eye tests and contact lens checks.', bestFor: ['Opticians'], services: [['Eye test', 30], ['Contact lens check', 20]] }),
  make('vet', 'Vet visit', 'appointments', 'more', { summary: 'Short check-ups and vaccinations.', bestFor: ['Vets', 'Animal clinics'], slotMinutes: 15, services: [['Check-up', 20], ['Vaccination', 15]] }),
  make('dog-grooming', 'Dog grooming', 'appointments', 'more', { summary: 'Grooming booked by the size of the dog.', bestFor: ['Dog groomers'], services: [['Small dog', 60], ['Large dog', 120]] }),
  make('pet-visits', 'Pet sitting and dog walking', 'appointments', 'more', { summary: 'Short visits for walks, feeding and checks.', bestFor: ['Pet sitters', 'Dog walkers'], slotMinutes: 15, services: [['Dog walk', 30], ['Cat or small pet visit', 20]] }),
  make('personal-training', 'Personal training', 'appointments', 'more', { summary: 'One-to-one training sessions.', bestFor: ['Personal trainers', 'Gym instructors'], services: [['Personal training', 60]] }),
  make('driving-lessons', 'Driving lessons', 'appointments', 'more', { summary: 'Lessons of one or two hours.', bestFor: ['Driving instructors'], slotMinutes: 60, services: [['One-hour lesson', 60], ['Two-hour lesson', 120]] }),
  make('tutoring', 'Tutoring', 'appointments', 'more', { summary: 'One-to-one lessons for pupils and adults.', bestFor: ['Private tutors', 'Music and language teachers'], services: [['Lesson', 60], ['Short lesson', 30]] }),
  make('tattoo', 'Tattoo studio', 'appointments', 'more', { summary: 'A short consultation first, then longer sessions.', bestFor: ['Tattoo artists'], slotMinutes: 60, confirm: 'approve', services: [['Consultation', 30], ['Tattoo session', 180]] }),
  make('photography', 'Photo shoot', 'appointments', 'more', { summary: 'Shoots of different lengths.', bestFor: ['Photographers', 'Videographers'], slotMinutes: 60, confirm: 'approve', services: [['Portrait session', 60], ['Full shoot', 120]] }),
  make('venue-tour', 'Venue tour', 'appointments', 'more', { summary: 'Guided tours of a venue or space.', bestFor: ['Wedding and event venues', 'Hire spaces'], slotMinutes: 60, confirm: 'approve', services: [['Venue tour', 45]] }),
  make('property-viewing', 'Property viewing', 'appointments', 'more', { summary: 'Short viewings with a time for each.', bestFor: ['Estate agents', 'Letting agents'], services: [['Viewing', 30]] }),
  make('meeting-room', 'Meeting room hire', 'appointments', 'more', { summary: 'Hire of a room by the hour.', bestFor: ['Co-working spaces', 'Studios and offices with spare rooms'], hours: 'everyday', services: [['One hour', 60], ['Half day', 240]] }),
  make('bike-hire', 'Bike or equipment hire', 'appointments', 'more', { summary: 'Pick-up times for hire equipment.', bestFor: ['Bike hire', 'Equipment rental'], slotMinutes: 30, hours: 'everyday', services: [['Pick-up', 30]] }),
  make('mot-service', 'MOT and car service', 'appointments', 'more', { summary: 'Garage bookings by job.', bestFor: ['Garages', 'MOT testers'], slotMinutes: 60, hours: 'extended', services: [['MOT', 60], ['Service', 120]] }),
  make('callout', 'Callout visit', 'appointments', 'more', { summary: 'A visit to a home or business, with a quote on the day.', bestFor: ['Plumbers', 'Electricians', 'Locksmiths', 'Heating engineers'], slotMinutes: 60, hours: 'everyday', confirm: 'approve', services: [['Callout', 60]] }),
  make('cleaning', 'Cleaning', 'appointments', 'more', { summary: 'Cleans of a set length, with a visit to quote for larger jobs.', bestFor: ['Cleaning services'], hours: 'extended', services: [['Standard clean', 120], ['Deep clean', 240]] }),
  make('gym-induction', 'Gym induction', 'appointments', 'more', { summary: 'A short induction for new members.', bestFor: ['Gyms', 'Leisure centres'], services: [['Induction', 30]] }),
  make('nutrition', 'Nutrition consultation', 'appointments', 'more', { summary: 'A longer first consultation and follow-ups.', bestFor: ['Dietitians', 'Nutritionists'], services: [['First consultation', 60], ['Follow-up', 30]] }),
  make('legal-advice', 'Legal or accountancy meeting', 'call', 'more', { summary: 'A call or meeting of a fixed length.', bestFor: ['Solicitors', 'Accountants', 'Financial advisers'], slotMinutes: 30, services: [['Meeting', 45]], callDetails: 'Your office address or video call link' }),

  // Recurring sessions and classes
  make('pottery-class', 'Pottery class (term)', 'sessions', 'more', { summary: 'A weekly class with a fixed number of places.', bestFor: ['Pottery and ceramics', 'Craft classes'], sessions: [['Pottery class', 'tue', '18:30', 120, 8]] }),
  make('yoga-class', 'Yoga class', 'sessions', 'more', { summary: 'Classes at set times through the week.', bestFor: ['Yoga studios', 'Pilates'], sessions: [['Yoga', 'mon', '07:30', 60, 20], ['Yoga', 'wed', '19:00', 60, 20]] }),
  make('dance-class', 'Dance class', 'sessions', 'more', { summary: 'Classes for children and adults.', bestFor: ['Dance schools'], sessions: [['Kids dance', 'sat', '10:00', 45, 12]] }),
  make('art-workshop', 'Art workshop', 'sessions', 'more', { summary: 'A weekly workshop with a set number of seats.', bestFor: ['Art workshops', 'Painting classes'], sessions: [['Painting workshop', 'sat', '13:00', 150, 10]] }),
  make('cooking-class', 'Cooking class', 'sessions', 'more', { summary: 'Evening classes for a small group.', bestFor: ['Cookery schools', 'Chefs'], sessions: [['Cooking class', 'thu', '18:00', 150, 10]] }),
  make('swimming-lessons', 'Swimming lessons', 'sessions', 'more', { summary: 'Small lessons with few places each.', bestFor: ['Swim schools'], sessions: [['Swimming lesson', 'sat', '09:00', 30, 4]] }),
  make('language-class', 'Language class', 'sessions', 'more', { summary: 'A weekly class for a group of learners.', bestFor: ['Language schools'], sessions: [['Language class', 'tue', '19:00', 90, 12]] }),
  make('group-fitness', 'Group fitness', 'sessions', 'more', { summary: 'Short high-energy classes on several days.', bestFor: ['Gyms', 'Boot camps'], sessions: [['HIIT', 'mon', '06:30', 45, 15], ['HIIT', 'wed', '06:30', 45, 15], ['HIIT', 'fri', '06:30', 45, 15]] }),
  make('guided-tour', 'Guided tour', 'sessions', 'more', { summary: 'Tours that leave at set times, with a limited number of places.', bestFor: ['Walking tours', 'Museums and heritage sites'], sessions: [['Walking tour', 'sat', '10:00', 120, 15]] }),
  make('boat-trip', 'Boat trip', 'sessions', 'more', { summary: 'Sailings with a set number of places.', bestFor: ['Boat trips', 'Ferry and cruise operators'], sessions: [['Sailing', 'sat', '10:00', 90, 12], ['Sailing', 'sun', '10:00', 90, 12]] }),
  make('escape-room', 'Escape room', 'sessions', 'more', { summary: 'Timed games at fixed times, with a team size as the places.', bestFor: ['Escape rooms', 'Interactive games'], sessions: [['Escape game', 'sat', '11:00', 60, 6], ['Escape game', 'sat', '13:00', 60, 6], ['Escape game', 'sat', '15:00', 60, 6]] }),
  make('restaurant-sittings', 'Restaurant sittings', 'sessions', 'more', { summary: 'Evening sittings, with places for guests at each one.', bestFor: ['Restaurants', 'Pubs serving meals'], sessions: [['Dinner sitting', 'thu', '18:00', 120, 30], ['Dinner sitting', 'fri', '18:00', 120, 30], ['Dinner sitting', 'sat', '18:00', 120, 30]] }),
];

const TEMPLATES = [...MAIN, ...MORE];
const TEMPLATE_IDS = TEMPLATES.map((template) => template.id);
const templateOf = (id) => TEMPLATES.find((template) => template.id === id) || null;

// The short catalogue the booking assistant is given. It picks from these ids only.
const catalogueForAdvisor = () =>
  TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    kind: template.kind,
    summary: template.summary,
    bestFor: template.bestFor,
  }));

module.exports = { TEMPLATES, TEMPLATE_IDS, MAIN_TEMPLATE_IDS: MAIN.map((template) => template.id), templateOf, catalogueForAdvisor, HOURS };
