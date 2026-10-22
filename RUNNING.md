# Running the EMS Analytics dashboard on your own laptop

This is the way to have the dashboard **permanently available** for client
demos. It runs entirely on your machine — no VPN, no venue wifi, no shared
server, nothing that can be reassigned or expire mid-meeting.

Fixed address once set up: **http://localhost:3101**

---

## Why not just use a link to the server?

Three things make a server link unreliable for presenting:

- The build machine has **no public IP**, so `localhost:3101` and
  `11.0.2.24:3101` only work from the machine itself, not from your laptop.
- Tunnel URLs (`*.trycloudflare.com`) **die when the session ends** and get a
  different hostname every time.
- The shared platform hostname `app-81d814b3.iocompute.ai` was **reassigned**
  to another project (Ferro Alloys) while this one was still using it.

Running it locally removes all three.

---

## One-time setup (about 5 minutes)

**1. Install Node.js** — the LTS build from <https://nodejs.org>. Accept the
defaults. Verify in a new terminal:

```
node -v
```

Anything 20 or newer is fine.

**2. Get the code.** With Git installed:

```
git clone -b feat/ems-analytics-dashboard https://github.com/Khushboo-ee/KNPL-energy-analytics.git
```

No Git? Open the repo on github.com, switch to the
`feat/ems-analytics-dashboard` branch, then **Code → Download ZIP** and
extract it.

**3. Start it.**

- **Windows** — open `frontend\scripts\` and double-click
  **`start-dashboard.bat`**
- **macOS / Linux** — run `./frontend/scripts/start-dashboard.sh`

The first run installs dependencies and builds (a few minutes, needs
internet). Every run after that starts in seconds. Your browser opens on
<http://localhost:3101> automatically.

Leave the black window open while presenting. Closing it stops the server.

---

## Daily use

Double-click `start-dashboard.bat`. That's it — no internet needed after the
first run.

### Start it automatically at login (Windows)

1. Right-click `start-dashboard.bat` → **Create shortcut**
2. Press `Win + R`, type `shell:startup`, press Enter
3. Drag the shortcut into that folder

It now starts with Windows and is always at <http://localhost:3101>.

---

## What the client will see

A banner reading **"Demonstration data — Representative figures showing how
the dashboard works, not plant readings."**

That is correct and deliberate. A laptop checkout has no `.env.local`, so no
IOsense credentials ever leave the server, and the dashboard runs on the
built-in demonstration dataset. The drill-down logic, the period comparison,
the exports and the marginal-load badges are all real; the kWh values are not.

Worth saying out loud at the start of the demo rather than letting them read
it off the screen.

---

## Demo path (about 90 seconds)

1. **Top Contributor card** — the plant total is up, and one section accounts
   for nearly all of it while another is *down* and masking it.
2. **Click that section** — subsections open, ranked by absolute Δ kWh.
3. **Click "View equipment"** on the top subsection — machines open inline,
   the worst offender first.
4. **Point at the red OVERLOAD badge** — energy climbed far faster than
   running hours, which is what a fouled or failing machine looks like.
5. **Download Report → Excel** — exports exactly what is expanded, as real
   numbers, not a picture.
6. **Switch to "This Week vs Last Week"** — everything recomputes.

Best on a display 1440px wide or more so all ten columns fit. On a 1280px
projector the table scrolls sideways, which works but is worth knowing.

---

## If something goes wrong

| Symptom | Fix |
|---|---|
| `localhost refused to connect` | The server window isn't running. Double-click the `.bat` again. |
| `'node' is not recognized` | Node isn't installed, or the terminal predates the install. Open a fresh one. |
| Port 3101 already in use | Edit `set "PORT=3101"` in the `.bat` to another number, e.g. 3202. |
| Want a clean rebuild | Delete the `frontend\.next` folder and run the `.bat` again. |
