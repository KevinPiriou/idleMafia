export type StaffMember = {
  id: string;
  name: string;
  role: string;
  family: string;
  stats: [number, number, number, number];
};

export function defaultStaff(): StaffMember[] {
  return [
    {
      id: "1",
      name: 'Marco "Le Rat" Rossi',
      role: "Soldat",
      family: "Famiglia d'Oro",
      stats: [80, 60, 40, 70],
    },
    {
      id: "2",
      name: 'Luca "La Main" Ferrari',
      role: "Capieri",
      family: "Famiglia del Vino",
      stats: [90, 85, 75, 95],
    },
    {
      id: "3",
      name: 'Giovanni "Blade" Conti',
      role: "Associé",
      family: "Famiglia Smeraldo",
      stats: [50, 95, 30, 45],
    },
    {
      id: "4",
      name: 'Antoine "Le Chat" Dubois',
      role: "Petite frappe",
      family: "Famiglia della Notte",
      stats: [65, 40, 55, 50],
    },
  ];
}
