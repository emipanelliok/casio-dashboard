# 📟 Casio Dashboard

A retro LCD-style personal dashboard designed for old iPads (iPad 2, iOS 9+) — or any browser. Displays the time, weather, and your Google Calendar events for the next 7 days, with a Casio F-91W aesthetic.

![Casio Dashboard](https://raw.githubusercontent.com/emipanelliok/casio-dashboard/main/preview.png)

---

## Features

- 🕐 **Real-time clock** with DSEG7 LCD font (authentic 7-segment display)
- 🌤️ **Live weather** via [Open-Meteo](https://open-meteo.com/) — no API key needed
- 📅 **Calendar** — next 7 days across multiple Google Calendars
- 🎨 **3 themes** — Green (classic), Blue (backlight), B&W (monochrome)
- 📱 **Works on iPad 2 / iOS 9** — no CSS variables, no modern JS
- ⚡ **Deploy to Vercel in 1 minute** — static HTML + 2 serverless functions

---

## Deploy in 1 minute

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/emipanelli/casio-dashboard)

1. Click the button above
2. Set your environment variables (see below)
3. Done — your dashboard is live 🎉

---

## Configuration

### Location (weather)
Edit `index.html` and update the coordinates at the top of the `<script>`:
```js
var LAT = -34.90716;  // your latitude
var LON = -56.16009;  // your longitude
```

### Calendar — Option A: ICS URL (simplest)
Works with Google Calendar, iCloud, Outlook, or any `.ics` feed.

1. In Google Calendar → Settings → [your calendar] → **Integrate calendar**
2. Copy the **"Secret address in iCal format"** URL
3. Set in Vercel environment variables:

```
CAL_NAME_1=Work
CAL_ICS_1=https://calendar.google.com/calendar/ical/you@gmail.com/private-TOKEN/basic.ics

CAL_NAME_2=Personal
CAL_ICS_2=https://...
```

### Calendar — Option B: Google Apps Script (for Workspace accounts)
If your events show as "BUSY" with the ICS method, use this instead:

1. Go to [script.google.com](https://script.google.com) → New project
2. Paste this code:

```javascript
function doGet() {
  var cal    = CalendarApp.getDefaultCalendar();
  var today  = new Date();
  var limit  = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  var events = cal.getEvents(today, limit);

  var result = events.map(function(e) {
    var start  = e.getStartTime();
    var end    = e.getEndTime();
    var allDay = e.isAllDayEvent();
    return {
      title:    e.getTitle(),
      date:     Utilities.formatDate(start, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd'),
      dayLabel: ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'][start.getDay()],
      dateNum:  Utilities.formatDate(start, 'America/Argentina/Buenos_Aires', 'dd/MM'),
      start:    allDay ? null : Utilities.formatDate(start, 'America/Argentina/Buenos_Aires', 'HH:mm'),
      end:      allDay ? null : Utilities.formatDate(end,   'America/Argentina/Buenos_Aires', 'HH:mm'),
      allDay:   allDay,
      calendar: 'Personal'
    };
  });

  return ContentService
    .createTextOutput(JSON.stringify({ events: result }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Deploy → Web app → Execute as **Me** → Anyone can access
4. Copy the URL and set:
```
CAL_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

> ⚠️ **Change the timezone** in the script to match yours (`America/Argentina/Buenos_Aires` → your timezone)

---

## iPad setup (kiosk mode)

To keep the iPad always on and locked to the dashboard:

1. Open Safari → navigate to your Vercel URL
2. Tap Share → **Add to Home Screen**
3. Open from the Home Screen icon (full screen mode)
4. **Settings → General → Accessibility → Guided Access** → Enable, set a PIN
5. Triple-click Home → **Start** — iPad is now locked to the dashboard

Keep it plugged in so it never dies 🔋

---

## Tech stack

- **Frontend**: Vanilla HTML/CSS/JS (compatible with iOS 9 / Safari 9)
- **Backend**: 2 Vercel serverless functions (Node.js)
  - `/api/weather` — proxies Open-Meteo (bypasses iOS 9 TLS issues)
  - `/api/calendar` — fetches ICS / Apps Script and parses events
- **Fonts**: [DSEG7](https://github.com/keshikan/DSEG) (LCD display font) + Share Tech Mono
- **Weather**: [Open-Meteo](https://open-meteo.com/) (free, no API key)

---

## License

MIT — do whatever you want with it.

Made with ❤️ and a recycled iPad 2.
