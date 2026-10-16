// Printable chart report (HTML, printed to PDF by the system). Light colors
// for paper; the wheel is the same geometry as on screen. AGPL-3.0-or-later.

import { ChartResult } from '../astro/engine';
import {
  aspectPoints,
  chartDignities,
  computeLots,
  findAspects,
  isDayChart,
  rulersAt,
} from '../astro/traditional';
import { starContacts } from '../astro/synastry';
import type { ChartInfo } from './ChartScreen';
import { wheelSvg } from './ChartWheel';
import { houseSystemName } from './houseSystems';
import {
  ASPECT_NAMES,
  colors,
  DIGNITY_NAMES,
  formatDegree,
  formatLongitude,
  LOT_NAMES,
  POINT_NAMES,
} from './theme';

const paper: typeof colors = {
  ...colors,
  navy: '#FFFFFF',
  navyRaised: '#F6F2E7',
  navyInput: '#FFFFFF',
  line: '#B9B3A2',
  text: '#0B1530',
  muted: '#5B6480',
  gold: '#9A7A2C',
  goldText: '#FFFFFF',
  error: '#B4483C',
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function table(title: string, rows: string[][]): string {
  if (rows.length === 0) {
    return '';
  }
  const body = rows
    .map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<h2>${esc(title)}</h2><table>${body}</table>`;
}

export function chartReportHtml(info: ChartInfo, houseSystem: string): string {
  const chart: ChartResult = info.chart;
  const houses = chart.houses;
  const parts: string[] = [];

  parts.push(`<h1>${esc(info.title)}</h1>`);
  for (const l of info.lines) {
    parts.push(`<p class="sub">${esc(l)}</p>`);
  }
  if (houses) {
    parts.push(
      `<p class="sub">${esc(
        `${
          isDayChart(chart) ? 'خريطة نهارية' : 'خريطة ليلية'
        } · نظام البيوت: ${houseSystemName(houseSystem)}`,
      )}</p>`,
    );
  }
  parts.push(
    `<div class="wheel" dir="ltr">${wheelSvg({
      chart,
      size: 520,
      palette: paper,
    })}</div>`,
  );

  parts.push(
    table(
      'الكواكب',
      chart.bodies.map(b => [
        POINT_NAMES[b.key] ?? b.key,
        formatLongitude(b.lon),
        b.housePosition ? `البيت ${Math.floor(b.housePosition)}` : '',
        b.retrograde ? 'متراجع' : '',
      ]),
    ),
  );
  if (houses) {
    parts.push(
      table('الزوايا ورؤوس البيوت', [
        ['الطالع', formatLongitude(houses.asc)],
        ['وسط السماء', formatLongitude(houses.mc)],
        ...houses.cusps
          .slice(0, 12)
          .map((c, i) => [`البيت ${i + 1}`, formatLongitude(c)]),
      ]),
    );
  }
  parts.push(
    table(
      'الجوانب',
      findAspects(aspectPoints(chart)).map(a => [
        `${POINT_NAMES[a.a]} ${ASPECT_NAMES[a.kind]} ${POINT_NAMES[a.b]}`,
        formatDegree(a.orb),
        a.applying === null ? '' : a.applying ? 'مقترب' : 'منفصل',
      ]),
    ),
  );
  if (houses && houses.cusps.length) {
    parts.push(
      table(
        'السهام',
        computeLots(chart).map(l => [
          LOT_NAMES[l.key],
          formatLongitude(l.lon),
          `الطالع + ${LOT_NAMES[l.formula[0]]} − ${LOT_NAMES[l.formula[1]]}`,
        ]),
      ),
    );
    parts.push(
      table(
        'الكرامات',
        chartDignities(chart).map(d => {
          const r = rulersAt(d.lon);
          return [
            POINT_NAMES[d.planet],
            d.dignities.map(k => DIGNITY_NAMES[k]).join('، '),
            d.score > 0 ? `+${d.score}` : `${d.score}`,
            `الحد: ${POINT_NAMES[r.term]} · الوجه: ${POINT_NAMES[r.face]}`,
          ];
        }),
      ),
    );
  }
  try {
    parts.push(
      table(
        'النجوم الثابتة (سماح درجة)',
        starContacts(chart).map(s => [
          `${s.star} مع ${POINT_NAMES[s.point]}`,
          formatDegree(s.orb),
        ]),
      ),
    );
  } catch {
    // stars are optional in the report
  }
  parts.push('<p class="foot">فلك · المكتبة السويسرية</p>');

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "Noto Naskh Arabic", "Noto Sans Arabic", sans-serif; color: #0B1530; }
  h1 { color: #9A7A2C; font-size: 22pt; margin: 0 0 4pt; }
  h2 { color: #9A7A2C; font-size: 13pt; margin: 16pt 0 6pt; border-bottom: 1px solid #D9D2BF; padding-bottom: 3pt; }
  .sub { color: #5B6480; margin: 2pt 0; font-size: 10.5pt; }
  .wheel { text-align: center; margin: 12pt 0; }
  .wheel text { font-family: "Noto Sans Symbols", "Noto Sans Symbols 2", sans-serif; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5pt; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  td { padding: 4pt 6pt; border-bottom: 1px solid #ECE7DA; }
  .foot { color: #5B6480; font-size: 9pt; text-align: center; margin-top: 18pt; }
</style></head><body>${parts.join('\n')}</body></html>`;
}
