
export function formatNumber(n: number): string {
    if (!Number.isFinite(n)) return '0';
    const sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    const units = ['','k','M','B','T','Q'];
    const extra: string[] = [];
    for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) extra.push(String.fromCharCode(a) + String.fromCharCode(b));
    const allUnits = units.concat(extra);
    
    let idx = 0;
    while (n >= 1000 && idx < allUnits.length - 1) {
        n /= 1000;
        idx++;
    }
    
    const formatted = idx === 0 ? Math.floor(n).toString() : (Math.floor(n * 100) / 100).toFixed(idx === 0 ? 0 : 2).replace(/\.00$/, '');
    return sign + formatted + allUnits[idx];
}
