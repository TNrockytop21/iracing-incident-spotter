const DRIVERS = [
  { name: 'Max Verstappen', num: '1' },
  { name: 'Lewis Hamilton', num: '44' },
  { name: 'Charles Leclerc', num: '16' },
  { name: 'Lando Norris', num: '4' },
  { name: 'Oscar Piastri', num: '81' },
  { name: 'George Russell', num: '63' },
  { name: 'Carlos Sainz', num: '55' },
  { name: 'Fernando Alonso', num: '14' },
  { name: 'Sergio Perez', num: '11' },
  { name: 'Pierre Gasly', num: '10' },
  { name: 'Esteban Ocon', num: '31' },
  { name: 'Yuki Tsunoda', num: '22' },
  { name: 'Lance Stroll', num: '18' },
  { name: 'Alex Albon', num: '23' },
  { name: 'Nico Hulkenberg', num: '27' },
  { name: 'Valtteri Bottas', num: '77' },
  { name: 'Kevin Magnussen', num: '20' },
  { name: 'Daniel Ricciardo', num: '3' },
  { name: 'Zhou Guanyu', num: '24' },
  { name: 'Logan Sargeant', num: '2' },
];

const DELTAS = [
  { delta: 1, weight: 6 },
  { delta: 2, weight: 3 },
  { delta: 4, weight: 1 },
];

function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[0];
}

let seq = 0;
const totals = new Map();

export function generateFakeIncident(secondsAgo = Math.floor(Math.random() * 1800)) {
  const driver = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
  const { delta } = weightedPick(DELTAS);
  const prevTotal = totals.get(driver.num) ?? 0;
  const newCount = prevTotal + delta;
  totals.set(driver.num, newCount);

  const baseSessionTime = 1200 + Math.floor(Math.random() * 3600);
  const detectedAt = Date.now() - secondsAgo * 1000;

  seq += 1;
  return {
    id: `demo-${Date.now()}-${seq}`,
    carIdx: Number(driver.num),
    userName: driver.name,
    carNumber: driver.num,
    delta,
    category: delta >= 4 ? 4 : delta >= 2 ? 2 : 1,
    newCount,
    sessionTime: baseSessionTime - secondsAgo,
    sessionNum: 0,
    detectedAt,
  };
}

export function generateFakeBatch(count = 15) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(generateFakeIncident(Math.floor(Math.random() * 900)));
  }
  return out.sort((a, b) => b.detectedAt - a.detectedAt);
}

export function resetFakeState() {
  seq = 0;
  totals.clear();
}
