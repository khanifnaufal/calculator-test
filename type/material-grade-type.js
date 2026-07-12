/**
 * Lookup table for CLT material grades.
 * Units:
 * - E: Modulus of Elasticity parallel to grain (MPa)
 * - E90: Modulus of Elasticity perpendicular to grain (MPa)
 * - G: Shear Modulus in-plane (MPa)
 * - G90: Shear Modulus out-of-plane (MPa)
 */
const gradeTable = {
  MGP10: { E: 1100, E90: 110, G: 687.5, G90: 62.5 },
  MGP12: { E: 1100, E90: 110, G: 687.5, G90: 62.5 },
};

export default gradeTable;