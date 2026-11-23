(() => {
  'use strict';
  const defaultLogo = '../assets/escudo-colegio.png';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function dateLabel(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return value;
    const month = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][Number(match[2]) - 1];
    return `${match[3]} ${month} ${match[1]}`;
  }
  function dateParts(value) { return { full: dateLabel(value) }; }
  function pageHeader(version, pageNo, header, logo) {
    const subject = header.subject || 'Evaluaci\u00f3n';
    const context = [header.grade && `Grado ${header.grade}`, header.headerGroup && `Grupo ${header.headerGroup}`, header.teacher && `Docente: ${header.teacher}`].filter(Boolean);
    const date = dateParts(header.date);
    const banner = `<header class="exam-banner roster-banner"><img class="roster-logo" src="${escape(logo || defaultLogo)}" alt="Escudo institucional"><div class="roster-head"><div class="roster-school">${escape(header.institution || 'Instituci\u00f3n educativa')}</div><div class="roster-title">${escape(header.assessment || 'Evaluaci\u00f3n')}</div>${header.period ? `<div class="roster-period">${escape(header.period)}</div>` : ''}</div><div class="roster-info"><svg class="roster-date-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="2.2"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h2m4 0h2M8 17h2m4 0h2"/></svg><span>FECHA</span><strong>${escape(date.full || '\u2014')}</strong></div><div class="exam-context"><strong>${escape(subject)}</strong>${context.map(text => `<span>${escape(text)}</span>`).join('')}</div></header>`;
    if (pageNo) return banner;
    return banner + `<div class="student-fields"><div>Estudiante: <span></span></div><div>Grupo: <span>${escape(header.headerGroup || '')}</span></div><div>Fecha: <span></span></div></div>${header.instructions ? `<p class="paper-instructions"><b>INSTRUCCIONES.</b> ${escape(header.instructions)}</p>` : ''}`;
  }
  // Measure the same document structure used by preview and print, including wrapped titles.
  function pageCapacity(host, markup, columns) {
    const page = document.createElement('section');
    page.className = 'print-page exam-page';
    page.innerHTML = markup + `<div class="paper-columns" style="grid-template-columns:${columns === 1 ? '1fr' : '1fr 1fr'}"><div class="paper-column"></div></div><div class="paper-footer">Evaluaci\u00f3n \u00b7 P\u00e1gina 1 de 1</div>`;
    host.append(page);
    const height = Math.floor(page.querySelector('.paper-columns').getBoundingClientRect().height) - 2;
    page.remove();
    return Math.max(0, height);
  }
  window.SIGA_PLIEGO_DOCUMENTS = Object.freeze({ defaultLogo, pageHeader, pageCapacity });
})();
