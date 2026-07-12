class CLTLayerPropertiesType {
    /**
     * @param {number} thickness - Layer thickness in mm
     * @param {number} angle - Layer angle (0 or 90)
     * @param {number} EI_i - Bending stiffness contribution of this layer (N-mm²)
     * @param {number|null} [gamma=null] - Gamma factor (only relevant for Gamma Method on longitudinal layers, null otherwise)
     */
    constructor(thickness, angle, EI_i, gamma = null) {
        this.thickness = thickness;
        this.angle = angle;
        this.EI_i = EI_i;
        this.gamma = gamma;
    }
}

export default CLTLayerPropertiesType;