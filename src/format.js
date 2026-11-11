const MINUS = '\u2212';

export function num(x, digits = 2) {
  const s = x.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  if (/^-?0$/.test(s)) return '0';
  return s.replace('.', ',').replace('-', MINUS);
}

export const withUnit = (x, unit, digits) => `${num(x, digits)} ${unit}`;

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

export function phase(phi) {
  const k = Math.round(phi / (Math.PI / 12));
  if (Math.abs(phi - k * Math.PI / 12) > 1e-3) return `${num(phi)} rad`;
  if (k === 0) return '0';
  const g = gcd(Math.abs(k), 12), n = Math.abs(k) / g, d = 12 / g;
  const body = (n === 1 ? '' : n) + 'π' + (d === 1 ? '' : '/' + d);
  return (k < 0 ? MINUS : '') + body;
}
