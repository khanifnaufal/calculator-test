class PanelPropertiesType {
    /**
     * @param {string} method - Calculation method name (e.g. "shear-analogy", "gamma")
     * @param {number} EIeff - Effective bending stiffness (N-mm² per meter width)
     * @param {Array<import('./clt-layer-properties-type.js').default>} layerBreakdown - Array of CLTLayerPropertiesType
     */
    constructor(method, EIeff, layerBreakdown) {
        this.method = method;
        this.EIeff = EIeff;
        this.layerBreakdown = layerBreakdown;
    }
}

export default PanelPropertiesType;