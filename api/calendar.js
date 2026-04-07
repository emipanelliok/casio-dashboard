// Vercel serverless function — eventos próximos 7 días
// Calendarios configurados via variables de entorno (ver .env.example)

const TZ = 'America/Argentina/Buenos_Aires';
const DIAS_ES = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];

// Calendarios ICS (podés agregar/quitar los que quieras)
const ICS_CALENDARS = [
  process.env.CAL_ICS_1 && { name: process.env.CAL_NAME_1 || 'Calendar 1', url: process.env.CAL_ICS_1 },
  process.env.CAL_ICS_2 && { name: process.env.CAL_NAME_2 || 'Calendar 2', url: process.env.CAL_ICS_2 },
].filter(Boolean);

// Calendario via Google Apps Script (opcional — ver README para configurarlo)
const APPS_SCRIPT_URL = process.env.CAL_APPS_SCRIPT_URL || null;

function toARDateStr(date) {
  return new Date(date.toLocaleString('en-US', { timeZone: TZ })).toISOString().slice(0, 10);
}

function parseICSDate(str) {
  if (!str) return null;
  str = str.trim();
  if (str.length === 8) {
    return new Date(parseInt(str.slice(0,4)), parseInt(str.slice(4,6))-1, parseInt(str.slice(6,8)));
  }
  var y=str.slice(0,4),mo=str.slice(4,6),d=str.slice(6,8),h=str.slice(9,11),mi=str.slice(11,13),s=str.slice(13,15);
  return new Date(y+'-'+mo+'-'+d+'T'+h+':'+mi+':'+s+(str.endsWith('Z')?'Z':'-03:00'));
}

function parseICS(icsText, calName, todayStr, limitStr) {
  var events = [];
  var lines = icsText.replace(/\r\n[ \t]/g,'').split(/\r\n|\r|\n/);
  var current = null;

  for (var i=0; i<lines.length; i++) {
    var line = lines[i];
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT' && current) {
      var start = current.dtstart;
      if (start) {
        var startDate = parseICSDate(start);
        if (startDate) {
          var startStr = toARDateStr(startDate);
          if (startStr >= todayStr && startStr <= limitStr) {
            var isAllDay = start.length === 8;
            events.push({
              title:    current.summary || '(sin título)',
              date:     startStr,
              dayLabel: DIAS_ES[startDate.getDay()],
              dateNum:  startStr.slice(8,10)+'/'+startStr.slice(5,7),
              start:    isAllDay ? null : startDate.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', timeZone: TZ }),
              end:      (!isAllDay && current.dtend) ? parseICSDate(current.dtend).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', timeZone: TZ }) : null,
              allDay:   isAllDay,
              calendar: calName,
              sortKey:  startStr + (isAllDay ? 'T00:00' : startDate.toISOString().slice(10))
            });
          }
        }
      }
      current = null;
    } else if (current !== null) {
      var colon = line.indexOf(':');
      if (colon > 0) {
        var key   = line.slice(0,colon).split(';')[0].toLowerCase().replace(/-/g,'');
        var value = line.slice(colon+1).trim();
        current[key] = value;
      }
    }
  }
  return events;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  try {
    var now      = new Date();
    var todayStr = toARDateStr(now);
    var limitStr = toARDateStr(new Date(now.getTime() + 7*24*60*60*1000));
    var allEvents = [];

    // 1. Google Apps Script (devuelve JSON con títulos reales, útil para cuentas Workspace)
    if (APPS_SCRIPT_URL) {
      try {
        var resp = await fetch(APPS_SCRIPT_URL, { redirect: 'follow' });
        if (resp.ok) {
          var data = await resp.json();
          if (data.events) {
            data.events.forEach(function(ev) {
              if (ev.date >= todayStr && ev.date <= limitStr) {
                ev.sortKey = ev.date + (ev.allDay ? 'T00:00' : 'T'+(ev.start||'00:00'));
                allEvents.push(ev);
              }
            });
          }
        }
      } catch(e) { console.error('Error Apps Script:', e.message); }
    }

    // 2. Calendarios ICS
    for (var i=0; i<ICS_CALENDARS.length; i++) {
      var cal = ICS_CALENDARS[i];
      try {
        var icsResp = await fetch(cal.url, { headers: { 'User-Agent': 'casio-dashboard/1.0' } });
        if (icsResp.ok) {
          var text = await icsResp.text();
          allEvents = allEvents.concat(parseICS(text, cal.name, todayStr, limitStr));
        }
      } catch(e) { console.error('Error '+cal.name+':', e.message); }
    }

    allEvents.sort(function(a, b) { return a.sortKey.localeCompare(b.sortKey); });
    res.status(200).json({ events: allEvents, count: allEvents.length, today: todayStr });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
