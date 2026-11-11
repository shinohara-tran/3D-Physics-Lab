// SGK formulas, all SI (m, kg, s, rad).
export const omegaSpring = (k, m) => Math.sqrt(k / m);
export const omegaPendulum = (g, l) => Math.sqrt(g / l);
export const period = (omega) => 2 * Math.PI / omega;
export const frequency = (omega) => omega / (2 * Math.PI);
export const vMax = (omega, A) => omega * A;
export const aMax = (omega, A) => omega * omega * A;
export const energy = (m, omega, A) => 0.5 * m * omega * omega * A * A;
export const kinetic = (m, omega, A, x) => 0.5 * m * omega * omega * (A * A - x * x);
export const potential = (m, omega, x) => 0.5 * m * omega * omega * x * x;
export const staticStretch = (m, g, k) => m * g / k;

export function fromInitial(x0, v0, omega) {
  const A = Math.hypot(x0, v0 / omega);
  let phi = Math.atan2(-v0 / omega, x0);
  if (phi === -Math.PI) phi = Math.PI;
  return { A, phi };
}

export const positionAt = (A, omega, phi, t) => A * Math.cos(omega * t + phi);
export const velocityAt = (A, omega, phi, t) => -A * omega * Math.sin(omega * t + phi);
export const accelAt = (A, omega, phi, t) => -A * omega * omega * Math.cos(omega * t + phi);

// Forced oscillation steady state; b = damping coefficient (N·s/m).
export const steadyAmplitude = (F0, m, omega0, b, Omega) =>
  (F0 / m) / Math.hypot(omega0 * omega0 - Omega * Omega, b * Omega / m);
