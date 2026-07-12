import gradeTable from './material-grade-type.js';

/**
 * Represents a single layer in a CLT (Cross Laminated Timber) panel.
 */
class CLTLayerType {
  /**
   * @param {number} thickness - Thickness of the layer in mm.
   * @param {number} angle - Angle of the layer (must be 0 or 90 degrees).
   * @param {string} grade - Material grade (e.g., "MGP10").
   * @throws {Error} If thickness is not positive, angle is not 0/90, or grade is not in gradeTable.
   */
  constructor(thickness, angle, grade) {
    if (typeof thickness !== 'number' || thickness <= 0) {
      throw new Error("Thickness must be a positive number.");
    }
    if (angle !== 0 && angle !== 90) {
      throw new Error("Angle must be 0 or 90.");
    }
    if (typeof grade !== 'string' || !gradeTable.hasOwnProperty(grade)) {
      throw new Error(`Invalid grade: ${grade}. Must be one of ${Object.keys(gradeTable).join(', ')}.`);
    }

    this.thickness = thickness;
    this.angle = angle;
    this.grade = grade;
  }

  /**
   * @returns {number} The thickness of the layer in mm.
   */
  getThickness() {
    return this.thickness;
  }

  /**
   * @returns {number} The angle of the layer (0 or 90).
   */
  getAngle() {
    return this.angle;
  }

  /**
   * @returns {string} The material grade of the layer.
   */
  getGrade() {
    return this.grade;
  }
}

export default CLTLayerType;