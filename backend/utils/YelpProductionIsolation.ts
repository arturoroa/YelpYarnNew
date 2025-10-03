// Archivo de compatibilidad para código que usa YelpProductionIsolation
import { ProductionIsolation } from './ProductionIsolation.js';

// Simplemente re-exporta ProductionIsolation con el nombre YelpProductionIsolation
export const YelpProductionIsolation = ProductionIsolation;
export default ProductionIsolation;

