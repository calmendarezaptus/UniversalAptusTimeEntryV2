const fs = require('fs');
const file = 'd:/Documentos Trabajo/Aptus/Desarrollo/Widgets/EnhancedTimeEntry/widget-ui/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const startTag = '{/* ── ROW 1: Parámetros del Registro ─────────────────────────────────── */}';
const endTag = '{/* ── ROW 3: Time Summary Blocks ───────────────────────────────────── */}';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

const section = content.substring(startIndex, endIndex);

const plant = section.substring(section.indexOf('{/* Plantilla */}'), section.indexOf('{/* Fecha */}'));
const fecha = section.substring(section.indexOf('{/* Fecha */}'), section.indexOf('</div>\n            </div>\n\n            {/* Card: Registrar como */}'));

const regComo = section.substring(section.indexOf('{/* Card: Registrar como */}'), section.indexOf('{/* ── ROW 2: Contexto de Trabajo ────────────────────────────────────── */}')).replace(/<\/div>\s*$/, '').trim();

const ident = section.substring(section.indexOf('{/* Card 1: Cliente & Proyecto */}'), section.indexOf('{/* Card 2: Tarea & Abogado */}'));
const asig = section.substring(section.indexOf('{/* Card 2: Tarea & Abogado */}'), section.lastIndexOf('</div>', section.lastIndexOf('</div>') - 1)).trim();

let newSection = `{/* ── Parámetros del Registro ─────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

            {/* Left Column: Flow of 3 panels */}
            <div className="md:col-span-2 flex flex-col gap-4">

              {/* Card: Información general */}
              <div className={cn(cardCls, 'flex flex-col')}>
                <div className="flex items-center gap-2 mb-4">
                  <CalendarIcon className={sectionIconCls} />
                  <span className={sectionTitleCls}>Información general</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
` + fecha + plant + `</div>
              </div>

` + ident + `
` + asig + `

            </div>

            {/* Right Column */}
            <div className="md:col-span-1 flex flex-col gap-4">
              ` + regComo + `
            </div>

          </div>

          `;

content = content.substring(0, startIndex) + newSection + content.substring(endIndex);
fs.writeFileSync(file, content, 'utf8');
console.log('Done!');
