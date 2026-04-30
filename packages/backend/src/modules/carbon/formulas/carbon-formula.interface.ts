export interface CarbonFormulaInput {
  weightGrams: number;
  categorySlug: string;
}

export interface ICarbonFormula {
  readonly name: string;
  readonly version: number;
  calculate(inputs: CarbonFormulaInput[]): number;
}
