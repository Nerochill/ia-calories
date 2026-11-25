export type UnitSystem = 'metric' | 'imperial';

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

export const cmToInches = (cm: number) => Math.round(cm / CM_PER_INCH);
export const inchesToCm = (inches: number) => inches * CM_PER_INCH;

export const kgToLb = (kg: number) => Math.round(kg / KG_PER_LB);
export const lbToKg = (lb: number) => lb * KG_PER_LB;

/** 67 → 5′ 7″ */
export const formatFeetInches = (inches: number) => `${Math.floor(inches / 12)}′ ${inches % 12}″`;

/** A stored height (cm) in the user's units: "170 cm" or "5′ 7″". */
export const formatHeight = (cm: number, units: UnitSystem) =>
  units === 'imperial' ? formatFeetInches(cmToInches(cm)) : `${Math.round(cm)} cm`;

/** A stored weight (kg) in the user's units: "70 kg" or "154 lb". */
export const formatWeight = (kg: number, units: UnitSystem) =>
  units === 'imperial' ? `${kgToLb(kg)} lb` : `${Math.round(kg)} kg`;
