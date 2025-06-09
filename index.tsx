
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Interfaces and Types ---
interface Vector {
    magnitude: number;
    angle: number; // In degrees
}

type ScalarData = number[][]; // Grid of temperature values
type VectorData = (Vector | null)[][]; // Grid of vector objects or null for no vector

// --- Constants ---
const GRID_CELL_SIZE = 25; // Size of each cell in the grid in pixels
const GRID_ROWS = 20;      // Number of rows in the grid
const GRID_COLS = 20;      // Number of columns in the grid

// Scalar field (temperature) constants
const MIN_TEMP = 0;
const MAX_TEMP = 40;

// Vector field (wind) constants
const MAX_WIND_SPEED = 20; // Max magnitude for wind vectors
const ARROW_HEAD_SIZE = 6; // Size of the arrowhead in pixels

// --- DOM Elements ---
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let fieldTypeSelect: HTMLSelectElement;
let generateScenarioButton: HTMLButtonElement;
let currentScenarioTypeSpan: HTMLElement;
let tooltipElement: HTMLElement;

// --- Application State ---
let currentFieldType: 'scalar' | 'vector' = 'scalar';
let scalarData: ScalarData = [];
let vectorData: VectorData = [];
let currentScenarioName: string = '';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    canvas = document.getElementById('simulationCanvas') as HTMLCanvasElement;
    fieldTypeSelect = document.getElementById('fieldType') as HTMLSelectElement;
    generateScenarioButton = document.getElementById('generateScenario') as HTMLButtonElement;
    currentScenarioTypeSpan = document.getElementById('current-scenario-type') as HTMLElement;
    tooltipElement = document.getElementById('tooltip') as HTMLElement;

    if (!canvas || !fieldTypeSelect || !generateScenarioButton || !currentScenarioTypeSpan || !tooltipElement) {
        console.error('Essential DOM elements not found!');
        return;
    }

    // Adjust canvas actual size based on grid settings
    canvas.width = GRID_COLS * GRID_CELL_SIZE;
    canvas.height = GRID_ROWS * GRID_CELL_SIZE;

    // Get canvas rendering context
    const context = canvas.getContext('2d');
    if (!context) {
        console.error('Failed to get 2D rendering context');
        return;
    }
    ctx = context;

    // Add event listeners
    fieldTypeSelect.addEventListener('change', handleFieldTypeChange);
    generateScenarioButton.addEventListener('click', generateAndDrawNewScenario);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseout', handleCanvasMouseOut);

    // Initial setup
    generateAndDrawNewScenario();
});

// --- Event Handlers ---

/**
 * Handles changes in the field type selection (Scalar vs. Vector).
 * Regenerates and redraws the scenario for the new field type.
 */
function handleFieldTypeChange(): void {
    currentFieldType = fieldTypeSelect.value as 'scalar' | 'vector';
    generateAndDrawNewScenario();
}

/**
 * Generates data for the currently selected field type and scenario, then redraws the canvas.
 */
function generateAndDrawNewScenario(): void {
    if (currentFieldType === 'scalar') {
        generateScalarFieldData();
    } else {
        generateVectorFieldData();
    }
    draw(); // Redraw the canvas with new data
    updateScenarioInfo();
}

/**
 * Handles mouse movement over the canvas to display tooltips.
 */
function handleCanvasMouseMove(event: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const col = Math.floor(x / GRID_CELL_SIZE);
    const row = Math.floor(y / GRID_CELL_SIZE);

    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        let tooltipText = '';
        if (currentFieldType === 'scalar' && scalarData[row] && scalarData[row][col] !== undefined) {
            tooltipText = `Temp: ${scalarData[row][col].toFixed(1)}°C`;
        } else if (currentFieldType === 'vector' && vectorData[row] && vectorData[row][col]) {
            const vector = vectorData[row][col] as Vector;
            tooltipText = `Wind: ${vector.magnitude.toFixed(1)} m/s, ${vector.angle.toFixed(0)}°`;
        }

        if (tooltipText) {
            tooltipElement.style.opacity = '1';
            // Position tooltip slightly above and to the side of the cursor
            tooltipElement.style.left = `${event.clientX + 10}px`;
            tooltipElement.style.top = `${event.clientY - 20}px`;
            tooltipElement.textContent = tooltipText;
        } else {
            tooltipElement.style.opacity = '0';
        }
    } else {
        tooltipElement.style.opacity = '0';
    }
}

/**
 * Hides the tooltip when the mouse leaves the canvas.
 */
function handleCanvasMouseOut(): void {
    tooltipElement.style.opacity = '0';
}


// --- Data Generation ---

/**
 * Generates data for the scalar field (temperature) based on different probabilistic cases.
 */
function generateScalarFieldData(): void {
    scalarData = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(0));
    const scenarioChoice = Math.random(); // Determines which scenario to generate

    if (scenarioChoice < 0.33) {
        // Case 1: Random noise temperature distribution
        currentScenarioName = "Random Temperature Distribution";
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                scalarData[r][c] = MIN_TEMP + Math.random() * (MAX_TEMP - MIN_TEMP);
            }
        }
    } else if (scenarioChoice < 0.66) {
        // Case 2: Linear temperature gradient
        const gradientDirection = Math.random(); // 0 for horizontal, 1 for vertical
        const startTemp = MIN_TEMP + Math.random() * (MAX_TEMP / 2);
        const endTemp = startTemp + Math.random() * (MAX_TEMP / 2);
        currentScenarioName = `Linear Temperature Gradient (${gradientDirection < 0.5 ? 'Horizontal' : 'Vertical'})`;

        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                let progress: number;
                if (gradientDirection < 0.5) { // Horizontal gradient
                    progress = c / (GRID_COLS > 1 ? GRID_COLS - 1 : 1);
                } else { // Vertical gradient
                    progress = r / (GRID_ROWS > 1 ? GRID_ROWS - 1 : 1);
                }
                scalarData[r][c] = startTemp + (endTemp - startTemp) * progress;
                scalarData[r][c] = Math.max(MIN_TEMP, Math.min(MAX_TEMP, scalarData[r][c])); // Clamp values
            }
        }
    } else {
        // Case 3: Central hot/cold spot
        const spotType = Math.random() < 0.5 ? 'Hot' : 'Cold';
        currentScenarioName = `Central ${spotType} Spot`;
        const centerR = Math.floor(GRID_ROWS / 2);
        const centerC = Math.floor(GRID_COLS / 2);
        const spotStrength = (MAX_TEMP - MIN_TEMP) * 0.8; // How different the spot is
        const baseTemp = MIN_TEMP + (MAX_TEMP - MIN_TEMP) * 0.3 * Math.random();

        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const distance = Math.sqrt(Math.pow(r - centerR, 2) + Math.pow(c - centerC, 2));
                const maxInfluenceRadius = Math.max(GRID_ROWS, GRID_COLS) / 3; // Radius of spot influence
                let influence = Math.max(0, 1 - distance / maxInfluenceRadius);

                if (spotType === 'Hot') {
                    scalarData[r][c] = baseTemp + influence * spotStrength;
                } else {
                    scalarData[r][c] = (baseTemp + spotStrength) - influence * spotStrength;
                }
                scalarData[r][c] = Math.max(MIN_TEMP, Math.min(MAX_TEMP, scalarData[r][c]));
            }
        }
    }
}

/**
 * Generates data for the vector field (wind) based on different probabilistic cases.
 */
function generateVectorFieldData(): void {
    vectorData = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
    const scenarioChoice = Math.random();

    if (scenarioChoice < 0.33) {
        // Case 1: Uniform wind flow in a random direction
        currentScenarioName = "Uniform Wind Flow";
        const commonAngle = Math.random() * 360;
        const commonMagnitude = Math.random() * MAX_WIND_SPEED * 0.5 + MAX_WIND_SPEED * 0.2; // Moderate speed
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                vectorData[r][c] = { magnitude: commonMagnitude, angle: commonAngle };
            }
        }
    } else if (scenarioChoice < 0.66) {
        // Case 2: Simple rotational flow (vortex)
        const direction = Math.random() < 0.5 ? 1 : -1; // 1 for counter-clockwise, -1 for clockwise
        currentScenarioName = `Rotational Flow (${direction === 1 ? 'CCW' : 'CW'})`;
        const centerR = GRID_ROWS / 2 - 0.5; // Center between cells for smoother look
        const centerC = GRID_COLS / 2 - 0.5;
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const dy = r - centerR;
                const dx = c - centerC;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 0.1) { // Avoid issues at the very center
                    vectorData[r][c] = { magnitude: 0, angle: 0 };
                    continue;
                }
                // Angle perpendicular to the line from center to point
                let angle = Math.atan2(dy, dx) * 180 / Math.PI + (90 * direction);
                if (angle < 0) angle += 360;
                if (angle >= 360) angle -= 360;

                const maxDist = Math.max(GRID_ROWS, GRID_COLS) / 2;
                const magnitude = Math.min(MAX_WIND_SPEED, (dist / maxDist) * MAX_WIND_SPEED * 0.8);
                vectorData[r][c] = { magnitude, angle };
            }
        }
    } else {
        // Case 3: Converging or diverging flow
        const flowType = Math.random() < 0.5 ? 'Converging' : 'Diverging';
        currentScenarioName = `${flowType} Wind Flow`;
        const centerR = Math.floor(Math.random() * GRID_ROWS);
        const centerC = Math.floor(Math.random() * GRID_COLS);

        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const dy = r - centerR;
                const dx = c - centerC;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 0.1) {
                     vectorData[r][c] = { magnitude: 0, angle: 0 };
                     continue;
                }

                let angle: number;
                if (flowType === 'Converging') {
                    angle = Math.atan2(-dy, -dx) * 180 / Math.PI; // Points towards center
                } else { // Diverging
                    angle = Math.atan2(dy, dx) * 180 / Math.PI;   // Points away from center
                }
                if (angle < 0) angle += 360;

                // Magnitude decreases with distance from center
                const magnitude = Math.min(MAX_WIND_SPEED, MAX_WIND_SPEED * (1 - dist / Math.max(GRID_ROWS, GRID_COLS)) * 0.9);
                vectorData[r][c] = { magnitude: Math.max(0, magnitude), angle };
            }
        }
    }
}


// --- Drawing Functions ---

/**
 * Main drawing function. Clears the canvas and calls the appropriate field drawing function.
 */
function draw(): void {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f9f9f9'; // Very light grey background for the grid area
    ctx.fillRect(0,0, canvas.width, canvas.height);

    // Draw grid lines for clarity
    ctx.strokeStyle = '#e0e0e0'; // Lighter grid lines
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= GRID_ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * GRID_CELL_SIZE);
        ctx.lineTo(canvas.width, r * GRID_CELL_SIZE);
        ctx.stroke();
    }
    for (let c = 0; c <= GRID_COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * GRID_CELL_SIZE, 0);
        ctx.lineTo(c * GRID_CELL_SIZE, canvas.height);
        ctx.stroke();
    }

    if (currentFieldType === 'scalar') {
        drawScalarField();
    } else {
        drawVectorField();
    }
}

/**
 * Draws the scalar field (temperature) on the canvas.
 * Each cell is colored based on its temperature value.
 */
function drawScalarField(): void {
    if (!scalarData.length) return;

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const temperature = scalarData[r][c];
            ctx.fillStyle = getTemperatureColor(temperature);
            // Draw slightly smaller than cell size to show grid lines
            ctx.fillRect(c * GRID_CELL_SIZE +1 , r * GRID_CELL_SIZE +1, GRID_CELL_SIZE -2, GRID_CELL_SIZE -2);
        }
    }
}

/**
 * Draws the vector field (wind) on the canvas.
 * Each cell has an arrow representing wind magnitude and direction.
 */
function drawVectorField(): void {
    if (!vectorData.length) return;

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const vector = vectorData[r][c];
            if (vector && vector.magnitude > 0.01) { // Only draw if there's significant wind
                const centerX = c * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
                const centerY = r * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
                drawArrow(centerX, centerY, vector.magnitude, vector.angle);
            }
        }
    }
}

/**
 * Helper function to get a color based on temperature.
 * Maps temperature values to a blue (cold) through green/yellow (moderate) to red (hot) color scale.
 * @param temperature The temperature value.
 * @returns A CSS color string.
 */
function getTemperatureColor(temperature: number): string {
    // Normalize temperature to a 0-1 range
    const normalizedTemp = Math.max(0, Math.min(1, (temperature - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)));

    let r, g, b;

    if (normalizedTemp < 0.25) { // Cold: Blue to Cyan
        const t = normalizedTemp / 0.25;
        r = 0;
        g = Math.floor(255 * t);
        b = 255;
    } else if (normalizedTemp < 0.5) { // Cool: Cyan to Green
        const t = (normalizedTemp - 0.25) / 0.25;
        r = 0;
        g = 255;
        b = Math.floor(255 * (1 - t));
    } else if (normalizedTemp < 0.75) { // Warm: Green to Yellow
        const t = (normalizedTemp - 0.5) / 0.25;
        r = Math.floor(255 * t);
        g = 255;
        b = 0;
    } else { // Hot: Yellow to Red
        const t = (normalizedTemp - 0.75) / 0.25;
        r = 255;
        g = Math.floor(255 * (1 - t));
        b = 0;
    }
    return `rgb(${r},${g},${b})`;
}


/**
 * Draws an arrow on the canvas.
 * @param x The starting x-coordinate of the arrow (center of cell).
 * @param y The starting y-coordinate of the arrow (center of cell).
 * @param magnitude The magnitude of the vector (determines arrow length and possibly color/thickness).
 * @param angleDegrees The angle of the vector in degrees (0 degrees is to the right).
 */
function drawArrow(x: number, y: number, magnitude: number, angleDegrees: number): void {
    const angleRad = angleDegrees * Math.PI / 180; // Convert to radians

    // Scale arrow length based on magnitude, ensuring it fits within the cell
    // Max length could be slightly less than half cell size to avoid overlap if centered.
    // Here, we scale it relative to MAX_WIND_SPEED and a fraction of cell size.
    const arrowBaseLength = GRID_CELL_SIZE * 0.4;
    const length = arrowBaseLength * (magnitude / MAX_WIND_SPEED);

    if (length < 1) return; // Don't draw tiny arrows

    const endX = x + length * Math.cos(angleRad);
    const endY = y + length * Math.sin(angleRad);

    ctx.beginPath();
    ctx.strokeStyle = '#333333'; // Dark grey for arrows
    ctx.lineWidth = Math.max(1, Math.min(3, magnitude / MAX_WIND_SPEED * 3)); // Arrow thickness based on magnitude

    // Arrow shaft
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    // Point 1 of arrowhead
    ctx.lineTo(
        endX - ARROW_HEAD_SIZE * Math.cos(angleRad - Math.PI / 6),
        endY - ARROW_HEAD_SIZE * Math.sin(angleRad - Math.PI / 6)
    );
    // Point 2 of arrowhead
    ctx.moveTo(endX, endY); // Move back to the tip
    ctx.lineTo(
        endX - ARROW_HEAD_SIZE * Math.cos(angleRad + Math.PI / 6),
        endY - ARROW_HEAD_SIZE * Math.sin(angleRad + Math.PI / 6)
    );
    ctx.stroke();
}

// --- UI Update Functions ---

/**
 * Updates the displayed current scenario name in the UI.
 */
function updateScenarioInfo(): void {
    if (currentScenarioTypeSpan) {
        currentScenarioTypeSpan.textContent = currentScenarioName || 'N/A';
    }
}
