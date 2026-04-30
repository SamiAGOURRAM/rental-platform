import type { ICarbonFormula, CarbonFormulaInput } from './carbon-formula.interface.js';

/**
 * CO2 savings from not carrying luggage on a flight.
 *
 * Formula:
 *   co2_kg = total_weight_kg × avg_flight_km × emission_factor
 *
 * Sources:
 *   - ICAO emission factor: 0.000255 kg CO2 per kg per km
 *   - Default flight distance: 1500 km (average short-haul)
 */
export class LuggageWeightFormula implements ICarbonFormula {
  readonly name = 'luggage_weight';
  readonly version = 1;

  private readonly EMISSION_FACTOR = 0.000255; // kg CO2 per kg per km
  private readonly DEFAULT_FLIGHT_KM = 1500;

  calculate(inputs: CarbonFormulaInput[]): number {
    const totalWeightKg = inputs.reduce((sum, item) => sum + item.weightGrams / 1000, 0);
    const co2 = totalWeightKg * this.DEFAULT_FLIGHT_KM * this.EMISSION_FACTOR;
    return Math.round(co2 * 1000) / 1000; // 3 decimal places
  }
}

export const luggageWeightFormula = new LuggageWeightFormula();
