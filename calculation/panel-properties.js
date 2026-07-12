/**
 * Class Panel Properties is used to calculate the properties of panel CLT Layup.
 * Panel properties can calculate
 *  - Shear Analogy Method
 *  - Gamma Method
 * 
 * How to use : 
 * calculate(CLTLayup) => PanelProperties
 */

// Base class for panel properties
class PanelProperties {
    calculate(cltLayup) {
        
    }
}

class ShearAnalogyMethod extends PanelProperties {
    calculate(cltLayup) {
        const layerCount = cltLayup.getLayerCount();
        if (layerCount < 3 || layerCount > 9) {
            throw new Error("Layer count must be between 3 and 9.");
        }
        if (!cltLayup.isSymmetric()) {
            throw new Error("Panel must be symmetric.");
        }

        const layers = cltLayup.getLayers();
        const totalThickness = cltLayup.getTotalThickness();
        const beff = cltLayup.beff || 1000;
        const centerOfPanel = totalThickness / 2;

        let EIeff = 0;
        let layerBreakdown = [];
        let cumulativeThickness = 0;

        for (let layer of layers) {
            const ti = layer.thickness;
            const yi = cumulativeThickness + ti / 2;
            const zi = yi - centerOfPanel;

            let Ei = 0;
            if (layer.angle === 0) {
                Ei = layer.grade.E;
            } else if (layer.angle === 90) {
                Ei = 0;
            }

            const selfInertia = (beff * Math.pow(ti, 3)) / 12;
            const steinerTerm = ti * beff * Math.pow(zi, 2);
            const EI_i = (selfInertia + steinerTerm) * Ei;

            EIeff += EI_i;
            layerBreakdown.push({
                thickness: ti,
                angle: layer.angle,
                EI_i: EI_i
            });

            cumulativeThickness += ti;
        }

        return {
            method: "shear-analogy",
            EIeff: EIeff,
            layerBreakdown: layerBreakdown
        };
    }
}

class GammaMethod extends PanelProperties {
    calculate(cltLayup) {
        // do calculation for Gamma Method
    }
}

