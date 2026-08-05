/** Digital employee Team/specialty values — keep aligned with project roster DIGITAL_SUB_TYPES. */
export const DIGITAL_EMPLOYEE_SPECIALTIES = [
  "Account Manager",
  "Digital Specialist",
  "Ads Manager",
  "Content Creator",
  "Designer",
  "Video Editor",
  "SEO Expert",
  "Freelancer",
] as const;

export type DigitalEmployeeSpecialty = (typeof DIGITAL_EMPLOYEE_SPECIALTIES)[number];
