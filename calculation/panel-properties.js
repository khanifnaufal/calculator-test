/**
 * Class Panel Properties is used to calculate the properties of panel CLT Layup.
 * Panel properties can calculate
 *  - Shear Analogy Method
 *  - Gamma Method
 * 
 * How to use : 
 * calculate(CLTLayup) => PanelProperties
 */

import gradeTable from '../type/material-grade-type.js';

/**
 * Kelas dasar (base class) untuk perhitungan properti panel CLT.
 * 
 * Class ini berfungsi sebagai kontrak/interface — semua class turunan WAJIB
 * mengimplementasikan method calculate(cltLayup) yang mengembalikan
 * objek PanelPropertiesType { method, EIeff, layerBreakdown }.
 * 
 * @abstract
 */
export class PanelProperties {
    calculate(cltLayup) {
        // Tidak ada implementasi di base class — subclass harus override.
    }
}

/**
 * METODE SHEAR ANALOGY — perhitungan kekakuan lentur efektif (EIeff) panel CLT.
 * 
 * Referensi: proHolz Austria, "Cross-Laminated Timber – Structural Design",
 * Vol.1 Section 4.1.3 (Shear Analogy Method).
 * 
 * Prinsip dasar:
 *   - Hanya layer longitudinal (serat searah bentang, angle=0°) yang menyumbang
 *     kekakuan lentur. Layer transversal (angle=90°) dianggap tidak memberikan
 *     kontribusi langsung (Ei = 0).
 *   - Metode ini menggunakan teorema sumbu sejajar (parallel axis theorem) untuk
 *     menghitung momen inersia total terhadap sumbu netral penampang.
 *   - Berlaku untuk panel dengan jumlah layer 3–9 dan susunan yang simetris.
 * 
 * Batasan:
 *   - Panel harus simetris terhadap sumbu tengahnya (isSymmetric() === true).
 *   - Jumlah layer minimal 3, maksimal 9 (sesuai tipikal panel CLT komersial).
 */
export class ShearAnalogyMethod extends PanelProperties {
    /**
     * Menghitung EIeff panel CLT menggunakan metode Shear Analogy.
     * 
     * @param {import('../type/clt-layup-type.js').default} cltLayup - Objek layup CLT
     *        yang berisi daftar layer, lebar efektif (beff), dan panjang bentang (length).
     * @returns {Object} PanelPropertiesType dengan properti:
     *   - method: "shear-analogy"
     *   - EIeff: kekakuan lentur efektif total (N-mm² per meter lebar)
     *   - layerBreakdown: array objek { thickness, angle, EI_i } tiap layer
     * @throws {Error} Jika jumlah layer < 3 atau > 9.
     * @throws {Error} Jika panel tidak simetris.
     */
    calculate(cltLayup) {
        const layerCount = cltLayup.getLayerCount();
        // Batasan metode: hanya berlaku untuk 3–9 layer sesuai tipikal panel CLT
        if (layerCount < 3 || layerCount > 9) {
            throw new Error("Layer count must be between 3 and 9.");
        }
        // Panel harus simetris agar sumbu netral berada di tengah penampang
        if (!cltLayup.isSymmetric()) {
            throw new Error("Panel must be symmetric.");
        }

        const layers = cltLayup.getLayers();
        const totalThickness = cltLayup.getTotalThickness();
        // Lebar efektif (mm) — default 1000 mm (per meter lebar panel)
        const beff = cltLayup.beff || 1000;
        // Posisi sumbu netral panel = setengah dari tebal total (karena simetris)
        const centerOfPanel = totalThickness / 2;

        let EIeff = 0;
        let layerBreakdown = [];
        // cumulativeThickness: akumulasi tebal layer untuk menghitung posisi yi tiap layer
        let cumulativeThickness = 0;

        for (let layer of layers) {
            const ti = layer.thickness;
            // yi = jarak dari permukaan atas panel ke titik tengah (centroid) layer ini
            const yi = cumulativeThickness + ti / 2;
            // zi = jarak dari centroid layer ke sumbu netral panel (untuk teorema sumbu sejajar)
            const zi = yi - centerOfPanel;

            const gradeProps = gradeTable[layer.grade];
            let Ei = 0;
            if (layer.angle === 0) {
                // Layer longitudinal (searah bentang): pakai modulus elastisitas E
                Ei = gradeProps ? gradeProps.E : 0;
            } else if (layer.angle === 90) {
                // Layer transversal: tidak menyumbang kekakuan lentur → Ei = 0
                Ei = 0;
            }

            // selfInertia = momen inersia layer terhadap centroid-nya sendiri (I_local)
            const selfInertia = (beff * Math.pow(ti, 3)) / 12;
            // steinerTerm = A * d² — kontribusi teorema sumbu sejajar (parallel axis theorem)
            // A = ti * beff (luas penampang layer), d = zi (jarak ke sumbu netral)
            const steinerTerm = ti * beff * Math.pow(zi, 2);
            // EI_i = kekakuan lentur layer ini = (I_local + I_steiner) * E_layer
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

/**
 * METODE GAMMA (γ-method) — perhitungan kekakuan lentur efektif panel CLT
 * menggunakan teori sambungan mekanis dengan faktor efisiensi gamma.
 * 
 * Referensi:
 *   - proHolz Austria, "Cross-Laminated Timber – Structural Design",
 *     Vol.1 Section 4.2 (Gamma Method / γ-Method).
 *   - Eurocode 5 (EN 1995-1-1) Annex B — "Mechanically jointed beams".
 * 
 * Prinsip dasar:
 *   - Hanya layer longitudinal (serat searah bentang, angle=0°) yang diperhitungkan
 *     sebagai elemen struktur yang memiliki kekakuan lentur.
 *   - Layer transversal (angle=90°) berperan sebagai "penyambung" (connector) di
 *     antara layer longitudinal, dengan modulus geser rolling shear (G90).
 *   - Efektivitas sambungan antar layer diwakili oleh faktor gamma (γ_i):
 *       γ = 1/(1 + π²·Eᵢ·tᵢ / (dᵢ·Gcrossᵢ·L²))
 *     Semakin γ mendekati 1, semakin kaku sambungannya (komposit penuh).
 *   - Layer tengah (paling tengah dalam urutan) selalu γ = 1.
 * 
 * Batasan:
 *   - Hanya berlaku untuk panel dengan jumlah layer PERSIS 3 atau 5 layer.
 *   - Panel dengan 7 layer atau lebih tidak didukung oleh metode ini.
 */
export class GammaMethod extends PanelProperties {
    /**
     * Menghitung EIeff panel CLT menggunakan Gamma Method.
     * 
     * Alur perhitungan:
     *   1. Hitung posisi sumbu netral (Yna) dari rata-rata berbobot Ei·Ai·yi.
     *   2. Hitung faktor gamma (γ_i) untuk tiap layer longitudinal.
     *   3. Hitung EI_i = (I_self + γ_i · I_steiner) · E_i.
     *   4. Jumlahkan seluruh EI_i untuk mendapatkan EIeff total.
     * 
     * @param {import('../type/clt-layup-type.js').default} cltLayup - Objek layup CLT
     *        yang berisi daftar layer, lebar efektif (beff), dan panjang bentang (length).
     * @returns {Object} PanelPropertiesType dengan properti:
     *   - method: "gamma"
     *   - EIeff: kekakuan lentur efektif total (N-mm² per meter lebar)
     *   - layerBreakdown: array objek { thickness, angle, gamma?, EI_i } tiap layer
     * @throws {Error} Jika jumlah layer bukan 3 atau 5.
     */
    calculate(cltLayup) {
        const layerCount = cltLayup.getLayerCount();
        // Gamma Method hanya dirancang untuk layup 3 atau 5 layer
        if (layerCount !== 3 && layerCount !== 5) {
            throw new Error("Gamma Method only supports layups with exactly 3 or 5 layers.");
        }

        const layers = cltLayup.getLayers();
        const beff = cltLayup.beff || 1000;
        // Lref = panjang bentang dalam mm (length dari CLTLayup dalam meter)
        const Lref = cltLayup.length * 1000; // Span in mm

        /**
         * === LANGKAH 1: Hitung posisi sumbu netral (Yna) ===
         * 
         * Sumbu netral dihitung sebagai rata-rata berbobot (weighted average)
         * dari posisi tiap layer longitudinal, dengan bobot = Ei * Ai.
         * Rumus: Yna = Σ(Ei·Ai·yi) / Σ(Ei·Ai)
         * 
         * Hanya layer 0° yang diperhitungkan karena layer 90° tidak berkontribusi
         * terhadap kekakuan lentur (Ei = 0).
         */
        const longitudinalLayers = [];
        let cumulativeThickness = 0;
        // sumEiAiYi = Σ(Ei * Ai * yi) — pembilang rata-rata berbobot
        let sumEiAiYi = 0;
        // sumEiAi = Σ(Ei * Ai) — penyebut rata-rata berbobot
        let sumEiAi = 0;

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            const ti = layer.thickness;
            // yi = jarak dari tepi atas panel ke centroid layer ini
            const yi = cumulativeThickness + ti / 2;
            
            if (layer.angle === 0) {
                const gradeProps = gradeTable[layer.grade];
                const Ei = gradeProps ? gradeProps.E : 0;
                // Ai = luas penampang layer per meter lebar
                const Ai = beff * ti;
                
                longitudinalLayers.push({
                    index: i,
                    layer: layer,
                    Ei: Ei,
                    ti: ti,
                    yi: yi,
                    Ai: Ai
                });
                
                sumEiAiYi += Ei * Ai * yi;
                sumEiAi += Ei * Ai;
            }
            cumulativeThickness += ti;
        }

        // Yna = posisi sumbu netral dari tepi atas panel
        const Yna = sumEiAi === 0 ? 0 : sumEiAiYi / sumEiAi;

        /**
         * === LANGKAH 2: Hitung gamma, ai, dan EI_i tiap layer longitudinal ===
         * 
         * - ai = jarak centroid layer ke sumbu netral (Yna)
         * - gamma_i: faktor efisiensi sambungan.
         *   Layer TENGAH selalu gamma = 1 (tidak ada pengurangan).
         *   Layer LUAR dihitung dengan rumus gamma dari Eurocode 5 Annex B.
         * - selfInertia = momen inersia lokal layer.
         * - steinerTerm = kontribusi sumbu sejajar dikalikan gamma.
         * - EI_i = (selfInertia + gamma * steinerTerm) * Ei.
         */
        let EIeff = 0;
        let layerBreakdown = [];

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            const ti = layer.thickness;
            
            if (layer.angle === 0) {
                const longLayerData = longitudinalLayers.find(l => l.index === i);
                const Ei = longLayerData.Ei;
                const yi = longLayerData.yi;
                // ai = jarak dari centroid layer ke sumbu netral (bisa positif/negatif)
                const ai = yi - Yna;
                
                let gamma_i = 1;
                // Layer TENGAH (posisi persis di tengah urutan) selalu gamma = 1
                // karena tidak ada efek "slip" pada sambungan di posisi ini
                const isMiddle = (i === Math.floor(layers.length / 2));
                
                if (!isMiddle) {
                    // Layer LUAR: cari layer 90° penyambung yang bersebelahan
                    let adjIndex = -1;
                    if (i === 0) adjIndex = 1;       // layer pertama → penyambung setelahnya
                    else if (i === layers.length - 1) adjIndex = layers.length - 2; // layer terakhir → penyambung sebelumnya
                    
                    if (adjIndex !== -1 && adjIndex < layers.length) {
                        const adjLayer = layers[adjIndex];
                        const adjGradeProps = gradeTable[adjLayer.grade];
                        // t90 = tebal layer penyambung (layer 90 derajat)
                        const t90 = adjLayer.thickness;
                        // Gcross_i = modulus rolling shear (G90) dari layer penyambung
                        const Gcross_i = adjGradeProps ? adjGradeProps.G90 : 0;
                        // di = beff / tebal layer penyambung — parameter jarak sambungan
                        const di = beff / t90;
                        
                        /**
                         * Rumus gamma dari Eurocode 5 Annex B:
                         * γ = 1 / (1 + π² · Eᵢ · tᵢ / (dᵢ · Gcrossᵢ · L²))
                         * 
                         * Semakin besar nilai penyebut → gamma semakin kecil → sambungan
                         * lebih fleksibel (komposit parsial).
                         * Semakin gamma mendekati 1 → sambungan semakin kaku
                         * (mendekati komposit penuh / fully composite).
                         */
                        gamma_i = 1 / (1 + (Math.PI**2 * Ei * ti) / (di * Gcross_i * Lref**2));
                    }
                }
                
                // selfInertia = momen inersia lokal layer terhadap centroid-nya sendiri
                const selfInertia = (beff * Math.pow(ti, 3)) / 12;
                // steinerTerm = A * ai² — kontribusi sumbu sejajar (dikali gamma)
                const steinerTerm = ti * beff * Math.pow(ai, 2);
                // EI_i = (I_local + gamma * I_steiner) * E — kekakuan lentur efektif layer
                const EI_i = (selfInertia + gamma_i * steinerTerm) * Ei;
                
                EIeff += EI_i;
                layerBreakdown.push({
                    thickness: ti,
                    angle: layer.angle,
                    gamma: gamma_i,
                    EI_i: EI_i
                });
            } else {
                /**
                 * Layer 90° (transversal/penyambung):
                 * Dalam Gamma Method, layer ini tidak dihitung sebagai elemen struktur
                 * yang menyumbang kekakuan lentur. Perannya hanya sebagai "penyambung"
                 * yang mentransfer geser antar layer longitudinal.
                 * Kontribusinya sudah diakomodasi melalui faktor gamma dan Gcross.
                 */
                layerBreakdown.push({
                    thickness: ti,
                    angle: layer.angle,
                    EI_i: 0
                });
            }
        }

        return {
            method: "gamma",
            EIeff: EIeff,
            layerBreakdown: layerBreakdown
        };
    }
}