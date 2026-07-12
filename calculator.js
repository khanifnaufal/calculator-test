import CLTLayupType from './type/clt-layup-type.js';
import CLTLayerType from './type/clt-layer-type.js';
import PanelPropertiesType from './type/panel-properties-type.js';
import CLTLayerPropertiesType from './type/clt-layer-properties-type.js';
import { ShearAnalogyMethod, GammaMethod } from './calculation/panel-properties.js';

/**
 * Core calculator function to determine panel properties based on method choice.
 * @param {string} method - "gamma" or "shear-analogy"
 * @param {CLTLayupType} cltLayup - The layup configuration
 * @returns {PanelPropertiesType} The calculation result
 * @throws {Error} Propagation of validation errors from the method
 */
function calculatePanelProperties(method, cltLayup) {
    const calculator = method === "gamma" ? new GammaMethod() : new ShearAnalogyMethod();
    return calculator.calculate(cltLayup);
}

// ==========================================
// VERIFICATION TESTS
// ==========================================

async function runVerification() {
    console.log("Starting Verification Tests...\n");

    // 1. Test Setup: 5-layer symmetric layup (Valid for both methods)
    const layers5 = [
        new CLTLayerType(20, 0, "MGP10"),
        new CLTLayerType(20, 90, "MGP10"),
        new CLTLayerType(20, 0, "MGP10"),
        new CLTLayerType(20, 90, "MGP10"),
        new CLTLayerType(20, 0, "MGP10"),
    ];
    const layup5 = new CLTLayupType(layers5, 1000, 3.0);

    console.log("--- Scenario 1: 5-layer Layup (Symmetric) ---");
    
    try {
        const resShear = calculatePanelProperties("shear-analogy", layup5);
        console.log(`Shear Analogy Method: ${resShear instanceof PanelPropertiesType ? "INSTANCE OK" : "INSTANCE FAIL"}`);
        console.log(`EIeff: ${resShear.EIeff.toFixed(2)}`);
        console.log(`Layer[0] Instance: ${resShear.layerBreakdown[0] instanceof CLTLayerPropertiesType ? "OK" : "FAIL"}`);
    } catch (e) {
        console.error(`Shear Analogy Method: FAILED - ${e.message}`);
    }

    try {
        const resGamma = calculatePanelProperties("gamma", layup5);
        console.log(`Gamma Method: ${resGamma instanceof PanelPropertiesType ? "INSTANCE OK" : "INSTANCE FAIL"}`);
        console.log(`EIeff: ${resGamma.EIeff.toFixed(2)}`);
        console.log(`Layer[0] Instance: ${resGamma.layerBreakdown[0] instanceof CLTLayerPropertiesType ? "OK" : "FAIL"}`);
    } catch (e) {
        console.error(`Gamma Method: FAILED - ${e.message}`);
    }

    // 2. Test Setup: 4-layer symmetric layup (Invalid for Gamma Method)
    const layers4 = [
        new CLTLayerType(20, 0, "MGP10"),
        new CLTLayerType(20, 90, "MGP10"),
        new CLTLayerType(20, 90, "MGP10"),
        new CLTLayerType(20, 0, "MGP10"),
    ];
    const layup4 = new CLTLayupType(layers4, 1000, 3.0);

    console.log("\n--- Scenario 2: 4-layer Layup (Symmetric) ---");
    try {
        calculatePanelProperties("gamma", layup4);
        console.error("Gamma Method: FAILED (Should have thrown an error for 4 layers)");
    } catch (e) {
        console.log(`Gamma Method: SUCCESS (Caught expected error: ${e.message})`);
    }

    console.log("\nVerification Complete.");
}

// Execute verification
runVerification().catch(console.error);