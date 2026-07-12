import CLTLayupType from './type/clt-layup-type.js';
import CLTLayerType from './type/clt-layer-type.js';
import PanelPropertiesType from './type/panel-properties-type.js';
import CLTLayerPropertiesType from './type/clt-layer-properties-type.js';
import { ShearAnalogyMethod, GammaMethod } from './calculation/panel-properties.js';
import gradeTable from './type/material-grade-type.js';

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
// UI INTERACTION LOGIC
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const calculationForm = document.getElementById('calculationForm');
    const methodSelect = document.getElementById('methodSelect');
    const layerCountInput = document.getElementById('layerCount');
    const layerCountFeedback = document.getElementById('layerCountFeedback');
    const layerInputsContainer = document.getElementById('layerInputs');
    const lengthInputGroup = document.getElementById('lengthInputGroup');
    const lengthInput = document.getElementById('length');
    const resultsPre = document.getElementById('results');

    const materialGrades = Object.keys(gradeTable);

    function generateLayerInputs(count) {
        layerInputsContainer.innerHTML = ''; // Clear existing inputs
        for (let i = 0; i < count; i++) {
            const layerDiv = document.createElement('div');
            layerDiv.classList.add('row', 'mb-2', 'align-items-center');
            layerDiv.innerHTML = `
                <div class="col">
                    <label class="form-label visually-hidden">Layer ${i + 1} Thickness (mm)</label>
                    <input type="number" class="form-control layer-thickness" placeholder="Layer ${i + 1} Thickness (mm)" min="1" value="35" required>
                </div>
                <div class="col">
                    <label class="form-label visually-hidden">Layer ${i + 1} Grade</label>
                    <select class="form-select layer-grade" required>
                        ${materialGrades.map(grade => `<option value="${grade}">${grade}</option>`).join('')}
                    </select>
                </div>
                <div class="col-auto">
                    <span class="layer-angle badge bg-secondary">Angle: ${i % 2 === 0 ? '0' : '90'}°</span>
                </div>
            `;
            layerInputsContainer.appendChild(layerDiv);
        }
    }

    function parseSafeNumber(value) {
        return parseFloat(String(value).replace(',', '.'));
    }

    function validateLayerCount() {
        const method = methodSelect.value;
        const raw = layerCountInput.value;
        const count = parseInt(String(raw).replace(',', '.'), 10);
        if (isNaN(count) || count <= 0) {
            // count is invalid, will be caught below
        }
        let isValid = true;
        let feedbackMessage = '';

        if (method === 'shear-analogy') {
            if (count < 3 || count > 9) {
                isValid = false;
                feedbackMessage = 'Shear Analogy method requires 3 to 9 layers.';
            }
        } else if (method === 'gamma') {
            if (count !== 3 && count !== 5) {
                isValid = false;
                feedbackMessage = 'Gamma method requires 3 or 5 layers.';
            }
        }

        if (!isValid) {
            layerCountInput.classList.add('is-invalid');
            layerCountFeedback.textContent = feedbackMessage;
        } else {
            layerCountInput.classList.remove('is-invalid');
            layerCountFeedback.textContent = '';
        }
        return isValid;
    }

    function updateUI() {
        const method = methodSelect.value;
        const layerCount = parseInt(layerCountInput.value, 10);

        // Toggle Length input visibility
        if (method === 'gamma') {
            lengthInputGroup.style.display = 'block';
            lengthInput.removeAttribute('disabled');
        } else {
            lengthInputGroup.style.display = 'none';
            lengthInput.setAttribute('disabled', 'true');
        }
        
        generateLayerInputs(layerCount);
        validateLayerCount(); // Re-validate when method or count changes
    }

    // Event Listeners
    methodSelect.addEventListener('change', updateUI);
    layerCountInput.addEventListener('input', updateUI);

    // Initial UI setup
    updateUI();

    // Form submission
    calculationForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        if (!validateLayerCount()) {
            resultsPre.textContent = 'Validation error: Please fix the number of layers.';
            return;
        }

        const method = methodSelect.value;
        const length = parseSafeNumber(lengthInput.value);
        if (isNaN(length) || length <= 0) {
            resultsPre.innerHTML = '<div class="alert alert-danger">Error: Length must be a positive number.</div>';
            return;
        }

        const layerThicknessInputs = document.querySelectorAll('.layer-thickness');
        const layerGradeInputs = document.querySelectorAll('.layer-grade');
        const layers = [];

        for (let i = 0; i < layerThicknessInputs.length; i++) {
            const thickness = parseSafeNumber(layerThicknessInputs[i].value);
            if (isNaN(thickness) || thickness <= 0) {
                resultsPre.innerHTML = `<div class="alert alert-danger">Error: Layer ${i + 1} thickness is invalid.</div>`;
                return;
            }
            const grade = layerGradeInputs[i].value;
            const angle = i % 2 === 0 ? 0 : 90;
            layers.push(new CLTLayerType(thickness, angle, grade));
        }

        try {
            const cltLayup = new CLTLayupType(layers, 1000, length);
            const result = calculatePanelProperties(method, cltLayup);
            
            // Format results as an HTML table
            let gammaCol = method === 'gamma' ? '<th>Gamma</th>' : '';
            let html = `
                <div class="alert alert-success">Calculation Successful!</div>
                <div class="table-responsive">
                    <table class="table table-bordered">
                        <tr><th>Method</th><td>${method === 'gamma' ? 'Gamma Method' : 'Shear Analogy'}</td></tr>
                        <tr><th>Effective Stiffness (EIeff)</th><td>${result.EIeff.toLocaleString()} N-mm²/m</td></tr>
                    </table>
                </div>
                <h6 class="mt-4">Layer Breakdown:</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-striped">
                        <thead>
                            <tr><th>Layer</th><th>Thickness</th><th>Angle</th><th>EI_i</th>${gammaCol}</tr>
                        </thead>
                        <tbody>
                            ${result.layerBreakdown.map((l, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${l.thickness} mm</td>
                                    <td>${l.angle}°</td>
                                    <td>${l.EI_i.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                                    ${method === 'gamma' ? `<td>${l.gamma !== null ? l.gamma.toFixed(4) : '-'}</td>` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            resultsPre.innerHTML = html;
        } catch (error) {
            resultsPre.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        }
    });
});

// ==========================================
// VERIFICATION TESTS (moved to an IIFE to prevent global pollution if needed later)
// ==========================================
(async function() {
    // console.log("Starting Verification Tests...\n");

    // // 1. Test Setup: 5-layer symmetric layup (Valid for both methods)
    // const layers5 = [
    //     new CLTLayerType(20, 0, "MGP10"),
    //     new CLTLayerType(20, 90, "MGP10"),
    //     new CLTLayerType(20, 0, "MGP10"),
    //     new CLTLayerType(20, 90, "MGP10"),
    //     new CLTLayerType(20, 0, "MGP10"),
    // ];
    // const layup5 = new CLTLayupType(layers5, 1000, 3.0);

    // console.log("--- Scenario 1: 5-layer Layup (Symmetric) ---");
    
    // try {
    //     const resShear = calculatePanelProperties("shear-analogy", layup5);
    //     console.log(`Shear Analogy Method: ${resShear instanceof PanelPropertiesType ? "INSTANCE OK" : "INSTANCE FAIL"}`);
    //     console.log(`EIeff: ${resShear.EIeff.toFixed(2)}`);
    //     console.log(`Layer[0] Instance: ${resShear.layerBreakdown[0] instanceof CLTLayerPropertiesType ? "OK" : "FAIL"}`);
    // } catch (e) {
    //     console.error(`Shear Analogy Method: FAILED - ${e.message}`);
    // }

    // try {
    //     const resGamma = calculatePanelProperties("gamma", layup5);
    //     console.log(`Gamma Method: ${resGamma instanceof PanelPropertiesType ? "INSTANCE OK" : "INSTANCE FAIL"}`);
    //     console.log(`EIeff: ${resGamma.EIeff.toFixed(2)}`);
    //     console.log(`Layer[0] Instance: ${resGamma.layerBreakdown[0] instanceof CLTLayerPropertiesType ? "OK" : "FAIL"}`);
    // } catch (e) {
    //     console.error(`Gamma Method: FAILED - ${e.message}`);
    // }

    // // 2. Test Setup: 4-layer symmetric layup (Invalid for Gamma Method)
    // const layers4 = [
    //     new CLTLayerType(20, 0, "MGP10"),
    //     new CLTLayerType(20, 90, "MGP10"),
    //     new CLTLayerType(20, 90, "MGP10"),
    //     new CLTLayerType(20, 0, "MGP10"),
    // ];
    // const layup4 = new CLTLayupType(layers4, 1000, 3.0);

    // console.log("\n--- Scenario 2: 4-layer Layup (Symmetric) ---");
    // try {
    //     calculatePanelProperties("gamma", layup4);
    //     console.error("Gamma Method: FAILED (Should have thrown an error for 4 layers)");
    // } catch (e) {
    //     // console.log(`Gamma Method: SUCCESS (Caught expected error: ${e.message})`);
    // }

    // console.log("\nVerification Complete.");
})();