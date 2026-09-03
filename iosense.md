# IOsense API usage — KNPL EMS Analytics

Tracks every connector functionID this app calls, and the device/sensor
resources it is bound to.

## Connection

| Setting | Value |
|---|---|
| Base URL (production) | `http://knpl-ems-app.nerolac.com:3002/api` |
| Base URL (IOsense hosted) | `https://connector.iosense.io/api` |
| Auth | `Authorization: Bearer <token>` — permanent access token |
| Config | `frontend/.env.local` (gitignored), documented in `frontend/.env.example` |

The token is read server-side only (`IOSENSE_API_TOKEN`, no `NEXT_PUBLIC_`
prefix). The browser never receives it: all reads go through the app's own
`/api/plant-tree` route, which calls the connector from the server.

> `knpl-ems-app.nerolac.com` resolves on the Nerolac network only. From
> outside it, the app falls back to simulated data and says so in the UI.

## Function IDs called

| functionID | Method / path | Used for |
|---|---|---|
| `getWidgetData` | `PUT /account/ioLensWidget/getWidgetData` | All dashboard readings. `comparisonMode: true` returns the current and previous windows in one call, which is exactly the period-over-period shape the dashboard needs. |
| `findUserDevices` | `PUT /account/devices/{skip}/{limit}` | Discovery only, via `scripts/discover-iosense.mjs`. Not called at runtime. |

Considered and not used:

- `getDataByTimeRangeWithCalibration` — single pair, raw points. A month of
  register data per meter to extract two endpoints; rejected on volume.
- `getDeviceAutoDownSampledData` — multi-pair but no comparison mode, and
  downsampling can move the window's first/last point.
- `getLastDPsofDevicesAndSensorCalibrated` — latest value only, no range.

## The consumption operator

The connector's operators are `sum | min | max | mean`. There is no
consumption operator, so it is synthesised in
`frontend/src/services/iosense/widget-data.ts`:

```
consumption over a window = last data point − first data point
                          = max − min          (for a cumulative register)
```

A kWh totaliser only ever climbs, so its window maximum *is* its last reading
and its minimum *is* its first. Each `consumption` channel is therefore issued
as two config entries (`min` and `max`) and subtracted locally — one call,
both windows, no raw series.

**Assumption:** the register does not reset or roll over mid-window. If it
does, `max − min` understates by the pre-reset climb. Meters that roll over
need a platform-side compute flow instead.

## Resource bindings

Declared in `frontend/src/services/iosense/bindings.ts`.

| Node | Measure | devID | sensor | operator |
|---|---|---|---|---|
| Overall Plant | Energy (kWh) | `KNBWEM_Z1` | `D30` | `consumption` |

### Still needed

The tree is served from simulated data until every level is mapped, because
mixing live readings with unmapped zeros would corrupt the roll-ups and the
top-contributor ranking. Outstanding:

- Zone meters for the seven sections: Paint Plant, CED F2, PC Plant, R&D,
  Resin Plant, RM, Utility.
- Subsection meters where they exist (Paint Plant → Mixing / Dispersion /
  Grinding; PC Plant → Premix & Extrusion / Grinding & Classifying; Resin
  Plant → Reactor Block / Thinning & Filtration).
- Production channels in KL for Paint Plant, CED F2, PC Plant and Resin Plant.
  R&D, RM and Utility book no production and need energy only.
- Per-machine energy, and run-hours where metered — run-hours drive the
  marginal-kW and idle-heavy / overload badges. Machines without a run-hour
  channel show "—" for those columns rather than a guess.

Run `node scripts/discover-iosense.mjs` from `frontend/` inside the network to
list every device and sensor the token can see.

## Roll-up rule

A node with its own meter uses it directly; a node without one sums its
children. A zone meter is treated as authoritative because it also captures
losses and small unmetered loads that summing named machines would miss.
