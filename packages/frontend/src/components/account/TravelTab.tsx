import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getTravelLog, type TravelLog, type TravelLogTrip } from '@/api/user';
import { toast } from '@/lib/toast';

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'FR:paris': { lat: 48.8566, lon: 2.3522 },
  'FR:nice': { lat: 43.7102, lon: 7.262 },
  'FR:lyon': { lat: 45.764, lon: 4.8357 },
  'FR:marseille': { lat: 43.2965, lon: 5.3698 },
  'FR:bordeaux': { lat: 44.8378, lon: -0.5792 },
  'GB:london': { lat: 51.5074, lon: -0.1278 },
  'IT:rome': { lat: 41.9028, lon: 12.4964 },
  'IT:milan': { lat: 45.4642, lon: 9.19 },
  'IT:florence': { lat: 43.7696, lon: 11.2558 },
  'ES:madrid': { lat: 40.4168, lon: -3.7038 },
  'ES:barcelona': { lat: 41.3851, lon: 2.1734 },
  'DE:berlin': { lat: 52.52, lon: 13.405 },
  'NL:amsterdam': { lat: 52.3676, lon: 4.9041 },
  'PT:lisbon': { lat: 38.7223, lon: -9.1393 },
  'AT:vienna': { lat: 48.2082, lon: 16.3738 },
  'BE:brussels': { lat: 50.8503, lon: 4.3517 },
  'CH:zurich': { lat: 47.3769, lon: 8.5417 },
  'US:new york': { lat: 40.7128, lon: -74.006 },
  'US:los angeles': { lat: 34.0522, lon: -118.2437 },
  'JP:tokyo': { lat: 35.6762, lon: 139.6503 },
  'MA:marrakech': { lat: 31.6295, lon: -7.9811 },
  'AE:dubai': { lat: 25.2048, lon: 55.2708 },
};

// Simple equirectangular projection into a viewBox sized for Europe by default
// but we use world bounds so pins outside Europe still render.
const MAP_VIEW = { x0: -25, x1: 55, y0: 15, y1: 70 }; // world-ish window around Europe
const SVG_W = 640;
const SVG_H = 360;

function project(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - MAP_VIEW.x0) / (MAP_VIEW.x1 - MAP_VIEW.x0)) * SVG_W;
  const y = ((MAP_VIEW.y1 - lat) / (MAP_VIEW.y1 - MAP_VIEW.y0)) * SVG_H;
  return { x, y };
}

function lookupCoords(city: string, countryCode: string) {
  const key = `${countryCode}:${city.toLowerCase()}`;
  return CITY_COORDS[key];
}

function Badge({ achieved, label, sub }: { achieved: boolean; label: string; sub: string }) {
  return (
    <div
      className={`rounded-xl border p-4 text-center transition-all ${
        achieved ? 'border-brand/30 bg-brand/8' : 'border-linen bg-white opacity-60'
      }`}
    >
      <p className={`font-serif text-[18px] font-semibold ${achieved ? 'text-ink' : 'text-stone'}`}>
        {label}
      </p>
      <p className="mt-0.5 font-sans text-[11px] text-stone">{sub}</p>
    </div>
  );
}

function TripPopover({ trip }: { trip: TravelLogTrip }) {
  return (
    <div className="min-w-[240px]">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[1px] text-stone">
        {new Date(trip.rentalStart).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
        {' → '}
        {new Date(trip.rentalEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </p>
      <p className="mt-0.5 font-serif text-[16px] font-semibold text-ink">{trip.city}</p>
      <p className="mt-1 font-sans text-[12px] text-stone">What you wore ({trip.items.length})</p>
      <ul className="mt-1 space-y-0.5">
        {trip.items.slice(0, 4).map((it) => (
          <li key={it.productId} className="font-sans text-[12px] text-charcoal">
            · {it.name} <span className="text-stone">— {it.brand}</span>
          </li>
        ))}
        {trip.items.length > 4 && (
          <li className="font-sans text-[11px] text-stone">+ {trip.items.length - 4} more</li>
        )}
      </ul>
      <Link
        to={`/orders/${trip.orderId}`}
        className="mt-2 inline-block font-sans text-[12px] font-semibold text-brand underline underline-offset-2"
      >
        View order
      </Link>
    </div>
  );
}

export function TravelTab() {
  const [log, setLog] = useState<TravelLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredTrip, setHoveredTrip] = useState<TravelLogTrip | null>(null);

  useEffect(() => {
    let mounted = true;
    getTravelLog()
      .then((l) => mounted && setLog(l))
      .catch((err) => {
        console.warn('[TravelTab] failed to load travel log:', err);
        toast.error('Could not load travel log. Please try again.');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-linen border-t-brand" />
      </div>
    );
  }

  if (!log) return null;

  const co2Kg = log.totalCo2SavedKg;
  const carKm = Math.round(co2Kg / 0.21);

  const tripsByCity = new Map<string, TravelLogTrip[]>();
  for (const t of log.trips) {
    const key = `${t.countryCode}:${t.city.toLowerCase()}`;
    const arr = tripsByCity.get(key) ?? [];
    arr.push(t);
    tripsByCity.set(key, arr);
  }

  const pinnedCities = log.cities
    .map((c) => {
      const coords = lookupCoords(c.city, c.countryCode);
      if (!coords) return null;
      const pos = project(coords.lat, coords.lon);
      const trips = tripsByCity.get(`${c.countryCode}:${c.city.toLowerCase()}`) ?? [];
      return { ...c, pos, trips };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const unmappedCities = log.cities.filter((c) => !lookupCoords(c.city, c.countryCode));

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-brand/20 bg-brand/8 p-5">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-brand">
            CO₂ saved
          </p>
          <p className="mt-1 font-serif text-[30px] font-semibold text-ink">
            {co2Kg.toFixed(1)}
            <span className="ml-1 text-[18px] text-stone">kg</span>
          </p>
          <p className="mt-1 font-sans text-[11px] text-stone">≈ {carKm} km not driven</p>
        </div>
        <div className="rounded-xl border border-linen bg-white p-5">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
            Trips
          </p>
          <p className="mt-1 font-serif text-[30px] font-semibold text-ink">{log.tripsCount}</p>
        </div>
        <div className="rounded-xl border border-linen bg-white p-5">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
            Cities
          </p>
          <p className="mt-1 font-serif text-[30px] font-semibold text-ink">{log.citiesVisited}</p>
        </div>
        <div className="rounded-xl border border-linen bg-white p-5">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.9px] text-stone">
            Pieces worn
          </p>
          <p className="mt-1 font-serif text-[30px] font-semibold text-ink">
            {log.totalPiecesRented}
          </p>
        </div>
      </div>

      {/* Map */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-[22px] font-semibold text-ink">Places you've travelled</h2>
          {hoveredTrip && (
            <p className="font-sans text-[12px] text-stone">Hover a pin to see details</p>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-linen bg-gradient-to-br from-linen/40 to-ivory">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="h-auto w-full"
            style={{ aspectRatio: `${SVG_W}/${SVG_H}` }}
          >
            {/* soft land shape — stylised Europe outline (not geographically perfect, decorative) */}
            <defs>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1A3C34" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#1A3C34" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width={SVG_W} height={SVG_H} fill="transparent" />

            {/* grid dots */}
            {Array.from({ length: 20 }).map((_, i) =>
              Array.from({ length: 12 }).map((_, j) => (
                <circle
                  key={`${i}-${j}`}
                  cx={(i + 0.5) * (SVG_W / 20)}
                  cy={(j + 0.5) * (SVG_H / 12)}
                  r={0.8}
                  fill="#d6d3d1"
                />
              )),
            )}

            {/* pins */}
            {pinnedCities.map((c) => {
              const size = 6 + Math.min(c.tripsCount, 5) * 2;
              return (
                <g key={`${c.countryCode}-${c.city}`}>
                  <circle cx={c.pos.x} cy={c.pos.y} r={size * 2.5} fill="url(#glow)" />
                  <circle
                    cx={c.pos.x}
                    cy={c.pos.y}
                    r={size}
                    fill="#1A3C34"
                    stroke="white"
                    strokeWidth={2}
                    className="cursor-pointer transition-transform hover:scale-110"
                    onMouseEnter={() => setHoveredTrip(c.trips[0] ?? null)}
                    onMouseLeave={() => setHoveredTrip(null)}
                  />
                  <text
                    x={c.pos.x}
                    y={c.pos.y - size - 6}
                    textAnchor="middle"
                    className="fill-ink font-sans"
                    style={{ fontSize: 11, fontWeight: 600 }}
                  >
                    {c.city}
                  </text>
                </g>
              );
            })}
          </svg>

          {hoveredTrip && (
            <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-linen bg-white/95 p-4 shadow-lifted backdrop-blur">
              <TripPopover trip={hoveredTrip} />
            </div>
          )}
        </div>

        {unmappedCities.length > 0 && (
          <p className="mt-3 font-sans text-[12px] text-stone">
            Also visited: {unmappedCities.map((c) => `${c.city} (${c.countryCode})`).join(', ')}
          </p>
        )}
      </section>

      {/* Achievements */}
      <section>
        <h2 className="mb-3 font-serif text-[22px] font-semibold text-ink">Milestones</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Badge
            achieved={log.tripsCount >= 1}
            label="First journey"
            sub="Completed your first rental"
          />
          <Badge achieved={log.citiesVisited >= 3} label="Explorer" sub="3 cities visited" />
          <Badge achieved={co2Kg >= 5} label="Low-carbon traveller" sub="Saved 5+ kg of CO₂" />
          <Badge
            achieved={log.totalPiecesRented >= 10}
            label="Wardrobe curator"
            sub="Worn 10+ pieces"
          />
        </div>
      </section>

      {/* Trip timeline */}
      <section>
        <h2 className="mb-3 font-serif text-[22px] font-semibold text-ink">Trip history</h2>
        {log.trips.length === 0 ? (
          <div className="rounded-xl border border-linen bg-white p-6 text-center">
            <p className="font-sans text-[14px] text-stone">No completed trips yet.</p>
            <Link
              to="/collection"
              className="mt-3 inline-block rounded-default bg-brand px-5 py-2 font-sans text-[13px] font-semibold text-ivory hover:bg-brand/90"
            >
              Plan your first trip
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {log.trips.map((trip) => (
              <Link
                key={trip.orderId}
                to={`/orders/${trip.orderId}`}
                className="block rounded-xl border border-linen bg-white p-5 transition-all hover:border-sand hover:shadow-lifted"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-[1px] text-stone">
                      {new Date(trip.rentalStart).toLocaleDateString('en-GB', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="mt-0.5 font-serif text-[18px] font-semibold text-ink">
                      {trip.city}, {trip.countryCode}
                    </p>
                    <p className="mt-1 font-sans text-[13px] text-stone">
                      {trip.items.length} {trip.items.length === 1 ? 'piece' : 'pieces'} ·{' '}
                      {trip.carbonSavedKg.toFixed(1)} kg CO₂ saved
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-sans text-[11px] text-stone">Order #{trip.orderNumber}</p>
                    <p className="mt-0.5 font-sans text-[14px] font-semibold text-ink">
                      €{trip.totalAmount.toFixed(0)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {trip.items.slice(0, 5).map((it) => (
                    <span
                      key={it.productId}
                      className="rounded-full bg-pearl px-2.5 py-0.5 font-sans text-[11px] text-charcoal"
                    >
                      {it.name}
                    </span>
                  ))}
                  {trip.items.length > 5 && (
                    <span className="rounded-full bg-pearl px-2.5 py-0.5 font-sans text-[11px] text-stone">
                      +{trip.items.length - 5}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
