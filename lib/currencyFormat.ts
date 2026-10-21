/**
 * Utilitários para formatação e manipulação de valores monetários em Real (BRL).
 * Implementa máscara em tempo real com separador de milhar (.) e duas casas decimais (,00).
 */

/**
 * Converte um número ou string numérica para o formato BRL "1.234,56".
 */
export function formatCurrencyBRL(value: number | string | null | undefined, keepEmpty = false): string {
  if (value === null || value === undefined || value === '') {
    return keepEmpty ? '' : '0,00';
  }

  const num = typeof value === 'number' ? value : parseCurrencyBRL(value);
  if (isNaN(num)) return keepEmpty ? '' : '0,00';

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Converte uma string formatada em BRL (ex: "1.234,56") ou número para float numérico puro (ex: 1234.56).
 */
export function parseCurrencyBRL(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  const str = String(value).trim();
  if (!str) return 0;

  // Se já for um formato numérico padrão tipo "1234.56" sem vírgula
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Se contiver vírgula e pontos (ex: "1.234,56") ou apenas vírgula (ex: "1234,56")
  const cleaned = str
    .replace(/[^\d,-]/g, '') // remove tudo exceto dígitos, vírgula e hífen
    .replace(',', '.');      // troca vírgula decimal por ponto

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Aplica a máscara monetária BRL enquanto o usuário digita no input.
 * Exemplo de digitação contínua:
 * "1"      -> "0,01"
 * "12"     -> "0,12"
 * "123"    -> "1,23"
 * "1234"   -> "12,34"
 * "12345"  -> "123,45"
 * "123456" -> "1.234,56"
 */
export function maskCurrencyInput(rawValue: string): string {
  if (!rawValue) return '';

  // Remove qualquer caracter não numérico
  const onlyDigits = rawValue.replace(/\D/g, '');

  if (!onlyDigits) return '';

  // Limita a 14 dígitos (até centenas de bilhões) para evitar overflow
  const trimmedDigits = onlyDigits.slice(0, 14);

  // Converte os dígitos inteiros em centavos
  const cents = parseInt(trimmedDigits, 10);
  if (isNaN(cents) || cents === 0) return '0,00';

  const floatVal = cents / 100;

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(floatVal);
}

/**
 * Trata texto colado pelo usuário de forma inteligente.
 * Se o usuário colar "1500", entende-se 1500,00.
 * Se colar "1500,50", "1.500,50" ou "1500.50", converte para "1.500,50".
 */
export function parsePastedCurrency(pastedText: string): string {
  const clean = pastedText.trim();
  if (!clean) return '';

  // Se for apenas dígitos simples sem pontuação (ex: "1500")
  if (/^\d+$/.test(clean)) {
    const val = parseInt(clean, 10);
    return formatCurrencyBRL(val, true);
  }

  // Se tiver formato brasileiro com vírgula e ponto (ex: "1.500,50" ou "1500,50")
  if (clean.includes(',')) {
    const num = parseCurrencyBRL(clean);
    return formatCurrencyBRL(num, true);
  }

  // Se tiver formato com ponto decimal (ex: "1500.50")
  if (clean.includes('.')) {
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      return formatCurrencyBRL(num, true);
    }
  }

  // Caso padrão: usa a máscara de dígitos
  return maskCurrencyInput(clean);
}
