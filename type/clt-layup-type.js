/**
 * Represents a full CLT layup consisting of multiple layers.
 */
class CLTLayupType {
  /**
   * @param {Array<import('./clt-layer-type.js').default>} layers - Array of CLTLayerType instances.
   * @param {number} beff - Effective width of the panel (default 1000mm).
   * @param {number} length - Length of the panel in meters.
   */
  constructor(layers = [], beff = 1000, length = 0) {
    this.name = 'CLT Layup';
    this.layers = layers;
    this.beff = beff;
    this.length = length;
  }

  /**
   * Calculates total thickness of the layup.
   * @returns {number} Sum of thicknesses of all layers.
   */
  getTotalThickness() {
    return this.layers.reduce((sum, layer) => sum + layer.thickness, 0);
  }

  /**
   * @returns {number} Count of layers in the layup.
   */
  getLayerCount() {
    return this.layers.length;
  }

  /**
   * Checks if the layer orientation is symmetric.
   * @returns {boolean} True if symmetric, false otherwise.
   */
  isSymmetric() {
    const angles = this.getLayerAngles();
    const len = angles.length;
    for (let i = 0; i < Math.floor(len / 2); i++) {
      if (angles[i] !== angles[len - 1 - i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * @returns {Array<number>} Array of angles for all layers.
   */
  getLayerAngles() {
    return this.layers.map(layer => layer.angle);
  }
}

export default CLTLayupType;