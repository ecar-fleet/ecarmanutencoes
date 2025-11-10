import { describe, it, expect } from 'vitest'
import { comparePdfToExcel } from '../comparator'

describe('comparePdfToExcel', () => {
  it('matches exact row (happy path)', () => {
    const parsed = { veiculo: { placa: 'ABC1234', modelo: 'Fiat Uno', ano: '2018', km_atual: '12000', chassi: 'CHASSI123' } };
    const columns = ['Veículo', 'Modelo do veículo', 'Ano', 'Km', 'Chassi'];
    const row = { 'Veículo': 'ABC1234', 'Modelo do veículo': 'Fiat Uno', 'Ano': '2018', 'Km': '12000', 'Chassi': 'CHASSI123' };
    const res = comparePdfToExcel(parsed, [row], columns, { placa: 'Veículo', modelo: 'Modelo do veículo', ano: 'Ano', km_atual: 'Km', chassi: 'Chassi' });

    expect(res.best_match_row_index).toBe(0);
    // full score expected: 5 + 3 + 2 + 1 + 2 = 13
    expect(res.match_score).toBe(13);
    expect(res.field_scores.placa.matched).toBe(true);
    expect(res.field_scores.modelo.matched).toBe(true);
  })

  it('detects placa mismatch and reports it in sample differences', () => {
    const parsed = { veiculo: { placa: 'ABC123X', modelo: 'Fiat Uno', ano: '2018', km_atual: '12000', chassi: 'CHASSI123' } };
    const columns = ['Veículo', 'Modelo do veículo', 'Ano', 'Km', 'Chassi'];
    const row = { 'Veículo': 'ABC1234', 'Modelo do veículo': 'Fiat Uno', 'Ano': '2018', 'Km': '12000', 'Chassi': 'CHASSI123' };
    const res = comparePdfToExcel(parsed, [row], columns, { placa: 'Veículo', modelo: 'Modelo do veículo', ano: 'Ano', km_atual: 'Km', chassi: 'Chassi' });

    expect(res.best_match_row_index).toBe(0);
    // placa mismatch -> score should be less than full 13
    expect(res.match_score).toBeLessThan(13);
    expect(res.sample_differences.some((d: any) => d.field === 'placa')).toBe(true);
  })

  it('handles modelo substring matches', () => {
    const parsed = { veiculo: { placa: 'ZZZ0000', modelo: 'Uno', ano: '2018', km_atual: '12000', chassi: 'CHASSI123' } };
    const columns = ['Veículo', 'Modelo do veículo', 'Ano', 'Km', 'Chassi'];
    const row = { 'Veículo': 'ZZZ0000', 'Modelo do veículo': 'Fiat Uno 1.0', 'Ano': '2018', 'Km': '12000', 'Chassi': 'CHASSI123' };
    const res = comparePdfToExcel(parsed, [row], columns, { placa: 'Veículo', modelo: 'Modelo do veículo', ano: 'Ano', km_atual: 'Km', chassi: 'Chassi' });

    expect(res.best_match_row_index).toBe(0);
    // modelo is substring -> matched
    expect(res.field_scores.modelo.matched).toBe(true);
  })
})
