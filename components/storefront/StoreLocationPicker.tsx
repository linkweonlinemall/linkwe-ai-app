"use client";

import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLoadScript } from "@react-google-maps/api";
import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import {
  detectOnboardingRegionFromAddress,
} from "@/lib/onboarding/tt-region-options";

const DEFAULT_LAT = 10.6549;
const DEFAULT_LNG = -61.5019;

/** Stable reference for useLoadScript (avoid reload warnings). */
const GOOGLE_LIBRARIES: ["places"] = ["places"];

function extractCityFromComponents(
  components: google.maps.GeocoderAddressComponent[],
): string | null {
  const typePriority = [
    "locality",
    "administrative_area_level_2",
    "sublocality_level_1",
    "sublocality",
    "neighborhood",
  ];
  for (const type of typePriority) {
    const component = components.find((c) => c.types.includes(type));
    if (component) return component.long_name;
  }
  return null;
}

const GEO_LOG_PREFIX = "[StoreLocationPicker/geolocation]";

type ReverseGeocodeResult = {
  address: string | null;
  source: "google" | "mapbox" | "none";
  detail: string;
};

/** Reverse-geocode coords: Google Maps Geocoder when present, then Mapbox Geocoding API if needed. */
async function reverseGeocodeLatLng(
  lat: number,
  lng: number,
  mapboxToken: string,
): Promise<ReverseGeocodeResult> {
  console.log(`${GEO_LOG_PREFIX} reverse-geocode chain start`, { lat, lng });

  if (typeof window !== "undefined" && window.google?.maps?.Geocoder) {
    console.log(`${GEO_LOG_PREFIX} trying Google Maps Geocoder`);
    const googleOutcome = await new Promise<{ address: string | null; detail: string }>((resolve) => {
      try {
        new window.google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
          console.log(`${GEO_LOG_PREFIX} Google Geocoder callback`, {
            status,
            resultCount: results?.length ?? 0,
          });
          if (status === "OK" && results && results.length > 0) {
            const best =
              results.find(
                (r) =>
                  r.types.includes("street_address") ||
                  r.types.includes("premise") ||
                  r.types.includes("route"),
              ) ??
              results.find((r) => !r.formatted_address.includes("+")) ??
              results[0];
            resolve({ address: best?.formatted_address ?? null, detail: status });
          } else {
            resolve({ address: null, detail: String(status) });
          }
        });
      } catch (e) {
        console.warn(`${GEO_LOG_PREFIX} Google Geocoder threw`, e);
        resolve({ address: null, detail: "exception" });
      }
    });
    if (googleOutcome.address) {
      return { address: googleOutcome.address, source: "google", detail: googleOutcome.detail };
    }
    console.log(`${GEO_LOG_PREFIX} Google had no usable address; falling back if Mapbox token present`, {
      detail: googleOutcome.detail,
    });
  } else {
    console.log(`${GEO_LOG_PREFIX} Google Geocoder not on window yet (Places script still loading or no Places key)`);
  }

  const token = mapboxToken.trim();
  if (token.length > 0) {
    // Path must be literally "{longitude},{latitude}" — do not encode the comma (EncodeURIComponent breaks Mapbox 422/errors).
    // https://api.mapbox.com/geocoding/v5/mapbox.places/{longitude},{latitude}.json?access_token=...
    const coordPath = `${lng},${lat}`;
    const query = new URLSearchParams({
      access_token: token,
      limit: "1",
    });
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordPath}.json?${query.toString()}`;
    console.log(`${GEO_LOG_PREFIX} Mapbox reverse URL (coords only; token omitted)`, {
      urlPattern: `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordPath}.json?access_token=<token>&limit=1`,
      hasToken: true,
      tokenLength: token.length,
      tokenPrefix: `${token.slice(0, 5)}…`,
    });
    try {
      const res = await fetch(url);
      console.log(`${GEO_LOG_PREFIX} Mapbox HTTP`, { ok: res.ok, status: res.status });
      const raw = await res.json().catch(() => null);
      const data = raw as {
        message?: string;
        features?: { place_name?: string }[];
      } | null;

      if (!res.ok || (data?.message && !Array.isArray(data?.features))) {
        console.warn(`${GEO_LOG_PREFIX} Mapbox error response`, {
          status: res.status,
          message: typeof data?.message === "string" ? data.message : raw,
        });
        return {
          address: null,
          source: "none",
          detail:
            typeof data?.message === "string" ? `mapbox_http_${res.status}: ${data.message}` : `mapbox_http_${res.status}`,
        };
      }

      const place =
        Array.isArray(data?.features) && data.features.length > 0 ? data.features[0]?.place_name : null;
      console.log(`${GEO_LOG_PREFIX} Mapbox body`, {
        featureCount: data?.features?.length ?? 0,
        place_name: place ?? "(none)",
      });
      return { address: place ?? null, source: place ? "mapbox" : "none", detail: "mapbox" };
    } catch (e) {
      console.warn(`${GEO_LOG_PREFIX} Mapbox fetch failed`, e);
      return { address: null, source: "none", detail: "mapbox_fetch_failed" };
    }
  }

  console.warn(`${GEO_LOG_PREFIX} no reverse-geocode backend (Google unavailable/empty + NEXT_PUBLIC_MAPBOX_TOKEN empty)`, {
    mapboxEnvPresent: !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    mapboxTrimmedLength: token.length,
  });
  return { address: null, source: "none", detail: "no_provider" };
}

type Props = {
  initialAddress: string;
  initialLat: number | null;
  initialLng: number | null;
  onRegionDetected?: (region: string | null) => void;
};

function LocationPickerShared({
  address,
  setAddress,
  lat,
  lng,
  setLat,
  setLng,
  inputRef,
  mapboxToken,
  fromAutocomplete,
  onRegionDetected,
}: {
  address: string;
  setAddress: (v: string) => void;
  lat: number | null;
  lng: number | null;
  setLat: (v: number) => void;
  setLng: (v: number) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  mapboxToken: string;
  fromAutocomplete: RefObject<boolean>;
  onRegionDetected?: (region: string | null) => void;
}) {
  const [mapKey, setMapKey] = useState(0);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSupported, setGeoSupported] = useState(false);
  const [addressDetectionNote, setAddressDetectionNote] = useState<string | null>(null);
  const [addressValue, setAddressValue] = useState("");
  const onRegionDetectedRef = useRef(onRegionDetected);
  onRegionDetectedRef.current = onRegionDetected;

  useEffect(() => {
    setGeoSupported(typeof navigator !== "undefined" && !!navigator.geolocation);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const addressInput = document.querySelector(
        'input[name="locationAddress"]',
      ) as HTMLInputElement | null;
      if (!addressInput) return;
      const polledAddress = addressInput.value;
      if (polledAddress && polledAddress !== addressValue) {
        setAddressValue(polledAddress);
        const detected = detectOnboardingRegionFromAddress(polledAddress);
        if (detected) {
          onRegionDetectedRef.current?.(detected);
          setAddressDetectionNote(null);
        } else {
          const lowerAddress = polledAddress.toLowerCase();
          if (lowerAddress.includes("trinidad") || lowerAddress.includes("tobago")) {
            setAddressDetectionNote(
              "We found your location in Trinidad & Tobago but could not identify your specific area. Please select your region below.",
            );
            onRegionDetectedRef.current?.(null);
          } else {
            setAddressDetectionNote(null);
          }
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [addressValue]);

  useEffect(() => {
    if (!fromAutocomplete.current) return;
    fromAutocomplete.current = false;
    // The key prop on the Map handles re-centering
    // We need to force it to update by changing the key
    setMapKey((prev) => prev + 1);
  }, [lat, lng]);

  const showMap = mapboxToken.length > 0;

  const markerLng = lng ?? DEFAULT_LNG;
  const markerLat = lat ?? DEFAULT_LAT;

  function handleUseLocation() {
    console.log(`${GEO_LOG_PREFIX} handleUseLocation click`, {
      navigatorGeo: typeof navigator !== "undefined" && !!navigator.geolocation,
      windowGoogle: typeof window !== "undefined" && !!(window as unknown as { google?: unknown }).google,
    });

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      console.warn(`${GEO_LOG_PREFIX} geolocation unavailable`);
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const plat = position.coords.latitude;
        const plng = position.coords.longitude;
        console.log(`${GEO_LOG_PREFIX} getCurrentPosition SUCCESS`, {
          latitude: plat,
          longitude: plng,
          accuracy: position.coords.accuracy,
        });

        try {
          fromAutocomplete.current = true;
          setLat(plat);
          setLng(plng);

          console.log(`${GEO_LOG_PREFIX} calling reverseGeocodeLatLng`);
          const geo = await reverseGeocodeLatLng(plat, plng, mapboxToken);

          console.log(`${GEO_LOG_PREFIX} reverse-geocode DONE`, geo);
          if (geo.address) {
            console.log(`${GEO_LOG_PREFIX} setAddress(…)`, geo.address.slice(0, 80));
            setAddress(geo.address);
            const detected = detectOnboardingRegionFromAddress(geo.address);
            onRegionDetectedRef.current?.(detected ?? null);
            setAddressDetectionNote(
              detected
                ? null
                : geo.address.toLowerCase().includes("trinidad") ||
                    geo.address.toLowerCase().includes("tobago")
                  ? "We found your location in Trinidad & Tobago but could not identify your specific area. Please select your region below."
                  : null,
            );
          } else {
            setGeoError("Could not resolve an address from your coordinates. You can drag the pin or type your address.");
            setAddressDetectionNote(null);
          }
        } finally {
          setGeoLoading(false);
          console.log(`${GEO_LOG_PREFIX} loading cleared`);
        }
      },
      (err) => {
        console.warn(`${GEO_LOG_PREFIX} getCurrentPosition FAIL`, err);
        setGeoError("Could not get your location. Please type your address.");
        setGeoLoading(false);
      },
    );
  }

  return (
    <>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
        Address
        <input
          ref={inputRef}
          autoComplete="off"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Search or type your address"
          type="text"
          value={address}
        />
      </label>

      {geoSupported ? (
        <div className="mt-2">
          <button
            className="text-sm text-zinc-600 border border-zinc-300 rounded-lg px-3 py-1.5 hover:bg-zinc-50"
            disabled={geoLoading}
            onClick={handleUseLocation}
            type="button"
          >
            {geoLoading ? "Locating..." : "Use my location"}
          </button>
          {geoError ? (
            <p className="mt-2 text-sm text-zinc-600">{geoError}</p>
          ) : null}
        </div>
      ) : null}

      <input name="locationAddress" type="hidden" value={address} />
      <input name="locationLat" type="hidden" value={lat !== null ? String(lat) : ""} />
      <input name="locationLng" type="hidden" value={lng !== null ? String(lng) : ""} />

      {showMap ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
          <Map
            key={mapKey}
            initialViewState={{
              longitude: lng ?? DEFAULT_LNG,
              latitude: lat ?? DEFAULT_LAT,
              zoom: lat ? 14 : 12,
            }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={mapboxToken}
            scrollZoom={true}
            doubleClickZoom={true}
            touchZoomRotate={true}
            style={{ width: "100%", height: "300px" }}
          >
            <Marker
              draggable
              latitude={markerLat}
              longitude={markerLng}
              onDragEnd={(e) => {
                const newLat = e.lngLat.lat;
                const newLng = e.lngLat.lng;
                console.log(`${GEO_LOG_PREFIX} marker drag end`, { latitude: newLat, longitude: newLng });
                setLat(newLat);
                setLng(newLng);
                void (async () => {
                  console.log(`${GEO_LOG_PREFIX} drag → reverseGeocodeLatLng`);
                  const geo = await reverseGeocodeLatLng(newLat, newLng, mapboxToken);
                  console.log(`${GEO_LOG_PREFIX} drag reverse-geocode DONE`, geo);
                  if (geo.address) {
                    console.log(`${GEO_LOG_PREFIX} drag setAddress`, geo.address.slice(0, 80));
                    setAddress(geo.address);
                    if (onRegionDetectedRef.current) {
                      const detected = detectOnboardingRegionFromAddress(geo.address);
                      onRegionDetectedRef.current(detected);
                    }
                  } else {
                    console.warn(`${GEO_LOG_PREFIX} drag found no address`, geo);
                  }
                })();
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#D4450A",
                }}
              />
            </Marker>
          </Map>
        </div>
      ) : null}

      {addressDetectionNote ? (
        <p className="mt-2 text-xs text-amber-600">{addressDetectionNote}</p>
      ) : null}
    </>
  );
}

function StoreLocationPickerManual(props: Props) {
  const [address, setAddress] = useState(props.initialAddress);
  const [lat, setLat] = useState<number | null>(props.initialLat);
  const [lng, setLng] = useState<number | null>(props.initialLng);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fromAutocomplete = useRef(false);

  const mapboxToken = useMemo(() => {
    const t = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    return typeof t === "string" ? t.trim() : "";
  }, []);

  return (
    <LocationPickerShared
      address={address}
      fromAutocomplete={fromAutocomplete}
      inputRef={inputRef}
      lat={lat}
      lng={lng}
      mapboxToken={mapboxToken}
      onRegionDetected={props.onRegionDetected}
      setAddress={setAddress}
      setLat={setLat}
      setLng={setLng}
    />
  );
}

function StoreLocationPickerWithGoogle({ googleMapsApiKey, ...props }: Props & { googleMapsApiKey: string }) {
  const [address, setAddress] = useState(props.initialAddress);
  const [lat, setLat] = useState<number | null>(props.initialLat);
  const [lng, setLng] = useState<number | null>(props.initialLng);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fromAutocomplete = useRef(false);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey,
    libraries: GOOGLE_LIBRARIES,
  });

  const onRegionDetectedRef = useRef(props.onRegionDetected);
  onRegionDetectedRef.current = props.onRegionDetected;

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "address_components"],
      componentRestrictions: { country: "tt" },
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      const newLat = place.geometry.location.lat();
      const newLng = place.geometry.location.lng();
      setAddress(place.formatted_address ?? "");

      const addressComponents = place.address_components ?? [];
      const cityFromComponents = extractCityFromComponents(addressComponents);

      let detectedRegion: string | null = null;
      if (cityFromComponents) {
        detectedRegion = detectOnboardingRegionFromAddress(cityFromComponents);
      }
      if (!detectedRegion) {
        detectedRegion = detectOnboardingRegionFromAddress(place.formatted_address ?? "");
      }
      if (!detectedRegion) {
        detectedRegion = null;
      }

      const cb = onRegionDetectedRef.current;
      if (cb) {
        cb(detectedRegion);
      }

      fromAutocomplete.current = true;
      setLat(newLat);
      setLng(newLng);
    });

    return () => {
      window.google.maps.event.removeListener(listener);
      window.google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [isLoaded]);

  const mapboxToken = useMemo(() => {
    const t = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    return typeof t === "string" ? t.trim() : "";
  }, []);

  return (
    <LocationPickerShared
      address={address}
      fromAutocomplete={fromAutocomplete}
      inputRef={inputRef}
      lat={lat}
      lng={lng}
      mapboxToken={mapboxToken}
      onRegionDetected={props.onRegionDetected}
      setAddress={setAddress}
      setLat={setLat}
      setLng={setLng}
    />
  );
}

export default function StoreLocationPicker(props: Props) {
  const googleKey = useMemo(() => {
    const k = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
    return typeof k === "string" ? k.trim() : "";
  }, []);

  if (googleKey) {
    return <StoreLocationPickerWithGoogle {...props} googleMapsApiKey={googleKey} />;
  }

  return <StoreLocationPickerManual {...props} />;
}
